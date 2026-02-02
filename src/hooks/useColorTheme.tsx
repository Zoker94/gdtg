import { useState, useEffect, createContext, useContext } from "react";

export type ColorTheme = "orange" | "blue" | "purple" | "green" | "red" | "teal" | "pink";

interface ColorThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
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

const STORAGE_KEY = "gdtg-color-theme";

function applyColorTheme(theme: ColorTheme) {
  const config = colorThemes[theme];
  const root = document.documentElement;
  
  // Apply primary colors
  root.style.setProperty("--primary", config.hsl);
  root.style.setProperty("--accent", config.hsl);
  root.style.setProperty("--ring", config.hsl);
  root.style.setProperty("--glow-primary", config.hsl);
  root.style.setProperty("--glow-secondary", config.gradientEnd);
  root.style.setProperty("--gradient-start", config.hsl);
  root.style.setProperty("--gradient-end", config.gradientEnd);
  root.style.setProperty("--sidebar-primary", config.hsl);
  root.style.setProperty("--sidebar-ring", config.hsl);
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored in colorThemes) {
        return stored as ColorTheme;
      }
    }
    return "orange";
  });

  useEffect(() => {
    applyColorTheme(colorTheme);
    localStorage.setItem(STORAGE_KEY, colorTheme);
  }, [colorTheme]);

  // Apply on mount
  useEffect(() => {
    applyColorTheme(colorTheme);
  }, []);

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
  };

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
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
