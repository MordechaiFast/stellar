const MIKDASH_LAT = 31.7780, MIKDASH_LON = 35.2353;
let currentCityData = null;
let currentTimeTimer = null;
let stars = [];

document.addEventListener('DOMContentLoaded', () => {
  initialize(loadCity(), loadSettings());

  document.getElementById('input-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await findCity();
    if (currentCityData) {
      displayCard(currentCityData);
    }
  });

  document.getElementById('coords-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await findLoc();
    if (currentCityData) {
      displayCard(currentCityData);
    }
  });

  document.getElementById('date').addEventListener('change', () => {
    if (currentCityData) {
      displayCard(currentCityData);
    }
  });

  document.getElementById('list-toggle').addEventListener('click', () => {
    const nextValue = !getCurrentSettings().showAllStars;
    setListToggle(nextValue);
    persistSettings();
    if (currentCityData) {
      displayCard(currentCityData);
    }
  });

  document.querySelectorAll('#settings input, #settings select').forEach((control) => {
    control.addEventListener('change', () => {
      persistSettings();
      if (currentCityData) {
        displayCard(currentCityData);
      }
    });
  });

  const currentLocationSection = document.getElementById('current-location');
  const currentLocationButton = document.getElementById('current-location-btn');

  if (!navigator.geolocation) {
    currentLocationSection.hidden = true;
  } else {
    currentLocationButton.addEventListener('click', () => {
      clearError();
      navigator.geolocation.getCurrentPosition((position) => {
        document.getElementById('lat').value = String(position.coords.latitude);
        document.getElementById('lon').value = String(position.coords.longitude);
        document.getElementById('coords-form').requestSubmit();
      }, (err) => {
        showError(err.message || 'Unable to retrieve current location.');
      }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )});
  }


  loadStars().catch((err) => {
    showError(err.message || String(err));
  });
});

function showError(msg) {
  document.getElementById('error').textContent = msg;
}

function clearError() {
  document.getElementById('error').textContent = '';
}

function initialize(city, settings) {
  document.getElementById('city').value = city;
  document.getElementById('date').valueAsDate = new Date(); // default to today
  document.getElementById('atmospheric-extinction').value = settings.atmosphericExtinction ?? 0.7;
  document.querySelector(`input[name="morn-eve"][value="${settings.mornEve ? 'evening' : 'morning'}"]`).checked = true;
  document.getElementById('max-distance').value = String(settings.maxDistance);
  setListToggle(settings.showAllStars);
}

async function loadStars() {
  const response = await fetch('stars.json');
  if (!response.ok) {
    throw new Error('Unable to load star catalog');
  }
  stars = await response.json();
  document.getElementById('input-form').dispatchEvent(new Event('submit'));
}

function updateCurrentTime(cityData) {
  document.getElementById('card-current-time').textContent = currentTimeStr(cityData.timezone);
}

function syncCurrentTime(cityData, dateStr) {
  if (currentTimeTimer !== null) {
    clearInterval(currentTimeTimer);
    currentTimeTimer = null;
  }
  
  if (dateStr !== currentDateInTimeZone(cityData.timezone)) {
    document.getElementById('card-current-time').textContent = '';
  } else {
    updateCurrentTime(cityData);
    currentTimeTimer = setInterval(() => {
      updateCurrentTime(cityData);
    }, 1000);
  }
}

function loadSettings() {
  try {
    const cache = localStorage.getItem('settings');
    if (cache)
      return JSON.parse(cache);
  } catch (err) { }
  return getCurrentSettings();
}

function getCurrentSettings() {
  return {
    mornEve: document.querySelector('input[name="morn-eve"]:checked').value === 'evening',
    atmosphericExtinction: Number(document.getElementById('atmospheric-extinction').value),
    maxDistance: Number(document.getElementById('max-distance').value),
    showAllStars: document.getElementById('list-toggle').dataset.mode !== 'compact',
    step: 5,
  };
}

function persistSettings() {
  try {
    localStorage.setItem('settings', JSON.stringify(getCurrentSettings()));
  } catch (err) {
    // localStorage may be unavailable; continue without caching
  }
}

function setListToggle(showAllStars) {
  const button = document.getElementById('list-toggle');
  button.dataset.mode = showAllStars ? 'full' : 'compact';
  button.textContent = showAllStars ? 'Fewer stars' : 'All stars';
}

