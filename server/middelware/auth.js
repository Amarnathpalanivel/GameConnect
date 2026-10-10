import User from "../models/User.js";
import jwt from "jsonwebtoken";

//Middelware to protect routes
export const protectRoute = async (req, res, next) => {
    try {
        let token = req.headers.token;
        if (!token && req.headers.authorization) {
            token = req.headers.authorization.startsWith("Bearer ")
                ? req.headers.authorization.slice(7).trim()
                : req.headers.authorization.trim();
        }
        if (!token) return res.json({ success: false, message: "No token provided" });
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId).select("-password")
        if (!user) return res.json({ success: false, message: "User not found" });
        req.user = user;
        next();
    } catch (error) {
        console.log(error.message);
        
        return res.json({ success: false, message: error.message });
    }
}