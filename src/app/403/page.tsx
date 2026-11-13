import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PageShell from '@/components/PageShell';

export default function Forbidden403Page() {
  return (
    <PageShell className="min-h-screen bg-[#FBF9F4] flex items-center justify-center p-4">
      <PageContainer className="max-w-md w-full text-center">
        <div className="bg-[#FFFDF9] rounded-3xl shadow-[6px_6px_0_#121212] border-2 border-[#121212] p-8 space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 border-2 border-[#121212] rounded-2xl shadow-[2px_2px_0_#121212] mx-auto text-red-600">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#121212]">403 — Quyền truy cập bị từ chối</h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Bạn không có quyền quản trị viên để truy cập vào khu vực này. Mọi hành vi cố tình xâm nhập trái phép đều bị hệ thống ghi nhận.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#6B8045] hover:bg-[#586b37] text-white font-bold rounded-xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] transition"
            >
              <Home className="w-4 h-4" /> Về trang chủ
            </Link>
            <Link
              href="/auth/login"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border-2 border-[#121212] shadow-[3px_3px_0_#121212] transition"
            >
              <ArrowLeft className="w-4 h-4" /> Đăng nhập lại
            </Link>
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}
