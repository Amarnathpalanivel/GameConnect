import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema({
    from:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
}, { timestamps: true });

// Prevent duplicate pending requests between same two users
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
export default FriendRequest;
