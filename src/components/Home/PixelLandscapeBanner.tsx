"use client";

import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";

export default function PixelLandscapeBanner() {
  return (
    <div className="relative w-full bg-[#A3D8F8] dark:bg-[#1A334A] overflow-hidden select-none border-t-2 border-[#121212]/10 transition-colors">
      {/* 1. TOP FLOATING SPEECH BUBBLE (Giống 100% góc trên ảnh mẫu The IELTS Dictionary) */}
      <div className="w-full max-w-5xl mx-auto px-4 pt-10 pb-6 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-3 bg-[#FFFDF9] text-[#121212] px-5 sm:px-6 py-2.5 sm:py-3 rounded-full border-[2.5px] border-[#121212] shadow-[4px_4px_0_#121212] text-xs sm:text-sm font-bold max-w-xl text-center leading-relaxed"
        >
          <span className="bg-[#121212] text-white font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            NikaLearn
          </span>
          <span className="text-slate-800 font-extrabold text-xs sm:text-[13px]">
            Giúp bạn đạt được mục tiêu TOEIC hiệu quả qua ứng dụng công nghệ và ngân hàng đề thi thực chiến
          </span>
        </motion.div>
      </div>

      {/* 2. PIXEL ART LANDSCAPE (Hàng cây & sinh vật Pixel Art 8-bit trên thảm cỏ xanh) */}
      <div className="relative w-full h-[120px] sm:h-[140px] flex items-end overflow-hidden">
        {/* Sky Background Subtle Parallax Clouds */}
        <div className="absolute top-2 left-[10%] w-16 h-8 bg-white/40 rounded-full blur-[1px]" />
        <div className="absolute top-6 right-[15%] w-24 h-10 bg-white/40 rounded-full blur-[1px]" />

        {/* The Row of Pixel Trees & Slimes */}
        <div className="w-full flex items-end justify-between px-4 sm:px-12 lg:px-24 relative z-10 -mb-[2px]">
          {/* Cây thông 1 */}
          <div className="shrink-0 hidden xs:block">
            <PixelPineTree height={68} />
          </div>

          {/* Cây hoa anh đào Sakura hồng 1 */}
          <div className="shrink-0">
            <PixelSakuraTree height={84} />
          </div>

          {/* Bé Slime xanh lá */}
          <div className="shrink-0 hidden sm:flex items-end mb-1">
            <PixelSlime color="green" />
          </div>

          {/* Hoa pixel nhỏ */}
          <div className="shrink-0 hidden md:block mb-1">
            <PixelFlower color="pink" />
          </div>

          {/* Cây xanh tán tròn 1 */}
          <div className="shrink-0">
            <PixelRoundTree height={78} />
          </div>

          {/* Bé Slime hồng trung tâm */}
          <div className="shrink-0 flex items-end mb-1">
            <PixelSlime color="pink" />
          </div>

          {/* Hoa pixel nhỏ */}
          <div className="shrink-0 hidden md:block mb-1">
            <PixelFlower color="yellow" />
          </div>

          {/* Cây thông 2 */}
          <div className="shrink-0 hidden sm:block">
            <PixelPineTree height={74} />
          </div>

          {/* Cây xanh tán tròn 2 */}
          <div className="shrink-0">
            <PixelRoundTree height={80} />
          </div>

          {/* Cây hoa anh đào Sakura hồng 2 */}
          <div className="shrink-0 hidden xs:block">
            <PixelSakuraTree height={86} />
          </div>
        </div>

        {/* 3. DẢI THẢM CỎ XANH PIXEL (Pixel Grass Lawn) */}
        <div className="absolute bottom-0 left-0 right-0 h-6 sm:h-7 bg-[#84C341] border-t-[3px] border-b-[3px] border-[#121212] z-20 flex items-center overflow-hidden">
          {/* Pixel grass blades highlight */}
          <div
            className="w-full h-full opacity-35"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #A0E055 50%, transparent 50%), linear-gradient(#5C9421 50%, transparent 50%)",
              backgroundSize: "8px 8px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 1. CÂY ANH ĐÀO SAKURA HỒNG PIXEL (Chuẩn 100% Ảnh mẫu)
 */
function PixelSakuraTree({ height = 80 }: { height?: number }) {
  const width = Math.round(height * 0.72);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 84"
      shapeRendering="crispEdges"
      className="overflow-visible"
    >
      {/* Thân cây nâu viền đen */}
      <rect x="26" y="52" width="8" height="26" fill="#5D4037" stroke="#121212" strokeWidth="2.5" />
      <rect x="22" y="74" width="16" height="6" fill="#4E342E" stroke="#121212" strokeWidth="2" />

      {/* Tán lá Sakura hồng (Các khối pixel xếp tầng) */}
      <g stroke="#121212" strokeWidth="2.5" strokeLinejoin="miter">
        {/* Lớp nền tán lá */}
        <path
          d="M 18 10 H 42 V 16 H 50 V 26 H 54 V 42 H 48 V 50 H 38 V 54 H 22 V 50 H 12 V 42 H 6 V 26 H 10 V 16 H 18 Z"
          fill="#F48FB1"
        />
        {/* Bóng tán lá sẫm màu hơn bên dưới */}
        <path
          d="M 22 46 H 38 V 52 H 22 Z M 38 42 H 46 V 48 H 38 Z M 14 40 H 22 V 48 H 14 Z M 44 26 H 52 V 40 H 44 Z"
          fill="#EC407A"
          stroke="none"
        />
        {/* Điểm sáng trắng highlight pixel */}
        <rect x="18" y="16" width="6" height="6" fill="#FFFFFF" stroke="none" />
        <rect x="30" y="14" width="6" height="4" fill="#FFFFFF" stroke="none" />
        <rect x="14" y="24" width="4" height="6" fill="#FFFFFF" stroke="none" />
      </g>
    </svg>
  );
}

/**
 * 2. CÂY THÔNG PIXEL (Pixel Pine Tree)
 */
function PixelPineTree({ height = 70 }: { height?: number }) {
  const width = Math.round(height * 0.52);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 76"
      shapeRendering="crispEdges"
      className="overflow-visible"
    >
      {/* Thân cây */}
      <rect x="16" y="54" width="8" height="20" fill="#5D4037" stroke="#121212" strokeWidth="2.5" />

      {/* 3 Tầng lá thông hình tam giác răng cưa pixel */}
      <g stroke="#121212" strokeWidth="2.5" strokeLinejoin="miter" fill="#558B2F">
        {/* Tầng 1 (Đỉnh) */}
        <path d="M 18 6 H 22 V 10 H 26 V 16 H 28 V 22 H 12 V 16 H 14 V 10 H 18 Z" fill="#689F38" />
        {/* Tầng 2 (Giữa) */}
        <path d="M 16 20 H 24 V 24 H 30 V 32 H 34 V 38 H 6 V 32 H 10 V 24 H 16 Z" fill="#558B2F" />
        {/* Tầng 3 (Dưới cùng) */}
        <path d="M 14 36 H 26 V 42 H 34 V 48 H 38 V 56 H 2 V 48 H 6 V 42 H 14 Z" fill="#33691E" />
      </g>

      {/* Highlight pixel trên lá */}
      <rect x="18" y="10" width="4" height="4" fill="#A4D857" stroke="none" />
      <rect x="16" y="24" width="4" height="4" fill="#A4D857" stroke="none" />
      <rect x="14" y="40" width="4" height="4" fill="#8BC34A" stroke="none" />
    </svg>
  );
}

