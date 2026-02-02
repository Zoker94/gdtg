import { useState, useEffect, createContext, useContext } from "react";

export type ColorTheme = "orange" | "blue" | "purple" | "green" | "red" | "teal" | "pink";
export type PresetTheme = "modern" | "classic" | "minimal" | "vibrant" | "elegant";

interface ThemeConfig {
  colorTheme: ColorTheme;
  presetTheme: PresetTheme;
  borderRadius: number;
  shadowIntensity: "none" | "soft" | "medium" | "strong";
  cardStyle: "flat" | "bordered" | "elevated";
}

interface ColorThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  presetTheme: PresetTheme;
  setPresetTheme: (preset: PresetTheme) => void;
  themeConfig: ThemeConfig;
  applyPreset: (preset: PresetTheme) => void;
  borderRadius: number;
  setBorderRadius: (radius: number) => void;
  shadowIntensity: "none" | "soft" | "medium" | "strong";
  setShadowIntensity: (intensity: "none" | "soft" | "medium" | "strong") => void;
  cardStyle: "flat" | "bordered" | "elevated";
  setCardStyle: (style: "flat" | "bordered" | "elevated") => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

export const colorThemes: Record<ColorTheme, { 
  name: string; 
  hsl: string; 
  gradientEnd: string;
  preview: string;
}> = {
  orange: { 
    name: "Cam", 
    hsl: "24 100% 50%", 
    gradientEnd: "32 100% 55%",
    preview: "hsl(24, 100%, 50%)"
  },
  blue: { 
    name: "Xanh dương", 
    hsl: "217 91% 60%", 
    gradientEnd: "210 100% 65%",
    preview: "hsl(217, 91%, 60%)"
  },
  purple: { 
    name: "Tím", 
    hsl: "262 83% 58%", 
    gradientEnd: "280 80% 65%",
    preview: "hsl(262, 83%, 58%)"
  },
  green: { 
    name: "Xanh lá", 
    hsl: "142 76% 46%", 
    gradientEnd: "155 80% 50%",
    preview: "hsl(142, 76%, 46%)"
  },
  red: { 
    name: "Đỏ", 
    hsl: "0 84% 60%", 
    gradientEnd: "10 90% 65%",
    preview: "hsl(0, 84%, 60%)"
  },
  teal: { 
    name: "Xanh ngọc", 
    hsl: "180 70% 45%", 
    gradientEnd: "170 75% 50%",
    preview: "hsl(180, 70%, 45%)"
  },
  pink: { 
    name: "Hồng", 
    hsl: "330 80% 60%", 
    gradientEnd: "340 85% 65%",
    preview: "hsl(330, 80%, 60%)"
  },
};

export const presetThemes: Record<PresetTheme, {
  name: string;
  description: string;
  colorTheme: ColorTheme;
  borderRadius: number;
  shadowIntensity: "none" | "soft" | "medium" | "strong";
  cardStyle: "flat" | "bordered" | "elevated";
}> = {
  modern: {
    name: "Modern",
    description: "Hiện đại, bo tròn mềm mại, bóng đổ nhẹ",
    colorTheme: "blue",
    borderRadius: 12,
    shadowIntensity: "soft",
    cardStyle: "elevated",
  },
  classic: {
    name: "Classic",
    description: "Cổ điển, góc vuông, viền rõ ràng",
    colorTheme: "orange",
    borderRadius: 4,
    shadowIntensity: "none",
    cardStyle: "bordered",
  },
  minimal: {
    name: "Minimal",
    description: "Tối giản, phẳng, không bóng đổ",
    colorTheme: "teal",
    borderRadius: 8,
    shadowIntensity: "none",
    cardStyle: "flat",
  },
  vibrant: {
    name: "Vibrant",
    description: "Sống động, màu sắc tươi sáng, bóng đổ mạnh",
    colorTheme: "purple",
    borderRadius: 16,
    shadowIntensity: "strong",
    cardStyle: "elevated",
  },
  elegant: {
    name: "Elegant",
    description: "Sang trọng, tinh tế, bóng đổ vừa",
    colorTheme: "pink",
    borderRadius: 10,
    shadowIntensity: "medium",
    cardStyle: "bordered",
  },
};

