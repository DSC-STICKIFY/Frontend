import React from "react";

const SkeletonCard = () => (
  <div className="bg-white rounded-xl w-[300px] min-w-[300px] flex-shrink-0 border border-gray-100 overflow-hidden animate-pulse">
    {/* Image placeholder */}
    <div className="h-[250px] w-full bg-gray-200" />
    {/* Content placeholder */}
    <div className="px-4 py-3 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-10 bg-gray-200 rounded-lg w-full" />
    </div>
  </div>
);

const LoadingSkeleton = ({ rows = 2, cardsPerRow = 4 }) => (
  <div className="flex flex-col gap-6">
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Category header skeleton */}
        <div className="flex justify-between border-b border-[#E1E1E1] py-4 px-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-100 rounded w-20" />
        </div>
        {/* Cards row */}
        <div className="flex overflow-x-auto p-6 gap-6">
          {Array.from({ length: cardsPerRow }).map((_, cardIdx) => (
            <SkeletonCard key={cardIdx} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
