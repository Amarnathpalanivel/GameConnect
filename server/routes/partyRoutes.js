import express from "express";
import { protectRoute } from "../middelware/auth.js";
import {
    createParty,
    getParty,
    getMyParties,
    joinByInviteCode,
    inviteToParty,
    leaveParty,
    kickMember,
    disbandParty,
    getPartyMessages,
    sendPartyMessage,
    quickMatch,
    getTransientLobbies,
    getPartyVoiceUsersHandler,
} from "../controllers/partyController.js";

const partyRouter = express.Router();

// Party CRUD & Quick Match
partyRouter.post("/",                     protectRoute, createParty);
partyRouter.post("/quick-match",          protectRoute, quickMatch);
partyRouter.get("/transient",             protectRoute, getTransientLobbies);
partyRouter.get("/my",                    protectRoute, getMyParties);
partyRouter.get("/:id",                   protectRoute, getParty);
partyRouter.get("/:id/voice",             protectRoute, getPartyVoiceUsersHandler);

// Join & Invite
partyRouter.post("/join/:inviteCode",     protectRoute, joinByInviteCode);
partyRouter.post("/:id/invite",           protectRoute, inviteToParty);

// Leave, Kick, Disband
partyRouter.delete("/:id/leave",          protectRoute, leaveParty);
partyRouter.delete("/:id/kick/:userId",   protectRoute, kickMember);
partyRouter.delete("/:id",               protectRoute, disbandParty);

// Party Messages
partyRouter.get("/:id/messages",          protectRoute, getPartyMessages);
partyRouter.post("/:id/messages",         protectRoute, sendPartyMessage);

export default partyRouter;
