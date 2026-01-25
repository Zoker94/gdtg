import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitKyc, useMyKycSubmission } from "@/hooks/useKYC";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Camera, Upload, CheckCircle, XCircle, Clock, Loader2, IdCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const KYCForm = () => {
  const { user } = useAuth();
  const { data: existingSubmission, isLoading } = useMyKycSubmission();
  const submitKyc = useSubmitKyc();

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Chỉ chấp nhận file ảnh", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File quá lớn (tối đa 5MB)", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/${side}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("kyc-documents")
        .getPublicUrl(fileName);

      if (side === "front") {
        setFrontImage(urlData.publicUrl);
      } else {
        setBackImage(urlData.publicUrl);
      }

      toast({ title: `Đã tải lên ảnh mặt ${side === "front" ? "trước" : "sau"}` });
    } catch (error: any) {
      toast({
        title: "Lỗi tải ảnh",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!frontImage || !backImage) {
      toast({
        title: "Vui lòng tải lên cả 2 mặt CCCD",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim() || !idNumber.trim()) {
      toast({
        title: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }

    await submitKyc.mutateAsync({
      front_image_url: frontImage,
      back_image_url: backImage,
      full_name: fullName,
      id_number: idNumber,
      date_of_birth: dateOfBirth || undefined,
    });
  };

  if (isLoading) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show status if already submitted
  if (existingSubmission) {
    const statusConfig = {
      pending: {
        icon: Clock,
        label: "Đang chờ duyệt",
        variant: "secondary" as const,
        color: "text-yellow-500",
      },
      approved: {
        icon: CheckCircle,
        label: "Đã xác minh",
        variant: "default" as const,
        color: "text-green-500",
      },
      rejected: {
        icon: XCircle,
        label: "Bị từ chối",
        variant: "destructive" as const,
        color: "text-destructive",
      },
    };

    const status = statusConfig[existingSubmission.status as keyof typeof statusConfig];
    const StatusIcon = status?.icon || Clock;

    return (
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5" />
            Xác minh danh tính (KYC)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-8 h-8 ${status?.color}`} />
            <div>
              <Badge variant={status?.variant}>{status?.label}</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Gửi lúc: {new Date(existingSubmission.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>

          {existingSubmission.status === "rejected" && existingSubmission.rejection_reason && (
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium text-destructive">Lý do từ chối:</p>
              <p className="text-sm text-muted-foreground">{existingSubmission.rejection_reason}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Mặt trước</p>
              <img
                src={existingSubmission.front_image_url}
                alt="CCCD mặt trước"
                className="w-full h-32 object-cover rounded-lg border"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Mặt sau</p>
              <img
                src={existingSubmission.back_image_url}
                alt="CCCD mặt sau"
                className="w-full h-32 object-cover rounded-lg border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Họ tên:</span>{" "}
              <span className="font-medium">{existingSubmission.full_name}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Số CCCD:</span>{" "}
              <span className="font-medium">{existingSubmission.id_number}</span>
            </p>
            {existingSubmission.date_of_birth && (
              <p className="text-sm">
                <span className="text-muted-foreground">Ngày sinh:</span>{" "}
                <span className="font-medium">
                  {new Date(existingSubmission.date_of_birth).toLocaleDateString("vi-VN")}
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="w-5 h-5" />
          Xác minh danh tính (KYC)
        </CardTitle>
        <CardDescription>
          Vui lòng chụp ảnh căn cước công dân để xác minh tài khoản
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ID Card Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front side */}
            <div className="space-y-2">
              <Label>Mặt trước CCCD *</Label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  frontImage ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                {frontImage ? (
                  <div className="relative">
                    <img
                      src={frontImage}
                      alt="Mặt trước CCCD"
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => document.getElementById("front-upload")?.click()}
                    >
                      Đổi ảnh
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="front-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer py-4"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Nhấn để chụp/tải ảnh mặt trước
                    </span>
                  </label>
                )}
                <input
                  id="front-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, "front")}
                  disabled={uploading}
                />
              </div>
            </div>

            {/* Back side */}
            <div className="space-y-2">
              <Label>Mặt sau CCCD *</Label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  backImage ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                {backImage ? (
                  <div className="relative">
                    <img
                      src={backImage}
                      alt="Mặt sau CCCD"
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => document.getElementById("back-upload")?.click()}
                    >
                      Đổi ảnh
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="back-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer py-4"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Nhấn để chụp/tải ảnh mặt sau
                    </span>
                  </label>
                )}
                <input
                  id="back-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, "back")}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kyc-fullname">Họ và tên (như trên CCCD) *</Label>
              <Input
                id="kyc-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="NGUYỄN VĂN A"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-idnumber">Số CCCD *</Label>
              <Input
                id="kyc-idnumber"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="0123456789012"
                maxLength={12}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-dob">Ngày sinh</Label>
              <Input
                id="kyc-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitKyc.isPending || uploading || !frontImage || !backImage}
          >
            {submitKyc.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Gửi xác minh KYC
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default KYCForm;
