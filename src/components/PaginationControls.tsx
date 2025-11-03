import React from "react";
import { Button } from "@/components/ui/button";

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  startIndex?: number;
  endIndex?: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPageChange?: (page: number) => void;
  goToPage?: (page: number) => void; // for legacy pages using goToPage
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  canGoPrev,
  canGoNext,
  onPageChange,
  goToPage,
}) => {
  // choose whichever callback is available
  const handlePageChange = (page: number) => {
    if (onPageChange) onPageChange(page);
    else if (goToPage) goToPage(page);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3 text-sm">
      <div>
        {typeof totalItems === "number" && totalItems > 0 ? (
          <span>
            Showing <b>{startIndex}</b>–<b>{endIndex}</b> of <b>{totalItems}</b>
          </span>
        ) : (
          <span>
            Page <b>{currentPage}</b> of <b>{totalPages}</b>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!canGoPrev} onClick={() => handlePageChange(currentPage - 1)}>
          Previous
        </Button>

        <span className="px-3">
          {currentPage} / {totalPages}
        </span>

        <Button variant="outline" size="sm" disabled={!canGoNext} onClick={() => handlePageChange(currentPage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
