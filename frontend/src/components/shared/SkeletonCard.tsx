export function SkeletonCard({ height = 'h-48' }: { height?: string }) {
  return (
    <div className={`card ${height} animate-pulse overflow-hidden relative`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ocean-700/30 to-transparent animate-[shimmer_1.5s_infinite]" />
      <div className="p-6 space-y-4">
        <div className="h-3 bg-ocean-700 rounded w-1/3" />
        <div className="h-12 bg-ocean-700 rounded w-2/3" />
        <div className="h-3 bg-ocean-700 rounded w-1/2" />
        <div className="h-3 bg-ocean-700 rounded w-2/5" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-10 h-10 bg-ocean-700 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-ocean-700 rounded w-1/3" />
        <div className="h-3 bg-ocean-700 rounded w-1/2" />
      </div>
      <div className="h-8 w-12 bg-ocean-700 rounded-lg" />
    </div>
  )
}
