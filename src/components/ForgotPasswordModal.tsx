"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  KeyRound,
  Shield,
  ArrowLeft,
  ArrowRight,
  X,
  RotateCcw,
  CheckCircle2,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin?: () => void;
}

type Step = "method" | "input" | "otp" | "reset" | "recovery";

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onBackToLogin,
}: ForgotPasswordModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<"email" | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Reset state when modal is opened or closed
  useEffect(() => {
    if (!isOpen) {
      setStep("method");
      setMethod(null);
      setEmail("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setRecoveryKey("");
      setRecoveryEmail("");
      setResetToken(null);
      setCountdown(0);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleFullClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleFullClose = () => {
    setStep("method");
    setMethod(null);
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setRecoveryKey("");
    setRecoveryEmail("");
    setResetToken(null);
    setCountdown(0);
    onClose();
  };

  const handleReturnToLogin = () => {
    setStep("method");
    setMethod(null);
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setRecoveryKey("");
    setRecoveryEmail("");
    setResetToken(null);
    setCountdown(0);
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      onClose();
    }
  };

  const handleMethodSelect = () => {
    setMethod("email");
    setStep("input");
  };

  const handleSendOTP = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Vui lòng nhập địa chỉ email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Định dạng email không hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "email",
          email: trimmedEmail,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Mã OTP đã được gửi đến email của bạn");
        setStep("otp");
        setCountdown(60);
        if (data.otp) {
          console.log("[DEV] OTP:", data.otp);
        }
      } else {
        toast.error(data.message || "Không thể gửi mã OTP");
      }
    } catch {
      toast.error("Đã có lỗi xảy ra. Vui lòng thử lại sau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      toast.error("Vui lòng nhập đầy đủ 6 chữ số OTP");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "email",
          email: email.trim(),
          otp: trimmedOtp,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResetToken(data.resetToken);
        setStep("reset");
        toast.success(data.message || "Xác thực OTP thành công!");
      } else {
        toast.error(data.message || "Mã OTP không chính xác");
        if (data.remainingAttempts !== undefined) {
          toast.error(`Còn lại ${data.remainingAttempts} lần thử`);
        }
      }
    } catch {
      toast.error("Đã có lỗi xảy ra. Vui lòng thử lại sau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (!resetToken) {
      toast.error("Phiên xác thực đã hết hạn. Vui lòng thử lại");
      setStep("input");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
        setTimeout(() => {
          handleReturnToLogin();
        }, 1200);
      } else {
        toast.error(data.message || "Đặt lại mật khẩu thất bại");
      }
    } catch {
      toast.error("Đã có lỗi xảy ra. Vui lòng thử lại sau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryKey = async () => {
    const cleanKey = recoveryKey.replace(/[^A-Za-z0-9]/g, "").trim().toUpperCase();
    if (!cleanKey || cleanKey.length !== 16) {
      toast.error("Recovery key phải có đúng 16 ký tự");
      return;
    }
    const cleanEmail = recoveryEmail.trim();
    if (!cleanEmail) {
      toast.error("Vui lòng nhập địa chỉ email");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/recovery-key/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoveryKey: cleanKey,
          email: cleanEmail,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Khôi phục tài khoản thành công!");
        if (data.warning) {
          toast.error(data.warning);
        }
        setTimeout(() => {
          handleReturnToLogin();
        }, 1200);
      } else {
        toast.error(data.message || "Recovery key hoặc email không hợp lệ");
      }
    } catch {
      toast.error("Đã có lỗi xảy ra. Vui lòng thử lại sau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleSendOTP();
  };

  const handleBack = () => {
    if (step === "input") {
      setStep("method");
    } else if (step === "otp") {
      setStep("input");
      setOtp("");
    } else if (step === "reset") {
      setStep("otp");
      setNewPassword("");
      setConfirmPassword("");
    } else if (step === "recovery") {
      setStep("method");
      setRecoveryKey("");
      setRecoveryEmail("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  if (!isOpen) return null;

  const emailSteps: Step[] = ["method", "input", "otp", "reset"];
  const currentStepIdx = emailSteps.indexOf(step);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={handleFullClose}
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
          {/* Header: Forest Moss Banner */}
          <div className="bg-[#1A2616] px-6 py-4 flex items-center justify-between border-b-2 border-[#121212]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFD23F] border border-[#121212] flex items-center justify-center shadow-[2px_2px_0_#121212]">
                <span className="text-[#121212] font-black text-xs">NL</span>
              </div>
              <div>
                <p className="text-white font-black text-sm leading-none">NikaLearn</p>
                <p className="text-[#FFD23F] text-[10px] font-bold mt-1 flex items-center gap-1">
                  Khôi phục tài khoản
                </p>
              </div>
            </div>

            <button
              onClick={handleFullClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Top Icon and Title */}
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-[#FFD23F] border-2 border-[#121212] rounded-2xl flex items-center justify-center shadow-[3px_3px_0_#121212]">
                {step === "recovery" ? (
                  <Shield className="w-7 h-7 text-[#121212]" />
                ) : (
                  <Lock className="w-7 h-7 text-[#121212]" />
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#121212] tracking-tight">
                {step === "recovery" ? "Khôi phục bằng Recovery Key" : "Quên mật khẩu"}
              </h2>
              <p className="text-slate-600 text-xs font-semibold mt-1 max-w-sm mx-auto">
                {step === "method" && "Chọn phương thức thuận tiện để lấy lại quyền truy cập tài khoản"}
                {step === "input" && "Nhập email đăng ký tài khoản để nhận mã xác thực OTP"}
                {step === "otp" && "Nhập mã 6 chữ số đã được gửi tới hộp thư của bạn"}
                {step === "reset" && "Tạo mật khẩu mới an toàn cho tài khoản của bạn"}
                {step === "recovery" && "Dùng khóa khôi phục 16 ký tự khi không thể nhận email"}
              </p>
            </div>

            {/* Stepper (Only for Email flow) */}
            {step !== "recovery" && (
              <div className="flex items-center justify-center gap-1.5 pt-1 pb-2">
                {emailSteps.map((s, index) => {
                  const isCompleted = currentStepIdx > index;
                  const isActive = currentStepIdx === index;
                  return (
                    <div key={s} className="flex items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          isCompleted
                            ? "bg-[#6B8045] text-white border-2 border-[#121212]"
                            : isActive
                            ? "bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[2px_2px_0_#121212]"
                            : "bg-[#F7F4EB] text-slate-400 border border-slate-300"
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : index + 1}
                      </div>
                      {index < emailSteps.length - 1 && (
                        <div
                          className={`w-6 sm:w-8 h-1 mx-1 rounded-full transition-colors ${
                            currentStepIdx > index ? "bg-[#6B8045]" : "bg-slate-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* STEP 1: METHOD SELECTION */}
            <AnimatePresence mode="wait">
              {step === "method" && (
                <motion.div
                  key="method"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 pt-1"
                >
                  {/* Card 1: Email */}
                  <button
                    type="button"
                    onClick={handleMethodSelect}
                    className="w-full p-4 bg-[#F7F4EB] hover:bg-white border-2 border-[#121212] rounded-2xl shadow-[3px_3px_0_#121212] hover:shadow-[5px_5px_0_#121212] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_#121212] transition-all flex items-center gap-4 text-left cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#6B8045] border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0_#121212] text-white shrink-0">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-sm text-[#121212] group-hover:text-[#6B8045] transition-colors">
                        Gửi mã OTP qua Email
                      </div>
                      <div className="text-xs font-semibold text-slate-600 mt-0.5">
                        Nhận mã xác thực 6 số an toàn qua hộp thư điện tử
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#121212] group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>

                  {/* Divider */}
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#121212]/15" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#FFFDF9] px-3 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Hoặc phương án dự phòng
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Recovery Key */}
                  <button
                    type="button"
                    onClick={() => setStep("recovery")}
                    className="w-full p-4 bg-[#F7F4EB] hover:bg-white border-2 border-[#121212] rounded-2xl shadow-[3px_3px_0_#121212] hover:shadow-[5px_5px_0_#121212] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_#121212] transition-all flex items-center gap-4 text-left cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#FFD23F] border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0_#121212] text-[#121212] shrink-0">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-sm text-[#121212] group-hover:text-[#1A2616] transition-colors">
                        Sử dụng Recovery Key
                      </div>
                      <div className="text-xs font-semibold text-slate-600 mt-0.5">
                        Khôi phục khẩn cấp bằng mã 16 ký tự đã lưu trước đó
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#121212] group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>

                  {/* Back to Login link */}
                  <div className="pt-3 text-center">
                    <button
                      type="button"
                      onClick={handleReturnToLogin}
                      className="text-xs font-bold text-[#6B8045] hover:text-[#1A2616] underline underline-offset-4 cursor-pointer transition-colors"
                    >
                      Đã nhớ mật khẩu? Đăng nhập ngay
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: INPUT EMAIL */}
              {step === "input" && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="forgot-email"
                      className="block text-[11px] font-black text-slate-700 uppercase tracking-widest pl-1"
                    >
                      Địa chỉ Email tài khoản
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                      <input
                        type="email"
                        id="forgot-email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 h-[48px] bg-white hover:bg-[#F7F4EB] text-[#121212] font-black text-xs uppercase tracking-wider rounded-xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={isLoading || !email.trim()}
                      className="flex-[1.5] h-[48px] bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        <>
                          <span>Gửi mã OTP</span>
                          <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: VERIFY OTP */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="p-3 bg-[#F7F4EB] border-2 border-[#121212] rounded-xl text-center">
                    <p className="text-xs font-semibold text-slate-700">
                      Mã xác thực đã được gửi tới:
                    </p>
                    <p className="text-sm font-black text-[#121212] mt-0.5 break-all">
                      {email}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="forgot-otp"
                      className="block text-[11px] font-black text-slate-700 uppercase tracking-widest text-center"
                    >
                      Nhập mã 6 chữ số
                    </label>
                    <input
                      type="text"
                      id="forgot-otp"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(val);
                      }}
                      placeholder="000000"
                      className="w-full px-4 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-center text-2xl tracking-[0.4em] font-mono font-black text-[#121212] placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>

                  {/* Resend Timer */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-slate-500">Chưa nhận được mã?</span>
                    <button
                      type="button"
                      disabled={countdown > 0 || isLoading}
                      onClick={handleResendOTP}
                      className="font-bold text-[#6B8045] hover:text-[#1A2616] disabled:text-slate-400 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      <span>{countdown > 0 ? `Gửi lại sau (${countdown}s)` : "Gửi lại mã OTP"}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 h-[48px] bg-white hover:bg-[#F7F4EB] text-[#121212] font-black text-xs uppercase tracking-wider rounded-xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOTP}
                      disabled={isLoading || otp.length !== 6}
                      className="flex-[1.5] h-[48px] bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang xác thực...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                          <span>Xác thực mã</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: RESET PASSWORD */}
              {step === "reset" && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3.5"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="forgot-new-pass"
                      className="block text-[11px] font-black text-slate-700 uppercase tracking-widest pl-1"
                    >
                      Mật khẩu mới (tối thiểu 6 ký tự)
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="forgot-new-pass"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-12 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="forgot-confirm-pass"
                      className="block text-[11px] font-black text-slate-700 uppercase tracking-widest pl-1"
                    >
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="forgot-confirm-pass"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-12 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 h-[48px] bg-white hover:bg-[#F7F4EB] text-[#121212] font-black text-xs uppercase tracking-wider rounded-xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      className="flex-[1.5] h-[48px] bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                          <span>Đặt lại mật khẩu</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: RECOVERY KEY */}
              {step === "recovery" && (
                <motion.div
                  key="recovery"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3.5"
                >
                  <div className="p-3.5 bg-[#FFD23F]/20 border-2 border-[#121212] rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-[#121212] shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-[#121212] leading-relaxed">
                      Recovery key chỉ có thể dùng 1 lần. Hãy cập nhật key mới sau khi đăng nhập thành công.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="rec-email"
                      className="block text-[11px] font-black text-slate-700 uppercase tracking-widest pl-1"
                    >
                      Email tài khoản
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                      <input
                        type="email"
                        id="rec-email"
                        required
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="rec-key"
                      className="block text-[11px] font-black text-slate-700 uppercase tracking-widest pl-1"
                    >
                      Recovery Key (16 ký tự)
                    </label>
                    <div className="relative group">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                      <input
                        type="text"
                        id="rec-key"
                        maxLength={16}
                        value={recoveryKey}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase();
                          setRecoveryKey(val);
                        }}
                        placeholder="ABCD1234EFGH5678"
                        className="w-full pl-10 pr-4 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-mono font-black tracking-wider text-[#121212] placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="rec-new-pass"
                      className="block text-[11px] font-black text-slate-700 uppercase tracking-widest pl-1"
                    >
                      Mật khẩu mới
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="rec-new-pass"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-12 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="rec-confirm-pass"
                      className="block text-[11px] font-black text-slate-700 uppercase tracking-widest pl-1"
                    >
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6B8045] transition-colors" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="rec-confirm-pass"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-12 py-3 bg-[#F7F4EB] border-2 border-transparent focus:border-[#6B8045] focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-[#121212] placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 h-[48px] bg-white hover:bg-[#F7F4EB] text-[#121212] font-black text-xs uppercase tracking-wider rounded-xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRecoveryKey}
                      disabled={isLoading || recoveryKey.length !== 16 || !recoveryEmail || !newPassword || newPassword !== confirmPassword}
                      className="flex-[1.5] h-[48px] bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_3px_0_#121212] border-2 border-[#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang khôi phục...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                          <span>Khôi phục</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
