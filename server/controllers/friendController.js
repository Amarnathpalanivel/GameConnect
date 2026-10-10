import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import Report from "../models/Report.js";
import { io, getUserSocketIds } from "../server.js";

// ── Send a Friend Request ──────────────────────────────────────────────────────
export const sendFriendRequest = async (req, res) => {
    try {
        const fromId = req.user._id;
        const { toGamerTag } = req.body;

        if (!toGamerTag) return res.json({ success: false, message: "GamerTag is required" });

        const toUser = await User.findOne({ gamerTag: toGamerTag, isVerified: true });
        if (!toUser) return res.json({ success: false, message: "Player not found" });
        if (toUser._id.toString() === fromId.toString())
            return res.json({ success: false, message: "You cannot add yourself" });

        // Check if already friends
        if (req.user.friends.includes(toUser._id))
            return res.json({ success: false, message: "Already friends" });

        // Check if blocked
        const toUserFull = await User.findById(toUser._id);
        if (toUserFull.blockedUsers.includes(fromId))
            return res.json({ success: false, message: "Unable to send request" });

        // Check for existing pending request
        const existing = await FriendRequest.findOne({ from: fromId, to: toUser._id });
        if (existing) return res.json({ success: false, message: "Request already sent" });

        const request = await FriendRequest.create({ from: fromId, to: toUser._id });

        // Real-time notification to receiver
        const receiverSockets = getUserSocketIds(toUser._id.toString());
        receiverSockets.forEach(sId => {
            io.to(sId).emit("friend_request", {
                requestId: request._id,
                from: {
                    _id: req.user._id,
                    fullName: req.user.fullName,
                    gamerTag: req.user.gamerTag,
                    profilePic: req.user.profilePic,
                    primaryGame: req.user.primaryGame,
                    region: req.user.region,
                },
            });
        });

        res.json({ success: true, message: "Friend request sent" });
    } catch (error) {
        if (error.code === 11000) return res.json({ success: false, message: "Request already sent" });
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Accept a Friend Request ────────────────────────────────────────────────────
export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const myId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.json({ success: false, message: "Request not found" });
        if (request.to.toString() !== myId.toString())
            return res.json({ success: false, message: "Unauthorized" });
        if (request.status !== "pending")
            return res.json({ success: false, message: "Request already handled" });

        request.status = "accepted";
        await request.save();

        // Add each other as friends
        await User.findByIdAndUpdate(myId, { $addToSet: { friends: request.from } });
        await User.findByIdAndUpdate(request.from, { $addToSet: { friends: myId } });

        // Notify the sender
        const senderSockets = getUserSocketIds(request.from.toString());
        senderSockets.forEach(sId => {
            io.to(sId).emit("friend_accepted", {
                by: {
                    _id: req.user._id,
                    fullName: req.user.fullName,
                    gamerTag: req.user.gamerTag,
                    profilePic: req.user.profilePic,
                },
            });
        });

        res.json({ success: true, message: "Friend request accepted" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Decline a Friend Request ───────────────────────────────────────────────────
export const declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const myId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.json({ success: false, message: "Request not found" });
        if (request.to.toString() !== myId.toString())
            return res.json({ success: false, message: "Unauthorized" });

        request.status = "declined";
        await request.save();

        res.json({ success: true, message: "Request declined" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get Incoming Pending Requests ──────────────────────────────────────────────
export const getPendingRequests = async (req, res) => {
    try {
        const myId = req.user._id;
        const requests = await FriendRequest.find({ to: myId, status: "pending" })
            .populate("from", "fullName gamerTag profilePic primaryGame rank region platforms");
        res.json({ success: true, requests });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get My Friends List ────────────────────────────────────────────────────────
export const getFriends = async (req, res) => {
    try {
        const myId = req.user._id;
        const user = await User.findById(myId)
            .populate("friends", "fullName gamerTag profilePic primaryGame rank region platforms isVerified customStatus");
        // Only return verified, non-banned friends
        const activeFriends = user.friends.filter(f => f.isVerified);
        res.json({ success: true, friends: activeFriends });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Unfriend ───────────────────────────────────────────────────────────────────
export const unfriend = async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;

        await User.findByIdAndUpdate(myId, { $pull: { friends: userId } });
        await User.findByIdAndUpdate(userId, { $pull: { friends: myId } });

        // Clean up accepted request record
        await FriendRequest.deleteMany({
            $or: [
                { from: myId, to: userId },
                { from: userId, to: myId },
            ],
        });

        res.json({ success: true, message: "Unfriended" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Block a User ───────────────────────────────────────────────────────────────
export const blockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;

        await User.findByIdAndUpdate(myId, {
            $addToSet: { blockedUsers: userId },
            $pull: { friends: userId },
        });
        // Also remove from their friends list
        await User.findByIdAndUpdate(userId, { $pull: { friends: myId } });

        res.json({ success: true, message: "User blocked" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Unblock a User ─────────────────────────────────────────────────────────────
export const unblockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: userId } });
        res.json({ success: true, message: "User unblocked" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Report a User ──────────────────────────────────────────────────────────────
export const reportUser = async (req, res) => {
    try {
        const { userId, reason = "other", detail = "" } = req.body;
        if (!userId) {
            return res.json({ success: false, message: "User ID is required" });
        }
        const report = await Report.create({
            reporterId: req.user._id,
            reportedUserId: userId,
            targetType: "user",
            targetId: userId,
            reason,
            detail,
            status: "pending",
        });
        console.log(`[REPORT] From: ${req.user._id} → Target: ${userId} | Reason: ${reason} | Detail: ${detail}`);
        res.json({ success: true, message: "Report submitted. Our team will review it.", reportId: report._id });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
