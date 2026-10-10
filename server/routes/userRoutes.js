import express from "express";
import {
    checkAuth, login, signup, updateProfile, verifyOTP, resendOTP, getPublicProfile,
    getBehavioralMatches, updateCoachProfile, getCoaches, bookCoachSession, reviewCoach,
    endorsePlayer, getPlayerReputation, checkUserAchievements
} from "../controllers/userController.js";
import { protectRoute } from "../middelware/auth.js";

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/verify-otp", verifyOTP);
userRouter.post("/resend-otp", resendOTP);
userRouter.post("/login", login);
userRouter.put("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);
userRouter.get("/profile/:gamerTag", protectRoute, getPublicProfile);

// Behavioral Matchmaking
userRouter.get("/matchmaking/synergy", protectRoute, getBehavioralMatches);

// Coaching Marketplace
userRouter.put("/coach/profile", protectRoute, updateCoachProfile);
userRouter.get("/coach/list", protectRoute, getCoaches);
userRouter.post("/coach/:coachId/book", protectRoute, bookCoachSession);
userRouter.post("/coach/:coachId/review", protectRoute, reviewCoach);

// Player Honor Endorsements & Achievements
userRouter.post("/users/:userId/endorse", protectRoute, endorsePlayer);
userRouter.get("/users/:userId/reputation", protectRoute, getPlayerReputation);
userRouter.get("/achievements/my", protectRoute, checkUserAchievements);

export default userRouter;