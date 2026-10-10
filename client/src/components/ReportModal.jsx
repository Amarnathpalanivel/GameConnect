import React, { useState } from "react";
import axios from "axios";

const REPORT_REASONS = [
  { id: "harassment", label: "🚫 Harassment / Bullying" },
  { id: "toxic", label: "🤬 Severe Toxicity / Hate Speech" },
  { id: "cheating", label: "⚡ Cheating / Exploiting / Hacking" },
  { id: "spam", label: "📢 Spam / Bot Activity / Phishing" },
  { id: "nsfw", label: "🔞 Inappropriate / NSFW Media" },
  { id: "other", label: "⚠️ Other Unsportsmanlike Conduct" },
];

export default function ReportModal({ isOpen, onClose, targetUser, targetType = "user", targetId = "" }) {
  const [reason, setReason] = useState("toxic");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || !targetUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/moderation/report",
        {
          reportedUserId: targetUser._id,
          targetType,
          targetId: targetId || targetUser._id,
          reason,
          detail,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setDetail("");
          onClose();
        }, 1600);
      } else {
        setErrorMessage(res.data?.message || "Failed to submit report");
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-rose-500/40 rounded-2xl shadow-2xl p-6 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h3 className="font-bold text-lg text-rose-400">Report Conduct Violation</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <span className="text-4xl">✅</span>
            <h4 className="font-bold text-emerald-400">Report Submitted</h4>
            <p className="text-xs text-slate-300">
              Our safety moderation team and auto-mod filters will review this player's activity.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <img
                src={targetUser.profilePic || "https://api.dicebear.com/7.x/bottts/svg?seed=gamer"}
                alt=""
                className="w-10 h-10 rounded-full border border-slate-700 object-cover"
              />
              <div>
                <p className="text-xs text-slate-400">Reporting player:</p>
                <p className="text-sm font-bold text-rose-300">{targetUser.gamerTag || targetUser.fullName}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Violation Category</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Additional Context (Optional)</label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Describe what occurred during the match or in chat..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {errorMessage}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
