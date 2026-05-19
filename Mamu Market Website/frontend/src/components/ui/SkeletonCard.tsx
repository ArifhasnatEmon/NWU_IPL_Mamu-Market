import React from 'react';

const SkeletonCard: React.FC<{ viewMode?: 'grid' | 'list' }> = ({ viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-row items-center p-5 gap-8 animate-pulse">
        <div className="w-44 h-44 bg-gray-100 rounded-xl shrink-0" />
        <div className="flex-1 flex flex-col gap-3">
          <div className="h-3 bg-gray-100 rounded-full w-1/4" />
          <div className="h-5 bg-gray-100 rounded-full w-3/4" />
          <div className="h-4 bg-gray-100 rounded-full w-1/2" />
          <div className="h-7 bg-gray-100 rounded-full w-1/3 mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex flex-col animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-4 flex flex-col gap-2.5">
        <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
        <div className="h-3.5 bg-gray-100 rounded-full w-full" />
        <div className="h-3.5 bg-gray-100 rounded-full w-2/3" />
        <div className="mt-2 flex items-center justify-between">
          <div className="h-5 bg-gray-100 rounded-full w-1/4" />
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(s => (
              <div key={s} className="w-2.5 h-2.5 bg-gray-100 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
