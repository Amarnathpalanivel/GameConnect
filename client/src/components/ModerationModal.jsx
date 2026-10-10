import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ModerationModal({ isOpen, onClose }) {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchReportsAndStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [reportsRes, statsRes] = await Promise.all([
        axios.get("http://localhost:5000/api/moderation/reports", {
          params: { status: filter === "all" ? undefined : filter },
          headers,
        }),
        axios.get("http://localhost:5000/api/moderation/stats", { headers }),
      ]);

      if (reportsRes.data?.success) setReports(reportsRes.data.reports || []);
      if (statsRes.data?.success) setStats(statsRes.data.stats || null);
    } catch (err) {
      console.error("Failed to fetch moderation queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchReportsAndStats();
  }, [isOpen, filter]);

  const handleAction = async (reportId, action) => {
    setActionLoading(reportId);
    setFeedback(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5000/api/moderation/reports/${reportId}/action`,
        { action, adminNotes: `Action executed via safety console: ${action}` },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        setFeedback({ type: "success", text: res.data.message });
        fetchReportsAndStats();
      } else {
        setFeedback({ type: "error", text: res.data?.message || "Action failed" });
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl p-6 text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <h3 className="font-bold text-lg text-rose-400">GameConnect Safety & Moderation Console</h3>
              <p className="text-xs text-slate-400">Review flagged players, auto-mod violations, and manage trust & safety</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Stats Strip */}
        {stats && (
          <div className="grid grid-cols-4 gap-2.5 mt-4">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400">Total Reports</span>
              <p className="text-lg font-bold text-sky-400">{stats.totalReports}</p>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-rose-500/20 text-center">
              <span className="text-xs text-rose-300">Pending Flags</span>
              <p className="text-lg font-bold text-rose-400">{stats.pendingReports}</p>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-amber-500/20 text-center">
              <span className="text-xs text-amber-300">Warned Players</span>
              <p className="text-lg font-bold text-amber-400">{stats.warnedUsers}</p>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-purple-500/20 text-center">
              <span className="text-xs text-purple-300">Banned Accounts</span>
              <p className="text-lg font-bold text-purple-400">{stats.totalBanned}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            {["pending", "resolved", "dismissed", "all"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  filter === status
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <button
            onClick={fetchReportsAndStats}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`mt-2 p-2 rounded-lg text-xs text-center font-medium ${
              feedback.type === "success"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Reports Queue List */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm animate-pulse">
              Scanning safety queue...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <span className="text-3xl block mb-2">🎉</span>
              No {filter} reports in queue. The community is clean!
            </div>
          ) : (
            reports.map((r) => {
              const reported = r.reportedUserId || {};
              const reporter = r.reporterId || {};
              return (
                <div
                  key={r._id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col gap-3 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={reported.profilePic || "https://api.dicebear.com/7.x/bottts/svg?seed=reported"}
                        alt=""
                        className="w-10 h-10 rounded-full border border-rose-500/50 object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-rose-300">
                            {reported.gamerTag || reported.fullName || "Unknown User"}
                          </h4>
                          {reported.isBanned && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/30 text-rose-400">
                              BANNED
                            </span>
                          )}
                          <span className="text-[10px] text-amber-400 font-mono">
                            Warnings: {reported.warnings || 0}/3
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Reported by: <span className="text-sky-300">{reporter.gamerTag || reporter.fullName}</span> • Reason:{" "}
                          <span className="text-rose-400 font-semibold uppercase">{r.reason}</span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        r.status === "pending"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : r.status === "resolved"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  {/* Context detail */}
                  {r.detail && (
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300 italic">
                      "{r.detail}"
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-[11px] text-slate-500">
                      Reported: {new Date(r.createdAt).toLocaleDateString()} at{" "}
                      {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(r._id, "dismiss")}
                        disabled={actionLoading === r._id}
                        className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleAction(r._id, "warn")}
                        disabled={actionLoading === r._id}
                        className="px-2.5 py-1 rounded-lg text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition font-semibold"
                      >
                        ⚠️ Warn (+1 Strike)
                      </button>
                      {reported.isBanned ? (
                        <button
                          onClick={() => handleAction(r._id, "unban")}
                          disabled={actionLoading === r._id}
                          className="px-2.5 py-1 rounded-lg text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 transition font-semibold"
                        >
                          Lift Ban
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(r._id, "ban")}
                          disabled={actionLoading === r._id}
                          className="px-2.5 py-1 rounded-lg text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 transition font-semibold"
                        >
                          🔨 Ban (7 Days)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
