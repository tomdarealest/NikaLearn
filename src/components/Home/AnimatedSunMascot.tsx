"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MOTIVATIONAL_QUOTES = [
  "Đừng để sự lười biếng đánh gục bạn, NikaLearn tiếp sức cho bạn ngay đây! ☀️",
  "Mỗi ngày học 1 chút là bạn đã vượt qua 80% người khác rồi! 🚀",
  "Hôm nay bạn đã luyện đề TOEIC hay Code chưa? Bắt đầu ngay nhé! 🔥",
  "Cố lên bạn ơi, mục tiêu không còn xa nữa đâu! Cùng bứt phá thôi! 💪",
  "Kiến thức là chìa khóa thành công. Chúc bạn một ngày học thật vui! ✨",
];

export default function AnimatedSunMascot() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isWinking, setIsWinking] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const sunRef = useRef<HTMLDivElement>(null);

  // Mouse eye tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sunRef.current) return;
      const rect = sunRef.current.getBoundingClientRect();
      const sunCenterX = rect.left + rect.width / 2;
      const sunCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - sunCenterX;
      const deltaY = e.clientY - sunCenterY;
      const distance = Math.hypot(deltaX, deltaY);

      const maxEyeShift = 8; // Max px eyes can shift
      if (distance > 0) {
        const factor = Math.min(distance / 350, 1) * maxEyeShift;
        const angle = Math.atan2(deltaY, deltaX);
        setEyeOffset({
          x: Math.cos(angle) * factor,
          y: Math.sin(angle) * factor,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Natural blinking effect every 3.8s
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    setIsWinking(true);
    setTimeout(() => setIsWinking(false), 350);
  };

  return (
    <div
      ref={sunRef}
      className="relative w-full max-w-[480px] sm:max-w-[540px] lg:max-w-[580px] flex flex-col items-center justify-end select-none pointer-events-auto"
    >
      {/* 1. BONG BÓNG THOẠI (SPEECH BUBBLE) - Nằm lệch góc trên bên trái mặt trời như The IELTS Dictionary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
        transition={{
          y: { repeat: Infinity, duration: 3.5, ease: "easeInOut" },
          opacity: { duration: 0.4 },
        }}
        onClick={handleNextQuote}
        className="absolute -top-10 left-2 sm:-left-12 lg:-left-20 xl:-left-24 z-30 max-w-[240px] sm:max-w-[290px] cursor-pointer group"
        title="Nhấp để đổi lời động viên mới!"
      >
        <div className="relative bg-white text-[#121212] p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border-[3px] border-[#121212] shadow-[4px_4px_0_#121212] group-hover:shadow-[6px_6px_0_#121212] group-hover:-translate-y-0.5 group-active:translate-y-0 group-active:shadow-[2px_2px_0_#121212] transition-all">
          <AnimatePresence mode="wait">
            <motion.p
              key={quoteIndex}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18 }}
              className="text-xs sm:text-[13px] font-black leading-snug text-slate-800"
            >
              {MOTIVATIONAL_QUOTES[quoteIndex]}
            </motion.p>
          </AnimatePresence>

          {/* Đuôi bong bóng thoại trỏ xéo xuống mặt trời */}
          <div className="absolute -bottom-3 right-8 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-[#121212]" />
          <div className="absolute -bottom-[9px] right-8 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
        </div>
      </motion.div>

      {/* 2. ÔNG MẶT TRỜI (THE SUN MASCOT) */}
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 4,
          ease: "easeInOut",
        }}
        onClick={handleNextQuote}
        className="relative flex items-center justify-center cursor-pointer -mb-10 sm:-mb-16 lg:-mb-20"
        title="Chào bạn! Nhấp vào mình nhé ☀️"
      >
        {/* Vành tia nắng răng cưa màu cam sẫm xoay nhấp nhô */}
        <motion.div
          animate={{
            rotate: [0, 5, 0, -5, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 14,
            ease: "easeInOut",
          }}
          className="relative w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] lg:w-[480px] lg:h-[480px] flex items-center justify-center"
        >
          {/* SVG Sun Rays */}
          <svg
            viewBox="0 0 500 500"
            className="w-full h-full drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-visible"
          >
            <path
              d={createSunRaysPath(250, 250, 245, 210, 32)}
              fill="#E59828"
              stroke="#121212"
              strokeWidth="7"
              strokeLinejoin="round"
            />
          </svg>

          {/* Khuôn mặt mặt trời vàng óng (Inner Dome) */}
          <div className="absolute inset-[32px] sm:inset-[42px] lg:inset-[46px] bg-[#FAB839] rounded-full border-[7px] border-[#121212] overflow-hidden flex flex-col items-center justify-center shadow-[inset_0_-14px_24px_rgba(217,119,6,0.35)]">
            {/* Vết vệt sáng highlight */}
            <div className="absolute top-5 left-10 w-28 h-14 bg-white/25 rounded-full rotate-[-28deg] blur-xs pointer-events-none" />

            {/* Khung khuôn mặt (Mắt & Miệng) */}
            <div className="relative w-48 sm:w-56 lg:w-64 h-36 flex flex-col items-center justify-center -mt-4 sm:-mt-8">
              {/* Hàng mắt & má hồng */}
              <div className="relative w-full flex items-center justify-between px-7 sm:px-9 mb-3">
                {/* Má hồng trái */}
                <div className="absolute left-2.5 top-3 w-8 h-4 rounded-full bg-[#FF7A8A]/40 blur-[1px]" />

                {/* Mắt trái */}
                <div
                  className="relative w-6 h-8 sm:w-7 sm:h-9 bg-[#121212] rounded-full overflow-hidden transition-transform duration-75"
                  style={{
                    transform: isBlinking || isWinking
                      ? "scaleY(0.1)"
                      : `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                  }}
                >
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-white rounded-full" />
                </div>

                {/* Mắt phải */}
                <div
                  className="relative w-6 h-8 sm:w-7 sm:h-9 bg-[#121212] rounded-full overflow-hidden transition-transform duration-75"
                  style={{
                    transform: isBlinking
                      ? "scaleY(0.1)"
                      : isWinking
                      ? "scaleY(0.1) rotate(10deg)"
                      : `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                  }}
                >
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-white rounded-full" />
                </div>

                {/* Má hồng phải */}
                <div className="absolute right-2.5 top-3 w-8 h-4 rounded-full bg-[#FF7A8A]/40 blur-[1px]" />
              </div>

              {/* Nụ cười tươi tắn */}
              <div className="flex items-center justify-center -mt-1">
                <svg width="76" height="36" viewBox="0 0 76 36" className="overflow-visible">
                  <path
                    d="M 12 7 Q 38 36 64 7"
                    fill="none"
                    stroke="#121212"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 8 Q 12 2 16 5"
                    fill="none"
                    stroke="#121212"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 66 8 Q 64 2 60 5"
                    fill="none"
                    stroke="#121212"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Tạo đường dẫn SVG polygon dạng tia nắng răng cưa (Sunburst teeth)
 */
function createSunRaysPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points: number
): string {
  let path = "";
  const step = Math.PI / points;

  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    if (i === 0) {
      path += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }

  path += " Z";
  return path;
}
