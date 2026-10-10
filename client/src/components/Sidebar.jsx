import React, { useContext, useState, useRef, useEffect } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';
import { VoiceContext } from '../../context/VoiceContext';
import NotificationCenter from './NotificationCenter';
import LFGBoard from './LFGBoard';
import ModerationModal from './ModerationModal';

const PLATFORM_ICONS = { PC:"🖥️", PlayStation:"🎮", Xbox:"🟢", Nintendo:"🔴", Mobile:"📱" };
const RANK_COLOR = {
  Iron:"#a8a9ad", Bronze:"#cd7f32", Silver:"#c0c0c0", Gold:"#ffd700",
  Platinum:"#00b4d8", Diamond:"#b9f2ff", Master:"#9b59b6",
  Grandmaster:"#e74c3c", Challenger:"#f1c40f", Unranked:"#6b7280",
};

/* ── Avatar with online dot ─────────────────────────────────────────────── */
const Avatar = ({ src, isOnline, size = 10, className = "" }) => (
  <div className={`relative flex-shrink-0 w-${size} h-${size} ${className}`}>
    <img
      src={src || assets.avatar_icon}
      alt=""
      className={`w-${size} h-${size} object-cover rounded-full border border-sky-700/40`}
    />
    {isOnline && (
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#070e1f] rounded-full online-dot" />
    )}
  </div>
);

/* ── Skeleton loader item ───────────────────────────────────────────────── */
const SkeletonItem = () => (
  <div className="flex items-center gap-3 p-2.5 rounded-xl">
    <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="skeleton h-3 rounded-full w-3/4" />
      <div className="skeleton h-2 rounded-full w-1/2" />
    </div>
  </div>
);

