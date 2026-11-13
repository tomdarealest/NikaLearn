"use client";

import { Mail, Phone, MapPin, Facebook, Twitter, Youtube, Github } from "lucide-react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import PixelLandscapeBanner from "./Home/PixelLandscapeBanner";

const footerLinks = {
  courses: [
    { name: "Frontend Developer", href: "/roadmap" },
    { name: "Backend Developer", href: "/roadmap" },
    { name: "Mobile Developer", href: "/roadmap" },
    { name: "Data Science", href: "/roadmap" },
  ],
  resources: [
    { name: "Bài viết", href: "/articles" },
    { name: "Hỏi đáp", href: "/qa" },
    { name: "Tài liệu", href: "#" },
    { name: "Blog", href: "#" },
  ],
  community: [
    { name: "Discord", href: "https://discord.com/invite/a6pe69KkPd" },
    { name: "Facebook Group", href: "#" },
    { name: "Telegram", href: "#" },
    { name: "Youtube", href: "#" },
  ]
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Youtube, href: "#", label: "Youtube" },
  { icon: Github, href: "https://github.com/huynhkhuanit", label: "Github" },
];

export default function Footer() {
  return (
    <footer 
      className="relative w-full bg-[#5C3A21] text-[#FFF8EE] pt-0 pb-12 mt-0"
      style={{
        zIndex: 30,
        backgroundImage: "radial-gradient(rgba(0, 0, 0, 0.22) 1.5px, transparent 1.5px)",
        backgroundSize: "16px 16px",
      }}
      suppressHydrationWarning
    >
      {/* Pixel Art Landscape Horizon (Trees, Slimes & Flowers on Grass) */}
      <PixelLandscapeBanner />

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-20" suppressHydrationWarning>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center space-x-3">
              <BrandLogo height={42} />
              <div>
                <Link href="/" className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#88A65B] to-[#FFD23F]">NIKA</span>
                  <span>LEARN</span>
                </Link>
                <p className="text-[#FFF8EE]/60 text-xs font-semibold">Nền tảng luyện thi TOEIC</p>
              </div>
            </div>
            
            <p className="text-[#FFF8EE]/70 text-sm leading-relaxed">
              Nền tảng luyện thi TOEIC hàng đầu với phương pháp học tập tối ưu, giúp học viên chinh phục band điểm mơ ước mỗi năm.
            </p>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2 text-[#FFF8EE]/70 text-sm">
                <Mail className="w-3.5 h-3.5 text-[#FFD23F]" />
                <span>huynhkhuanit@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2 text-[#FFF8EE]/70 text-sm">
                <Phone className="w-3.5 h-3.5 text-[#FFD23F]" />
                <span>1900-xxxx</span>
              </div>
              <div className="flex items-center space-x-2 text-[#FFF8EE]/70 text-sm">
                <MapPin className="w-3.5 h-3.5 text-[#FFD23F]" />
                <span>Hồ Chí Minh, Việt Nam</span>
              </div>
            </div>
          </div>

          {/* About NikaLearn */}
          <div>
            <h4 className="font-extrabold text-white text-base mb-4 relative inline-block">
              Về NikaLearn
              <span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-[#6B8045] rounded-full"></span>
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/about" className="text-[#FFF8EE]/70 hover:text-white hover:translate-x-1 transition-all duration-200 text-sm inline-block">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[#FFF8EE]/70 hover:text-white hover:translate-x-1 transition-all duration-200 text-sm inline-block">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Courses */}
          <div>
            <h4 className="font-extrabold text-white text-base mb-4 relative inline-block">
              Lộ trình học
              <span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-[#6B8045] rounded-full"></span>
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.courses.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="text-[#FFF8EE]/70 hover:text-white hover:translate-x-1 transition-all duration-200 text-sm inline-block">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-extrabold text-white text-base mb-4 relative inline-block">
              Tài nguyên
              <span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-[#6B8045] rounded-full"></span>
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="text-[#FFF8EE]/70 hover:text-white hover:translate-x-1 transition-all duration-200 text-sm inline-block">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-extrabold text-white text-base mb-4 relative inline-block">
              Cộng đồng
              <span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-[#6B8045] rounded-full"></span>
            </h4>
            <ul className="space-y-2.5 mb-5">
              {footerLinks.community.map((link, index) => (
                <li key={index}>
                  <Link 
                    href={link.href} 
                    className="text-[#FFF8EE]/70 hover:text-white hover:translate-x-1 transition-all duration-200 text-sm inline-block"
                    {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Social Links */}
            <div className="flex space-x-2.5">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  {...(social.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/20 text-[#FFF8EE]/80 flex items-center justify-center hover:bg-[#FFD23F] hover:text-[#121212] hover:border-[#121212] transition-all duration-200"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-[#6B8045]/30 pt-6 flex flex-col md:flex-row items-center justify-between" suppressHydrationWarning>
          <div className="text-[#FFF8EE]/60 text-xs mb-3 md:mb-0" suppressHydrationWarning>
            © 2025 NikaLearn · Thiết kế lấy cảm hứng từ phong cách The IELTS Dictionary.
          </div>
          
          <div className="flex space-x-5 text-xs">
            <Link href="#" className="text-[#FFF8EE]/60 hover:text-white transition-colors duration-200">
              Điều khoản sử dụng
            </Link>
            <Link href="#" className="text-[#FFF8EE]/60 hover:text-white transition-colors duration-200">
              Chính sách bảo mật
            </Link>
            <Link href="/contact" className="text-[#FFF8EE]/60 hover:text-white transition-colors duration-200">
              Liên hệ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
