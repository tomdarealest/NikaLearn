'use client';

import { ToastProvider } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader,
  BookOpen,
  LayoutDashboard,
  Settings,
  LogOut,
  Home,
  Search,
  Bell,
  MessageSquare,
  Moon,
  ChevronRight,
  ChevronDown,
  FolderTree,
  FileText,
  Users,
  ClipboardList,
  Brain,
  Mic,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import type { LucideIcon } from "lucide-react";

type NavLink = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavDropdown = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: { id: string; label: string; href: string; icon: LucideIcon }[];
};

type NavItem = NavLink | NavDropdown;

function isDropdown(item: NavItem): item is NavDropdown {
  return "children" in item;
}

const navigationGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "TỔNG QUAN",
    items: [
      { id: "dashboard", label: "Bảng điều khiển", href: "/admin", icon: LayoutDashboard },
      { id: "users", label: "Quản lý người dùng", href: "/admin/users", icon: Users },
      { id: "exams", label: "Ngân hàng đề thi TOEIC", href: "/admin/exams", icon: ClipboardList },
      { id: "review", label: "Gia sư AI & Ôn tập", href: "/admin/review", icon: Brain },
      { id: "interview", label: "Phỏng vấn AI", href: "/admin/interview", icon: Mic },
    ],
  },
  {
    label: "GIÁO TRÌNH & NỘI DUNG",
    items: [
      {
        id: "content",
        label: "Quản lý bài học",
        icon: BookOpen,
        children: [
          { id: "categories", label: "Danh mục", href: "/admin/categories", icon: FolderTree },
          { id: "lessons", label: "Bài học & Lộ trình", href: "/admin/lessons", icon: FileText },
        ],
      },
    ],
  },
  {
    label: "HỆ THỐNG",
    items: [
      { id: "settings", label: "Cài đặt & Bảo mật", href: "/admin/settings", icon: Settings },
    ],
  },
];

function getBreadcrumb(pathname: string): { parent: string; current: string } {
  if (pathname === "/admin") return { parent: "Quản trị", current: "Bảng điều khiển" };
  if (pathname.startsWith("/admin/users")) return { parent: "Quản trị", current: "Người dùng & Sinh viên" };
  if (pathname.startsWith("/admin/exams")) return { parent: "Quản trị", current: "Ngân hàng đề thi" };
  if (pathname.startsWith("/admin/review")) return { parent: "Quản trị", current: "Gia sư AI" };
  if (pathname.startsWith("/admin/interview")) return { parent: "Quản trị", current: "Phỏng vấn AI" };
  if (pathname.startsWith("/admin/categories")) return { parent: "Nội dung", current: "Danh mục khóa học" };
  if (pathname.startsWith("/admin/lessons")) return { parent: "Nội dung", current: "Bài học & Lộ trình" };
  if (pathname.startsWith("/admin/settings")) return { parent: "Hệ thống", current: "Cài đặt bảo mật" };
  return { parent: "Quản trị", current: "Admin Hub" };
}

