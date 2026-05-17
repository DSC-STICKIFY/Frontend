import React from "react";

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F1F3F7]">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FDE31E] animate-spin"></div>
      </div>
      <p className="text-gray-500 text-sm font-medium tracking-wide animate-pulse">
        Loading...
      </p>
    </div>
  </div>
);

export default PageLoader;
