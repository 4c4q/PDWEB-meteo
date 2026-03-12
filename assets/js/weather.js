const API_KEY = "d60f6ce4b67ad37cf228a26d41357643";

let weatherDatabase = {};

// Încarcă baza locală de date (fallback)
async function loadDatabase() {
  try {
    const response = await fetch("database.json");
    weatherDatabase = await response.json();
  } catch (error) {
    console.error("Eroare la încărcarea database.json:", error);
  }
}

// Loading și eroare
function showLoading(show) {
  const loader = document.getElementById("loading");
  if (loader) loader.style.display = show ? "block" : "none";
}

function showError(msg) {
  const error = document.getElementById("errorMessage");
  error.textContent = msg;
  error.style.display = "block";
}

function hideError() {
  const error = document.getElementById("errorMessage");
  error.style.display = "none";
}

// Afișează date meteo curente
function updateWeather(data) {
  document.getElementById("cityName").textContent = data.name || data.city;
  document.getElementById("temperature").textContent =
    Math.round(data.main?.temp ?? data.temp) + "°C";
  document.getElementById("condition").textContent =
    data.weather?.[0]?.description ?? data.condition;
  document.getElementById("humidity").textContent =
    (data.main?.humidity ?? data.humidity) + "%";
  document.getElementById("wind").textContent =
    (data.wind?.speed ?? data.wind) + " km/h";
  document.getElementById("pressure").textContent =
    (data.main?.pressure ?? data.pressure) + " hPa";
  document.getElementById("visibility").textContent =
    ((data.visibility ?? data.visibility) / 1000).toFixed(1) + " km";
  document.getElementById("feelsLike").textContent =
    Math.round(data.main?.feels_like ?? data.feelsLike) + "°C";

  // Icon meteo
  if (data.weather && data.weather[0]?.icon) {
    const iconCode = data.weather[0].icon;
    document.getElementById("weatherIcon").innerHTML =
      `<img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="icon">`;
  } else if (data.icon) {
    document.getElementById("weatherIcon").textContent = data.icon;
  } else {
    document.getElementById("weatherIcon").textContent = "";
  }

  hideError();
}

// Afișează forecast pe 5 zile (din API)
function updateForecast(forecastList) {
  const forecastGrid = document.getElementById("forecastGrid");
  if (!forecastGrid || !forecastList) return;

  // OpenWeather returnează forecast la fiecare 3h, selectăm doar ora 12:00
  const daily = forecastList.filter(item => item.dt_txt.includes("12:00:00")).slice(0,5);

  forecastGrid.innerHTML = daily
    .map(day => `
      <div class="forecast-day">
        <div class="forecast-day-name">${new Date(day.dt_txt).toLocaleDateString('ro-RO', { weekday: 'long' })}</div>
        <div class="forecast-icon"><img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="icon"></div>
        <div class="forecast-temp">${Math.round(day.main.temp_max)}°</div>
        <div class="forecast-temp-min">${Math.round(day.main.temp_min)}°</div>
      </div>
    `)
    .join("");
}

// Obține meteo curent + forecast live
async function getWeather(city) {
  showLoading(true);
  hideError();

  try {
    // Meteo curent
    const responseCurrent = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}&lang=ro`
    );
    if (!responseCurrent.ok) throw new Error("Orașul nu a fost găsit");

    const dataCurrent = await responseCurrent.json();
    updateWeather(dataCurrent);

    // Forecast 5 zile
    const responseForecast = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}&lang=ro`
    );
    if (!responseForecast.ok) throw new Error("Forecast indisponibil");
    const dataForecast = await responseForecast.json();
    updateForecast(dataForecast.list);

    localStorage.setItem("lastCity", city);

  } catch (error) {
    console.warn("API eșuat, folosim fallback local:", error.message);

    const key = city.toLowerCase();
    if (weatherDatabase[key]) {
      updateWeather(weatherDatabase[key]);
      updateForecast(weatherDatabase[key].forecast);
      localStorage.setItem("lastCity", city);
    } else {
      showError("Orașul nu a fost găsit în baza locală.");
    }
  } finally {
    showLoading(false);
  }
}

// Căutare oraș
function searchCity() {
  const input = document.getElementById("searchInput").value.trim();
  if (!input) return;
  getWeather(input);
  document.getElementById("searchInput").value = "";
}

// Enter în input
function handleKeyPress(event) {
  if (event.key === "Enter") {
    searchCity();
  }
}

// Init aplicație
document.addEventListener("DOMContentLoaded", async () => {
  await loadDatabase();

  const lastCity = localStorage.getItem("lastCity") || "București";
  getWeather(lastCity);

  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.addEventListener("click", searchCity);

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("keypress", handleKeyPress);
});
