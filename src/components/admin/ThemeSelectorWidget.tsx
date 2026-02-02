import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useColorTheme, colorThemes, ColorTheme } from "@/hooks/useColorTheme";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ThemeSelectorWidget = () => {
  const { colorTheme, setColorTheme } = useColorTheme();

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Màu giao diện
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Chọn màu chủ đạo cho giao diện. Thay đổi sẽ được lưu trên trình duyệt của bạn.
        </p>
        
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(colorThemes) as ColorTheme[]).map((theme) => {
            const config = colorThemes[theme];
            const isActive = colorTheme === theme;
            
            return (
              <button
                key={theme}
                onClick={() => setColorTheme(theme)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all duration-200",
                  isActive 
                    ? "border-foreground bg-muted shadow-sm" 
                    : "border-transparent hover:border-border hover:bg-muted/50"
                )}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: config.preview }}
                >
                  {isActive && (
                    <Check className="w-4 h-4 text-white drop-shadow-sm" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {config.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Màu hiện tại: <span className="font-medium" style={{ color: colorThemes[colorTheme].preview }}>{colorThemes[colorTheme].name}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeSelectorWidget;
