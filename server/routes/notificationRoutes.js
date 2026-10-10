import express from "express";
import { protectRoute } from "../middelware/auth.js";
import {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
} from "../controllers/notificationController.js";

const notificationRouter = express.Router();

notificationRouter.get("/", protectRoute, getMyNotifications);
notificationRouter.put("/read-all", protectRoute, markAllAsRead);
notificationRouter.put("/:id/read", protectRoute, markAsRead);
notificationRouter.delete("/clear-all", protectRoute, clearAllNotifications);
notificationRouter.delete("/:id", protectRoute, deleteNotification);

export default notificationRouter;
