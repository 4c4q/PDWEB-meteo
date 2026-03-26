const cityCoordinates = {
    "București": { lat: 44.4268, lon: 26.1025 },
    "Cluj-Napoca": { lat: 46.7712, lon: 23.6236 },
    "Timișoara": { lat: 45.7537, lon: 21.2257 },
    "Iași": { lat: 47.1585, lon: 27.6014 },
    "Constanța": { lat: 44.1598, lon: 28.6348 },
    "Brașov": { lat: 45.6528, lon: 25.6109 }
};

// Funcție principală - ia vremea live
async function getWeather(city) {
    hideError();
    
    const coords = cityCoordinates[city];
    if (!coords) {
        showError("Orașul nu este suportat momentan.");
        return;
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?` +
                    `latitude=${coords.lat}&longitude=${coords.lon}` +
                    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code` +
                    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
                    `&timezone=auto`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Eroare la server");

        const data = await response.json();

        updateCurrentWeather(data, city);
        updateForecast(data.daily);

        // Salvează ultimul oraș
        localStorage.setItem("lastCity", city);

    } catch (error) {
        console.error(error);
        showError("Nu am putut încărca datele meteo. Verifică conexiunea.");
    }
}

// Actualizează vremea curentă
function updateCurrentWeather(data, city) {
    const current = data.current;

    document.getElementById("cityName").textContent = city;
    document.getElementById("temperature").textContent = Math.round(current.temperature_2m) + "°C";
    document.getElementById("condition").textContent = getWeatherDescription(current.weather_code);
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = current.wind_speed_10m + " km/h";
    document.getElementById("feelsLike").textContent = Math.round(current.apparent_temperature) + "°C";

    // Iconiță meteo (folosim emoji pentru moment - poți schimba cu imagini mai târziu)
    document.getElementById("weatherIcon").textContent = getWeatherEmoji(current.weather_code);

    // Vizibilitate - Open-Meteo nu oferă direct, punem o valoare estimată
    document.getElementById("visibility").textContent = "10 km"; 
}

// Prognoza pe 5 zile
function updateForecast(daily) {
    const forecastGrid = document.getElementById("forecastGrid");
    if (!forecastGrid) return;

    let html = "";

    for (let i = 0; i < 5; i++) {
        const day = daily;
        const date = new Date(day.time[i]);
        
        html += `
            <div class="forecast-day">
                <div class="forecast-day-name">
                    ${date.toLocaleDateString('ro-RO', { weekday: 'short' })}
                </div>
                <div class="forecast-icon">${getWeatherEmoji(day.weather_code[i])}</div>
                <div class="forecast-temp">${Math.round(day.temperature_2m_max[i])}°</div>
                <div class="forecast-temp-min">${Math.round(day.temperature_2m_min[i])}°</div>
            </div>
        `;
    }

    forecastGrid.innerHTML = html;
}

// Dicționar simplu pentru descriere + emoji
function getWeatherDescription(code) {
    const descriptions = {
        0: "Cer senin",
        1: "Predominant senin",
        2: "Parțial noros",
        3: "Noros",
        45: "Ceață",
        48: "Ceață cu chiciură",
        51: "Burniță ușoară",
        61: "Ploaie ușoară",
        63: "Ploaie moderată",
        65: "Ploaie puternică",
        71: "Ninsoare ușoară",
        73: "Ninsoare moderată",
        75: "Ninsoare puternică",
        80: "Ploaie torențială",
        95: "Furtună"
    };
    return descriptions[code] || "Vreme variabilă";
}

function getWeatherEmoji(code) {
    const emojis = {
        0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
        45: "🌫️", 48: "🌫️",
        51: "🌧️", 61: "🌦️", 63: "🌧️", 65: "⛈️",
        71: "❄️", 73: "❄️", 75: "❄️",
        80: "🌧️", 95: "⛈️"
    };
    return emojis[code] || "☁️";
}

// Funcții de eroare și încărcare
function showError(msg) {
    const error = document.getElementById("errorMessage");
    error.textContent = msg;
    error.style.display = "block";
}

function hideError() {
    const error = document.getElementById("errorMessage");
    error.style.display = "none";
}

// Căutare după input
function searchCity() {
    const input = document.getElementById("searchInput").value.trim();
    if (!input) return;
    
    // Verificăm dacă orașul există în lista noastră
    if (cityCoordinates[input]) {
        getWeather(input);
    } else {
        showError("Orașul nu este suportat. Folosește unul din butoane sau adaugă-l în listă.");
    }
    
    document.getElementById("searchInput").value = "";
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        searchCity();
    }
}

// Selectare oraș din butoane
function selectCity(city) {
    // Eliminăm clasa active de la toate butoanele
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === city) btn.classList.add('active');
    });
    
    getWeather(city);
}

// Inițializare aplicație
document.addEventListener("DOMContentLoaded", () => {
    const lastCity = localStorage.getItem("lastCity") || "București";
    
    // Setăm butonul activ
    document.querySelectorAll('.city-btn').forEach(btn => {
        if (btn.textContent === lastCity) btn.classList.add('active');
    });

    getWeather(lastCity);

    // Event listeners
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.addEventListener("keypress", handleKeyPress);
});
