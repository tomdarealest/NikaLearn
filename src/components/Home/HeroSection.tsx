"use client";

import { ChevronLeft, ChevronRight, Star, Users, Clock, ArrowRight, BookOpen, Sparkles, PlayCircle } from "lucide-react";
import Badge from "@/components/Badge";
import PageContainer from "@/components/PageContainer";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedSunMascot from "./AnimatedSunMascot";
import BottomCloudWaves from "./BottomCloudWaves";

interface Course {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  price: string;
  priceAmount: number;
  rating: number;
  students: number;
  duration: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPro: boolean;
  isFree: boolean;
  thumbnailUrl?: string | null;
  instructor?: {
    name?: string;
    username?: string;
    avatar?: string | null;
  };
  featured?: boolean;
}

const LEVEL_MAP: Record<string, "Cơ bản" | "Trung cấp" | "Nâng cao"> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

// Helper function to calculate original price and discount for PRO courses
const calculatePricing = (currentPrice: number) => {
  const originalPrice = Math.round(currentPrice * 1.4);
  const roundedOriginalPrice = Math.round(originalPrice / 100000) * 100000;
  const discountPercent = Math.round(((roundedOriginalPrice - currentPrice) / roundedOriginalPrice) * 100);
  
  return {
    originalPrice: roundedOriginalPrice,
    currentPrice: currentPrice,
    discountPercent,
  };
};

