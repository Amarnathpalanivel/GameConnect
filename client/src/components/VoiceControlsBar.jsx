import React, { useContext, useState } from "react";
import { VoiceContext } from "../../context/VoiceContext";
import { AuthContext } from "../../context/AuthContext";

const VoiceControlsBar = () => {
  const {
    isInVoice,
    currentVoicePartyName,
    voiceParticipants,
    isMuted,
    isDeafened,
    isSpeaking,
    isPTT,
    pttKey,
    isPTTHeld,
    micLevel,
    voicePing,
    userVolumes,
    toggleMute,
    toggleDeafen,
    togglePTT,
    setParticipantVolume,
    leaveVoice,
  } = useContext(VoiceContext);

  const { authUser } = useContext(AuthContext);
  const [showMembers, setShowMembers] = useState(false);

  if (!isInVoice) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-slide-up">
      <div className="bg-[#09152b]/95 backdrop-blur-xl border border-sky-500/30 shadow-[0_8px_32px_rgba(2,132,199,0.35)] rounded-2xl p-2.5 sm:p-3 text-white">
        
        {/* Main Bar Strip */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Connection Status & Ping */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              <span className="w-3 h-3 rounded-full bg-emerald-400 flex items-center justify-center animate-ping absolute inset-0 opacity-75" />
              <span className="relative w-3 h-3 rounded-full bg-emerald-400 block border-2 border-[#09152b]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                  {currentVoicePartyName || "Party Voice"}
                </span>
                <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                  {voicePing}ms
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-sky-300/60">
                <span className="truncate">RTC Voice Connected</span>
                <span>·</span>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
                >
                  {voiceParticipants.length + 1} connected {showMembers ? "▲" : "▼"}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Mic Activity Meter */}
          <div className="hidden sm:flex flex-col items-center gap-1 w-20">
            <div className="w-full bg-sky-950/80 border border-sky-800/40 h-2 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  isSpeaking ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-sky-500/40"
                }`}
                style={{ width: `${isMuted || isDeafened ? 0 : micLevel}%` }}
              />
            </div>
            <span className="text-[9px] text-sky-400/50">
              {isMuted ? "MUTED" : isSpeaking ? "SPEAKING" : isPTT ? (isPTTHeld ? "PTT ON" : "PTT IDLE") : "VOICE ACTIVE"}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                isMuted
                  ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                  : isSpeaking
                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                  : "bg-sky-900/30 text-sky-200 border border-sky-700/40 hover:bg-sky-800/40"
              }`}
            >
              <span>{isMuted ? "🔇" : "🎙️"}</span>
              <span className="hidden md:inline">{isMuted ? "Muted" : "Mute"}</span>
            </button>

            {/* Deafen Button */}
            <button
              onClick={toggleDeafen}
              title={isDeafened ? "Undeafen Audio" : "Deafen Audio (Mute incoming sound & mic)"}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                isDeafened
                  ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                  : "bg-sky-900/30 text-sky-200 border border-sky-700/40 hover:bg-sky-800/40"
              }`}
            >
              <span>{isDeafened ? "❌" : "🎧"}</span>
              <span className="hidden md:inline">{isDeafened ? "Deafened" : "Deafen"}</span>
            </button>

            {/* PTT Mode Toggle */}
            <button
              onClick={togglePTT}
              title={isPTT ? "Switch to Voice Activity" : "Switch to Push-To-Talk (Hold Space)"}
              className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
                isPTT
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-sky-950/40 text-sky-400/60 border border-sky-900/40 hover:text-sky-300"
              }`}
            >
              <span>🔘</span>
              <span className="hidden lg:inline">{isPTT ? `PTT [${pttKey}]` : "VAD"}</span>
            </button>

            {/* Disconnect Button */}
            <button
              onClick={leaveVoice}
              title="Disconnect from Voice Channel"
              className="px-2.5 py-2 sm:px-3 bg-red-600/80 hover:bg-red-600 text-white border border-red-400/50 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-red-900/40"
            >
              <span>📞</span>
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>

        {/* Expandable Voice Channel Participants Drawer */}
        {showMembers && (
          <div className="mt-3 pt-3 border-t border-sky-900/30 space-y-2 max-h-48 overflow-y-auto animate-fade-in pr-1">
            <div className="text-[11px] font-semibold text-sky-400/70 uppercase tracking-wider mb-1">
              Voice Room Participants ({voiceParticipants.length + 1})
            </div>

            {/* Self Member Item */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-sky-950/40 border border-sky-900/30 text-xs">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-[11px] ${
                      isSpeaking ? "ring-2 ring-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : ""
                    }`}
                  >
                    {authUser?.gamerTag ? authUser.gamerTag.charAt(0).toUpperCase() : "U"}
                  </div>
                  {isSpeaking && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#09152b]" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>{authUser?.gamerTag || authUser?.fullName || "You"}</span>
                    <span className="text-[9px] text-sky-400/60 font-mono">(you)</span>
                  </div>
                  <div className="text-[10px] text-sky-300/50">
                    {isDeafened ? "Deafened" : isMuted ? "Muted" : isSpeaking ? "Speaking" : "Connected"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-sky-400/60">
                <span>{isMuted ? "🔇" : "🎙️"}</span>
                {isDeafened && <span>🎧❌</span>}
              </div>
            </div>

            {/* Remote Peers */}
            {voiceParticipants.map((peer) => {
              const currentVol = userVolumes[peer.userId] !== undefined ? userVolumes[peer.userId] : 1.0;

              return (
                <div
                  key={peer.socketId}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#08172e]/60 border border-sky-900/20 text-xs hover:bg-[#0c2242]/70 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center font-bold text-[11px] ${
                          peer.isSpeaking ? "ring-2 ring-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" : ""
                        }`}
                      >
                        {peer.gamerTag ? peer.gamerTag.charAt(0).toUpperCase() : "G"}
                      </div>
                      {peer.isSpeaking && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#09152b]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate max-w-[120px] sm:max-w-[160px]">
                        {peer.gamerTag}
                      </div>
                      <div className="text-[10px] text-sky-300/50">
                        {peer.isDeafened ? "Deafened" : peer.isMuted ? "Muted" : peer.isSpeaking ? "Speaking" : "Listening"}
                      </div>
                    </div>
                  </div>

                  {/* Volume Slider per Participant */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-sky-400/60">🔊 {Math.round(currentVol * 100)}%</span>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={currentVol}
                      onChange={(e) => setParticipantVolume(peer.userId, parseFloat(e.target.value))}
                      className="w-16 sm:w-20 accent-sky-400 h-1.5 rounded-lg cursor-pointer bg-sky-950"
                      title={`Adjust volume for ${peer.gamerTag}`}
                    />
                    <span>{peer.isMuted ? "🔇" : "🎙️"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceControlsBar;
