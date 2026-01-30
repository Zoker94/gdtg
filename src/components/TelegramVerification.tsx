import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Phone,
  CheckCircle,
  Shield,
  QrCode,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface TelegramVerificationProps {
  isVerified: boolean;
  phoneNumber: string | null;
}

const TelegramVerification = ({ isVerified, phoneNumber }: TelegramVerificationProps) => {
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [localIsVerified, setLocalIsVerified] = useState(isVerified);
  const [localPhoneNumber, setLocalPhoneNumber] = useState(phoneNumber);

  const telegramLink = user?.id
    ? `https://t.me/Trunggianbot?start=${user.id}`
    : "";

  // Listen for realtime updates on profile
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`telegram-verification-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Profile update received:", payload);
          const newProfile = payload.new as { is_verified: boolean; phone_number: string | null };
          
          if (newProfile.is_verified && !localIsVerified) {
            setLocalIsVerified(true);
            setLocalPhoneNumber(newProfile.phone_number);
            setShowQR(false);
            
            toast({
              title: "🎉 Xác thực thành công!",
              description: "Tài khoản của bạn đã được bảo vệ bằng số điện thoại.",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("Telegram verification subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, localIsVerified]);

  // Sync with props
  useEffect(() => {
    setLocalIsVerified(isVerified);
    setLocalPhoneNumber(phoneNumber);
  }, [isVerified, phoneNumber]);

  if (localIsVerified) {
    return (
      <Card className="border-border bg-gradient-to-br from-green-500/10 to-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            Bảo vệ tài khoản
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <Badge variant="default" className="bg-green-500 mb-1">
                Đã xác thực
              </Badge>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {localPhoneNumber || "Số điện thoại đã được xác thực"}
              </p>
            </div>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-3">
            ✓ Tài khoản của bạn đã được bảo vệ bằng số điện thoại
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          Xác thực số điện thoại
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {!showQR ? (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Xác thực số điện thoại qua Telegram để bảo vệ tài khoản và tăng độ tin cậy
              </p>
              <Button onClick={() => setShowQR(true)} className="gap-2">
                <QrCode className="w-4 h-4" />
                Xác thực qua Telegram
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-4"
            >
              <div className="inline-block p-4 bg-white rounded-xl shadow-lg mb-4">
                <QRCodeSVG
                  value={telegramLink}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>
              
              <p className="text-sm font-medium mb-2">
                Quét mã QR bằng ứng dụng Telegram
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Hoặc nhấn vào link bên dưới nếu bạn đang dùng điện thoại
              </p>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(telegramLink, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                  Mở Telegram
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowQR(false)}
                >
                  <RefreshCw className="w-4 h-4" />
                  Ẩn mã QR
                </Button>
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  ⏳ Đang chờ xác thực... Trang sẽ tự động cập nhật khi hoàn tất
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default TelegramVerification;
