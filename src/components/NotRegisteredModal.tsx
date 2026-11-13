"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, AlertTriangle, ArrowRight } from "lucide-react";

interface NotRegisteredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToRegister: () => void;
  email?: string | null;
}

export default function NotRegisteredModal({
  isOpen,
  onClose,
  onGoToRegister,
  email,
}: NotRegisteredModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
        style={{ isolation: "isolate" }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
          className="w-full max-w-[440px] bg-[#FFFDF9] rounded-[26px] border-2 border-[#121212] shadow-[6px_6px_0_#121212] overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-[#1A2616] px-5 py-4 flex items-center justify-between border-b-2 border-[#121212]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FFD23F] border border-[#121212] flex items-center justify-center shadow-[1.5px_1.5px_0_#121212]">
                <AlertTriangle className="w-4 h-4 text-[#121212] stroke-[2.5]" />
              </div>
              <div>
                <p className="text-white font-black text-sm">Chưa có tài khoản</p>
                <p className="text-[#FFD23F] text-[10px] font-bold">Thông báo xác thực</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white hover:bg-[#FFD23F] border border-[#121212] flex items-center justify-center transition-all cursor-pointer shadow-[1.5px_1.5px_0_#121212] active:translate-y-0.5"
            >
              <X className="w-3.5 h-3.5 text-[#121212]" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="bg-[#F7F4EB] p-4 rounded-2xl border-2 border-[#121212]/15 space-y-2">
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                Tài khoản Google {email ? <span className="font-bold text-[#121212]">({email})</span> : ""} chưa từng được đăng ký trong hệ thống NikaLearn.
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Theo quy định, bạn cần chọn <span className="font-black text-[#6B8045]">"Đăng ký bằng Google"</span> trước ở lần đầu tiên để khởi tạo tài khoản học viên nhé!
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToRegister();
                }}
                className="w-full h-[48px] bg-[#6B8045] hover:bg-[#1A2616] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_4px_0_#121212] border-2 border-[#121212] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Đi đến Đăng ký ngay</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-[42px] bg-white hover:bg-[#F7F4EB] text-slate-700 font-bold text-xs uppercase tracking-wider rounded-2xl border border-[#121212]/20 transition-all flex items-center justify-center cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
