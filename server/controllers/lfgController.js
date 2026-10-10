import LFGPost from "../models/LFGPost.js";
import Party from "../models/Party.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import crypto from "crypto";
import { io, getUserSocketIds } from "../server.js";

// Helper: generate 8-char party invite code
const generateInviteCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();

// Helper: dispatch notification to user and send live socket event
const dispatchNotification = async ({ recipientId, senderId, type, title, message, data = {} }) => {
    try {
        const notif = await Notification.create({
            recipientId,
            senderId,
            type,
            title,
            message,
            data,
        });

        // Populate sender info for the client
        const populated = await Notification.findById(notif._id)
            .populate("senderId", "fullName gamerTag profilePic primaryGame rank");

        // Real-time socket emission to recipient's active connections
        const recipientSockets = getUserSocketIds(recipientId.toString());
        recipientSockets.forEach((sId) => {
            io.to(sId).emit("notification", populated);
        });

        return populated;
    } catch (err) {
        console.error("Error dispatching notification:", err.message);
    }
};

// ── Create LFG Post ────────────────────────────────────────────────────────
export const createLFGPost = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            title,
            game,
            mode = "Ranked",
            spotsTotal = 4,
            rankRequirement = "Any Rank",
            region = "Global",
            micRequired = true,
            languages = [],
            scheduledAt = null,
            estimatedDuration = "1-2 Hours",
            note = "",
        } = req.body;

        if (!title || !title.trim()) {
            return res.json({ success: false, message: "Title is required" });
        }
        if (!game || !game.trim()) {
            return res.json({ success: false, message: "Game is required" });
        }

        const validSpotsTotal = Math.min(Math.max(parseInt(spotsTotal) || 4, 2), 16);

        // Auto-provision an accompanying Party for squad communications
        let inviteCode = generateInviteCode();
        while (await Party.findOne({ inviteCode })) {
            inviteCode = generateInviteCode();
        }

        const linkedParty = await Party.create({
            name: `[LFG] ${title.trim().slice(0, 30)}`,
            game: game.trim(),
            leaderId: userId,
            members: [{ userId, role: "leader", joinedAt: new Date() }],
            maxPlayers: validSpotsTotal,
            inviteCode,
            isOpen: true,
            status: "active",
        });

        // Compute expiresAt (TTL)
        let computedExpiresAt;
        if (scheduledAt) {
            const schedDate = new Date(scheduledAt);
            computedExpiresAt = new Date(schedDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours post schedule
        } else {
            computedExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now
        }

        const newPost = await LFGPost.create({
            creatorId: userId,
            title: title.trim(),
            game: game.trim(),
            mode,
            spotsTotal: validSpotsTotal,
            spotsFilled: 1,
            joinedPlayers: [userId],
            rankRequirement,
            region,
            micRequired: Boolean(micRequired),
            languages: Array.isArray(languages) ? languages : [languages].filter(Boolean),
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            estimatedDuration,
            note: note.trim(),
            partyId: linkedParty._id,
            status: "open",
            expiresAt: computedExpiresAt,
        });

        const populatedPost = await LFGPost.findById(newPost._id)
            .populate("creatorId", "fullName gamerTag profilePic primaryGame rank region playStyle micEnabled")
            .populate("joinedPlayers", "fullName gamerTag profilePic primaryGame rank region")
            .populate("partyId", "name inviteCode status");

        // Broadcast new LFG post live to all connected players
        io.emit("lfg_new_post", populatedPost);

        res.json({ success: true, post: populatedPost });
    } catch (error) {
        console.error("Error creating LFG post:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get LFG Board ──────────────────────────────────────────────────────────
export const getLFGBoard = async (req, res) => {
    try {
        const {
            game,
            region,
            mode,
            rankRequirement,
            micRequired,
            isScheduled,
            search,
        } = req.query;

        const query = {
            status: { $in: ["open", "full"] },
            expiresAt: { $gt: new Date() },
        };

        if (game && game.trim()) {
            query.game = { $regex: new RegExp(game.trim(), "i") };
        }
        if (region && region !== "All" && region !== "Global") {
            query.region = { $in: [region, "Global"] };
        }
        if (mode && mode !== "All") {
            query.mode = mode;
        }
        if (rankRequirement && rankRequirement !== "All") {
            query.rankRequirement = rankRequirement;
        }
        if (micRequired !== undefined && micRequired !== "") {
            query.micRequired = micRequired === "true";
        }
        if (isScheduled === "true") {
            query.scheduledAt = { $ne: null, $gt: new Date() };
        } else if (isScheduled === "false") {
            query.scheduledAt = null;
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            query.$or = [
                { title: searchRegex },
                { game: searchRegex },
                { note: searchRegex },
            ];
        }

        const sortOption = isScheduled === "true" ? { scheduledAt: 1 } : { createdAt: -1 };

        const posts = await LFGPost.find(query)
            .populate("creatorId", "fullName gamerTag profilePic primaryGame rank region playStyle micEnabled")
            .populate("joinedPlayers", "fullName gamerTag profilePic primaryGame rank region")
            .populate("partyId", "name inviteCode status")
            .sort(sortOption)
            .limit(50);

        res.json({ success: true, posts });
    } catch (error) {
        console.error("Error fetching LFG board:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get Single LFG Post ────────────────────────────────────────────────────
export const getLFGPost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await LFGPost.findById(id)
            .populate("creatorId", "fullName gamerTag profilePic primaryGame rank region playStyle micEnabled")
            .populate("joinedPlayers", "fullName gamerTag profilePic primaryGame rank region")
            .populate("partyId", "name inviteCode status");

        if (!post) {
            return res.json({ success: false, message: "LFG post not found" });
        }

        res.json({ success: true, post });
    } catch (error) {
        console.error("Error fetching LFG post:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Join LFG Post (Squad Up) ───────────────────────────────────────────────
export const joinLFGPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const post = await LFGPost.findById(id);
        if (!post) {
            return res.json({ success: false, message: "LFG post not found" });
        }

        if (post.status === "closed" || post.expiresAt < new Date()) {
            return res.json({ success: false, message: "This LFG post has expired or closed" });
        }

        // Check if user is already joined
        const isJoined = post.joinedPlayers.some((pId) => pId.toString() === userId.toString());
        if (isJoined) {
            return res.json({ success: false, message: "You have already joined this squad" });
        }

        // Check capacity
        if (post.spotsFilled >= post.spotsTotal) {
            return res.json({ success: false, message: "Squad is already full" });
        }

        post.joinedPlayers.push(userId);
        post.spotsFilled += 1;

        const isNowFull = post.spotsFilled >= post.spotsTotal;
        if (isNowFull) {
            post.status = "full";
        }

        await post.save();

        // Also add user to the linked Party roster
        if (post.partyId) {
            const party = await Party.findById(post.partyId);
            if (party && !party.members.some((m) => m.userId.toString() === userId.toString())) {
                party.members.push({ userId, role: "member", joinedAt: new Date() });
                await party.save();

                // Auto-join socket to party room if active socket exists
                const userSockets = getUserSocketIds(userId.toString());
                userSockets.forEach((sId) => {
                    const clientSocket = io.sockets.sockets.get(sId);
                    if (clientSocket) clientSocket.join(`party_${party._id}`);
                });
            }
        }

        const updatedPost = await LFGPost.findById(post._id)
            .populate("creatorId", "fullName gamerTag profilePic primaryGame rank region playStyle micEnabled")
            .populate("joinedPlayers", "fullName gamerTag profilePic primaryGame rank region")
            .populate("partyId", "name inviteCode status");

        // Notify creator of new player joining
        await dispatchNotification({
            recipientId: post.creatorId,
            senderId: userId,
            type: "lfg_join",
            title: "Player Joined Your Squad!",
            message: `${req.user.gamerTag || req.user.fullName} joined your LFG squad for ${post.game} (${post.spotsFilled}/${post.spotsTotal}).`,
            data: { lfgId: post._id, partyId: post.partyId },
        });

        // If squad reached max capacity, trigger "squad full" alert to creator
        if (isNowFull) {
            await dispatchNotification({
                recipientId: post.creatorId,
                senderId: userId,
                type: "lfg_full",
                title: "Squad Full & Ready!",
                message: `Your LFG squad for ${post.game} ("${post.title}") is now full! Head to your party lobby.`,
                data: { lfgId: post._id, partyId: post.partyId },
            });
        }

        // Live broadcast update to LFG board
        io.emit("lfg_post_update", updatedPost);

        res.json({ success: true, post: updatedPost });
    } catch (error) {
        console.error("Error joining LFG post:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Leave LFG Post ─────────────────────────────────────────────────────────
export const leaveLFGPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const post = await LFGPost.findById(id);
        if (!post) {
            return res.json({ success: false, message: "LFG post not found" });
        }

        if (post.creatorId.toString() === userId.toString()) {
            return res.json({ success: false, message: "Squad leader cannot leave. You can close or disband the post." });
        }

        const playerIdx = post.joinedPlayers.findIndex((pId) => pId.toString() === userId.toString());
        if (playerIdx === -1) {
            return res.json({ success: false, message: "You are not a member of this squad" });
        }

        post.joinedPlayers.splice(playerIdx, 1);
        post.spotsFilled = Math.max(1, post.spotsFilled - 1);
        if (post.status === "full") {
            post.status = "open";
        }

        await post.save();

        // Also remove member from linked Party
        if (post.partyId) {
            await Party.findByIdAndUpdate(post.partyId, {
                $pull: { members: { userId } },
            });
        }

        const updatedPost = await LFGPost.findById(post._id)
            .populate("creatorId", "fullName gamerTag profilePic primaryGame rank region playStyle micEnabled")
            .populate("joinedPlayers", "fullName gamerTag profilePic primaryGame rank region")
            .populate("partyId", "name inviteCode status");

        // Notify squad creator
        await dispatchNotification({
            recipientId: post.creatorId,
            senderId: userId,
            type: "lfg_leave",
            title: "Player Left Squad",
            message: `${req.user.gamerTag || req.user.fullName} left your LFG squad for ${post.game}. A spot opened up!`,
            data: { lfgId: post._id, partyId: post.partyId },
        });

        io.emit("lfg_post_update", updatedPost);

        res.json({ success: true, post: updatedPost });
    } catch (error) {
        console.error("Error leaving LFG post:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Close / Cancel LFG Post ────────────────────────────────────────────────
export const closeLFGPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const post = await LFGPost.findById(id);
        if (!post) {
            return res.json({ success: false, message: "LFG post not found" });
        }

        if (post.creatorId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Only the squad creator can close this post" });
        }

        post.status = "closed";
        await post.save();

        const updatedPost = await LFGPost.findById(post._id)
            .populate("creatorId", "fullName gamerTag profilePic primaryGame rank region playStyle micEnabled")
            .populate("joinedPlayers", "fullName gamerTag profilePic primaryGame rank region")
            .populate("partyId", "name inviteCode status");

        io.emit("lfg_post_update", updatedPost);

        res.json({ success: true, message: "LFG post closed", post: updatedPost });
    } catch (error) {
        console.error("Error closing LFG post:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get Upcoming Scheduled Sessions (Calendar View) ────────────────────────
export const getUpcomingSessions = async (req, res) => {
    try {
        const userId = req.user._id;

        const sessions = await LFGPost.find({
            scheduledAt: { $ne: null, $gt: new Date() },
            status: { $in: ["open", "full"] },
            $or: [
                { creatorId: userId },
                { joinedPlayers: userId },
            ],
        })
            .populate("creatorId", "fullName gamerTag profilePic primaryGame rank region playStyle micEnabled")
            .populate("joinedPlayers", "fullName gamerTag profilePic primaryGame rank region")
            .populate("partyId", "name inviteCode status")
            .sort({ scheduledAt: 1 });

        res.json({ success: true, sessions });
    } catch (error) {
        console.error("Error fetching scheduled sessions:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Send Session Reminder Notifications ────────────────────────────────────
export const sendSessionReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const post = await LFGPost.findById(id).populate("creatorId", "gamerTag fullName");
        if (!post) {
            return res.json({ success: false, message: "Session post not found" });
        }

        if (post.creatorId._id.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Only the session organizer can send reminders" });
        }

        const scheduledTimeStr = post.scheduledAt
            ? new Date(post.scheduledAt).toLocaleString()
            : "soon";

        // Dispatch to all joined players (excluding the creator themselves)
        const recipientIds = post.joinedPlayers.filter(
            (pId) => pId.toString() !== userId.toString()
        );

        await Promise.all(
            recipientIds.map((recId) =>
                dispatchNotification({
                    recipientId: recId,
                    senderId: userId,
                    type: "session_reminder",
                    title: `⏰ Session Reminder: ${post.game}`,
                    message: `Squad organizer ${post.creatorId.gamerTag || post.creatorId.fullName} pinged a reminder for "${post.title}". Scheduled: ${scheduledTimeStr}.`,
                    data: { lfgId: post._id, partyId: post.partyId },
                })
            )
        );

        res.json({
            success: true,
            message: `Reminder notifications sent to ${recipientIds.length} squad member(s)`,
        });
    } catch (error) {
        console.error("Error sending session reminder:", error.message);
        res.json({ success: false, message: error.message });
    }
};
