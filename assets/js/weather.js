let refreshInterval;
let map = null;
let marker = null;
let useCelsius = true;
let lastData = null;
let particleAnimation = null;

// ── PARTICULE ANIMATE ──
const PARTICLE_TYPES = {
    rain:  { codes: [51,61,63,80,81,82], color: "rgba(147,197,253,0.7)", count: 120, speed: 14, size: 2, angle: 15 },
    snow:  { codes: [71,73,75,77,85,86], color: "rgba(255,255,255,0.8)", count: 80,  speed: 3,  size: 4, angle: 5  },
    storm: { codes: [95,96,99],          color: "rgba(147,197,253,0.5)", count: 150, speed: 18, size: 2, angle: 25 },
    fog:   { codes: [45,48],             color: "rgba(255,255,255,0.15)",count: 40,  speed: 0.5,size: 8, angle: 0  },
};

function getParticleType(code) {
    for (const [type, cfg] of Object.entries(PARTICLE_TYPES)) {
        if (cfg.codes.includes(code)) return { type, ...cfg };
    }
    return null;
}

function startParticles(weatherCode) {
    const canvas = document.getElementById("particleCanvas");
    const ctx = canvas.getContext("2d");

    if (particleAnimation) cancelAnimationFrame(particleAnimation);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cfg = getParticleType(weatherCode);
    if (!cfg) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: cfg.count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: cfg.type === "rain" || cfg.type === "storm"
            ? Math.random() * 15 + 10
            : Math.random() * cfg.size + cfg.size / 2,
        speed: cfg.speed * (0.5 + Math.random()),
        opacity: Math.random() * 0.6 + 0.3,
    }));

    const angleRad = (cfg.angle * Math.PI) / 180;
    const dx = Math.sin(angleRad);
    const dy = Math.cos(angleRad);

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.globalAlpha = p.opacity;
            if (cfg.type === "rain" || cfg.type === "storm") {
                ctx.strokeStyle = cfg.color;
                ctx.lineWidth = 1.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + dx * p.len, p.y + dy * p.len);
                ctx.stroke();
            } else if (cfg.type === "snow") {
                ctx.fillStyle = cfg.color;
                ctx.arc(p.x, p.y, p.len, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = cfg.color;
                ctx.arc(p.x, p.y, p.len * 6, 0, Math.PI * 2);
                ctx.fill();
            }
            p.x += dx * p.speed * 0.3;
            p.y += dy * p.speed * 0.3 + (cfg.type === "fog" ? 0 : p.speed * 0.15);
            if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
            if (p.x > canvas.width)  { p.x = 0; }
        });
        ctx.globalAlpha = 1;
        particleAnimation = requestAnimationFrame(draw);
    }
    draw();
}

