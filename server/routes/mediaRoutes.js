import express from "express";
import { protectRoute } from "../middelware/auth.js";
import { searchGifs, fetchLinkPreview } from "../controllers/mediaController.js";

const mediaRouter = express.Router();

mediaRouter.get("/gifs",         protectRoute, searchGifs);
mediaRouter.post("/preview",     protectRoute, fetchLinkPreview);

export default mediaRouter;
