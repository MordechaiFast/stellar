const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";
const REVERSE_URL = "http://api.openweathermap.org/geo/1.0/reverse";

async function getCityData(city) {
  const geoUrl = buildGeoQuery(city, getApiKey());
  const geoData = await getGeoData(geoUrl);
  if (!geoData || geoData.length === 0) {
    throw new Error('No data for this city.');
  }
  let { name, state, country, lat, lon } = geoData[0];
  let local_names = { he: geoData[0].local_names?.he };

  const weatherUrl = buildWeatherQuery(lat, lon, getApiKey());
  const weatherData = await getWeatherData(weatherUrl);
  let timezone = weatherData.timezone;

  // Hebresize data
  if (country === 'PS') {
    country = 'IL';
    timezone = 'Asia/Jerusalem';
  }

  return { name, state, country, local_names, lat, lon, timezone };
}

async function getLocData(lat, lon) {
  let name, state, country, local_names, timezone; 
  const geoUrl = buildNameQuery(lat, lon, getApiKey());
  const weatherUrl = buildWeatherQuery(lat, lon, getApiKey());
  
  const geoData = await getLocName(geoUrl);
  if (!geoData || geoData.length === 0) {
    name = "Unknown location";
  } else {
    name = geoData[0].name;
    state = geoData[0].state;
    country = geoData[0].country;
    local_names = { he: geoData[0].local_names?.he };
  }
  const weatherData = await getWeatherData(weatherUrl);
  timezone = weatherData.timezone;

  // Hebresize data
  if (country === 'PS') {
    country = 'IL';
    timezone = 'Asia/Jerusalem';
  }

  return { name, state, country, local_names, lat, lon, timezone };
}

function buildGeoQuery(city, apiKey) {
  const encoded = encodeURIComponent(city);
  return `${GEO_URL}?q=${encoded}&limit=1&appid=${apiKey}`;
}

async function getGeoData(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('Access denied. Check API key.');
    const txt = await resp.text();
    throw new Error(resp.statusText || txt || `HTTP ${resp.status}`);
  }
  const json = await resp.json();
  console.log('Geocode response:', json);
  return json;
}

function buildWeatherQuery(lat, lon, apiKey, fahrenheit=false) {
  const units = fahrenheit ? 'imperial' : 'metric';
  return `${ONECALL_URL}?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
}

async function getWeatherData(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('Access denied. Check API key.');
    const txt = await resp.text();
    throw new Error(resp.statusText || txt || `HTTP ${resp.status}`);
  }
  const json = await resp.json();
  console.log('Weather response:', json);
  return json;
}

function buildNameQuery(lat, lon, apiKey) {
    return `${REVERSE_URL}?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
}

async function getLocName(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('Access denied. Check API key.');
    const txt = await resp.text();
    throw new Error(resp.statusText || txt || `HTTP ${resp.status}`);
  }
  const json = await resp.json();
  console.log('Location name response:', json);
  return json;
}