const STORAGE_KEY = "gdtg-theme-config";

function getDefaultConfig(): ThemeConfig {
  return {
    colorTheme: "orange",
    presetTheme: "classic",
    borderRadius: 8,
    shadowIntensity: "soft",
    cardStyle: "bordered",
  };
}

function applyThemeStyles(config: ThemeConfig) {
  const colorConfig = colorThemes[config.colorTheme];
  const root = document.documentElement;
  
  // Apply primary colors
  root.style.setProperty("--primary", colorConfig.hsl);
  root.style.setProperty("--accent", colorConfig.hsl);
  root.style.setProperty("--ring", colorConfig.hsl);
  root.style.setProperty("--glow-primary", colorConfig.hsl);
  root.style.setProperty("--glow-secondary", colorConfig.gradientEnd);
  root.style.setProperty("--gradient-start", colorConfig.hsl);
  root.style.setProperty("--gradient-end", colorConfig.gradientEnd);
  root.style.setProperty("--sidebar-primary", colorConfig.hsl);
  root.style.setProperty("--sidebar-ring", colorConfig.hsl);

  // Apply border radius
  root.style.setProperty("--radius", `${config.borderRadius / 16}rem`);

  // Apply shadow intensity
  const shadowMap = {
    none: "0 0 0 0 transparent",
    soft: "0 2px 8px -2px hsl(var(--foreground) / 0.08)",
    medium: "0 4px 16px -4px hsl(var(--foreground) / 0.12)",
    strong: "0 8px 30px -6px hsl(var(--foreground) / 0.2)",
  };
  root.style.setProperty("--shadow-card", shadowMap[config.shadowIntensity]);

  // Apply card style class
  root.classList.remove("card-flat", "card-bordered", "card-elevated");
  root.classList.add(`card-${config.cardStyle}`);
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return { ...getDefaultConfig(), ...JSON.parse(stored) };
        } catch {
          return getDefaultConfig();
        }
      }
    }
    return getDefaultConfig();
  });

  useEffect(() => {
    applyThemeStyles(themeConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themeConfig));
  }, [themeConfig]);

  // Apply on mount
  useEffect(() => {
    applyThemeStyles(themeConfig);
  }, []);

  const setColorTheme = (colorTheme: ColorTheme) => {
    setThemeConfig(prev => ({ ...prev, colorTheme }));
  };

  const setPresetTheme = (presetTheme: PresetTheme) => {
    setThemeConfig(prev => ({ ...prev, presetTheme }));
  };

  const applyPreset = (preset: PresetTheme) => {
    const presetConfig = presetThemes[preset];
    setThemeConfig({
      colorTheme: presetConfig.colorTheme,
      presetTheme: preset,
      borderRadius: presetConfig.borderRadius,
      shadowIntensity: presetConfig.shadowIntensity,
      cardStyle: presetConfig.cardStyle,
    });
  };

  const setBorderRadius = (borderRadius: number) => {
    setThemeConfig(prev => ({ ...prev, borderRadius }));
  };

  const setShadowIntensity = (shadowIntensity: "none" | "soft" | "medium" | "strong") => {
    setThemeConfig(prev => ({ ...prev, shadowIntensity }));
  };

  const setCardStyle = (cardStyle: "flat" | "bordered" | "elevated") => {
    setThemeConfig(prev => ({ ...prev, cardStyle }));
  };

  return (
    <ColorThemeContext.Provider value={{ 
      colorTheme: themeConfig.colorTheme, 
      setColorTheme,
      presetTheme: themeConfig.presetTheme,
      setPresetTheme,
      themeConfig,
      applyPreset,
      borderRadius: themeConfig.borderRadius,
      setBorderRadius,
      shadowIntensity: themeConfig.shadowIntensity,
      setShadowIntensity,
      cardStyle: themeConfig.cardStyle,
      setCardStyle,
    }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
}
