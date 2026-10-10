import mongoose from "mongoose";

const partySchema = new mongoose.Schema({
    name:       { type: String, required: true, maxlength: 40 },
    game:       { type: String, default: "" },
    activityType: { type: String, enum: ["Casual", "Ranked", "Raid", "Dungeon", "Boss", "Scrim", "Custom"], default: "Casual" },
    leaderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role:     { type: String, enum: ["leader", "co-leader", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
    }],
    maxPlayers: { type: Number, default: 5, min: 2, max: 16 },
    inviteCode: { type: String, unique: true },
    isOpen:     { type: Boolean, default: false },
    status:     { type: String, enum: ["active", "disbanded"], default: "active" },

    // ── Transient / Micro-Lobby Expansions ──────────────────────────────────
    isTransient: { type: Boolean, default: false },
    expiresAt:   { type: Date }, // MongoDB TTL Index will auto-purge when expired
}, { timestamps: true });

// Index for fast user-party lookups
partySchema.index({ "members.userId": 1, status: 1 });
// TTL index for transient micro-lobbies
partySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Party = mongoose.model("Party", partySchema);
export default Party;

