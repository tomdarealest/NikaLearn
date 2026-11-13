"use client";

import { motion } from "framer-motion";

export default function BottomCloudWaves() {
  // Tạo chuỗi đường cong mây bọt sóng nhấp nhô liên tục (scalloped cloud waves)
  const waveWidth = 44;
  const count = 48; // Đủ rộng cho mọi màn hình lớn

  let backPath = "M -44 32";
  for (let i = -1; i <= count + 1; i++) {
    const startX = i * waveWidth;
    const midX = startX + waveWidth / 2;
    const endX = startX + waveWidth;
    backPath += ` Q ${midX} 10, ${endX} 32`;
  }
  backPath += " L 2200 70 L -44 70 Z";

  let frontPath = "M -44 32";
  for (let i = -1; i <= count + 1; i++) {
    const startX = i * waveWidth;
    const midX = startX + waveWidth / 2;
    const endX = startX + waveWidth;
    frontPath += ` Q ${midX} 6, ${endX} 32`;
  }
  frontPath += " L 2200 70 L -44 70 Z";

  return (
    <div className="absolute bottom-0 left-0 right-0 h-11 sm:h-14 pointer-events-none z-20 overflow-hidden leading-none">
      {/* 1. Lớp sóng mây phụ phía sau (màu trắng sữa nhạt, trôi nhẹ) */}
      <motion.div
        animate={{ x: [0, -44, 0] }}
        transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
        className="absolute inset-0 w-[120%] opacity-80"
      >
        <svg
          viewBox="0 0 1920 60"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <path
            d={backPath}
            fill="#FFFFFF"
            fillOpacity="0.75"
            stroke="#121212"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      {/* 2. Lớp sóng mây chính phía trước (Trắng tinh khôi, viền đen nét chuẩn giống hệt The IELTS Dictionary) */}
      <motion.div
        animate={{ x: [-22, 10, -22] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="absolute inset-0 w-[120%]"
      >
        <svg
          viewBox="0 0 1920 60"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <path
            d={frontPath}
            fill="#FFFFFF"
            stroke="#121212"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}
