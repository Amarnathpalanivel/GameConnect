import User from  "../models/User.js"
import Message from "../models/Message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getUserSocketIds } from "../server.js";
import { checkProfanity } from "./moderationController.js";


// Get all users except the logged in user
export const getUsersForSidebar = async (req, res) =>{
    try {
        const userId=req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: userId }, isVerified: { $ne: false } }).select("-password");

        // Count number of message not seen
        const unseenMessages={}
        const promises = filteredUsers.map(async(user)=>{
            const messages = await Message.find({senderId: user._id,receiverId:userId,seen:false})
            if(messages.length > 0){
                unseenMessages[user._id] = messages.length;
            }
        })
        await Promise.all(promises);
        res.json({success:true,users:filteredUsers,unseenMessages})
    } catch (error) {
        console.log(error.message);
        res.json({success:false,message:error.message});
    }
}

//Get all messages for selected user
export const getMessages = async (req,res) =>{
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId },
            ]
        }).sort({ createdAt: 1 }).populate("replyTo", "senderId text image");

        await Message.updateMany({ senderId: selectedUserId, receiverId: myId },
            { seen: true });

        res.json({ success: true, messages });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// api to mark message as seen using message id
export const markMessageAsSeen = async (req, res)=>{
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true });
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

//send message to selected user
export const sendMessage = async (req, res) =>{
    try {
        const { text, image, gifUrl, videoUrl, linkPreview, replyTo, messageType } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            if (typeof image === "string" && image.startsWith("data:image/")) {
                try {
                    const uploadResponse = await cloudinary.uploader.upload(image, {
                        folder: "gameconnect/messages"
                    });
                    imageUrl = uploadResponse.secure_url;
                } catch (uploadErr) {
                    console.error("Cloudinary upload failed, fallback to direct data:", uploadErr.message);
                    imageUrl = image;
                }
            } else {
                imageUrl = image;
            }
        }

        // Auto-moderation check: profanity filter
        const { cleanedText } = checkProfanity(text || "");

        const computedMessageType = gifUrl ? "gif" : (videoUrl ? "video" : (imageUrl ? "image" : (messageType || "text")));

        const messageData = {
            senderId,
            receiverId, 
            text: cleanedText,
            image: imageUrl,
            gifUrl: gifUrl || "",
            videoUrl: videoUrl || "",
            messageType: computedMessageType,
            linkPreview: linkPreview || undefined,
        };

        // If replying to a message, include the reference
        if (replyTo) {
            messageData.replyTo = replyTo;
        }

        const newMessage = await Message.create(messageData);

        // Populate the replyTo field for the response
        let populatedMessage = newMessage;
        if (replyTo) {
            populatedMessage = await Message.findById(newMessage._id)
                .populate("replyTo", "senderId text image");
        }

        //Emit the new message to all receiver sockets
        const receiverSockets = getUserSocketIds(receiverId);
        receiverSockets.forEach(sId => {
            io.to(sId).emit("newMessage", populatedMessage);
        });
        res.json({ success: true, message: populatedMessage });
    }
     catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// ── Phase 3: Emoji Reactions ──────────────────────────────────────────────
export const reactToMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        if (!emoji) {
            return res.json({ success: false, message: "Emoji is required" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.json({ success: false, message: "Message not found" });
        }

        // Check if user already reacted with this emoji — toggle off
        const existingIdx = message.reactions.findIndex(
            r => r.emoji === emoji && r.userId.toString() === userId.toString()
        );

        if (existingIdx !== -1) {
            // Remove the reaction (toggle off)
            message.reactions.splice(existingIdx, 1);
        } else {
            // Add the reaction
            message.reactions.push({ emoji, userId });
        }

        await message.save();

        // Determine who to notify in real-time
        const otherUserId = message.senderId.toString() === userId.toString()
            ? message.receiverId?.toString()
            : message.senderId.toString();

        // Emit to the other user if they're a DM participant
        if (otherUserId) {
            const otherSockets = getUserSocketIds(otherUserId);
            otherSockets.forEach(sId => {
                io.to(sId).emit("messageReaction", {
                    messageId: message._id,
                    reactions: message.reactions,
                });
            });
        }

        // If it's a party message, broadcast to the party room
        if (message.partyId) {
            io.to(`party_${message.partyId}`).emit("messageReaction", {
                messageId: message._id,
                reactions: message.reactions,
            });
        }

        res.json({ success: true, reactions: message.reactions });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Phase 3: Edit Message ──────────────────────────────────────────────────
export const editMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text || !text.trim()) {
            return res.json({ success: false, message: "Text is required" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.json({ success: false, message: "Message not found" });
        }

        // Only the sender can edit
        if (message.senderId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "You can only edit your own messages" });
        }

        // Can't edit deleted messages
        if (message.deletedAt) {
            return res.json({ success: false, message: "Cannot edit a deleted message" });
        }

        message.text = text.trim();
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        // Notify the other participant in real-time
        const otherUserId = message.receiverId?.toString();
        if (otherUserId) {
            const otherSockets = getUserSocketIds(otherUserId);
            otherSockets.forEach(sId => {
                io.to(sId).emit("messageEdited", {
                    messageId: message._id,
                    text: message.text,
                    isEdited: true,
                    editedAt: message.editedAt,
                });
            });
        }

        // If party message, broadcast to party room
        if (message.partyId) {
            io.to(`party_${message.partyId}`).emit("messageEdited", {
                messageId: message._id,
                text: message.text,
                isEdited: true,
                editedAt: message.editedAt,
            });
        }

        res.json({ success: true, message: { _id: message._id, text: message.text, isEdited: true, editedAt: message.editedAt } });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Phase 3: Delete Message (Soft Delete) ─────────────────────────────────
export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.json({ success: false, message: "Message not found" });
        }

        // Only the sender can delete
        if (message.senderId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "You can only delete your own messages" });
        }

        // Already deleted
        if (message.deletedAt) {
            return res.json({ success: false, message: "Message already deleted" });
        }

        message.deletedAt = new Date();
        await message.save();

        // Notify the other participant
        const otherUserId = message.receiverId?.toString();
        if (otherUserId) {
            const otherSockets = getUserSocketIds(otherUserId);
            otherSockets.forEach(sId => {
                io.to(sId).emit("messageDeleted", {
                    messageId: message._id,
                });
            });
        }

        // If party message, broadcast to party room
        if (message.partyId) {
            io.to(`party_${message.partyId}`).emit("messageDeleted", {
                messageId: message._id,
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};