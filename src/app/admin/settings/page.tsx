'use client';

import { useState } from 'react';
import {
  Bell,
  Shield,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  Save,
} from 'lucide-react';

export default function AdminSettings() {
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleSave = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const cardClass = 'bg-white border border-slate-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-all duration-300';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Cài đặt Admin</h1>
        <p className="text-slate-500 text-sm">Quản lý cấu hình và tùy chọn hệ thống</p>
      </div>

      {settingsSaved && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 font-medium text-sm">Cài đặt đã được lưu thành công!</p>
        </div>
      )}

      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Thông báo</h2>
            <p className="text-sm text-slate-500 mt-0.5">Quản lý thông báo và cảnh báo hệ thống</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-600" />
            <span className="text-slate-600 group-hover:text-slate-800 transition text-sm">Nhận thông báo khi có bài học mới</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-600" />
            <span className="text-slate-600 group-hover:text-slate-800 transition text-sm">Nhận cảnh báo lỗi hệ thống</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="w-5 h-5 rounded accent-blue-600" />
            <span className="text-slate-600 group-hover:text-slate-800 transition text-sm">Nhận báo cáo hàng ngày</span>
          </label>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-violet-50 rounded-xl">
            <Shield className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Bảo mật</h2>
            <p className="text-sm text-slate-500 mt-0.5">Quản lý các cài đặt bảo mật và quyền truy cập</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Yêu cầu xác nhận 2FA</label>
            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm">
              <option>Không bắt buộc</option>
              <option defaultValue="">Bắt buộc cho admin</option>
              <option>Bắt buộc cho tất cả</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-600" />
            <span className="text-slate-600 group-hover:text-slate-800 transition text-sm">Bật đăng nhập an toàn</span>
          </label>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-pink-50 rounded-xl">
            <Database className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Nội dung</h2>
            <p className="text-sm text-slate-500 mt-0.5">Cấu hình các tùy chọn liên quan đến nội dung</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Markdown Renderer</label>
            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm">
              <option defaultValue="">Mặc định (GitHub Flavored Markdown)</option>
              <option>CommonMark</option>
              <option>Tùy chỉnh</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-600" />
            <span className="text-slate-600 group-hover:text-slate-800 transition text-sm">Cho phép mã HTML trong markdown</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-600" />
            <span className="text-slate-600 group-hover:text-slate-800 transition text-sm">Tô sáng cú pháp mã nguồn</span>
          </label>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Hiệu suất</h2>
            <p className="text-sm text-slate-500 mt-0.5">Tối ưu hóa hiệu suất hệ thống</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Lưu trữ cache (giây)</label>
            <input
              type="number"
              defaultValue="3600"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Kích thước tối đa file upload (MB)</label>
            <input
              type="number"
              defaultValue="50"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-blue-600" />
            <span className="text-slate-600 group-hover:text-slate-800 transition text-sm">Nén hình ảnh tự động</span>
          </label>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 font-medium text-sm">Lưu ý</p>
          <p className="text-sm text-amber-700 mt-1">
            Các thay đổi cài đặt sẽ ảnh hưởng đến toàn bộ hệ thống. Hãy cẩn thận khi thay đổi.
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-medium text-sm"
        >
          <Save className="w-4 h-4" />
          <span>Lưu cài đặt</span>
        </button>
        <button className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition font-medium text-sm">
          Hủy
        </button>
      </div>
    </div>
  );
}
