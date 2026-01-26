import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, CheckCircle, Info, ShoppingCart } from "lucide-react";

interface TermsConfirmationProps {
  type: "create" | "join" | "buyer_create";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const TERMS_CREATE = [
  "Tôi cam kết cung cấp thông tin sản phẩm chính xác và đầy đủ.",
  "Tôi hiểu rằng phí sàn sẽ được tính theo cài đặt của nền tảng.",
  "Tôi đồng ý tuân thủ quy trình giao dịch của GDTG.",
  "Tôi chịu trách nhiệm về tính hợp pháp của sản phẩm giao dịch.",
  "Tôi không thực hiện các hành vi lừa đảo, gian lận.",
];

const TERMS_JOIN = [
  "Tôi đã kiểm tra kỹ thông tin người bán và sản phẩm.",
  "Tôi hiểu rằng tiền sẽ bị treo giữ sau khi đặt cọc.",
  "Tôi đồng ý chỉ giải ngân khi đã nhận được sản phẩm đúng mô tả.",
  "Tôi cam kết không lạm dụng quyền khiếu nại để gian lận.",
  "Tôi hiểu rằng số dư phải đủ để tham gia với vai trò người mua.",
];

const TERMS_BUYER_CREATE = [
  "Tôi hiểu rằng tôi đang tạo phòng với vai trò người mua.",
  "Tôi sẽ chờ người bán vào phòng và điền thông tin sản phẩm.",
  "Tôi chỉ có thể đặt cọc sau khi người bán đã đăng thông tin sản phẩm.",
  "Tôi hiểu rằng tiền sẽ bị treo giữ sau khi đặt cọc.",
  "Tôi cam kết chỉ giải ngân khi đã nhận được sản phẩm đúng mô tả.",
  "Tôi không thực hiện các hành vi lừa đảo, gian lận.",
];

const GUIDELINES = {
  create: [
    { icon: Info, text: "Mô tả sản phẩm chi tiết, rõ ràng để tránh tranh chấp." },
    { icon: AlertTriangle, text: "Không giao hàng trước khi người mua đặt cọc." },
    { icon: CheckCircle, text: "Xác nhận giao dịch sau khi hoàn tất để nhận tiền." },
  ],
  join: [
    { icon: Info, text: "Kiểm tra kỹ hồ sơ và đánh giá của người bán." },
    { icon: AlertTriangle, text: "Chỉ giải ngân khi đã nhận đúng sản phẩm." },
    { icon: CheckCircle, text: "Sử dụng khiếu nại nếu có vấn đề trong thời hạn cho phép." },
  ],
  buyer_create: [
    { icon: ShoppingCart, text: "Bạn đang tạo phòng với vai trò người mua." },
    { icon: Info, text: "Chia sẻ ID & mật khẩu phòng cho người bán để họ vào đăng sản phẩm." },
    { icon: AlertTriangle, text: "Bạn chỉ có thể đặt cọc sau khi người bán điền xong thông tin." },
    { icon: CheckCircle, text: "Chỉ giải ngân khi đã nhận đúng sản phẩm như mô tả." },
  ],
};

export const TermsConfirmation = ({
  type,
  onConfirm,
  onCancel,
  loading,
}: TermsConfirmationProps) => {
  const getTerms = () => {
    if (type === "buyer_create") return TERMS_BUYER_CREATE;
    if (type === "create") return TERMS_CREATE;
    return TERMS_JOIN;
  };

  const terms = getTerms();
  const guidelines = GUIDELINES[type];

  const [accepted, setAccepted] = useState<boolean[]>(
    new Array(terms.length).fill(false)
  );

  const allAccepted = accepted.every((a) => a);

  const handleCheckChange = (index: number, checked: boolean) => {
    const newAccepted = [...accepted];
    newAccepted[index] = checked;
    setAccepted(newAccepted);
  };

  const getTitle = () => {
    if (type === "buyer_create") return "Nội quy dành cho người mua";
    if (type === "create") return "Nội quy tạo phòng giao dịch";
    return "Nội quy tham gia phòng";
  };

  return (
    <Card className="border-border max-w-lg mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Guidelines */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Hướng dẫn</p>
          <div className="space-y-2">
            {guidelines.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                <item.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Cam kết</p>
          <ScrollArea className="h-[200px] rounded border border-border p-3">
            <div className="space-y-3">
              {terms.map((term, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Checkbox
                    id={`term-${idx}`}
                    checked={accepted[idx]}
                    onCheckedChange={(checked) => handleCheckChange(idx, !!checked)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`term-${idx}`}
                    className="text-sm cursor-pointer leading-relaxed"
                  >
                    {term}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
            Hủy bỏ
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 glow-primary"
            disabled={!allAccepted || loading}
          >
            {loading ? "Đang xử lý..." : "Xác nhận & Tiếp tục"}
          </Button>
        </div>

        {!allAccepted && (
          <p className="text-xs text-center text-muted-foreground">
            Vui lòng đánh dấu tất cả các điều khoản để tiếp tục
          </p>
        )}
      </CardContent>
    </Card>
  );
};
