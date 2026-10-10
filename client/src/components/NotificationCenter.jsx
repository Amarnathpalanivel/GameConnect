import React, { useContext, useState, useRef, useEffect } from "react";
import { ChatContext } from "../../context/ChatContext";

const NOTIF_ICONS = {
  lfg_join: { icon: "🎮", bg: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  lfg_leave: { icon: "🚪", bg: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  lfg_full: { icon: "🔥", bg: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  session_reminder: { icon: "⏰", bg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  party_invite: { icon: "🎉", bg: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  friend_request: { icon: "👥", bg: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  friend_accepted: { icon: "✨", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  system: { icon: "📢", bg: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const NotificationCenter = () => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    setSelectedParty,
    parties,
  } = useContext(ChatContext);

  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 70, left: 16, width: 360 });

  const updatePopoverPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popWidth = Math.min(380, window.innerWidth - 32);
      // Align left so it stays cleanly within the viewport
      let left = rect.left - 120;
      if (left < 16) left = 16;
      if (left + popWidth > window.innerWidth - 16) {
        left = window.innerWidth - 16 - popWidth;
      }
      setPopoverPos({
        top: Math.round(rect.bottom + 8),
        left: Math.round(left),
        width: popWidth,
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePopoverPosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Close dropdown on outside click or window resize
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleResize = () => {
      if (isOpen) updatePopoverPosition();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", handleResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const requestDesktopPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const res = await Notification.requestPermission();
      setPermission(res);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markNotificationRead(notif._id);
    }
    // If notification links to a party, auto-select it
    if (notif.data?.partyId) {
      const targetParty = parties.find((p) => p._id === notif.data.partyId);
      if (targetParty) {
        setSelectedParty(targetParty);
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative">
      {/* ── Bell Icon Button ─────────────────────────────────────────────── */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-sky-900/40 border border-sky-800/30 text-sky-200 hover:text-white transition-all duration-200 cursor-pointer"
        title="In-App Notification Center"
      >
        <svg
          className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] text-[10px] font-black bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/50 animate-pulse">
            {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* ── Glassmorphism Dropdown Panel (Fixed Positioning to Prevent Overflow Clipping) ──── */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            width: `${popoverPos.width}px`,
            maxHeight: "calc(100vh - 120px)",
          }}
          className="flex flex-col bg-[#071326]/95 backdrop-blur-2xl border border-sky-500/40 rounded-2xl shadow-2xl shadow-black/90 z-50 overflow-hidden animate-fadeIn ring-1 ring-sky-400/20"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-sky-900/40 bg-sky-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <h3 className="font-bold text-sm text-sky-100 tracking-wide">Notifications</h3>
              {unreadNotificationCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-full">
                  {unreadNotificationCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="px-2 py-1 text-[11px] font-medium text-sky-300 hover:text-white bg-sky-900/30 hover:bg-sky-800/50 rounded-lg border border-sky-700/30 transition-colors"
                  title="Mark all as read"
                >
                  ✓✓ Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-300 bg-slate-800/40 hover:bg-rose-950/40 rounded-lg border border-slate-700/30 transition-colors"
                  title="Clear all notifications"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Desktop Push Notification Banner (if not yet granted) */}
          {permission === "default" && (
            <div className="p-2.5 bg-gradient-to-r from-sky-950/60 to-blue-900/40 border-b border-sky-800/30 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-300">Enable desktop alerts for squad invites</span>
              <button
                type="button"
                onClick={requestDesktopPermission}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-[11px] transition-colors"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-sky-950/60 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <span className="text-3xl opacity-40 mb-2">📭</span>
                <p className="text-xs text-slate-400 font-medium">All caught up!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  LFG squad joins, session reminders, and party invites appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const iconConf = NOTIF_ICONS[notif.type] || NOTIF_ICONS.system;
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 flex items-start gap-3 cursor-pointer transition-colors group ${
                      notif.isRead
                        ? "bg-transparent hover:bg-sky-950/30 opacity-75"
                        : "bg-sky-950/40 hover:bg-sky-900/40"
                    }`}
                  >
                    {/* Badge Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border flex-shrink-0 ${iconConf.bg}`}
                    >
                      {iconConf.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs font-semibold truncate ${
                            notif.isRead ? "text-slate-300" : "text-sky-200"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300/80 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread indicator dot & delete action */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 text-xs transition-opacity p-0.5"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
