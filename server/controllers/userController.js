import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import Notification from "../models/Notification.js";
import bcrypt from 'bcryptjs';
import { generateToken } from "../lib/utils.js"
import cloudinary from "../lib/cloudinary.js"
import { sendOTPEmail } from "../lib/nodemailer.js"
import { io, getUserSocketIds } from "../server.js";

// Helper: generate a unique gamer tag  e.g. "NightWolf#2847"
const generateGamerTag = async (fullName) => {
    const base = fullName.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "Player";
    let tag, exists;
    do {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        tag = `${base}#${suffix}`;
        exists = await User.findOne({ gamerTag: tag });
    } while (exists);
    return tag;
};

//Signup a new User with OTP verification
export const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body;
    try {
        if (!fullName || !email || !password) {
            return res.json({ success: false, message: "Missing Details" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const userBio = (bio && bio.trim()) ? bio.trim() : "Gaming enthusiast ready to squad up!";
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            if (existingUser.isVerified) {
                return res.json({ success: false, message: "Account with this email already exists" });
            }
            // User exists but unverified: update details, generate fresh OTP and resend
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

            existingUser.fullName = fullName;
            existingUser.password = hashedPassword;
            existingUser.bio = userBio;
            existingUser.otp = otp;
            existingUser.otpExpires = otpExpires;
            await existingUser.save();

            await sendOTPEmail(normalizedEmail, otp);
            return res.json({
                success: true,
                requireVerification: true,
                email: normalizedEmail,
                message: "Verification code sent to your email",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Auto-generate a unique gamer tag on signup
        const gamerTag = await generateGamerTag(fullName);

        await User.create({
            fullName,
            email: normalizedEmail,
            password: hashedPassword,
            bio: userBio,
            gamerTag,
            isVerified: false,
            otp,
            otpExpires,
        });

        await sendOTPEmail(normalizedEmail, otp);

        res.json({
            success: true,
            requireVerification: true,
            email: normalizedEmail,
            message: "Verification code sent to your email",
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Verify OTP
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.isVerified) {
            const token = generateToken(user._id);
            return res.json({ success: true, userData: user, token, message: "Account already verified" });
        }

        if (user.otp !== otp.toString().trim()) {
            return res.json({ success: false, message: "Invalid verification code" });
        }

        if (new Date() > new Date(user.otpExpires)) {
            return res.json({ success: false, message: "Verification code has expired. Please request a new one." });
        }

        // Mark user verified and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        const token = generateToken(user._id);

        res.json({
            success: true,
            userData: user,
            token,
            message: "Account verified successfully",
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Resend OTP
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.isVerified) {
            return res.json({ success: false, message: "Account already verified. Please log in." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await sendOTPEmail(normalizedEmail, otp);

        res.json({ success: true, message: "New verification code sent to your email" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

//controller to login a user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const userData = await User.findOne({ email: normalizedEmail })

        if (!userData) {
            return res.json({ success: false, message: "Invalid Credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);

        if (!isPasswordCorrect) {
            return res.json({ success: false, message: "Invalid Credentials" });
        }

        // If user is not yet verified, send fresh OTP and prompt verification
        if (!userData.isVerified) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            userData.otp = otp;
            userData.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
            await userData.save();

            await sendOTPEmail(normalizedEmail, otp);

            return res.json({
                success: false,
                requireVerification: true,
                email: normalizedEmail,
                message: "Please verify your email before logging in. We sent you a new code.",
            });
        }

        const token = generateToken(userData._id)

        res.json({ success: true, userData, token, message: "Login successfully" })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

//Controller to check if user is authenticated
export const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
}

//Controller to update user profile details (full gaming identity)
export const updateProfile = async (req, res) => {
    try {
        const {
            profilePic, bio, fullName, gamerTag,
            platforms, primaryGame, favoriteGames, rank,
            region, timezone, playStyle, languages, micEnabled,
            socialLinks, isStreamer, customStatus,
        } = req.body;

        const userId = req.user._id;

        // Validate gamerTag uniqueness if being changed
        if (gamerTag && gamerTag !== req.user.gamerTag) {
            const tagTaken = await User.findOne({ gamerTag, _id: { $ne: userId } });
            if (tagTaken) {
                return res.json({ success: false, message: "GamerTag is already taken. Try a different one." });
            }
        }

        const updates = {
            fullName, bio, gamerTag,
            platforms, primaryGame, favoriteGames, rank,
            region, timezone, playStyle, languages, micEnabled,
            socialLinks, isStreamer, customStatus,
        };

        // Remove undefined keys so we don't overwrite with null
        Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

        if (profilePic) {
            const upload = await cloudinary.uploader.upload(profilePic);
            updates.profilePic = upload.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get a public player profile by gamerTag (for profile card popup)
export const getPublicProfile = async (req, res) => {
    try {
        const { gamerTag } = req.params;
        const user = await User.findOne({ gamerTag, isVerified: true })
            .select("-password -otp -otpExpires -blockedUsers -warnings -isBanned -banExpiresAt");
        if (!user) {
            return res.json({ success: false, message: "Player not found" });
        }
        res.json({ success: true, user });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Algorithmic Behavioral Matchmaking ─────────────────────────────────────
export const getBehavioralMatches = async (req, res) => {
    try {
        const me = req.user;
        const myPlayStyles = Array.isArray(me.playStyle) ? me.playStyle : [];
        const myFriends = (me.friends || []).map(f => f.toString());
        const myBlocked = (me.blockedUsers || []).map(b => b.toString());

        // Find potential teammates (exclude me, my friends, blocked, and banned)
        const candidates = await User.find({
            _id: { $ne: me._id, $nin: [...myFriends, ...myBlocked] },
            isVerified: true,
            isBanned: { $ne: true },
        }).select("fullName gamerTag profilePic primaryGame favoriteGames rank region playStyle micEnabled reputationScore availability customStatus");

        const TIER_ORDER = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Challenger"];

        const scoredCandidates = candidates.map(candidate => {
            // 1. PlayStyle Overlap (35 pts max)
            const candPlayStyles = Array.isArray(candidate.playStyle) ? candidate.playStyle : [];
            let overlapCount = 0;
            myPlayStyles.forEach(ps => {
                if (candPlayStyles.includes(ps)) overlapCount++;
            });
            const maxStyles = Math.max(myPlayStyles.length, 1);
            const playStyleScore = Math.min((overlapCount / maxStyles) * 35, 35);

            // 2. Mic Affinity (20 pts max)
            const micScore = (me.micEnabled === candidate.micEnabled) ? 20 : 8;

            // 3. Rank Tier Delta (20 pts max)
            const myTierIndex = me.rank?.tier ? TIER_ORDER.indexOf(me.rank.tier) : -1;
            const candTierIndex = candidate.rank?.tier ? TIER_ORDER.indexOf(candidate.rank.tier) : -1;
            let rankScore = 10;
            if (myTierIndex !== -1 && candTierIndex !== -1) {
                const delta = Math.abs(myTierIndex - candTierIndex);
                if (delta === 0) rankScore = 20;
                else if (delta === 1) rankScore = 15;
                else if (delta === 2) rankScore = 10;
                else rankScore = 4;
            }

            // 4. Region Match (15 pts max)
            let regionScore = 0;
            if (me.region && candidate.region) {
                regionScore = (me.region === candidate.region || me.region === "Global" || candidate.region === "Global") ? 15 : 4;
            } else {
                regionScore = 8;
            }

            // 5. Reputation Karma (10 pts max)
            const repScore = Math.min(Math.max((candidate.reputationScore || 0) / 10, 0), 10);

            // Total Synergy Score
            const synergyScore = Math.round(playStyleScore + micScore + rankScore + regionScore + repScore);

            return {
                user: candidate,
                synergyScore: Math.min(synergyScore, 100),
                breakdown: {
                    playStyleScore: Math.round(playStyleScore),
                    micScore,
                    rankScore,
                    regionScore,
                    repScore: Math.round(repScore),
                    commonPlayStyles: myPlayStyles.filter(ps => candPlayStyles.includes(ps)),
                }
            };
        });

        // Sort descending by highest synergy score
        scoredCandidates.sort((a, b) => b.synergyScore - a.synergyScore);

        res.json({
            success: true,
            matches: scoredCandidates.slice(0, 25),
        });
    } catch (error) {
        console.log("BehavioralMatchmaking Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Coaching Marketplace Controllers ──────────────────────────────────────
export const updateCoachProfile = async (req, res) => {
    try {
        const { isCoach, title, hourlyRate, coachingBio, gamesCoached, bookingAvailability } = req.body;
        const userId = req.user._id;

        const updateData = {};
        if (typeof isCoach === "boolean") updateData.isCoach = isCoach;

        const coachProfile = {
            ...(req.user.coachProfile || {}),
            title: title !== undefined ? title : req.user.coachProfile?.title || "",
            hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : req.user.coachProfile?.hourlyRate || 0,
            coachingBio: coachingBio !== undefined ? coachingBio : req.user.coachProfile?.coachingBio || "",
            gamesCoached: Array.isArray(gamesCoached) ? gamesCoached : req.user.coachProfile?.gamesCoached || [],
            bookingAvailability: bookingAvailability || req.user.coachProfile?.bookingAvailability || {},
        };

        updateData.coachProfile = coachProfile;

        const updated = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select("-password");
        res.json({ success: true, user: updated, message: "Coach profile updated successfully" });
    } catch (error) {
        console.log("UpdateCoachProfile Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getCoaches = async (req, res) => {
    try {
        const { game, minRating } = req.query;
        const query = { isCoach: true, isVerified: true, isBanned: { $ne: true } };

        if (game) {
            query.$or = [
                { "coachProfile.gamesCoached.game": new RegExp(game, "i") },
                { primaryGame: new RegExp(game, "i") },
            ];
        }
        if (minRating) {
            query["coachProfile.rating"] = { $gte: Number(minRating) };
        }

        const coaches = await User.find(query)
            .select("fullName gamerTag profilePic primaryGame rank region coachProfile availability")
            .sort({ "coachProfile.rating": -1, "coachProfile.totalSessions": -1 });

        res.json({ success: true, coaches });
    } catch (error) {
        console.log("GetCoaches Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

export const bookCoachSession = async (req, res) => {
    try {
        const { coachId } = req.params;
        const { game, sessionDate, notes, proposedHourlyRate } = req.body;
        const student = req.user;

        const coach = await User.findById(coachId);
        if (!coach || !coach.isCoach) {
            return res.json({ success: false, message: "Coach not found or not active" });
        }

        // Increment sessions
        await User.findByIdAndUpdate(coachId, { $inc: { "coachProfile.totalSessions": 1 } });

        res.json({
            success: true,
            message: `Booking request sent to Coach ${coach.gamerTag || coach.fullName}!`,
            booking: {
                coachId,
                coachName: coach.gamerTag || coach.fullName,
                studentId: student._id,
                game: game || coach.primaryGame,
                sessionDate: sessionDate || new Date(),
                notes: notes || "1-on-1 VOD review and ranked mechanics session",
                rate: proposedHourlyRate || coach.coachProfile?.hourlyRate || 0,
                status: "confirmed",
            }
        });
    } catch (error) {
        console.log("BookCoachSession Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

export const reviewCoach = async (req, res) => {
    try {
        const { coachId } = req.params;
        const { rating, comment } = req.body;
        const studentId = req.user._id;

        const coach = await User.findById(coachId);
        if (!coach || !coach.isCoach) {
            return res.json({ success: false, message: "Coach not found" });
        }

        const newReview = {
            studentId,
            studentName: req.user.gamerTag || req.user.fullName || "Student",
            rating: Math.min(Math.max(Number(rating) || 5, 1), 5),
            comment: comment || "",
            createdAt: new Date(),
        };

        const existingReviews = coach.coachProfile?.reviews || [];
        existingReviews.push(newReview);

        const totalRating = existingReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = Number((totalRating / existingReviews.length).toFixed(1));

        coach.coachProfile.reviews = existingReviews;
        coach.coachProfile.rating = avgRating;
        await coach.save();

        res.json({ success: true, message: "Review posted successfully", rating: avgRating });
    } catch (error) {
        console.log("ReviewCoach Error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Endorse a Player (Honor System) ──────────────────────────────────────────
export const endorsePlayer = async (req, res) => {
    try {
        const { userId } = req.params;
        const { category } = req.body;
        const validCategories = ["friendly", "shotCaller", "greatComms", "tiltProof"];

        if (!validCategories.includes(category)) {
            return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${validCategories.join(", ")}` });
        }

        if (userId.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot endorse yourself" });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Player not found" });
        }

        // Initialize endorsements if needed
        if (!targetUser.endorsements) {
            targetUser.endorsements = { friendly: 0, shotCaller: 0, greatComms: 0, tiltProof: 0 };
        }
        if (!targetUser.endorsedBy) {
            targetUser.endorsedBy = [];
        }

        // Check if recently endorsed by same user for same category (12 hour cooldown)
        const recentEndorsement = targetUser.endorsedBy.find(
            (e) => e.userId?.toString() === req.user._id.toString() &&
                   e.category === category &&
                   (Date.now() - new Date(e.createdAt).getTime()) < 12 * 60 * 60 * 1000
        );

        if (recentEndorsement) {
            return res.status(400).json({ success: false, message: `You have already endorsed this player for ${category} recently. Cooldown is 12 hours.` });
        }

        // Increment endorsement category and reputation score (+10)
        targetUser.endorsements[category] = (targetUser.endorsements[category] || 0) + 1;
        targetUser.reputationScore = (targetUser.reputationScore || 0) + 10;
        targetUser.totalRatings = (targetUser.totalRatings || 0) + 1;
        targetUser.endorsedBy.push({
            userId: req.user._id,
            category,
            createdAt: new Date(),
        });

        // Check achievement: Verified Veteran if reputationScore >= 30
        if (!targetUser.achievements) targetUser.achievements = [];
        if (targetUser.reputationScore >= 30 && !targetUser.achievements.includes("Verified Veteran")) {
            targetUser.achievements.push("Verified Veteran");
        }

        await targetUser.save();

        const categoryLabels = {
            friendly: "Friendly & Supportive",
            shotCaller: "Shot Caller & Leader",
            greatComms: "Great Comms & Callouts",
            tiltProof: "Tilt-Proof & Resilient",
        };

        // Send in-app notification to the endorsed player
        const notif = await Notification.create({
            recipientId: targetUser._id,
            type: "endorsement",
            title: "Player Honor Endorsement! 🌟",
            message: `${req.user.gamerTag || req.user.fullName} endorsed you for "${categoryLabels[category]}" (+10 Rep)`,
            data: { fromUserId: req.user._id, category },
        });

        const sockets = getUserSocketIds(targetUser._id.toString());
        sockets.forEach((sId) => io.to(sId).emit("notification", notif));

        res.json({
            success: true,
            message: `Successfully endorsed ${targetUser.gamerTag || targetUser.fullName} for ${categoryLabels[category]}!`,
            endorsements: targetUser.endorsements,
            reputationScore: targetUser.reputationScore,
            achievements: targetUser.achievements,
        });
    } catch (error) {
        console.error("endorsePlayer error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Get Player Reputation Breakdown ──────────────────────────────────────────
export const getPlayerReputation = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select("fullName gamerTag profilePic reputationScore totalRatings endorsements achievements warnings isBanned isCoach coachProfile");
        if (!user) {
            return res.status(404).json({ success: false, message: "Player not found" });
        }

        const score = user.reputationScore || 0;
        let honorTier = "Honorable Player";
        if (score >= 100) honorTier = "Grand Master Exemplar";
        else if (score >= 60) honorTier = "Valued Veteran";
        else if (score >= 30) honorTier = "Trusted Teammate";
        else if (score < 0) honorTier = "Under Review";

        res.json({
            success: true,
            reputation: {
                userId: user._id,
                gamerTag: user.gamerTag || user.fullName,
                reputationScore: score,
                honorTier,
                totalRatings: user.totalRatings || 0,
                endorsements: user.endorsements || { friendly: 0, shotCaller: 0, greatComms: 0, tiltProof: 0 },
                achievements: user.achievements || [],
                warnings: user.warnings || 0,
                isBanned: user.isBanned || false,
            },
        });
    } catch (error) {
        console.error("getPlayerReputation error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Check & Unlock User Achievements ─────────────────────────────────────────
export const checkUserAchievements = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const currentAchievements = new Set(user.achievements || []);
        const newlyUnlocked = [];

        // Achievement 1: Verified Veteran
        if ((user.reputationScore || 0) >= 30 && !currentAchievements.has("Verified Veteran")) {
            currentAchievements.add("Verified Veteran");
            newlyUnlocked.push("Verified Veteran");
        }

        // Achievement 2: Coach Ready
        if (user.isCoach && !currentAchievements.has("Certified Coach")) {
            currentAchievements.add("Certified Coach");
            newlyUnlocked.push("Certified Coach");
        }

        // Achievement 3: Social Butterfly
        if ((user.friends?.length || 0) >= 3 && !currentAchievements.has("Social Butterfly")) {
            currentAchievements.add("Social Butterfly");
            newlyUnlocked.push("Social Butterfly");
        }

        // Achievement 4: Squad Leader
        if (!currentAchievements.has("Squad Leader")) {
            currentAchievements.add("Squad Leader");
            newlyUnlocked.push("Squad Leader");
        }

        user.achievements = Array.from(currentAchievements);
        await user.save();

        res.json({
            success: true,
            achievements: user.achievements,
            newlyUnlocked,
        });
    } catch (error) {
        console.error("checkUserAchievements error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};