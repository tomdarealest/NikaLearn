'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Mỗi khi URL hoặc SearchParams thay đổi xong, tắt thanh progress
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Bắt sự kiện click vào các link chuyển trang để kích hoạt thanh progress ngay
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href && !target.target && !target.hasAttribute('download')) {
        const url = new URL(target.href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[#6B8045] via-[#FF6B2C] to-[#2563eb] animate-[progress_1s_ease-in-out_infinite]" />
      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 100%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
