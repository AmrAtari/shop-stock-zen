import { useState, useMemo } from 'react';

interface UsePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  initialPage?: number;
}

interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export const usePagination = ({
  totalItems,
  itemsPerPage,
  initialPage = 1,
}: UsePaginationProps): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (canGoNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (canGoPrev) {
      setCurrentPage(currentPage - 1);
    }
  };

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
  };
};