window.addEventListener("resize", () => {
    const canvas = document.getElementById("particleCanvas");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ── BACKGROUND CROSSFADE ──
function setBackgroundByWeather(weatherCode) {
    const gradients = {
        0:  "linear-gradient(135deg, #1e3a8a, #3b82f6)",
        1:  "linear-gradient(135deg, #1e40af, #60a5fa)",
        2:  "linear-gradient(135deg, #374151, #6b7280)",
        3:  "linear-gradient(135deg, #1f2937, #4b5563)",
        45: "linear-gradient(135deg, #292524, #78716c)",
        48: "linear-gradient(135deg, #292524, #78716c)",
        51: "linear-gradient(135deg, #1e3a5f, #3b82f6)",
        61: "linear-gradient(135deg, #1e3a5f, #2563eb)",
        63: "linear-gradient(135deg, #172554, #1d4ed8)",
        71: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
        80: "linear-gradient(135deg, #1e3a5f, #0ea5e9)",
        95: "linear-gradient(135deg, #1a1a2e, #4a0080)",
        99: "linear-gradient(135deg, #0f0f1a, #3b0066)",
    };

    const gradient = gradients[weatherCode] || "linear-gradient(135deg, #1e3a8a, #3b82f6)";
    const layerA = document.getElementById("bg-layer-a");
    const layerB = document.getElementById("bg-layer-b");
    const aIsActive = layerA.style.zIndex !== "-3";
    const incoming = aIsActive ? layerB : layerA;
    const outgoing = aIsActive ? layerA : layerB;

    incoming.style.background = gradient;
    incoming.style.zIndex = "-2";
    outgoing.style.zIndex  = "-3";
    incoming.getBoundingClientRect();
    incoming.style.opacity = "1";
    outgoing.style.opacity = "0";

    startParticles(weatherCode);
}

// ── HARTA ──
function updateMap(lat, lon, name) {
    if (!map) {
        map = L.map('map').setView([lat, lon], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
    } else {
        map.setView([lat, lon], 11);
    }
    if (marker) marker.remove();
    marker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<b>${name}</b>`)
        .openPopup();
}

// ── TEMPERATURA CONVERSIE ──
function convertTemp(celsius) {
    return useCelsius ? Math.round(celsius) + "°C" : Math.round(celsius * 9/5 + 32) + "°F";
}

// ── PUNCT DE ROUA ──
function calcDewPoint(tempC, humidity) {
    const a = 17.27, b = 237.7;
    const alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
}

// ── INDICE UV ──
function getUVInfo(uv) {
    if (uv <= 2)  return { label: "Scăzut",   cls: "uv-low" };
    if (uv <= 5)  return { label: "Moderat",  cls: "uv-mid" };
    if (uv <= 7)  return { label: "Ridicat",  cls: "uv-high" };
    if (uv <= 10) return { label: "F. ridicat",cls: "uv-vhigh" };
    return              { label: "Extrem",    cls: "uv-extreme" };
}

// ── GPS ──
function getGPSLocation() {
    const errorEl = document.getElementById("errorMessage");
    if (!navigator.geolocation) {
        errorEl.textContent = "GPS-ul nu este suportat de browserul tău!";
        errorEl.style.display = "block";
        return;
    }
    errorEl.style.display = "none";
    document.getElementById("cityName").textContent = "Se detectează locația...";

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                );
                const data = await res.json();
                const name = data.address.city || data.address.town || data.address.village || "Locația ta";
                const country = data.address.country || "";
                updateActiveButton("");
                startLiveUpdates(latitude, longitude, `${name}, ${country}`);
                localStorage.setItem("lastCity", name);
            } catch {
                startLiveUpdates(latitude, longitude, "Locația ta");
            }
        },
        () => {
            errorEl.textContent = "Nu s-a putut accesa locația!";
            errorEl.style.display = "block";
        }
    );
}

// ── CAUTARE ──
async function searchGlobalWeather(cityName) {
    if (!cityName) return;
    const errorEl = document.getElementById("errorMessage");
    errorEl.style.display = "none";

    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ro&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results) {
            errorEl.textContent = "Orașul nu a fost găsit!";
            errorEl.style.display = "block";
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        updateActiveButton(name);
        startLiveUpdates(latitude, longitude, `${name}, ${country || ""}`);
        localStorage.setItem("lastCity", cityName);
    } catch {
        errorEl.textContent = "Eroare de conexiune!";
        errorEl.style.display = "block";
    }
}

// ── LIVE UPDATE ──
function startLiveUpdates(lat, lon, name) {
    if (refreshInterval) clearInterval(refreshInterval);
    fetchWeather(lat, lon, name);
    refreshInterval = setInterval(() => fetchWeather(lat, lon, name), 600000);
}

// ── FETCH ──
async function fetchWeather(lat, lon, name) {
    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,visibility,surface_pressure,uv_index` +
        `&hourly=temperature_2m,weather_code,precipitation_probability` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
        `&timezone=auto&forecast_days=6`;

    try {
        const resp = await fetch(url);
        const data = await resp.json();
        lastData = { data, name, lat, lon };
        updateUI(data, name, lat, lon);
    } catch (e) {
        console.error("Meteo error", e);
    }
}

// ── UPDATE UI ──
function updateUI(data, name, lat, lon) {
    const current = data.current;

    setBackgroundByWeather(current.weather_code);
    updateMap(lat, lon, name);

    document.getElementById("cityName").textContent = name;
    document.getElementById("temperature").textContent = convertTemp(current.temperature_2m);
    document.getElementById("condition").textContent = getDesc(current.weather_code);
    document.getElementById("weatherIcon").textContent = getEmoji(current.weather_code);

    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = Math.round(current.wind_speed_10m) + " km/h";
    document.getElementById("feelsLike").textContent = convertTemp(current.apparent_temperature);
    document.getElementById("visibility").textContent = (current.visibility / 1000).toFixed(0) + " km";

    // Punct de rouă
    const dew = calcDewPoint(current.temperature_2m, current.relative_humidity_2m);
    document.getElementById("dewpoint").textContent = convertTemp(dew);

    // Presiune
    document.getElementById("pressure").textContent = Math.round(current.surface_pressure) + " hPa";

    // Indice UV
    const uv = current.uv_index ?? null;
    if (uv !== null) {
        const uvInfo = getUVInfo(uv);
        document.getElementById("uvindex").innerHTML =
            `${Math.round(uv)} <span class="uv-badge ${uvInfo.cls}">${uvInfo.label}</span>`;
    } else {
        document.getElementById("uvindex").textContent = "N/A";
    }

    // Răsărit / Apus
    if (data.daily.sunrise && data.daily.sunrise[0]) {
        document.getElementById("sunrise").textContent = data.daily.sunrise[0].substring(11, 16);
        document.getElementById("sunset").textContent  = data.daily.sunset[0].substring(11, 16);
    }

    document.getElementById("lastUpdated").textContent =
        "Live: " + new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    updateHourlyForecast(data);
    updateDailyForecast(data);
}

// ── PROGNOZA ORARA ──
function updateHourlyForecast(data) {
    const hourlyScroll = document.getElementById("hourlyScroll");
    if (!hourlyScroll) return;

    const now = new Date();
    const times    = data.hourly.time;
    const temps    = data.hourly.temperature_2m;
    const codes    = data.hourly.weather_code;
    const rainProb = data.hourly.precipitation_probability;

    let startIndex = 0;
    for (let i = 0; i < times.length; i++) {
        const itemDate = new Date(times[i]);
        if (itemDate.toDateString() === now.toDateString() && itemDate.getHours() === now.getHours()) {
            startIndex = i;
            break;
        }
    }

    hourlyScroll.innerHTML = "";
    const count = Math.min(24, times.length - startIndex);

    for (let j = 0; j < count; j++) {
        const idx = startIndex + j;
        const hour = new Date(times[idx]).getHours();
        const isCurrent = j === 0;
        const timeLabel = isCurrent ? "Acum" : hour.toString().padStart(2, "0") + ":00";
        const rain = rainProb ? rainProb[idx] : null;
        const rainHtml = rain !== null ? `<span class="hourly-rain">💧${rain}%</span>` : "";

        const item = document.createElement("div");
        item.className = `hourly-item${isCurrent ? " current-hour" : ""}`;
        item.innerHTML = `
            <span class="hourly-time">${timeLabel}</span>
            <span class="hourly-icon">${getEmoji(codes[idx])}</span>
            <span class="hourly-temp">${convertTemp(temps[idx])}</span>
            ${rainHtml}
        `;
        hourlyScroll.appendChild(item);
    }
    hourlyScroll.scrollLeft = 0;
}

// ── PROGNOZA 5 ZILE ──
function updateDailyForecast(data) {
    const forecastGrid = document.getElementById("forecastGrid");
    if (!forecastGrid) return;

    forecastGrid.innerHTML = "";
    const limit = Math.min(5, data.daily.time.length);

    for (let i = 0; i < limit; i++) {
        const day = new Date(data.daily.time[i])
            .toLocaleDateString('ro-RO', { weekday: 'short' });
        const div = document.createElement("div");
        div.className = "forecast-day";
        div.innerHTML = `
            <span class="forecast-day-name">${day}</span>
            <span class="forecast-icon">${getEmoji(data.daily.weather_code[i])}</span>
            <span class="forecast-temp">${convertTemp(data.daily.temperature_2m_max[i])}</span>
        `;
        forecastGrid.appendChild(div);
    }
}

function getDesc(c) {
    const d = {
        0:"Senin", 1:"Mai mult senin", 2:"Parțial noros", 3:"Noros",
        45:"Ceață", 48:"Ceață cu chiciură", 51:"Burniță ușoară",
        61:"Ploaie ușoară", 63:"Ploaie moderată", 71:"Ninsoare ușoară",
        80:"Averse", 95:"Furtună", 99:"Furtună cu grindină",
    };
    return d[c] || "Variabil";
}

function getEmoji(c) {
    const e = {
        0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 48:"🌫️",
        51:"🌦️", 61:"🌧️", 63:"🌧️", 71:"❄️", 80:"🌦️", 95:"⛈️", 99:"⛈️",
    };
    return e[c] || "☁️";
}

function updateActiveButton(name) {
    document.querySelectorAll('.city-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.toLowerCase() === name.toLowerCase());
    });
}

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.addEventListener('click', () => searchGlobalWeather(btn.textContent));
    });

    document.querySelector('.search-btn').addEventListener('click', () => {
        const val = document.getElementById("searchInput").value.trim();
        document.getElementById("searchInput").value = "";
        searchGlobalWeather(val);
    });

    document.querySelector('.gps-btn').addEventListener('click', getGPSLocation);

    document.getElementById("searchInput").addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = e.target.value.trim();
            e.target.value = "";
            searchGlobalWeather(val);
        }
    });

    // Toggle °C / °F
    document.getElementById("btnC").addEventListener('click', () => {
        useCelsius = true;
        document.getElementById("btnC").classList.add("active");
        document.getElementById("btnF").classList.remove("active");
        if (lastData) updateUI(lastData.data, lastData.name, lastData.lat, lastData.lon);
    });

    document.getElementById("btnF").addEventListener('click', () => {
        useCelsius = false;
        document.getElementById("btnF").classList.add("active");
        document.getElementById("btnC").classList.remove("active");
        if (lastData) updateUI(lastData.data, lastData.name, lastData.lat, lastData.lon);
    });

    searchGlobalWeather(localStorage.getItem("lastCity") || "București");
});
