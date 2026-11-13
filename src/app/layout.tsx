import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AiTutorProvider } from "@/contexts/AiTutorContext";
import QueryProvider from "@/providers/QueryProvider";
import LayoutWrapper from "@/components/LayoutWrapper";
import TopProgressBar from "@/components/TopProgressBar";

export const metadata: Metadata = {
  title: "NikaLearn - Nền tảng học lập trình trực tuyến",
  description: "Nền tảng học lập trình hiện đại với giao diện tối ưu và trải nghiệm người dùng tuyệt vời",
  keywords: ["luyện thi toeic", "toeic trực tuyến", "luyện thi toeic online", "react", "nextjs"],
};

const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}

  // Prevent browser extensions (Bitdefender TrafficLight, etc.) from polluting DOM with bis_skin_checked
  try {
    if (typeof window !== 'undefined' && window.MutationObserver) {
      var observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
            m.target.removeAttribute('bis_skin_checked');
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        subtree: true,
        attributeFilter: ['bis_skin_checked']
      });
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-sans selection:bg-[#FFD23F] selection:text-[#121212]" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <QueryProvider>
          <ToastProvider>
            <AuthProvider>
              <AiTutorProvider>
                <TopProgressBar />
                <LayoutWrapper>{children}</LayoutWrapper>
              </AiTutorProvider>
            </AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
