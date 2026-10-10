import express from "express";
import { protectRoute } from "../middelware/auth.js";
import {
    sendFriendRequest, acceptFriendRequest, declineFriendRequest,
    getPendingRequests, getFriends, unfriend, blockUser, unblockUser, reportUser,
} from "../controllers/friendController.js";

const friendRouter = express.Router();

// All friend routes require authentication
friendRouter.use(protectRoute);

friendRouter.post("/request",                   sendFriendRequest);
friendRouter.put("/request/:requestId/accept",  acceptFriendRequest);
friendRouter.put("/request/:requestId/decline", declineFriendRequest);
friendRouter.get("/requests",                   getPendingRequests);
friendRouter.get("/",                           getFriends);
friendRouter.delete("/:userId",                 unfriend);
friendRouter.post("/block/:userId",             blockUser);
friendRouter.delete("/block/:userId",           unblockUser);
friendRouter.post("/report",                    reportUser);

export default friendRouter;
