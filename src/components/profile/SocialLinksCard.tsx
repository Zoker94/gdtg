import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useUpdateProfile } from "@/hooks/useProfile";
import {
  Facebook,
  MessageCircle,
  Phone,
  FileText,
  Edit3,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

interface SocialLinksCardProps {
  facebookUrl?: string | null;
  zaloContact?: string | null;
  phone?: string | null;
  bio?: string | null;
  isOwnProfile?: boolean;
}

const SocialLinksCard = ({
  facebookUrl,
  zaloContact,
  phone,
  bio,
  isOwnProfile = true,
}: SocialLinksCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    facebook_url: facebookUrl || "",
    zalo_contact: zaloContact || "",
    phone: phone || "",
    bio: bio || "",
  });
  const updateProfile = useUpdateProfile();

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        facebook_url: formData.facebook_url || null,
        zalo_contact: formData.zalo_contact || null,
        phone: formData.phone || null,
        bio: formData.bio || null,
      });
      toast({ title: "Đã cập nhật thông tin liên hệ" });
      setIsEditing(false);
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      facebook_url: facebookUrl || "",
      zalo_contact: zaloContact || "",
      phone: phone || "",
      bio: bio || "",
    });
    setIsEditing(false);
  };

  const hasAnyInfo = facebookUrl || zaloContact || phone || bio;

  // View mode for other users or when not editing
  if (!isOwnProfile || !isEditing) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Thông tin liên hệ
            </CardTitle>
            {isOwnProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasAnyInfo && isOwnProfile ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có thông tin liên hệ. Nhấn nút chỉnh sửa để thêm.
            </p>
          ) : !hasAnyInfo ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Người dùng chưa cung cấp thông tin liên hệ.
            </p>
          ) : (
            <>
              {bio && (
                <div className="pb-3 border-b border-border">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {bio}
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                {facebookUrl && (
                  <a
                    href={facebookUrl.startsWith("http") ? facebookUrl : `https://${facebookUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Facebook className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm flex-1 truncate">Facebook</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {zaloContact && (
                  <a
                    href={`https://zalo.me/${zaloContact.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-sm flex-1">{zaloContact}</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm flex-1">{phone}</span>
                  </a>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card className="border-border border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Chỉnh sửa thông tin liên hệ
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="h-8 w-8 p-0"
            >
              <Check className="w-4 h-4 text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Giới thiệu bản thân</label>
          <Textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Viết vài dòng giới thiệu về bạn..."
            className="min-h-[80px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.bio.length}/500 ký tự
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
            <Facebook className="w-4 h-4 text-blue-600" />
            Link Facebook
          </label>
          <Input
            value={formData.facebook_url}
            onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
            placeholder="https://facebook.com/username"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            Zalo (số điện thoại hoặc ID)
          </label>
          <Input
            value={formData.zalo_contact}
            onChange={(e) => setFormData({ ...formData, zalo_contact: e.target.value })}
            placeholder="0912345678"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-600" />
            Số điện thoại liên hệ
          </label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0912345678"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Khác với số đã xác thực qua Telegram
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialLinksCard;
