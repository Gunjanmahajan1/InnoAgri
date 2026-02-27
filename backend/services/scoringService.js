/**
 * Scoring Service – Rule-Based Suitability Engine
 * ────────────────────────────────────────────────
 * Weights:  Temperature (30) · Rainfall (30) · Humidity (20) · Soil (20)
 *
 * Score Categories:
 *   80-100 → Ideal
 *   50-79  → Moderate
 *   <50    → Not Suitable
 */

// Optimal ranges for each crop
const CROP_PROFILES = {
    wheat: { temp: [12, 25], humidity: [40, 60], rain: [0, 2], nextSeason: "October - November" },
    rice: { temp: [22, 35], humidity: [60, 90], rain: [0, 10], nextSeason: "June - July" },
    maize: { temp: [18, 32], humidity: [50, 75], rain: [0, 5], nextSeason: "June - July" },
    barley: { temp: [10, 22], humidity: [35, 55], rain: [0, 3], nextSeason: "October - November" },
    cotton: { temp: [21, 35], humidity: [40, 65], rain: [0, 4], nextSeason: "April - May" },
    sugarcane: { temp: [25, 38], humidity: [55, 85], rain: [0, 8], nextSeason: "January - March" },
    soybean: { temp: [20, 30], humidity: [50, 70], rain: [0, 5], nextSeason: "June - July" },
    tomato: { temp: [18, 30], humidity: [40, 70], rain: [0, 3], nextSeason: "June - July / Jan - Feb" },
    potato: { temp: [15, 25], humidity: [45, 65], rain: [0, 3], nextSeason: "October - November" },
    onion: { temp: [13, 28], humidity: [40, 60], rain: [0, 2], nextSeason: "October - November" },
};

// Default fallback profile
const DEFAULT_PROFILE = { temp: [15, 30], humidity: [40, 70], rain: [0, 5], nextSeason: "Check local calendar" };

function rangeScore(value, min, max, weight) {
    if (value >= min && value <= max) return weight;                          // Perfect
    const dist = value < min ? min - value : value - max;
    const half = (max - min) / 2;
    if (dist <= half) return Math.round(weight * 0.6);                        // Close
    return Math.round(weight * 0.2);                                          // Far
}

const calculateSuitabilityScore = (crop, weatherData) => {
    const { temperature, humidity, rainfall } = weatherData;
    const profile = CROP_PROFILES[crop] || DEFAULT_PROFILE;

    // 1. Temperature  → Max 30
    const tempScore = rangeScore(temperature, profile.temp[0], profile.temp[1], 30);

    // 2. Rainfall      → Max 30
    const rainScore = rangeScore(rainfall, profile.rain[0], profile.rain[1], 30);

    // 3. Humidity      → Max 20
    const humidityScore = rangeScore(humidity, profile.humidity[0], profile.humidity[1], 20);

    // 4. Soil Health   → Max 20 (simulated for hackathon)
    const soilScore = 15;

    const totalScore = tempScore + rainScore + humidityScore + soilScore;

    let category;
    if (totalScore >= 80) category = 'Ideal';
    else if (totalScore >= 50) category = 'Moderate';
    else category = 'Not Suitable';

    return {
        score: totalScore,
        category,
        nextPlantingSeason: profile.nextSeason,
        details: {
            temperature,
            humidity,
            rainfall,
            tempScore,
            rainScore,
            humidityScore,
            soilScore,
            soil: 'Simulated (Good)',
        },
    };
};

module.exports = { calculateSuitabilityScore };
