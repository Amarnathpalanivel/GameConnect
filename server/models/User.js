import mongoose from "mongoose";

const PLATFORMS  = ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile"];
const REGIONS    = ["NA", "EU", "SEA", "APAC", "SA", "ME", "IN", "OC", "Global"];
const PLAYSTYLES = ["Competitive", "Casual", "Co-op", "Story", "eSports", "Speedrun"];

const userSchema = new mongoose.Schema({
    // ── Core Auth (unchanged) ──────────────────────────────────────────────────
    email:      { type: String, required: true, unique: true },
    fullName:   { type: String, required: true },
    password:   { type: String, required: true, minlength: 6 },
    profilePic: { type: String, default: "" },
    bio:        { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    otp:        { type: String },
    otpExpires: { type: Date },

    // ── Gaming Identity ────────────────────────────────────────────────────────
    gamerTag:     { type: String, unique: true, sparse: true, maxlength: 30 },
    platforms:    [{ type: String, enum: PLATFORMS }],
    primaryGame:  { type: String, default: "" },
    favoriteGames:{ type: [String], default: [] },   // up to 10 game names
    rank: {
        game:     { type: String, default: "" },
        tier:     { type: String, default: "" },      // Bronze / Silver / Gold / Platinum / Diamond / Master / Challenger
        division: { type: String, default: "" },      // I / II / III / IV
    },
    region:       { type: String, enum: [...REGIONS, ""], default: "" },
    timezone:     { type: String, default: "" },      // e.g. "Asia/Kolkata"
    playStyle:    [{ type: String, enum: PLAYSTYLES }],
    availability: { type: Object, default: {} },      // { mon: "18:00-23:00", ... }
    languages:    { type: [String], default: [] },
    micEnabled:   { type: Boolean, default: false },
    socialLinks: {
        twitch:   { type: String, default: "" },
        youtube:  { type: String, default: "" },
        steam:    { type: String, default: "" },
        discord:  { type: String, default: "" },
    },
    isStreamer:   { type: Boolean, default: false },

    // ── Custom Status ──────────────────────────────────────────────────────────
    customStatus: {
        text:      { type: String, default: "" },
        expiresAt: { type: Date },
    },

    // ── Social Graph ───────────────────────────────────────────────────────────
    friends:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    privacySettings: {
        dmFrom:       { type: String, enum: ["everyone", "friends", "nobody"], default: "everyone" },
        friendsFrom:  { type: String, enum: ["everyone", "friends", "nobody"], default: "everyone" },
        onlineVisible:{ type: String, enum: ["everyone", "friends", "nobody"], default: "everyone" },
    },

    // ── Role & Permissions ───────────────────────────────────────────────────
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },

    // ── Reputation & Gamification ──────────────────────────────────────────────
    reputationScore: { type: Number, default: 0 },
    totalRatings:    { type: Number, default: 0 },
    achievements:    { type: [String], default: [] },
    endorsements: {
        friendly:   { type: Number, default: 0 },
        shotCaller: { type: Number, default: 0 },
        greatComms: { type: Number, default: 0 },
        tiltProof:  { type: Number, default: 0 },
    },
    endorsedBy: [{
        userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        category:  { type: String },
        createdAt: { type: Date, default: Date.now },
    }],

    // ── Moderation ─────────────────────────────────────────────────────────────
    warnings:    { type: Number, default: 0 },
    isBanned:    { type: Boolean, default: false },
    banExpiresAt:{ type: Date },

    // ── Coaching & Mentorship Marketplace ──────────────────────────────────────
    isCoach: { type: Boolean, default: false },
    coachProfile: {
        title:                { type: String, default: "" },
        hourlyRate:           { type: Number, default: 0 },
        coachingBio:          { type: String, default: "" },
        gamesCoached:         [{ game: { type: String }, tierVerified: { type: String } }],
        bookingAvailability:  { type: Object, default: {} }, // e.g. { mon: ["18:00", "20:00"], sat: ["14:00", "16:00"] }
        totalSessions:        { type: Number, default: 0 },
        rating:               { type: Number, default: 5.0 },
        reviews: [{
            studentId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            studentName: { type: String, default: "Player" },
            rating:      { type: Number, min: 1, max: 5 },
            comment:     { type: String, default: "" },
            createdAt:   { type: Date, default: Date.now },
        }],
    },
}, { timestamps: true });

// Compound index for LFG player discovery
userSchema.index({ primaryGame: 1, region: 1 });

const User = mongoose.model("User", userSchema);
export default User;