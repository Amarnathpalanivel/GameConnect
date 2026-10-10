import React, { useEffect, useRef, useState, useContext, useCallback } from 'react'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utils'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'
import { VoiceContext } from '../../context/VoiceContext'
import GifPickerModal from './GifPickerModal'
import toast from 'react-hot-toast'

const RANK_COLOR = {
  Iron:"#a8a9ad", Bronze:"#cd7f32", Silver:"#c0c0c0", Gold:"#ffd700",
  Platinum:"#00b4d8", Diamond:"#b9f2ff", Master:"#9b59b6",
  Grandmaster:"#e74c3c", Challenger:"#f1c40f",
};
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "👎"];

/* ── Typing dots ───────────────────────────────────────────────────────── */
const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3 bg-[#0c2242] border border-sky-800/30 rounded-2xl rounded-bl-none w-fit">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="typing-dot w-1.5 h-1.5 bg-sky-400/80 rounded-full"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

/* ── Empty state when no chat is selected ────────────────────────────────── */
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8 animate-fade-in max-md:hidden">
    {/* Logo */}
    <div className="relative">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/20 flex items-center justify-center">
        <img
          src={assets.logo_icon}
          alt="GameConnect"
          className="w-10 opacity-80 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]"
        />
      </div>
      {/* Floating dots */}
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0a182e] online-dot" />
    </div>

    <div>
      <h2 className="text-xl font-bold text-white mb-1.5">Chat anytime, anywhere</h2>
      <p className="text-sm text-sky-300/50 leading-relaxed max-w-xs">
        Select a player from the sidebar to start chatting, or join a party to play together.
      </p>
    </div>

    {/* Feature hints */}
    <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
      {[
        { icon: "💬", text: "Real-time DMs" },
        { icon: "🎉", text: "Party Chat" },
        { icon: "🖼️", text: "Share Images" },
        { icon: "⚡", text: "Reactions" },
      ].map(f => (
        <div
          key={f.text}
          className="flex items-center gap-2 px-3 py-2 bg-sky-950/30 border border-sky-900/30 rounded-xl"
        >
          <span className="text-base">{f.icon}</span>
          <span className="text-[11px] text-sky-300/60">{f.text}</span>
        </div>
      ))}
    </div>
  </div>
);

