import React, { useContext, useState } from 'react'
import assets from '../assets/assets'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'
import { VoiceContext } from '../../context/VoiceContext'
import EndorsePlayerModal from './EndorsePlayerModal'
import ReportModal from './ReportModal'
import toast from 'react-hot-toast'

const PLATFORM_ICONS = { PC:"🖥️", PlayStation:"🎮", Xbox:"🟢", Nintendo:"🔴", Mobile:"📱" };
const RANK_COLOR = {
  Iron:"#a8a9ad", Bronze:"#cd7f32", Silver:"#c0c0c0", Gold:"#ffd700",
  Platinum:"#00b4d8", Diamond:"#b9f2ff", Master:"#9b59b6",
  Grandmaster:"#e74c3c", Challenger:"#f1c40f",
};
const ROLE_BADGE = { leader: "👑", "co-leader": "⭐", member: "" };

/* ── Section header ─────────────────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
  <p className="text-[10px] font-semibold text-sky-400/60 uppercase tracking-widest mb-2">
    {children}
  </p>
);

/* ── Info row ───────────────────────────────────────────────────────────── */
const InfoRow = ({ label, value, valueStyle }) => (
  <div className="flex items-center justify-between py-0.5">
    <span className="text-[11px] text-sky-300/50">{label}</span>
    <span className="text-[11px] text-white font-medium" style={valueStyle}>{value}</span>
  </div>
);

