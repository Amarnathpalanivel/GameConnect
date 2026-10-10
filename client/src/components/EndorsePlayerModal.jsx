import React, { useState } from "react";
import axios from "axios";

const ENDORSEMENT_OPTIONS = [
  {
    id: "friendly",
    icon: "🤝",
    title: "Friendly & Supportive",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400",
    desc: "Great attitude, encouraged teammates, brought positive vibes to the match.",
  },
  {
    id: "shotCaller",
    icon: "🧠",
    title: "Shot Caller & Leader",
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-400",
    desc: "Clutch game sense, strategic ping calls, orchestrated team winning rotations.",
  },
  {
    id: "greatComms",
    icon: "🎙️",
    title: "Great Comms & Callouts",
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-400",
    desc: "Clear, crisp voice comms without noise or clutter. Pinged enemy locations.",
  },
  {
    id: "tiltProof",
    icon: "🛡️",
    title: "Tilt-Proof & Resilient",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400",
    desc: "Never raged, stayed focused when down, fought hard until the final round.",
  },
];

export default function EndorsePlayerModal({ isOpen, onClose, targetUser, onEndorsementSuccess }) {
  const [selectedCategory, setSelectedCategory] = useState("friendly");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen || !targetUser) return null;

  const handleEndorse = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `http://localhost:5000/api/auth/users/${targetUser._id}/endorse`,
        { category: selectedCategory },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        setStatusMessage({ type: "success", text: res.data.message });
        if (onEndorsementSuccess) onEndorsementSuccess(res.data);
        setTimeout(() => {
          onClose();
          setStatusMessage(null);
        }, 1500);
      } else {
        setStatusMessage({ type: "error", text: res.data?.message || "Failed to endorse player" });
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.response?.data?.message || err.message || "Failed to endorse player",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl p-6 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <h3 className="font-bold text-lg text-amber-400">Player Honor Endorsement</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Player Profile Snapshot */}
        <div className="mt-4 flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <img
            src={targetUser.profilePic || "https://api.dicebear.com/7.x/bottts/svg?seed=gamer"}
            alt={targetUser.gamerTag}
            className="w-12 h-12 rounded-full border border-sky-400 object-cover"
          />
          <div>
            <h4 className="font-bold text-sky-300 text-sm">{targetUser.gamerTag || targetUser.fullName}</h4>
            <p className="text-xs text-slate-400">
              Current Rep: <span className="text-amber-400 font-semibold">{targetUser.reputationScore || 0} pts</span>
            </p>
          </div>
        </div>

        {/* Category Cards */}
        <div className="mt-4 space-y-2">
          {ENDORSEMENT_OPTIONS.map((opt) => {
            const isSelected = selectedCategory === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedCategory(opt.id)}
                className={`cursor-pointer p-3 rounded-xl border transition flex items-start gap-3 bg-gradient-to-r ${
                  isSelected
                    ? `${opt.color} ring-1 ring-amber-400/50 shadow-md`
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <span className="text-2xl mt-0.5">{opt.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold">{opt.title}</h5>
                    <span className="text-[11px] font-mono font-semibold text-amber-400">+10 Rep</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-medium text-center ${
              statusMessage.type === "success"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleEndorse}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            {loading ? "Endorsing..." : "Award Honor (+10 Rep)"}
          </button>
        </div>
      </div>
    </div>
  );
}