function getUserInitials(name?: string): string {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [contentMenuOpen, setContentMenuOpen] = useState(
    () => pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/lessons")
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/lessons")) {
      setContentMenuOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#121212] border-t-[#6B8045] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-700 text-sm font-bold">Đang kiểm tra quyền quản trị...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const userRole = user?.role?.toLowerCase();
  const hasAccess = userRole === "admin" || userRole === "teacher";

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-[#FFFDF9] rounded-3xl shadow-[6px_6px_0_#121212] border-2 border-[#121212] p-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 border-2 border-[#121212] rounded-2xl mb-5 shadow-[2px_2px_0_#121212]">
            <ShieldCheck className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-xl font-black text-[#121212] mb-2">Quyền truy cập bị giới hạn</h2>
          <p className="text-slate-600 text-sm font-medium mb-6">
            Khu vực này chỉ dành riêng cho Quản trị viên (Admin) và Giảng viên (Teacher).
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-[#FFD23F] text-[#121212] font-black rounded-xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] active:translate-y-0.5 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            Về Trang chủ
          </button>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const breadcrumb = getBreadcrumb(pathname);
  const initials = getUserInitials(user?.full_name);
  const displayName = user?.full_name || "Quản trị viên";

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F7F4EB] text-[#121212] flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-screen w-[265px] bg-[#FFFDF9] border-r-2 border-[#121212] flex flex-col z-40 shadow-sm">
          {/* Brand */}
          <div className="px-5 pt-6 pb-4 border-b-2 border-[#121212]/10">
            <Link href="/admin" className="flex items-center gap-3">
              <BrandLogo href="" height={38} className="rounded-xl border border-[#121212]" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-[#121212] leading-tight">NikaLearn</span>
                  <span className="bg-[#FFD23F] text-[#121212] border border-[#121212] text-[8px] font-black px-1.5 py-0.2 rounded shadow-[1px_1px_0_#121212] uppercase">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-500">Cổng Quản Trị Hệ Thống</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    if (isDropdown(item)) {
                      const Icon = item.icon;
                      const isChildActive = item.children.some((child) =>
                        pathname === child.href || pathname.startsWith(`${child.href}/`)
                      );

                      return (
                        <div key={item.id}>
                          <button
                            type="button"
                            onClick={() => setContentMenuOpen((open) => !open)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              isChildActive
                                ? "bg-[#6B8045] text-white border-2 border-[#121212] shadow-[2.5px_2.5px_0_#121212]"
                                : "text-slate-700 hover:bg-[#6B8045]/10 hover:text-[#121212] border-2 border-transparent"
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronDown
                              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                                contentMenuOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {contentMenuOpen && (
                            <div className="mt-1 ml-3 pl-3 border-l-2 border-[#121212]/20 space-y-1">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const childActive =
                                  pathname === child.href || pathname.startsWith(`${child.href}/`);

                                return (
                                  <Link
                                    key={child.id}
                                    href={child.href}
                                    prefetch={true}
                                    onMouseEnter={() => {
                                      try {
                                        router.prefetch(child.href);
                                      } catch (e) {}
                                    }}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                      childActive
                                        ? "bg-[#FFD23F] text-[#121212] border border-[#121212] font-black shadow-[1.5px_1.5px_0_#121212]"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-[#121212]"
                                    }`}
                                  >
                                    <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>{child.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const Icon = item.icon;
                    const active = isActive(item.href);

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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all ${
                          active
                            ? "bg-[#6B8045] text-white border-2 border-[#121212] shadow-[2.5px_2.5px_0_#121212]"
                            : "text-slate-700 hover:bg-[#6B8045]/10 hover:text-[#121212] border-2 border-transparent"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User profile footer */}
          <div className="border-t-2 border-[#121212]/15 p-3 bg-white">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-2xl border border-transparent hover:border-[#121212]/15 transition">
              <div className="w-10 h-10 bg-[#FFD23F] rounded-xl border-2 border-[#121212] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#121212]">
                <span className="text-[#121212] text-xs font-black">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[#121212] truncate">{displayName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="bg-[#FF6B2C] text-white text-[9px] font-black px-1.5 py-0.2 rounded border border-[#121212] uppercase leading-tight">
                    {user?.role || "ADMIN"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 ml-[265px] flex flex-col min-h-screen">
          {/* Top header */}
          <header className="sticky top-0 z-30 h-16 bg-[#FFFDF9]/95 backdrop-blur-md border-b-2 border-[#121212] flex items-center justify-between px-6 shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="text-slate-400 uppercase tracking-wider">{breadcrumb.parent}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[#121212] font-black px-2 py-0.5 bg-[#FFD23F]/30 rounded border border-[#121212]/20">
                {breadcrumb.current}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-white border-2 border-[#121212]/20 focus-within:border-[#6B8045] rounded-xl px-3 py-1.5 w-60 shadow-[1.5px_1.5px_0_rgba(18,18,18,0.06)] transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm người dùng, đề..."
                  className="bg-transparent text-xs text-[#121212] placeholder:text-slate-400 outline-none flex-1 w-full font-semibold"
                />
              </div>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FFD23F] hover:bg-[#FFE066] text-[#121212] font-black text-xs uppercase tracking-wider rounded-xl border-2 border-[#121212] shadow-[2px_2px_0_#121212] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Về Trang chủ</span>
              </button>

              <div className="w-9 h-9 bg-[#6B8045] text-white rounded-xl border-2 border-[#121212] flex items-center justify-center font-black text-xs shadow-[2px_2px_0_#121212]">
                {initials}
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-auto">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="p-6 sm:p-8 max-w-[1400px] mx-auto"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
