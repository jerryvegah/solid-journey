// types/weather.ts
export interface DailyWeather {
  time: string;
  temperature_max: number;
  temperature_min: number;
  precipitation_sum: number;
  precipitation_probability: number;
  windspeed_max: number;
}

export interface WeatherForecastResponse {
  weather_forecast: {
    daily: DailyWeather[];
  };
  seasonal_forecast?: {
    monthly: any[]; // define as needed
  };
}
