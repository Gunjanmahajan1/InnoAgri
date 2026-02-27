/**
 * Advisory Service – AI + Fallback Rule-Based
 * ────────────────────────────────────────────
 * 1. Tries to call an AI API if AI_ENABLED=true
 * 2. Falls back to rule-based farmer-friendly advisory
 */

const generateAdvisory = async (data) => {
    const { crop, score, category, details } = data;

    // ─── AI Mode ───
    if (process.env.AI_ENABLED === 'true' && process.env.AI_API_KEY) {
        try {
            // Placeholder for Gemini / OpenAI / Claude API call
            // Replace this block with a real API call during hackathon
            //
            // const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.AI_API_KEY },
            //     body: JSON.stringify({
            //         contents: [{ parts: [{ text: buildPrompt(crop, score, details) }] }]
            //     })
            // });

            console.log('AI API called (placeholder). Falling back to rules.');
        } catch (err) {
            console.error('AI API error, falling back:', err.message);
        }
    }

    // ─── Fallback Rule-Based Advisory ───
    return buildFallbackAdvisory(crop, category, details);
};

function buildFallbackAdvisory(crop, category, details) {
    const temp = details?.temperature ?? 'N/A';
    const humidity = details?.humidity ?? 'N/A';

    const tips = {
        'Ideal': [
            `Good weather for ${crop}.`,
            `Keep watering as usual.`,
            `Watch the weather for the next 2 days.`,
            `No extra fertilizer needed now.`,
            `मराठी: ${crop} साठी चांगले हवामान आहे. नेहमीप्रमाणे पाणी द्या. पुढचे २ दिवस हवामानावर लक्ष ठेवा. आता जास्त खताची गरज नाही.`
        ],
        'Moderate': [
            `Weather is okay for ${crop}, but not perfect.`,
            temp > 30 ? `It is too hot (${temp}°C) — use shade nets.` : `It is cold (${temp}°C) — wait before planting.`,
            humidity > 70 ? `It is too humid (${humidity}%) — use medicine to stop fungus.` : `Humidity is okay. Give enough water.`,
            `Check soil before watering again.`,
            `मराठी: ${crop} साठी हवामान ठीक आहे, पण एकदम योग्य नाही. ${temp > 30 ? 'खूप गरम आहे - सावली द्या.' : 'थंड आहे - पेरणी थांबवा.'} ${humidity > 70 ? 'खूप दमट आहे - बुरशीनाशक वापरा.' : 'दमटपणा ठीक आहे. पुरेसे पाणी द्या.'} पुन्हा पाणी देण्यापूर्वी माती तपासा.`
        ],
        'Not Suitable': [
            `⚠️ Warning: Weather is bad for ${crop}.`,
            `Temp: ${temp}°C | Humidity: ${humidity}%`,
            `Think about planting a different crop.`,
            `If you plant, use a greenhouse.`,
            `Ask an agriculture expert for help quickly.`,
            `मराठी: ⚠️ चेतावणी: ${crop} साठी हवामान खराब आहे. दुसरे पीक घेण्याचा विचार करा. जर पेरायचे असेल तर ग्रीनहाऊस वापरा. कृषी तज्ज्ञांची लवकर मदत घ्या.`
        ],
    };

    return (tips[category] || tips['Moderate']).join(' ');
}

function buildPrompt(crop, score, details) {
    return `You are a farmer helper. Given:
Crop: ${crop}
Temperature: ${details?.temperature}°C
Humidity: ${details?.humidity}%
Rainfall: ${details?.rainfall} mm
Score: ${score}/100

Give 3 or 4 lines of simple advice. Use very easy English words. Do not use hard words. Also translate the advice to Marathi.`;
}

module.exports = { generateAdvisory };
