export default function ExamLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-stone-200 dark:bg-stone-800 rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-stone-100 dark:bg-stone-850 rounded" />
        </div>
        <div className="h-10 w-full md:w-80 bg-stone-200 dark:bg-stone-800 rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        ))}
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border-2 border-stone-200/80 dark:border-stone-800 p-5 space-y-4 bg-white dark:bg-[#1A2518]"
          >
            <div className="flex items-center justify-between">
              <div className="h-6 w-20 bg-emerald-100 dark:bg-emerald-950/40 rounded-full" />
              <div className="h-5 w-16 bg-stone-100 dark:bg-stone-800 rounded" />
            </div>
            <div className="h-6 w-3/4 bg-stone-200 dark:bg-stone-700 rounded-md" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded" />
              <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded" />
            </div>
            <div className="pt-4 flex items-center justify-between border-t border-stone-100 dark:border-stone-800">
              <div className="h-4 w-28 bg-stone-100 dark:bg-stone-800 rounded" />
              <div className="h-9 w-24 bg-[#6B8045]/30 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
