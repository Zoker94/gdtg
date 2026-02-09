import { memo, useEffect, useMemo } from "react";
import { useWeather, WeatherData } from "@/hooks/useWeather";
import { useTheme } from "next-themes";

// ─── Rain Effect ───
const RainEffect = memo(({ intensity = 40 }: { intensity?: number }) => {
  const drops = useMemo(() =>
    Array.from({ length: intensity }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.5,
      opacity: 0.3 + Math.random() * 0.5,
    })),
    [intensity]
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="absolute w-[1px] bg-blue-300/60"
          style={{
            left: `${drop.left}%`,
            top: "-20px",
            height: "15px",
            animation: `weather-rain ${drop.duration}s linear ${drop.delay}s infinite`,
            opacity: drop.opacity,
          }}
        />
      ))}
    </div>
  );
});
RainEffect.displayName = "RainEffect";

// ─── Thunderstorm (Rain + Lightning Flash) ───
const ThunderstormEffect = memo(() => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      <RainEffect intensity={60} />
      <div className="absolute inset-0 animate-[weather-lightning_8s_ease-in-out_infinite]" />
    </div>
  );
});
ThunderstormEffect.displayName = "ThunderstormEffect";

// ─── Sun Effect ───
const SunEffect = memo(() => (
  <div className="fixed pointer-events-none z-[55]" style={{ top: "20px", right: "40px" }}>
    <div
      className="w-16 h-16 rounded-full"
      style={{
        background: "radial-gradient(circle, hsl(45 100% 70% / 0.9), hsl(40 100% 55% / 0.4), transparent 70%)",
        boxShadow: "0 0 60px 20px hsl(45 100% 65% / 0.3), 0 0 120px 40px hsl(40 90% 55% / 0.15)",
        animation: "weather-sun-pulse 4s ease-in-out infinite",
      }}
    />
  </div>
));
SunEffect.displayName = "SunEffect";

// ─── Cloud Effect ───
const CloudEffect = memo(({ count = 4 }: { count?: number }) => {
  const clouds = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top: 5 + Math.random() * 15,
      size: 60 + Math.random() * 80,
      duration: 30 + Math.random() * 40,
      delay: -Math.random() * 30,
      opacity: 0.15 + Math.random() * 0.2,
    })),
    [count]
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[54] overflow-hidden">
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute rounded-full"
          style={{
            top: `${cloud.top}%`,
            width: `${cloud.size}px`,
            height: `${cloud.size * 0.5}px`,
            background: `radial-gradient(ellipse, hsl(0 0% 80% / ${cloud.opacity}), transparent 70%)`,
            animation: `weather-cloud ${cloud.duration}s linear ${cloud.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
});
CloudEffect.displayName = "CloudEffect";

// ─── Fog Effect ───
const FogEffect = memo(() => (
  <div className="fixed inset-0 pointer-events-none z-[53]">
    <div
      className="absolute inset-0"
      style={{
        background: "linear-gradient(180deg, hsl(0 0% 90% / 0.15) 0%, hsl(0 0% 85% / 0.25) 50%, hsl(0 0% 90% / 0.1) 100%)",
        animation: "weather-fog 10s ease-in-out infinite alternate",
      }}
    />
  </div>
));
FogEffect.displayName = "FogEffect";

// ─── Moon + Stars ───
const MoonStarsEffect = memo(() => {
  const stars = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 40,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 3,
    })),
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[54]">
      {/* Moon */}
      <div
        className="absolute"
        style={{
          top: "30px",
          right: "50px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, hsl(50 30% 90%), hsl(45 20% 75%))",
          boxShadow: "0 0 30px 8px hsl(50 30% 85% / 0.3), 0 0 60px 20px hsl(50 20% 80% / 0.1)",
        }}
      />
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white/70"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `weather-twinkle 2s ease-in-out ${star.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
});
MoonStarsEffect.displayName = "MoonStarsEffect";

// ─── Snow Effect ───
const SnowEffect = memo(() => {
  const flakes = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
      size: 2 + Math.random() * 4,
      opacity: 0.4 + Math.random() * 0.5,
    })),
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {flakes.map((f) => (
        <div
          key={f.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${f.left}%`,
            top: "-10px",
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: f.opacity,
            animation: `weather-snow ${f.duration}s linear ${f.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
});
SnowEffect.displayName = "SnowEffect";

// ─── Main Weather Effects Component ───
const WeatherEffects = memo(() => {
  const { weather } = useWeather();
  const { setTheme } = useTheme();

  // Auto switch theme based on day/night
  useEffect(() => {
    if (!weather) return;
    const stored = localStorage.getItem("weather-auto-theme");
    if (stored === "disabled") return;
    setTheme(weather.isDay ? "light" : "dark");
  }, [weather?.isDay, setTheme, weather]);

  if (!weather) return null;

  return (
    <>
      {/* Rain */}
      {(weather.condition === "rain") && <RainEffect intensity={35} />}
      {(weather.condition === "heavy-rain") && <RainEffect intensity={60} />}

      {/* Thunderstorm */}
      {weather.condition === "thunderstorm" && <ThunderstormEffect />}

      {/* Snow */}
      {weather.condition === "snow" && <SnowEffect />}

      {/* Fog */}
      {weather.condition === "fog" && <FogEffect />}

      {/* Clouds */}
      {weather.condition === "cloudy" && <CloudEffect count={5} />}

      {/* Clear day = sun */}
      {weather.condition === "clear" && weather.isDay && <SunEffect />}

      {/* Night = moon + stars (when not raining heavily) */}
      {!weather.isDay && weather.condition !== "heavy-rain" && weather.condition !== "thunderstorm" && (
        <MoonStarsEffect />
      )}

      {/* Rain effects also show clouds */}
      {(weather.condition === "rain" || weather.condition === "heavy-rain" || weather.condition === "thunderstorm") && (
        <CloudEffect count={6} />
      )}
    </>
  );
});
WeatherEffects.displayName = "WeatherEffects";

export default WeatherEffects;
