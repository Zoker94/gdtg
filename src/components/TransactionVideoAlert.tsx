import { AlertCircle } from "lucide-react";

const TransactionVideoAlert = () => {
  return (
    <div className="flex gap-4 bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-500 p-4 rounded-lg mb-5 shadow-sm items-start">
      <div className="text-orange-500 flex-shrink-0">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="m-0 mb-1 text-orange-900 dark:text-orange-200 text-base font-bold">
          Quy định bắt buộc về Video đối chứng
        </h3>
        <p className="m-0 text-orange-700 dark:text-orange-300 text-sm leading-relaxed">
          Hệ thống vận hành <strong>tự động</strong>. Để bảo vệ quyền lợi,{" "}
          <strong>Người mua</strong> phải quay video màn hình từ lúc bấm mua đến lúc đăng nhập.{" "}
          <strong>Người bán</strong> phải quay video tài khoản hoạt động trước khi bàn giao.
        </p>
        <span className="block mt-2 font-bold underline text-red-700 dark:text-red-400 text-sm">
          Mọi khiếu nại không có Video bằng chứng sẽ bị từ chối xử lý.
        </span>
      </div>
    </div>
  );
};

export default TransactionVideoAlert;
