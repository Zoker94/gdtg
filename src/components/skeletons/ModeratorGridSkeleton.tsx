import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ModeratorGridSkeletonProps {
  count?: number;
}

export const ModeratorGridSkeleton = ({ count = 6 }: ModeratorGridSkeletonProps) => {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
              <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
