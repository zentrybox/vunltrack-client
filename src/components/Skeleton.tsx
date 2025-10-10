import { memo } from "react";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

const Skeleton = memo(function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
    />
  );
});

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export const SkeletonCard = memo(function SkeletonCard({
  className,
  lines = 3
}: SkeletonCardProps) {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white p-6", className)}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
});

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable = memo(function SkeletonTable({
  rows = 5,
  columns = 4
}: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-5 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 w-24" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default Skeleton;