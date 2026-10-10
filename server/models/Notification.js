import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    type: {
        type: String,
        required: true,
        enum: [
            "lfg_join",
            "lfg_leave",
            "lfg_full",
            "session_reminder",
            "party_invite",
            "friend_request",
            "friend_accepted",
            "endorsement",
            "warning",
            "system"
        ],
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: {
        type: Date,
    },
}, { timestamps: true });

// Pre-validate hook to support both recipientId and userId
notificationSchema.pre("validate", function () {
    if (!this.recipientId && this.userId) {
        this.recipientId = this.userId;
    }
    if (!this.userId && this.recipientId) {
        this.userId = this.recipientId;
    }
});

// Compound index for querying user notifications efficiently
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
