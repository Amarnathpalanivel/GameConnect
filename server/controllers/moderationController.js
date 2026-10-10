import Report from "../models/Report.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { io, getUserSocketIds } from "../server.js";

// Common toxic terms for auto-moderation
const BANNED_PATTERNS = [
    /\b(nigger|faggot|chink|kike|retard|cunt)\b/i,
    /\b(kill yourself|kys|hang yourself)\b/i,
];

export const checkProfanity = (text = "") => {
    if (!text) return { isClean: true, cleanedText: text };
    let flagged = false;
    let cleanedText = text;

    for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(cleanedText)) {
            flagged = true;
            cleanedText = cleanedText.replace(pattern, "****");
        }
    }
    return { isClean: !flagged, cleanedText };
};

// ── Submit a Content / User Report ──────────────────────────────────────────
export const submitReport = async (req, res) => {
    try {
        const { reportedUserId, targetType = "user", targetId = "", reason, detail = "" } = req.body;

        if (!reportedUserId || !reason) {
            return res.status(400).json({ success: false, message: "Reported user ID and reason are required" });
        }

        if (reportedUserId.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot report yourself" });
        }

        const report = await Report.create({
            reporterId: req.user._id,
            reportedUserId,
            targetType,
            targetId,
            reason,
            detail,
            status: "pending",
        });

        // Populate for response
        const populated = await Report.findById(report._id)
            .populate("reporterId", "fullName gamerTag profilePic")
            .populate("reportedUserId", "fullName gamerTag profilePic warnings isBanned");

        res.status(201).json({
            success: true,
            message: "Report submitted to moderation queue",
            report: populated,
        });
    } catch (error) {
        console.error("submitReport error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Get Moderation Reports Queue ───────────────────────────────────────────
export const getReports = async (req, res) => {
    try {
        const { status, targetType, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (targetType) query.targetType = targetType;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Report.countDocuments(query);

        const reports = await Report.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("reporterId", "fullName gamerTag profilePic")
            .populate("reportedUserId", "fullName gamerTag profilePic warnings isBanned reputationScore")
            .populate("resolvedBy", "fullName gamerTag");

        res.json({
            success: true,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            reports,
        });
    } catch (error) {
        console.error("getReports error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Take Action on a Report (Admin / Moderator) ─────────────────────────────
export const takeReportAction = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { action, adminNotes = "", durationDays = 7 } = req.body;

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        const reportedUser = await User.findById(report.reportedUserId);
        if (!reportedUser) {
            return res.status(404).json({ success: false, message: "Reported user not found" });
        }

        let actionTaken = action === "warn" ? "warned" : action;
        let notifMessage = "";

        if (action === "warn") {
            reportedUser.warnings = (reportedUser.warnings || 0) + 1;
            // Auto temporary ban if warnings hit 3
            if (reportedUser.warnings >= 3) {
                reportedUser.isBanned = true;
                reportedUser.banExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h temp ban
                actionTaken = "banned";
                notifMessage = "Your account has received 3 warnings and is temporarily suspended for 24 hours.";
            } else {
                notifMessage = `You received a moderation warning for: ${report.reason}. Warnings: ${reportedUser.warnings}/3.`;
            }
            await reportedUser.save();
        } else if (action === "ban") {
            reportedUser.isBanned = true;
            reportedUser.banExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
            await reportedUser.save();
            notifMessage = `Your account has been suspended for ${durationDays} days due to violations: ${report.reason}.`;
        } else if (action === "unban") {
            reportedUser.isBanned = false;
            reportedUser.banExpiresAt = null;
            await reportedUser.save();
            actionTaken = "none";
            notifMessage = "Your account suspension has been lifted by an administrator.";
        } else if (action === "dismiss") {
            actionTaken = "dismissed";
        }

        report.status = action === "dismiss" ? "dismissed" : "resolved";
        report.actionTaken = actionTaken;
        report.adminNotes = adminNotes;
        report.resolvedBy = req.user._id;
        report.resolvedAt = new Date();
        await report.save();

        // Dispatch notification to reported user if action taken
        if (notifMessage) {
            const notif = await Notification.create({
                recipientId: reportedUser._id,
                type: "warning",
                title: action === "ban" ? "Account Suspended" : "Moderation Notice",
                message: notifMessage,
                data: { reportId: report._id, action: actionTaken },
            });

            const sockets = getUserSocketIds(reportedUser._id.toString());
            sockets.forEach((sId) => io.to(sId).emit("notification", notif));
        }

        const updated = await Report.findById(report._id)
            .populate("reporterId", "fullName gamerTag profilePic")
            .populate("reportedUserId", "fullName gamerTag profilePic warnings isBanned")
            .populate("resolvedBy", "fullName gamerTag");

        res.json({
            success: true,
            message: `Report action '${action}' applied successfully`,
            report: updated,
            userStatus: {
                warnings: reportedUser.warnings,
                isBanned: reportedUser.isBanned,
                banExpiresAt: reportedUser.banExpiresAt,
            },
        });
    } catch (error) {
        console.error("takeReportAction error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Moderation Stats & Overview ─────────────────────────────────────────────
export const getModerationStats = async (req, res) => {
    try {
        const [totalReports, pendingReports, resolvedReports, totalBanned, warnedUsers] = await Promise.all([
            Report.countDocuments(),
            Report.countDocuments({ status: "pending" }),
            Report.countDocuments({ status: "resolved" }),
            User.countDocuments({ isBanned: true }),
            User.countDocuments({ warnings: { $gt: 0 } }),
        ]);

        res.json({
            success: true,
            stats: {
                totalReports,
                pendingReports,
                resolvedReports,
                totalBanned,
                warnedUsers,
            },
        });
    } catch (error) {
        console.error("getModerationStats error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Auto-Moderation Text Test Endpoint ──────────────────────────────────────
export const scanText = async (req, res) => {
    try {
        const { text = "" } = req.body;
        const result = checkProfanity(text);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
