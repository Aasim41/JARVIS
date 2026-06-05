/**
 * weather-api.js — Weather data wrapper for the Jarvis dashboard.
 * Uses OpenWeatherMap API with geolocation support and demo fallback.
 */

const API_KEY = '8d057b98663b44c59d3df3a226bf5811';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Fetch weather data from OpenWeatherMap.
 * Falls back to demo data if API_KEY is empty or the request fails.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {Promise<Object>} Weather data object.
 */
export async function fetchWeather(lat, lon) {
  if (!API_KEY) {
    return getDemoWeather();
  }

  try {
    const url = `${BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API responded with status ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      wind: data.wind.speed,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      city: data.name,
    };
  } catch (err) {
    console.warn('[Jarvis Weather] Fetch failed, using demo data:', err);
    return getDemoWeather();
  }
}

/**
 * Get the user's current geographic location via the Geolocation API.
 * Falls back to Delhi coordinates if geolocation is unavailable or denied.
 * @returns {Promise<{lat: number, lon: number}>}
 */
export async function getLocation() {
  const fallback = { lat: 28.6139, lon: 77.2090 };

  if (!navigator.geolocation) {
    return fallback;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (err) => {
        console.warn('[Jarvis Weather] Geolocation denied/failed:', err.message);
        resolve(fallback);
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}

/**
 * Returns static demo weather data.
 * @returns {Object} Demo weather object.
 */
export function getDemoWeather() {
  return {
    temp: 34,
    feelsLike: 38,
    humidity: 55,
    wind: 12,
    description: 'partly cloudy',
    icon: '02d',
    city: 'New Delhi',
  };
}
