import { useState, useEffect, useCallback } from "react";

export interface WeatherData {
  weatherCode: number;
  isDay: boolean;
  temperature: number;
  sunrise: string;
  sunset: string;
  condition: "clear" | "cloudy" | "fog" | "rain" | "heavy-rain" | "thunderstorm" | "snow";
}

const getCondition = (code: number): WeatherData["condition"] => {
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 55) || (code >= 80 && code <= 81)) return "rain";
  if ((code >= 61 && code <= 67) || code === 82) return "heavy-rain";
  if (code >= 95) return "thunderstorm";
  if (code >= 71 && code <= 77) return "snow";
  return "cloudy";
};

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day,temperature_2m&daily=sunrise,sunset&timezone=auto&forecast_days=1`
      );
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();

      const weatherCode = data.current.weather_code;
      setWeather({
        weatherCode,
        isDay: data.current.is_day === 1,
        temperature: data.current.temperature_2m,
        sunrise: data.daily.sunrise[0],
        sunset: data.daily.sunset[0],
        condition: getCondition(weatherCode),
      });
    } catch (e) {
      setError("Không thể lấy dữ liệu thời tiết");
      // Fallback: use time-based defaults
      const hour = new Date().getHours();
      const isDay = hour >= 6 && hour < 18;
      setWeather({
        weatherCode: 0,
        isDay,
        temperature: 25,
        sunrise: "",
        sunset: "",
        condition: "clear",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      // Default to Hanoi
      fetchWeather(21.0285, 105.8542);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeather(21.0285, 105.8542), // fallback Hanoi
      { timeout: 5000 }
    );

    // Refresh every 15 minutes
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(21.0285, 105.8542),
        { timeout: 5000 }
      );
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWeather]);

  return { weather, loading, error };
};
