let refreshInterval;

// 1. Funcția Principală de Căutare (Geocoding + Weather)
async function searchGlobalWeather(cityName) {
    if (!cityName) return;
    
    hideError();
    console.log(`Căutăm pe glob: ${cityName}`);

    try {
        // PAS 1: Geocoding (Transformăm numele în Latitudine/Longitudine)
        // Folosim API-ul gratuit de la Open-Meteo pentru geocoding
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ro&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            showError(`Orașul "${cityName}" nu a fost găsit.`);
            return;
        }

        const location = geoData.results[0];
        const { latitude, longitude, name, country } = location;
        const displayName = `${name}, ${country}`;

        // PAS 2: Pornim actualizarea Live pentru aceste coordonate
        startLiveUpdates(latitude, longitude, displayName);
        
        // Salvăm ultima căutare
        localStorage.setItem("lastGlobalCity", cityName);

    } catch (error) {
        console.error("Eroare la căutarea globală:", error);
        showError("Eroare de conexiune. Încearcă din nou.");
    }
}

// 2. Gestionarea Actualizărilor Live
function startLiveUpdates(lat, lon, displayName) {
    if (refreshInterval) clearInterval(refreshInterval);

    // Prima descărcare
    fetchWeather(lat, lon, displayName);

    // Actualizare la fiecare 10 minute
    refreshInterval = setInterval(() => {
        fetchWeather(lat, lon, displayName);
    }, 600000);
}

// 3. Obținerea datelor meteo reale
async function fetchWeather(lat, lon, displayName) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();

        updateUI(data, displayName);
    } catch (error) {
        console.error("Eroare la preluarea vremii:", error);
    }
}

// 4. Actualizarea Interfeței
function updateUI(data, displayName) {
    const current = data.current;
    const now = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    document.getElementById("cityName").textContent = displayName;
    document.getElementById("temperature").textContent = Math.round(current.temperature_2m) + "°C";
    document.getElementById("condition").textContent = getDesc(current.weather_code);
    document.getElementById("weatherIcon").textContent = getEmoji(current.weather_code);
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = Math.round(current.wind_speed_10m) + " km/h";
    document.getElementById("feelsLike").textContent = Math.round(current.apparent_temperature) + "°C";

    const updateEl = document.getElementById("lastUpdated");
    if (updateEl) updateEl.textContent = `Live: ${now}`;

    // Update Prognoză
    const grid = document.getElementById("forecastGrid");
    if (grid) {
        grid.innerHTML = data.daily.time.slice(0, 5).map((time, i) => `
            <div class="forecast-day">
                <div>${new Date(time).toLocaleDateString('ro-RO', { weekday: 'short' })}</div>
                <div style="font-size:1.5rem">${getEmoji(data.daily.weather_code[i])}</div>
                <div>${Math.round(data.daily.temperature_2m_max[i])}°</div>
            </div>
        `).join('');
    }
}

// Helpers
function getDesc(c) {
    const d = {0:"Senin", 1:"Predominant senin", 2:"Parțial noros", 3:"Noros", 45:"Ceață", 61:"Ploaie", 71:"Zăpadă", 95:"Furtună"};
    return d[c] || "Variabil";
}
function getEmoji(c) {
    const e = {0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️"};
    return e[c] || "☁️";
}
function showError(msg) {
    const err = document.getElementById("errorMessage");
    if (err) { err.textContent = msg; err.style.display = "block"; }
}
function hideError() {
    const err = document.getElementById("errorMessage");
    if (err) err.style.display = "none";
}

// Funcții Globale pentru butoane/search
window.selectCity = (name) => searchGlobalWeather(name);
window.searchCity = () => {
    const input = document.getElementById("searchInput");
    if (input) {
        searchGlobalWeather(input.value.trim());
        input.value = "";
    }
};

// Inițializare
document.addEventListener("DOMContentLoaded", () => {
    const last = localStorage.getItem("lastGlobalCity") || "București";
    searchGlobalWeather(last);
});
