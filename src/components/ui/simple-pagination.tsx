import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const SimplePagination = ({ currentPage, totalPages, onPageChange }: SimplePaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-xs text-muted-foreground">
        Trang {currentPage} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default SimplePagination;

// Helper function to paginate data
export function paginateData<T>(data: T[], page: number, pageSize: number = 10): T[] {
  const start = (page - 1) * pageSize;
  return data.slice(start, start + pageSize);
}

export function getTotalPages(totalItems: number, pageSize: number = 10): number {
  return Math.ceil(totalItems / pageSize);
}
