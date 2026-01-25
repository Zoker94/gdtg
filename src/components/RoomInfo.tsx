import { useState } from "react";
import { Copy, Check, Link as LinkIcon, Key, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface RoomInfoProps {
  roomId: string;
  roomPassword: string;
  inviteLink: string;
}

export const RoomInfo = ({ roomId, roomPassword, inviteLink }: RoomInfoProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Đã copy!" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    const text = `🔐 Phòng giao dịch GDTG\n\nID: ${roomId}\nMật khẩu: ${roomPassword}\n\nLink: ${inviteLink}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Đã copy thông tin phòng!" });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          Thông tin phòng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-2 bg-background rounded border">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">ID:</span>
            <span className="font-mono font-bold tracking-widest">{roomId}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(roomId, "id")}
          >
            {copiedField === "id" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center justify-between p-2 bg-background rounded border">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Pass:</span>
            <span className="font-mono font-bold tracking-widest">{roomPassword}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(roomPassword, "password")}
          >
            {copiedField === "password" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center justify-between p-2 bg-background rounded border">
          <div className="flex items-center gap-2 overflow-hidden">
            <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{inviteLink}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(inviteLink, "link")}
          >
            {copiedField === "link" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <Button onClick={copyAll} variant="outline" className="w-full" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          Copy tất cả để gửi người mua
        </Button>
      </CardContent>
    </Card>
  );
};
