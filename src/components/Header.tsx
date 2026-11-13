"use client";

import { User, LogOut, FileText, Bookmark, Settings } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import NotRegisteredModal from "./NotRegisteredModal";
import AvatarWithProBadge from "./AvatarWithProBadge";
import BrandLogo from "./BrandLogo";
import ThemeToggle from "./ThemeToggle";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [isNotRegisteredModalOpen, setIsNotRegisteredModalOpen] = useState(false);
  const [notRegisteredEmail, setNotRegisteredEmail] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đóng menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  // Listen for OAuth callback params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const loginSuccess = urlParams.get("login_success");
      const registerSuccess = urlParams.get("register_success");
      const notRegistered = urlParams.get("not_registered");
      const email = urlParams.get("email");
      const authError = urlParams.get("auth_error");

      if (notRegistered === "true") {
        setNotRegisteredEmail(email);
        setIsNotRegisteredModalOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (registerSuccess === "google") {
        toast.success("Đăng ký tài khoản Google thành công! Chào mừng bạn.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (loginSuccess === "google") {
        toast.success("Đăng nhập bằng tài khoản Google thành công! Chào mừng bạn.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authError) {
        toast.error(`Đăng nhập thất bại: ${decodeURIComponent(authError)}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [toast]);

  // Listen for client-side Supabase auth state change (for implicit flow or instant sync)
  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user && !isAuthenticated) {
        const email = session.user.email;
        if (!email) return;

        const intentCookie =
          document.cookie
            .split("; ")
            .find((row) => row.startsWith("google_auth_intent="))
            ?.split("=")[1] || "login";

        try {
          const res = await fetch("/api/auth/google/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0],
              avatar_url: session.user.user_metadata?.avatar_url,
              intent: intentCookie,
            }),
          });
          const data = await res.json();
          if (data.notRegistered) {
            setNotRegisteredEmail(data.email);
            setIsNotRegisteredModalOpen(true);
          } else if (data.success) {
            window.location.reload();
          }
        } catch {
          // Sync failed silently
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    toast.success("Đăng xuất thành công!");
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FFFDF9] dark:bg-[#151F14] border-b-2 border-[#121212]/15 dark:border-[#2F422B] transition-colors duration-300 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between bg-transparent transition-colors duration-300">
        {/* Logo Section */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <BrandLogo height={38} />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/"
                prefetch={true}
                className="text-xl sm:text-2xl font-black text-foreground tracking-tight transition-colors duration-200 hover:text-primary"
              >
                NikaLearn
              </Link>
              <span className="bg-[#FFD23F] text-[#121212] border border-[#121212] shadow-[1.5px_1.5px_0_#121212] text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded uppercase tracking-wider">
                PRO
              </span>
            </div>
            <p className="hidden sm:block text-xs font-semibold text-muted-foreground">
              Nền tảng học lập trình trực tuyến
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />

          {/* Auth Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2" suppressHydrationWarning>
            {!mounted || isLoading ? (
              <div className="w-20 sm:w-28 h-8 sm:h-9 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-full hover:bg-muted transition-all duration-200 cursor-pointer border border-transparent hover:border-[#121212]/10"
                >
                  <AvatarWithProBadge
                    avatarUrl={user?.avatar_url}
                    fullName={user?.full_name}
                    isPro={user?.membership_type === "PRO"}
                    size="xs"
                  />
                  <span className="hidden sm:inline-block text-sm font-bold text-foreground max-w-[110px] truncate">
                    {user?.username}
                  </span>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-card rounded-2xl shadow-2xl border-2 border-[#121212] overflow-hidden z-50"
                    >
                      {/* User Info Header */}
                      <div className="px-4 py-3.5 border-b border-[#121212]/10 bg-[#F7F4EB] dark:bg-[#1B261A]">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <AvatarWithProBadge
                              avatarUrl={user?.avatar_url}
                              fullName={user?.full_name}
                              isPro={user?.membership_type === "PRO"}
                              size="md"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-foreground truncate">
                              {user?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{user?.username}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Main Menu Items */}
                      <div className="py-1">
                        <Link
                          href={`/${user?.username}`}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User className="w-4 h-4 text-[#6B8045]" />
                          <span>Trang cá nhân</span>
                        </Link>
                        <Link
                          href="/write"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <FileText className="w-4 h-4 text-[#6B8045]" />
                          <span>Viết blog</span>
                        </Link>
                        <Link
                          href="/my-posts"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <FileText className="w-4 h-4 text-[#6B8045]" />
                          <span>Bài viết của tôi</span>
                        </Link>
                        <Link
                          href="/saved"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Bookmark className="w-4 h-4 text-[#6B8045]" />
                          <span>Bài viết đã lưu</span>
                        </Link>
                      </div>

                      {/* Settings & Logout */}
                      <div className="border-t border-[#121212]/10 py-1">
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4 text-slate-500" />
                          <span>Cài đặt</span>
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode("register");
                    setIsAuthModalOpen(true);
                  }}
                  className="hidden sm:inline-flex px-4 sm:px-5 py-2 text-sm font-extrabold text-foreground hover:text-primary transition-all duration-200 rounded-full cursor-pointer"
                >
                  Đăng ký
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode("login");
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3.5 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-black bg-[#FFD23F] text-[#121212] border-2 border-[#121212] rounded-full shadow-[2px_2px_0_#121212] sm:shadow-[3px_3px_0_#121212] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#121212] active:translate-y-0 active:shadow-[1px_1px_0_#121212] transition-all cursor-pointer whitespace-nowrap"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Unified Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Notice Popup when Google account is not registered yet */}
      <NotRegisteredModal
        isOpen={isNotRegisteredModalOpen}
        onClose={() => setIsNotRegisteredModalOpen(false)}
        email={notRegisteredEmail}
        onGoToRegister={() => {
          setAuthModalMode("register");
          setIsAuthModalOpen(true);
        }}
      />
    </header>
  );
}
