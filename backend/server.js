const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend folder (works whether you start from root or /backend)
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import services
const { fetchWeatherData } = require('./services/weatherService');
const { calculateSuitabilityScore } = require('./services/scoringService');
const { generateAdvisory } = require('./services/advisoryService');
const { initFirebase, getDb } = require('./services/firebaseService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Firebase Initialisation
// ─────────────────────────────────────────────
let firebaseReady = false;
try {
    initFirebase();
    firebaseReady = true;
} catch (err) {
    console.warn('⚠️  Firebase not configured – running in mock-data mode.');
    console.warn('   Add FIREBASE_* variables to backend/.env to enable persistence.');
}

// Firestore collection name
const COLLECTION = 'diagnoses';

// ─────────────────────────────────────────────
// ROUTE 1 – New Diagnosis
// POST /api/diagnose
// Body: { crop, lat, lon, imageResult?, audioResult? }
// ─────────────────────────────────────────────
app.post('/api/diagnose', async (req, res) => {
    try {
        const { crop, lat, lon, imageResult, audioResult } = req.body;

        // --- Member 1: Climate module ---
        const weatherData = await fetchWeatherData(lat, lon);
        const suitability = calculateSuitabilityScore(crop, weatherData);
        const advisory = await generateAdvisory({ crop, ...suitability });

        // --- Merge all three modules ---
        // Member 2 (Image) and Member 3 (Audio) pass their results in the body.
        // Fall back to simulated data if they aren't available yet.
        const finalResult = {
            crop,
            location: { lat, lon },
            climateResult: suitability,
            imageResult: imageResult || { status: 'Not Checked', issue: 'Skipped', confidence: 0 },
            audioResult: audioResult || { status: 'Not Checked', issue: 'Skipped', confidence: 0 },
            advisory,
            timestamp: new Date().toISOString(),
        };

        // --- Persist to Firestore (Try but don't crash if it fails) ---
        if (firebaseReady) {
            try {
                const db = getDb();
                const docRef = await db.collection(COLLECTION).add(finalResult);
                finalResult.id = docRef.id;
                console.log('📄 Saved to Firestore:', docRef.id);
            } catch (saveError) {
                console.warn('⚠️ Firestore save failed:', saveError.message);
                // We don't throw error here so the user still gets their diagnosis!
            }
        }

        res.json(finalResult);
    } catch (error) {
        console.error('Diagnosis processing failed:', error);
        res.status(500).json({
            error: 'System processing failed',
            message: 'Check your internet connection or try again.'
        });
    }
});

// ─────────────────────────────────────────────
// ROUTE 2 – Dashboard Stats
// GET /api/stats
// ─────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
    try {
        // ── Fallback: mock data when Firebase isn't wired up ──
        if (!firebaseReady) {
            return res.json(getMockStats());
        }

        const db = getDb();
        const snapshot = await db
            .collection(COLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Build risk-level distribution
        let ideal = 0, moderate = 0, risk = 0;
        entries.forEach(e => {
            const score = e.climateResult?.score ?? 0;
            if (score >= 80) ideal++;
            else if (score >= 50) moderate++;
            else risk++;
        });

        res.json({
            totalDiagnoses: snapshot.size,
            riskLevels: { ideal, moderate, critical: risk },
            recentEntries: entries.slice(0, 10),
        });
    } catch (error) {
        console.error('Stats fetch failed, returning mock data:', error.message);
        res.json(getMockStats());
    }
});

// ─────────────────────────────────────────────
// ROUTE 3 – Delete a diagnosis (bonus utility)
// DELETE /api/diagnose/:id
// ─────────────────────────────────────────────
app.delete('/api/diagnose/:id', async (req, res) => {
    try {
        if (!firebaseReady) return res.status(503).json({ error: 'Firebase not connected' });
        const db = getDb();
        await db.collection(COLLECTION).doc(req.params.id).delete();
        res.json({ success: true, deleted: req.params.id });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed', message: error.message });
    }
});

// ─────────────────────────────────────────────
// Mock data helper (demo / offline fallback)
// ─────────────────────────────────────────────
function getMockStats() {
    return {
        totalDiagnoses: 124,
        riskLevels: { ideal: 60, moderate: 40, critical: 24 },
        recentEntries: [
            {
                id: 'mock-1',
                crop: 'Wheat',
                climateResult: { score: 85, category: 'Ideal' },
                imageResult: { status: 'Healthy', issue: 'None' },
                audioResult: { status: 'Normal', issue: 'Baseline' },
                advisory: 'Conditions are perfect for Wheat. Standard maintenance recommended.',
                timestamp: new Date().toISOString(),
            },
            {
                id: 'mock-2',
                crop: 'Rice',
                climateResult: { score: 45, category: 'Not Suitable' },
                imageResult: { status: 'Warning', issue: 'Leaf Blight' },
                audioResult: { status: 'Warning', issue: 'Locust Frequency Detected' },
                advisory: 'High risk conditions detected. Consider alternative crops.',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
            },
        ],
    };
}

// ─────────────────────────────────────────────
// Serve Frontend (same port = no CORS issues in demo)
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Fallback: send index.html for any non-API route (Express 5 syntax)
app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
    console.log(`🌿  Frontend:  http://localhost:${PORT}`);
    console.log(`📡  API:       http://localhost:${PORT}/api/stats`);
});
