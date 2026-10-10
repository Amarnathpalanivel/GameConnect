import express from "express";
import { protectRoute } from "../middelware/auth.js";
import {
    submitReport,
    getReports,
    takeReportAction,
    getModerationStats,
    scanText,
} from "../controllers/moderationController.js";

const moderationRouter = express.Router();

moderationRouter.post("/report",             protectRoute, submitReport);
moderationRouter.get("/reports",              protectRoute, getReports);
moderationRouter.put("/reports/:reportId/action", protectRoute, takeReportAction);
moderationRouter.get("/stats",                protectRoute, getModerationStats);
moderationRouter.post("/scan",                protectRoute, scanText);

export default moderationRouter;
