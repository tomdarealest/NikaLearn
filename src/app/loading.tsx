export default function RootLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-8">
      {/* Hero skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-36 bg-stone-200 dark:bg-stone-800 rounded-full" />
        <div className="h-10 w-3/4 max-w-md bg-stone-200 dark:bg-stone-800 rounded-xl" />
        <div className="h-4 w-full max-w-xl bg-stone-100 dark:bg-stone-850 rounded" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border-2 border-stone-200/60 dark:border-stone-800 p-5 space-y-4 bg-card"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 bg-stone-200 dark:bg-stone-800 rounded-md" />
              <div className="h-5 w-14 bg-stone-200 dark:bg-stone-800 rounded-md" />
            </div>
            <div className="h-6 w-4/5 bg-stone-200 dark:bg-stone-800 rounded-md" />
            <div className="h-4 w-full bg-stone-100 dark:bg-stone-850 rounded" />
            <div className="h-4 w-2/3 bg-stone-100 dark:bg-stone-850 rounded" />
            <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-800">
              <div className="h-4 w-24 bg-stone-100 dark:bg-stone-850 rounded" />
              <div className="h-8 w-24 bg-stone-200 dark:bg-stone-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
