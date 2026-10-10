import Match from "../models/Match.js";
import Party from "../models/Party.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../server.js";

// ── Propose Scrim ──────────────────────────────────────────────────────────
export const proposeScrim = async (req, res) => {
    try {
        const { myPartyId, opponentPartyId, game, format, scheduledTime } = req.body;
        const userId = req.user._id;

        const myParty = await Party.findById(myPartyId);
        if (!myParty || myParty.status !== "active") {
            return res.json({ success: false, message: "Your party is not active" });
        }
        if (myParty.leaderId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Only party leader can challenge to a scrim" });
        }

        const opponentParty = await Party.findById(opponentPartyId);
        if (!opponentParty || opponentParty.status !== "active") {
            return res.json({ success: false, message: "Challenged party does not exist or is disbanded" });
        }

        const match = await Match.create({
            teamA: {
                partyId: myParty._id,
                leaderId: userId,
                teamName: myParty.name,
            },
            teamB: {
                partyId: opponentParty._id,
                leaderId: opponentParty.leaderId,
                teamName: opponentParty.name,
            },
            game: game || myParty.game || opponentParty.game || "Competitive",
            format: format || "5v5 Best of 3",
            scheduledTime: scheduledTime || new Date(Date.now() + 30 * 60 * 1000),
            status: "pending",
        });

        // Notify both parties via Socket.io
        io.to(`party_${myParty._id}`).emit("scrimProposed", { matchId: match._id, opponent: opponentParty.name });
        io.to(`party_${opponentParty._id}`).emit("scrimReceived", { matchId: match._id, challenger: myParty.name });

        res.json({ success: true, match, message: "Scrim challenge sent successfully!" });
    } catch (error) {
        console.log("ProposeScrim Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Respond to Scrim (Accept / Decline) ────────────────────────────────────
export const respondToScrim = async (req, res) => {
    try {
        const { matchId } = req.params;
        const { action } = req.body; // "accepted" or "cancelled"
        const userId = req.user._id;

        const match = await Match.findById(matchId);
        if (!match) {
            return res.json({ success: false, message: "Match not found" });
        }

        if (match.teamB.leaderId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Only challenged party leader can respond" });
        }

        if (action === "accepted") {
            match.status = "accepted";
        } else {
            match.status = "cancelled";
        }

        await match.save();

        io.to(`party_${match.teamA.partyId}`).emit("scrimStatusChanged", { matchId: match._id, status: match.status });
        io.to(`party_${match.teamB.partyId}`).emit("scrimStatusChanged", { matchId: match._id, status: match.status });

        res.json({ success: true, match, message: `Scrim challenge ${action}` });
    } catch (error) {
        console.log("RespondToScrim Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Update Server Credentials ─────────────────────────────────────────────
export const updateServerCredentials = async (req, res) => {
    try {
        const { matchId } = req.params;
        const { serverIp, password, region, map } = req.body;
        const userId = req.user._id;

        const match = await Match.findById(matchId);
        if (!match) {
            return res.json({ success: false, message: "Match not found" });
        }

        // Leader of either team can update credentials
        const isLeaderA = match.teamA.leaderId.toString() === userId.toString();
        const isLeaderB = match.teamB.leaderId.toString() === userId.toString();

        if (!isLeaderA && !isLeaderB) {
            return res.json({ success: false, message: "Only team leaders can set server credentials" });
        }

        match.serverCredentials = {
            serverIp: serverIp || match.serverCredentials.serverIp,
            password: password || match.serverCredentials.password,
            region:   region || match.serverCredentials.region,
            map:      map || match.serverCredentials.map,
        };

        if (match.status === "accepted") {
            match.status = "in_progress";
        }

        await match.save();

        // Broadcast to both party rooms
        io.to(`party_${match.teamA.partyId}`).emit("scrimCredentialsUpdated", { matchId: match._id, credentials: match.serverCredentials });
        io.to(`party_${match.teamB.partyId}`).emit("scrimCredentialsUpdated", { matchId: match._id, credentials: match.serverCredentials });

        res.json({ success: true, match, message: "Server credentials updated and shared with both squads" });
    } catch (error) {
        console.log("UpdateCredentials Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Report Final Score & Proof Screenshot ─────────────────────────────────
export const reportMatchResult = async (req, res) => {
    try {
        const { matchId } = req.params;
        const { scoreA, scoreB, screenshotBase64, winnerPartyId } = req.body;
        const userId = req.user._id;

        const match = await Match.findById(matchId);
        if (!match) {
            return res.json({ success: false, message: "Match not found" });
        }

        let screenshotUrl = match.resultScreenshot;
        if (screenshotBase64) {
            const upload = await cloudinary.uploader.upload(screenshotBase64);
            screenshotUrl = upload.secure_url;
        }

        match.teamA.score = Number(scoreA) || 0;
        match.teamB.score = Number(scoreB) || 0;
        match.resultScreenshot = screenshotUrl;
        match.status = "completed";
        if (winnerPartyId) match.winnerPartyId = winnerPartyId;

        await match.save();

        io.to(`party_${match.teamA.partyId}`).emit("scrimResultReported", { matchId: match._id, match });
        io.to(`party_${match.teamB.partyId}`).emit("scrimResultReported", { matchId: match._id, match });

        res.json({ success: true, match, message: "Match result reported successfully" });
    } catch (error) {
        console.log("ReportResult Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Get My Active & Historical Scrims ─────────────────────────────────────
export const getMyScrims = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find parties user belongs to
        const userParties = await Party.find({ "members.userId": userId }).select("_id");
        const partyIds = userParties.map(p => p._id);

        const scrims = await Match.find({
            $or: [
                { "teamA.partyId": { $in: partyIds } },
                { "teamB.partyId": { $in: partyIds } },
            ]
        }).sort({ createdAt: -1 }).limit(30);

        res.json({ success: true, scrims });
    } catch (error) {
        console.log("GetMyScrims Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};
