// File: src/components/PaginationControls.tsx
import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onChange?: (page: number) => void;

  // Optional props for advanced pagination
  goToPage?: (page: number) => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  totalItems?: number;
  startIndex?: number;
  endIndex?: number;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onChange,
  goToPage,
  canGoPrev,
  canGoNext,
  totalItems,
  startIndex,
  endIndex,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const handlePageChange = (page: number) => {
    if (onChange) onChange(page);
    if (goToPage) goToPage(page);
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex space-x-2">
        {pages.map((page) => (
          <button
            key={page}
            className={`px-3 py-1 border rounded ${
              page === currentPage ? "bg-blue-500 text-white" : "bg-white text-black"
            }`}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      {totalItems !== undefined && startIndex !== undefined && endIndex !== undefined && (
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1} - {endIndex} of {totalItems}
        </div>
      )}
    </div>
  );
};
