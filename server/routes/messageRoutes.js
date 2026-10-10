
import express from "express";
import { protectRoute } from "../middelware/auth.js";
import { getUsersForSidebar, getMessages, markMessageAsSeen, sendMessage, reactToMessage, editMessage, deleteMessage } from "../controllers/messageController.js";


const messageRouter = express.Router();

messageRouter.get("/users",protectRoute,getUsersForSidebar);
messageRouter.get("/:id",protectRoute,getMessages);
messageRouter.put("/mark/:id",protectRoute,markMessageAsSeen);
messageRouter.post("/send/:id",protectRoute,sendMessage);

// Phase 3: Enhanced messaging routes
messageRouter.put("/:id/react",protectRoute,reactToMessage);
messageRouter.put("/:id/edit",protectRoute,editMessage);
messageRouter.delete("/:id",protectRoute,deleteMessage);


export default messageRouter;