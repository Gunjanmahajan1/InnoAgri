/**
 * AgriGuard AI – Frontend Application Logic
 * ──────────────────────────────────────────
 * Handles: Navigation · Geolocation · Diagnosis · Dashboard · Analytics
 */

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════ CONFIG ═══════════════
    const API = '/api';
    let userCoords = { lat: 18.5204, lon: 73.8567 }; // Default: Pune
    let dashboardMap = null;
    let mapMarkers = [];
    let riskChart, cropBarChart, trendLineChart, issueChart;

    const cropColors = {
        'wheat': '#eab308',   // Yellow
        'rice': '#94a3b8',    // Grayish
        'maize': '#fbbf24',   // Amber
        'barley': '#d97706',  // Dark Amber
        'cotton': '#f8fafc',  // White/Light
        'sugarcane': '#4ade80', // Light Green
        'soybean': '#84cc16', // Lime
        'tomato': '#ef4444',  // Red
        'potato': '#b45309',  // Brown
        'onion': '#a855f7'    // Purple
    };

    // ═══════════════ INIT ═══════════════
    initClock();
    checkSystemHealth();
    initNavigation();
    initDashboard();
    initDiagnosis();

    // ═══════════════ LIVE CLOCK ═══════════════
    function initClock() {
        const el = document.getElementById('live-time');
        const tick = () => {
            const now = new Date();
            el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        tick();
        setInterval(tick, 1000);
    }

    // ═══════════════ HEALTH CHECK ═══════════════
    async function checkSystemHealth() {
        const serverDot = document.getElementById('server-dot');
        const serverLabel = document.getElementById('server-label');
        const fbDot = document.getElementById('fb-dot');
        const fbLabel = document.getElementById('fb-label');
        const modeBadge = document.getElementById('mode-badge');

        try {
            const res = await fetch(`${API}/health`);
            const data = await res.json();

            // Server status
            serverDot.className = 'status-dot pulse-green';
            serverLabel.innerHTML = 'Server <strong>Online</strong>';

            // Firebase status
            if (data.firebase === 'connected') {
                fbDot.className = 'status-dot pulse-green';
                fbLabel.innerHTML = `Firebase <strong>Connected</strong>`;
            } else {
                fbDot.className = 'status-dot dot-orange';
                fbLabel.innerHTML = `Firebase <strong>Not Configured</strong>`;
            }

            // Mode badge
            if (data.mode === 'live') {
                modeBadge.textContent = ' LIVE — Firebase Mode';
                modeBadge.className = 'mode-badge';
            } else {
                modeBadge.textContent = ' MOCK — Demo Mode';
                modeBadge.className = 'mode-badge mock';
            }
        } catch (err) {
            serverDot.className = 'status-dot dot-red';
            serverLabel.innerHTML = 'Server <strong>Offline</strong>';
            fbDot.className = 'status-dot dot-red';
            fbLabel.innerHTML = 'Firebase <strong>Unknown</strong>';
            modeBadge.textContent = ' OFFLINE';
            modeBadge.className = 'mode-badge mock';
        }
    }

    // ═══════════════ NAVIGATION ═══════════════
    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page');
        const title = document.getElementById('page-title');
        const crumb = document.getElementById('page-breadcrumb');

        const labels = {
            'dashboard': { title: 'Dashboard', crumb: 'Overview' },
            'diagnose': { title: 'New Diagnosis', crumb: 'AI Pipeline' },
            'analytics': { title: 'Analytics', crumb: 'Insights & Logs' },
        };

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const pageId = item.dataset.page;
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                pages.forEach(p => p.classList.remove('active'));
                document.getElementById(`${pageId}-page`).classList.add('active');
                title.textContent = labels[pageId].title;
                crumb.textContent = labels[pageId].crumb;

                if (pageId === 'dashboard') {
                    setTimeout(() => dashboardMap?.invalidateSize(), 150);
                    loadDashboardData();
                }
                if (pageId === 'analytics') loadAnalyticsData();
            });
        });
    }

    // ═══════════════════════════════════════════
    //                 DASHBOARD
    // ═══════════════════════════════════════════
    function initDashboard() {
        // Map
        dashboardMap = L.map('dashboard-map').setView([userCoords.lat, userCoords.lon], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(dashboardMap);

        // Map Legend
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = '<h4>Crop Distribution</h4>';
            Object.keys(cropColors).forEach(crop => {
                const color = cropColors[crop];
                div.innerHTML += `
                    <div class="legend-item">
                        <span class="legend-dot" style="background:${color}"></span>
                        <span style="text-transform:capitalize">${crop}</span>
                    </div>`;
            });
            return div;
        };
        legend.addTo(dashboardMap);

        // Risk Doughnut
        riskChart = new Chart(document.getElementById('riskChart'), {
            type: 'doughnut',
            data: {
                labels: ['Ideal', 'Moderate', 'At Risk'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                }],
            },
            options: {
                cutout: '72%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#8b8fa4', padding: 16, font: { family: 'Outfit' } } },
                },
            },
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', loadDashboardData);

        loadDashboardData();
    }

    async function loadDashboardData() {
        try {
            const res = await fetch(`${API}/stats`);
            const data = await res.json();

            // KPIs
            document.getElementById('kpi-total').textContent = data.totalDiagnoses ?? 0;
            document.getElementById('kpi-risk').textContent = data.riskLevels?.critical ?? 0;
            document.getElementById('kpi-moderate').textContent = data.riskLevels?.moderate ?? 0;
            document.getElementById('kpi-ideal').textContent = data.riskLevels?.ideal ?? 0;

            // Chart
            riskChart.data.datasets[0].data = [
                data.riskLevels?.ideal ?? 0,
                data.riskLevels?.moderate ?? 0,
                data.riskLevels?.critical ?? 0,
            ];
            riskChart.update();

            // Map markers
            mapMarkers.forEach(m => dashboardMap.removeLayer(m));
            mapMarkers = [];

            const entries = data.recentEntries || [];

            entries.forEach(e => {
                if (e.location?.lat && e.location?.lon) {
                    const cropKey = e.crop ? e.crop.toLowerCase() : '';
                    const color = cropColors[cropKey] || '#3b82f6'; // Default Blue

                    const marker = L.circleMarker([e.location.lat, e.location.lon], {
                        radius: 8,
                        fillColor: color,
                        fillOpacity: 0.8,
                        color: '#fff',
                        weight: 1,
                    }).addTo(dashboardMap);
                    marker.bindPopup(`<b>${e.crop.charAt(0).toUpperCase() + e.crop.slice(1)}</b><br>Score: ${e.climateResult?.score ?? '—'}%`);
                    mapMarkers.push(marker);
                }
            });

            // Findings Cards
            const grid = document.getElementById('findings-grid');
            grid.innerHTML = '';
            if (entries.length === 0) {
                grid.innerHTML = '<p style="color:var(--text-dim);padding:2rem;text-align:center">No diagnoses yet. Run your first scan!</p>';
                return;
            }

            entries.slice(0, 6).forEach(e => {
                const score = e.climateResult?.score ?? 0;
                const cls = score < 50 ? 'critical' : score < 80 ? 'warning' : '';
                const date = new Date(e.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                const card = document.createElement('div');
                card.className = `finding-card ${cls}`;
                card.innerHTML = `
                    <div class="finding-top">
                        <h4>${e.crop}</h4>
                        <span class="finding-date">${date}</span>
                    </div>
                    <div class="finding-body">
                        <strong>${score}%</strong> – ${e.climateResult?.category ?? '—'}<br>
                        Image: ${e.imageResult?.status ?? '—'} · Audio: ${e.audioResult?.status ?? '—'}
                    </div>
                `;
                grid.appendChild(card);
            });

        } catch (err) {
            console.warn('Dashboard fetch failed:', err.message);
        }
    }

    // ═══════════════════════════════════════════
    //                DIAGNOSIS
    // ═══════════════════════════════════════════
    function initDiagnosis() {
        const locBtn = document.getElementById('get-location-btn');
        const locStatus = document.getElementById('location-status');
        const locText = document.getElementById('loc-btn-text');
        const diagBtn = document.getElementById('diagnose-btn');
        const loader = document.getElementById('diag-loader');
        const errorBnr = document.getElementById('diag-error');
        const resultCard = document.getElementById('result-card');

        // GPS
        locBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                locStatus.textContent = 'Geolocation not supported by this browser.';
                return;
            }
            locText.textContent = '⏳ Detecting…';
            navigator.geolocation.getCurrentPosition(
                pos => {
                    userCoords.lat = pos.coords.latitude;
                    userCoords.lon = pos.coords.longitude;
                    locText.textContent = '✅ Location Acquired';
                    locStatus.textContent = `📍 ${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}`;
                    locStatus.style.color = '#22c55e';
                },
                () => {
                    locText.textContent = '📍 Detect My Location';
                    locStatus.textContent = 'Permission denied. Using default (Pune, MH).';
                }
            );
        });

        // Diagnose
        diagBtn.addEventListener('click', async () => {
            const crop = document.getElementById('crop-select').value;

            // Simulation Mappings
            const imgMap = {
                'not_check': { status: 'Not Checked', issue: 'Skipped', confidence: 0 },
                'healthy': { status: 'Healthy', issue: 'None', confidence: 0.96 },
                'diseased': { status: 'Critical', issue: 'Rust Detected', confidence: 0.91 },
                'warning': { status: 'Warning', issue: 'Nutrient Deficiency', confidence: 0.84 },
                'blight': { status: 'Critical', issue: 'Late Blight', confidence: 0.89 },
            };
            const imageResult = imgMap[document.getElementById('sim-image').value];
            const audioFreq = document.getElementById('audio-freq').value;
            const audioAmp = document.getElementById('audio-amp').value;

            // UI State
            loader.classList.remove('hidden');
            errorBnr.classList.add('hidden');
            resultCard.classList.add('hidden');
            diagBtn.disabled = true;

            try {
                const res = await fetch(`${API}/diagnose`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ crop, lat: userCoords.lat, lon: userCoords.lon, imageResult, audioFreq, audioAmp }),
                });

                if (!res.ok) throw new Error(`Server ${res.status}`);
                const data = await res.json();
                showResult(data);

            } catch (err) {
                console.error('Diagnosis failed:', err);
                errorBnr.classList.remove('hidden');
            } finally {
                loader.classList.add('hidden');
                diagBtn.disabled = false;
            }
        });
    }

    function showResult(d) {
        const card = document.getElementById('result-card');
        card.classList.remove('hidden');

        // Meta
        document.getElementById('result-crop-name').textContent = d.crop;
        document.getElementById('result-timestamp').textContent = new Date(d.timestamp).toLocaleString('en-IN');
        document.getElementById('result-location').textContent = `📍 ${d.location.lat.toFixed(4)}, ${d.location.lon.toFixed(4)}`;
        document.getElementById('firebase-save-status').textContent = d.id ? '✓ Saved to Firebase' : '⚠ Offline mode';

        // Score Ring
        const score = d.climateResult.score;
        document.getElementById('score-val').textContent = score;
        document.getElementById('category-text').textContent = d.climateResult.category;

        const descriptions = {
            'Ideal': 'All parameters are within optimal range.',
            'Moderate': 'Some parameters need monitoring – review advisory.',
            'Not Suitable': 'High risk conditions. Immediate action recommended.',
        };
        document.getElementById('category-desc').textContent = descriptions[d.climateResult.category] || '';

        const ring = document.getElementById('score-ring');
        ring.style.borderColor = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

        // Planting Season
        document.getElementById('next-planting-season').textContent = d.climateResult?.nextPlantingSeason || 'Check local calendar';

        // Weather Snapshot
        const details = d.climateResult?.details;
        const snap = document.getElementById('weather-snap');
        snap.innerHTML = '';
        if (details) {
            const chips = [
                { label: 'Temperature', value: `${details.temperature}°C` },
                { label: 'Humidity', value: `${details.humidity}%` },
                { label: 'Rainfall', value: `${details.rainfall} mm` },
            ];
            chips.forEach(c => {
                const el = document.createElement('div');
                el.className = 'weather-chip';
                el.innerHTML = `<div class="wc-label">${c.label}</div><div class="wc-value">${c.value}</div>`;
                snap.appendChild(el);
            });
        }

        // Module Tags
        setTag('climate-tag', d.climateResult.category);
        setTag('image-tag', d.imageResult.status, d.imageResult.issue);
        setTag('audio-tag', d.audioResult.status, d.audioResult.issue);

        // Advisory
        document.getElementById('advisory-text').textContent = d.advisory;

        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function setTag(id, status, issue = null) {
        const el = document.getElementById(id);
        let displayText = status;
        if (issue && issue !== 'None' && issue !== 'Skipped' && issue !== 'Baseline') {
            displayText = `${status}: ${issue}`;
        }
        el.textContent = displayText;
        el.className = 'status-tag';
        if (['Ideal', 'Healthy', 'Normal', 'No Pests Detected'].includes(status)) el.classList.add('ideal');
        else if (status === 'Not Checked' || status === 'Skipped') el.classList.add('neutral');
        else if (['Warning', 'Moderate'].includes(status)) el.classList.add('warning');
        else el.classList.add('critical');
    }

    // ═══════════════════════════════════════════
    //                ANALYTICS
    // ═══════════════════════════════════════════
    async function loadAnalyticsData() {
        try {
            const res = await fetch(`${API}/stats`);
            const data = await res.json();
            const entries = data.recentEntries || [];

            // ─── Crop Bar Chart ───
            const cropCounts = {};
            entries.forEach(e => { cropCounts[e.crop] = (cropCounts[e.crop] || 0) + 1; });

            if (cropBarChart) cropBarChart.destroy();
            cropBarChart = new Chart(document.getElementById('cropBarChart'), {
                type: 'bar',
                data: {
                    labels: Object.keys(cropCounts),
                    datasets: [{
                        label: 'Scan Count',
                        data: Object.values(cropCounts),
                        backgroundColor: '#22c55e',
                        borderRadius: 6,
                    }],
                },
                options: chartOpts('Scans per Crop'),
            });

            // ─── Score Trend Line ───
            const scores = entries.slice().reverse().map(e => e.climateResult?.score ?? 0);
            const labels = entries.slice().reverse().map((_, i) => `Scan ${i + 1}`);

            if (trendLineChart) trendLineChart.destroy();
            trendLineChart = new Chart(document.getElementById('trendLineChart'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Suitability Score',
                        data: scores,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#3b82f6',
                    }],
                },
                options: chartOpts('Score Over Time'),
            });

            // ─── Issue Polar ───
            const issueCounts = {};
            entries.forEach(e => {
                const issue = e.imageResult?.issue || 'None';
                issueCounts[issue] = (issueCounts[issue] || 0) + 1;
            });

            if (issueChart) issueChart.destroy();
            issueChart = new Chart(document.getElementById('issueChart'), {
                type: 'polarArea',
                data: {
                    labels: Object.keys(issueCounts),
                    datasets: [{
                        data: Object.values(issueCounts),
                        backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#a855f7'],
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#8b8fa4', font: { family: 'Outfit' } } } },
                    scales: { r: { ticks: { display: false }, grid: { color: '#2d3144' } } },
                },
            });

            // ─── Log Table ───
            const tbody = document.getElementById('log-table-body');
            document.getElementById('log-count').textContent = `${entries.length} records`;
            tbody.innerHTML = '';

            entries.forEach((e, i) => {
                const score = e.climateResult?.score ?? '—';
                const date = new Date(e.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${i + 1}</td>
                    <td style="text-transform:capitalize">${e.crop}</td>
                    <td><strong>${score}%</strong></td>
                    <td>${e.climateResult?.category ?? '—'}</td>
                    <td>${e.imageResult?.status ?? '—'}</td>
                    <td>${e.audioResult?.status ?? '—'}</td>
                    <td>${date}</td>
                `;
                tbody.appendChild(row);
            });

        } catch (err) {
            console.warn('Analytics load failed:', err.message);
        }
    }

    function chartOpts(titleText) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false },
            },
            scales: {
                x: { ticks: { color: '#8b8fa4', font: { family: 'Outfit' } }, grid: { color: '#2d3144' } },
                y: { ticks: { color: '#8b8fa4', font: { family: 'Outfit' } }, grid: { color: '#2d3144' }, beginAtZero: true },
            },
        };
    }
});
