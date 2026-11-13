export default function AdminLoading() {
  return (
    <div className="w-full p-6 md:p-8 space-y-8 animate-pulse">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-60 bg-stone-200 dark:bg-stone-800 rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-stone-100 dark:bg-stone-850 rounded" />
        </div>
        <div className="h-10 w-36 bg-orange-100 dark:bg-orange-950/40 rounded-xl" />
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border-2 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded" />
              <div className="h-8 w-8 bg-stone-200 dark:bg-stone-800 rounded-lg" />
            </div>
            <div className="h-8 w-20 bg-stone-300 dark:bg-stone-700 rounded-md" />
            <div className="h-3 w-32 bg-stone-100 dark:bg-stone-850 rounded" />
          </div>
        ))}
      </div>

      {/* Chart and Table Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border-2 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 h-80 space-y-4">
          <div className="h-6 w-48 bg-stone-200 dark:bg-stone-800 rounded" />
          <div className="w-full h-56 bg-stone-100 dark:bg-stone-850 rounded-xl" />
        </div>
        <div className="p-6 rounded-2xl border-2 border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 h-80 space-y-4">
          <div className="h-6 w-40 bg-stone-200 dark:bg-stone-800 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="h-10 w-full bg-stone-100 dark:bg-stone-850 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
