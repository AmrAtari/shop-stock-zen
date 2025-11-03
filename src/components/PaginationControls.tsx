import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onChange,
  totalItems,
  startIndex,
  endIndex,
}) => {
  return (
    <div className="pagination">
      <button onClick={() => onChange(currentPage - 1)} disabled={currentPage <= 1}>
        Prev
      </button>
      <span>
        {startIndex + 1} - {endIndex} of {totalItems}
      </span>
      <button onClick={() => onChange(currentPage + 1)} disabled={currentPage >= totalPages}>
        Next
      </button>
    </div>
  );
};