export default function HeroSection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);
  
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/courses?limit=5");
      const data = await response.json();

      if (data.success) {
        const fetchedCourses = data.data.courses.map((course: any, index: number) => ({
          ...course,
          featured: index === 0,
        }));
        setCourses(fetchedCourses);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (course: Course) => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đăng ký khóa học");
      return;
    }

    if (enrollingCourse) return;

    try {
      setEnrollingCourse(course.id);
      const response = await fetch(`/api/courses/${course.slug}/enroll`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Đăng ký khóa học thành công!");
        
        if (data.data?.upgradedToPro) {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setTimeout(() => {
            router.push(`/learn/${course.slug}`);
          }, 800);
        }
      } else {
        if (data.message && data.message.includes('đã đăng ký')) {
          toast.info("Bạn đã đăng ký khóa học này. Đang chuyển hướng...");
          setTimeout(() => {
            router.push(`/learn/${course.slug}`);
          }, 800);
        } else {
          toast.error(data.message || "Không thể đăng ký khóa học");
        }
      }
    } catch (error) {
      console.error("Error during enrollment:", error);
      toast.error("Đã có lỗi xảy ra khi đăng ký. Vui lòng thử lại");
    } finally {
      setEnrollingCourse(null);
    }
  };

  const handleProCourseClick = async (course: Course) => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để tiếp tục");
      return;
    }

    if (enrollingCourse) return;

    try {
      setEnrollingCourse(course.id);
      const response = await fetch(`/api/courses/${course.slug}`, {
        credentials: "include",
      });
      
      const data = await response.json();

      if (data.success) {
        if (data.data.isEnrolled) {
          router.push(`/learn/${course.slug}`);
        } else {
          router.push(`/courses/${course.slug}`);
        }
      } else {
        router.push(`/courses/${course.slug}`);
      }
    } catch (error) {
      console.error("Error checking enrollment:", error);
      router.push(`/courses/${course.slug}`);
    } finally {
      setEnrollingCourse(null);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.9,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    if (courses.length === 0) return;
    
    setDirection(newDirection);
    
    setCurrentIndex((prevIndex) => {
      const isWrapping = 
        (newDirection === 1 && prevIndex === courses.length - 1) ||
        (newDirection === -1 && prevIndex === 0);
      
      if (isWrapping) {
        setSlideKey(prev => prev + 1);
      }
      
      if (newDirection === 1) {
        return prevIndex === courses.length - 1 ? 0 : prevIndex + 1;
      } else {
        return prevIndex === 0 ? courses.length - 1 : prevIndex - 1;
      }
    });
  };

  // Skeleton loading component
  const SkeletonCard = () => (
    <div className="h-full bg-white rounded-2xl shadow-lg p-4 animate-pulse border border-gray-100">
      <div className="w-full h-48 bg-gray-200 rounded-xl mb-4"></div>
      <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-1/2 bg-gray-200 rounded mb-4"></div>
      <div className="flex justify-between items-center">
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <section className="relative w-full bg-[#6B8045] text-white overflow-hidden transition-colors duration-300">
      {/* TID Signature Grid pattern background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />
      
      {/* Subtle organic light accent */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

      <PageContainer size="lg" className="relative max-w-[1360px] mx-auto px-6 sm:px-10 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-0 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center min-h-[440px] sm:min-h-[500px] lg:min-h-[560px]">
          
          {/* Left Column: Tiêu đề "Nền tảng Luyện thi TOEIC" đưa xích vào giữa hài hòa, không bị dính sát mép trái */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col justify-center items-start lg:pl-10 xl:pl-16 text-left z-10 py-10 sm:py-14 lg:py-20"
          >
            {/* Dòng 1: "Nền tảng" + Badge NIKALEARN màu vàng tươi nổi bật */}
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <span className="text-4xl sm:text-6xl lg:text-7xl xl:text-[80px] font-black text-white tracking-tight leading-none">
                Nền tảng
              </span>
              <span className="bg-[#FFD23F] text-[#121212] border-2 sm:border-[2.5px] border-[#121212] shadow-[3px_3px_0_#121212] text-xs sm:text-sm lg:text-base font-black px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full uppercase tracking-wider">
                NIKALEARN
              </span>
            </div>

            {/* Dòng 2: "Luyện thi TOEIC" chữ lớn đóng khung viền mờ bo góc */}
            <div className="relative inline-block">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[82px] xl:text-[98px] font-black text-white tracking-tight leading-[1.05] px-4 sm:px-7 lg:px-8 py-2 sm:py-3.5 lg:py-4 border-2 sm:border-[3px] border-white/50 rounded-2xl sm:rounded-3xl lg:rounded-[36px] bg-white/10 backdrop-blur-md shadow-lg whitespace-nowrap">
                Luyện thi TOEIC
              </h1>
            </div>
          </motion.div>

          {/* Right Column: Animated Sun Mascot (Ông mặt trời The IELTS Dictionary style đặt sát chân sóng) */}
          <div className="lg:col-span-5 relative w-full flex items-end justify-center lg:justify-end z-10 self-end overflow-visible">
            <AnimatedSunMascot />
          </div>

        </div>
      </PageContainer>

      {/* Chân mây bọt sóng trắng viền đen uốn lượn dưới đáy banner */}
      <BottomCloudWaves />
    </section>
  );
}

function CourseCard({ 
  course, 
  featured, 
  isDragging, 
  onEnroll, 
  onProClick, 
  isEnrolling 
}: { 
  course: Course; 
  featured?: boolean; 
  isDragging?: boolean;
  onEnroll: () => void;
  onProClick: () => void;
  isEnrolling: boolean;
}) {
  const router = useRouter();
  const levelDisplay = LEVEL_MAP[course.level] || "Cơ bản";
  const [hasMoved, setHasMoved] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging || hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để tiếp tục");
      return;
    }

    if (course.isFree) {
      if (isEnrolling) return;
      
      // Check enrollment for free course
      (async () => {
        try {
          const response = await fetch(`/api/courses/${course.slug}`, {
            credentials: "include",
          });
          const data = await response.json();
          
          if (data.success && data.data.isEnrolled) {
            router.push(`/learn/${course.slug}`);
          } else {
            onEnroll();
          }
        } catch (error) {
          console.error("Error checking enrollment:", error);
          toast.error("Có lỗi xảy ra. Vui lòng thử lại");
        }
      })();
    } else {
      onProClick();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (startPos) {
      const deltaX = Math.abs(e.clientX - startPos.x);
      const deltaY = Math.abs(e.clientY - startPos.y);
      if (deltaX > 5 || deltaY > 5) {
        setHasMoved(true);
      }
    }
  };

  const handleMouseUp = () => {
    setTimeout(() => {
      setHasMoved(false);
      setStartPos(null);
    }, 50);
  };

  return (
    <div 
      className={`bg-white text-[#121212] rounded-[22px] border-[3.5px] border-[#121212] shadow-[8px_8px_0_#121212] hover:shadow-[11px_11px_0_#121212] hover:-translate-x-[2px] hover:-translate-y-[2px] overflow-hidden transition-all duration-300 ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Image Header */}
      <div className="relative h-48 w-full overflow-hidden border-b-[3px] border-[#121212]">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${isEnrolling ? 'opacity-50' : ''}`}
          />
        ) : (
          <div className={`w-full h-full bg-[#6B8045] flex items-center justify-center ${isEnrolling ? 'opacity-50' : ''}`}>
            <Sparkles className="w-12 h-12 text-[#FFD23F]" />
          </div>
        )}
        
        {/* Loading overlay when enrolling */}
        {isEnrolling && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
              <div className="text-xs font-semibold opacity-90">
                {course.isFree ? "Đang đăng ký..." : "Đang kiểm tra..."}
              </div>
            </div>
          </div>
        )}
        
        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {featured && (
            <span className="px-2.5 py-1 bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[2px_2px_0_#121212] text-xs font-black uppercase rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Nổi bật
            </span>
          )}
          <span className="px-2.5 py-1 bg-[#6B8045] text-white border-2 border-[#121212] shadow-[2px_2px_0_#121212] text-xs font-bold rounded-full">
            {levelDisplay}
          </span>
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center group">
          <div className="w-12 h-12 bg-[#FFD23F] border-2 border-[#121212] shadow-[3px_3px_0_#121212] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
            <PlayCircle className="w-6 h-6 text-[#121212] fill-white" />
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 bg-white">
        <h3 className="text-lg font-black text-[#121212] mb-2 line-clamp-2 leading-tight min-h-[3rem]">
          {course.title}
        </h3>

        <div className="flex items-center gap-2 mb-4">
          {course.instructor?.avatar ? (
             <img src={course.instructor.avatar} alt="" className="w-6 h-6 rounded-full border border-[#121212]" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#6B8045]/20 border border-[#121212] flex items-center justify-center text-xs font-bold text-[#6B8045]">
              {course.instructor?.name?.[0] || "G"}
            </div>
          )}
          <span className="text-sm font-semibold text-stone-700 truncate max-w-[150px]">
            {course.instructor?.name || "Giảng viên"}
          </span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t-2 border-[#121212]/10">
          <div className="flex items-center gap-3 text-xs font-bold text-stone-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-[#6B8045]" />
              <span>{course.students.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#6B8045]" />
              <span>{course.duration || "2h 30p"}</span>
            </div>
          </div>

          <div className="text-right">
            {course.isPro ? (
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-stone-400 font-bold line-through">
                  {new Intl.NumberFormat('vi-VN').format(calculatePricing(course.priceAmount).originalPrice)}₫
                </span>
                <span className="text-lg font-black text-[#6B8045]">
                  {new Intl.NumberFormat('vi-VN').format(course.priceAmount)}₫
                </span>
              </div>
            ) : (
              <span className="inline-block bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[2px_2px_0_#121212] px-2.5 py-0.5 rounded-full text-xs font-black uppercase">
                Miễn phí
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}