import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
    teamA: {
        partyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Party", required: true },
        leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        teamName: { type: String, required: true },
        score:    { type: Number, default: 0 },
    },
    teamB: {
        partyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Party", required: true },
        leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        teamName: { type: String, required: true },
        score:    { type: Number, default: 0 },
    },
    game: { type: String, required: true },
    format: { type: String, default: "5v5 Best of 3" },
    scheduledTime: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ["pending", "accepted", "in_progress", "completed", "disputed", "cancelled"],
        default: "pending",
    },
    serverCredentials: {
        serverIp: { type: String, default: "" },
        password: { type: String, default: "" },
        region:   { type: String, default: "" },
        map:      { type: String, default: "" },
    },
    resultScreenshot: { type: String, default: "" },
    winnerPartyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
    disputeNotes:     { type: String, default: "" },
}, { timestamps: true });

matchSchema.index({ "teamA.partyId": 1, "teamB.partyId": 1, status: 1 });

const Match = mongoose.model("Match", matchSchema);
export default Match;
