'use client';

import { useState, useEffect } from 'react';
import { WeatherForecastResponse, DailyWeather } from '@/types/weather';

interface DashboardWeatherProps {
  latitude: number;
  longitude: number;
  asl?: number;
}

export default function DashboardWeather({ latitude, longitude, asl = 0 }: DashboardWeatherProps) {
  const [weatherData, setWeatherData] = useState<DailyWeather[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiveWeather = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const response = await fetch(
          `${backendUrl}/weather-forecast?lat=${latitude}&lon=${longitude}&asl=${asl}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch latest weather forecast');
        }
        
        const data: WeatherForecastResponse = await response.json();
        setWeatherData(data.weather_forecast.daily);
        
      } catch (err: any) {
        console.error("Error fetching weather:", err);
        setError(err.message || 'An error occurred loading weather.');
      } finally {
        setIsLoading(false);
      }
    };

    if (latitude && longitude) {
      fetchLiveWeather();
    }
  }, [latitude, longitude, asl]);

  if (isLoading) {
    return <div className="p-4 rounded-xl bg-slate-50 animate-pulse border border-slate-100">Loading live 14-day weather...</div>;
  }

  if (error) {
    return <div className="p-4 rounded-xl bg-red-50 text-red-600 border border-red-100">Error: {error}</div>;
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="text-base md:text-xl font-bold mb-3 text-slate-800 flex items-center gap-2">
        <span>🌤️</span> Live 14-Day Farm Forecast
      </h3>
      
      <div className="flex overflow-x-auto gap-3 pb-3 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {weatherData.map((day, index) => {
          let rawTime = (day as any).time || (day as any).date || (day as any).timestamp || '';
          let date: Date | null = null;
          
          // Try to safely parse whatever date format the backend gave
          if (rawTime) {
            // Is it a number (or string representation of a number)? e.g. UNIX timestamp
            if (!isNaN(Number(rawTime)) && rawTime !== '') {
              const numTime = Number(rawTime);
              // If it's typical 10-digit unix timestamp (seconds), multiply by 1000 for ms.
              date = new Date(numTime > 9999999999 ? numTime : numTime * 1000);
            } else if (typeof rawTime === 'string') {
              // Standard string parse. Replace hyphens with slashes to avoid Safari bugs ("2026/04/11" instead of "2026-04-11")
              const safeString = rawTime.includes('-') && !rawTime.includes('T') 
                ? rawTime.replace(/-/g, '/') 
                : rawTime;
              date = new Date(safeString);
            } else {
              date = new Date(rawTime);
            }
          }

          let displayDate = "Unknown";
          let weekday = "Day";
          
          // Check if parsed date is actually valid
          if (date && !isNaN(date.getTime())) {
            displayDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
          } else {
             // If completely invalid, show exactly what the backend sent so we can debug it
             displayDate = String(rawTime);
             weekday = "Raw Data";
          }
          
          const isToday = index === 0;
          
          return (
            <div 
              key={index} 
              className={`flex-shrink-0 w-28 md:w-36 p-3 md:p-4 rounded-xl flex flex-col items-center snap-center border ${
                isToday ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-transparent hover:bg-slate-100'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <span className={`font-bold ${isToday ? 'text-emerald-700' : 'text-slate-700'}`}>
                   {isToday && date && !isNaN(date.getTime()) ? 'Today' : weekday}
                </span>
                <span className="text-xs text-slate-500 font-medium mt-0.5">
                  {displayDate}
                </span>
              </div>
              
              <div className="mt-2 text-2xl md:text-3xl font-bold text-slate-800">
                {Math.round(day.temperature_max)}°
              </div>
              <div className="text-sm text-slate-500 mb-3">
                Min: {Math.round(day.temperature_min)}°
              </div>
              
              <div className="grid grid-cols-2 gap-2 w-full pt-3 border-t border-slate-200/60">
                <div className="flex items-center justify-center gap-1 text-xs font-medium text-blue-600" title="Precipitation Probability">
                  💧 {day.precipitation_probability}%
                </div>
                <div className="flex items-center justify-center gap-1 text-xs font-medium text-slate-500" title="Precipitation Sum">
                  🌧️ {day.precipitation_sum.toFixed(1)}mm
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
