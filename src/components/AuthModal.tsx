"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  UserCircle,
  CheckCircle2,
  X,
  KeyRound,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "otp">(initialMode);
  const { login, register, verifyAccount, resendActivationOtp, isLoading } = useAuth();
  const toast = useToast();

  // Reset mode and sub-modals when initialMode changes or modal opens/closes
  useEffect(() => {
    setIsForgotPasswordOpen(false);
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Unified modal close handler
  const handleCloseModal = () => {
    setIsForgotPasswordOpen(false);
    onClose();
  };

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseModal();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Login form state
  const [loginData, setLoginData] = useState({ identifier: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Load saved email and rememberMe setting from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isOpen) {
      try {
        const savedEmail = localStorage.getItem("nika_saved_email");
        const savedRemember = localStorage.getItem("nika_remember_me");
        if (savedRemember !== null) {
          setRememberMe(savedRemember === "true");
        }
        if (savedEmail) {
          setLoginData((prev) => ({ ...prev, identifier: savedEmail }));
        }
      } catch {
        // Ignore
      }
    }
  }, [isOpen]);

  // Register form state (Unified Contact: Email / Phone)
  const [registerData, setRegisterData] = useState({
    contact: "",
    password: "",
    confirmPassword: "",
    username: "",
    full_name: "",
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [registeredUserId, setRegisteredUserId] = useState<string>("");
  const [registeredTarget, setRegisteredTarget] = useState<string>("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === "otp" && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, cooldown]);

  // Google OAuth handler (Facebook completely removed)
  const handleGoogleLogin = async (intent: "login" | "register" = "login") => {
    setIsGoogleLoading(true);
    try {
      if (!supabase) {
        toast.error("Chưa kết nối Supabase Client");
        setIsGoogleLoading(false);
        return;
      }
      if (typeof document !== "undefined") {
        document.cookie = `oauth_intent=${intent}; path=/; max-age=300; SameSite=Lax`;
        document.cookie = `oauth_provider=google; path=/; max-age=300; SameSite=Lax`;
        document.cookie = `google_auth_intent=${intent}; path=/; max-age=300; SameSite=Lax`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?intent=${intent}&provider=google`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        toast.error(error.message || "Không thể kết nối với dịch vụ Google");
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi khi đăng nhập bằng Google");
      setIsGoogleLoading(false);
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (typeof window !== "undefined") {
        try {
          if (rememberMe) {
            localStorage.setItem("nika_saved_email", loginData.identifier);
            localStorage.setItem("nika_remember_me", "true");
          } else {
            localStorage.removeItem("nika_saved_email");
            localStorage.setItem("nika_remember_me", "false");
          }
        } catch {
          // Ignore
        }
      }

      await login(loginData.identifier, loginData.password, rememberMe);
      toast.success("Đăng nhập thành công! Chào mừng bạn quay trở lại.");
      onClose();
      setLoginData({
        identifier: rememberMe ? loginData.identifier : "",
        password: "",
      });
    } catch (err: any) {
      if (err.notVerified) {
        setRegisteredUserId(err.data?.userId || "");
        setRegisteredTarget(err.data?.email || err.data?.phone || loginData.identifier);
        setMode("otp");
        setCooldown(60);
        toast.error("Tài khoản chưa được kích hoạt. Vui lòng nhập mã OTP để tiếp tục.");
      } else {
        toast.error(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
      }
    }
  };

  // Register handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawContact = registerData.contact.trim();
    if (!rawContact) {
      toast.error("Vui lòng nhập Email hoặc Số điện thoại");
      return;
    }

    const isEmail = rawContact.includes("@");
    if (isEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawContact)) {
        toast.error("Định dạng email không hợp lệ (VD: user@example.com)");
        return;
      }
    } else {
      if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(rawContact)) {
        toast.error("Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)");
        return;
      }
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (registerData.password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(registerData.password)) {
      toast.error("Mật khẩu phải chứa chữ hoa, chữ thường và số");
      return;
    }

    try {
      const res = await register({
        contact: rawContact,
        registerMethod: isEmail ? "email" : "phone",
        email: isEmail ? rawContact : undefined,
        phone: !isEmail ? rawContact : undefined,
        password: registerData.password,
        username: registerData.username.trim(),
        full_name: registerData.full_name.trim(),
      });

      if (res && res.needVerification) {
        toast.success("Đăng ký thành công! Vui lòng nhập mã OTP để kích hoạt.");
        setRegisteredUserId(res.data?.userId || "");
        setRegisteredTarget(res.data?.target || rawContact);
        if ((res.data as any)?.devOtp) {
          setDevOtp((res.data as any).devOtp);
        }
        setMode("otp");
        setCooldown(60);
      } else {
        toast.success("Đăng ký thành công!");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
    }
  };

  // OTP Verification handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 chữ số OTP");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyAccount({
        userId: registeredUserId,
        otp: otpCode,
      });

      toast.success("Kích hoạt tài khoản thành công! Chào mừng bạn đến với NikaLearn.");
      onClose();
      setMode("login");
      setOtpCode("");
    } catch (err: any) {
      toast.error(err.message || "Mã xác thực OTP không chính xác hoặc đã hết hạn");
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    try {
      const res = await resendActivationOtp({
        userId: registeredUserId,
      });
      if (res?.data?.devOtp) {
        setDevOtp(res.data.devOtp);
      }
      toast.success("Mã OTP mới đã được gửi!");
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi lại mã OTP");
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {!isForgotPasswordOpen && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={handleCloseModal}
            style={{ isolation: "isolate" }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="w-full max-w-[500px] bg-[#FFFDF9] rounded-[28px] border-2 border-[#121212] shadow-[6px_6px_0_#121212] overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: TID Forest Moss Banner */}
              <div className="bg-[#1A2616] px-6 py-4 flex items-center justify-between border-b-2 border-[#121212]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FFD23F] border border-[#121212] flex items-center justify-center shadow-[2px_2px_0_#121212]">
                    <span className="text-[#121212] font-black text-xs">NL</span>
                  </div>
                  <div>
                    <p className="text-white font-black text-sm leading-none">NikaLearn</p>
                    <p className="text-[#FFD23F] text-[10px] font-bold mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#FFD23F] rounded-full inline-block animate-pulse"></span>
                      Trực tuyến
                    </p>
                  </div>
                </div>

                {/* Mode Switcher Buttons */}
                <div className="flex items-center gap-2">
                  {mode !== "otp" && (
                    <div className="flex bg-black/30 rounded-full p-1 gap-1 border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordOpen(false);
                          setMode("login");
                        }}
                        className={`px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          mode === "login"
                            ? "bg-white text-[#1A2616] shadow-sm"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        Đăng nhập
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordOpen(false);
                          setMode("register");
                        }}
                        className={`px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          mode === "register"
                            ? "bg-white text-[#1A2616] shadow-sm"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        Đăng ký
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleCloseModal}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Đóng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-7">
              <AnimatePresence mode="wait">
                {/* 1. LOGIN MODE */}
                {mode === "login" && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <h2 className="text-xl font-black text-[#121212] tracking-tight">
                        Chào mừng trở lại
                      </h2>
                      <p className="text-muted-foreground text-xs font-semibold mt-1">
                        Đăng nhập bằng Email, Số điện thoại hoặc Tên đăng nhập.
                      </p>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                      {/* Identifier */}
                      <div className="space-y-1">
                        <label
                          htmlFor="login-identifier"
                          className="block text-[11px] font-black text-slate-700 uppercase tracking-widest pl-1"
                        >
                          Email / Số điện thoại / Tên đăng nhập
                        </label>
                        <div className="relative group">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                          <input
                            type="text"
                            id="login-identifier"
                            required
                            value={loginData.identifier}
                            onChange={(e) =>
                              setLoginData({ ...loginData, identifier: e.target.value })
                            }
                            placeholder="email@example.com hoặc 0912345678"
                            className="w-full pl-10 pr-4 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between pl-1 pr-1">
                          <label
                            htmlFor="login-pass"
                            className="block text-[11px] font-black text-slate-700 uppercase tracking-widest"
                          >
                            Mật khẩu
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsForgotPasswordOpen(true)}
                            className="text-[11px] font-bold text-[#6B8045] hover:text-[#1A2616] hover:underline cursor-pointer transition-colors"
                          >
                            Quên mật khẩu?
                          </button>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                          <input
                            type={showLoginPassword ? "text" : "password"}
                            id="login-pass"
                            required
                            value={loginData.password}
                            onChange={(e) =>
                              setLoginData({ ...loginData, password: e.target.value })
                            }
                            placeholder="••••••••"
                            className="w-full pl-10 pr-12 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            {showLoginPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Remember Me */}
                      <div className="flex items-center pt-0.5">
                        <input
                          type="checkbox"
                          id="auth-modal-remember"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 accent-[#6B8045] bg-white border-2 border-[#121212] rounded cursor-pointer"
                        />
                        <label
                          htmlFor="auth-modal-remember"
                          className="ml-2 text-xs font-bold text-slate-700 cursor-pointer select-none"
                        >
                          Ghi nhớ đăng nhập
                        </label>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-[52px] bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_4px_0_#121212] border-2 border-[#121212] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Đăng nhập ngay</span>
                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#121212]/15" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-[#FFFDF9] px-3 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          Hoặc tiếp tục với
                        </span>
                      </div>
                    </div>

                    {/* Google Login Only */}
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin("login")}
                      disabled={isLoading || isGoogleLoading}
                      className="w-full h-[46px] bg-white hover:bg-[#F7F4EB] text-[#121212] font-black text-xs uppercase tracking-wider rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                    >
                      {isGoogleLoading ? (
                        <div className="w-4 h-4 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      )}
                      <span>Đăng nhập với Google</span>
                    </button>

                    <div className="pt-1 text-center">
                      <p className="text-xs font-semibold text-slate-600">
                        Chưa có tài khoản?{" "}
                        <button
                          type="button"
                          onClick={() => setMode("register")}
                          className="text-[#6B8045] hover:text-[#1A2616] font-black hover:underline cursor-pointer"
                        >
                          Đăng ký ngay
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* 2. REGISTER MODE: UNIFIED EMAIL / PHONE */}
                {mode === "register" && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3.5"
                  >
                    <div>
                      <h2 className="text-xl font-black text-[#121212] tracking-tight">
                        Tạo tài khoản mới
                      </h2>
                    </div>

                    <form onSubmit={handleRegisterSubmit} className="space-y-3">
                      {/* Name & Username side by side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label
                            htmlFor="reg-name"
                            className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1"
                          >
                            Họ và tên
                          </label>
                          <div className="relative group">
                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                            <input
                              type="text"
                              id="reg-name"
                              required
                              value={registerData.full_name}
                              onChange={(e) =>
                                setRegisterData({ ...registerData, full_name: e.target.value })
                              }
                              placeholder="Nguyễn Văn A"
                              className="w-full pl-9 pr-3 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="reg-user"
                            className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1"
                          >
                            Tên đăng nhập
                          </label>
                          <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                            <input
                              type="text"
                              id="reg-user"
                              required
                              value={registerData.username}
                              onChange={(e) =>
                                setRegisterData({ ...registerData, username: e.target.value })
                              }
                              placeholder="nguyen_van_a"
                              className="w-full pl-9 pr-3 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Unified Email / Phone Field */}
                      <div className="space-y-1">
                        <label
                          htmlFor="reg-contact"
                          className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1"
                        >
                          Email hoặc Số điện thoại
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                          <input
                            type="text"
                            id="reg-contact"
                            required
                            value={registerData.contact}
                            onChange={(e) =>
                              setRegisterData({ ...registerData, contact: e.target.value })
                            }
                            placeholder="email@example.com hoặc 0912345678"
                            className="w-full pl-9 pr-3 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Passwords */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label
                            htmlFor="reg-pass"
                            className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1"
                          >
                            Mật khẩu
                          </label>
                          <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                            <input
                              type={showRegisterPassword ? "text" : "password"}
                              id="reg-pass"
                              required
                              value={registerData.password}
                              onChange={(e) =>
                                setRegisterData({ ...registerData, password: e.target.value })
                              }
                              placeholder="••••••••"
                              className="w-full pl-9 pr-10 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                              {showRegisterPassword ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="reg-conf-pass"
                            className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1"
                          >
                            Xác nhận mật khẩu
                          </label>
                          <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                            <input
                              type={showRegisterConfirmPassword ? "text" : "password"}
                              id="reg-conf-pass"
                              required
                              value={registerData.confirmPassword}
                              onChange={(e) =>
                                setRegisterData({
                                  ...registerData,
                                  confirmPassword: e.target.value,
                                })
                              }
                              placeholder="••••••••"
                              className="w-full pl-9 pr-10 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowRegisterConfirmPassword(!showRegisterConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                              {showRegisterConfirmPassword ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-1"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Tạo tài khoản & Nhận mã OTP</span>
                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#121212]/15" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-[#FFFDF9] px-3 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          Hoặc đăng ký nhanh với
                        </span>
                      </div>
                    </div>

                    {/* Google Sign Up Only */}
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin("register")}
                      disabled={isLoading || isGoogleLoading}
                      className="w-full h-[46px] bg-white hover:bg-[#F7F4EB] text-[#121212] font-black text-xs uppercase tracking-wider rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                    >
                      {isGoogleLoading ? (
                        <div className="w-4 h-4 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      )}
                      <span>Đăng ký với Google</span>
                    </button>

                    <div className="pt-1 text-center">
                      <p className="text-xs font-semibold text-slate-600">
                        Đã có tài khoản?{" "}
                        <button
                          type="button"
                          onClick={() => setMode("login")}
                          className="text-[#6B8045] hover:text-[#1A2616] font-black hover:underline cursor-pointer"
                        >
                          Đăng nhập ngay
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* 3. OTP VERIFICATION MODE */}
                {mode === "otp" && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#121212] transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Quay lại đăng ký</span>
                    </button>

                    <div className="text-center py-2">
                      <div className="w-14 h-14 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] mx-auto flex items-center justify-center shadow-[3px_3px_0_#121212] mb-3">
                        <KeyRound className="w-7 h-7 text-[#121212]" />
                      </div>
                      <h2 className="text-xl font-black text-[#121212] tracking-tight">
                        Kích hoạt tài khoản
                      </h2>
                      <p className="text-muted-foreground text-xs font-medium mt-1.5 max-w-sm mx-auto">
                        Mã xác thực OTP gồm 6 chữ số đã được gửi đến:
                        <span className="block font-bold text-[#121212] mt-0.5">
                          {registeredTarget}
                        </span>
                      </p>
                    </div>

                    <form onSubmit={handleVerifyOtp} className="space-y-4 max-w-sm mx-auto">
                      {devOtp && (
                        <div className="bg-[#FEF3C7] border-2 border-[#121212] p-3 rounded-xl shadow-[2px_2px_0_#121212] text-center space-y-1.5 animate-in fade-in">
                          <p className="text-[11px] font-black text-amber-950 flex items-center justify-center gap-1 uppercase tracking-wider">
                            <span>💡</span> [Chế độ thử nghiệm Dev]
                          </p>
                          <p className="text-xs text-slate-800 font-semibold">
                            Mã OTP tạo tự động:{" "}
                            <span className="text-base font-black text-[#121212] tracking-wider px-2 py-0.5 bg-white border border-[#121212] rounded-md inline-block shadow-[1px_1px_0_#121212]">
                              {devOtp}
                            </span>
                          </p>
                          <div>
                            <button
                              type="button"
                              onClick={() => setOtpCode(devOtp)}
                              className="text-[11px] font-black text-[#6B8045] hover:text-[#1A2616] underline cursor-pointer"
                            >
                              👉 Bấm vào đây để tự động điền mã
                            </button>
                          </div>
                        </div>
                      )}

                      {!devOtp && (
                        <div className="bg-[#F7F4EB] border border-[#121212]/20 p-2.5 rounded-xl text-center text-[11px] text-slate-600 font-medium">
                          📌 Ở môi trường phát triển (Local), mã OTP đang được hiển thị tại <strong>cửa sổ Terminal</strong> (nơi bạn chạy lệnh <code className="bg-slate-200 px-1 py-0.5 rounded text-[#121212]">npm run dev</code>).
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest text-center mb-2">
                          Nhập mã OTP 6 số
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="••••••"
                          required
                          autoFocus
                          className="w-full text-center tracking-[12px] text-2xl font-black py-3 bg-[#F7F4EB] border-2 border-[#121212] focus:border-[#6B8045] focus:bg-white rounded-xl outline-none shadow-[2px_2px_0_#121212] text-[#121212]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifying || otpCode.length !== 6}
                        className="w-full h-12 bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                      >
                        {isVerifying ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang kích hoạt...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                            <span>Xác nhận & Kích hoạt</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500">Chưa nhận được mã?</span>
                        <button
                          type="button"
                          disabled={cooldown > 0 || isResending}
                          onClick={handleResendOtp}
                          className="font-bold text-[#6B8045] hover:text-[#1A2616] disabled:text-slate-400 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw
                            className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`}
                          />
                          <span>
                            {cooldown > 0 ? `Gửi lại sau (${cooldown}s)` : "Gửi lại mã OTP"}
                          </span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={handleCloseModal}
        onBackToLogin={() => {
          setIsForgotPasswordOpen(false);
          setMode("login");
        }}
      />
    </>
  );
}
