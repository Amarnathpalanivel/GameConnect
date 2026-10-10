import React, { useState, useEffect, useContext } from 'react'
import assets from '../assets/assets'
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: "🎯", label: "Find Teammates" },
  { icon: "🎤", label: "Voice Ready" },
  { icon: "🏆", label: "Rank Up" },
  { icon: "🌍", label: "Global Players" },
];

const LoginPage = () => {
  const [currState, setCurrState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP states
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, verifyOTP, resendOTP } = useContext(AuthContext);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (currState === 'Sign up' && !isDataSubmitted) {
        setIsDataSubmitted(true);
        setIsSubmitting(false);
        return;
      }
      if (currState === 'Sign up') {
        const res = await login("signup", { fullName, email, password, bio });
        if (res?.requireVerification) {
          setOtpEmail(res.email || email);
          setIsVerifyingOTP(true);
          setResendCooldown(60);
        }
      } else {
        const res = await login("login", { email, password });
        if (res?.requireVerification) {
          setOtpEmail(res.email || email);
          setIsVerifyingOTP(true);
          setResendCooldown(60);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setIsSubmitting(true);
    try { await verifyOTP(otpEmail, otp.trim()); }
    finally { setIsSubmitting(false); }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    const res = await resendOTP(otpEmail);
    if (res?.success) setResendCooldown(60);
  };

  const resetForm = (state) => {
    setCurrState(state);
    setIsDataSubmitted(false);
    setIsVerifyingOTP(false);
    setOtp("");
    setFullName(""); setEmail(""); setPassword(""); setBio("");
  };

  /* ── Shared input class ── */
  const inputCls = [
    "w-full px-4 py-3 rounded-xl text-sm text-white",
    "bg-[#0e274a]/70 border border-sky-800/40",
    "placeholder:text-sky-300/30",
    "focus:outline-none focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/20",
    "transition-all duration-200",
  ].join(" ");

  /* ── OTP step ─────────────────────────────────────────────────────────── */
  if (isVerifyingOTP) return (
    <div className="w-full h-full overflow-y-auto flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col p-4">
      <HeroPanel />
      <div className="w-full max-w-md animate-scale-in">
        <form
          onSubmit={handleVerifyOTP}
          className="glass-card rounded-2xl p-8 flex flex-col gap-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold gradient-text">Verify Email</h2>
              <p className="text-xs text-sky-300/50 mt-0.5">Check your inbox</p>
            </div>
            <button
              type="button"
              onClick={() => setIsVerifyingOTP(false)}
              className="w-8 h-8 rounded-full bg-sky-900/40 hover:bg-sky-900/70 flex items-center justify-center text-sky-300/70 hover:text-sky-200 cursor-pointer transition-all"
              title="Back"
            >
              ‹
            </button>
          </div>

          {/* Email badge */}
          <div className="bg-sky-950/60 border border-sky-800/30 rounded-xl p-3 text-center">
            <p className="text-xs text-sky-300/60 mb-1">Code sent to</p>
            <p className="text-sm font-semibold text-sky-200">{otpEmail}</p>
          </div>

          {/* OTP Input */}
          <div>
            <label className="text-xs text-sky-300/60 mb-2 block font-medium">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              autoFocus
              placeholder="• • • • • •"
              className={`${inputCls} text-center tracking-[16px] text-2xl font-mono font-bold`}
              required
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || otp.length !== 6}
            className="py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-sky-600/25 press-active transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Verifying...
              </span>
            ) : "Verify & Sign In ✓"}
          </button>

          {/* Resend + back */}
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0}
              className="text-sky-400/70 hover:text-sky-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "↺ Resend Code"}
            </button>
            <button
              type="button"
              onClick={() => resetForm("Login")}
              className="text-sky-400 hover:text-sky-300 cursor-pointer transition-colors"
            >
              Back to Login →
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  /* ── Main form ────────────────────────────────────────────────────────── */
  const isSignup = currState === "Sign up";
  const isStep2  = isSignup && isDataSubmitted;

  return (
    <div className="w-full h-full overflow-y-auto flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col p-4">
      <HeroPanel />

      <div className="w-full max-w-md animate-scale-in">
        <form
          onSubmit={onSubmitHandler}
          className="glass-card rounded-2xl p-8 flex flex-col gap-5 shadow-2xl"
        >
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold gradient-text">
                {isStep2 ? "Almost there!" : currState}
              </h2>
              <p className="text-xs text-sky-300/50 mt-0.5">
                {isStep2
                  ? "Tell us a little about yourself"
                  : isSignup
                  ? "Create your gaming identity"
                  : "Welcome back, player"}
              </p>
            </div>
            {isStep2 && (
              <button
                type="button"
                onClick={() => setIsDataSubmitted(false)}
                className="w-8 h-8 rounded-full bg-sky-900/40 hover:bg-sky-900/70 flex items-center justify-center text-sky-300/70 hover:text-sky-200 cursor-pointer transition-all"
              >
                ‹
              </button>
            )}
          </div>

          {/* Step indicator for signup */}
          {isSignup && (
            <div className="flex items-center gap-2">
              {["Info", "Bio", "Verify"].map((s, i) => {
                const step = i === 0 ? !isDataSubmitted : i === 1 ? isDataSubmitted : false;
                const done = i === 0 ? isDataSubmitted : false;
                return (
                  <React.Fragment key={s}>
                    <div className={`flex items-center gap-1.5 ${i > 0 ? "" : ""}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        done ? "bg-emerald-500 text-white" :
                        step ? "bg-sky-500 text-white ring-2 ring-sky-400/40" :
                        "bg-sky-900/60 text-sky-400/50"
                      }`}>
                        {done ? "✓" : i + 1}
                      </div>
                      <span className={`text-[10px] ${step ? "text-sky-300" : "text-sky-400/40"}`}>{s}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px ${done ? "bg-emerald-500/60" : "bg-sky-900/60"}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* ── Step 1: Identity ── */}
          {!isStep2 && (
            <div className="flex flex-col gap-3.5 animate-fade-in">
              {isSignup && (
                <div>
                  <label className="text-xs text-sky-300/60 mb-1.5 block font-medium">Full Name</label>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    type="text"
                    placeholder="e.g. Alex Hunter"
                    required
                    className={inputCls}
                  />
                  <p className="text-[11px] text-sky-400/40 mt-1.5 px-1">
                    🎮 Your GamerTag will be auto-generated as{" "}
                    <span className="font-mono text-sky-400/70">
                      {fullName ? `${fullName.split(" ")[0]}#XXXX` : "Name#XXXX"}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs text-sky-300/60 mb-1.5 block font-medium">Email Address</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-xs text-sky-300/60 mb-1.5 block font-medium">Password</label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder={isSignup ? "Min 8 characters" : "Your password"}
                    required
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-300/50 hover:text-sky-200 cursor-pointer text-sm transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Bio ── */}
          {isStep2 && (
            <div className="animate-fade-in">
              <label className="text-xs text-sky-300/60 mb-1.5 block font-medium">
                Short Bio <span className="text-sky-500/50">(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                placeholder="Tell teammates about yourself — your favorite games, playstyle, timezone..."
                className={`${inputCls} resize-none`}
              />
              <p className="text-[11px] text-sky-400/40 mt-1.5 px-1">You can always update this later from your profile.</p>
            </div>
          )}

          {/* Terms checkbox (sign up only, not on every login) */}
          {isSignup && !isStep2 && (
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" required className="sr-only peer" />
                <div className="w-4 h-4 rounded bg-sky-900/60 border border-sky-700/50 peer-checked:bg-sky-500 peer-checked:border-sky-400 transition-all flex items-center justify-center">
                  <span className="text-[10px] text-white hidden peer-checked:inline">✓</span>
                </div>
              </div>
              <p className="text-xs text-sky-300/60 group-hover:text-sky-300/80 transition-colors">
                I agree to the <span className="text-sky-400 hover:underline cursor-pointer">Terms of Use</span> & <span className="text-sky-400 hover:underline cursor-pointer">Privacy Policy</span>
              </p>
            </label>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-sky-600/25 press-active transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : isSignup
              ? (isStep2 ? "Create Account 🎮" : "Continue →")
              : "Sign In →"}
          </button>

          {/* Toggle login/signup */}
          <div className="pt-1 border-t border-sky-900/30 text-center">
            {isSignup ? (
              <p className="text-xs text-sky-300/60">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => resetForm("Login")}
                  className="font-semibold text-sky-400 hover:text-sky-300 cursor-pointer transition-colors"
                >
                  Login here
                </button>
              </p>
            ) : (
              <p className="text-xs text-sky-300/60">
                New to GameConnect?{" "}
                <button
                  type="button"
                  onClick={() => resetForm("Sign up")}
                  className="font-semibold text-sky-400 hover:text-sky-300 cursor-pointer transition-colors"
                >
                  Create account
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Hero Panel (left side) ─────────────────────────────────────────────── */
const HeroPanel = () => (
  <div className="flex flex-col items-center gap-5 max-w-xs text-center animate-slide-left">
    {/* Logo */}
    <div className="relative">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 flex items-center justify-center text-5xl shadow-2xl shadow-sky-600/40 hover-lift">
        🎮
      </div>
      {/* Glow ring */}
      <div className="absolute inset-0 rounded-3xl ring-2 ring-sky-400/20 ring-offset-2 ring-offset-transparent" />
    </div>

    {/* Brand */}
    <div>
      <h1 className="text-4xl font-bold gradient-text tracking-tight">GameConnect</h1>
      <p className="text-sm text-sky-200/50 font-light tracking-wide mt-1.5">
        Find Your Squad. Dominate Together.
      </p>
    </div>

    {/* Feature chips */}
    <div className="flex flex-wrap justify-center gap-2">
      {FEATURES.map(f => (
        <span
          key={f.label}
          className="text-[11px] text-sky-300/70 bg-sky-900/30 border border-sky-800/30 px-3 py-1 rounded-full hover:border-sky-600/50 hover:text-sky-200 transition-all cursor-default"
        >
          {f.icon} {f.label}
        </span>
      ))}
    </div>

    {/* Stats row */}
    <div className="flex items-center gap-4 text-center mt-1">
      {[
        { val: "50K+", label: "Players" },
        { val: "200+", label: "Games" },
        { val: "24/7", label: "Online" },
      ].map(s => (
        <div key={s.label}>
          <p className="text-lg font-bold text-sky-300">{s.val}</p>
          <p className="text-[10px] text-sky-400/50">{s.label}</p>
        </div>
      ))}
    </div>
  </div>
);

export default LoginPage;