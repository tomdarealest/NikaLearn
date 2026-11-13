'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // Dữ liệu còn mới trong 5 phút (0ms loading khi chuyển tab)
            gcTime: 1000 * 60 * 30, // Lưu trong memory cache 30 phút
            refetchOnWindowFocus: false, // Tránh fetch lại giật lag khi chuyển tab trình duyệt
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
