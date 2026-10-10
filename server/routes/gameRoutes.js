import express from "express";
import { protectRoute } from "../middelware/auth.js";
import { getGamesDirectory, getGameDetails } from "../controllers/gameController.js";

const gameRouter = express.Router();

gameRouter.get("/directory", protectRoute, getGamesDirectory);
gameRouter.get("/:gameId",    protectRoute, getGameDetails);

export default gameRouter;
