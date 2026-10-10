import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const PLATFORMS   = ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile"];
const REGIONS     = ["NA", "EU", "SEA", "APAC", "SA", "ME", "IN", "OC", "Global"];
const RANK_TIERS  = ["Unranked", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Challenger"];
const PLAYSTYLES  = ["Competitive", "Casual", "Co-op", "Story", "eSports", "Speedrun"];
const POPULAR_GAMES = [
  "Valorant","Fortnite","PUBG","Call of Duty","Apex Legends","League of Legends",
  "Dota 2","CS2","Minecraft","GTA Online","Rocket League","FIFA","NBA 2K",
  "Overwatch 2","Destiny 2","Warzone","Free Fire","BGMI","Among Us","Fall Guys",
  "Rainbow Six Siege","Elden Ring","God of War","Halo","Genshin Impact","Roblox",
];

const PLATFORM_ICONS = {
  PC:         "🖥️",
  PlayStation:"🎮",
  Xbox:       "🟢",
  Nintendo:   "🔴",
  Mobile:     "📱",
};

const GAMING_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=CyberWolf&backgroundColor=0284c7",
  "https://api.dicebear.com/7.x/bottts/svg?seed=ShadowSniper&backgroundColor=7c3aed",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Valkyrie&backgroundColor=db2777",
  "https://api.dicebear.com/7.x/bottts/svg?seed=PixelKnight&backgroundColor=059669",
  "https://api.dicebear.com/7.x/bottts/svg?seed=NeonDragon&backgroundColor=d97706",
  "https://api.dicebear.com/7.x/bottts/svg?seed=QuantumGhost&backgroundColor=dc2626",
];

