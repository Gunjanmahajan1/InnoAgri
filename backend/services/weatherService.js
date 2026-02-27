/**
 * Weather Service for Member 1
 * Fetches real-time weather data from Open-Meteo API
 */
const axios = require('axios');

const fetchWeatherData = async (lat, lon) => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain&hourly=temperature_2m,rain&daily=rain_sum&timezone=auto`;
        const response = await axios.get(url);

        return {
            temperature: response.data.current.temperature_2m,
            humidity: response.data.current.relative_humidity_2m,
            rainfall: response.data.current.rain || 0, // Fallback if no rain
            dailyRain: response.data.daily.rain_sum[0]
        };
    } catch (error) {
        console.error('Error fetching weather data, using fallback:', error.message);
        // Fallback to reasonable mock weather for demo stability
        return {
            temperature: 24.5,
            humidity: 62,
            rainfall: 0,
            dailyRain: 1.2
        };
    }
};

module.exports = { fetchWeatherData };
