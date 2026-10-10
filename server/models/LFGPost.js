import mongoose from "mongoose";

const lfgPostSchema = new mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    game: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    mode: {
        type: String,
        default: "Ranked",
        enum: ["Ranked", "Casual", "Competitive", "Raid", "Dungeon", "Tournament", "Custom", "Co-op"],
    },
    spotsTotal: {
        type: Number,
        default: 4,
        min: 2,
        max: 16,
    },
    spotsFilled: {
        type: Number,
        default: 1,
    },
    joinedPlayers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    rankRequirement: {
        type: String,
        default: "Any Rank",
    },
    region: {
        type: String,
        default: "Global",
        enum: ["NA", "EU", "SEA", "APAC", "SA", "ME", "IN", "OC", "Global"],
    },
    micRequired: {
        type: Boolean,
        default: true,
    },
    languages: [{
        type: String,
    }],
    scheduledAt: {
        type: Date,
        default: null, // null = Immediate / Right Now
        index: true,
    },
    estimatedDuration: {
        type: String,
        default: "1-2 Hours",
    },
    note: {
        type: String,
        default: "",
        maxlength: 300,
    },
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Party",
    },
    status: {
        type: String,
        enum: ["open", "full", "closed", "expired"],
        default: "open",
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

// Compound indexes for high-speed LFG board discovery
lfgPostSchema.index({ game: 1, status: 1, region: 1 });
lfgPostSchema.index({ scheduledAt: 1, status: 1 });
// TTL index: MongoDB automatically purges expired posts
lfgPostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LFGPost = mongoose.model("LFGPost", lfgPostSchema);
export default LFGPost;