const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedImg, setSelectedImg] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [activeTab, setActiveTab]     = useState("identity"); // identity | gaming | social
  const [isLoading, setIsLoading]     = useState(false);
  const [gameSearch, setGameSearch]   = useState("");

  // ── Form state mirroring authUser fields ──────────────────────────────────
  const [form, setForm] = useState({
    fullName:     authUser?.fullName     || "",
    gamerTag:     authUser?.gamerTag     || "",
    bio:          authUser?.bio          || "",
    platforms:    authUser?.platforms    || [],
    primaryGame:  authUser?.primaryGame  || "",
    favoriteGames:authUser?.favoriteGames|| [],
    rank: {
      game:     authUser?.rank?.game     || "",
      tier:     authUser?.rank?.tier     || "",
      division: authUser?.rank?.division || "",
    },
    region:       authUser?.region       || "",
    micEnabled:   authUser?.micEnabled   || false,
    isStreamer:   authUser?.isStreamer    || false,
    playStyle:    authUser?.playStyle    || [],
    socialLinks: {
      twitch:  authUser?.socialLinks?.twitch  || "",
      youtube: authUser?.socialLinks?.youtube || "",
      steam:   authUser?.socialLinks?.steam   || "",
      discord: authUser?.socialLinks?.discord || "",
    },
    customStatus: {
      text: authUser?.customStatus?.text || "",
    },
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updateNested = (parent, field, value) =>
    setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));

  const togglePlatform = (p) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const togglePlayStyle = (s) => {
    setForm(prev => ({
      ...prev,
      playStyle: prev.playStyle.includes(s)
        ? prev.playStyle.filter(x => x !== s)
        : [...prev.playStyle, s],
    }));
  };

  const toggleFavoriteGame = (g) => {
    setForm(prev => {
      if (prev.favoriteGames.includes(g))
        return { ...prev, favoriteGames: prev.favoriteGames.filter(x => x !== g) };
      if (prev.favoriteGames.length >= 10) { toast.error("Max 10 games"); return prev; }
      return { ...prev, favoriteGames: [...prev.favoriteGames, g] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { ...form };
      if (selectedImg) {
        const reader = new FileReader();
        reader.readAsDataURL(selectedImg);
        reader.onload = async () => {
          payload.profilePic = reader.result;
          const res = await updateProfile(payload);
          if (res?.success !== false) navigate("/");
          setIsLoading(false);
        };
        reader.onerror = () => { toast.error("Image read failed"); setIsLoading(false); };
        return;
      }
      if (selectedPreset) {
        payload.profilePic = selectedPreset;
      }
      const res = await updateProfile(payload);
      if (res?.success !== false) navigate("/");
    } catch (err) {
      console.error(err);
    } finally {
      if (!selectedImg) setIsLoading(false);
    }
  };

  const filteredGames = POPULAR_GAMES.filter(g =>
    g.toLowerCase().includes(gameSearch.toLowerCase())
  );

  const avatarSrc = selectedImg
    ? URL.createObjectURL(selectedImg)
    : selectedPreset || authUser?.profilePic || assets.avatar_icon;

  const tabCls = (t) =>
    `px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all ${
      activeTab === t
        ? "bg-sky-600/40 text-sky-200 border border-sky-500/50"
        : "text-sky-300/60 hover:text-sky-300 hover:bg-sky-900/30"
    }`;

  const inputCls = "w-full p-3 bg-[#0e274a]/80 border border-sky-800/40 rounded-xl text-white placeholder:text-sky-200/30 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm";
  const labelCls = "block text-xs text-sky-300/70 mb-1";

  return (
    <div className="w-full h-full overflow-y-auto py-8 px-4 flex justify-center items-start">
      <div className="w-full max-w-3xl pb-12">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-lg shadow-lg shadow-sky-600/30">
              🎮
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Gaming Profile</h1>
              <p className="text-xs text-sky-300/50">Let teammates know who you are</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-xs text-sky-400 hover:text-sky-200 transition-colors cursor-pointer px-3 py-1.5 rounded-lg border border-sky-800/40 hover:border-sky-500/40"
          >
            ← Back to Chat
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="backdrop-blur-2xl bg-[#0a182e]/70 border border-sky-800/40 rounded-2xl shadow-2xl shadow-sky-950/80 overflow-hidden">

            {/* ── Avatar Strip ──────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-sky-900/50 to-blue-900/50 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-sky-900/40">
              <div className="flex flex-col items-center gap-2">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()} title="Upload custom avatar">
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-20 h-20 object-cover rounded-full border-2 border-sky-400/60 shadow-lg shadow-sky-500/20 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs">Upload</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedImg(e.target.files[0]);
                        setSelectedPreset("");
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-sky-300/70 hover:text-sky-200 underline cursor-pointer"
                >
                  Upload File
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <p className="text-white font-bold text-lg">{form.fullName || "Your Name"}</p>
                <p className="text-sky-300 text-sm font-mono">{form.gamerTag || "GamerTag#0000"}</p>

                {/* Avatar presets */}
                <div className="mt-3">
                  <p className="text-[11px] text-sky-300/60 mb-1.5 font-medium">Or choose a gaming avatar preset:</p>
                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    {GAMING_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setSelectedPreset(preset); setSelectedImg(null); }}
                        className={`w-9 h-9 rounded-full p-0.5 border-2 transition-all cursor-pointer hover:scale-110 ${
                          avatarSrc === preset ? "border-sky-400 ring-2 ring-sky-400/30 scale-105" : "border-sky-900/60 hover:border-sky-500/50"
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full rounded-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {form.platforms.map(p => (
                    <span key={p} className="text-xs bg-sky-900/60 border border-sky-700/40 px-2 py-0.5 rounded-full text-sky-200">
                      {PLATFORM_ICONS[p]} {p}
                    </span>
                  ))}
                  {form.region && (
                    <span className="text-xs bg-emerald-900/40 border border-emerald-700/30 px-2 py-0.5 rounded-full text-emerald-300">
                      🌍 {form.region}
                    </span>
                  )}
                  {form.micEnabled && (
                    <span className="text-xs bg-purple-900/40 border border-purple-700/30 px-2 py-0.5 rounded-full text-purple-300">
                      🎤 Mic Ready
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Tabs ──────────────────────────────────────────────────── */}
            <div className="flex gap-2 p-4 border-b border-sky-900/30">
              <button type="button" className={tabCls("identity")} onClick={() => setActiveTab("identity")}>👤 Identity</button>
              <button type="button" className={tabCls("gaming")}   onClick={() => setActiveTab("gaming")}>🎮 Gaming</button>
              <button type="button" className={tabCls("social")}   onClick={() => setActiveTab("social")}>🔗 Social</button>
            </div>

            {/* ── Tab: Identity ─────────────────────────────────────────── */}
            {activeTab === "identity" && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input className={inputCls} value={form.fullName} onChange={e => update("fullName", e.target.value)} placeholder="Your name" required />
                  </div>
                  <div>
                    <label className={labelCls}>GamerTag <span className="text-sky-500">(unique)</span></label>
                    <input
                      className={`${inputCls} font-mono`}
                      value={form.gamerTag}
                      onChange={e => update("gamerTag", e.target.value)}
                      placeholder="NightWolf#2847"
                      maxLength={30}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Bio</label>
                  <textarea className={inputCls} rows={3} value={form.bio} onChange={e => update("bio", e.target.value)} placeholder="Tell teammates about yourself..." />
                </div>

                <div>
                  <label className={labelCls}>Custom Status</label>
                  <input className={inputCls} value={form.customStatus.text} onChange={e => updateNested("customStatus","text",e.target.value)} placeholder="e.g. Grinding Ranked, AFK - BRB in 20" maxLength={60} />
                </div>

                <div>
                  <label className={labelCls}>Region</label>
                  <select className={inputCls} value={form.region} onChange={e => update("region", e.target.value)}>
                    <option value="">Select your region</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Platforms</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {PLATFORMS.map(p => (
                      <button
                        key={p} type="button"
                        onClick={() => togglePlatform(p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border cursor-pointer transition-all ${
                          form.platforms.includes(p)
                            ? "bg-sky-600/30 border-sky-500/60 text-sky-200 shadow-md shadow-sky-900/30"
                            : "bg-[#0e274a]/60 border-sky-800/30 text-sky-300/60 hover:border-sky-600/50"
                        }`}
                      >
                        {PLATFORM_ICONS[p]} {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => update("micEnabled", !form.micEnabled)}
                      className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${form.micEnabled ? "bg-sky-500" : "bg-sky-900"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${form.micEnabled ? "left-5" : "left-1"}`} />
                    </div>
                    <span className="text-sm text-sky-200/80">🎤 Mic Enabled</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => update("isStreamer", !form.isStreamer)}
                      className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${form.isStreamer ? "bg-purple-500" : "bg-sky-900"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${form.isStreamer ? "left-5" : "left-1"}`} />
                    </div>
                    <span className="text-sm text-sky-200/80">📺 I'm a Streamer</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── Tab: Gaming ───────────────────────────────────────────── */}
            {activeTab === "gaming" && (
              <div className="p-6 space-y-5">
                <div>
                  <label className={labelCls}>Primary Game <span className="text-sky-400/60">(shown on profile card)</span></label>
                  <input
                    className={inputCls}
                    list="games-datalist"
                    value={form.primaryGame}
                    onChange={e => update("primaryGame", e.target.value)}
                    placeholder="Search or type your main game..."
                  />
                  <datalist id="games-datalist">
                    {POPULAR_GAMES.map(g => <option key={g} value={g} />)}
                  </datalist>
                </div>

                <div>
                  <label className={labelCls}>My Rank</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputCls} placeholder="Game (e.g. Valorant)" value={form.rank.game} onChange={e => updateNested("rank","game",e.target.value)} />
                    <select className={inputCls} value={form.rank.tier} onChange={e => updateNested("rank","tier",e.target.value)}>
                      <option value="">Rank Tier</option>
                      {RANK_TIERS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input className={inputCls} placeholder="Division (I/II/III)" value={form.rank.division} onChange={e => updateNested("rank","division",e.target.value)} maxLength={3} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Favorite Games <span className="text-sky-400/60">({form.favoriteGames.length}/10 selected)</span></label>
                  <input
                    className={`${inputCls} mb-2`}
                    value={gameSearch}
                    onChange={e => setGameSearch(e.target.value)}
                    placeholder="Search games..."
                  />
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                    {filteredGames.map(g => (
                      <button
                        key={g} type="button"
                        onClick={() => toggleFavoriteGame(g)}
                        className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-all ${
                          form.favoriteGames.includes(g)
                            ? "bg-sky-600/30 border-sky-500/60 text-sky-200"
                            : "bg-[#0e274a]/60 border-sky-800/30 text-sky-300/60 hover:border-sky-600/50"
                        }`}
                      >
                        {form.favoriteGames.includes(g) ? "✓ " : ""}{g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Play Style</label>
                  <div className="flex flex-wrap gap-2">
                    {PLAYSTYLES.map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => togglePlayStyle(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs border cursor-pointer transition-all ${
                          form.playStyle.includes(s)
                            ? "bg-emerald-600/30 border-emerald-500/60 text-emerald-200"
                            : "bg-[#0e274a]/60 border-sky-800/30 text-sky-300/60 hover:border-sky-600/50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Social ───────────────────────────────────────────── */}
            {activeTab === "social" && (
              <div className="p-6 space-y-4">
                <p className="text-xs text-sky-300/50 mb-2">Link your gaming profiles so teammates can follow you</p>
                {[
                  { key: "twitch",  icon: "🟣", label: "Twitch Username",  placeholder: "yourtwitch" },
                  { key: "youtube", icon: "🔴", label: "YouTube Handle",   placeholder: "@yourchannel" },
                  { key: "steam",   icon: "⚙️",  label: "Steam Username",  placeholder: "steamuser" },
                  { key: "discord", icon: "💙", label: "Discord Username", placeholder: "user#1234" },
                ].map(({ key, icon, label, placeholder }) => (
                  <div key={key}>
                    <label className={labelCls}>{icon} {label}</label>
                    <input
                      className={inputCls}
                      value={form.socialLinks[key]}
                      onChange={e => updateNested("socialLinks", key, e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl cursor-pointer shadow-lg shadow-sky-500/25 transition-all text-sm"
              >
                {isLoading ? "Saving..." : "💾 Save Gaming Profile"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-5 py-3 border border-sky-800/40 hover:border-sky-600/60 text-sky-300/70 hover:text-sky-200 rounded-xl cursor-pointer transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