const RightSidebar = () => {
  const {
    selectedUser, messages,
    selectedParty, partyMessages,
    leaveParty, inviteToParty, kickFromParty, disbandParty,
  } = useContext(ChatContext);
  const { onlineUsers, authUser, sendFriendRequest, reportUser } = useContext(AuthContext);
  const {
    isInVoice, currentVoicePartyId, voiceParticipants, userVolumes,
    setParticipantVolume, isSpeaking: isSelfSpeaking, isMuted: isSelfMuted,
    isDeafened: isSelfDeafened,
  } = useContext(VoiceContext);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [inviteTag, setInviteTag] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* PARTY MODE                                                             */
  /* ═══════════════════════════════════════════════════════════════════════ */
  if (selectedParty) {
    const isLeader = selectedParty.members?.find(m => {
      const uid = m.userId?._id || m.userId;
      return uid?.toString() === authUser?._id;
    })?.role === "leader";

    const partyMedia = partyMessages.filter(m => m.image).map(m => m.image);

    const handleInvite = async () => {
      if (!inviteTag.trim()) return;
      await inviteToParty(selectedParty._id, inviteTag.trim());
      setInviteTag(""); setShowInvite(false);
    };

    return (
      <div className="bg-[#070e1f]/95 border-l border-sky-900/20 text-white w-full h-full min-h-0 flex flex-col overflow-hidden max-md:hidden animate-slide-right">
        {/* Scrollable container covering all party content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
          {/* Party identity */}
          <div className="pt-2 pb-4 flex flex-col items-center gap-2.5 text-center border-b border-sky-900/20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-3xl shadow-xl shadow-purple-500/25">
              🎉
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{selectedParty.name}</h2>
              {selectedParty.game && <p className="text-xs text-sky-300/55 mt-0.5">🎮 {selectedParty.game}</p>}
            </div>

            {/* Invite code pill */}
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-sky-950/50 border border-sky-900/30 hover:border-sky-600/50 rounded-full cursor-pointer transition-all group"
              onClick={() => { navigator.clipboard.writeText(selectedParty.inviteCode); toast.success("Invite code copied!"); }}
              title="Click to copy"
            >
              <span className="text-[10px] text-sky-400/60">Code:</span>
              <span className="text-xs font-mono font-bold text-sky-200 tracking-widest">{selectedParty.inviteCode}</span>
              <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">📋</span>
            </button>

            <div className="flex items-center gap-2 text-[11px] text-sky-300/50">
              <span>👥 {selectedParty.members?.length}/{selectedParty.maxPlayers}</span>
              <span>·</span>
              <span>{selectedParty.isOpen ? "🔓 Open" : "🔒 Invite Only"}</span>
            </div>
          </div>

          {/* Members */}
          <div>
            <SectionTitle>Members ({selectedParty.members?.length || 0})</SectionTitle>
            <div className="space-y-1">
              {(selectedParty.members || []).map((member, i) => {
                const user = member.userId;
                if (!user) return null;
                const uid = user._id || user;
                const isOnline = onlineUsers.includes(uid?.toString());
                const isMe = uid?.toString() === authUser?._id;

                const isMeInVoice = isInVoice && currentVoicePartyId === selectedParty._id;
                const peerVoice = voiceParticipants.find(p => p.userId === uid?.toString());
                const inVoice = isMe ? isMeInVoice : !!peerVoice;
                const speaking = isMe ? (isMeInVoice && isSelfSpeaking) : !!peerVoice?.isSpeaking;
                const muted = isMe ? isSelfMuted : !!peerVoice?.isMuted;
                const deafened = isMe ? isSelfDeafened : !!peerVoice?.isDeafened;
                const currentVol = userVolumes[uid?.toString()] !== undefined ? userVolumes[uid?.toString()] : 1.0;

                return (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl hover:bg-sky-900/15 transition-colors">
                    <div className="relative flex-shrink-0">
                      <img
                        src={user.profilePic || assets.avatar_icon}
                        alt=""
                        className={`w-8 h-8 object-cover rounded-full border border-sky-700/30 transition-all ${
                          speaking ? "ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse" : ""
                        }`}
                      />
                      {speaking ? (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border border-[#070e1f] rounded-full animate-ping" />
                      ) : inVoice ? (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-[#070e1f] rounded-full" />
                      ) : isOnline ? (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border border-[#070e1f] rounded-full" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-white truncate">{user.gamerTag || user.fullName || "Unknown"}</span>
                        {ROLE_BADGE[member.role] && <span className="text-[10px]">{ROLE_BADGE[member.role]}</span>}
                        {isMe && <span className="text-[9px] text-sky-400/40">(you)</span>}
                      </div>
                      <div className="flex items-center gap-1 text-[9px]">
                        <span className={`${inVoice ? "text-emerald-400 font-medium" : isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                          {inVoice ? (speaking ? "● Speaking" : muted ? "● Muted" : deafened ? "● Deafened" : "● In Voice") : isOnline ? "● Online" : "○ Offline"}
                        </span>
                        {inVoice && (
                          <span className="text-[10px] ml-0.5">
                            {deafened ? "🎧❌" : muted ? "🔇" : "🎙️"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Volume slider for remote voice peers */}
                    {inVoice && !isMe && (
                      <div className="flex items-center gap-1 flex-shrink-0" title={`Volume: ${Math.round(currentVol * 100)}%`}>
                        <span className="text-[9px] text-sky-400/50">🔊</span>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.05"
                          value={currentVol}
                          onChange={(e) => setParticipantVolume(uid.toString(), parseFloat(e.target.value))}
                          className="w-12 accent-sky-400 h-1 cursor-pointer bg-sky-950"
                        />
                      </div>
                    )}

                    {isLeader && !isMe && (
                      <button
                        onClick={() => kickFromParty(selectedParty._id, uid)}
                        className="text-[10px] text-red-400/40 hover:text-red-300 cursor-pointer p-1 rounded hover:bg-red-900/20 transition-colors flex-shrink-0"
                        title="Kick"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared media */}
          <div>
            <SectionTitle>Shared Media ({partyMedia.length})</SectionTitle>
            {partyMedia.length === 0 ? (
              <p className="text-[11px] text-sky-300/25 italic text-center py-4">No media shared yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {partyMedia.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => window.open(url, "_blank")}
                    className="cursor-pointer rounded-xl overflow-hidden aspect-square border border-sky-800/30 hover:border-sky-400/50 hover:scale-105 transition-all shadow-md"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Party Actions */}
          <div className="pt-2 border-t border-sky-900/20 space-y-2">
            {!showInvite ? (
              <button
                onClick={() => setShowInvite(true)}
                className="w-full text-xs px-3 py-2.5 bg-gradient-to-r from-purple-600/30 to-sky-600/30 hover:from-purple-600/50 hover:to-sky-600/50 border border-purple-500/40 text-purple-100 rounded-xl cursor-pointer transition-all font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 hover-lift"
              >
                <span>➕</span>
                <span>Invite Player</span>
              </button>
            ) : (
              <div className="flex gap-1.5 animate-scale-in">
                <input
                  type="text"
                  value={inviteTag}
                  onChange={e => setInviteTag(e.target.value)}
                  placeholder="GamerTag#1234"
                  autoFocus
                  className="flex-1 text-[11px] bg-[#0e274a]/80 border border-sky-800/40 rounded-xl px-3 py-2 text-white placeholder-sky-300/25 outline-none focus:border-sky-400/60 transition-colors"
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                />
                <button onClick={handleInvite} className="text-[11px] bg-sky-600/40 hover:bg-sky-600/60 text-sky-200 px-3 py-2 rounded-xl cursor-pointer transition-colors font-semibold">Send</button>
                <button onClick={() => setShowInvite(false)} className="text-[11px] text-sky-400/40 hover:text-sky-300 px-2 cursor-pointer">✕</button>
              </div>
            )}

            <button
              onClick={() => leaveParty(selectedParty._id)}
              className="w-full text-xs py-2 px-3 bg-slate-800/40 hover:bg-slate-700/50 border border-slate-700/40 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 font-medium"
            >
              <span>🚪</span>
              <span>Leave Party</span>
            </button>

            {isLeader && (
              <button
                onClick={() => { if (window.confirm("Disband this party? This cannot be undone.")) disbandParty(selectedParty._id); }}
                className="w-full text-xs py-2 px-3 bg-rose-950/25 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 hover:text-rose-100 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 font-medium"
              >
                <span>💥</span>
                <span>Disband Party</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* DM MODE                                                                */
  /* ═══════════════════════════════════════════════════════════════════════ */
  if (!selectedUser) return null;

  const isOnline   = onlineUsers.includes(selectedUser._id);
  const sharedMedia = messages.filter(m => m.image).map(m => m.image);
  const isFriend   = authUser?.friends?.includes(selectedUser._id);
  const rankColor  = selectedUser.rank?.tier ? (RANK_COLOR[selectedUser.rank.tier] || null) : null;

  const handleAddFriend = async () => {
    if (!selectedUser.gamerTag) return;
    await sendFriendRequest(selectedUser.gamerTag);
  };

  const handleReport = async () => {
    if (!reportReason) return;
    await reportUser(selectedUser._id, reportReason);
    setReportOpen(false); setReportReason("");
  };

  return (
    <div className="bg-[#070e1f]/95 border-l border-sky-900/20 text-white w-full h-full min-h-0 flex flex-col overflow-hidden max-md:hidden animate-slide-right">
      {/* ── Single Unified Scroll Container (entire profile scrolls cleanly) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-4">

        {/* ── Avatar & Identity ──────────────────────────────────────────── */}
        <div className="pt-2 pb-4 flex flex-col items-center gap-2.5 text-center border-b border-sky-900/20">
          <div className="relative">
            <img
              src={selectedUser?.profilePic || assets.avatar_icon}
              alt=""
              className="w-16 h-16 object-cover rounded-full border-2 border-sky-400/40 shadow-xl shadow-sky-500/10"
            />
            {isOnline && (
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#070e1f] rounded-full online-dot" />
            )}
            {selectedUser.isStreamer && (
              <span className="absolute -top-1 -right-1 text-sm" title="Streamer">📺</span>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">{selectedUser.fullName}</h2>
            {selectedUser.gamerTag && (
              <p className="text-xs font-mono text-sky-400 mt-0.5">{selectedUser.gamerTag}</p>
            )}
          </div>

          {/* Custom status */}
          {selectedUser.customStatus?.text && (
            <p className="text-[11px] text-sky-200/55 italic bg-sky-950/40 px-3 py-1.5 rounded-full border border-sky-900/30 max-w-full truncate">
              {selectedUser.customStatus.text}
            </p>
          )}

          {/* Online status */}
          <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border ${
            isOnline
              ? "text-emerald-300 border-emerald-700/40 bg-emerald-900/15"
              : "text-slate-400 border-slate-700/40 bg-slate-900/15"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-500"}`} />
            {isOnline ? "Online" : "Offline"}
          </div>

          {/* Add friend */}
          <div className="flex flex-col gap-2 w-full px-2">
            {!isFriend && (
              <button
                onClick={handleAddFriend}
                className="w-full text-xs px-4 py-1.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white rounded-full cursor-pointer shadow-md shadow-sky-600/20 transition-all press-active font-medium"
              >
                👥 Add Friend
              </button>
            )}
            {isFriend && (
              <span className="text-[11px] text-center text-emerald-400/70 bg-emerald-900/15 border border-emerald-800/30 px-3 py-1 rounded-full">
                ✓ Friends
              </span>
            )}

            {/* Honor Endorsement CTA */}
            {selectedUser._id !== authUser?._id && (
              <button
                onClick={() => setEndorseModalOpen(true)}
                className="w-full text-xs font-bold py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition shadow-sm"
              >
                🌟 Award Honor (+10 Rep)
              </button>
            )}
          </div>
        </div>

        {/* ── Player Reputation & Honor Badges Card ────────────────────── */}
        <div className="bg-gradient-to-br from-amber-950/20 to-slate-950/40 border border-amber-500/25 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <SectionTitle>Player Reputation</SectionTitle>
            <span className="text-xs font-bold text-amber-400">
              ⭐ {selectedUser.reputationScore || 0} Rep
            </span>
          </div>

          {/* Honor breakdown */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-slate-900/70 border border-slate-800 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-emerald-400">🤝 Friendly</span>
              <span className="font-mono font-bold text-white">{selectedUser.endorsements?.friendly || 0}</span>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-blue-400">🧠 Shot Caller</span>
              <span className="font-mono font-bold text-white">{selectedUser.endorsements?.shotCaller || 0}</span>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-purple-400">🎙️ Comms</span>
              <span className="font-mono font-bold text-white">{selectedUser.endorsements?.greatComms || 0}</span>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-amber-400">🛡️ Tilt-Proof</span>
              <span className="font-mono font-bold text-white">{selectedUser.endorsements?.tiltProof || 0}</span>
            </div>
          </div>

          {/* Achievements */}
          {(selectedUser.achievements || []).length > 0 && (
            <div className="pt-1.5 border-t border-slate-800/80">
              <p className="text-[10px] text-amber-400/80 mb-1 font-semibold">Achievements Unlocked</p>
              <div className="flex flex-wrap gap-1">
                {selectedUser.achievements.map((ach) => (
                  <span key={ach} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                    🏆 {ach}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Gaming Profile Card ────────────────────────────────────────── */}
        {(selectedUser.primaryGame || selectedUser.rank?.tier || selectedUser.region || selectedUser.micEnabled !== undefined) && (
          <div className="bg-sky-950/25 border border-sky-900/25 rounded-2xl p-3 space-y-2">
            <SectionTitle>Gaming Profile</SectionTitle>
            {selectedUser.primaryGame && (
              <InfoRow label="Main Game" value={`🎮 ${selectedUser.primaryGame}`} />
            )}
            {selectedUser.rank?.tier && selectedUser.rank.tier !== "Unranked" && (
              <InfoRow
                label="Rank"
                value={`${selectedUser.rank.tier} ${selectedUser.rank.division || ""}`}
                valueStyle={{ color: rankColor }}
              />
            )}
            {selectedUser.region && <InfoRow label="Region" value={`🌍 ${selectedUser.region}`} />}
            {selectedUser.micEnabled !== undefined && (
              <InfoRow label="Mic" value={selectedUser.micEnabled ? "🎤 Ready" : "🔇 No Mic"} />
            )}

            {/* Platforms */}
            {(selectedUser.platforms || []).length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] text-sky-300/50 mb-1.5">Platforms</p>
                <div className="flex flex-wrap gap-1">
                  {selectedUser.platforms.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 bg-sky-900/50 border border-sky-800/30 rounded-lg text-sky-200">
                      {PLATFORM_ICONS[p]} {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Play style */}
            {(selectedUser.playStyle || []).length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] text-sky-300/50 mb-1.5">Play Style</p>
                <div className="flex flex-wrap gap-1">
                  {selectedUser.playStyle.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 bg-emerald-900/25 border border-emerald-800/25 rounded-lg text-emerald-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Bio Card ──────────────────────────────────────────────────── */}
        {selectedUser.bio && (
          <div className="bg-sky-950/20 border border-sky-900/20 rounded-2xl p-3">
            <SectionTitle>Bio</SectionTitle>
            <p className="text-[11px] text-sky-200/65 leading-relaxed">{selectedUser.bio}</p>
          </div>
        )}

        {/* ── Social Links ──────────────────────────────────────────────── */}
        {selectedUser.socialLinks && Object.values(selectedUser.socialLinks).some(Boolean) && (
          <div className="bg-sky-950/20 border border-sky-900/20 rounded-2xl p-3">
            <SectionTitle>Socials</SectionTitle>
            <div className="space-y-1.5">
              {selectedUser.socialLinks.twitch && (
                <a href={`https://twitch.tv/${selectedUser.socialLinks.twitch}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-[11px] text-purple-300 hover:text-purple-200 transition-colors">
                  🟣 {selectedUser.socialLinks.twitch}
                </a>
              )}
              {selectedUser.socialLinks.youtube && (
                <a href={`https://youtube.com/${selectedUser.socialLinks.youtube}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-[11px] text-red-300 hover:text-red-200 transition-colors">
                  🔴 {selectedUser.socialLinks.youtube}
                </a>
              )}
              {selectedUser.socialLinks.steam && (
                <p className="flex items-center gap-2 text-[11px] text-sky-300">⚙️ {selectedUser.socialLinks.steam}</p>
              )}
              {selectedUser.socialLinks.discord && (
                <p className="flex items-center gap-2 text-[11px] text-indigo-300">💙 {selectedUser.socialLinks.discord}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Shared Media ──────────────────────────────────────────────── */}
        <div>
          <SectionTitle>Shared Media ({sharedMedia.length})</SectionTitle>
          {sharedMedia.length === 0 ? (
            <p className="text-[11px] text-sky-300/25 italic text-center py-3">No media shared yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {sharedMedia.map((url, i) => (
                <div
                  key={i}
                  onClick={() => window.open(url, "_blank")}
                  className="cursor-pointer rounded-xl overflow-hidden aspect-square border border-sky-800/30 hover:border-sky-400/50 hover:scale-105 transition-all shadow-md"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer Actions (Inside scroll so reachable on all screen heights) ── */}
        <div className="pt-2 border-t border-sky-900/20 space-y-2">
          {selectedUser._id !== authUser?._id && (
            <button
              onClick={() => setReportModalOpen(true)}
              className="w-full text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors text-center"
            >
              🚩 Report Player Violation
            </button>
          )}
        </div>

      </div>

      {/* Honor Endorsement Modal */}
      <EndorsePlayerModal
        isOpen={endorseModalOpen}
        onClose={() => setEndorseModalOpen(false)}
        targetUser={selectedUser}
      />

      {/* Conduct Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetUser={selectedUser}
        targetType="user"
        targetId={selectedUser._id}
      />
    </div>
  );
};

export default RightSidebar;