function loadCity() {
  try {
    return localStorage.getItem('lastCity');
  } catch (err) {
    return '';
  }
}

function persistCity(city) {
  try {
    localStorage.setItem('lastCity', city);
  } catch (err) {
    // localStorage may be unavailable; continue without caching
  }
}

function loadCityData(city) {
  const cacheKey = `geoData_${city.toLowerCase()}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached != null) {
    console.log('Using cached data for:', city);
    const json = JSON.parse(cached);
    if (json) {
      console.log('Cached data:', json);
      return json;
    }
  }
  throw new Error();
}

function persistCityData(cityData, city) {
  if (!city) city = cityData.name;
  try {
    const cacheKey = `geoData_${city?.toLowerCase()}`;
    localStorage.setItem(cacheKey, JSON.stringify(cityData));
  } catch (err) {
    // localStorage may be unavailable; continue without caching
  }
}

async function findCity() {
  clearError();

  const city = document.getElementById('city').value.trim();
  if (city) {
    try {
      currentCityData = loadCityData(city);
      persistCity(city);
      persistCityData(currentCityData, currentCityData.name);
    } catch (err) {
      // Call API if not in local storage
      try {
        currentCityData = await getCityData(city);
        persistCity(city);
        persistCityData(currentCityData, currentCityData.name);
      } catch (err) {
        showError(err.message || String(err));
      }
    }
  } else {
    currentCityData = {
      name: '',
      lat: MIKDASH_LAT,
      lon: MIKDASH_LON,
      timezone: 'Asia/Jerusalem',
      country: 'IL',
      local_names: { he: "בית המקדש" }
    };
  }
}

async function findLoc() {
  clearError();

  const lat = Number(document.getElementById('lat').value);
  const lon = Number(document.getElementById('lon').value);
  try {
    currentCityData = await getLocData(lat, lon);
    persistCity(currentCityData.name);
    persistCityData(currentCityData, currentCityData.name);
  } catch (err) {
    currentCityData = {
      name: "Unknown location",
      lat, lon,
      timezone: formatOffset(Math.round(lon / 15) * 60),
    };
  }
}

function displayCard(cityData) {
  const dateStr = document.getElementById('date').value; // YYYY-MM-DD
  const settings = getCurrentSettings();

  document.getElementById('card-city').textContent = fullCityName(cityData);
  document.getElementById('card-coords').textContent =
   `${latStr(cityData.lat)} ${longStr(cityData.lon)}`;
  document.getElementById('card-date').textContent = fullDate(dateStr);
  document.getElementById('card-tz').textContent = timeZoneStr(cityData, dateStr);
  document.getElementById('card-hebrew-date').textContent = hebrewDate(new Date(dateStr));
  syncCurrentTime(cityData, dateStr);

  document.getElementById('sunset-label').textContent = settings.mornEve ? "Sunset" : "Sunrise";
  document.getElementById('card-sunset').textContent = elevationTimeStamp(dateStr, cityData, -50/60, settings.mornEve);

  const body = document.getElementById('visible-stars-body');
  body.innerHTML = '';

  const result = listVisibleStars(dateStr, cityData, stars, settings);
  let count = 0;  
  for (const [des, data] of result.visibleList) {
    count += 1;
    if (count == 7 && !settings.showAllStars) break;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${degMin(data.solarDepression)}</td>
      <td>${currentTimeStr(cityData.timezone, data.time)}</td>
      <td><span translate="no">${des}</span></td>
      <td>${degMin(data.starPos.azimuth + 180)} ${directionStr(data.starPos.azimuth + 180)}</td>
      <td>${degMin(data.starPos.altitude)}</td>
      <td>${data.name}</td>
    `;
    body.appendChild(row);
  }
  // List close stars
  const body2 = document.getElementById('close-stars-body');
  body2.innerHTML = '';
  count = 0;
  for (const group of result.closeGroups) {
    count += 1;
    if (count == 4 && !settings.showAllStars) break;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${degMin(group.solarDepression)}</td>
      <td>${currentTimeStr(cityData.timezone, group.time)}</td>
      <td><span translate="no">${group.stars[0].des}</span></td>
      <td><span translate="no">${group.stars[1].des}</span></td>
      <td><span translate="no">${group.stars[2].des}</span></td>
    `;
    body2.appendChild(row);
  }
}
