"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Đang kết nối tài khoản...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function handleAuth() {
      try {
        if (!supabase) {
          throw new Error("Supabase client chưa được khởi tạo");
        }

        const code = searchParams.get("code");
        const intentParam = searchParams.get("intent");
        const providerParam = searchParams.get("provider") || "google";
        
        // Read intent and provider from cookie or query param
        let intent = intentParam || "login";
        let provider = providerParam;

        if (typeof document !== "undefined") {
          const cookieMatch = document.cookie
            .split("; ")
            .find((row) => row.startsWith("oauth_intent=") || row.startsWith("google_auth_intent="));
          if (cookieMatch) {
            intent = cookieMatch.split("=")[1] || intent;
          }

          const providerCookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith("oauth_provider="));
          if (providerCookie) {
            provider = providerCookie.split("=")[1] || provider;
          }
        }

        const providerLabel = provider === "facebook" ? "Facebook" : "Google";
        setStatusMessage(`Đang xác thực bảo mật với ${providerLabel}...`);

        let sessionUser = null;

        // 1. If code exists, exchange on CLIENT where PKCE code_verifier is stored in localStorage
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn("Client exchange code notice:", error);
            // Fallback: check if session is already stored
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              sessionUser = sessionData.session.user;
            } else {
              throw error;
            }
          } else {
            sessionUser = data?.session?.user;
          }
        } else {
          // If no code, check for existing or hash session
          const { data: sessionData } = await supabase.auth.getSession();
          sessionUser = sessionData?.session?.user;
        }

        if (!sessionUser) {
          throw new Error(`Không lấy được thông tin xác thực từ ${providerLabel}`);
        }

        // 2. Sync with NikaLearn backend
        setStatusMessage("Đang kiểm tra hồ sơ học viên...");
        const res = await fetch("/api/auth/oauth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            user: sessionUser,
            provider,
          }),
        });

        const syncData = await res.json();

        if (syncData.notRegistered) {
          // USER NOT REGISTERED YET! Sign out of supabase session and redirect to trigger notice popup
          await supabase.auth.signOut();
          if (isMounted) {
            const emailParam = sessionUser.email ? `&email=${encodeURIComponent(sessionUser.email)}` : "";
            router.replace(`/?not_registered=true${emailParam}&provider=${provider}`);
          }
          return;
        }

        if (!syncData.success) {
          throw new Error(syncData.message || "Đồng bộ tài khoản thất bại");
        }

        // 3. Authenticated successfully! Redirect to home
        const successParam = intent === "register" ? `register_success=${provider}` : `login_success=${provider}`;
        if (isMounted) {
          router.replace(`/?${successParam}`);
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (isMounted) {
          setIsError(true);
          setStatusMessage(err.message || "Xác thực thất bại");
          setTimeout(() => {
            router.replace("/?auth_error=true");
          }, 2500);
        }
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDF9] px-4">
      <div className="max-w-md w-full bg-white border-2 border-[#121212] rounded-3xl p-8 shadow-[6px_6px_0_#121212] text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] mx-auto flex items-center justify-center shadow-[3px_3px_0_#121212]">
          {isError ? (
            <span className="text-2xl">⚠️</span>
          ) : (
            <div className="w-8 h-8 border-4 border-[#121212] border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-black text-[#121212] tracking-tight">Xác thực tài khoản</h2>
          <p className="text-xs font-bold text-slate-500 mt-2">{statusMessage}</p>
        </div>

        {isError && (
          <p className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-200 rounded-xl py-2 px-3">
            Đang tự động chuyển hướng về trang chủ...
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFFDF9]">
          <div className="w-8 h-8 border-4 border-[#121212] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
