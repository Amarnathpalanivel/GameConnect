import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reportedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    targetType: {
        type: String,
        enum: ["user", "message", "party", "lfg"],
        default: "user",
    },
    targetId: {
        type: String,
        default: "",
    },
    reason: {
        type: String,
        enum: ["harassment", "cheating", "spam", "hate_speech", "nsfw", "toxic", "other"],
        required: true,
    },
    detail: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: ["pending", "resolved", "dismissed"],
        default: "pending",
    },
    actionTaken: {
        type: String,
        enum: ["none", "warn", "warned", "muted", "banned", "dismissed"],
        default: "none",
    },
    adminNotes: {
        type: String,
        default: "",
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    resolvedAt: {
        type: Date,
    },
}, { timestamps: true });

// Index for moderation queue queries
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedUserId: 1 });

const Report = mongoose.model("Report", reportSchema);
export default Report;
