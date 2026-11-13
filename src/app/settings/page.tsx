"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import AvatarWithProBadge from '@/components/AvatarWithProBadge';
import SettingsSkeleton from '@/components/SettingsSkeleton';
import { User, Lock, Bell, Wand2, Camera, Globe, Linkedin, Github, Twitter, Facebook, Phone, GraduationCap, Target, Calendar } from 'lucide-react';

type SettingsTab = 'profile' | 'password' | 'notifications' | 'ai';

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    phone: '',
    avatar_url: '',
    website: '',
    linkedin: '',
    github: '',
    twitter: '',
    facebook: '',
    // Student academic & target
    university: '',
    major: '',
    target_score: '650',
    target_deadline: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Avatar preview
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    // Chỉ redirect khi đã load xong và không authenticated
    // Tránh redirect khi đang loading auth state
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Load full profile data including social links from API
    const loadProfileData = async () => {
      if (!user?.username) return;

      try {
        setInitialLoading(true);
        
        // Fetch full profile data from API
        const response = await fetch(`/api/users/${user.username}`);
        const data = await response.json();

        if (data.success && data.data) {
          const profile = data.data;
          
          setProfileForm({
            full_name: profile.full_name || '',
            username: profile.username || '',
            bio: profile.bio || '',
            phone: profile.phone || '',
            avatar_url: profile.avatar_url || '',
            website: profile.website || '',
            linkedin: profile.linkedin || '',
            github: profile.github || '',
            twitter: profile.twitter || '',
            facebook: profile.facebook || '',
            university: profile.university || '',
            major: profile.major || '',
            target_score: profile.target_score || '650',
            target_deadline: profile.target_deadline || '',
          });
          
          setAvatarPreview(profile.avatar_url || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Không thể tải thông tin cá nhân');
      } finally {
        setInitialLoading(false);
      }
    };

    if (user) {
      loadProfileData();
    }
  }, [user?.username, isAuthenticated, authLoading, router]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh!');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB!');
      return;
    }

    try {
      setUploadingAvatar(true);
      toast.info('Đang tải ảnh lên...');

      // Create FormData and upload to server
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      // Update preview and form with Cloudinary URL
      setAvatarPreview(data.data.url);
      setProfileForm(prev => ({
        ...prev,
        avatar_url: data.data.url,
      }));

      toast.success('Tải ảnh lên thành công! Nhấn Lưu thay đổi để cập nhật.');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Không thể tải ảnh lên. Vui lòng thử lại!');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      toast.success('Cập nhật thông tin thành công!');
      
      // Update form with response data (API returns updated profile)
      if (data.data) {
        const profile = data.data;
        setProfileForm({
          full_name: profile.full_name || '',
          username: profile.username || '',
          bio: profile.bio || '',
          phone: profile.phone || '',
          avatar_url: profile.avatar_url || '',
          website: profile.website || '',
          linkedin: profile.linkedin || '',
          github: profile.github || '',
          twitter: profile.twitter || '',
          facebook: profile.facebook || '',
          university: profile.university || '',
          major: profile.major || '',
          target_score: profile.target_score || '650',
          target_deadline: profile.target_deadline || '',
        });
        setAvatarPreview(profile.avatar_url || '');
      }
      
      // Refresh user data from AuthContext to update global state
      await refreshUser();
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      toast.success('Đổi mật khẩu thành công!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Thông tin cá nhân', icon: User },
    { id: 'password' as SettingsTab, label: 'Mật khẩu và bảo mật', icon: Lock },
    { id: 'notifications' as SettingsTab, label: 'Tùy chọn thông báo', icon: Bell },
    { id: 'ai' as SettingsTab, label: 'AI Assistant', icon: Wand2 },
  ];

  // Hiển thị skeleton khi đang check authentication
  if (authLoading) {
    return (
      <PageContainer>
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="mb-8">
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl border border-border p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
                ))}
              </div>
            </div>
            {/* Content Skeleton */}
            <div className="lg:col-span-3">
              <div className="bg-card rounded-xl border border-border p-6">
                <SettingsSkeleton />
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Không render gì nếu chưa authenticate (đang redirect)
  if (!user) {
    return null;
  }

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Cài đặt tài khoản</h1>
          <p className="text-muted-foreground mt-2">
            Quản lý cài đặt tài khoản của bạn như thông tin cá nhân, cài đặt bảo mật, quản lý thông báo, v.v.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="bg-card rounded-xl border border-border p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                      ${activeTab === tab.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-700 hover:bg-muted'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:block">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl border border-border p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">Thông tin cá nhân</h2>
                  <p className="text-muted-foreground mb-6">
                    Quản lý tên hiển thị, tên người dùng, bio và avatar của bạn.
                  </p>

                  {initialLoading ? (
                    <SettingsSkeleton />
                  ) : (
                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                    {/* Avatar Upload */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Ảnh đại diện
                      </label>
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <AvatarWithProBadge
                            avatarUrl={avatarPreview}
                            fullName={user?.full_name || 'User'}
                            isPro={user?.membership_type === 'PRO'}
                            size="xl"
                          />
                          {uploadingAvatar && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleAvatarClick}
                            disabled={uploadingAvatar}
                            className="absolute bottom-0 right-0 bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            disabled={uploadingAvatar}
                            className="hidden"
                          />
                          <p className="text-sm text-muted-foreground mb-2">
                            Ảnh hồ sơ của bạn sẽ hiển thị công khai trên các trang của bạn.
                          </p>
                          <button
                            type="button"
                            onClick={handleAvatarClick}
                            disabled={uploadingAvatar}
                            className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingAvatar ? 'Đang tải lên...' : 'Chọn ảnh mới'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Khuân Huynh"
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Tên người dùng
                      </label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="huynhkhuanit"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Tên người dùng của bạn sẽ xuất hiện trong URL profile
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                        <Phone className="w-4 h-4" />
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => {
                          // Chỉ cho phép số và một số ký tự đặc biệt như +, -, khoảng trắng
                          const value = e.target.value.replace(/[^\d+\-\s()]/g, '');
                          setProfileForm({ ...profileForm, phone: value });
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0123456789 hoặc +84..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Số điện thoại sẽ được sử dụng để khôi phục mật khẩu và nhận mã OTP
                      </p>
                    </div>

                    {/* Student Academic Section */}
                    <div className="border-t border-border pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-bold text-foreground">Thông tin học tập (Học viên)</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Cung cấp trường và chuyên ngành để hệ thống đề xuất bài tập và lộ trình phù hợp.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* University */}
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Trường Đại học / Cao đẳng
                          </label>
                          <input
                            type="text"
                            value={profileForm.university}
                            onChange={(e) => setProfileForm({ ...profileForm, university: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-[#1B261A]"
                            placeholder="Ví dụ: Đại học Công nghệ TP.HCM (HUTECH)"
                          />
                        </div>

                        {/* Major */}
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Chuyên ngành đào tạo
                          </label>
                          <input
                            type="text"
                            value={profileForm.major}
                            onChange={(e) => setProfileForm({ ...profileForm, major: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-[#1B261A]"
                            placeholder="Ví dụ: Công nghệ thông tin / Ngôn ngữ Anh"
                          />
                        </div>
                      </div>
                    </div>

                    {/* TOEIC Target Section */}
                    <div className="border-t border-border pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-bold text-foreground">Mục tiêu điểm TOEIC & Thời hạn (Deadline)</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Chọn mốc điểm mong muốn và ngày dự định thi để hệ thống nhắc nhở tiến độ.
                      </p>

                      {/* Score Target Pills */}
                      <div className="mb-5">
                        <label className="block text-sm font-semibold text-foreground mb-2.5">
                          Mốc điểm mục tiêu
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { score: '500', label: 'Cơ bản (500+)', desc: 'Tốt nghiệp ĐH' },
                            { score: '650', label: 'Khá (650+)', desc: 'Đi làm công ty' },
                            { score: '785', label: 'Giỏi (785+)', desc: 'Đa quốc gia' },
                            { score: '900+', label: 'Xuất sắc (900+)', desc: 'Chuyên gia / GV' },
                          ].map((item) => {
                            const isSelected = profileForm.target_score === item.score;
                            return (
                              <button
                                key={item.score}
                                type="button"
                                onClick={() => setProfileForm({ ...profileForm, target_score: item.score })}
                                className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#FFD23F]/20 border-[#121212] shadow-[3px_3px_0_#121212] dark:bg-[#6B8045]/20 dark:border-[#FFD23F]'
                                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 bg-white dark:bg-[#1B261A]'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-base font-black text-foreground">{item.score}</span>
                                  {isSelected && (
                                    <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                                  )}
                                </div>
                                <div className="text-xs font-bold text-foreground/80">{item.label}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Target Deadline */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          Ngày dự định thi (Deadline)
                        </label>
                        <input
                          type="date"
                          value={profileForm.target_deadline ? profileForm.target_deadline.split('T')[0] : ''}
                          onChange={(e) => setProfileForm({ ...profileForm, target_deadline: e.target.value })}
                          className="w-full sm:w-72 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-[#1B261A] text-foreground text-sm font-semibold"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Hệ thống sẽ tính toán số ngày còn lại để phân bổ số lượng bài thi mỗi tuần
                        </p>
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Giới thiệu
                      </label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        placeholder="Hãy điền Bio giới thiệu về bản thân tại đây nhé..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Viết một vài dòng giới thiệu về bản thân
                      </p>
                    </div>

                    {/* Social Links */}
                    <div className="border-t border-border pt-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Thông tin mạng xã hội</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Quản lý liên kết tới các trang mạng xã hội của bạn.
                      </p>

                      <div className="space-y-4">
                        {/* Website */}
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Globe className="w-4 h-4" />
                            Trang web cá nhân
                          </label>
                          <input
                            type="url"
                            value={profileForm.website}
                            onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://yourwebsite.com"
                          />
                        </div>

                        {/* LinkedIn */}
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </label>
                          <input
                            type="url"
                            value={profileForm.linkedin}
                            onChange={(e) => setProfileForm({ ...profileForm, linkedin: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>

                        {/* GitHub */}
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Github className="w-4 h-4" />
                            GitHub
                          </label>
                          <input
                            type="url"
                            value={profileForm.github}
                            onChange={(e) => setProfileForm({ ...profileForm, github: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://github.com/username"
                          />
                        </div>

                        {/* Twitter */}
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Twitter className="w-4 h-4" />
                            Twitter / X
                          </label>
                          <input
                            type="url"
                            value={profileForm.twitter}
                            onChange={(e) => setProfileForm({ ...profileForm, twitter: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://twitter.com/username"
                          />
                        </div>

                        {/* Facebook */}
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Facebook className="w-4 h-4" />
                            Facebook
                          </label>
                          <input
                            type="url"
                            value={profileForm.facebook}
                            onChange={(e) => setProfileForm({ ...profileForm, facebook: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://facebook.com/username"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </form>
                  )}
                </div>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">Mật khẩu và bảo mật</h2>
                  <p className="text-muted-foreground mb-6">
                    Cập nhật mật khẩu của bạn để bảo vệ tài khoản.
                  </p>

                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type="password"
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mật khẩu phải có ít nhất 6 ký tự
                      </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">Tùy chọn thông báo</h2>
                  <p className="text-muted-foreground mb-6">
                    Tùy chỉnh các thông báo bạn muốn nhận.
                  </p>
                  <div className="text-center py-12">
                    <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">Chức năng đang được phát triển...</p>
                  </div>
                </div>
              )}

              {/* AI Assistant Tab */}
              {activeTab === 'ai' && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">AI Assistant</h2>
                  <p className="text-muted-foreground mb-6">
                    Cài đặt trợ lý AI để hỗ trợ học tập.
                  </p>
                  <div className="text-center py-12">
                    <Wand2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">Chức năng đang được phát triển...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
