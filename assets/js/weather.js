let refreshInterval;
let map = null;
let marker = null;

function setBackgroundByWeather(weatherCode) {
    const gradients = {
        0:  "linear-gradient(135deg, #1e3a8a, #3b82f6)",
        1:  "linear-gradient(135deg, #1e40af, #60a5fa)",
        2:  "linear-gradient(135deg, #374151, #6b7280)",
        3:  "linear-gradient(135deg, #1f2937, #4b5563)",
        45: "linear-gradient(135deg, #292524, #78716c)",
        61: "linear-gradient(135deg, #1e3a5f, #2563eb)",
        95: "linear-gradient(135deg, #1a1a2e, #4a0080)",
    };
    const gradient = gradients[weatherCode] || "linear-gradient(135deg, #1e3a8a, #3b82f6)";
    document.body.setAttribute("style", `background: ${gradient} !important; transition: background 1s ease;`);
}

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
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                const data = await res.json();
                const name = data.address.city || data.address.town || data.address.village || "Locația ta";
                const country = data.address.country || "";
                const fullName = `${name}, ${country}`;
                updateActiveButton("");
                startLiveUpdates(latitude, longitude, fullName);
                localStorage.setItem("lastCity", name);
            } catch (e) {
                startLiveUpdates(latitude, longitude, "Locația ta");
            }
        },
        () => {
            errorEl.textContent = "Nu s-a putut accesa locația!";
            errorEl.style.display = "block";
        }
    );
}

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
        const fullName = `${name}, ${country || ""}`;
        
        updateActiveButton(name);
        startLiveUpdates(latitude, longitude, fullName);
        localStorage.setItem("lastCity", cityName);

    } catch (e) {
        errorEl.textContent = "Eroare de conexiune!";
        errorEl.style.display = "block";
    }
}

function startLiveUpdates(lat, lon, name) {
    if (refreshInterval) clearInterval(refreshInterval);
    fetchWeather(lat, lon, name);
    // Refresh la fiecare 10 minute
    refreshInterval = setInterval(() => fetchWeather(lat, lon, name), 600000);
}

async function fetchWeather(lat, lon, name) {
    // Am adăugat &hourly= pentru prognoza orară
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,visibility` +
        `&hourly=temperature_2m,weather_code,precipitation_probability` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_days=2`;
    
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        updateUI(data, name, lat, lon);
    } catch (e) { console.error("Meteo error", e); }
}

function updateUI(data, name, lat, lon) {
    const current = data.current;
    setBackgroundByWeather(current.weather_code);
    updateMap(lat, lon, name);

    document.getElementById("cityName").textContent = name;
    document.getElementById("temperature").textContent = Math.round(current.temperature_2m) + "°C";
    document.getElementById("condition").textContent = getDesc(current.weather_code);
    document.getElementById("weatherIcon").textContent = getEmoji(current.weather_code);
    
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = Math.round(current.wind_speed_10m) + " km/h";
    document.getElementById("feelsLike").textContent = Math.round(current.apparent_temperature) + "°C";
    document.getElementById("visibility").textContent = (current.visibility / 1000).toFixed(0) + " km";
    
    document.getElementById("lastUpdated").textContent = "Live: " + new Date().toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'});

    // Prognoza orara (NOU)
    updateHourlyForecast(data);

    // Prognoza 5 zile
    const forecastGrid = document.getElementById("forecastGrid");
    forecastGrid.innerHTML = "";
    for (let i = 0; i < 5; i++) {
        const day = new Date(data.daily.time[i]).toLocaleDateString('ro-RO', {weekday: 'short'});
        forecastGrid.innerHTML += `
            <div class="forecast-day">
                <span class="forecast-day-name">${day}</span>
                <span class="forecast-icon">${getEmoji(data.daily.weather_code[i])}</span>
                <span class="forecast-temp">${Math.round(data.daily.temperature_2m_max[i])}°</span>
            </div>
        `;
    }
}

// ================================
// FUNCȚIE NOUĂ - Prognoză orară
// ================================
function updateHourlyForecast(data) {
    const hourlyScroll = document.getElementById("hourlyScroll");
    if (!hourlyScroll) return;

    const now = new Date();
    const currentHour = now.getHours();

    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    const codes = data.hourly.weather_code;
    const rainProb = data.hourly.precipitation_probability;

    // Găsim indexul orei curente în array
    let startIndex = 0;
    for (let i = 0; i < times.length; i++) {
        const itemDate = new Date(times[i]);
        if (itemDate.toDateString() === now.toDateString() && itemDate.getHours() === currentHour) {
            startIndex = i;
            break;
        }
    }

    hourlyScroll.innerHTML = "";

    // Afișăm 24 ore începând de la ora curentă
    const count = Math.min(24, times.length - startIndex);
    for (let j = 0; j < count; j++) {
        const idx = startIndex + j;
        const itemDate = new Date(times[idx]);
        const hour = itemDate.getHours();
        const isCurrent = j === 0;

        const timeLabel = isCurrent
            ? "Acum"
            : hour.toString().padStart(2, "0") + ":00";

        const rain = rainProb ? rainProb[idx] : null;
        const rainHtml = rain !== null
            ? `<span class="hourly-rain">💧${rain}%</span>`
            : "";

        hourlyScroll.innerHTML += `
            <div class="hourly-item ${isCurrent ? "current-hour" : ""}">
                <span class="hourly-time">${timeLabel}</span>
                <span class="hourly-icon">${getEmoji(codes[idx])}</span>
                <span class="hourly-temp">${Math.round(temps[idx])}°C</span>
                ${rainHtml}
            </div>
        `;
    }

    hourlyScroll.scrollLeft = 0;
}

function getDesc(c) {
    const d = {0:"Senin",1:"Mai mult senin",2:"Parțial noros",3:"Noros",45:"Ceață",61:"Ploaie",95:"Furtună"};
    return d[c] || "Variabil";
}

function getEmoji(c) {
    const e = {0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",61:"🌧️",95:"⛈️"};
    return e[c] || "☁️";
}

function updateActiveButton(name) {
    document.querySelectorAll('.city-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.toLowerCase() === name.toLowerCase());
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.addEventListener('click', () => searchGlobalWeather(btn.textContent));
    });

    document.querySelector('.search-btn').addEventListener('click', () => {
        const val = document.getElementById("searchInput").value;
        document.getElementById("searchInput").value = "";
        searchGlobalWeather(val);
    });

    document.querySelector('.gps-btn').addEventListener('click', getGPSLocation);

    document.getElementById("searchInput").addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = e.target.value;
            e.target.value = "";
            searchGlobalWeather(val);
        }
    });

    searchGlobalWeather(localStorage.getItem("lastCity") || "București");
});
