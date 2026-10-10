import { createContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [pendingRequests, setPendingRequests] = useState([]);

    // Connect socket and listen to gaming-specific events
    const connectSocket = (userData) => {
        if (!userData || socket?.connected) return;
        const newSocket = io(backendUrl, {
            query: { userId: userData._id }
        });
        newSocket.connect();
        setSocket(newSocket);

        newSocket.on("getOnlineUsers", (userIds) => {
            setOnlineUsers(userIds);
        });

        // Friend request notifications
        newSocket.on("friend_request", ({ from }) => {
            setPendingRequests(prev => [...prev, { from }]);
            toast(`🎮 ${from.gamerTag || from.fullName} sent you a friend request!`, {
                icon: "👥",
                style: { background: "#0c2242", color: "#e0f2fe", border: "1px solid #0369a1" },
            });
        });

        newSocket.on("friend_accepted", ({ by }) => {
            toast.success(`${by.gamerTag || by.fullName} accepted your friend request!`);
        });
    };

    // Check if the user is authenticated
    const checkAuth = async () => {
        try {
            const { data } = await axios.get("/api/auth/check");
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user);
            }
        } catch (error) {
            console.error(error.message);
        }
    };

    // Login / Signup handler
    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.requireVerification) {
                toast.success(data.message || "Please enter the verification code sent to your email");
                return { requireVerification: true, email: data.email };
            }
            if (data.success) {
                setAuthUser(data.userData);
                connectSocket(data.userData);
                axios.defaults.headers.common["token"] = data.token;
                setToken(data.token);
                localStorage.setItem("token", data.token);
                toast.success(data.message);
                return { success: true };
            } else {
                toast.error(data.message);
                return { success: false, message: data.message };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false, message: error.message };
        }
    };

    // Verify OTP code
    const verifyOTP = async (email, otp) => {
        try {
            const { data } = await axios.post("/api/auth/verify-otp", { email, otp });
            if (data.success) {
                setAuthUser(data.userData);
                connectSocket(data.userData);
                axios.defaults.headers.common["token"] = data.token;
                setToken(data.token);
                localStorage.setItem("token", data.token);
                toast.success(data.message);
                return { success: true };
            } else {
                toast.error(data.message);
                return { success: false, message: data.message };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false, message: error.message };
        }
    };

    // Resend OTP code
    const resendOTP = async (email) => {
        try {
            const { data } = await axios.post("/api/auth/resend-otp", { email });
            if (data.success) {
                toast.success(data.message);
                return { success: true };
            } else {
                toast.error(data.message);
                return { success: false, message: data.message };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false, message: error.message };
        }
    };

    // Logout
    const logout = async () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        setPendingRequests([]);
        delete axios.defaults.headers.common["token"];
        toast.success("Logged out successfully");
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
    };

    // Update full gaming profile
    const updateProfile = async (body) => {
        try {
            const { data } = await axios.put("/api/auth/update-profile", body);
            if (data.success) {
                setAuthUser(data.user);
                toast.success("Profile updated successfully");
                return { success: true };
            } else {
                toast.error(data.message || "Failed to update profile");
                return { success: false };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false };
        }
    };

    // ── Friends API helpers ──────────────────────────────────────────────────
    const sendFriendRequest = async (toGamerTag) => {
        try {
            const { data } = await axios.post("/api/friends/request", { toGamerTag });
            if (data.success) toast.success(data.message);
            else toast.error(data.message);
            return data;
        } catch (error) {
            toast.error(error.message);
        }
    };

    const acceptFriendRequest = async (requestId) => {
        try {
            const { data } = await axios.put(`/api/friends/request/${requestId}/accept`);
            if (data.success) {
                toast.success(data.message);
                setPendingRequests(prev => prev.filter(r => r._id !== requestId));
            } else toast.error(data.message);
            return data;
        } catch (error) {
            toast.error(error.message);
        }
    };

    const declineFriendRequest = async (requestId) => {
        try {
            const { data } = await axios.put(`/api/friends/request/${requestId}/decline`);
            if (data.success) setPendingRequests(prev => prev.filter(r => r._id !== requestId));
            return data;
        } catch (error) {
            toast.error(error.message);
        }
    };

    const getPendingRequests = async () => {
        try {
            const { data } = await axios.get("/api/friends/requests");
            if (data.success) setPendingRequests(data.requests);
        } catch (error) {
            console.error(error.message);
        }
    };

    const blockUser = async (userId) => {
        try {
            const { data } = await axios.post(`/api/friends/block/${userId}`);
            if (data.success) toast.success("User blocked");
            return data;
        } catch (error) {
            toast.error(error.message);
        }
    };

    const reportUser = async (userId, reason, detail = "") => {
        try {
            const { data } = await axios.post("/api/friends/report", { userId, reason, detail });
            if (data.success) toast.success(data.message);
            return data;
        } catch (error) {
            toast.error(error.message);
        }
    };

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["token"] = token;
            checkAuth();
        }
    }, []);

    // Fetch pending requests once authenticated
    useEffect(() => {
        if (authUser) getPendingRequests();
    }, [authUser]);

    const value = {
        axios, authUser, onlineUsers, socket,
        pendingRequests, setPendingRequests,
        login, logout, updateProfile,
        verifyOTP, resendOTP,
        sendFriendRequest, acceptFriendRequest, declineFriendRequest,
        blockUser, reportUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};