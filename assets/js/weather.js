const API_KEY = "d60f6ce4b67ad37cf228a26d41357643";

let weatherDatabase = {};
// let forecastData = {}; // Dacă vrei să folosești un fisier weather.json pentru forecast

// Încarcă baza locală de date cu orașe (fallback)
async function loadDatabase() {
  try {
    const response = await fetch("database.json");
    weatherDatabase = await response.json();
  } catch (error) {
    console.error("Eroare la încărcarea database.json:", error);
  }
}

// (Opțional) Încarcă forecast static (dacă ai fișier weather.json)
// async function loadForecast() {
//   try {
//     const response = await fetch("weather.json");
//     forecastData = await response.json();
//   } catch (error) {
//     console.error("Eroare la încărcarea weather.json:", error);
//   }
// }

// Afișează loading indicator
function showLoading(show) {
  const loader = document.getElementById("loading");
  if (loader) loader.style.display = show ? "block" : "none";
}

// Afișează mesaj de eroare
function showError(msg) {
  const error = document.getElementById("errorMessage");
  error.textContent = msg;
  error.style.display = "block";
}

// Ascunde mesajul de eroare
function hideError() {
  const error = document.getElementById("errorMessage");
  error.style.display = "none";
}

// Actualizează UI cu datele meteo (structură similară cu API-ul OpenWeather)
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

  // Icon real OpenWeather sau fallback text/icon din database
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

// Obține vremea de la API live, dacă nu reușește folosește fallback local
async function getWeather(city) {
  showLoading(true);
  hideError();

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}&lang=ro`
    );

    if (!response.ok) throw new Error("Orașul nu a fost găsit");

    const data = await response.json();

    updateWeather(data);

    // Poți extinde aici să încarci forecast din API

    localStorage.setItem("lastCity", city);
  } catch (error) {
    console.warn("API eșuat, încerc fallback local:", error.message);

    // Fallback: caută în baza locală
    const key = city.toLowerCase();

    if (weatherDatabase[key]) {
      updateWeather(weatherDatabase[key]);
      localStorage.setItem("lastCity", city);
    } else {
      showError("Orașul nu a fost găsit în baza locală.");
    }
  } finally {
    showLoading(false);
  }
}

// Funcția apelată când utilizatorul caută un oraș
function searchCity() {
  const input = document.getElementById("searchInput").value.trim();
  if (!input) return;
  getWeather(input);
  document.getElementById("searchInput").value = "";
}

// Când apeși Enter în input
function handleKeyPress(event) {
  if (event.key === "Enter") {
    searchCity();
  }
}

// Inițializare la încărcare pagină
document.addEventListener("DOMContentLoaded", async () => {
  await loadDatabase();
  // await loadForecast(); // Dacă ai fișier forecast static

  const lastCity = localStorage.getItem("lastCity") || "Bucuresti";
  getWeather(lastCity);

  // Event listener pentru butonul de căutare (dacă ai)
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.addEventListener("click", searchCity);

  // Event listener pentru Enter în input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("keypress", handleKeyPress);
});
