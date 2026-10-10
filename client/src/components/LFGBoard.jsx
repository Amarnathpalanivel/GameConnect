import React, { useContext, useState, useEffect } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import assets from "../assets/assets";
import toast from "react-hot-toast";

const GAMES_LIST = [
  "All Games",
  "Valorant",
  "Apex Legends",
  "Counter-Strike 2",
  "League of Legends",
  "Overwatch 2",
  "Fortnite",
  "Destiny 2",
  "Call of Duty: Warzone",
  "Dota 2",
  "Rainbow Six Siege",
];

const MODES_LIST = ["All", "Ranked", "Casual", "Competitive", "Raid", "Dungeon", "Tournament", "Co-op"];
const REGIONS_LIST = ["All", "Global", "NA", "EU", "SEA", "IN", "APAC", "SA", "ME", "OC"];

const LFGBoard = () => {
  const {
    lfgPosts,
    isLfgLoading,
    upcomingSessions,
    isSessionsLoading,
    getLFGBoard,
    createLFGPost,
    joinLFGPost,
    leaveLFGPost,
    closeLFGPost,
    getUpcomingSessions,
    sendSessionReminder,
    setSelectedParty,
    parties,
  } = useContext(ChatContext);

  const { authUser, onlineUsers } = useContext(AuthContext);

  const [subTab, setSubTab] = useState("board"); // "board" | "sessions"
  const [selectedGame, setSelectedGame] = useState("All Games");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [micOnly, setMicOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    game: "Valorant",
    mode: "Ranked",
    spotsTotal: 4,
    rankRequirement: "Any Rank",
    region: "Global",
    micRequired: true,
    isScheduled: false,
    scheduledAt: "",
    estimatedDuration: "1-2 Hours",
    note: "",
  });

  // Load LFG posts on mount and when filter changes
  useEffect(() => {
    const filters = {};
    if (selectedGame !== "All Games") filters.game = selectedGame;
    if (selectedRegion !== "All") filters.region = selectedRegion;
    if (selectedMode !== "All") filters.mode = selectedMode;
    if (micOnly) filters.micRequired = true;
    getLFGBoard(filters);
  }, [selectedGame, selectedRegion, selectedMode, micOnly]);

  // Load scheduled sessions when switching to sessions sub-tab
  useEffect(() => {
    if (subTab === "sessions") {
      getUpcomingSessions();
    }
  }, [subTab]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return toast.error("Please enter a squad title");
    }
    if (!formData.game.trim()) {
      return toast.error("Please select or enter a game");
    }

    const payload = {
      title: formData.title.trim(),
      game: formData.game.trim(),
      mode: formData.mode,
      spotsTotal: Number(formData.spotsTotal),
      rankRequirement: formData.rankRequirement,
      region: formData.region,
      micRequired: formData.micRequired,
      scheduledAt: formData.isScheduled && formData.scheduledAt ? new Date(formData.scheduledAt) : null,
      estimatedDuration: formData.estimatedDuration,
      note: formData.note.trim(),
    };

    const newPost = await createLFGPost(payload);
    if (newPost) {
      setShowCreateModal(false);
      setFormData({
        title: "",
        game: "Valorant",
        mode: "Ranked",
        spotsTotal: 4,
        rankRequirement: "Any Rank",
        region: "Global",
        micRequired: true,
        isScheduled: false,
        scheduledAt: "",
        estimatedDuration: "1-2 Hours",
        note: "",
      });
    }
  };

  const handleOpenParty = (partyId) => {
    if (!partyId) return;
    const targetParty = parties.find((p) => p._id === partyId || p._id === partyId._id);
    if (targetParty) {
      setSelectedParty(targetParty);
    } else {
      toast("Connecting to party lobby...", { icon: "🎉" });
    }
  };

  const formatCountdown = (targetDate) => {
    if (!targetDate) return "";
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return "Starting right now!";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Starts in ${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `Starts in ${hours}h ${remMins > 0 ? `${remMins}m` : ""}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#071326]/60">
      {/* ── Sub-Tab Toggles & Create Button ──────────────────────────────── */}
      <div className="p-3 border-b border-sky-900/30 flex items-center justify-between gap-2 bg-[#0a182e]/80">
        <div className="flex items-center gap-1.5 p-1 bg-sky-950/60 border border-sky-900/40 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("board")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              subTab === "board"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                : "text-slate-400 hover:text-sky-200"
            }`}
          >
            📢 Active Squads
          </button>
          <button
            type="button"
            onClick={() => setSubTab("sessions")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              subTab === "sessions"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-purple-200"
            }`}
          >
            <span>📅 Scheduled</span>
            {upcomingSessions.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-purple-400 text-purple-950 rounded-full font-bold">
                {upcomingSessions.length}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all transform active:scale-95"
        >
          <span>➕</span>
          <span>Post LFG</span>
        </button>
      </div>

      {/* ── Filter Bar (Board View Only) ─────────────────────────────────── */}
      {subTab === "board" && (
        <div className="px-3 py-2 border-b border-sky-900/30 bg-[#08172c]/40 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          {/* Game Select */}
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900/80 border border-sky-800/40 rounded-lg text-sky-200 text-xs focus:outline-none focus:border-sky-500"
          >
            {GAMES_LIST.map((g) => (
              <option key={g} value={g} className="bg-slate-900 text-white">
                {g}
              </option>
            ))}
          </select>

          {/* Region Select */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900/80 border border-sky-800/40 rounded-lg text-sky-200 text-xs focus:outline-none focus:border-sky-500"
          >
            {REGIONS_LIST.map((r) => (
              <option key={r} value={r} className="bg-slate-900 text-white">
                {r === "All" ? "All Regions" : r}
              </option>
            ))}
          </select>

          {/* Mode Select */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900/80 border border-sky-800/40 rounded-lg text-sky-200 text-xs focus:outline-none focus:border-sky-500"
          >
            {MODES_LIST.map((m) => (
              <option key={m} value={m} className="bg-slate-900 text-white">
                {m === "All" ? "All Modes" : m}
              </option>
            ))}
          </select>

          {/* Mic Required Filter Toggle */}
          <button
            type="button"
            onClick={() => setMicOnly((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-medium transition-all ${
              micOnly
                ? "bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm shadow-sky-500/20"
                : "bg-slate-900/60 text-slate-400 border-sky-900/30 hover:text-slate-300"
            }`}
          >
            <span>🎙️</span>
            <span>Mic Only</span>
          </button>
        </div>
      )}

      {/* ── Content Area: Active Board or Scheduled Sessions ─────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {subTab === "board" ? (
          /* Active LFG Board */
          isLfgLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-28 rounded-2xl w-full" />
              ))}
            </div>
          ) : lfgPosts.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <span className="text-4xl opacity-40 mb-2">🎮</span>
              <p className="text-sm font-semibold text-sky-200">No Active LFG Squads Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Be the first to create a squad post or adjust your filters above!
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                Create Squad Post
              </button>
            </div>
          ) : (
            lfgPosts.map((post) => {
              const isCreator = post.creatorId?._id === authUser?._id;
              const isJoined = post.joinedPlayers?.some((p) => p._id === authUser?._id);
              const isFull = post.status === "full" || post.spotsFilled >= post.spotsTotal;

              return (
                <div
                  key={post._id}
                  className="p-3.5 rounded-2xl bg-[#091b35]/80 border border-sky-900/40 hover:border-sky-500/40 transition-all duration-200 shadow-xl shadow-black/40 space-y-2.5 group"
                >
                  {/* Top Badges & Meta */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-md">
                        🎮 {post.game}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md">
                        {post.mode}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] text-slate-400 bg-slate-800/60 rounded-md">
                        🌍 {post.region}
                      </span>
                      {post.micRequired && (
                        <span className="px-1.5 py-0.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 rounded-md">
                          🎙️ Mic
                        </span>
                      )}
                      {post.rankRequirement && post.rankRequirement !== "Any Rank" && (
                        <span className="px-1.5 py-0.5 text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/30 rounded-md">
                          🏆 {post.rankRequirement}
                        </span>
                      )}
                    </div>

                    {/* Schedule / Time Status */}
                    <div className="text-[11px] font-medium flex items-center gap-1">
                      {post.scheduledAt ? (
                        <span className="text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-800/30">
                          📅 {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>⚡ Now</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Note */}
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-sky-200 transition-colors">
                      {post.title}
                    </h4>
                    {post.note && (
                      <p className="text-xs text-slate-300/80 mt-1 line-clamp-2">
                        {post.note}
                      </p>
                    )}
                  </div>

                  {/* Creator Info & Slots Progress */}
                  <div className="pt-2 border-t border-sky-950/80 flex items-center justify-between gap-3">
                    {/* Creator avatar & tag */}
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={post.creatorId?.profilePic || assets.avatar_icon}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover border border-sky-600/40"
                      />
                      <span className="text-xs text-slate-300 truncate font-medium">
                        {post.creatorId?.gamerTag || post.creatorId?.fullName}
                      </span>
                    </div>

                    {/* Slots Display & Avatars */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {post.joinedPlayers?.slice(0, 4).map((player) => (
                          <img
                            key={player._id}
                            src={player.profilePic || assets.avatar_icon}
                            title={player.gamerTag || player.fullName}
                            alt=""
                            className="inline-block h-5 w-5 rounded-full ring-2 ring-[#0c1f3a]"
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-bold ${isFull ? "text-rose-400" : "text-sky-300"}`}>
                        {post.spotsFilled}/{post.spotsTotal}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {post.partyId && (
                      <button
                        type="button"
                        onClick={() => handleOpenParty(post.partyId)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 rounded-xl border border-purple-800/40 transition-colors"
                        title="Open squad party chat"
                      >
                        🎉 Party Chat
                      </button>
                    )}

                    {isCreator ? (
                      <button
                        type="button"
                        onClick={() => closeLFGPost(post._id)}
                        className="px-3 py-1 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-xl border border-rose-800/40 transition-colors"
                      >
                        Close Post
                      </button>
                    ) : isJoined ? (
                      <button
                        type="button"
                        onClick={() => leaveLFGPost(post._id)}
                        className="px-3 py-1 text-xs font-semibold text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 rounded-xl border border-amber-800/40 transition-colors"
                      >
                        Leave Squad
                      </button>
                    ) : isFull ? (
                      <span className="px-3 py-1 text-xs font-semibold text-slate-400 bg-slate-800/60 rounded-xl border border-slate-700/30 cursor-not-allowed">
                        Squad Full
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => joinLFGPost(post._id)}
                        className="px-3.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-xl shadow-md shadow-sky-600/30 transition-all transform active:scale-95"
                      >
                        🎮 Join Squad
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Scheduled Sessions View (Calendar / Timeline) */
          isSessionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-2xl w-full" />
              ))}
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <span className="text-4xl opacity-40 mb-2">📅</span>
              <p className="text-sm font-semibold text-purple-200">No Scheduled Sessions Yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Plan ahead! Create an LFG post and check "Schedule for Later" to organize future raids and ranked matches.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, isScheduled: true }));
                  setShowCreateModal(true);
                }}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                Schedule a Session
              </button>
            </div>
          ) : (
            upcomingSessions.map((session) => {
              const isOrganizer = session.creatorId?._id === authUser?._id;
              const countdown = formatCountdown(session.scheduledAt);

              return (
                <div
                  key={session._id}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0c1f3a]/90 to-[#15112e]/90 border border-purple-900/40 hover:border-purple-500/40 transition-all shadow-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md">
                      🎮 {session.game} · {session.mode}
                    </span>
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-900/30">
                      ⏳ {countdown}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{session.title}</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      📅 {new Date(session.scheduledAt).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {" · "}
                      <span className="text-slate-400">Duration: {session.estimatedDuration}</span>
                    </p>
                  </div>

                  {/* Joined Members */}
                  <div className="pt-2 border-t border-purple-950/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Squad:</span>
                      <span className="text-xs font-bold text-purple-300">
                        {session.spotsFilled}/{session.spotsTotal}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOrganizer && (
                        <button
                          type="button"
                          onClick={() => sendSessionReminder(session._id)}
                          className="px-2.5 py-1 text-xs font-semibold text-yellow-300 hover:text-white bg-yellow-950/40 hover:bg-yellow-900/60 rounded-xl border border-yellow-800/40 transition-colors"
                          title="Ping notifications to all squad players"
                        >
                          ⏰ Ping Reminder
                        </button>
                      )}

                      {session.partyId && (
                        <button
                          type="button"
                          onClick={() => handleOpenParty(session.partyId)}
                          className="px-3 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md transition-colors"
                        >
                          🎉 Enter Lobby
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* ── Modal: Create LFG Post / Schedule Session ─────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animation-fadeIn">
          <div className="w-full max-w-md bg-[#0a182e] border border-sky-600/40 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-sky-900/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <h3 className="font-bold text-base text-white">Create LFG Squad Post</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Squad Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diamond Push tonight! Need chill IGL & smokes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-sky-800/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Game *</label>
                  <input
                    type="text"
                    required
                    placeholder="Game name"
                    value={formData.game}
                    onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/80 border border-sky-800/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mode</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/80 border border-sky-800/40 rounded-xl text-white focus:outline-none focus:border-sky-500"
                  >
                    {MODES_LIST.filter((m) => m !== "All").map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Squad Capacity (2-16)</label>
                  <input
                    type="number"
                    min="2"
                    max="16"
                    value={formData.spotsTotal}
                    onChange={(e) => setFormData({ ...formData, spotsTotal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/80 border border-sky-800/40 rounded-xl text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rank Requirement</label>
                  <input
                    type="text"
                    placeholder="e.g. Any, Gold+, Diamond"
                    value={formData.rankRequirement}
                    onChange={(e) => setFormData({ ...formData, rankRequirement: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/80 border border-sky-800/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Region</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/80 border border-sky-800/40 rounded-xl text-white focus:outline-none focus:border-sky-500"
                  >
                    {REGIONS_LIST.filter((r) => r !== "All").map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={formData.micRequired}
                      onChange={(e) => setFormData({ ...formData, micRequired: e.target.checked })}
                      className="rounded accent-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <span>🎙️ Mic Required</span>
                  </label>
                </div>
              </div>

              {/* Schedule Toggle */}
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/30 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-purple-200">
                  <input
                    type="checkbox"
                    checked={formData.isScheduled}
                    onChange={(e) => setFormData({ ...formData, isScheduled: e.target.checked })}
                    className="rounded accent-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <span>📅 Schedule Session for Later</span>
                </label>

                {formData.isScheduled && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Date & Time</label>
                      <input
                        type="datetime-local"
                        required={formData.isScheduled}
                        value={formData.scheduledAt}
                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-purple-700/40 rounded-lg text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Est. Duration</label>
                      <input
                        type="text"
                        placeholder="e.g. 2 Hours"
                        value={formData.estimatedDuration}
                        onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-purple-700/40 rounded-lg text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Squad Notes / Rules</label>
                <textarea
                  rows="2"
                  placeholder="Drop agents, playstyle expectations, or discord info..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-sky-800/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-900/40">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Post LFG Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LFGBoard;
