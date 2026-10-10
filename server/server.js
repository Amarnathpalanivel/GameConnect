import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config(); // fallback to root .env if present
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js"
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import friendRouter from "./routes/friendRoutes.js";
import partyRouter from "./routes/partyRoutes.js";
import matchRouter from "./routes/matchRoutes.js";
import lfgRouter from "./routes/lfgRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import moderationRouter from "./routes/moderationRoutes.js";
import mediaRouter from "./routes/mediaRoutes.js";
import gameRouter from "./routes/gameRoutes.js";
import Party from "./models/Party.js";
import { Server } from "socket.io";



//Create Express app and HTTP server
const app = express();
const server = http.createServer(app)

//Initialize Socket.io server
export const io = new Server(server, {
    cors: { origin: "*" }
});

//Store online users: { [userId: string]: Set<string> }
export const userSocketMap = {};

// Phase 5: Voice Chat Rooms Storage
// Map<partyId: string, Map<userId: string, { socketId, userId, gamerTag, profilePic, isMuted, isDeafened, isSpeaking, joinedAt }>>
export const partyVoiceRooms = new Map();

export const getPartyVoiceUsers = (partyId) => {
    if (!partyId) return [];
    const key = partyId.toString();
    if (!partyVoiceRooms.has(key)) return [];
    return Array.from(partyVoiceRooms.get(key).values());
};

// Helper: get socket IDs for a given user
export const getUserSocketIds = (userId) => {
    if (!userId) return [];
    const sockets = userSocketMap[userId];
    if (!sockets) return [];
    if (sockets instanceof Set) return Array.from(sockets);
    if (typeof sockets === "string") return [sockets];
    return [];
};

