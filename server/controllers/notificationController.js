import Notification from "../models/Notification.js";

// ── Get My Notifications ───────────────────────────────────────────────────
export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find({ recipientId: userId })
                .populate("senderId", "fullName gamerTag profilePic primaryGame rank")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments({ recipientId: userId }),
            Notification.countDocuments({ recipientId: userId, isRead: false }),
        ]);

        res.json({
            success: true,
            notifications,
            total,
            unreadCount,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Error fetching notifications:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Mark Notification as Read ──────────────────────────────────────────────
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipientId: userId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.json({ success: false, message: "Notification not found" });
        }

        const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

        res.json({ success: true, notification, unreadCount });
    } catch (error) {
        console.error("Error marking notification read:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Mark All Notifications as Read ────────────────────────────────────────
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { recipientId: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({ success: true, unreadCount: 0 });
    } catch (error) {
        console.error("Error marking all read:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Delete a Notification ──────────────────────────────────────────────────
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const result = await Notification.findOneAndDelete({ _id: id, recipientId: userId });
        if (!result) {
            return res.json({ success: false, message: "Notification not found" });
        }

        const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

        res.json({ success: true, message: "Notification deleted", unreadCount });
    } catch (error) {
        console.error("Error deleting notification:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ── Clear All Notifications ────────────────────────────────────────────────
export const clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        await Notification.deleteMany({ recipientId: userId });
        res.json({ success: true, message: "All notifications cleared", unreadCount: 0 });
    } catch (error) {
        console.error("Error clearing notifications:", error.message);
        res.json({ success: false, message: error.message });
    }
};
