const cityCoordinates = {
    "București": { lat: 44.4268, lon: 26.1025 },
    "Cluj-Napoca": { lat: 46.7712, lon: 23.6236 },
    "Iași": { lat: 47.1585, lon: 27.6014 },
    "Constanța": { lat: 44.1598, lon: 28.6348 },
    "Timișoara": { lat: 45.7537, lon: 21.2257 },
    "Brașov": { lat: 45.6528, lon: 25.6109 },
    "Craiova": { lat: 44.3302, lon: 23.7949 },
    "Galați": { lat: 45.4353, lon: 28.0080 },
    "Ploiești": { lat: 44.9409, lon: 26.0211 },
    "Oradea": { lat: 47.0722, lon: 21.9212 },
    "Brăila": { lat: 45.2692, lon: 27.9575 },
    "Arad": { lat: 46.1667, lon: 21.3167 },
    "Pitești": { lat: 44.8565, lon: 24.8692 },
    "Sibiu": { lat: 45.7928, lon: 24.1521 },
    "Bacău": { lat: 46.5679, lon: 26.9135 },
    "Târgu Mureș": { lat: 46.5456, lon: 24.5625 },
    "Baia Mare": { lat: 47.6573, lon: 23.5681 },
    "Buzău": { lat: 45.1500, lon: 26.8333 },
    "Satu Mare": { lat: 47.7917, lon: 22.8853 },
    "Botoșani": { lat: 47.7486, lon: 26.6697 },
    "Suceava": { lat: 47.6514, lon: 26.2556 },
    "Râmnicu Vâlcea": { lat: 45.0997, lon: 24.3690 },
    "Drobeta-Turnu Severin": { lat: 44.6369, lon: 22.6597 },
    "Tulcea": { lat: 45.1794, lon: 28.8000 },
    "Alba Iulia": { lat: 46.0734, lon: 23.5747 },
    "Deva": { lat: 45.8833, lon: 22.9000 },
    "Hunedoara": { lat: 45.7667, lon: 22.9167 },
    "Reșița": { lat: 45.3000, lon: 21.8833 },
    "Slatina": { lat: 44.4333, lon: 24.3667 },
    "Călărași": { lat: 44.2000, lon: 27.3333 },
    "Giurgiu": { lat: 43.9000, lon: 25.9667 },
    "Alexandria": { lat: 43.9750, lon: 25.3333 },
    "Zalău": { lat: 47.2000, lon: 23.0500 },
    "Bistrița": { lat: 47.1333, lon: 24.5000 },
    "Vaslui": { lat: 46.6333, lon: 27.7333 },
    "Focșani": { lat: 45.7000, lon: 27.1833 },
    "Târgoviște": { lat: 44.9333, lon: 25.4667 },
    "Mangalia": { lat: 43.8167, lon: 28.5833 },
    "Medgidia": { lat: 44.2500, lon: 28.2667 },
    "Roman": { lat: 46.9167, lon: 26.9167 }
    // Poți adăuga și mai multe orașe mai mici dacă vrei
};

// Funcție principală - ia vremea live de la Open-Meteo
async function getWeather(city) {
    hideError();
    
    const coords = cityCoordinates[city];
    if (!coords) {
        showError(`Orașul "${city}" nu este disponibil momentan.`);
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

        localStorage.setItem("lastCity", city);

    } catch (error) {
        console.error(error);
        showError("Nu am putut încărca datele meteo. Verifică conexiunea la internet.");
    }
}

// Actualizează secțiunea cu vremea curentă
function updateCurrentWeather(data, city) {
    const current = data.current;

    document.getElementById("cityName").textContent = city;
    document.getElementById("temperature").textContent = Math.round(current.temperature_2m) + "°C";
    document.getElementById("condition").textContent = getWeatherDescription(current.weather_code);
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = Math.round(current.wind_speed_10m) + " km/h";
    document.getElementById("feelsLike").textContent = Math.round(current.apparent_temperature) + "°C";
    document.getElementById("visibility").textContent = "10 km";   // Open-Meteo nu oferă vizibilitate direct

    document.getElementById("weatherIcon").textContent = getWeatherEmoji(current.weather_code);
}

// Prognoza pe 5 zile
function updateForecast(daily) {
    const forecastGrid = document.getElementById("forecastGrid");
    if (!forecastGrid) return;

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

    forecastGrid.innerHTML = html;
}

// Descriere + emoji pentru codul meteo Open-Meteo
function getWeatherDescription(code) {
    const desc = {
        0: "Cer senin", 1: "Predominant senin", 2: "Parțial noros", 3: "Noros",
        45: "Ceață", 48: "Ceață cu chiciură",
        51: "Burniță ușoară", 61: "Ploaie ușoară", 63: "Ploaie moderată", 65: "Ploaie puternică",
        71: "Ninsoare ușoară", 73: "Ninsoare moderată", 75: "Ninsoare puternică",
        80: " averse de ploaie", 95: "Furtună"
    };
    return desc[code] || "Vreme variabilă";
}

function getWeatherEmoji(code) {
    const emoji = {
        0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
        45: "🌫️", 48: "🌫️",
        51: "🌧️", 61: "🌦️", 63: "🌧️", 65: "⛈️",
        71: "❄️", 73: "❄️", 75: "❄️",
        80: "🌧️", 95: "⛈️"
    };
    return emoji[code] || "☁️";
}

// Funcții helper
function showError(msg) {
    const error = document.getElementById("errorMessage");
    error.textContent = msg;
    error.style.display = "block";
}

function hideError() {
    const error = document.getElementById("errorMessage");
    error.style.display = "none";
}

// Căutare manuală
function searchCity() {
    const input = document.getElementById("searchInput").value.trim();
    if (!input) return;

    if (cityCoordinates[input]) {
        getWeather(input);
    } else {
        showError(`Orașul "${input}" nu este în listă. Folosește butoanele sau adaugă-l manual.`);
    }
    
    document.getElementById("searchInput").value = "";
}

function handleKeyPress(event) {
    if (event.key === "Enter") searchCity();
}

// Selectare oraș din butoane (activează și clasa active)
function selectCity(city) {
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === city) btn.classList.add('active');
    });
    getWeather(city);
}

// Inițializare
document.addEventListener("DOMContentLoaded", () => {
    const lastCity = localStorage.getItem("lastCity") || "București";

    // Setează butonul activ
    document.querySelectorAll('.city-btn').forEach(btn => {
        if (btn.textContent === lastCity) btn.classList.add('active');
    });

    getWeather(lastCity);

    // Event pe input
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.addEventListener("keypress", handleKeyPress);
});
