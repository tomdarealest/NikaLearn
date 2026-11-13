"use client";

import { UserProfile } from '@/types/profile';
import { BookOpen, Award, FileText, MessageCircle, Users, UserPlus } from 'lucide-react';

interface ProfileStatsProps {
  profile: UserProfile;
}

export default function ProfileStats({ profile }: ProfileStatsProps) {
  const stats = [
    {
      icon: Users,
      label: 'Người theo dõi',
      value: profile.followers_count,
      color: 'text-[#0284C7]',
      bgColor: 'bg-[#E0F2FE]',
    },
    {
      icon: UserPlus,
      label: 'Đang theo dõi',
      value: profile.following_count,
      color: 'text-[#9333EA]',
      bgColor: 'bg-[#F3E8FF]',
    },
    {
      icon: BookOpen,
      label: 'Khóa học đã đăng ký',
      value: profile.total_courses_enrolled,
      color: 'text-[#16A34A]',
      bgColor: 'bg-[#DCFCE7]',
    },
    {
      icon: Award,
      label: 'Khóa đã hoàn thành',
      value: profile.total_courses_completed,
      color: 'text-[#CA8A04]',
      bgColor: 'bg-[#FEF08A]',
    },
    {
      icon: FileText,
      label: 'Bài viết',
      value: profile.total_articles_published,
      color: 'text-[#DB2777]',
      bgColor: 'bg-[#FCE7F3]',
    },
    {
      icon: MessageCircle,
      label: 'Thảo luận',
      value: profile.total_forum_posts,
      color: 'text-[#4F46E5]',
      bgColor: 'bg-[#E0E7FF]',
    },
  ];

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] p-4 shadow-[3.5px_3.5px_0_#121212] dark:shadow-[3.5px_3.5px_0_#0D150C] hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212] transition-all duration-200 flex flex-col justify-between"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bgColor} border-2 border-[#121212] shadow-[2px_2px_0_#121212] flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${stat.color} stroke-[2.5]`} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-[#121212] dark:text-white mb-0.5 tracking-tight">
                {stat.value}
              </div>
              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-300 leading-snug">
                {stat.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
