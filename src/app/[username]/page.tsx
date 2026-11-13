"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { UserProfile, ActivityData, ProfileTab } from '@/types/profile';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import ProfileStats from '@/components/ProfileStats';
import PageContainer from '@/components/PageContainer';
import AvatarWithProBadge from '@/components/AvatarWithProBadge';
import { Calendar, Award, Clock, BookOpen, FileText, Globe, Linkedin, Github, Twitter, Facebook, Eye, Heart, MessageCircle, ArrowRight, Settings as SettingsIcon, Bookmark } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import CertificateModal from '@/components/CertificateModal';
import { useAuth } from '@/contexts/AuthContext';

// Custom hook for drag-to-scroll functionality with carousel-like behavior
function useDragToScroll() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const clickBlockedRef = useRef(false);

  // Smooth momentum scrolling animation
  const animateScroll = useCallback(() => {
    if (!scrollContainerRef.current || Math.abs(velocityRef.current) < 0.5) {
      velocityRef.current = 0;
      animationFrameRef.current = null;
      return;
    }

    scrollContainerRef.current.scrollLeft -= velocityRef.current;
    velocityRef.current *= 0.95; // Friction factor for smooth deceleration

    animationFrameRef.current = requestAnimationFrame(animateScroll);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    
    // Cancel any ongoing momentum scroll
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Allow drag from anywhere, including cards/links
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    clickBlockedRef.current = false;
    startXRef.current = e.pageX;
    startYRef.current = e.pageY;
    lastXRef.current = e.pageX;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
    velocityRef.current = 0;
    lastTimeRef.current = Date.now();
    
    // Change cursor
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grabbing';
      scrollContainerRef.current.style.scrollBehavior = 'auto'; // Disable smooth scroll during drag
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTimeRef.current;
    const walkX = e.pageX - startXRef.current;
    const walkY = Math.abs(e.pageY - startYRef.current);
    const deltaX = e.pageX - lastXRef.current;
    
    // Only start scrolling if moved horizontally more than vertically
    // and moved more than 3px (threshold to distinguish click from drag)
    if (Math.abs(walkX) > 3 && Math.abs(walkX) > walkY) {
      if (!hasMovedRef.current) {
        hasMovedRef.current = true;
        clickBlockedRef.current = true;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent text selection while dragging
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.userSelect = 'none';
        // Disable pointer events on links only
        const links = scrollContainerRef.current.querySelectorAll('a');
        links.forEach(link => {
          (link as HTMLElement).style.pointerEvents = 'none';
        });
      }
      
      // Calculate velocity for momentum scrolling
      if (deltaTime > 0) {
        velocityRef.current = (deltaX / deltaTime) * 16; // Normalize to 60fps
      }
      
      // Update scroll position smoothly
      scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walkX;
      
      lastXRef.current = e.pageX;
      lastTimeRef.current = currentTime;
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    
    const wasDragging = hasMovedRef.current;
    
    isDraggingRef.current = false;
    
    // Restore styles
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = '';
      scrollContainerRef.current.style.scrollBehavior = 'smooth';
      // Restore pointer events on links
      const links = scrollContainerRef.current.querySelectorAll('a');
      links.forEach(link => {
        (link as HTMLElement).style.pointerEvents = '';
      });
    }
    
    // If we dragged, prevent click on links and start momentum scroll
    if (wasDragging) {
      e.preventDefault();
      e.stopPropagation();
      
      // Start momentum scrolling if velocity is significant
      if (Math.abs(velocityRef.current) > 1) {
        animationFrameRef.current = requestAnimationFrame(animateScroll);
      }
      
      // Block clicks temporarily
      setTimeout(() => {
        clickBlockedRef.current = false;
        hasMovedRef.current = false;
      }, 100);
    } else {
      // Reset immediately if no drag occurred
      hasMovedRef.current = false;
      clickBlockedRef.current = false;
    }
  }, [animateScroll]);

  const handleMouseLeave = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const wasDragging = hasMovedRef.current;
    
    isDraggingRef.current = false;
    
    // Restore styles
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = '';
      scrollContainerRef.current.style.scrollBehavior = 'smooth';
      // Restore pointer events on links
      const links = scrollContainerRef.current.querySelectorAll('a');
      links.forEach(link => {
        (link as HTMLElement).style.pointerEvents = '';
      });
    }
    
    // Start momentum scrolling if we were dragging
    if (wasDragging && Math.abs(velocityRef.current) > 1) {
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    }
    
    // Reset after a delay
    setTimeout(() => {
      hasMovedRef.current = false;
      clickBlockedRef.current = false;
    }, 100);
  }, [animateScroll]);

  // Handle click on links - prevent if we dragged
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      if (clickBlockedRef.current || hasMovedRef.current) {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    container.addEventListener('click', handleClick, true);
    return () => {
      container.removeEventListener('click', handleClick, true);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    scrollContainerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('enrolled');
  const [articles, setArticles] = useState<any[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [completedCourses, setCompletedCourses] = useState<any[]>([]);
  const [completedCoursesLoading, setCompletedCoursesLoading] = useState(false);
  const [savedArticles, setSavedArticles] = useState<any[]>([]);
  const [savedArticlesLoading, setSavedArticlesLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);

  // Drag-to-scroll hooks for courses and articles
  const coursesDragScroll = useDragToScroll();
  const articlesDragScroll = useDragToScroll();
  const completedCoursesDragScroll = useDragToScroll();
  const savedArticlesDragScroll = useDragToScroll();

  const tabs: ProfileTab[] = [
    { id: 'enrolled', label: 'Khoá học đã đăng ký', count: profile?.total_courses_enrolled },
    { id: 'completed', label: 'Khóa học đã hoàn thành', count: profile?.total_courses_completed },
    { id: 'certificates', label: 'Chứng chỉ', count: profile?.total_courses_completed },
    { id: 'articles', label: 'Bài viết', count: profile?.total_articles_published },
    { id: 'saved', label: 'Bài viết đã lưu' },
  ];

  useEffect(() => {
    if (!username) return;

    const fetchProfileData = async () => {
      setLoading(true);
      
      // 1. Fetch Profile (Critical)
      fetch(`/api/users/${username}`)
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            throw new Error(data.message);
          }
          setProfile(data.data);
        })
        .catch(err => {
          setError(err.message || 'Không thể tải thông tin người dùng');
        })
        .finally(() => {
          setLoading(false);
        });

      // 2. Fetch Activities (Non-critical, load in background)
      fetch(`/api/users/${username}/activities`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setActivityData(data.data);
          }
        })
        .catch(console.error);
    };

    fetchProfileData();
  }, [username]);

  // Fetch articles when articles tab is selected
  useEffect(() => {
    const fetchArticles = async () => {
      if (activeTab !== 'articles' || !profile) return;
      
      try {
        setArticlesLoading(true);
        const res = await fetch(`/api/blog/posts?userId=${profile.id}&status=published&limit=12&offset=0`);
        const data = await res.json();
        
        if (data.success && data.data?.posts) {
          setArticles(data.data.posts);
        }
      } catch (err) {
        console.error('Failed to fetch articles:', err);
      } finally {
        setArticlesLoading(false);
      }
    };

    fetchArticles();
  }, [activeTab, profile]);

  // Fetch enrolled courses when enrolled tab is selected
  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (activeTab !== 'enrolled' || !username) return;
      
      try {
        setCoursesLoading(true);
        const res = await fetch(`/api/users/${username}/courses`);
        const data = await res.json();
        
        if (data.success && data.data?.courses) {
          setEnrolledCourses(data.data.courses);
        }
      } catch (err) {
        console.error('Failed to fetch enrolled courses:', err);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, [activeTab, username]);

  // Fetch completed courses when completed tab is selected
  useEffect(() => {
    const fetchCompletedCourses = async () => {
      if (activeTab !== 'completed' || !username) return;
      
      try {
        setCompletedCoursesLoading(true);
        const res = await fetch(`/api/users/${username}/courses?completed=true`);
        const data = await res.json();
        
        if (data.success && data.data?.courses) {
          setCompletedCourses(data.data.courses);
        }
      } catch (err) {
        console.error('Failed to fetch completed courses:', err);
      } finally {
        setCompletedCoursesLoading(false);
      }
    };

    fetchCompletedCourses();
  }, [activeTab, username]);

  // Fetch saved articles when saved tab is selected
  useEffect(() => {
    const fetchSavedArticles = async () => {
      if (activeTab !== 'saved' || !username) return;
      
      try {
        setSavedArticlesLoading(true);
        const res = await fetch(`/api/users/${username}/saved?limit=12&offset=0`);
        const data = await res.json();
        
        if (data.success && data.data?.posts) {
          setSavedArticles(data.data.posts);
        }
      } catch (err) {
        console.error('Failed to fetch saved articles:', err);
      } finally {
        setSavedArticlesLoading(false);
      }
    };

    fetchSavedArticles();
  }, [activeTab, username]);

  if (loading) {
    return (
      <PageContainer>
        <div className="max-w-7xl mx-auto py-8 px-4">
          {/* Profile Header Skeleton */}
          <div className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212]/15 shadow-[4px_4px_0_#121212]/10 overflow-hidden mb-6 animate-pulse">
            <div className="h-32 sm:h-40 bg-stone-200 dark:bg-stone-800"></div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="-mt-16 sm:-mt-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-stone-300 dark:bg-stone-700 border-4 border-white dark:border-[#1B261A]"></div>
                <div className="flex-1 space-y-3 w-full">
                  <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded-lg w-56"></div>
                  <div className="h-5 bg-stone-100 dark:bg-stone-800 rounded-lg w-32"></div>
                  <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded-lg w-full max-w-md"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212]/15 shadow-[3px_3px_0_#121212]/10 p-4 animate-pulse"
              >
                <div className="h-10 w-10 bg-stone-200 dark:bg-stone-700 rounded-xl mb-3"></div>
                <div className="h-7 bg-stone-200 dark:bg-stone-700 rounded-lg w-16 mb-2"></div>
                <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded-lg w-20"></div>
              </div>
            ))}
          </div>

          {/* Activity Heatmap Skeleton */}
          <div className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212]/15 shadow-[4px_4px_0_#121212]/10 p-6 mb-6 animate-pulse">
            <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded-lg w-52 mb-4"></div>
            <div className="h-28 bg-stone-100 dark:bg-stone-800 rounded-xl w-full"></div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !profile) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] shadow-[5px_5px_0_#121212] p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] shadow-[3px_3px_0_#121212] flex items-center justify-center text-3xl mx-auto mb-4">
              😔
            </div>
            <h1 className="text-2xl font-black text-[#121212] dark:text-white mb-2 tracking-tight">
              Không tìm thấy người dùng
            </h1>
            <p className="text-stone-600 dark:text-stone-400 font-semibold text-sm mb-6">
              {error || 'Người dùng không tồn tại hoặc đã bị xóa'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border-2 border-[#121212] bg-[#6B8045] hover:bg-[#556834] text-white font-black text-sm shadow-[3px_3px_0_#121212] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#121212] transition-all"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <div className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] shadow-[5px_5px_0_#121212] dark:shadow-[5px_5px_0_#0D150C] mb-6 overflow-hidden">
          {/* Decorative Cover Banner */}
          <div className="h-28 sm:h-36 bg-gradient-to-r from-[#6B8045] via-[#556834] to-[#FFD23F] relative border-b-2 border-[#121212] dark:border-[#2F422B] overflow-hidden">
            {/* Geometric accents in banner */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#121212_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
            <div className="absolute right-4 top-4 hidden sm:flex items-center gap-2">
              {profile.membership_type === 'PRO' ? (
                <span className="px-3 py-1 rounded-full bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[2px_2px_0_#121212] text-xs font-black uppercase tracking-wider">
                  ⭐ PRO Member
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-white text-[#121212] border-2 border-[#121212] shadow-[2px_2px_0_#121212] text-xs font-black uppercase tracking-wider">
                  🎓 Học viên
                </span>
              )}
            </div>
          </div>

          {/* Profile Card Body */}
          <div className="px-5 sm:px-8 pb-7 pt-0 relative">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-start">
              {/* Avatar overlapping banner */}
              <div className="-mt-14 sm:-mt-16 flex-shrink-0 relative z-10">
                <div className="p-1 bg-white dark:bg-[#1B261A] rounded-full border-[3.5px] border-[#121212] shadow-[4px_4px_0_#121212] inline-block">
                  <AvatarWithProBadge
                    avatarUrl={profile.avatar_url}
                    fullName={profile.full_name}
                    isPro={profile.membership_type === 'PRO'}
                    size="2xl"
                  />
                </div>
              </div>

              {/* Profile Info & Actions */}
              <div className="flex-1 min-w-0 pt-2 sm:pt-4 w-full">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-black text-[#121212] dark:text-white tracking-tight">
                        {profile.full_name}
                      </h1>
                      {/* Mobile Badge */}
                      <div className="sm:hidden">
                        {profile.membership_type === 'PRO' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] text-[10px] font-black uppercase tracking-wider">
                            PRO
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-[#121212] border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] text-[10px] font-black uppercase tracking-wider">
                            Học viên
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm sm:text-base font-extrabold text-[#6B8045] dark:text-[#A7D170] mt-0.5">
                      @{profile.username}
                    </p>
                  </div>

                  {/* Actions (Settings button if viewing own profile) */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {currentUser?.username === profile.username && (
                      <Link
                        href="/settings"
                        className="px-4 py-2 rounded-full border-2 border-[#121212] bg-[#FFD23F] hover:bg-[#FFE072] text-[#121212] font-black text-xs sm:text-sm shadow-[2.5px_2.5px_0_#121212] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#121212] active:translate-y-0 active:shadow-[1px_1px_0_#121212] transition-all flex items-center gap-1.5"
                      >
                        <SettingsIcon className="w-3.5 h-3.5" />
                        <span>Cài đặt tài khoản</span>
                      </Link>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-stone-700 dark:text-stone-300 font-medium text-sm sm:text-base mb-3 max-w-3xl leading-relaxed">
                    {profile.bio}
                  </p>
                )}

                {/* Academic & Target score highlights if present */}
                {(profile.university || profile.major || profile.target_score) && (
                  <div className="flex flex-wrap gap-2 mb-3.5">
                    {profile.target_score && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF3CD] dark:bg-[#3D2C00] border-2 border-[#121212] text-xs font-black text-[#856404] dark:text-[#FFD23F] shadow-[1.5px_1.5px_0_#121212]">
                        🎯 Mục tiêu TOEIC: {profile.target_score}
                      </span>
                    )}
                    {profile.university && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border-2 border-[#121212] dark:border-[#2F422B] text-xs font-black text-stone-800 dark:text-stone-200 shadow-[1.5px_1.5px_0_#121212]">
                        🏛️ {profile.university}
                      </span>
                    )}
                    {profile.major && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-[#082F49] border-2 border-[#121212] text-xs font-black text-[#0369A1] dark:text-[#38BDF8] shadow-[1.5px_1.5px_0_#121212]">
                        📚 {profile.major}
                      </span>
                    )}
                  </div>
                )}

                {/* Social Links */}
                {(profile.website || profile.linkedin || profile.github || profile.twitter || profile.facebook) && (
                  <div className="flex flex-wrap gap-2.5 mb-3.5">
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#1B261A] border-2 border-[#121212] rounded-full text-xs font-black text-[#121212] dark:text-white shadow-[2px_2px_0_#121212] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#121212] transition-all"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Website</span>
                      </a>
                    )}
                    {profile.github && (
                      <a
                        href={profile.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#121212] text-white border-2 border-[#121212] rounded-full text-xs font-black shadow-[2px_2px_0_#6B8045] hover:-translate-y-0.5 transition-all"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>GitHub</span>
                      </a>
                    )}
                    {profile.linkedin && (
                      <a
                        href={profile.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#0284C7] text-white border-2 border-[#121212] rounded-full text-xs font-black shadow-[2px_2px_0_#121212] hover:-translate-y-0.5 transition-all"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                    {profile.facebook && (
                      <a
                        href={profile.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#2563EB] text-white border-2 border-[#121212] rounded-full text-xs font-black shadow-[2px_2px_0_#121212] hover:-translate-y-0.5 transition-all"
                      >
                        <Facebook className="w-3.5 h-3.5" />
                        <span>Facebook</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Key metadata pills */}
                <div className="flex flex-wrap gap-2.5 text-xs font-extrabold text-stone-700 dark:text-stone-300 pt-3 border-t-2 border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    <span>Tham gia từ {joinDate}</span>
                  </div>
                  {profile.learning_streak > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF3CD] dark:bg-[#3D2C00] border-2 border-[#121212] text-[#856404] dark:text-[#FFD23F] shadow-[1.5px_1.5px_0_#121212]">
                      <Award className="w-3.5 h-3.5" />
                      <span>🔥 {profile.learning_streak} ngày streak</span>
                    </div>
                  )}
                  {profile.total_study_time > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-[#082F49] border-2 border-[#121212] text-[#0369A1] dark:text-[#38BDF8] shadow-[1.5px_1.5px_0_#121212]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{Math.floor(profile.total_study_time / 60)}h {profile.total_study_time % 60}m học tập</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-6">
          <ProfileStats profile={profile} />
        </div>

        {/* Activity Heatmap - Always show, even if no data */}
        <div className="mb-6">
          <ActivityHeatmap
            activities={activityData?.activities || []}
            totalCount={activityData?.total_count || 0}
            currentStreak={activityData?.current_streak || 0}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] shadow-[4px_4px_0_#121212] dark:shadow-[4px_4px_0_#0D150C] overflow-hidden">
          {/* Tab Headers */}
          <div className="border-b-2 border-[#121212] dark:border-[#2F422B] bg-[#FFFDF9] dark:bg-[#151F14] p-3">
            <nav className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-shrink-0 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer
                      ${
                        isActive
                          ? "bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[2.5px_2.5px_0_#121212] -translate-y-0.5"
                          : "text-stone-700 dark:text-stone-300 border-2 border-transparent hover:border-[#121212]/30 hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
                      }
                    `}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-black ${
                        isActive 
                          ? "bg-[#121212] text-white" 
                          : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "enrolled" && (
              <>
                {coursesLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-shrink-0 w-80 bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212]/15 shadow-[3px_3px_0_#121212]/10 overflow-hidden animate-pulse">
                        <div className="h-40 bg-stone-200 dark:bg-stone-800"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4"></div>
                          <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : enrolledCourses.length > 0 ? (
                  <div 
                    ref={coursesDragScroll.scrollContainerRef}
                    onMouseDown={coursesDragScroll.handleMouseDown}
                    onMouseMove={coursesDragScroll.handleMouseMove}
                    onMouseUp={coursesDragScroll.handleMouseUp}
                    onMouseLeave={coursesDragScroll.handleMouseLeave}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100 cursor-grab active:cursor-grabbing"
                  >
                    {enrolledCourses.map((course) => {
                      const progressPercentage = Math.round(course.progress_percentage || 0);
                      
                      return (
                        <Link key={course.id} href={`/learn/${course.slug}`}>
                          <div className="flex-shrink-0 w-80 h-full bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] shadow-[3.5px_3.5px_0_#121212] overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212] transition-all">
                            {/* Thumbnail */}
                            <div className="h-40 flex-shrink-0 bg-gradient-to-r from-[#6B8045] to-[#46552B] relative border-b-2 border-[#121212] dark:border-[#2F422B]">
                              {course.thumbnail_url ? (
                                <Image
                                  src={course.thumbnail_url}
                                  alt={course.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="w-12 h-12 text-white/50" />
                                </div>
                              )}
                              {/* Progress Badge */}
                              {course.is_completed ? (
                                <div className="absolute top-2.5 right-2.5 bg-[#00E599] text-[#121212] border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] px-2.5 py-0.5 rounded-full text-xs font-black">
                                  ✓ Hoàn thành
                                </div>
                              ) : (
                                <div className="absolute top-2.5 right-2.5 bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] px-2.5 py-0.5 rounded-full text-xs font-black">
                                  {progressPercentage}%
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col justify-between min-h-[140px]">
                              <div>
                                <p className="text-base font-black text-[#121212] dark:text-white mb-3 line-clamp-2 leading-snug">
                                  {course.title}
                                </p>

                                {/* Progress Bar */}
                                {!course.is_completed && (
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between text-xs font-extrabold text-stone-600 dark:text-stone-300 mb-1.5">
                                      <span>Tiến độ</span>
                                      <span>{progressPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-[#EAE5D9] dark:bg-stone-800 rounded-full h-2.5 border border-[#121212]/20 overflow-hidden">
                                      <div
                                        className="bg-[#6B8045] h-full rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Enrolled Date */}
                              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 dark:text-stone-400 pt-3 border-t-2 border-stone-100 dark:border-stone-800">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  {new Date(course.enrolled_at).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-14 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] shadow-[3px_3px_0_#121212] flex items-center justify-center text-[#121212] mx-auto mb-4">
                      <BookOpen className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <h3 className="text-xl font-black text-[#121212] dark:text-white mb-2 tracking-tight">
                      Chưa có khóa học nào
                    </h3>
                    <p className="text-stone-600 dark:text-stone-400 font-semibold text-sm max-w-md mx-auto mb-6">
                      Học viên chưa đăng ký khóa học nào. Hãy khám phá ngay các khóa học chất lượng từ NikaLearn!
                    </p>
                    <Link
                      href="/courses"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-[#121212] bg-[#6B8045] hover:bg-[#556834] text-white font-black text-sm shadow-[3px_3px_0_#121212] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#121212] transition-all"
                    >
                      <span>Khám phá khóa học</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </Link>
                  </div>
                )}
              </>
            )}

            {activeTab === "completed" && (
              <>
                {completedCoursesLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-shrink-0 w-80 bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212]/15 shadow-[3px_3px_0_#121212]/10 overflow-hidden animate-pulse">
                        <div className="h-40 bg-stone-200 dark:bg-stone-800"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4"></div>
                          <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : completedCourses.length > 0 ? (
                  <div 
                    ref={completedCoursesDragScroll.scrollContainerRef}
                    onMouseDown={completedCoursesDragScroll.handleMouseDown}
                    onMouseMove={completedCoursesDragScroll.handleMouseMove}
                    onMouseUp={completedCoursesDragScroll.handleMouseUp}
                    onMouseLeave={completedCoursesDragScroll.handleMouseLeave}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100 cursor-grab active:cursor-grabbing"
                  >
                    {completedCourses.map((course) => {
                      return (
                        <Link key={course.id} href={`/learn/${course.slug}`}>
                          <div className="flex-shrink-0 w-80 h-full bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] shadow-[3.5px_3.5px_0_#121212] overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212] transition-all">
                            {/* Thumbnail */}
                            <div className="h-40 flex-shrink-0 bg-gradient-to-r from-[#6B8045] to-[#46552B] relative border-b-2 border-[#121212] dark:border-[#2F422B]">
                              {course.thumbnail_url ? (
                                <Image
                                  src={course.thumbnail_url}
                                  alt={course.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="w-12 h-12 text-white/50" />
                                </div>
                              )}
                              {/* Completed Badge */}
                              <div className="absolute top-2.5 right-2.5 bg-[#00E599] text-[#121212] border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] px-2.5 py-0.5 rounded-full text-xs font-black">
                                ✓ Đã xong
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col justify-between min-h-[140px]">
                              <div>
                                <p className="text-base font-black text-[#121212] dark:text-white mb-2 line-clamp-2 leading-snug">
                                  {course.title}
                                </p>

                                {/* Completed Date */}
                                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 dark:text-stone-400 mb-3">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>
                                    {course.completed_at 
                                      ? `Hoàn thành: ${new Date(course.completed_at).toLocaleDateString('vi-VN', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })}`
                                      : 'Đã hoàn thành'}
                                  </span>
                                </div>
                              </div>

                              {/* View Certificate Button */}
                              <div className="pt-3 border-t-2 border-stone-100 dark:border-stone-800">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedCertificate({
                                      studentName: profile.full_name || profile.username,
                                      courseName: course.title,
                                      completionDate: new Date(course.completed_at || Date.now()).toLocaleDateString('vi-VN'),
                                      instructorName: "NikaLearn Instructor",
                                      courseDuration: "Unknown Duration"
                                    });
                                  }}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#FFD23F] hover:bg-[#FFE072] text-[#121212] border-2 border-[#121212] shadow-[2px_2px_0_#121212] rounded-xl text-xs font-black transition-all cursor-pointer"
                                >
                                  <Award className="w-4 h-4" />
                                  <span>Xem chứng chỉ</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-14 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] shadow-[3px_3px_0_#121212] flex items-center justify-center text-[#121212] mx-auto mb-4">
                      <Award className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <h3 className="text-xl font-black text-[#121212] dark:text-white mb-2 tracking-tight">
                      Chưa hoàn thành khóa học nào
                    </h3>
                    <p className="text-stone-600 dark:text-stone-400 font-semibold text-sm max-w-md mx-auto mb-6">
                      Hoàn thành các bài học và bài kiểm tra để nhận chứng chỉ tốt nghiệp từ NikaLearn!
                    </p>
                    <button
                      onClick={() => setActiveTab('enrolled')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-[#121212] bg-[#FFD23F] hover:bg-[#FFE072] text-[#121212] font-black text-sm shadow-[3px_3px_0_#121212] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#121212] transition-all cursor-pointer"
                    >
                      <span>Xem khóa đang học</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === "certificates" && (
              <>
                {completedCoursesLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-shrink-0 w-80 bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212]/15 shadow-[3px_3px_0_#121212]/10 overflow-hidden animate-pulse">
                        <div className="h-40 bg-stone-200 dark:bg-stone-800"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4"></div>
                          <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : completedCourses.length > 0 ? (
                  <div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {completedCourses.map((course) => {
                      return (
                        <div key={course.id} className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] shadow-[3.5px_3.5px_0_#121212] overflow-hidden hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212] transition-all">
                          {/* Certificate Preview */}
                          <div 
                            className="relative h-48 bg-[#FFF8E7] dark:bg-[#253323] border-b-2 border-[#121212] dark:border-[#2F422B] flex items-center justify-center p-4 group cursor-pointer"
                            onClick={() => {
                              setSelectedCertificate({
                                studentName: profile.full_name || profile.username,
                                courseName: course.title,
                                completionDate: new Date(course.completed_at || Date.now()).toLocaleDateString('vi-VN'),
                                instructorName: "NikaLearn Instructor",
                                courseDuration: "Unknown Duration"
                              });
                            }}
                          >
                            <div className="absolute inset-4 border-2 border-dashed border-[#CA8A04]/40 rounded-xl pointer-events-none"></div>
                            <div className="text-center relative z-10">
                              <Award className="w-12 h-12 text-[#CA8A04] mx-auto mb-2 stroke-[2.5]" />
                              <div className="text-[10px] font-black uppercase tracking-widest text-[#856404] dark:text-[#FFD23F]">Chứng nhận tốt nghiệp</div>
                              <div className="font-black text-[#121212] dark:text-white mt-1 line-clamp-1 px-4">{course.title}</div>
                            </div>
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-[#121212]/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[#FFD23F] font-black flex items-center gap-2 text-sm">
                                <Eye className="w-5 h-5 stroke-[2.5]" />
                                Mở toàn màn hình
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            <h3 className="font-black text-[#121212] dark:text-white mb-2 line-clamp-1">{course.title}</h3>
                            <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
                              <span>Cấp: {new Date(course.completed_at || Date.now()).toLocaleDateString('vi-VN')}</span>
                              <button 
                                onClick={() => {
                                  setSelectedCertificate({
                                    studentName: profile.full_name || profile.username,
                                    courseName: course.title,
                                    completionDate: new Date(course.completed_at || Date.now()).toLocaleDateString('vi-VN'),
                                    instructorName: "NikaLearn Instructor",
                                    courseDuration: "Unknown Duration"
                                  });
                                }}
                                className="px-3 py-1 bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] rounded-lg font-black hover:-translate-y-0.5 transition-all cursor-pointer"
                              >
                                Xem chứng chỉ
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-14 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] shadow-[3px_3px_0_#121212] flex items-center justify-center text-[#121212] mx-auto mb-4">
                      <Award className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <h3 className="text-xl font-black text-[#121212] dark:text-white mb-2 tracking-tight">
                      Chưa có chứng chỉ nào
                    </h3>
                    <p className="text-stone-600 dark:text-stone-400 font-semibold text-sm max-w-md mx-auto mb-6">
                      Hoàn thành trọn vẹn một khóa học để sở hữu chứng chỉ hoàn thành từ NikaLearn!
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "articles" && (
              <>
                {articlesLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-shrink-0 w-80 bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212]/15 shadow-[3px_3px_0_#121212]/10 overflow-hidden animate-pulse">
                        <div className="h-40 bg-stone-200 dark:bg-stone-800"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4"></div>
                          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : articles.length > 0 ? (
                  <div 
                    ref={articlesDragScroll.scrollContainerRef}
                    onMouseDown={articlesDragScroll.handleMouseDown}
                    onMouseMove={articlesDragScroll.handleMouseMove}
                    onMouseUp={articlesDragScroll.handleMouseUp}
                    onMouseLeave={articlesDragScroll.handleMouseLeave}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100 cursor-grab active:cursor-grabbing"
                  >
                    {articles.map((article) => {
                      const getCategories = (categoryNames: string | null) => {
                        if (!categoryNames) return [];
                        return categoryNames.split(", ").filter((c) => c).slice(0, 2);
                      };

                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        return date.toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                      };

                      return (
                        <Link key={article.id} href={`/articles/${article.slug}`}>
                          <div className="flex-shrink-0 w-80 h-full bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] shadow-[3.5px_3.5px_0_#121212] overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212] transition-all">
                            {/* Cover Image */}
                            <div className="h-40 flex-shrink-0 bg-gradient-to-r from-[#6B8045] to-[#46552B] relative border-b-2 border-[#121212] dark:border-[#2F422B]">
                              {article.cover_image ? (
                                <Image
                                  src={article.cover_image}
                                  alt={article.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-12 h-12 text-white/50" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col min-h-[180px]">
                              {/* Categories */}
                              {article.category_names && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {getCategories(article.category_names).map((cat, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2.5 py-0.5 bg-[#FFF3CD] text-[#856404] border border-[#121212]/30 rounded-full text-[11px] font-black"
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Title */}
                              <p className="text-base font-black text-[#121212] dark:text-white mb-2 line-clamp-2 leading-snug">
                                {article.title}
                              </p>

                              {/* Excerpt */}
                              <p className="text-stone-600 dark:text-stone-400 font-medium text-xs mb-3 line-clamp-2 flex-1">
                                {article.excerpt}
                              </p>

                              {/* Author & Date */}
                              <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400 mb-2 pb-2 border-b-2 border-stone-100 dark:border-stone-800">
                                <div className="flex items-center gap-1.5">
                                  {article.avatar_url ? (
                                    <Image
                                      src={article.avatar_url}
                                      alt={article.full_name}
                                      width={20}
                                      height={20}
                                      className="rounded-full border border-[#121212]"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-[#6B8045] flex items-center justify-center text-white text-[10px] font-black">
                                      {article.full_name?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                  <span className="font-extrabold text-stone-800 dark:text-stone-200">{article.full_name}</span>
                                </div>
                                <span>{formatDate(article.published_at)}</span>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-3 text-xs font-black text-stone-600 dark:text-stone-400">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{article.view_count || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5" />
                                  <span>{article.like_count || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>{article.comment_count || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-14 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] shadow-[3px_3px_0_#121212] flex items-center justify-center text-[#121212] mx-auto mb-4">
                      <FileText className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <h3 className="text-xl font-black text-[#121212] dark:text-white mb-2 tracking-tight">
                      Chưa có bài viết nào
                    </h3>
                    <p className="text-stone-600 dark:text-stone-400 font-semibold text-sm max-w-md mx-auto mb-6">
                      Chia sẻ kiến thức lập trình, kinh nghiệm phỏng vấn và mẹo học tập của bạn cùng cộng đồng!
                    </p>
                    <Link
                      href="/write"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-[#121212] bg-[#6B8045] hover:bg-[#556834] text-white font-black text-sm shadow-[3px_3px_0_#121212] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#121212] transition-all"
                    >
                      <span>Viết bài đầu tiên</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </Link>
                  </div>
                )}
              </>
            )}

            {activeTab === "saved" && (
              <>
                {savedArticlesLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-shrink-0 w-80 bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212]/15 shadow-[3px_3px_0_#121212]/10 overflow-hidden animate-pulse">
                        <div className="h-40 bg-stone-200 dark:bg-stone-800"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4"></div>
                          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : savedArticles.length > 0 ? (
                  <div 
                    ref={savedArticlesDragScroll.scrollContainerRef}
                    onMouseDown={savedArticlesDragScroll.handleMouseDown}
                    onMouseMove={savedArticlesDragScroll.handleMouseMove}
                    onMouseUp={savedArticlesDragScroll.handleMouseUp}
                    onMouseLeave={savedArticlesDragScroll.handleMouseLeave}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100 cursor-grab active:cursor-grabbing"
                  >
                    {savedArticles.map((article) => {
                      const getCategories = (categoryNames: string | null) => {
                        if (!categoryNames) return [];
                        return categoryNames.split(", ").filter((c) => c).slice(0, 2);
                      };

                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        return date.toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                      };

                      return (
                        <Link key={article.id} href={`/articles/${article.slug}`}>
                          <div className="flex-shrink-0 w-80 h-full bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] shadow-[3.5px_3.5px_0_#121212] overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212] transition-all">
                            {/* Cover Image */}
                            <div className="h-40 flex-shrink-0 bg-gradient-to-r from-[#6B8045] to-[#46552B] relative border-b-2 border-[#121212] dark:border-[#2F422B]">
                              {article.cover_image ? (
                                <Image
                                  src={article.cover_image}
                                  alt={article.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-12 h-12 text-white/50" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col min-h-[180px]">
                              {/* Categories */}
                              {article.category_names && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {getCategories(article.category_names).map((cat, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2.5 py-0.5 bg-[#FFF3CD] text-[#856404] border border-[#121212]/30 rounded-full text-[11px] font-black"
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Title */}
                              <p className="text-base font-black text-[#121212] dark:text-white mb-2 line-clamp-2 leading-snug">
                                {article.title}
                              </p>

                              {/* Excerpt */}
                              <p className="text-stone-600 dark:text-stone-400 font-medium text-xs mb-3 line-clamp-2 flex-1">
                                {article.excerpt}
                              </p>

                              {/* Author & Date */}
                              <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400 mb-2 pb-2 border-b-2 border-stone-100 dark:border-stone-800">
                                <div className="flex items-center gap-1.5">
                                  {article.avatar_url ? (
                                    <Image
                                      src={article.avatar_url}
                                      alt={article.full_name}
                                      width={20}
                                      height={20}
                                      className="rounded-full border border-[#121212]"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-[#6B8045] flex items-center justify-center text-white text-[10px] font-black">
                                      {article.full_name?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                  <span className="font-extrabold text-stone-800 dark:text-stone-200">{article.full_name}</span>
                                </div>
                                <span>{formatDate(article.published_at)}</span>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-3 text-xs font-black text-stone-600 dark:text-stone-400">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{article.view_count || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5" />
                                  <span>{article.like_count || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>{article.comment_count || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-14 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFD23F] border-2 border-[#121212] shadow-[3px_3px_0_#121212] flex items-center justify-center text-[#121212] mx-auto mb-4">
                      <Bookmark className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <h3 className="text-xl font-black text-[#121212] dark:text-white mb-2 tracking-tight">
                      Chưa lưu bài viết nào
                    </h3>
                    <p className="text-stone-600 dark:text-stone-400 font-semibold text-sm max-w-md mx-auto mb-6">
                      Lưu trữ các bài viết hay để dễ dàng tra cứu và ôn tập kiến thức bất cứ khi nào!
                    </p>
                    <Link
                      href="/articles"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-[#121212] bg-[#6B8045] hover:bg-[#556834] text-white font-black text-sm shadow-[3px_3px_0_#121212] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#121212] transition-all"
                    >
                      <span>Khám phá bài viết</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Certificate Modal */}
      {selectedCertificate && (
        <CertificateModal
          isOpen={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          data={selectedCertificate}
          disableCelebration={true}
        />
      )}
    </PageContainer>
  );
}
