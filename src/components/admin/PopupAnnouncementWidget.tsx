import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Save, Loader2, Eye } from "lucide-react";
import { usePopupAnnouncement, useUpdatePopupAnnouncement } from "@/hooks/usePopupAnnouncement";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PopupAnnouncementWidget = () => {
  const { data: popup, isLoading } = usePopupAnnouncement();
  const updatePopup = useUpdatePopupAnnouncement();

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (popup) {
      setEnabled(popup.enabled);
      setTitle(popup.title);
      setContent(popup.content);
    }
  }, [popup]);

  const handleSave = () => {
    updatePopup.mutate({
      enabled,
      title,
      content,
    });
  };

  const hasChanges =
    popup &&
    (enabled !== popup.enabled || title !== popup.title || content !== popup.content);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-primary" />
            Thông báo Pop-up
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="popup-enabled" className="text-sm">
              Bật thông báo Pop-up
            </Label>
            <Switch
              id="popup-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="popup-title" className="text-sm">
              Tiêu đề
            </Label>
            <Input
              id="popup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Thông báo quan trọng"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="popup-content" className="text-sm">
              Nội dung
            </Label>
            <Textarea
              id="popup-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung thông báo..."
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={updatePopup.isPending || !hasChanges}
              className="flex-1 gap-2"
            >
              {updatePopup.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lưu thay đổi
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!content}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Xem trước
            </Button>
          </div>

          {enabled && content && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ Pop-up đang hiển thị cho người dùng
            </p>
          )}
          {enabled && !content && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠ Pop-up đang bật nhưng chưa có nội dung
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Bell className="w-5 h-5" />
              {title || "Thông báo quan trọng"}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-base text-foreground whitespace-pre-wrap">
            {content || "Chưa có nội dung"}
          </DialogDescription>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowPreview(false)}>
              Đã hiểu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PopupAnnouncementWidget;