const ChatContainer = () => {
  const {
    messages, sendMessage, isSendingMessage, isMessagesLoading,
    selectedUser, setSelectedUser,
    isTyping, emitTypingStart, emitTypingStop,
    replyingTo, setReplyingTo,
    editingMessage, setEditingMessage,
    reactToMessage, editMessage, deleteMessage,
    selectedParty, setSelectedParty,
    partyMessages, isPartyMessagesLoading,
    sendPartyMessage, partyTypingUsers,
    emitPartyTypingStart, emitPartyTypingStop,
  } = useContext(ChatContext);
  const { authUser, onlineUsers } = useContext(AuthContext);
  const { isInVoice, currentVoicePartyId, partyVoiceRosters, joinVoice, leaveVoice } = useContext(VoiceContext);

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const fileInputRef = useRef(null);
  const scrollEnd = useRef(null);
  const typingStopTimer = useRef(null);
  const inputRef = useRef(null);

  const isPartyMode = !!selectedParty;
  const currentMessages = isPartyMode ? partyMessages : messages;
  const isLoading = isPartyMode ? isPartyMessagesLoading : isMessagesLoading;
  const isOnline = !isPartyMode && onlineUsers.includes(selectedUser?._id);
  const rankColor = !isPartyMode && selectedUser?.rank?.tier ? (RANK_COLOR[selectedUser.rank.tier] || null) : null;

  // Auto-scroll
  useEffect(() => {
    scrollEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Close context menu
  useEffect(() => {
    const h = () => setContextMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  // Populate input on edit
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (editingMessage) {
      if (!text.trim()) return;
      await editMessage(editingMessage._id, text.trim());
      setText(""); setEditingMessage(null);
      return;
    }
    if (!text.trim() && !imagePreview) return;
    if (isSendingMessage) return;

    const payload = { text: text.trim(), image: imagePreview };
    setText(""); removeImage();
    isPartyMode ? await sendPartyMessage(payload) : await sendMessage(payload);
  };

  const handleSendGif = async (gifUrl) => {
    if (!gifUrl || isSendingMessage) return;
    const payload = { text: "", gifUrl, messageType: "gif" };
    isPartyMode ? await sendPartyMessage(payload) : await sendMessage(payload);
  };

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    if (isPartyMode) {
      emitPartyTypingStart();
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = setTimeout(() => emitPartyTypingStop(), 2500);
    } else {
      emitTypingStart();
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = setTimeout(() => emitTypingStop(), 2500);
    }
  }, [emitTypingStart, emitTypingStop, emitPartyTypingStart, emitPartyTypingStop, isPartyMode]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    if (e.key === "Escape") {
      if (editingMessage) { setEditingMessage(null); setText(""); }
      if (replyingTo) setReplyingTo(null);
    }
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({ msgId: msg._id, x: e.clientX, y: e.clientY, msg });
  };

  const copyText = (t) => {
    navigator.clipboard.writeText(t);
    toast.success("Copied!", { duration: 1500, icon: "📋" });
    setContextMenu(null);
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "box-shadow 0.3s";
      el.style.boxShadow = "0 0 0 2px rgba(56,189,248,0.5)";
      setTimeout(() => { el.style.boxShadow = ""; }, 2000);
    }
  };

  const getSenderInfo = (msg) => {
    if (!isPartyMode) return null;
    const sender = msg.senderId;
    if (typeof sender === "object") return { name: sender.gamerTag || sender.fullName, pic: sender.profilePic };
    const member = selectedParty?.members?.find(m => {
      const uid = m.userId?._id || m.userId;
      return uid?.toString() === sender?.toString();
    });
    return { name: member?.userId?.gamerTag || member?.userId?.fullName || "Unknown", pic: member?.userId?.profilePic || "" };
  };

  /* ── Empty state ── */
  if (!selectedUser && !selectedParty) return <EmptyState />;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden relative bg-[#071326]/50">

      {/* ── Chat Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 py-3 px-4 border-b border-sky-900/20 bg-[#0a1b33]/50 flex-shrink-0">
        {isPartyMode ? (
          <>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-lg shadow-md flex-shrink-0">
              🎉
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate">{selectedParty.name}</p>
                <span className="text-[10px] text-sky-300/50 bg-sky-900/30 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {selectedParty.members?.length || 0}/{selectedParty.maxPlayers}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {selectedParty.game && <span className="text-[11px] text-sky-300/55">🎮 {selectedParty.game}</span>}
                <button
                  className="text-[10px] text-sky-300/40 hover:text-sky-200 cursor-pointer transition-colors flex items-center gap-1"
                  onClick={() => { navigator.clipboard.writeText(selectedParty.inviteCode); toast.success("Invite code copied!"); }}
                >
                  📋 {selectedParty.inviteCode}
                </button>
              </div>
            </div>

            {/* Voice Channel CTA */}
            {(() => {
              const isCurrentPartyInVoice = isInVoice && currentVoicePartyId === selectedParty._id;
              const liveCount = partyVoiceRosters[selectedParty._id]?.count || (isCurrentPartyInVoice ? 1 : 0);

              if (isCurrentPartyInVoice) {
                return (
                  <button
                    onClick={leaveVoice}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-red-500/25 text-emerald-300 hover:text-red-300 border border-emerald-500/40 hover:border-red-500/40 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-[0_0_12px_rgba(52,211,153,0.25)] group flex-shrink-0"
                    title="Click to disconnect from voice"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-red-400 animate-pulse" />
                    <span>In Voice</span>
                    <span className="hidden sm:inline text-[10px] opacity-75">(Leave)</span>
                  </button>
                );
              }

              return (
                <button
                  onClick={() => joinVoice(selectedParty._id, selectedParty.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/30 hover:bg-sky-500/40 text-sky-200 border border-sky-400/30 hover:border-sky-400/60 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md flex-shrink-0"
                >
                  <span>🎙️ Join Voice</span>
                  {liveCount > 0 && (
                    <span className="text-[10px] bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {liveCount}
                    </span>
                  )}
                </button>
              );
            })()}
          </>
        ) : (
          <>
            <div className="relative flex-shrink-0">
              <img
                src={selectedUser?.profilePic || assets.avatar_icon}
                alt=""
                className="w-10 h-10 object-cover rounded-full border border-sky-600/40"
              />
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0a1b33] rounded-full online-dot" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate">
                  {selectedUser?.gamerTag || selectedUser?.fullName}
                </p>
                {selectedUser?.rank?.tier && selectedUser.rank.tier !== "Unranked" && rankColor && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0"
                    style={{ color: rankColor, borderColor: `${rankColor}40` }}>
                    {selectedUser.rank.tier} {selectedUser.rank.division}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isOnline ? "● Online" : "○ Offline"}
                </span>
                {selectedUser?.primaryGame && (
                  <span className="text-[10px] text-sky-300/40">· 🎮 {selectedUser.primaryGame}</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Back (mobile) */}
        <button
          onClick={() => { setSelectedUser(null); setSelectedParty(null); }}
          className="md:hidden w-8 h-8 rounded-lg hover:bg-sky-900/40 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
        >
          <img src={assets.arrow_icon} alt="Back" className="w-4 opacity-70" />
        </button>
      </div>

      {/* ── Messages Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-sky-500/40 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-xs text-sky-300/50">Loading conversation...</p>
          </div>
        ) : currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4 animate-fade-in my-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-purple-600/20 border border-sky-400/30 flex items-center justify-center text-3xl shadow-xl shadow-sky-950/50">
              {isPartyMode ? "🎉" : "💬"}
            </div>
            <div className="max-w-sm">
              <p className="text-base font-bold text-white tracking-wide">
                {isPartyMode ? "Party Room Active" : "Start Conversation"}
              </p>
              <p className="text-xs text-sky-300/60 mt-1">
                {isPartyMode
                  ? "Say hello to your squad, coordinate strategies, or hop into voice comms!"
                  : "Send your first message or drop an epic gaming GIF!"}
              </p>
            </div>

            {/* Quick Gamer Icebreakers */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md pt-2">
              {(isPartyMode
                ? ["👋 Ready to queue up!", "🎮 What roles are we running?", "🎙️ Comm check!"]
                : ["👋 GG on that last match!", "🔥 Down to duo?", "⚡ Need one for ranked?"]
              ).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setText(chip)}
                  className="px-3 py-1.5 text-xs bg-sky-950/60 hover:bg-sky-800/50 border border-sky-700/30 hover:border-sky-400/50 text-sky-200 rounded-xl cursor-pointer transition-all hover-lift active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          currentMessages.map((msg) => {
            const senderId = typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
            const isMe = senderId === authUser?._id;
            const isDeleted = !!msg.deletedAt;
            const senderInfo = isPartyMode ? getSenderInfo(msg) : null;
            let avatarSrc;
            if (isPartyMode) {
              avatarSrc = isMe ? (authUser?.profilePic || assets.avatar_icon) : (senderInfo?.pic || assets.avatar_icon);
            } else {
              avatarSrc = isMe ? (authUser?.profilePic || assets.avatar_icon) : (selectedUser?.profilePic || assets.avatar_icon);
            }

            return (
              <div
                key={msg._id}
                id={`msg-${msg._id}`}
                className={`flex items-end gap-2 transition-all duration-200 ${isMe ? "justify-end animate-msg-right" : "justify-start animate-msg-left"}`}
                onMouseEnter={() => setHoveredMsgId(msg._id)}
                onMouseLeave={() => setHoveredMsgId(null)}
                onContextMenu={(e) => !isDeleted && handleContextMenu(e, msg)}
              >
                {!isMe && (
                  <img src={avatarSrc} alt="" className="w-7 h-7 object-cover rounded-full self-end mb-1 border border-sky-800/40 flex-shrink-0" />
                )}

                <div className={`flex flex-col max-w-[70%] sm:max-w-[60%] ${isMe ? "items-end" : "items-start"}`}>
                  {/* Party sender name */}
                  {isPartyMode && !isMe && senderInfo && (
                    <span className="text-[10px] text-sky-400/70 font-semibold mb-0.5 px-1">{senderInfo.name}</span>
                  )}

                  {/* Reply preview */}
                  {msg.replyTo && !isDeleted && (
                    <div
                      className="text-[11px] bg-sky-900/25 border-l-2 border-sky-400/50 px-2 py-1 rounded-lg mb-1 cursor-pointer hover:bg-sky-900/40 transition-colors max-w-full"
                      onClick={() => scrollToMessage(msg.replyTo._id || msg.replyTo)}
                    >
                      <span className="text-sky-400/80 font-medium">↩ </span>
                      <span className="text-sky-200/60 truncate block">
                        {msg.replyTo.text ? msg.replyTo.text.substring(0, 60) : "📷 Image"}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  {isDeleted ? (
                    <p className="px-3 py-2 text-sm rounded-2xl italic text-sky-300/35 bg-[#0c2242]/30 border border-sky-900/20">
                      🚫 Message deleted
                    </p>
                  ) : (
                    <>
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Attachment"
                          onClick={() => window.open(msg.image, "_blank")}
                          className="max-w-[220px] max-h-[220px] object-cover rounded-2xl border border-sky-700/40 mb-1 cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                        />
                      )}
                      {msg.gifUrl && (
                        <div className="relative group mb-1">
                          <img
                            src={msg.gifUrl}
                            alt="GIF"
                            onClick={() => window.open(msg.gifUrl, "_blank")}
                            className="max-w-[240px] max-h-[190px] object-cover rounded-2xl border border-sky-400/40 cursor-pointer hover:opacity-95 shadow-lg transition-all"
                          />
                          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 bg-black/70 rounded text-sky-300 backdrop-blur-sm">
                            GIF
                          </span>
                        </div>
                      )}
                      {msg.text && (
                        <p className={`px-4 py-2.5 text-sm rounded-2xl break-words leading-relaxed ${
                          isMe
                            ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-br-sm shadow-md shadow-sky-700/20"
                            : "bg-[#0c2242] text-gray-100 rounded-bl-sm border border-sky-800/30"
                        }`}>
                          {msg.text}
                        </p>
                      )}
                      {msg.linkPreview && (
                        <a
                          href={msg.linkPreview.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 p-2 rounded-xl bg-slate-950/70 border border-sky-800/40 hover:border-sky-400/60 transition max-w-[260px] text-left group"
                        >
                          {msg.linkPreview.image && (
                            <img
                              src={msg.linkPreview.image}
                              alt=""
                              className="w-full h-24 object-cover rounded-lg mb-1"
                            />
                          )}
                          <p className="text-xs font-bold text-sky-300 group-hover:underline truncate">
                            {msg.linkPreview.title}
                          </p>
                          {msg.linkPreview.description && (
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                              {msg.linkPreview.description}
                            </p>
                          )}
                          <span className="text-[9px] text-sky-400/70 font-mono mt-0.5 block">
                            {msg.linkPreview.siteName} ↗
                          </span>
                        </a>
                      )}
                    </>
                  )}

                  {/* Timestamp + edited */}
                  <div className="flex items-center gap-1.5 mt-1 px-1">
                    <span className="text-[10px] text-sky-300/35">{formatMessageTime(msg.createdAt)}</span>
                    {msg.isEdited && !isDeleted && (
                      <span className="text-[9px] text-sky-300/25 italic">(edited)</span>
                    )}
                    {/* Read receipts for own messages */}
                    {isMe && !isDeleted && (
                      <span className="text-[10px] text-sky-400/40">✓✓</span>
                    )}
                  </div>

                  {/* Reactions display */}
                  {!isDeleted && msg.reactions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 px-1">
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})
                      ).map(([emoji, count]) => {
                        const myReaction = msg.reactions.some(
                          r => r.emoji === emoji && (r.userId === authUser?._id || r.userId?._id === authUser?._id)
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={() => reactToMessage(msg._id, emoji)}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all cursor-pointer hover:scale-110 press-active ${
                              myReaction
                                ? "bg-sky-500/20 border-sky-400/50 text-sky-200"
                                : "bg-[#0c2242]/60 border-sky-800/30 text-sky-300/60"
                            }`}
                          >
                            {emoji}<span className="text-[10px]">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick emoji bar on hover */}
                  {hoveredMsgId === msg._id && !isDeleted && (
                    <div className={`flex items-center gap-0.5 mt-1 bg-[#0c2242]/95 border border-sky-800/40 rounded-full px-2 py-1 shadow-xl backdrop-blur-sm animate-scale-in ${isMe ? 'self-end' : 'self-start'}`}>
                      {QUICK_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => reactToMessage(msg._id, emoji)}
                          className="hover:scale-125 transition-transform cursor-pointer text-sm px-0.5 press-active"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                      <span className="w-px h-4 bg-sky-700/40 mx-0.5" />
                      <button
                        onClick={(e) => handleContextMenu(e, msg)}
                        className="text-sky-300/50 hover:text-sky-200 text-xs px-1 cursor-pointer"
                        title="More options"
                      >
                        ⋯
                      </button>
                    </div>
                  )}
                </div>

                {isMe && (
                  <img src={avatarSrc} alt="" className="w-7 h-7 object-cover rounded-full self-end mb-1 border border-sky-700/40 flex-shrink-0" />
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator (DM) */}
        {!isPartyMode && isTyping && (
          <div className="flex items-end gap-2 animate-fade-in">
            <img src={selectedUser?.profilePic || assets.avatar_icon} alt="" className="w-6 h-6 object-cover rounded-full self-end border border-sky-800/40" />
            <TypingDots />
          </div>
        )}

        {/* Typing indicator (Party) */}
        {isPartyMode && partyTypingUsers.length > 0 && (
          <div className="flex items-center gap-2 animate-fade-in">
            <TypingDots />
            <span className="text-[11px] text-sky-300/50">
              {partyTypingUsers.map(u => u.gamerTag).join(", ")} {partyTypingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}

        <div ref={scrollEnd} />

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-[#0c1f3a] border border-sky-700/30 rounded-xl shadow-2xl py-1.5 min-w-[160px] animate-scale-in"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <MenuItem icon="↩️" label="Reply" onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); inputRef.current?.focus(); }} />
            {contextMenu.msg.text && <MenuItem icon="📋" label="Copy Text" onClick={() => copyText(contextMenu.msg.text)} />}
            {(typeof contextMenu.msg.senderId === "object" ? contextMenu.msg.senderId._id : contextMenu.msg.senderId) === authUser?._id && (
              <>
                {contextMenu.msg.text && (
                  <MenuItem icon="✏️" label="Edit" onClick={() => { setEditingMessage(contextMenu.msg); setContextMenu(null); }} />
                )}
                <MenuItem icon="🗑️" label="Delete" danger onClick={() => { deleteMessage(contextMenu.msg._id); setContextMenu(null); }} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Input Area ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 p-3 bg-[#0a1b33]/70 border-t border-sky-900/20">

        {/* Reply strip */}
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-sky-900/25 border-l-2 border-sky-400 rounded-lg animate-fade-in">
            <span className="text-sky-400/80 text-xs font-medium">↩ Replying to</span>
            <span className="text-xs text-sky-200/60 truncate flex-1">
              {replyingTo.text ? replyingTo.text.substring(0, 80) : "📷 Image"}
            </span>
            <button onClick={() => setReplyingTo(null)} className="text-sky-300/50 hover:text-sky-100 cursor-pointer leading-none">✕</button>
          </div>
        )}

        {/* Edit strip */}
        {editingMessage && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-900/20 border-l-2 border-amber-400 rounded-lg animate-fade-in">
            <span className="text-amber-400/80 text-xs font-medium">✏️ Editing</span>
            <span className="text-xs text-amber-200/60 truncate flex-1">
              {editingMessage.text?.substring(0, 80)}
            </span>
            <button onClick={() => { setEditingMessage(null); setText(""); }} className="text-amber-300/50 hover:text-amber-100 cursor-pointer leading-none">✕</button>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div className="relative inline-block mb-2 animate-scale-in">
            <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-xl border-2 border-sky-400/50 shadow-lg" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input row */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#0e274a]/70 px-4 py-2.5 rounded-full border border-sky-800/30 focus-within:border-sky-500/50 focus-within:bg-[#0e274a]/90 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={
                editingMessage ? "Edit your message..." :
                isPartyMode ? `Message ${selectedParty?.name}...` :
                `Message ${selectedUser?.gamerTag || selectedUser?.fullName || ""}...`
              }
              className="flex-1 text-sm bg-transparent border-none outline-none text-white placeholder-sky-300/30"
            />
            {!editingMessage && (
              <>
                <input
                  type="file"
                  id="chat-img-input"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  hidden
                />
                <label
                  htmlFor="chat-img-input"
                  className="cursor-pointer ml-1 opacity-50 hover:opacity-90 transition-opacity"
                  title="Attach image"
                >
                  <img src={assets.gallery_icon} alt="Attach" className="w-5 h-5" />
                </label>
                <button
                  type="button"
                  onClick={() => setIsGifModalOpen(true)}
                  className="ml-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-sky-400 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 transition hover:scale-105 press-active"
                  title="Search & Send Gaming GIF"
                >
                  GIF
                </button>
              </>
            )}
          </div>

          {editingMessage ? (
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={!text.trim()}
                className="cursor-pointer disabled:opacity-40 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full w-9 h-9 flex items-center justify-center text-sm transition-colors press-active"
                title="Save edit"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => { setEditingMessage(null); setText(""); }}
                className="cursor-pointer bg-sky-900/50 hover:bg-sky-900/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSendingMessage || (!text.trim() && !imagePreview)}
              className="cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 press-active"
              title="Send"
            >
              <img src={assets.send_button} alt="Send" className="w-9 h-9" />
            </button>
          )}
        </form>
      </div>

      {/* Gaming GIF Picker Modal */}
      <GifPickerModal
        isOpen={isGifModalOpen}
        onClose={() => setIsGifModalOpen(false)}
        onSelectGif={handleSendGif}
      />
    </div>
  );
};

/* ── Context menu item ───────────────────────────────────────────────────── */
const MenuItem = ({ icon, label, onClick, danger }) => (
  <button
    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 cursor-pointer transition-colors ${
      danger ? "text-red-300/80 hover:bg-red-500/15" : "text-sky-100 hover:bg-sky-500/15"
    }`}
    onClick={onClick}
  >
    <span>{icon}</span> {label}
  </button>
);

export default ChatContainer;