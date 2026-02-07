import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  useColorTheme, 
  colorThemes, 
  presetThemes, 
  ColorTheme, 
  PresetTheme 
} from "@/hooks/useColorTheme";
import { 
  Palette, 
  Check, 
  Sparkles, 
  Square, 
  Circle, 
  Layers,
  Sun,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const ThemeSelectorWidget = () => {
  const { 
    colorTheme, 
    setColorTheme,
    presetTheme,
    applyPreset,
    borderRadius,
    setBorderRadius,
    shadowIntensity,
    setShadowIntensity,
    cardStyle,
    setCardStyle,
  } = useColorTheme();

  const shadowOptions: { value: "none" | "soft" | "medium" | "strong"; label: string }[] = [
    { value: "none", label: "Không" },
    { value: "soft", label: "Nhẹ" },
    { value: "medium", label: "Vừa" },
    { value: "strong", label: "Mạnh" },
  ];

  const cardStyleOptions: { value: "flat" | "bordered" | "elevated"; label: string; icon: React.ReactNode }[] = [
    { value: "flat", label: "Phẳng", icon: <Square className="w-3 h-3" /> },
    { value: "bordered", label: "Viền", icon: <Circle className="w-3 h-3" /> },
    { value: "elevated", label: "Nổi", icon: <Layers className="w-3 h-3" /> },
  ];

  const handleReset = () => {
    applyPreset("classic");
  };

  return (
    <div className="space-y-4">
      {/* Preset Themes */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Preset Themes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs gap-1">
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Chọn một preset sẵn có hoặc tùy chỉnh theo ý muốn bên dưới.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(presetThemes) as PresetTheme[]).map((preset) => {
              const config = presetThemes[preset];
              const colorConfig = colorThemes[config.colorTheme];
              const isActive = presetTheme === preset;
              const isNeon = preset === "neon";
              
              return (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "relative flex flex-col items-start gap-2 p-3 rounded-lg border-2 transition-all duration-200 text-left",
                    isActive 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50",
                    isNeon && !isActive && "hover:shadow-[0_0_15px_hsl(180_70%_45%/0.3)]",
                    isNeon && isActive && "shadow-[0_0_20px_hsl(180_70%_45%/0.4)]",
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full shadow-sm flex-shrink-0",
                        isNeon && "shadow-[0_0_10px_hsl(180_70%_45%/0.6)]"
                      )}
                      style={{ 
                        backgroundColor: colorConfig.preview,
                        borderRadius: `${config.borderRadius}px`,
                      }}
                    />
                    <span className={cn(
                      "font-semibold text-sm",
                      isActive ? "text-primary" : "text-foreground",
                      isNeon && isActive && "drop-shadow-[0_0_6px_hsl(180_70%_45%/0.5)]"
                    )}>
                      {config.name}
                    </span>
                    {isActive && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {config.description}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Màu chủ đạo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {(Object.keys(colorThemes) as ColorTheme[]).map((theme) => {
              const config = colorThemes[theme];
              const isActive = colorTheme === theme;
              
              return (
                <button
                  key={theme}
                  onClick={() => setColorTheme(theme)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-200",
                    isActive 
                      ? "border-foreground bg-muted shadow-sm" 
                      : "border-transparent hover:border-border hover:bg-muted/50"
                  )}
                  title={config.name}
                >
                  <div
                    className="w-7 h-7 rounded-full shadow-md flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: config.preview }}
                  >
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[9px] font-medium truncate w-full text-center",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {config.name}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Customization */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="w-4 h-4" />
            Tùy chỉnh nâng cao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Border Radius */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Bo góc</Label>
              <span className="text-xs text-muted-foreground font-mono">{borderRadius}px</span>
            </div>
            <Slider
              value={[borderRadius]}
              onValueChange={([value]) => setBorderRadius(value)}
              max={24}
              min={0}
              step={2}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Vuông</span>
              <span>Tròn</span>
            </div>
          </div>

          <Separator />

          {/* Shadow Intensity */}
          <div className="space-y-3">
            <Label className="text-sm">Bóng đổ</Label>
            <div className="grid grid-cols-4 gap-2">
              {shadowOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={shadowIntensity === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShadowIntensity(option.value)}
                  className="h-8 text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Card Style */}
          <div className="space-y-3">
            <Label className="text-sm">Kiểu thẻ</Label>
            <div className="grid grid-cols-3 gap-2">
              {cardStyleOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={cardStyle === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCardStyle(option.value)}
                  className="h-9 text-xs gap-1.5"
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Xem trước</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className={cn(
              "p-4 border rounded-lg bg-card",
              presetTheme === "neon" && "border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
            )}
            style={{ 
              borderRadius: `${borderRadius}px`,
              boxShadow: presetTheme === "neon" 
                ? undefined 
                : shadowIntensity !== "none" ? "var(--shadow-card)" : "none",
              borderWidth: cardStyle === "bordered" || presetTheme === "neon" ? "1px" : "0px",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                  presetTheme === "neon" && "shadow-[0_0_15px_hsl(var(--primary)/0.6)]"
                )}
                style={{ 
                  backgroundColor: colorThemes[colorTheme].preview,
                  borderRadius: `${Math.min(borderRadius, 20)}px`,
                }}
              >
                A
              </div>
              <div>
                <p className={cn(
                  "font-semibold text-sm",
                  presetTheme === "neon" && "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                )}>Thẻ mẫu</p>
                <p className="text-xs text-muted-foreground">Xem trước giao diện</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className={cn(
                "text-xs",
                presetTheme === "neon" && "shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
              )}>Nút chính</Button>
              <Button size="sm" variant="outline" className={cn(
                "text-xs",
                presetTheme === "neon" && "border-primary/50 shadow-[0_0_8px_hsl(var(--primary)/0.2)]"
              )}>Nút phụ</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeSelectorWidget;