//Socket.io connection handler
io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log("User Connected:", userId, "Socket:", socket.id);
    if (userId) {
        if (!userSocketMap[userId] || !(userSocketMap[userId] instanceof Set)) {
            userSocketMap[userId] = new Set();
        }
        userSocketMap[userId].add(socket.id);
    }
    //Emit online users to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // ── Auto-join all active party rooms on connect (non-blocking) ─────────
    if (userId) {
        Party.find({
            "members.userId": userId,
            status: "active",
        }).select("_id").then(userParties => {
            for (const party of userParties) {
                socket.join(`party_${party._id}`);
            }
        }).catch(err => {
            console.error("Error auto-joining party rooms:", err.message);
        });
    }

    // ── DM Typing Indicators ────────────────────────────────────────────────
    socket.on("typing_start", ({ toUserId }) => {
        const receiverSockets = getUserSocketIds(toUserId);
        receiverSockets.forEach(sId => {
            io.to(sId).emit("typing_indicator", { fromUserId: userId, isTyping: true });
        });
    });

    socket.on("typing_stop", ({ toUserId }) => {
        const receiverSockets = getUserSocketIds(toUserId);
        receiverSockets.forEach(sId => {
            io.to(sId).emit("typing_indicator", { fromUserId: userId, isTyping: false });
        });
    });

    // ── Party Room Management ───────────────────────────────────────────────
    socket.on("join_party", ({ partyId }) => {
        socket.join(`party_${partyId}`);
    });

    socket.on("leave_party", ({ partyId }) => {
        socket.leave(`party_${partyId}`);
    });

    socket.on("party_typing", ({ partyId }) => {
        // Broadcast to everyone in the party EXCEPT the sender
        socket.to(`party_${partyId}`).emit("party_typing_indicator", {
            fromUserId: userId,
            partyId,
            isTyping: true,
        });
    });

    socket.on("party_typing_stop", ({ partyId }) => {
        socket.to(`party_${partyId}`).emit("party_typing_indicator", {
            fromUserId: userId,
            partyId,
            isTyping: false,
        });
    });

    // ── Scrim Match Room Events ─────────────────────────────────────────────
    socket.on("join_scrim", ({ matchId }) => {
        socket.join(`scrim_${matchId}`);
    });

    socket.on("leave_scrim", ({ matchId }) => {
        socket.leave(`scrim_${matchId}`);
    });

    socket.on("scrim_chat", ({ matchId, text }) => {
        io.to(`scrim_${matchId}`).emit("newScrimChat", {
            matchId,
            senderId: userId,
            text,
            createdAt: new Date(),
        });
    });

    // ── Phase 5: WebRTC Voice Chat Signaling ────────────────────────────────
    socket.on("voice_join", ({ partyId, gamerTag, profilePic }) => {
        console.log("voice_join event on server:", { partyId, userId, socketId: socket.id });
        if (!partyId || !userId) {
            console.log("voice_join ABORTED: missing partyId or userId", { partyId, userId });
            return;
        }
        const pKey = partyId.toString();

        socket.join(`voice_${pKey}`);

        if (!partyVoiceRooms.has(pKey)) {
            partyVoiceRooms.set(pKey, new Map());
        }
        const room = partyVoiceRooms.get(pKey);

        const newVoiceUser = {
            socketId: socket.id,
            userId: userId.toString(),
            gamerTag: gamerTag || "Gamer",
            profilePic: profilePic || "",
            isMuted: false,
            isDeafened: false,
            isSpeaking: false,
            joinedAt: new Date(),
        };

        // Existing participants in this voice channel
        const existingUsers = Array.from(room.values()).filter(u => u.userId !== userId.toString());

        room.set(userId.toString(), newVoiceUser);

        // Send existing voice room participants to joining client
        socket.emit("voice_room_users", {
            partyId: pKey,
            users: existingUsers,
        });

        // Notify other peers in this voice room
        socket.to(`voice_${pKey}`).emit("voice_user_joined", newVoiceUser);

        // Broadcast voice roster update to the entire party chat room
        const allVoiceUsers = Array.from(room.values());
        io.to(`party_${pKey}`).emit("voice_roster_update", {
            partyId: pKey,
            count: allVoiceUsers.length,
            users: allVoiceUsers,
        });
    });

    socket.on("voice_signal", ({ toSocketId, signal }) => {
        if (!toSocketId || !signal) return;
        io.to(toSocketId).emit("voice_signal", {
            fromSocketId: socket.id,
            fromUserId: userId ? userId.toString() : null,
            signal,
        });
    });

    socket.on("voice_state", ({ partyId, isMuted, isDeafened }) => {
        if (!partyId || !userId) return;
        const pKey = partyId.toString();
        const room = partyVoiceRooms.get(pKey);
        if (room && room.has(userId.toString())) {
            const user = room.get(userId.toString());
            if (typeof isMuted === "boolean") user.isMuted = isMuted;
            if (typeof isDeafened === "boolean") user.isDeafened = isDeafened;

            socket.to(`voice_${pKey}`).emit("voice_user_state", {
                userId: userId.toString(),
                socketId: socket.id,
                isMuted: user.isMuted,
                isDeafened: user.isDeafened,
            });
        }
    });

    socket.on("voice_speaking", ({ partyId, isSpeaking }) => {
        if (!partyId || !userId) return;
        const pKey = partyId.toString();
        const room = partyVoiceRooms.get(pKey);
        if (room && room.has(userId.toString())) {
            const user = room.get(userId.toString());
            user.isSpeaking = !!isSpeaking;
            socket.to(`voice_${pKey}`).emit("voice_speaking_change", {
                userId: userId.toString(),
                socketId: socket.id,
                isSpeaking: !!isSpeaking,
            });
        }
    });

    socket.on("voice_leave", ({ partyId }) => {
        if (!partyId || !userId) return;
        const pKey = partyId.toString();
        socket.leave(`voice_${pKey}`);

        const room = partyVoiceRooms.get(pKey);
        if (room && room.has(userId.toString())) {
            room.delete(userId.toString());
            if (room.size === 0) partyVoiceRooms.delete(pKey);

            socket.to(`voice_${pKey}`).emit("voice_user_left", {
                userId: userId.toString(),
                socketId: socket.id,
            });

            const remaining = room ? Array.from(room.values()) : [];
            io.to(`party_${pKey}`).emit("voice_roster_update", {
                partyId: pKey,
                count: remaining.length,
                users: remaining,
            });
        }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
        console.log("User Disconnected:", userId, "Socket:", socket.id);

        // Clean up from all voice channels if currently joined
        if (userId) {
            const uStr = userId.toString();
            for (const [pKey, room] of partyVoiceRooms.entries()) {
                if (room.has(uStr)) {
                    room.delete(uStr);
                    if (room.size === 0) partyVoiceRooms.delete(pKey);

                    io.to(`voice_${pKey}`).emit("voice_user_left", {
                        userId: uStr,
                        socketId: socket.id,
                    });

                    const remaining = room ? Array.from(room.values()) : [];
                    io.to(`party_${pKey}`).emit("voice_roster_update", {
                        partyId: pKey,
                        count: remaining.length,
                        users: remaining,
                    });
                }
            }
        }

        if (userId && userSocketMap[userId]) {
            if (userSocketMap[userId] instanceof Set) {
                userSocketMap[userId].delete(socket.id);
                if (userSocketMap[userId].size === 0) {
                    delete userSocketMap[userId];
                }
            } else {
                delete userSocketMap[userId];
            }
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

//Middelware setup
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

//Route setup
app.use("/api/status",   (req, res) => res.send("Server is live"));
app.use("/api/auth",     userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/friends",  friendRouter);
app.use("/api/parties",       partyRouter);
app.use("/api/matches",       matchRouter);
app.use("/api/lfg",           lfgRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/moderation",    moderationRouter);
app.use("/api/media",         mediaRouter);
app.use("/api/games",         gameRouter);

// Connect to MongoDB
await connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server is running on PORT: " + PORT));