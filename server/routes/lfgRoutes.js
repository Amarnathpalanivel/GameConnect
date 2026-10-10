import express from "express";
import { protectRoute } from "../middelware/auth.js";
import {
    createLFGPost,
    getLFGBoard,
    getLFGPost,
    joinLFGPost,
    leaveLFGPost,
    closeLFGPost,
    getUpcomingSessions,
    sendSessionReminder,
} from "../controllers/lfgController.js";

const lfgRouter = express.Router();

lfgRouter.get("/", protectRoute, getLFGBoard);
lfgRouter.post("/", protectRoute, createLFGPost);
lfgRouter.get("/sessions", protectRoute, getUpcomingSessions);
lfgRouter.get("/:id", protectRoute, getLFGPost);
lfgRouter.post("/:id/join", protectRoute, joinLFGPost);
lfgRouter.post("/:id/leave", protectRoute, leaveLFGPost);
lfgRouter.put("/:id/close", protectRoute, closeLFGPost);
lfgRouter.post("/:id/remind", protectRoute, sendSessionReminder);

export default lfgRouter;