const Sidebar = () => {
  const navigate = useNavigate();
  const {
    users, selectedUser, setSelectedUser, unseenMessages, isUsersLoading,
    parties, selectedParty, setSelectedParty, createParty, joinPartyByCode,
    quickMatch, behavioralMatches, isMatchingLoading, getBehavioralMatches,
    coaches, isCoachesLoading, getCoaches, bookCoachSession,
    scrims, isScrimsLoading, getScrims, proposeScrim, updateScrimCredentials,
    lfgPosts, upcomingSessions,
  } = useContext(ChatContext);
  const { onlineUsers, logout, authUser, pendingRequests } = useContext(AuthContext);
  const { partyVoiceRosters } = useContext(VoiceContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("dms"); // "dms" | "parties" | "synergy" | "coaches" | "scrims"
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [showQuickMatchModal, setShowQuickMatchModal] = useState(false);
  const [showBookCoachModal, setShowBookCoachModal] = useState(null); // coach object
  const [showProposeScrimModal, setShowProposeScrimModal] = useState(false);
  const [newParty, setNewParty] = useState({ name: "", game: "", maxPlayers: 5, isOpen: false, isTransient: false, activityType: "Casual" });
  const [quickMatchData, setQuickMatchData] = useState({ game: "", activityType: "Casual", maxPlayers: 5 });
  const [bookingForm, setBookingForm] = useState({ game: "", sessionDate: "", notes: "" });
  const [scrimForm, setScrimForm] = useState({ myPartyId: "", opponentPartyId: "", game: "", format: "5v5 Best of 3" });
  const [joinCode, setJoinCode] = useState("");
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem("gameconnect_theme") || "default");
  const menuRef = useRef(null);

  const handleThemeChange = (newTheme) => {
    setCurrentTheme(newTheme);
    localStorage.setItem("gameconnect_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const match = u.fullName?.toLowerCase().includes(q) || u.gamerTag?.toLowerCase().includes(q)
      || u.email?.toLowerCase().includes(q) || u.primaryGame?.toLowerCase().includes(q);
    const onlineMatch = !showOnlineOnly || onlineUsers.includes(u._id);
    return match && onlineMatch;
  });

  const filteredParties = parties.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.game?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateParty = async () => {
    if (!newParty.name.trim()) return;
    const party = await createParty(newParty);
    if (party) {
      setShowCreateParty(false);
      setNewParty({ name: "", game: "", maxPlayers: 5, isOpen: false });
      setSelectedParty(party);
      setActiveTab("parties");
    }
  };

  const handleJoinParty = async () => {
    if (!joinCode.trim()) return;
    const party = await joinPartyByCode(joinCode.trim());
    if (party) {
      setShowJoinParty(false);
      setJoinCode("");
      setSelectedParty(party);
      setActiveTab("parties");
    }
  };

  const handleQuickMatch = async () => {
    const party = await quickMatch(quickMatchData);
    if (party) {
      setShowQuickMatchModal(false);
      setSelectedParty(party);
      setActiveTab("parties");
    }
  };

  const handleBookCoach = async () => {
    if (!showBookCoachModal) return;
    await bookCoachSession(showBookCoachModal._id, bookingForm);
    setShowBookCoachModal(null);
    setBookingForm({ game: "", sessionDate: "", notes: "" });
  };

  const handleProposeScrim = async () => {
    if (!scrimForm.myPartyId || !scrimForm.opponentPartyId) return;
    await proposeScrim(scrimForm);
    setShowProposeScrimModal(false);
    setScrimForm({ myPartyId: "", opponentPartyId: "", game: "", format: "5v5 Best of 3" });
  };

  // Load tab-specific data on tab switch
  useEffect(() => {
    if (activeTab === "synergy") getBehavioralMatches();
    if (activeTab === "coaches") getCoaches();
    if (activeTab === "scrims") getScrims();
  }, [activeTab]);

  const onlineCount = users.filter(u => onlineUsers.includes(u._id)).length;

  return (
    <>
      <div className={`
        bg-[#070e1f]/90 h-full min-h-0 flex flex-col overflow-hidden border-r border-sky-900/20 text-white
        ${(selectedUser || selectedParty) ? "max-md:hidden" : ""}
      `}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="p-4 border-b border-sky-900/20 bg-[#0a182e]/50 flex-shrink-0">

          {/* Brand + menu row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-base shadow-lg shadow-sky-600/30 flex-shrink-0">
                🎮
              </div>
              <div>
                <h1 className="text-sm font-bold gradient-text leading-none">GameConnect</h1>
                <p className="text-[10px] text-sky-400/50 mt-0.5">Find Your Squad</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Quick Theme Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextTheme = currentTheme === "default" ? "cyberpunk" : currentTheme === "cyberpunk" ? "abyss" : "default";
                  handleThemeChange(nextTheme);
                }}
                className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-sky-900/40 border border-sky-800/30 text-sky-200 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-all hover-lift"
                title={`Theme: ${currentTheme === "cyberpunk" ? "Neon Cyberpunk" : currentTheme === "abyss" ? "Darker Abyss" : "Sky Frost"} (Click to switch)`}
              >
                {currentTheme === "cyberpunk" ? "⚡" : currentTheme === "abyss" ? "🌑" : "❄️"}
              </button>

              {/* In-App Notification Center */}
              <NotificationCenter />

              {/* Menu button */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(p => !p)}
                  className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-sky-900/40 cursor-pointer transition-colors"
                  title="Menu"
                >
                  <img src={assets.menu_icon} alt="Menu" className="h-4 opacity-60 hover:opacity-100 transition-opacity" />
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold animate-pulse">
                      {pendingRequests.length > 9 ? "9+" : pendingRequests.length}
                    </span>
                  )}
                </button>

                {showMenu && (
                  <div className="absolute top-full right-0 mt-1.5 z-30 w-48 bg-[#0c1f3a] border border-sky-700/30 rounded-xl shadow-2xl animate-scale-in overflow-hidden">
                  {/* User chip */}
                  <div className="px-3 py-2.5 border-b border-sky-900/40 flex items-center gap-2.5">
                    <img
                      src={authUser?.profilePic || assets.avatar_icon}
                      className="w-7 h-7 rounded-full object-cover border border-sky-700/40"
                      alt=""
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{authUser?.gamerTag || authUser?.fullName}</p>
                      {authUser?.primaryGame && (
                        <p className="text-[10px] text-sky-400/50 truncate">🎮 {authUser.primaryGame}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => { navigate('/profile'); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-sky-500/15 hover:text-sky-200 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <span>✏️</span> Edit Profile
                    </button>

                    {pendingRequests.length > 0 && (
                      <button
                        onClick={() => { navigate('/friends'); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-sky-500/15 hover:text-sky-200 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <span>👥</span> Friend Requests
                        <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                          {pendingRequests.length}
                        </span>
                      </button>
                    )}

                    {/* Moderation Console */}
                    <button
                      onClick={() => { setShowModerationModal(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-rose-500/15 hover:text-rose-200 flex items-center gap-2.5 cursor-pointer transition-colors text-rose-300/90"
                    >
                      <span>🛡️</span> Safety & Moderation
                    </button>

                    {/* Theming Switcher */}
                    <div className="px-3 py-2 border-t border-sky-900/40">
                      <p className="text-[10px] uppercase font-bold text-sky-400/60 tracking-wider mb-1.5">Theme Palette</p>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => handleThemeChange("default")}
                          className={`text-[10px] font-semibold py-1 rounded-md transition ${
                            currentTheme === "default"
                              ? "bg-sky-500 text-white shadow-sm"
                              : "bg-slate-900 text-slate-400 hover:text-white"
                          }`}
                        >
                          ❄️ Sky
                        </button>
                        <button
                          onClick={() => handleThemeChange("cyberpunk")}
                          className={`text-[10px] font-semibold py-1 rounded-md transition ${
                            currentTheme === "cyberpunk"
                              ? "bg-pink-500 text-white shadow-sm"
                              : "bg-slate-900 text-slate-400 hover:text-white"
                          }`}
                        >
                          ⚡ Neon
                        </button>
                        <button
                          onClick={() => handleThemeChange("abyss")}
                          className={`text-[10px] font-semibold py-1 rounded-md transition ${
                            currentTheme === "abyss"
                              ? "bg-red-600 text-white shadow-sm"
                              : "bg-slate-900 text-slate-400 hover:text-white"
                          }`}
                        >
                          🌑 Abyss
                        </button>
                      </div>
                    </div>

                    <div className="my-1 h-px bg-sky-900/40 mx-2" />

                    <button
                      onClick={() => { logout(); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-red-500/15 hover:text-red-300 flex items-center gap-2.5 cursor-pointer transition-colors text-red-400/70"
                    >
                      <span>🚪</span> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0e274a]/60 border border-sky-800/30 rounded-xl focus-within:border-sky-500/50 focus-within:bg-[#0e274a]/80 transition-all">
            <img src={assets.search_icon} alt="" className="w-3.5 opacity-40 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-xs placeholder-sky-300/30 flex-1 min-w-0"
              placeholder={activeTab === "dms" ? "Search players, games..." : "Search parties..."}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-sky-400/50 hover:text-sky-300 cursor-pointer text-sm leading-none transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveTab("dms")}
              className={`flex-shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all font-medium ${
                activeTab === "dms"
                  ? "bg-sky-600/25 text-sky-200 border border-sky-500/30"
                  : "text-sky-400/50 hover:text-sky-300 hover:bg-sky-900/20"
              }`}
            >
              💬 DMs
              {onlineCount > 0 && (
                <span className={`text-[9px] px-1 rounded-full ${activeTab === "dms" ? "bg-sky-500/30" : "bg-sky-900/50 text-sky-400/50"}`}>
                  {onlineCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("parties")}
              className={`flex-shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all font-medium ${
                activeTab === "parties"
                  ? "bg-purple-600/25 text-purple-200 border border-purple-500/30"
                  : "text-sky-400/50 hover:text-sky-300 hover:bg-sky-900/20"
              }`}
            >
              🎉 Parties
              {parties.length > 0 && (
                <span className={`text-[9px] px-1 rounded-full ${activeTab === "parties" ? "bg-purple-500/30" : "bg-sky-900/50 text-sky-400/50"}`}>
                  {parties.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("lfg")}
              className={`flex-shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all font-medium ${
                activeTab === "lfg"
                  ? "bg-cyan-600/25 text-cyan-200 border border-cyan-500/30"
                  : "text-sky-400/50 hover:text-sky-300 hover:bg-sky-900/20"
              }`}
              title="LFG Squad Board & Scheduled Sessions"
            >
              📢 LFG
              {lfgPosts.length > 0 && (
                <span className={`text-[9px] px-1 rounded-full ${activeTab === "lfg" ? "bg-cyan-500/30" : "bg-sky-900/50 text-sky-400/50"}`}>
                  {lfgPosts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("synergy")}
              className={`flex-shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all font-medium ${
                activeTab === "synergy"
                  ? "bg-emerald-600/25 text-emerald-200 border border-emerald-500/30"
                  : "text-sky-400/50 hover:text-sky-300 hover:bg-sky-900/20"
              }`}
              title="Algorithmic Behavioral Matchmaking"
            >
              🎯 Synergy
            </button>

            <button
              onClick={() => setActiveTab("coaches")}
              className={`flex-shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all font-medium ${
                activeTab === "coaches"
                  ? "bg-amber-600/25 text-amber-200 border border-amber-500/30"
                  : "text-sky-400/50 hover:text-sky-300 hover:bg-sky-900/20"
              }`}
              title="Paid Coaching Marketplace"
            >
              🎓 Coaches
            </button>

            <button
              onClick={() => setActiveTab("scrims")}
              className={`flex-shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all font-medium ${
                activeTab === "scrims"
                  ? "bg-red-600/25 text-red-200 border border-red-500/30"
                  : "text-sky-400/50 hover:text-sky-300 hover:bg-sky-900/20"
              }`}
              title="Esports Scrims & Tournament Matches"
            >
              ⚔️ Scrims
            </button>

            {/* Online filter (DMs only) */}
            {activeTab === "dms" && (
              <div className="flex items-center gap-0.5 ml-auto">
                <button
                  onClick={() => setShowOnlineOnly(false)}
                  title="Show all"
                  className={`text-[10px] px-2 py-1 rounded-md cursor-pointer transition-all ${
                    !showOnlineOnly ? "bg-sky-600/20 text-sky-200" : "text-sky-400/40 hover:text-sky-300"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setShowOnlineOnly(true)}
                  title="Online only"
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md cursor-pointer transition-all ${
                    showOnlineOnly ? "bg-emerald-600/20 text-emerald-200" : "text-sky-400/40 hover:text-sky-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showOnlineOnly ? "bg-emerald-400" : "bg-sky-500/40"}`} />
                  Live
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── DMs list ────────────────────────────────────────────────────── */}
        {activeTab === "dms" && (
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {isUsersLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16 animate-fade-in">
                <span className="text-4xl opacity-50">{searchQuery ? "🔍" : "👥"}</span>
                <div>
                  <p className="text-sm text-sky-300/50 font-medium">
                    {searchQuery ? "No players found" : "No players yet"}
                  </p>
                  <p className="text-[11px] text-sky-400/30 mt-1">
                    {searchQuery ? `No results for "${searchQuery}"` : "Players you chat with appear here"}
                  </p>
                </div>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isOnline = onlineUsers.includes(user._id);
                const unseenCount = unseenMessages[user._id];
                const isSelected = selectedUser?._id === user._id;
                const rankColor = user.rank?.tier ? (RANK_COLOR[user.rank.tier] || null) : null;

                return (
                  <div
                    key={user._id}
                    onClick={() => { setSelectedUser(user); setSelectedParty(null); }}
                    className={`relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover-lift ${
                      isSelected
                        ? 'bg-sky-600/20 border border-sky-500/30 shadow-sm shadow-sky-900/30'
                        : 'hover:bg-[#0f2a4f]/40 border border-transparent'
                    }`}
                  >
                    <Avatar src={user?.profilePic} isOnline={isOnline} size={10} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-xs text-white truncate leading-none">
                          {user.gamerTag || user.fullName}
                        </p>
                        {user.isStreamer && <span className="text-[10px] flex-shrink-0">📺</span>}
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        {user.primaryGame ? (
                          <p className="text-[10px] text-sky-300/55 truncate">{user.primaryGame}</p>
                        ) : (
                          <p className="text-[10px] text-sky-300/40 truncate">{user.email}</p>
                        )}
                        {user.rank?.tier && user.rank.tier !== "Unranked" && rankColor && (
                          <span
                            className="text-[9px] font-bold px-1 rounded flex-shrink-0"
                            style={{ color: rankColor, border: `1px solid ${rankColor}40` }}
                          >
                            {user.rank.tier[0]}{user.rank.division}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-0.5">
                        {(user.platforms || []).slice(0, 3).map(p => (
                          <span key={p} className="text-[9px]" title={p}>{PLATFORM_ICONS[p]}</span>
                        ))}
                        <span className={`text-[9px] ml-auto flex-shrink-0 ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isOnline ? "● Online" : "○ Offline"}
                        </span>
                      </div>
                    </div>

                    {unseenCount > 0 && (
                      <span className="flex-shrink-0 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-sky-500 text-white text-[9px] font-bold shadow-sm">
                        {unseenCount > 99 ? "99+" : unseenCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Parties list ─────────────────────────────────────────────────── */}
        {activeTab === "parties" && (
          <div className="flex-1 overflow-y-auto p-2">
            {/* Quick Match Action */}
            <button
              onClick={() => setShowQuickMatchModal(true)}
              className="w-full mb-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/25 to-orange-500/25 border border-amber-500/40 text-amber-200 hover:border-amber-400 hover:from-amber-500/35 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover-lift"
            >
              <span>⚡ Quick Match (LFG Micro-Lobby)</span>
            </button>

            {/* Actions */}
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => setShowCreateParty(true)}
                className="flex-1 text-[11px] px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600/25 to-pink-600/25 border border-purple-500/25 text-purple-200 hover:border-purple-400/50 hover:from-purple-600/35 hover:to-pink-600/35 transition-all cursor-pointer font-medium"
              >
                ➕ Create Party
              </button>
              <button
                onClick={() => setShowJoinParty(true)}
                className="flex-1 text-[11px] px-3 py-2 rounded-lg bg-sky-900/25 border border-sky-700/25 text-sky-200 hover:border-sky-500/50 hover:bg-sky-900/40 transition-all cursor-pointer font-medium"
              >
                🔗 Join by Code
              </button>
            </div>

            {filteredParties.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center py-12 animate-fade-in">
                <span className="text-4xl opacity-50">🎉</span>
                <div>
                  <p className="text-sm text-sky-300/50 font-medium">No parties yet</p>
                  <p className="text-[11px] text-sky-400/30 mt-1">Create one or click Quick Match</p>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredParties.map(party => {
                  const isSelected = selectedParty?._id === party._id;
                  const memberCount = party.members?.length || 0;
                  const onlineMemberCount = party.members?.filter(m => {
                    const uid = m.userId?._id || m.userId;
                    return onlineUsers.includes(uid?.toString());
                  }).length || 0;
                  const isFull = memberCount >= party.maxPlayers;

                  return (
                    <div
                      key={party._id}
                      onClick={() => { setSelectedParty(party); setSelectedUser(null); }}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover-lift ${
                        isSelected
                          ? 'bg-purple-600/20 border border-purple-500/30 shadow-sm'
                          : 'hover:bg-[#0f2a4f]/40 border border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-md ${
                        party.isTransient
                          ? "bg-gradient-to-br from-amber-500 to-orange-600"
                          : isFull
                            ? "bg-gradient-to-br from-red-600/60 to-pink-700/60"
                            : "bg-gradient-to-br from-purple-500 to-pink-600"
                      }`}>
                        {party.isTransient ? "⚡" : "🎉"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-xs text-white truncate">{party.name}</p>
                          {party.isTransient && (
                            <span className="text-[8px] text-amber-300 bg-amber-400/10 border border-amber-400/30 px-1 py-0.5 rounded-full flex-shrink-0">TTL</span>
                          )}
                          {party.isOpen && !isFull && (
                            <span className="text-[8px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1 py-0.5 rounded-full flex-shrink-0">OPEN</span>
                          )}
                          {isFull && (
                            <span className="text-[8px] text-red-400 bg-red-400/10 border border-red-400/20 px-1 py-0.5 rounded-full flex-shrink-0">FULL</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {party.game && <span className="text-[10px] text-sky-300/55 truncate">🎮 {party.game}</span>}
                          {party.activityType && (
                            <span className="text-[9px] text-indigo-300 bg-indigo-900/40 px-1 rounded">
                              {party.activityType}
                            </span>
                          )}
                          <span className="text-[10px] text-sky-400/40 flex-shrink-0">
                            👥 {memberCount}/{party.maxPlayers}
                          </span>
                          {(() => {
                            const vCount = partyVoiceRosters[party._id]?.count || 0;
                            if (vCount > 0) {
                              return (
                                <span className="text-[9px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-mono flex items-center gap-1 font-semibold">
                                  <span>🔊</span>
                                  <span>{vCount} in voice</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <span className={`text-[9px] ${onlineMemberCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {onlineMemberCount > 0 ? `● ${onlineMemberCount} online` : "○ No one online"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LFG Board & Scheduled Sessions (Phase 4) ────────────────────── */}
        {activeTab === "lfg" && <LFGBoard />}

        {/* ── Synergy (Behavioral Matchmaking) ────────────────────────────── */}
        {activeTab === "synergy" && (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-emerald-200 text-xs">
              <p className="font-bold flex items-center gap-1.5">🎯 Behavioral Matchmaking</p>
              <p className="text-[10px] text-emerald-400/70 mt-0.5">
                Teammates scored by playstyle overlap, mic affinity, rank delta, and karma.
              </p>
            </div>

            {isMatchingLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonItem key={i} />)
            ) : behavioralMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center py-12 text-sky-300/50">
                <span className="text-3xl">🎯</span>
                <p className="text-xs">No active player synergy matches found.</p>
              </div>
            ) : (
              behavioralMatches.map(({ user, synergyScore, breakdown }) => (
                <div
                  key={user._id}
                  className="p-2.5 rounded-xl bg-[#0c1f3a]/70 border border-sky-900/30 hover:border-emerald-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={user.profilePic} isOnline={onlineUsers.includes(user._id)} size={9} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white truncate">{user.gamerTag || user.fullName}</p>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {synergyScore}% Match
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-sky-300/60 mt-0.5">
                        {user.rank?.tier && <span>🏆 {user.rank.tier}</span>}
                        {user.region && <span>🌍 {user.region}</span>}
                        <span>{user.micEnabled ? "🎙️ Mic" : "🔇 No Mic"}</span>
                      </div>
                    </div>
                  </div>

                  {breakdown?.commonPlayStyles?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {breakdown.commonPlayStyles.map(ps => (
                        <span key={ps} className="text-[9px] px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-300 border border-sky-700/30">
                          ★ {ps}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => { setSelectedUser(user); setSelectedParty(null); }}
                    className="w-full py-1.5 text-[11px] rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/30 cursor-pointer font-medium transition-all"
                  >
                    💬 Message & Squad Up
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Coaching Marketplace ────────────────────────────────────────── */}
        {activeTab === "coaches" && (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-amber-200 text-xs">
              <p className="font-bold flex items-center gap-1.5">🎓 Coaching Marketplace</p>
              <p className="text-[10px] text-amber-400/70 mt-0.5">
                Book 1-on-1 gameplay analysis and VOD reviews with verified top players.
              </p>
            </div>

            {isCoachesLoading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonItem key={i} />)
            ) : coaches.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center py-12 text-sky-300/50">
                <span className="text-3xl">🎓</span>
                <p className="text-xs">No verified coaches available.</p>
              </div>
            ) : (
              coaches.map(c => (
                <div
                  key={c._id}
                  className="p-2.5 rounded-xl bg-[#0c1f3a]/70 border border-sky-900/30 hover:border-amber-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={c.profilePic} isOnline={onlineUsers.includes(c._id)} size={9} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white truncate">{c.gamerTag || c.fullName}</p>
                        <span className="text-[11px] font-bold text-amber-300">
                          ${c.coachProfile?.hourlyRate || 25}/hr
                        </span>
                      </div>
                      <p className="text-[10px] text-sky-300/70 truncate">{c.coachProfile?.title || "Ranked Strategist"}</p>
                      <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-0.5">
                        <span>⭐ {c.coachProfile?.rating?.toFixed(1) || "5.0"}</span>
                        <span className="text-sky-400/40">({c.coachProfile?.totalSessions || 0} sessions)</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowBookCoachModal(c); setBookingForm(f => ({ ...f, game: c.primaryGame || "" })); }}
                    className="w-full py-1.5 text-[11px] rounded-lg bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/50 hover:to-orange-600/50 text-amber-200 border border-amber-500/40 cursor-pointer font-medium transition-all"
                  >
                    📅 Book Coaching Session
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Esports Scrims ──────────────────────────────────────────────── */}
        {activeTab === "scrims" && (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => setShowProposeScrimModal(true)}
                className="w-full py-2 px-3 text-xs rounded-xl bg-gradient-to-r from-red-600/30 to-orange-600/30 border border-red-500/40 text-red-200 hover:border-red-400 transition-all font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                ⚔️ Propose Scrim Challenge
              </button>
            </div>

            {isScrimsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonItem key={i} />)
            ) : scrims.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center py-12 text-sky-300/50">
                <span className="text-3xl">⚔️</span>
                <p className="text-xs">No active esports scrims scheduled.</p>
                <p className="text-[10px] text-sky-400/40">Challenge an opposing squad to practice!</p>
              </div>
            ) : (
              scrims.map(s => (
                <div
                  key={s._id}
                  className="p-3 rounded-xl bg-[#0c1f3a]/80 border border-red-900/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-300">🎮 {s.game} ({s.format})</span>
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                      s.status === "accepted" || s.status === "in_progress"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : s.status === "completed"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-white px-1">
                    <span>{s.teamA?.teamName} ({s.teamA?.score || 0})</span>
                    <span className="text-[10px] text-red-400">VS</span>
                    <span>{s.teamB?.teamName} ({s.teamB?.score || 0})</span>
                  </div>

                  {s.serverCredentials?.serverIp && (
                    <div className="p-2 rounded bg-black/40 text-[10px] text-sky-200 font-mono">
                      <p>📡 Server: {s.serverCredentials.serverIp}</p>
                      <p>🔑 Pass: {s.serverCredentials.password || "(none)"}</p>
                      {s.serverCredentials.map && <p>🗺️ Map: {s.serverCredentials.map}</p>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── My Profile Card (bottom) ─────────────────────────────────── */}
        {authUser && (
          <div className="flex-shrink-0 p-2.5 border-t border-sky-900/20 bg-[#070e1f]/80">
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-sky-900/30 cursor-pointer transition-all group"
              title="Click to view & edit your profile"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={authUser.profilePic || assets.avatar_icon}
                  alt="me"
                  className="w-9 h-9 object-cover rounded-full border border-sky-600/40 group-hover:border-sky-400 transition-colors"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#070e1f] rounded-full online-dot" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-none group-hover:text-sky-200 transition-colors">
                  {authUser.gamerTag || authUser.fullName}
                </p>
                <p className="text-[10px] truncate mt-0.5 text-emerald-400/70">
                  {authUser.customStatus?.text || (authUser.primaryGame ? `🎮 ${authUser.primaryGame}` : "● Online")}
                </p>
              </div>
              <div
                className="flex-shrink-0 px-2 py-1 rounded-lg bg-sky-950/60 border border-sky-800/40 group-hover:border-sky-500/50 group-hover:bg-sky-600/20 text-sky-300 text-[11px] font-medium transition-all"
              >
                Profile ⚙️
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Party Modal ─────────────────────────────────────────────── */}
      {showCreateParty && (
        <Modal onClose={() => setShowCreateParty(false)} title="🎉 Create Party">
          <div className="space-y-4">
            <Field label="Party Name *">
              <input
                type="text"
                value={newParty.name}
                onChange={e => setNewParty(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Ranked Grinders"
                maxLength={40}
                className={modalInputCls}
                autoFocus
              />
            </Field>
            <Field label="Game">
              <input
                type="text"
                value={newParty.game}
                onChange={e => setNewParty(p => ({ ...p, game: e.target.value }))}
                placeholder="e.g. Valorant"
                className={modalInputCls}
              />
            </Field>
            <div className="flex gap-3">
              <Field label="Activity Type" className="flex-1">
                <select
                  value={newParty.activityType}
                  onChange={e => setNewParty(p => ({ ...p, activityType: e.target.value }))}
                  className={modalInputCls}
                >
                  {["Casual", "Ranked", "Raid", "Dungeon", "Boss", "Scrim", "Custom"].map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </Field>
              <Field label="Max Players" className="flex-1">
                <select
                  value={newParty.maxPlayers}
                  onChange={e => setNewParty(p => ({ ...p, maxPlayers: parseInt(e.target.value) }))}
                  className={modalInputCls}
                >
                  {[2,3,4,5,6,8,10,12,16].map(n => (
                    <option key={n} value={n}>{n} players</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex gap-3">
              <Field label="Open Join" className="flex-1">
                <button
                  type="button"
                  onClick={() => setNewParty(p => ({ ...p, isOpen: !p.isOpen }))}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-all cursor-pointer font-medium ${
                    newParty.isOpen
                      ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-200"
                      : "bg-[#0e274a]/60 border-sky-800/30 text-sky-300/60"
                  }`}
                >
                  {newParty.isOpen ? "✅ Open" : "🔒 Invite Only"}
                </button>
              </Field>
              <Field label="Micro-Lobby (TTL)" className="flex-1">
                <button
                  type="button"
                  onClick={() => setNewParty(p => ({ ...p, isTransient: !p.isTransient }))}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-all cursor-pointer font-medium ${
                    newParty.isTransient
                      ? "bg-amber-600/20 border-amber-500/40 text-amber-200"
                      : "bg-[#0e274a]/60 border-sky-800/30 text-sky-300/60"
                  }`}
                >
                  {newParty.isTransient ? "⚡ 45m Expiry" : "♾️ Persistent"}
                </button>
              </Field>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleCreateParty}
              disabled={!newParty.name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold cursor-pointer disabled:opacity-40 transition-all press-active"
            >
              Create Party 🎉
            </button>
            <button
              onClick={() => setShowCreateParty(false)}
              className="px-4 py-2.5 rounded-xl bg-sky-900/30 text-sky-300/70 text-sm hover:bg-sky-900/50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Quick Match Modal ──────────────────────────────────────────────── */}
      {showQuickMatchModal && (
        <Modal onClose={() => setShowQuickMatchModal(false)} title="⚡ Quick Match (LFG Micro-Lobby)">
          <div className="space-y-4">
            <p className="text-xs text-sky-300/70">
              Instantly find or spawn an ephemeral co-op micro-lobby with auto-TTL expiration.
            </p>
            <Field label="Target Game *">
              <input
                type="text"
                value={quickMatchData.game}
                onChange={e => setQuickMatchData(d => ({ ...d, game: e.target.value }))}
                placeholder="e.g. Valorant / Destiny 2"
                className={modalInputCls}
                autoFocus
              />
            </Field>
            <div className="flex gap-3">
              <Field label="Activity" className="flex-1">
                <select
                  value={quickMatchData.activityType}
                  onChange={e => setQuickMatchData(d => ({ ...d, activityType: e.target.value }))}
                  className={modalInputCls}
                >
                  {["Casual", "Ranked", "Raid", "Dungeon", "Boss", "Scrim"].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Squad Size" className="flex-1">
                <select
                  value={quickMatchData.maxPlayers}
                  onChange={e => setQuickMatchData(d => ({ ...d, maxPlayers: parseInt(e.target.value) }))}
                  className={modalInputCls}
                >
                  {[2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n} players</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleQuickMatch}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-semibold cursor-pointer transition-all press-active"
            >
              Find Squad ⚡
            </button>
            <button
              onClick={() => setShowQuickMatchModal(false)}
              className="px-4 py-2.5 rounded-xl bg-sky-900/30 text-sky-300/70 text-sm hover:bg-sky-900/50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Book Coach Modal ──────────────────────────────────────────────── */}
      {showBookCoachModal && (
        <Modal onClose={() => setShowBookCoachModal(null)} title={`📅 Book Coach: ${showBookCoachModal.gamerTag || showBookCoachModal.fullName}`}>
          <div className="space-y-4">
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-200">
              <p className="font-semibold">Rate: ${showBookCoachModal.coachProfile?.hourlyRate || 25}/hr</p>
              <p className="text-[10px] text-amber-300/70">{showBookCoachModal.coachProfile?.title}</p>
            </div>
            <Field label="Game for Coaching">
              <input
                type="text"
                value={bookingForm.game}
                onChange={e => setBookingForm(f => ({ ...f, game: e.target.value }))}
                placeholder="e.g. Apex Legends"
                className={modalInputCls}
              />
            </Field>
            <Field label="Session Date & Time">
              <input
                type="datetime-local"
                value={bookingForm.sessionDate}
                onChange={e => setBookingForm(f => ({ ...f, sessionDate: e.target.value }))}
                className={modalInputCls}
              />
            </Field>
            <Field label="Goals & Notes">
              <textarea
                value={bookingForm.notes}
                onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Aim mechanics, crosshair placement, ranked positioning"
                rows={2}
                className={modalInputCls}
              />
            </Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleBookCoach}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold cursor-pointer transition-all press-active"
            >
              Confirm Booking 📅
            </button>
            <button
              onClick={() => setShowBookCoachModal(null)}
              className="px-4 py-2.5 rounded-xl bg-sky-900/30 text-sky-300/70 text-sm hover:bg-sky-900/50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Propose Scrim Modal ────────────────────────────────────────────── */}
      {showProposeScrimModal && (
        <Modal onClose={() => setShowProposeScrimModal(false)} title="⚔️ Propose Esports Scrim">
          <div className="space-y-4">
            <Field label="Select Your Squad">
              <select
                value={scrimForm.myPartyId}
                onChange={e => setScrimForm(f => ({ ...f, myPartyId: e.target.value }))}
                className={modalInputCls}
              >
                <option value="">-- Choose Party --</option>
                {parties.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.game})</option>
                ))}
              </select>
            </Field>
            <Field label="Challenged Squad">
              <select
                value={scrimForm.opponentPartyId}
                onChange={e => setScrimForm(f => ({ ...f, opponentPartyId: e.target.value }))}
                className={modalInputCls}
              >
                <option value="">-- Opposing Party --</option>
                {parties.filter(p => p._id !== scrimForm.myPartyId).map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.game})</option>
                ))}
              </select>
            </Field>
            <Field label="Game & Format">
              <input
                type="text"
                value={scrimForm.format}
                onChange={e => setScrimForm(f => ({ ...f, format: e.target.value }))}
                placeholder="e.g. 5v5 Best of 3"
                className={modalInputCls}
              />
            </Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleProposeScrim}
              disabled={!scrimForm.myPartyId || !scrimForm.opponentPartyId}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-semibold cursor-pointer disabled:opacity-40 transition-all press-active"
            >
              Issue Challenge ⚔️
            </button>
            <button
              onClick={() => setShowProposeScrimModal(false)}
              className="px-4 py-2.5 rounded-xl bg-sky-900/30 text-sky-300/70 text-sm hover:bg-sky-900/50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Join Party Modal ──────────────────────────────────────────────── */}
      {showJoinParty && (
        <Modal onClose={() => setShowJoinParty(false)} title="🔗 Join Party">
          <Field label="Invite Code">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXX"
              maxLength={8}
              className={`${modalInputCls} text-center tracking-[8px] font-mono text-lg uppercase`}
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleJoinParty()}
            />
          </Field>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleJoinParty}
              disabled={joinCode.length < 4}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-semibold cursor-pointer disabled:opacity-40 transition-all press-active"
            >
              Join Party →
            </button>
            <button
              onClick={() => setShowJoinParty(false)}
              className="px-4 py-2.5 rounded-xl bg-sky-900/30 text-sky-300/70 text-sm hover:bg-sky-900/50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Phase 6: Safety & Moderation Console */}
      <ModerationModal
        isOpen={showModerationModal}
        onClose={() => setShowModerationModal(false)}
      />
    </>
  );
};

/* ── Shared modal input class ──────────────────────────────────────────── */
const modalInputCls = [
  "w-full bg-[#0e274a]/80 border border-sky-800/40 rounded-xl px-3 py-2.5",
  "text-sm text-white placeholder-sky-200/30",
  "outline-none focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/15",
  "transition-all",
].join(" ");

/* ── Modal wrapper ──────────────────────────────────────────────────────── */
const Modal = ({ onClose, title, children }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    onClick={onClose}
  >
    <div
      className="bg-[#0c1f3a] border border-sky-700/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in"
      onClick={e => e.stopPropagation()}
    >
      <h3 className="text-base font-bold text-white mb-5">{title}</h3>
      {children}
    </div>
  </div>
);

/* ── Field label wrapper ─────────────────────────────────────────────────── */
const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className="text-[11px] text-sky-300/60 mb-1.5 block font-medium">{label}</label>
    {children}
  </div>
);

export default Sidebar;