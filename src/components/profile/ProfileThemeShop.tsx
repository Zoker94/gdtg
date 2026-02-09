import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useProfileTheme, useUpdateProfileTheme } from "@/hooks/useProfileTheme";
import { useAuth } from "@/hooks/useAuth";
import {
  profileGradients,
  profileFrames,
  profileEffects,
} from "@/data/profileThemes";
import { Paintbrush, Crown, Sparkles, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ProfileThemeShop = () => {
  const { user } = useAuth();
  const { data: currentTheme } = useProfileTheme(user?.id);
  const updateTheme = useUpdateProfileTheme();

  const activeGradient = currentTheme?.gradient_id || "default";
  const activeFrame = currentTheme?.frame_id || "default";
  const activeEffect = currentTheme?.effect_id || "default";

  const handleSelect = async (type: "gradient_id" | "frame_id" | "effect_id", value: string) => {
    try {
      await updateTheme.mutateAsync({ [type]: value });
      toast({ title: "✅ Đã áp dụng giao diện!" });
    } catch {
      toast({ title: "Lỗi", description: "Không thể cập nhật giao diện", variant: "destructive" });
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          🛍️ Cửa hàng giao diện hồ sơ
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Chọn giao diện đẹp cho hồ sơ. Mọi người đều thấy khi xem trang cá nhân của bạn!
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gradients">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="gradients" className="text-xs gap-1">
              <Paintbrush className="w-3 h-3" />
              Nền
            </TabsTrigger>
            <TabsTrigger value="frames" className="text-xs gap-1">
              <Crown className="w-3 h-3" />
              Khung
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              Hiệu ứng
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gradients" className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {profileGradients.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSelect("gradient_id", g.id)}
                  disabled={updateTheme.isPending}
                  className={`relative rounded-xl overflow-hidden h-20 transition-all ${
                    activeGradient === g.id ? "ring-2 ring-primary ring-offset-2" : "hover:ring-1 hover:ring-primary/50"
                  }`}
                >
                  <div className={`absolute inset-0 ${g.css}`} />
                  <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/50 to-transparent">
                    <span className="text-white text-xs font-medium">{g.name}</span>
                  </div>
                  {activeGradient === g.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="frames" className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              {profileFrames.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleSelect("frame_id", f.id)}
                  disabled={updateTheme.isPending}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all border ${
                    activeFrame === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full bg-muted ${f.borderClass} ${f.glowClass || ""}`} />
                  <span className="text-xs font-medium">{f.name}</span>
                  {activeFrame === f.id && <Badge variant="default" className="text-[10px] px-1.5 py-0">Đang dùng</Badge>}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="effects" className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {profileEffects.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleSelect("effect_id", e.id)}
                  disabled={updateTheme.isPending}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all border text-left ${
                    activeEffect === e.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl">{e.name.split(" ")[0]}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.description}</p>
                  </div>
                  {activeEffect === e.id && (
                    <Badge variant="default" className="text-[10px]">Đang dùng</Badge>
                  )}
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProfileThemeShop;
