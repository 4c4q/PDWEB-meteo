// js/weather.js - Versiunea Realtime cu încărcare din JSON

let romanianCities = [];
let citySearchMap = {};
let weatherRefreshInterval;

// 1. Funcția de normalizare diacritice
function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// 2. Încărcarea datelor din database.json
async function loadConfigAndInit() {
    try {
        const response = await fetch('./js/database.json');
        const data = await response.json();
        
        romanianCities = data.cities;
        
        // Populăm harta de căutare
        romanianCities.forEach(city => {
            const key = removeDiacritics(city.name);
            citySearchMap[key] = city;
        });

        console.log("Configurație încărcată. Inițializăm aplicația...");
        initApp();
    } catch (error) {
        console.error("Eroare la încărcarea fișierului JSON:", error);
        showError("Eroare la configurare. Verifică fișierul JSON.");
    }
}

// 3. Inițializarea aplicației
function initApp() {
    const lastCity = localStorage.getItem("lastCity") || "București";

    // Marcare buton activ
    updateActiveButton(lastCity);

    // Pornire actualizări în timp real
    startRealtimeUpdates(lastCity);

    // Event listener pentru search
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") searchCity();
        });
    }
}

// 4. Logica de Realtime
function startRealtimeUpdates(cityName) {
    if (weatherRefreshInterval) clearInterval(weatherRefreshInterval);

    // Prima descărcare
    getWeather(cityName);

    // Actualizare la fiecare 10 minute
    weatherRefreshInterval = setInterval(() => {
        console.log(`[Realtime] Update automat: ${cityName}`);
        getWeather(cityName);
    }, 600000); 
}

// 5. Obținerea datelor de la API
async function getWeather(cityInput) {
    hideError();
    const normalized = removeDiacritics(cityInput);
    let foundCity = citySearchMap[normalized];

    if (!foundCity) {
        showError(`Nu am găsit "${cityInput}".`);
        return;
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${foundCity.lat}&longitude=${foundCity.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

        const response = await fetch(url);
        const data = await response.json();

        updateCurrentWeather(data, foundCity.name);
        updateForecast(data.daily);

        localStorage.setItem("lastCity", foundCity.name);
    } catch (error) {
        showError("Eroare la conectarea cu serverul meteo.");
    }
}

// 6. Actualizare Interfață (UI)
function updateCurrentWeather(data, cityName) {
    const current = data.current;
    const now = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    document.getElementById("cityName").textContent = cityName;
    document.getElementById("temperature").textContent = Math.round(current.temperature_2m) + "°C";
    document.getElementById("condition").textContent = getWeatherDescription(current.weather_code);
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = Math.round(current.wind_speed_10m) + " km/h";
    document.getElementById("feelsLike").textContent = Math.round(current.apparent_temperature) + "°C";
    document.getElementById("weatherIcon").textContent = getWeatherEmoji(current.weather_code);
    
    // Indicator de timp real
    const lastUpdateEl = document.getElementById("lastUpdated");
    if (lastUpdateEl) lastUpdateEl.textContent = `Live: ${now}`;
}

function updateForecast(daily) {
    const grid = document.getElementById("forecastGrid");
    if (!grid) return;

    let html = "";
    for (let i = 0; i < 5; i++) {
        const date = new Date(daily.time[i]);
        html += `
            <div class="forecast-day">
                <div class="forecast-day-name">${date.toLocaleDateString('ro-RO', { weekday: 'short' })}</div>
                <div class="forecast-icon">${getWeatherEmoji(daily.weather_code[i])}</div>
                <div class="forecast-temp">${Math.round(daily.temperature_2m_max[i])}°</div>
                <div class="forecast-temp-min">${Math.round(daily.temperature_2m_min[i])}°</div>
            </div>
        `;
    }
    grid.innerHTML = html;
}

// Helperi: Emoji, Descrieri, Erori
function getWeatherDescription(code) {
    const desc = {0:"Senin",1:"Predominant senin",2:"Parțial noros",3:"Noros",45:"Ceață",61:"Ploaie ușoară",63:"Ploaie",65:"Ploaie puternică",71:"Ninsoare",80:"Averse",95:"Furtună"};
    return desc[code] || "Vreme variabilă";
}

function getWeatherEmoji(code) {
    const emoji = {0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",61:"🌦️",63:"🌧️",65:"⛈️",71:"❄️",80:"🌧️",95:"⛈️"};
    return emoji[code] || "☁️";
}

function showError(msg) {
    const errorEl = document.getElementById("errorMessage");
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = "block"; }
}

function hideError() {
    const errorEl = document.getElementById("errorMessage");
    if (errorEl) errorEl.style.display = "none";
}

function updateActiveButton(cityName) {
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === cityName);
    });
}

// Funcții globale apelate din HTML
window.selectCity = function(city) {
    updateActiveButton(city);
    startRealtimeUpdates(city);
};

window.searchCity =
