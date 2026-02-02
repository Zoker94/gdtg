import { Wrench, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Đang bảo trì</h1>
          <p className="text-muted-foreground mb-6">
            Website đang được bảo trì để nâng cấp hệ thống. 
            Vui lòng quay lại sau ít phút.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Thời gian dự kiến: 15-30 phút</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Maintenance;
