"use client";

import { motion } from "framer-motion";

export default function FloatingSkyClouds() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Cloud 1: Góc trên bên trái */}
      <motion.div
        animate={{
          x: [-20, 25, -20],
          y: [-6, 6, -6],
        }}
        transition={{
          repeat: Infinity,
          duration: 14,
          ease: "easeInOut",
        }}
        className="absolute top-8 left-[6%] w-48 sm:w-64 opacity-85"
      >
        <CloudSvg />
      </motion.div>

      {/* Cloud 2: Góc trên bên phải */}
      <motion.div
        animate={{
          x: [25, -20, 25],
          y: [-8, 8, -8],
        }}
        transition={{
          repeat: Infinity,
          duration: 16,
          ease: "easeInOut",
        }}
        className="absolute top-12 right-[8%] w-56 sm:w-72 opacity-90"
      >
        <CloudSvg />
      </motion.div>

      {/* Cloud 3: Tầng giữa bên trái (nhỏ hơn, mờ nhẹ) */}
      <motion.div
        animate={{
          x: [-15, 20, -15],
          y: [6, -6, 6],
        }}
        transition={{
          repeat: Infinity,
          duration: 12,
          ease: "easeInOut",
        }}
        className="absolute top-52 left-[14%] w-36 sm:w-48 opacity-65"
      >
        <CloudSvg />
      </motion.div>

      {/* Cloud 4: Tầng giữa bên phải */}
      <motion.div
        animate={{
          x: [20, -25, 20],
          y: [8, -8, 8],
        }}
        transition={{
          repeat: Infinity,
          duration: 18,
          ease: "easeInOut",
        }}
        className="absolute top-64 right-[15%] w-44 sm:w-56 opacity-75"
      >
        <CloudSvg />
      </motion.div>

      {/* Cloud 5: Mây xa mờ ở đáy */}
      <motion.div
        animate={{
          x: [-30, 30, -30],
        }}
        transition={{
          repeat: Infinity,
          duration: 22,
          ease: "easeInOut",
        }}
        className="absolute bottom-20 left-[42%] w-60 sm:w-80 opacity-50 blur-[1px]"
      >
        <CloudSvg />
      </motion.div>
    </div>
  );
}

/**
 * Đồ họa SVG đám mây bồng bềnh mềm mại (Fluffy Cloud)
 */
function CloudSvg() {
  return (
    <svg
      viewBox="0 0 240 120"
      className="w-full h-auto drop-shadow-[0_8px_16px_rgba(255,255,255,0.4)]"
      fill="none"
    >
      {/* Thân đám mây màu trắng tinh với viền mờ mềm mại */}
      <path
        d="M 50 90 
           A 30 30 0 0 1 70 36 
           A 42 42 0 0 1 146 28 
           A 36 36 0 0 1 200 60 
           A 28 28 0 0 1 190 95 
           A 24 24 0 0 1 50 90 Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
      {/* Vệt sáng nhẹ bên trong đám mây */}
      <ellipse cx="110" cy="52" rx="55" ry="22" fill="#FFFFFF" fillOpacity="0.8" />
    </svg>
  );
}
