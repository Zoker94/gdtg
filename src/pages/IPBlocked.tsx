import { ShieldBan } from "lucide-react";

const IPBlocked = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-4">
        <ShieldBan className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Truy cập bị từ chối</h1>
        <p className="text-muted-foreground">
          Địa chỉ IP của bạn đã bị chặn truy cập vào hệ thống. 
          Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên.
        </p>
      </div>
    </div>
  );
};

export default IPBlocked;
