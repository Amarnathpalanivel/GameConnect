import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  // ── DM State ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef(null);

  // ── Phase 3: Enhanced Messaging State ───────────────────────────────────
  const [replyingTo, setReplyingTo] = useState(null);       // message obj being replied to
  const [editingMessage, setEditingMessage] = useState(null); // message obj being edited

  // ── Phase 3: Party State ────────────────────────────────────────────────
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyMessages, setPartyMessages] = useState([]);
  const [isPartyMessagesLoading, setIsPartyMessagesLoading] = useState(false);
  const [partyTypingUsers, setPartyTypingUsers] = useState([]); // [{userId, gamerTag}]
  const partyTypingTimers = useRef({});

  // ── Strategic Business Expansions State ─────────────────────────────────
  const [behavioralMatches, setBehavioralMatches] = useState([]);
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [isCoachesLoading, setIsCoachesLoading] = useState(false);
  const [scrims, setScrims] = useState([]);
  const [selectedScrim, setSelectedScrim] = useState(null);
  const [isScrimsLoading, setIsScrimsLoading] = useState(false);

  // ── Phase 4: LFG & Notification State ───────────────────────────────────
  const [lfgPosts, setLfgPosts] = useState([]);
  const [isLfgLoading, setIsLfgLoading] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);

  const { axios, socket, authUser } = useContext(AuthContext);

  // ═══════════════════════════════════════════════════════════════════════
  // DM FUNCTIONS (existing + enhanced)
  // ═══════════════════════════════════════════════════════════════════════

  const getUsers = async () => {
    setIsUsersLoading(true);
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
      } else {
        toast.error(data.message || "Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.message);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const getMessages = async (userId) => {
    if (!userId) return;
    setIsMessagesLoading(true);
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages || []);
        setUnseenMessages((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      } else {
        toast.error(data.message || "Failed to load messages");
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error(error.message);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const sendMessage = async (messageData) => {
    if (!selectedUser) return;
    setIsSendingMessage(true);
    try {
      const payload = { ...messageData };
      if (replyingTo) {
        payload.replyTo = replyingTo._id;
      }
      const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, payload);
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setReplyingTo(null);
        return data.message;
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ── Phase 3: Reactions ─────────────────────────────────────────────────
  const reactToMessage = async (messageId, emoji) => {
    try {
      // Optimistic update
      setMessages(prev => prev.map(msg => {
        if (msg._id !== messageId) return msg;
        const reactions = [...(msg.reactions || [])];
        const existingIdx = reactions.findIndex(
          r => r.emoji === emoji && r.userId === authUser._id
        );
        if (existingIdx !== -1) {
          reactions.splice(existingIdx, 1);
        } else {
          reactions.push({ emoji, userId: authUser._id });
        }
        return { ...msg, reactions };
      }));

      // Also update party messages if in party mode
      setPartyMessages(prev => prev.map(msg => {
        if (msg._id !== messageId) return msg;
        const reactions = [...(msg.reactions || [])];
        const existingIdx = reactions.findIndex(
          r => r.emoji === emoji && (r.userId === authUser._id || r.userId?._id === authUser._id)
        );
        if (existingIdx !== -1) {
          reactions.splice(existingIdx, 1);
        } else {
          reactions.push({ emoji, userId: authUser._id });
        }
        return { ...msg, reactions };
      }));

      await axios.put(`/api/messages/${messageId}/react`, { emoji });
    } catch (error) {
      console.error("Error reacting:", error);
      toast.error("Failed to react");
    }
  };

  // ── Phase 3: Edit Message ──────────────────────────────────────────────
  const editMessage = async (messageId, newText) => {
    try {
      const { data } = await axios.put(`/api/messages/${messageId}/edit`, { text: newText });
      if (data.success) {
        const updateFn = prev => prev.map(msg =>
          msg._id === messageId
            ? { ...msg, text: data.message.text, isEdited: true, editedAt: data.message.editedAt }
            : msg
        );
        setMessages(updateFn);
        setPartyMessages(updateFn);
        setEditingMessage(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error editing:", error);
      toast.error("Failed to edit message");
    }
  };

  // ── Phase 3: Delete Message ────────────────────────────────────────────
  const deleteMessage = async (messageId) => {
    try {
      const { data } = await axios.delete(`/api/messages/${messageId}`);
      if (data.success) {
        const updateFn = prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, deletedAt: new Date().toISOString() } : msg
        );
        setMessages(updateFn);
        setPartyMessages(updateFn);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete message");
    }
  };

  // ── Typing (DM) ────────────────────────────────────────────────────────
  const emitTypingStart = () => {
    if (!socket || !selectedUser) return;
    socket.emit("typing_start", { toUserId: selectedUser._id });
  };

  const emitTypingStop = () => {
    if (!socket || !selectedUser) return;
    socket.emit("typing_stop", { toUserId: selectedUser._id });
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PARTY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════

  const getMyParties = async () => {
    try {
      const { data } = await axios.get("/api/parties/my");
      if (data.success) {
        setParties(data.parties || []);
      }
    } catch (error) {
      console.error("Error fetching parties:", error);
    }
  };

  const createParty = async ({ name, game, maxPlayers, isOpen }) => {
    try {
      const { data } = await axios.post("/api/parties", { name, game, maxPlayers, isOpen });
      if (data.success) {
        setParties(prev => [data.party, ...prev]);
        toast.success(`Party "${data.party.name}" created!`);
        // Join socket room
        if (socket) socket.emit("join_party", { partyId: data.party._id });
        return data.party;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const joinPartyByCode = async (inviteCode) => {
    try {
      const { data } = await axios.post(`/api/parties/join/${inviteCode}`);
      if (data.success) {
        setParties(prev => [data.party, ...prev.filter(p => p._id !== data.party._id)]);
        toast.success(data.message);
        if (socket) socket.emit("join_party", { partyId: data.party._id });
        return data.party;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const leaveParty = async (partyId) => {
    try {
      const { data } = await axios.delete(`/api/parties/${partyId}/leave`);
      if (data.success) {
        setParties(prev => prev.filter(p => p._id !== partyId));
        if (selectedParty?._id === partyId) {
          setSelectedParty(null);
          setPartyMessages([]);
        }
        if (socket) socket.emit("leave_party", { partyId });
        toast.success("Left the party");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const inviteToParty = async (partyId, gamerTag) => {
    try {
      const { data } = await axios.post(`/api/parties/${partyId}/invite`, { gamerTag });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const kickFromParty = async (partyId, userId) => {
    try {
      const { data } = await axios.delete(`/api/parties/${partyId}/kick/${userId}`);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const disbandParty = async (partyId) => {
    try {
      const { data } = await axios.delete(`/api/parties/${partyId}`);
      if (data.success) {
        setParties(prev => prev.filter(p => p._id !== partyId));
        if (selectedParty?._id === partyId) {
          setSelectedParty(null);
          setPartyMessages([]);
        }
        toast.success("Party disbanded");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getPartyMessages = async (partyId) => {
    if (!partyId) return;
    setIsPartyMessagesLoading(true);
    try {
      const { data } = await axios.get(`/api/parties/${partyId}/messages`);
      if (data.success) {
        setPartyMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching party messages:", error);
    } finally {
      setIsPartyMessagesLoading(false);
    }
  };

  const sendPartyMessage = async (messageData) => {
    if (!selectedParty) return;
    setIsSendingMessage(true);
    try {
      const payload = { ...messageData };
      if (replyingTo) {
        payload.replyTo = replyingTo._id;
      }
      const { data } = await axios.post(`/api/parties/${selectedParty._id}/messages`, payload);
      if (data.success) {
        // Don't add locally — it comes back via socket
        setReplyingTo(null);
        return data.message;
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ── Party Typing ───────────────────────────────────────────────────────
  const emitPartyTypingStart = useCallback(() => {
    if (!socket || !selectedParty) return;
    socket.emit("party_typing", { partyId: selectedParty._id });
  }, [socket, selectedParty]);

  const emitPartyTypingStop = useCallback(() => {
    if (!socket || !selectedParty) return;
    socket.emit("party_typing_stop", { partyId: selectedParty._id });
  }, [socket, selectedParty]);

  // ═══════════════════════════════════════════════════════════════════════
  // STRATEGIC EXPANSION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════

  // 1. Quick Match (Transient Micro-Lobby Queue)
  const quickMatch = async ({ game, activityType, maxPlayers = 5, durationMinutes = 45 }) => {
    try {
      const { data } = await axios.post("/api/parties/quick-match", {
        game, activityType, maxPlayers, durationMinutes,
      });
      if (data.success) {
        toast.success(data.message || "Squad ready!");
        if (data.party) {
          setParties(prev => {
            const exists = prev.some(p => p._id === data.party._id);
            return exists ? prev.map(p => p._id === data.party._id ? data.party : p) : [data.party, ...prev];
          });
          setSelectedParty(data.party);
        }
        return data.party;
      } else {
        toast.error(data.message || "Quick match failed");
      }
    } catch (error) {
      console.error("QuickMatch error:", error);
      toast.error(error.message);
    }
    return null;
  };

  // 2. Behavioral Matchmaking (Synergy Squads)
  const getBehavioralMatches = async () => {
    setIsMatchingLoading(true);
    try {
      const { data } = await axios.get("/api/auth/matchmaking/synergy");
      if (data.success) {
        setBehavioralMatches(data.matches || []);
      } else {
        toast.error(data.message || "Failed to load synergy matches");
      }
    } catch (error) {
      console.error("Matchmaking error:", error);
      toast.error(error.message);
    } finally {
      setIsMatchingLoading(false);
    }
  };

  // 3. Coaching Marketplace
  const getCoaches = async (params = {}) => {
    setIsCoachesLoading(true);
    try {
      const { data } = await axios.get("/api/auth/coach/list", { params });
      if (data.success) {
        setCoaches(data.coaches || []);
      }
    } catch (error) {
      console.error("GetCoaches error:", error);
    } finally {
      setIsCoachesLoading(false);
    }
  };

  const bookCoachSession = async (coachId, bookingData) => {
    try {
      const { data } = await axios.post(`/api/auth/coach/${coachId}/book`, bookingData);
      if (data.success) {
        toast.success(data.message || "Booking confirmed!");
        return data.booking;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("BookCoach error:", error);
      toast.error(error.message);
    }
    return null;
  };

  const reviewCoach = async (coachId, reviewData) => {
    try {
      const { data } = await axios.post(`/api/auth/coach/${coachId}/review`, reviewData);
      if (data.success) {
        toast.success("Review posted!");
        getCoaches();
        return true;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("ReviewCoach error:", error);
      toast.error(error.message);
    }
    return false;
  };

  // 4. Esports Scrims
  const getScrims = async () => {
    setIsScrimsLoading(true);
    try {
      const { data } = await axios.get("/api/matches/my");
      if (data.success) {
        setScrims(data.scrims || []);
      }
    } catch (error) {
      console.error("GetScrims error:", error);
    } finally {
      setIsScrimsLoading(false);
    }
  };

  const proposeScrim = async (scrimData) => {
    try {
      const { data } = await axios.post("/api/matches/propose", scrimData);
      if (data.success) {
        toast.success("Scrim challenge issued!");
        getScrims();
        return data.match;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("ProposeScrim error:", error);
      toast.error(error.message);
    }
    return null;
  };

  const respondToScrim = async (matchId, action) => {
    try {
      const { data } = await axios.post(`/api/matches/${matchId}/respond`, { action });
      if (data.success) {
        toast.success(`Scrim ${action}`);
        getScrims();
        return data.match;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("RespondToScrim error:", error);
      toast.error(error.message);
    }
    return null;
  };

  const updateScrimCredentials = async (matchId, credentials) => {
    try {
      const { data } = await axios.put(`/api/matches/${matchId}/credentials`, credentials);
      if (data.success) {
        toast.success("Server credentials shared with opponent!");
        getScrims();
        return data.match;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("UpdateCredentials error:", error);
      toast.error(error.message);
    }
    return null;
  };

  const reportScrimResult = async (matchId, resultData) => {
    try {
      const { data } = await axios.post(`/api/matches/${matchId}/report`, resultData);
      if (data.success) {
        toast.success("Match report submitted!");
        getScrims();
        return data.match;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("ReportScrim error:", error);
      toast.error(error.message);
    }
    return null;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 4: LFG & SCHEDULING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════

  const getLFGBoard = async (filters = {}) => {
    setIsLfgLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.game) params.append("game", filters.game);
      if (filters.region) params.append("region", filters.region);
      if (filters.mode) params.append("mode", filters.mode);
      if (filters.rankRequirement) params.append("rankRequirement", filters.rankRequirement);
      if (filters.micRequired !== undefined && filters.micRequired !== "") params.append("micRequired", filters.micRequired);
      if (filters.isScheduled) params.append("isScheduled", filters.isScheduled);
      if (filters.search) params.append("search", filters.search);

      const { data } = await axios.get(`/api/lfg?${params.toString()}`);
      if (data.success) {
        setLfgPosts(data.posts || []);
        return data.posts;
      }
    } catch (error) {
      console.error("Error fetching LFG board:", error);
    } finally {
      setIsLfgLoading(false);
    }
    return [];
  };

  const createLFGPost = async (postData) => {
    try {
      const { data } = await axios.post("/api/lfg", postData);
      if (data.success) {
        toast.success("LFG Squad posted & linked to Party!");
        setLfgPosts((prev) => [data.post, ...prev]);
        getMyParties();
        return data.post;
      } else {
        toast.error(data.message || "Failed to create LFG post");
      }
    } catch (error) {
      console.error("CreateLFGPost error:", error);
      toast.error(error.message);
    }
    return null;
  };

  const joinLFGPost = async (postId) => {
    try {
      const { data } = await axios.post(`/api/lfg/${postId}/join`);
      if (data.success) {
        toast.success("Joined squad! Connected to party lobby.");
        setLfgPosts((prev) => prev.map((p) => (p._id === postId ? data.post : p)));
        getMyParties();
        return data.post;
      } else {
        toast.error(data.message || "Failed to join squad");
      }
    } catch (error) {
      console.error("JoinLFGPost error:", error);
      toast.error(error.message);
    }
    return null;
  };

  const leaveLFGPost = async (postId) => {
    try {
      const { data } = await axios.post(`/api/lfg/${postId}/leave`);
      if (data.success) {
        toast.success("Left squad.");
        setLfgPosts((prev) => prev.map((p) => (p._id === postId ? data.post : p)));
        getMyParties();
        return data.post;
      } else {
        toast.error(data.message || "Failed to leave squad");
      }
    } catch (error) {
      console.error("LeaveLFGPost error:", error);
      toast.error(error.message);
    }
    return null;
  };

  const closeLFGPost = async (postId) => {
    try {
      const { data } = await axios.put(`/api/lfg/${postId}/close`);
      if (data.success) {
        toast.success("LFG post closed.");
        setLfgPosts((prev) => prev.map((p) => (p._id === postId ? data.post : p)));
        return data.post;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("CloseLFGPost error:", error);
      toast.error(error.message);
    }
    return null;
  };

  const getUpcomingSessions = async () => {
    setIsSessionsLoading(true);
    try {
      const { data } = await axios.get("/api/lfg/sessions");
      if (data.success) {
        setUpcomingSessions(data.sessions || []);
        return data.sessions;
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsSessionsLoading(false);
    }
    return [];
  };

  const sendSessionReminder = async (postId) => {
    try {
      const { data } = await axios.post(`/api/lfg/${postId}/remind`);
      if (data.success) {
        toast.success(data.message || "Reminders dispatched to squad!");
        return true;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Session reminder error:", error);
      toast.error(error.message);
    }
    return false;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 4: NOTIFICATION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════

  const getNotifications = async () => {
    setIsNotificationsLoading(true);
    try {
      const { data } = await axios.get("/api/notifications");
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadNotificationCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const { data } = await axios.put(`/api/notifications/${notificationId}/read`);
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadNotificationCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const { data } = await axios.put("/api/notifications/read-all");
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadNotificationCount(0);
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { data } = await axios.delete(`/api/notifications/${notificationId}`);
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
        setUnreadNotificationCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const { data } = await axios.delete("/api/notifications/clear-all");
      if (data.success) {
        setNotifications([]);
        setUnreadNotificationCount(0);
        toast.success("Notifications cleared");
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════

  // When selecting a DM user
  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      setIsTyping(false);
      setSelectedParty(null);  // clear party selection
      setPartyMessages([]);
      setReplyingTo(null);
      setEditingMessage(null);
    } else if (!selectedParty) {
      setMessages([]);
    }
  }, [selectedUser]);

  // When selecting a party
  useEffect(() => {
    if (selectedParty?._id) {
      getPartyMessages(selectedParty._id);
      setSelectedUser(null); // clear DM selection
      setMessages([]);
      setPartyTypingUsers([]);
      setReplyingTo(null);
      setEditingMessage(null);
    } else if (!selectedUser) {
      setPartyMessages([]);
    }
  }, [selectedParty]);

  // Fetch sidebar users, parties, notifications and scheduled sessions when authenticated
  useEffect(() => {
    if (authUser) {
      getUsers();
      getMyParties();
      getNotifications();
      getUpcomingSessions();
    } else {
      setUsers([]);
      setMessages([]);
      setSelectedUser(null);
      setUnseenMessages({});
      setParties([]);
      setSelectedParty(null);
      setPartyMessages([]);
      setNotifications([]);
      setUnreadNotificationCount(0);
      setUpcomingSessions([]);
      setLfgPosts([]);
    }
  }, [authUser]);

  // ── Socket Listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // ── DM: New Message ────────────────────────────────────────────────
    const handleNewMessage = (newMessage) => {
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        setMessages((prev) => [...prev, newMessage]);
        setIsTyping(false);
        axios.put(`/api/messages/mark/${newMessage._id}`).catch((err) => console.error(err));
      } else {
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
        }));
      }
    };

    // ── DM: Typing ─────────────────────────────────────────────────────
    const handleTypingIndicator = ({ fromUserId, isTyping: typing }) => {
      if (selectedUser && fromUserId === selectedUser._id) {
        setIsTyping(typing);
        if (typing) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setIsTyping(false), 4000);
        }
      }
    };

    // ── Reactions (real-time from other user) ──────────────────────────
    const handleReaction = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, reactions } : msg
      ));
      setPartyMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, reactions } : msg
      ));
    };

    // ── Edit (real-time from other user) ──────────────────────────────
    const handleEdited = ({ messageId, text, isEdited, editedAt }) => {
      const updateFn = prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, text, isEdited, editedAt } : msg
      );
      setMessages(updateFn);
      setPartyMessages(updateFn);
    };

    // ── Delete (real-time from other user) ────────────────────────────
    const handleDeleted = ({ messageId }) => {
      const updateFn = prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, deletedAt: new Date().toISOString() } : msg
      );
      setMessages(updateFn);
      setPartyMessages(updateFn);
    };

    // ── Party: New Message ─────────────────────────────────────────────
    const handleNewPartyMessage = (message) => {
      // Only add if it's for the currently selected party
      if (selectedParty && message.partyId === selectedParty._id) {
        setPartyMessages(prev => {
          // Avoid duplicates (sender already has it from API response)
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };

    // ── Party: Typing ──────────────────────────────────────────────────
    const handlePartyTyping = ({ fromUserId, partyId, isTyping: typing }) => {
      if (!selectedParty || partyId !== selectedParty._id) return;
      if (fromUserId === authUser?._id) return; // ignore self

      if (typing) {
        setPartyTypingUsers(prev => {
          if (prev.some(u => u.userId === fromUserId)) return prev;
          // Find the user's gamerTag from party members
          const member = selectedParty.members?.find(m =>
            (m.userId?._id || m.userId)?.toString() === fromUserId
          );
          const gamerTag = member?.userId?.gamerTag || member?.userId?.fullName || "Someone";
          return [...prev, { userId: fromUserId, gamerTag }];
        });

        // Auto-clear after 4s
        clearTimeout(partyTypingTimers.current[fromUserId]);
        partyTypingTimers.current[fromUserId] = setTimeout(() => {
          setPartyTypingUsers(prev => prev.filter(u => u.userId !== fromUserId));
        }, 4000);
      } else {
        setPartyTypingUsers(prev => prev.filter(u => u.userId !== fromUserId));
        clearTimeout(partyTypingTimers.current[fromUserId]);
      }
    };

    // ── Party: Member events ───────────────────────────────────────────
    const handleMemberJoined = ({ partyId, member, party }) => {
      setParties(prev => prev.map(p => p._id === partyId ? party : p));
      if (selectedParty?._id === partyId) setSelectedParty(party);
      if (member._id !== authUser?._id) {
        toast(`🎮 ${member.gamerTag || member.fullName} joined the party!`, {
          icon: "🎉",
          style: { background: "#0c2242", color: "#e0f2fe", border: "1px solid #0369a1" },
        });
      }
    };

    const handleMemberLeft = ({ partyId, member, kicked, newLeaderId }) => {
      // Refresh parties list
      getMyParties();
      if (selectedParty?._id === partyId) {
        // Refresh the selected party
        axios.get(`/api/parties/${partyId}`).then(({ data }) => {
          if (data.success) setSelectedParty(data.party);
        }).catch(() => {});
      }
    };

    const handleDisbanded = ({ partyId, partyName }) => {
      setParties(prev => prev.filter(p => p._id !== partyId));
      if (selectedParty?._id === partyId) {
        setSelectedParty(null);
        setPartyMessages([]);
      }
      toast(`Party "${partyName || ""}" was disbanded`, {
        icon: "💥",
        style: { background: "#0c2242", color: "#e0f2fe", border: "1px solid #991b1b" },
      });
    };

    const handleKicked = ({ partyId, partyName }) => {
      setParties(prev => prev.filter(p => p._id !== partyId));
      if (selectedParty?._id === partyId) {
        setSelectedParty(null);
        setPartyMessages([]);
      }
      toast.error(`You were kicked from "${partyName}"`);
    };

    const handlePartyInvite = ({ partyName, inviteCode, from }) => {
      toast(
        (t) => (
          <div>
            <p className="font-semibold">🎮 Party Invite!</p>
            <p className="text-sm">{from.gamerTag || from.fullName} invited you to <b>{partyName}</b></p>
            <div className="flex gap-2 mt-2">
              <button
                className="px-3 py-1 bg-sky-600 text-white rounded text-xs hover:bg-sky-500"
                onClick={() => { joinPartyByCode(inviteCode); toast.dismiss(t.id); }}
              >Join</button>
              <button
                className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
                onClick={() => toast.dismiss(t.id)}
              >Dismiss</button>
            </div>
          </div>
        ),
        { duration: 15000, style: { background: "#0c2242", color: "#e0f2fe", border: "1px solid #0369a1" } }
      );
    };

    // ── Phase 4: LFG & Notification Socket Handlers ───────────────────────
    const handleLFGNewPost = (newPost) => {
      setLfgPosts((prev) => {
        if (prev.some((p) => p._id === newPost._id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handleLFGPostUpdate = (updatedPost) => {
      setLfgPosts((prev) =>
        prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
      );
      setUpcomingSessions((prev) =>
        prev.map((s) => (s._id === updatedPost._id ? updatedPost : s))
      );
    };

    const handleNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadNotificationCount((prev) => prev + 1);

      toast(
        (t) => (
          <div className="flex items-start gap-2.5">
            <span className="text-xl">
              {notif.type === "lfg_join" ? "🎮" : notif.type === "lfg_full" ? "🔥" : notif.type === "session_reminder" ? "⏰" : "📢"}
            </span>
            <div className="flex-1">
              <p className="font-semibold text-xs text-sky-200">{notif.title}</p>
              <p className="text-xs text-slate-300 mt-0.5">{notif.message}</p>
            </div>
          </div>
        ),
        {
          duration: 6000,
          style: { background: "#081b33", color: "#e2e8f0", border: "1px solid #0284c7" },
        }
      );

      // Desktop notification if permitted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(notif.title, {
            body: notif.message,
            icon: "/favicon.ico",
          });
        } catch (err) {
          console.warn("Desktop notification error:", err);
        }
      }
    };

    // Register all listeners
    socket.on("newMessage", handleNewMessage);
    socket.on("typing_indicator", handleTypingIndicator);
    socket.on("messageReaction", handleReaction);
    socket.on("messageEdited", handleEdited);
    socket.on("messageDeleted", handleDeleted);
    socket.on("newPartyMessage", handleNewPartyMessage);
    socket.on("party_typing_indicator", handlePartyTyping);
    socket.on("party_member_joined", handleMemberJoined);
    socket.on("party_member_left", handleMemberLeft);
    socket.on("party_disbanded", handleDisbanded);
    socket.on("party_kicked", handleKicked);
    socket.on("party_invite", handlePartyInvite);
    socket.on("lfg_new_post", handleLFGNewPost);
    socket.on("lfg_post_update", handleLFGPostUpdate);
    socket.on("notification", handleNotification);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("typing_indicator", handleTypingIndicator);
      socket.off("messageReaction", handleReaction);
      socket.off("messageEdited", handleEdited);
      socket.off("messageDeleted", handleDeleted);
      socket.off("newPartyMessage", handleNewPartyMessage);
      socket.off("party_typing_indicator", handlePartyTyping);
      socket.off("party_member_joined", handleMemberJoined);
      socket.off("party_member_left", handleMemberLeft);
      socket.off("party_disbanded", handleDisbanded);
      socket.off("party_kicked", handleKicked);
      socket.off("party_invite", handlePartyInvite);
      socket.off("lfg_new_post", handleLFGNewPost);
      socket.off("lfg_post_update", handleLFGPostUpdate);
      socket.off("notification", handleNotification);
    };
  }, [socket, selectedUser, selectedParty, axios, authUser]);

  // ═══════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════

  const value = {
    // DMs
    messages, users, selectedUser, unseenMessages,
    isUsersLoading, isMessagesLoading, isSendingMessage,
    isTyping,
    getUsers, getMessages, sendMessage,
    setSelectedUser, setMessages,
    emitTypingStart, emitTypingStop,

    // Enhanced messaging
    replyingTo, setReplyingTo,
    editingMessage, setEditingMessage,
    reactToMessage, editMessage, deleteMessage,

    // Parties
    parties, selectedParty, partyMessages,
    isPartyMessagesLoading, partyTypingUsers,
    setSelectedParty, getMyParties,
    createParty, joinPartyByCode, leaveParty,
    inviteToParty, kickFromParty, disbandParty,
    sendPartyMessage, getPartyMessages,
    emitPartyTypingStart, emitPartyTypingStop,

    // Strategic Expansions (Quick Match, Synergy, Coaching, Scrims)
    quickMatch,
    behavioralMatches, isMatchingLoading, getBehavioralMatches,
    coaches, isCoachesLoading, getCoaches, bookCoachSession, reviewCoach,
    scrims, selectedScrim, setSelectedScrim, isScrimsLoading,
    getScrims, proposeScrim, respondToScrim, updateScrimCredentials, reportScrimResult,

    // Phase 4: LFG & Scheduling
    lfgPosts, isLfgLoading, upcomingSessions, isSessionsLoading,
    getLFGBoard, createLFGPost, joinLFGPost, leaveLFGPost, closeLFGPost,
    getUpcomingSessions, sendSessionReminder,

    // Phase 4: In-App Notification Center
    notifications, unreadNotificationCount, isNotificationsLoading,
    getNotifications, markNotificationRead, markAllNotificationsRead,
    deleteNotification, clearAllNotifications,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
