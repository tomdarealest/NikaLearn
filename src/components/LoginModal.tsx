"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";
import Modal from "./Modal";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const { login, verifyAccount, resendActivationOtp, isLoading } = useAuth();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);

  // Unverified account handling
  const [unverifiedUser, setUnverifiedUser] = useState<any | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Social Login handler
  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      setIsSocialLoading(provider);
      if (!supabase) {
        toast.error("Chưa kết nối dịch vụ xác thực Supabase");
        return;
      }

      if (typeof document !== "undefined") {
        document.cookie = `oauth_intent=login; path=/; max-age=300; SameSite=Lax`;
        document.cookie = `oauth_provider=${provider}; path=/; max-age=300; SameSite=Lax`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?intent=login&provider=${provider}`,
        },
      });

      if (error) {
        toast.error(error.message || `Không thể kết nối với dịch vụ ${provider}`);
      }
    } catch (err: any) {
      toast.error(err.message || `Đã xảy ra lỗi khi đăng nhập bằng ${provider}`);
    } finally {
      setIsSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(formData.identifier, formData.password, rememberMe);
      toast.success("Đăng nhập thành công! Chào mừng bạn quay trở lại.");
      onClose();
      setFormData({ identifier: "", password: "" });
      setUnverifiedUser(null);
    } catch (err: any) {
      if (err.notVerified) {
        setUnverifiedUser(err.data);
        toast.error(err.message || "Tài khoản chưa kích hoạt. Vui lòng nhập mã OTP để tiếp tục.");
      } else {
        const errorMessage = err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
        toast.error(errorMessage);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 chữ số OTP");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyAccount({
        userId: unverifiedUser?.userId,
        email: unverifiedUser?.email,
        phone: unverifiedUser?.phone,
        otp: otpCode,
      });

      toast.success("Kích hoạt và đăng nhập thành công!");
      setUnverifiedUser(null);
      setOtpCode("");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Mã xác thực không hợp lệ");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendActivationOtp({
        userId: unverifiedUser?.userId,
        email: unverifiedUser?.email,
        phone: unverifiedUser?.phone,
      });
      toast.success("Đã gửi lại mã OTP mới!");
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi lại mã OTP");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSwitchToRegister = () => {
    onClose();
    if (onSwitchToRegister) {
      onSwitchToRegister();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={true}
      closeOnBackdropClick={true}
    >
      <div className="-m-6 md:-m-7">
        {/* TID Top Banner Header */}
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
          <div className="flex bg-black/30 rounded-full p-1 gap-1 border border-white/10">
            <button className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-[#1A2616] shadow-sm">
              Đăng nhập
            </button>
            <button
              onClick={handleSwitchToRegister}
              className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Đăng ký
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-7 space-y-4 bg-[#FFFDF9]">
          {!unverifiedUser ? (
            <>
              <div>
                <h2 className="text-xl font-black text-[#121212] tracking-tight">Chào mừng trở lại 👋</h2>
                <p className="text-muted-foreground text-xs font-semibold mt-1">
                  Đăng nhập bằng Email, Số điện thoại hoặc Tên đăng nhập.
                </p>
              </div>

              {/* Social Login Button: Google Only */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={!!isSocialLoading}
                  className="w-full h-11 px-4 rounded-xl border-2 border-[#121212] bg-white hover:bg-slate-50 font-bold text-xs text-[#121212] shadow-[2px_2px_0_#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSocialLoading === 'google' ? (
                    <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>Đăng nhập nhanh với Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-[#FFFDF9] px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 absolute">
                  hoặc tài khoản nikalearn
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Identifier Field */}
                <div className="space-y-1">
                  <label htmlFor="identifier" className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1">
                    Email / Số điện thoại / Tên đăng nhập
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                    <input
                      type="text"
                      id="identifier"
                      name="identifier"
                      value={formData.identifier}
                      onChange={handleChange}
                      autoComplete="username"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                      placeholder="email@example.com hoặc 0912345678"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between pl-1 pr-1">
                    <label htmlFor="password" className="block text-[10px] font-black text-slate-700 uppercase tracking-widest">
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
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-12 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center pt-0.5">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-[#6B8045] bg-white border-2 border-[#121212] rounded cursor-pointer"
                  />
                  <label htmlFor="remember" className="ml-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Ghi nhớ đăng nhập 30 ngày
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập ngay</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Unverified Account OTP screen */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-800">Tài khoản chưa được kích hoạt</p>
                  <p className="text-amber-700 mt-0.5">
                    Vui lòng nhập mã OTP 6 số để kích hoạt tài khoản của bạn.
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest text-center mb-1.5">
                    Nhập mã OTP 6 số
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    required
                    autoFocus
                    className="w-full text-center tracking-[12px] text-2xl font-black py-2.5 bg-[#F7F4EB] border-2 border-[#121212] focus:border-[#6B8045] focus:bg-white rounded-xl outline-none shadow-[2px_2px_0_#121212] text-[#121212]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || otpCode.length !== 6}
                  className="w-full h-11 bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isVerifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận & Đăng nhập</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setUnverifiedUser(null)}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    ← Quay lại đăng nhập
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={handleResendOtp}
                    className="font-bold text-[#6B8045] hover:text-[#1A2616] disabled:text-slate-400 cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã OTP'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TID Security Badge Footer */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B8045]"></span>
            Hệ thống bảo vệ tài khoản NikaLearn 2026
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </Modal>
  );
}
