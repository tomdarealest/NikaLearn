"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Phone, Lock, User, UserCircle, Eye, EyeOff, 
  ArrowRight, CheckCircle2, Shield, KeyRound, RotateCcw, ArrowLeft 
} from "lucide-react";
import Modal from "./Modal";
import RecoveryKeysModal from "./RecoveryKeysModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const { register, verifyAccount, resendActivationOtp, isLoading } = useAuth();
  const toast = useToast();
  
  // Method: 'email' | 'phone'
  const [registerMethod, setRegisterMethod] = useState<'email' | 'phone'>('email');

  // Step: 'form' | 'otp'
  const [step, setStep] = useState<'form' | 'otp'>('form');

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    username: "",
    full_name: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryKeys, setRecoveryKeys] = useState<string[]>([]);
  const [showRecoveryKeysModal, setShowRecoveryKeysModal] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [registeredUserId, setRegisteredUserId] = useState<string>("");
  const [registeredTarget, setRegisteredTarget] = useState<string>("");
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, cooldown]);

  // Social OAuth Handler (Google & Facebook)
  const handleOAuthRegister = async (provider: 'google' | 'facebook') => {
    try {
      setIsSocialLoading(provider);
      if (!supabase) {
        toast.error("Chưa kết nối dịch vụ xác thực Supabase");
        return;
      }

      if (typeof document !== "undefined") {
        document.cookie = `oauth_intent=register; path=/; max-age=300; SameSite=Lax`;
        document.cookie = `oauth_provider=${provider}; path=/; max-age=300; SameSite=Lax`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?intent=register&provider=${provider}`,
        },
      });

      if (error) {
        toast.error(error.message || `Không thể kết nối dịch vụ ${provider}`);
      }
    } catch (err: any) {
      toast.error(err.message || `Đã xảy ra lỗi khi đăng ký bằng ${provider}`);
    } finally {
      setIsSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      toast.error("Mật khẩu phải chứa chữ hoa, chữ thường và số");
      return;
    }

    if (registerMethod === 'phone') {
      const cleanPhone = formData.phone.trim();
      if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleanPhone)) {
        toast.error("Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)");
        return;
      }
    }

    try {
      const response = await register({
        registerMethod,
        email: registerMethod === 'email' ? formData.email.trim() : undefined,
        phone: registerMethod === 'phone' ? formData.phone.trim() : undefined,
        password: formData.password,
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
      });

      if (response && response.needVerification) {
        toast.success("Đăng ký thành công! Vui lòng nhập mã OTP để kích hoạt.");
        setRegisteredUserId(response.data?.userId || "");
        setRegisteredTarget(response.data?.target || (registerMethod === 'email' ? formData.email : formData.phone));
        if (response.data?.recoveryKeys) {
          setRecoveryKeys(response.data.recoveryKeys);
        }
        setStep('otp');
        setCooldown(60);
      } else {
        toast.success("Đăng ký thành công!");
        onClose();
        if (onSwitchToLogin) onSwitchToLogin();
      }
    } catch (err: any) {
      const errorMessage = err.message || "Đăng ký thất bại. Vui lòng thử lại.";
      toast.error(errorMessage);
    }
  };

  // Verify OTP submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Vui lòng nhập đầy đủ 6 chữ số OTP");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyAccount({
        userId: registeredUserId,
        otp: otpCode,
      });

      toast.success("Kích hoạt tài khoản thành công! Chào mừng bạn.");

      if (recoveryKeys.length > 0) {
        // Show recovery keys modal
        setShowRecoveryKeysModal(true);
      } else {
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Mã xác thực không đúng hoặc đã hết hạn");
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    try {
      await resendActivationOtp({
        userId: registeredUserId,
      });
      toast.success("Mã OTP mới đã được gửi!");
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi lại mã OTP");
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSwitchToLogin = () => {
    onClose();
    if (onSwitchToLogin) {
      onSwitchToLogin();
    }
  };

  const handleRecoveryKeysModalClose = () => {
    setShowRecoveryKeysModal(false);
    setRecoveryKeys([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton={true}
      closeOnBackdropClick={true}
    >
      <div className="-m-6 md:-m-7">
        {/* Top Header Banner */}
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
            <button
              onClick={handleSwitchToLogin}
              className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Đăng nhập
            </button>
            <button className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-[#1A2616] shadow-sm">
              Đăng ký
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-7 space-y-5 bg-[#FFFDF9]">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-xl font-black text-[#121212] tracking-tight">Tạo tài khoản mới ✨</h2>
                  <p className="text-muted-foreground text-xs font-semibold mt-1">
                    Bắt đầu lộ trình chinh phục chứng chỉ TOEIC & CNTT cùng NikaLearn.
                  </p>
                </div>

                {/* Social Login Button: Google Only */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleOAuthRegister('google')}
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
                    <span>Đăng ký nhanh với Google</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-[#FFFDF9] px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 absolute">
                    hoặc đăng ký bằng
                  </span>
                </div>

                {/* Register Method Tabs */}
                <div className="grid grid-cols-2 p-1 bg-[#F7F4EB] rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRegisterMethod('email')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      registerMethod === 'email'
                        ? 'bg-white text-[#121212] shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterMethod('phone')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      registerMethod === 'phone'
                        ? 'bg-white text-[#121212] shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Số điện thoại</span>
                  </button>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Full Name Field */}
                    <div className="space-y-1">
                      <label htmlFor="full_name" className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1">
                        Họ và tên
                      </label>
                      <div className="relative group">
                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleChange}
                          autoComplete="name"
                          required
                          className="w-full pl-9 pr-3 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                          placeholder="Nguyễn Văn A"
                        />
                      </div>
                    </div>

                    {/* Username Field */}
                    <div className="space-y-1">
                      <label htmlFor="username" className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1">
                        Tên đăng nhập
                      </label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          autoComplete="username"
                          required
                          className="w-full pl-9 pr-3 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                          placeholder="nguyen_van_a"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email or Phone field based on tab */}
                  {registerMethod === 'email' ? (
                    <div className="space-y-1">
                      <label htmlFor="email" className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1">
                        Địa chỉ Email
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          autoComplete="email"
                          required
                          className="w-full pl-9 pr-3 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                          placeholder="student@example.com"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label htmlFor="phone" className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1">
                        Số điện thoại
                      </label>
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          autoComplete="tel"
                          required
                          className="w-full pl-9 pr-3 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                          placeholder="0912345678"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 pl-1">Hệ thống sẽ gửi mã xác thực SMS qua số điện thoại này</p>
                    </div>
                  )}

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label htmlFor="password" className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1">
                        Mật khẩu
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          autoComplete="new-password"
                          required
                          className="w-full pl-9 pr-10 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="confirmPassword" className="block text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1">
                        Xác nhận mật khẩu
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          autoComplete="new-password"
                          required
                          className="w-full pl-9 pr-10 py-2.5 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-xs font-semibold text-[#121212] placeholder:text-slate-400"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang xử lý đăng ký...</span>
                      </>
                    ) : (
                      <>
                        <span>Tạo tài khoản & Nhận mã kích hoạt</span>
                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              /* Step 2: OTP Verification */
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#121212] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại thông tin đăng ký</span>
                </button>

                <div className="text-center py-2">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] mx-auto flex items-center justify-center shadow-[3px_3px_0_#121212] mb-3">
                    <KeyRound className="w-7 h-7 text-[#121212]" />
                  </div>
                  <h2 className="text-xl font-black text-[#121212] tracking-tight">Kích hoạt tài khoản</h2>
                  <p className="text-muted-foreground text-xs font-medium mt-1.5 max-w-sm mx-auto">
                    Mã xác thực OTP gồm 6 chữ số đã được gửi đến:
                    <span className="block font-bold text-[#121212] mt-0.5">{registeredTarget}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4 max-w-sm mx-auto">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest text-center mb-2">
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
                        <span>Đang xác thực...</span>
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
                      <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                      <span>{cooldown > 0 ? `Gửi lại sau (${cooldown}s)` : 'Gửi lại mã OTP'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Security Badge */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B8045]"></span>
            Thông tin được mã hóa bảo mật 256-bit
          </div>
        </div>
      </div>

      {/* Recovery Keys Modal */}
      <RecoveryKeysModal
        isOpen={showRecoveryKeysModal}
        onClose={handleRecoveryKeysModalClose}
        recoveryKeys={recoveryKeys}
      />
    </Modal>
  );
}