/**
 * 3. CÂY XANH TÁN TRÒN PIXEL (Pixel Round Tree)
 */
function PixelRoundTree({ height = 76 }: { height?: number }) {
  const width = Math.round(height * 0.68);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 54 80"
      shapeRendering="crispEdges"
      className="overflow-visible"
    >
      {/* Thân cây */}
      <rect x="23" y="48" width="8" height="26" fill="#5D4037" stroke="#121212" strokeWidth="2.5" />

      {/* Tán cây tròn xanh mướt */}
      <g stroke="#121212" strokeWidth="2.5" strokeLinejoin="miter">
        <path
          d="M 16 8 H 38 V 14 H 46 V 22 H 50 V 38 H 46 V 46 H 36 V 50 H 18 V 46 H 8 V 38 H 4 V 22 H 8 V 14 H 16 Z"
          fill="#7CB342"
        />
        {/* Vùng bóng tối dưới tán */}
        <path
          d="M 18 42 H 36 V 48 H 18 Z M 36 36 H 46 V 44 H 36 Z M 8 36 H 18 V 44 H 8 Z"
          fill="#558B2F"
          stroke="none"
        />
        {/* Highlight sáng */}
        <rect x="18" y="14" width="6" height="6" fill="#C5E1A5" stroke="none" />
        <rect x="28" y="12" width="6" height="4" fill="#C5E1A5" stroke="none" />
      </g>
    </svg>
  );
}

/**
 * 4. QUÁI SLIME PIXEL CUTE (Pink & Green Slime)
 */
function PixelSlime({ color = "pink" }: { color?: "pink" | "green" }) {
  const isPink = color === "pink";
  const bodyColor = isPink ? "#F48FB1" : "#81C784";
  const shadowColor = isPink ? "#C2185B" : "#388E3C";

  return (
    <motion.div
      animate={{ scaleY: [1, 0.85, 1], scaleX: [1, 1.08, 1] }}
      transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      className="relative cursor-pointer"
    >
      <svg width="26" height="18" viewBox="0 0 26 18" shapeRendering="crispEdges">
        {/* Thân slime bo tròn pixel */}
        <path
          d="M 6 4 H 20 V 8 H 24 V 14 H 26 V 18 H 0 V 14 H 2 V 8 H 6 Z"
          fill={bodyColor}
          stroke="#121212"
          strokeWidth="2"
        />
        {/* Đáy sẫm */}
        <rect x="2" y="14" width="22" height="3" fill={shadowColor} />
        {/* 2 mắt pixel đen nháy */}
        <rect x="7" y="8" width="3" height="4" fill="#121212" />
        <rect x="16" y="8" width="3" height="4" fill="#121212" />
        {/* Đốm sáng trên mắt */}
        <rect x="7" y="8" width="1" height="2" fill="#FFFFFF" />
        <rect x="16" y="8" width="1" height="2" fill="#FFFFFF" />
      </svg>
    </motion.div>
  );
}

/**
 * 5. HOA NHỎ PIXEL (Pixel Flower)
 */
function PixelFlower({ color = "yellow" }: { color?: "yellow" | "pink" }) {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" shapeRendering="crispEdges">
      {/* Thân hoa xanh */}
      <rect x="4" y="6" width="2" height="8" fill="#558B2F" stroke="#121212" strokeWidth="1" />
      {/* Bông hoa pixel */}
      <rect
        x="2"
        y="1"
        width="6"
        height="6"
        fill={color === "yellow" ? "#FFEE58" : "#F48FB1"}
        stroke="#121212"
        strokeWidth="1.5"
      />
      {/* Nhụy hoa */}
      <rect x="4" y="3" width="2" height="2" fill="#FF7043" />
    </svg>
  );
}
