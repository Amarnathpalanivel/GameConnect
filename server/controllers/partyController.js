import Party from "../models/Party.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap, getPartyVoiceUsers } from "../server.js";
import { checkProfanity } from "./moderationController.js";
import crypto from "crypto";

// ── Helper: generate 8-char alphanumeric invite code ──────────────────────
const generateInviteCode = () => {
    return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 chars
};

// ── Create Party ──────────────────────────────────────────────────────────
export const createParty = async (req, res) => {
    try {
        const { name, game, maxPlayers, isOpen, isTransient, durationMinutes, activityType } = req.body;
        const userId = req.user._id;

        if (!name || !name.trim()) {
            return res.json({ success: false, message: "Party name is required" });
        }

        // Generate unique invite code
        let inviteCode = generateInviteCode();
        let attempts = 0;
        while (await Party.findOne({ inviteCode }) && attempts < 10) {
            inviteCode = generateInviteCode();
            attempts++;
        }

        const partyData = {
            name: name.trim(),
            game: game || "",
            activityType: activityType || "Casual",
            leaderId: userId,
            members: [{ userId, role: "leader", joinedAt: new Date() }],
            maxPlayers: Math.min(Math.max(maxPlayers || 5, 2), 16),
            inviteCode,
            isOpen: isOpen || false,
            isTransient: !!isTransient,
        };

        if (isTransient) {
            const minutes = Number(durationMinutes) || 45;
            partyData.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
        }

        const party = await Party.create(partyData);

        // Populate members for the response
        const populated = await Party.findById(party._id)
            .populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms");

        res.json({ success: true, party: populated });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get Party Details ─────────────────────────────────────────────────────
export const getParty = async (req, res) => {
    try {
        const { id } = req.params;
        const party = await Party.findById(id)
            .populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms");

        if (!party) {
            return res.json({ success: false, message: "Party not found" });
        }

        res.json({ success: true, party });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get My Active Parties ─────────────────────────────────────────────────
export const getMyParties = async (req, res) => {
    try {
        const userId = req.user._id;
        const parties = await Party.find({
            "members.userId": userId,
            status: "active",
        }).populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms")
          .sort({ updatedAt: -1 });

        res.json({ success: true, parties });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Join Party by Invite Code ─────────────────────────────────────────────
export const joinByInviteCode = async (req, res) => {
    try {
        const { inviteCode } = req.params;
        const userId = req.user._id;

        const party = await Party.findOne({ inviteCode: inviteCode.toUpperCase(), status: "active" });
        if (!party) {
            return res.json({ success: false, message: "Invalid or expired invite code" });
        }

        // Check if already a member
        if (party.members.some(m => m.userId.toString() === userId.toString())) {
            return res.json({ success: false, message: "You are already in this party" });
        }

        // Check capacity
        if (party.members.length >= party.maxPlayers) {
            return res.json({ success: false, message: "Party is full" });
        }

        party.members.push({ userId, role: "member", joinedAt: new Date() });
        await party.save();

        const populated = await Party.findById(party._id)
            .populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms");

        // Get joining user's info for the notification
        const joiner = await User.findById(userId).select("fullName gamerTag profilePic");

        // Notify all party members via socket
        io.to(`party_${party._id}`).emit("party_member_joined", {
            partyId: party._id,
            member: joiner,
            party: populated,
        });

        res.json({ success: true, party: populated, message: `Joined "${party.name}" party!` });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Invite a User by GamerTag ─────────────────────────────────────────────
export const inviteToParty = async (req, res) => {
    try {
        const { id: partyId } = req.params;
        const { gamerTag } = req.body;
        const userId = req.user._id;

        const party = await Party.findById(partyId);
        if (!party || party.status !== "active") {
            return res.json({ success: false, message: "Party not found" });
        }

        // Only leader/co-leader can invite
        const me = party.members.find(m => m.userId.toString() === userId.toString());
        if (!me || (me.role !== "leader" && me.role !== "co-leader")) {
            return res.json({ success: false, message: "Only party leaders can invite" });
        }

        const invitee = await User.findOne({ gamerTag }).select("fullName gamerTag profilePic");
        if (!invitee) {
            return res.json({ success: false, message: "Player not found" });
        }

        // Already in party?
        if (party.members.some(m => m.userId.toString() === invitee._id.toString())) {
            return res.json({ success: false, message: "Player is already in this party" });
        }

        // Full?
        if (party.members.length >= party.maxPlayers) {
            return res.json({ success: false, message: "Party is full" });
        }

        // Send socket notification to invitee
        const inviteeSocketId = userSocketMap[invitee._id.toString()];
        if (inviteeSocketId) {
            const inviter = await User.findById(userId).select("fullName gamerTag");
            io.to(inviteeSocketId).emit("party_invite", {
                partyId: party._id,
                partyName: party.name,
                inviteCode: party.inviteCode,
                from: inviter,
            });
        }

        res.json({ success: true, message: `Invitation sent to ${gamerTag}` });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Leave Party ───────────────────────────────────────────────────────────
export const leaveParty = async (req, res) => {
    try {
        const { id: partyId } = req.params;
        const userId = req.user._id;

        const party = await Party.findById(partyId);
        if (!party || party.status !== "active") {
            return res.json({ success: false, message: "Party not found" });
        }

        const memberIdx = party.members.findIndex(m => m.userId.toString() === userId.toString());
        if (memberIdx === -1) {
            return res.json({ success: false, message: "You are not in this party" });
        }

        const isLeader = party.members[memberIdx].role === "leader";
        party.members.splice(memberIdx, 1);

        if (party.members.length === 0) {
            // No members left — disband
            party.status = "disbanded";
            await party.save();
            io.to(`party_${party._id}`).emit("party_disbanded", { partyId: party._id });
        } else {
            // If the leader left, promote the next member
            if (isLeader) {
                party.members[0].role = "leader";
                party.leaderId = party.members[0].userId;
            }
            await party.save();

            const leaver = await User.findById(userId).select("fullName gamerTag profilePic");
            io.to(`party_${party._id}`).emit("party_member_left", {
                partyId: party._id,
                member: leaver,
                newLeaderId: isLeader ? party.leaderId : null,
            });
        }

        res.json({ success: true, message: "Left the party" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Kick Member (Leader only) ─────────────────────────────────────────────
export const kickMember = async (req, res) => {
    try {
        const { id: partyId, userId: kickUserId } = req.params;
        const myId = req.user._id;

        const party = await Party.findById(partyId);
        if (!party || party.status !== "active") {
            return res.json({ success: false, message: "Party not found" });
        }

        // Must be leader
        if (party.leaderId.toString() !== myId.toString()) {
            return res.json({ success: false, message: "Only the party leader can kick members" });
        }

        // Can't kick yourself
        if (kickUserId === myId.toString()) {
            return res.json({ success: false, message: "You can't kick yourself" });
        }

        const memberIdx = party.members.findIndex(m => m.userId.toString() === kickUserId);
        if (memberIdx === -1) {
            return res.json({ success: false, message: "User is not in this party" });
        }

        party.members.splice(memberIdx, 1);
        await party.save();

        const kicked = await User.findById(kickUserId).select("fullName gamerTag profilePic");

        // Notify the kicked user
        const kickedSocketId = userSocketMap[kickUserId];
        if (kickedSocketId) {
            io.to(kickedSocketId).emit("party_kicked", { partyId: party._id, partyName: party.name });
        }

        // Notify remaining members
        io.to(`party_${party._id}`).emit("party_member_left", {
            partyId: party._id,
            member: kicked,
            kicked: true,
        });

        res.json({ success: true, message: `Kicked ${kicked.gamerTag || kicked.fullName}` });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Disband Party (Leader only) ───────────────────────────────────────────
export const disbandParty = async (req, res) => {
    try {
        const { id: partyId } = req.params;
        const userId = req.user._id;

        const party = await Party.findById(partyId);
        if (!party || party.status !== "active") {
            return res.json({ success: false, message: "Party not found" });
        }

        if (party.leaderId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Only the party leader can disband" });
        }

        party.status = "disbanded";
        await party.save();

        io.to(`party_${party._id}`).emit("party_disbanded", {
            partyId: party._id,
            partyName: party.name,
        });

        res.json({ success: true, message: "Party disbanded" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get Party Messages ────────────────────────────────────────────────────
export const getPartyMessages = async (req, res) => {
    try {
        const { id: partyId } = req.params;
        const userId = req.user._id;

        // Verify membership
        const party = await Party.findById(partyId);
        if (!party) {
            return res.json({ success: false, message: "Party not found" });
        }
        if (!party.members.some(m => m.userId.toString() === userId.toString())) {
            return res.json({ success: false, message: "You are not a member of this party" });
        }

        const messages = await Message.find({ partyId })
            .sort({ createdAt: 1 })
            .populate("senderId", "fullName gamerTag profilePic")
            .populate("replyTo", "senderId text image");

        res.json({ success: true, messages });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Send Party Message ────────────────────────────────────────────────────
export const sendPartyMessage = async (req, res) => {
    try {
        const { id: partyId } = req.params;
        const { text, image, gifUrl, videoUrl, linkPreview, replyTo, messageType } = req.body;
        const senderId = req.user._id;

        // Verify membership
        const party = await Party.findById(partyId);
        if (!party || party.status !== "active") {
            return res.json({ success: false, message: "Party not found or disbanded" });
        }
        if (!party.members.some(m => m.userId.toString() === senderId.toString())) {
            return res.json({ success: false, message: "You are not a member of this party" });
        }

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        // Auto-moderation check: profanity filter
        const { cleanedText } = checkProfanity(text || "");

        const computedMessageType = gifUrl ? "gif" : (videoUrl ? "video" : (imageUrl ? "image" : (messageType || "text")));

        const messageData = {
            senderId,
            partyId,
            text: cleanedText,
            image: imageUrl,
            gifUrl: gifUrl || "",
            videoUrl: videoUrl || "",
            messageType: computedMessageType,
            linkPreview: linkPreview || undefined,
        };

        if (replyTo) {
            messageData.replyTo = replyTo;
        }

        const newMessage = await Message.create(messageData);

        const populatedMessage = await Message.findById(newMessage._id)
            .populate("senderId", "fullName gamerTag profilePic")
            .populate("replyTo", "senderId text image");

        // Emit to the entire party room
        io.to(`party_${partyId}`).emit("newPartyMessage", populatedMessage);

        res.json({ success: true, message: populatedMessage });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Quick Match (Hyper-Transient Micro-Lobby Queue) ───────────────────────
export const quickMatch = async (req, res) => {
    try {
        const { game, activityType, maxPlayers = 5, durationMinutes = 45 } = req.body;
        const userId = req.user._id;

        // 1. Check if user is already in an active matching lobby
        let existingUserParty = await Party.findOne({
            "members.userId": userId,
            status: "active",
            isTransient: true,
            game: game || { $exists: true },
        }).populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms");

        if (existingUserParty) {
            return res.json({ success: true, matched: true, party: existingUserParty, message: "Rejoined your active squad" });
        }

        // 2. Find an existing transient lobby with open slots
        const query = {
            status: "active",
            isOpen: true,
            isTransient: true,
            $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
            $expr: { $lt: [{ $size: "$members" }, "$maxPlayers"] },
        };

        if (game) query.game = game;
        if (activityType) query.activityType = activityType;

        const candidateParty = await Party.findOne(query)
            .populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms");

        if (candidateParty) {
            // Join this party
            candidateParty.members.push({ userId, role: "member", joinedAt: new Date() });
            await candidateParty.save();

            const updatedParty = await Party.findById(candidateParty._id)
                .populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms");

            // Notify party socket room
            io.to(`party_${candidateParty._id}`).emit("partyMemberJoined", {
                partyId: candidateParty._id,
                user: req.user,
            });

            return res.json({ success: true, matched: true, party: updatedParty, message: "Found an instant squad!" });
        }

        // 3. No match found -> create a new transient micro-lobby immediately
        const userTag = req.user.gamerTag || req.user.fullName || "Player";
        const newPartyData = {
            name: `${userTag}'s ${activityType || "Co-Op"} Squad`,
            game: game || req.user.primaryGame || "Multiplayer",
            activityType: activityType || "Casual",
            leaderId: userId,
            members: [{ userId, role: "leader", joinedAt: new Date() }],
            maxPlayers: Math.min(Math.max(Number(maxPlayers) || 5, 2), 16),
            inviteCode: generateInviteCode(),
            isOpen: true,
            isTransient: true,
            expiresAt: new Date(Date.now() + (Number(durationMinutes) || 45) * 60 * 1000),
        };

        const createdParty = await Party.create(newPartyData);
        const populatedParty = await Party.findById(createdParty._id)
            .populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms");

        res.json({
            success: true,
            matched: false,
            createdLobby: true,
            party: populatedParty,
            message: "Micro-lobby created! Waiting for players to join...",
        });
    } catch (error) {
        console.log("QuickMatch Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get All Active Transient Micro-Lobbies ────────────────────────────────
export const getTransientLobbies = async (req, res) => {
    try {
        const { game } = req.query;
        const query = {
            status: "active",
            isOpen: true,
            isTransient: true,
            $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
        };
        if (game) query.game = game;

        const lobbies = await Party.find(query)
            .populate("members.userId", "fullName gamerTag profilePic primaryGame rank region platforms")
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ success: true, lobbies });
    } catch (error) {
        console.log("GetTransientLobbies Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Phase 5: Get Voice Channel Active Participants ───────────────────────
export const getPartyVoiceUsersHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const party = await Party.findById(id);
        if (!party) {
            return res.json({ success: false, message: "Party not found" });
        }

        const voiceUsers = getPartyVoiceUsers(id);
        res.json({
            success: true,
            partyId: id,
            count: voiceUsers.length,
            users: voiceUsers,
        });
    } catch (error) {
        console.log("GetPartyVoiceUsers Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};
