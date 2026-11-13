"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { ActivityDay } from "@/types/profile";

interface ActivityHeatmapProps {
  activities: ActivityDay[];
  totalCount: number;
  currentStreak: number;
}

interface DayCell {
  date: Date;
  count: number;
  month: number;
}

export default function ActivityHeatmap({ activities, totalCount, currentStreak }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ date: Date; count: number; x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Create a map for quick lookup of activity counts by YYYY-MM-DD
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    activities.forEach((activity) => {
      map.set(activity.date, activity.count);
    });
    return map;
  }, [activities]);

  // Generate data for the heatmap (last 365 days / 53 weeks)
  const heatmapData = useMemo(() => {
    const weeks: DayCell[][] = [];
    const today = new Date();
    
    // Calculate the start date (364 days ago)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    
    // Adjust to start from Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    let currentWeek: DayCell[] = [];
    const currentDate = new Date(startDate);
    
    // 53 weeks * 7 days = 371 days
    for (let i = 0; i < 371; i++) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const count = activityMap.get(dateStr) || 0;
      
      currentWeek.push({
        date: new Date(currentDate),
        count,
        month: currentDate.getMonth(),
      });
      
      // If Saturday (end of week), start a new week
      if (currentDate.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [activityMap]);

  // Map weekIndex to Month label (anchored to the week containing the 1st of each month)
  const monthLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    if (heatmapData.length === 0) return map;

    // Find the first week that contains day 1 of a month
    let firstTransitionWeek = -1;
    for (let w = 1; w < heatmapData.length; w++) {
      if (heatmapData[w].some((d) => d.date.getDate() === 1)) {
        firstTransitionWeek = w;
        break;
      }
    }

    // Only label week 0 if the next month transition is far enough (>= 3 weeks)
    if (firstTransitionWeek >= 3) {
      const firstMonthName = heatmapData[0][0].date.toLocaleDateString("vi-VN", { month: "short" });
      map.set(0, firstMonthName.charAt(0).toUpperCase() + firstMonthName.slice(1));
    }

    let lastLabeledWeek = map.has(0) ? 0 : -999;

    heatmapData.forEach((week, weekIndex) => {
      if (weekIndex === 0) return;
      const day1 = week.find((d) => d.date.getDate() === 1);
      if (day1) {
        if (weekIndex - lastLabeledWeek >= 3) {
          const mName = day1.date.toLocaleDateString("vi-VN", { month: "short" });
          map.set(weekIndex, mName.charAt(0).toUpperCase() + mName.slice(1));
          lastLabeledWeek = weekIndex;
        }
      }
    });

    return map;
  }, [heatmapData]);

  // Auto-scroll to current date on mobile
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  // Get color based on activity count (high-contrast olive/green palette)
  const getColor = (count: number) => {
    if (count === 0) return "bg-[#EAE5D9] dark:bg-[#253323] border border-[#121212]/20 dark:border-[#2F422B]";
    if (count <= 2) return "bg-[#A7D170] border border-[#121212]/30";
    if (count <= 5) return "bg-[#7CB342] border border-[#121212]/30";
    if (count <= 9) return "bg-[#6B8045] border border-[#121212]/30";
    return "bg-[#46552B] border border-[#121212]/30";
  };

  const weekDayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return (
    <div className="bg-white dark:bg-[#1B261A] rounded-2xl border-2 border-[#121212] dark:border-[#2F422B] p-5 sm:p-6 shadow-[4px_4px_0_#121212] dark:shadow-[4px_4px_0_#0D150C] w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-lg sm:text-xl font-black text-[#121212] dark:text-white flex items-center gap-2 tracking-tight">
          <span className="w-3 h-3 rounded-full bg-[#6B8045] inline-block"></span>
          {totalCount.toLocaleString("vi-VN")} hoạt động trong năm qua
        </h3>
        {currentStreak > 0 && (
          <div className="px-3 py-1 bg-[#FFD23F] text-[#121212] border-2 border-[#121212] shadow-[2px_2px_0_#121212] rounded-full text-xs font-black flex items-center gap-1.5">
            <span>🔥 {currentStreak} ngày streak liên tiếp</span>
          </div>
        )}
      </div>

      {/* Heatmap Container - Spans full width on desktop, smoothly scrollable on narrow screens */}
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-700 select-none"
      >
        <div
          className="w-full min-w-[720px] grid gap-[2px] sm:gap-[3px] md:gap-[4px]"
          style={{ gridTemplateColumns: "auto repeat(53, minmax(0, 1fr))" }}
        >
          {/* Row 0: Month labels header */}
          <div className="h-6" /> {/* Empty corner for day labels column */}
          {heatmapData.map((_, weekIndex) => (
            <div key={`month-${weekIndex}`} className="relative h-6">
              {monthLabelMap.has(weekIndex) && (
                <span
                  className={`absolute bottom-1 text-[11px] sm:text-xs font-black text-stone-700 dark:text-stone-300 whitespace-nowrap pointer-events-none select-none ${
                    weekIndex >= heatmapData.length - 3 ? "right-0 text-right" : "left-0"
                  }`}
                >
                  {monthLabelMap.get(weekIndex)}
                </span>
              )}
            </div>
          ))}

          {/* Rows 1 to 7: Day rows (CN -> T7) */}
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
            <div key={`row-${dayIndex}`} className="contents">
              {/* Day label in Column 1 */}
              <div
                className="text-[10px] sm:text-[11px] font-black text-stone-600 dark:text-stone-400 flex items-center justify-end pr-1 sm:pr-2 select-none"
                style={{ visibility: dayIndex % 2 === 1 ? "visible" : "hidden" }}
              >
                {weekDayLabels[dayIndex]}
              </div>

              {/* Day cells for each of the 53 weeks */}
              {heatmapData.map((week, weekIndex) => {
                const day = week[dayIndex];
                if (!day) return <div key={`empty-${weekIndex}-${dayIndex}`} />;

                const dayTime = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate()).getTime();
                const isToday = dayTime === todayStart;
                const isFutureDate = dayTime > todayStart;

                return (
                  <div
                    key={`cell-${weekIndex}-${dayIndex}`}
                    className={`
                      w-full aspect-square rounded-[2px] sm:rounded-[3px] cursor-pointer transition-all
                      ${isFutureDate ? "bg-transparent border border-dashed border-stone-200 dark:border-stone-800" : getColor(day.count)}
                      ${isToday ? "ring-2 ring-[#FFD23F] ring-offset-1 ring-offset-white dark:ring-offset-[#1B261A]" : ""}
                      hover:ring-2 hover:ring-[#121212] hover:ring-offset-1
                    `}
                    onMouseEnter={(e) => {
                      if (!isFutureDate) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          date: day.date,
                          count: day.count,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between mt-4 pt-3.5 border-t-2 border-stone-200 dark:border-stone-800/80 flex-wrap gap-2">
        <span className="text-xs font-extrabold text-stone-500 dark:text-stone-400">
          Tổng hợp đóng góp trong năm qua
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400">Ít hơn</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-[3px] bg-[#EAE5D9] dark:bg-[#253323] border border-[#121212]/20 dark:border-[#2F422B]" title="0 hoạt động" />
            <div className="w-3 h-3 rounded-[3px] bg-[#A7D170] border border-[#121212]/30" title="1-2 hoạt động" />
            <div className="w-3 h-3 rounded-[3px] bg-[#7CB342] border border-[#121212]/30" title="3-5 hoạt động" />
            <div className="w-3 h-3 rounded-[3px] bg-[#6B8045] border border-[#121212]/30" title="6-9 hoạt động" />
            <div className="w-3 h-3 rounded-[3px] bg-[#46552B] border border-[#121212]/30" title="10+ hoạt động" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400">Nhiều hơn</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 bg-[#121212] text-white text-xs px-3.5 py-2 rounded-xl border-2 border-[#FFD23F] shadow-[3px_3px_0_#FFD23F] pointer-events-none"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-black text-sm text-[#FFD23F]">{hoveredCell.count} hoạt động</div>
          <div className="text-stone-300 font-semibold">
            {hoveredCell.date.toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      )}
    </div>
  );
}
