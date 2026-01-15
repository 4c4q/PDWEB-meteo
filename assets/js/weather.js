// Weather database for Romanian cities
const weatherDatabase = "";

function updateWeather(data) {
    document.getElementById('cityName').textContent = data.city;
    document.getElementById('temperature').textContent = data.temp + '°C';
    document.getElementById('condition').textContent = data.condition;
    document.getElementById('weatherIcon').textContent = data.icon;
    document.getElementById('humidity').textContent = data.humidity + '%';
    document.getElementById('wind').textContent = data.wind + ' km/h';
    document.getElementById('visibility').textContent = data.visibility + ' km';
    document.getElementById('feelsLike').textContent = data.feelsLike + '°C';

    // Update forecast
    const forecastGrid = document.getElementById('forecastGrid');
    forecastGrid.innerHTML = data.forecast.map(day => `
        <div class="forecast-day">
            <div class="forecast-day-name">${day.day}</div>
            <div class="forecast-icon">${day.icon}</div>
            <div class="forecast-temp">${day.high}°</div>
            <div class="forecast-temp-min">${day.low}°</div>
        </div>
    `).join('');

    // Update active button
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === data.city.toLowerCase()) {
            btn.classList.add('active');
        }
    });

    hideError();
}

function selectCity(cityName) {
    const key = cityName.toLowerCase();
    const data = weatherDatabase[key];
    if (data) {
        updateWeather(data);
    }
}

function searchCity() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!input) return;

    const data = weatherDatabase[input];
    if (data) {
        updateWeather(data);
        document.getElementById('searchInput').value = '';
    } else {
        showError('Orașul "' + input + '" nu a fost găsit. Încearcă: București, Cluj-Napoca, Timișoara, Iași, Constanța sau Brașov.');
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        searchCity();
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// Initialize with București
selectCity('București');

// 