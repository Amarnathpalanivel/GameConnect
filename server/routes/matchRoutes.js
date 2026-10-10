import express from "express";
import { protectRoute } from "../middelware/auth.js";
import {
    proposeScrim,
    respondToScrim,
    updateServerCredentials,
    reportMatchResult,
    getMyScrims,
} from "../controllers/matchController.js";

const matchRouter = express.Router();

matchRouter.post("/propose",                protectRoute, proposeScrim);
matchRouter.post("/:matchId/respond",       protectRoute, respondToScrim);
matchRouter.put("/:matchId/credentials",    protectRoute, updateServerCredentials);
matchRouter.post("/:matchId/report",        protectRoute, reportMatchResult);
matchRouter.get("/my",                      protectRoute, getMyScrims);

export default matchRouter;
