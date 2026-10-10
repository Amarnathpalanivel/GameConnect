import React, { useState, useEffect } from "react";
import axios from "axios";

const CATEGORIES = [
  { id: "all", label: "🔥 All", emoji: "🔥" },
  { id: "gg", label: "🤝 GG", emoji: "🤝" },
  { id: "clutch", label: "⚡ Clutch", emoji: "⚡" },
  { id: "victory", label: "🏆 Victory", emoji: "🏆" },
  { id: "rage", label: "💥 Rage", emoji: "💥" },
  { id: "hype", label: "🚀 Hype", emoji: "🚀" },
  { id: "laugh", label: "😂 LOL", emoji: "😂" },
  { id: "facepalm", label: "🤦 Fail", emoji: "🤦" },
  { id: "rip", label: "⚰️ RIP", emoji: "⚰️" },
  { id: "taunt", label: "🕺 Taunt", emoji: "🕺" },
];

export default function GifPickerModal({ isOpen, onClose, onSelectGif }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchGifs = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/media/gifs", {
          params: { q: search, category: selectedCategory },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data?.success) {
          setGifs(res.data.gifs || []);
        }
      } catch (err) {
        console.error("Failed to fetch GIFs:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchGifs, 250);
    return () => clearTimeout(debounce);
  }, [isOpen, search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-sky-500/30 rounded-2xl shadow-2xl p-5 flex flex-col max-h-[85vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <h3 className="font-bold text-lg text-sky-400">Gaming GIF Express</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative">
          <input
            type="text"
            placeholder="Search hype, clutch, victory, rage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2 text-sm text-sky-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 transition"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="flex gap-1.5 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-sky-500 text-white shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* GIF Grid */}
        <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm animate-pulse">
              Loading gaming reactions...
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
              <span className="text-3xl mb-2">👾</span>
              <p>No gaming GIFs found matching "{search}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {gifs.map((gif) => (
                <div
                  key={gif.id}
                  onClick={() => {
                    onSelectGif(gif.url);
                    onClose();
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-400 transition hover:scale-[1.02] shadow-md"
                >
                  <img
                    src={gif.previewUrl || gif.url}
                    alt={gif.title}
                    className="w-full h-32 object-cover transition duration-200 group-hover:brightness-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                    <p className="text-[11px] font-medium text-white truncate w-full">
                      {gif.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Click any GIF to instantly share with squad</span>
          <span className="text-sky-500 font-mono">GameConnect CDN</span>
        </div>
      </div>
    </div>
  );
}
