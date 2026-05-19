import React from 'react';

const Pagination: React.FC<{ 
  currentPage: number, 
  totalPages: number, 
  onPageChange: (page: number) => void 
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-16">
      <button 
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-600 disabled:opacity-30 disabled:hover:border-gray-100 transition-all"
      >
        <i className="fas fa-chevron-left text-xs"></i>
      </button>
      
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 hover:text-brand-600 hover:border-brand-600 transition-all">1</button>
          {start > 2 && <span className="text-gray-300 font-bold">...</span>}
        </>
      )}

      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${currentPage === page ? 'gradient-primary text-white shadow-lg shadow-brand-500/20' : 'border border-gray-100 text-gray-500 hover:text-brand-600 hover:border-brand-600'}`}
        >
          {page}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-gray-300 font-bold">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 hover:text-brand-600 hover:border-brand-600 transition-all">{totalPages}</button>
        </>
      )}

      <button 
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-600 disabled:opacity-30 disabled:hover:border-gray-100 transition-all"
      >
        <i className="fas fa-chevron-right text-xs"></i>
      </button>
    </div>
  );
};

export default Pagination;
