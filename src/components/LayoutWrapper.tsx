"use client";

import { usePathname } from "next/navigation";
import Menu from "@/components/Menu";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdminPage = pathname === "/admin" || pathname?.startsWith("/admin/");
  const isLearningPage = pathname?.startsWith("/learn/");
  const isInterviewRoom = pathname?.startsWith("/interview/room/");

  if (isAdminPage || isLearningPage || isInterviewRoom) {
    return <>{children}</>;
  }

  return (
    <div className="bg-background min-h-screen transition-colors duration-300 flex flex-col" suppressHydrationWarning>
      <Header />
      <Menu />
      <main
        className="flex-1 bg-background transition-colors duration-300 md:ml-[88px] ml-0 pb-16 md:pb-0"
        suppressHydrationWarning
      >
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="w-full h-full min-h-[calc(100vh-64px)]"
        >
          {children}
        </motion.div>
      </main>
      <div className="md:ml-[88px] ml-0">
        <Footer />
      </div>
    </div>
  );
}
