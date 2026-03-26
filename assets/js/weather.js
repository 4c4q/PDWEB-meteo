// js/weather.js - Versiune completă și stabilă (cu selectCity fixat)

console.log("weather.js - versiune completă încărcată cu succes!");

// Lista orașe România
const romanianCities = [
    { name: "București",      lat: 44.4268, lon: 26.1025 },
    { name: "Cluj-Napoca",    lat: 46.7712, lon: 23.6236 },
    { name: "Iași",           lat: 47.1585, lon: 27.6014 },
    { name: "Constanța",      lat: 44.1598, lon: 28.6348 },
    { name: "Timișoara",      lat: 45.7537, lon: 21.2257 },
    { name: "Brașov",         lat: 45.6528, lon: 25.6109 },
    { name: "Craiova",        lat: 44.3302, lon: 23.7949 },
    { name: "Galați",         lat: 45.4353, lon: 28.0080 },
    { name: "Ploiești",       lat: 44.9409, lon: 26.0211 },
    { name: "Oradea",         lat: 47.0722, lon: 21.9212 },
    { name: "Brăila",         lat: 45.2692, lon: 27.9575 },
    { name: "Arad",           lat: 46.1667, lon: 21.3167 },
    { name: "Pitești",        lat: 44.8565, lon: 24.8692 },
    { name: "Sibiu",          lat: 45.7928, lon: 24.1521 },
    { name: "Bacău",          lat: 46.5679, lon: 26.9135 },
    { name: "Târgu Mureș",    lat: 46.5456, lon: 24.5625 },
    { name: "Baia Mare",      lat: 47.6573, lon: 23.5681 },
    { name: "Buzău",          lat: 45.1500, lon: 26.8333 },
    { name: "Satu Mare",      lat: 47.7917, lon: 22.8853 },
    { name: "Botoșani",       lat: 47.7486, lon: 26.6697 },
    { name: "Suceava",        lat: 47.6514, lon: 26.2556 },
    { name: "Râmnicu Vâlcea", lat: 45.0997, lon: 24.3690 },
    { name: "Piatra Neamț",   lat: 46.9275, lon: 26.3708 },
    { name: "Târgu Jiu",      lat: 45.0347, lon: 23.2742 },
    { name: "Drobeta-Turnu Severin", lat: 44.6369, lon: 22.6597 }
];

// Normalizare diacritice
function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const citySearchMap = {};
romanianCities.forEach(city => {
    const key = removeDiacritics(city.name);
    citySearchMap[key] = city;
});

// ==================== FUNCȚIA PRINCIPALĂ ====================
async function getWeather(cityInput) {
    hideError();
    console.log("Căutare pentru:", cityInput);

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
        console.error("Eroare:", error);
        showError("Nu am putut încărca datele meteo.");
    }
}

// ==================== ACTUALIZARE UI ====================
function updateCurrentWeather(data, cityName) {
    const current = data.current;

    document.getElementById("cityName").textContent = cityName;
    document.getElementById("temperature").textContent = Math.round(current.temperature_2m) + "°C";
    document.getElementById("condition").textContent = getWeatherDescription(current.weather_code);
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = Math.round(current.wind_speed_10m) + " km/h";
    document.getElementById("feelsLike").textContent = Math.round(current.apparent_temperature) + "°C";
    document.getElementById("weatherIcon").textContent = getWeatherEmoji(current.weather_code);
    document.getElementById("visibility").textContent = "10 km";
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

// Helper - descriere și emoji
function getWeatherDescription(code) {
    const desc = {0:"Senin",1:"Predominant senin",2:"Parțial noros",3:"Noros",45:"Ceață",61:"Ploaie ușoară",63:"Ploaie",65:"Ploaie puternică",71:"Ninsoare",80:"Averse",95:"Furtună"};
    return desc[code] || "Vreme variabilă";
}

function getWeatherEmoji(code) {
    const emoji = {0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",61:"🌦️",63:"🌧️",65:"⛈️",71:"❄️",80:"🌧️",95:"⛈️"};
    return emoji[code] || "☁️";
}

// Erori
function showError(msg) {
    const errorEl = document.getElementById("errorMessage");
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = "block";
    }
}

function hideError() {
    const errorEl = document.getElementById("errorMessage");
    if (errorEl) errorEl.style.display = "none";
}

// ==================== FUNCȚIILE PENTRU HTML ====================
function searchCity() {
    const input = document.getElementById("searchInput").value.trim();
    if (input) getWeather(input);
    document.getElementById("searchInput").value = "";
}

function handleKeyPress(event) {
    if (event.key === "Enter") searchCity();
}

function selectCity(city) {
    // Eliminăm clasa "active" de la toate butoanele
    document.querySelectorAll('.city-btn').forEach(btn => btn.classList.remove('active'));
    
    // Adăugăm clasa "active" la butonul apăsat
    document.querySelectorAll('.city-btn').forEach(btn => {
        if (btn.textContent === city) btn.classList.add('active');
    });

    getWeather(city);
}

// Inițializare
document.addEventListener("DOMContentLoaded", () => {
    console.log("Aplicația s-a inițializat complet.");

    const lastCity = localStorage.getItem("lastCity") || "București";

    // Setează butonul activ la pornire
    document.querySelectorAll('.city-btn').forEach(btn => {
        if (btn.textContent === lastCity) btn.classList.add('active');
    });

    getWeather(lastCity);

    // Event pe tasta Enter
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.addEventListener("keypress", handleKeyPress);
});
