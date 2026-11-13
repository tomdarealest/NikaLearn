"use client";

import {
  Home,
  BookOpen,
  MessageCircle,
  Menu as MenuIcon,
  SettingsIcon,
  Mic,
  ClipboardList,
  Sparkles,
  Brain,
  GraduationCap,
  MoreHorizontal,
  X,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface MenuItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const publicMenuItems: MenuItem[] = [
  {
    id: "home",
    icon: Home,
    label: "Trang chủ",
    href: "/",
  },
  {
    id: "roadmap",
    icon: MenuIcon,
    label: "Lộ trình",
    href: "/roadmap",
  },
  {
    id: "exams",
    icon: ClipboardList,
    label: "Đề thi",
    href: "/exams",
  },
  {
    id: "ai-tutor",
    icon: Sparkles,
    label: "Gia sư AI",
    href: "/ai-tutor",
  },
  {
    id: "review",
    icon: Brain,
    label: "Ôn tập",
    href: "/review",
  },
  {
    id: "exam",
    icon: GraduationCap,
    label: "Thi",
    href: "/exam",
  },
  {
    id: "interview",
    icon: Mic,
    label: "Phỏng vấn",
    href: "/interview",
  },
  {
    id: "articles",
    icon: BookOpen,
    label: "Bài viết",
    href: "/articles",
  },
  {
    id: "qa",
    icon: MessageCircle,
    label: "Hỏi đáp",
    href: "/qa",
  },
];

const adminMenuItem: MenuItem = {
  id: "admin",
  icon: SettingsIcon,
  label: "Admin",
  href: "/admin",
};

export default function Menu() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRole = user?.role?.toLowerCase();
  const isAdmin = mounted && (userRole === "admin" || userRole === "teacher");
  const menuItems = isAdmin ? [...publicMenuItems, adminMenuItem] : publicMenuItems;

  // Primary mobile tabs shown in bottom bar
  const primaryMobileTabs = [
    menuItems.find((i) => i.id === "home")!,
    menuItems.find((i) => i.id === "roadmap")!,
    menuItems.find((i) => i.id === "exams")!,
    menuItems.find((i) => i.id === "ai-tutor")!,
  ].filter(Boolean);

  const isMoreActive =
    !primaryMobileTabs.some((tab) =>
      pathname === tab.href || (tab.href !== "/" && pathname.startsWith(`${tab.href}/`))
    ) && pathname !== "/";

  return (
    <>
      {/* 1. DESKTOP SIDEBAR (Visible on md and up: >= 768px) */}
      <aside
        className="hidden md:flex fixed left-0 top-[64px] h-[calc(100vh-64px)] w-[88px] flex-col items-center justify-start py-3 px-1.5 border-r-2 border-[#121212]/15 dark:border-[#2F422B] bg-[#FFFDF9] dark:bg-[#151F14] transition-colors duration-300 shadow-sm z-30 pointer-events-auto overflow-y-auto"
      >
        <nav className="flex flex-col items-center space-y-1.5 w-full">
          {menuItems.map((item: MenuItem) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            const isAdminItem = item.id === "admin";

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => {
                  try {
                    router.prefetch(item.href);
                  } catch (e) {
                    // ignore prefetch errors
                  }
                }}
                className={`
                  group flex flex-col items-center justify-center w-full py-2 px-1 rounded-xl
                  transition-all duration-200 cursor-pointer pointer-events-auto
                  ${
                    isActive
                      ? isAdminItem
                        ? "bg-[#FF6B2C] text-white border-2 border-[#121212] shadow-[2.5px_2.5px_0_#121212]"
                        : "bg-[#6B8045] text-white border-2 border-[#121212] shadow-[2.5px_2.5px_0_#121212]"
                      : isAdminItem
                      ? "text-muted-foreground hover:text-[#FF6B2C] hover:bg-[#FF6B2C]/10"
                      : "text-stone-600 dark:text-stone-400 hover:text-foreground hover:bg-[#6B8045]/10"
                  }
                `}
                title={item.label}
              >
                <Icon
                  className={`
                    h-5 w-5 mb-1 transition-colors duration-200 flex-shrink-0
                    ${
                      isActive
                        ? "text-white"
                        : isAdminItem
                        ? "text-muted-foreground group-hover:text-[#FF6B2C]"
                        : "text-stone-500 group-hover:text-foreground"
                    }
                  `}
                />
                <span
                  className={`
                    text-[11px] font-bold transition-colors duration-200 text-center leading-tight
                    ${
                      isActive
                        ? "text-white"
                        : isAdminItem
                        ? "text-muted-foreground group-hover:text-[#FF6B2C]"
                        : "text-stone-600 dark:text-stone-400 group-hover:text-foreground"
                    }
                  `}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 2. MOBILE BOTTOM NAVIGATION BAR (Visible on mobile: < 768px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 dark:bg-[#151F14]/95 backdrop-blur-md border-t-2 border-[#121212]/15 dark:border-[#2F422B] px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      >
        {primaryMobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              onTouchStart={() => {
                try {
                  router.prefetch(item.href);
                } catch (e) {}
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                isActive
                  ? "text-[#6B8045] font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-[#121212] dark:hover:text-white"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-transform ${
                  isActive ? "bg-[#6B8045]/15 scale-110" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#6B8045]" : ""}`} />
              </div>
              <span className="text-[10px] font-bold mt-0.5 leading-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* More / Menu Drawer Toggle */}
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            isMobileDrawerOpen || isMoreActive
              ? "text-[#6B8045] font-black"
              : "text-slate-500 dark:text-slate-400 hover:text-[#121212] dark:hover:text-white"
          }`}
          aria-label="Xem thêm menu"
        >
          <div
            className={`p-1 rounded-lg transition-transform ${
              isMobileDrawerOpen || isMoreActive ? "bg-[#6B8045]/15 scale-110" : ""
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 leading-tight">Thêm</span>
        </button>
      </nav>

      {/* 3. MOBILE DRAWER BOTTOM SHEET (For remaining menu items) */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative w-full bg-[#FFFDF9] dark:bg-[#151F14] border-t-2 border-[#121212] dark:border-[#2F422B] rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.18)] p-5 pb-8 max-h-[80vh] overflow-y-auto"
            >
              {/* Sheet Drag Handle & Close */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#121212]/10 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#6B8045]" />
                  <h3 className="text-base font-black text-[#121212] dark:text-white">
                    Tất cả tính năng
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                  aria-label="Đóng menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid of All Links */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  const isAdminItem = item.id === "admin";

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      prefetch={true}
                      onMouseEnter={() => {
                        try {
                          router.prefetch(item.href);
                        } catch (e) {}
                      }}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
                        isActive
                          ? isAdminItem
                            ? "bg-[#FF6B2C] text-white border-[#121212] shadow-[3px_3px_0_#121212]"
                            : "bg-[#6B8045] text-white border-[#121212] shadow-[3px_3px_0_#121212]"
                          : isAdminItem
                          ? "bg-orange-50 dark:bg-orange-950/20 text-[#FF6B2C] border-transparent hover:border-[#FF6B2C]"
                          : "bg-[#F7F4EB] dark:bg-[#1B261A] text-slate-800 dark:text-slate-200 border-transparent hover:border-[#6B8045]"
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-1.5" />
                      <span className="text-[11px] font-black leading-tight line-clamp-1">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
