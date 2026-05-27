"use strict"

function fullCityName(cityData) {
  const { name, state, country } = cityData;
  if (country === 'IL') {
    return cityData.local_names.he;
  } else {
    return `${name}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;
  }
}

function getTimezoneName(timeZone, date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  return parts.find(p => p.type === "timeZoneName").value;
}

function getOffsetMinutes(timeZone, date) {
  const tz = getTimezoneName(timeZone, date);
  const match = tz.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;

  const h = parseInt(match[1], 10);
  const min = match[2] ? parseInt(match[2], 10) : 0;
  return h * 60 + Math.sign(h) * min;
}

function formatOffset(minutes) {  // usable as tz identifier for Intl.DateTimeFormat
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}

function longStr(longitude) {
  const degrees = Math.trunc(longitude);
  const decimalDegrees = Math.abs(longitude - degrees);
  const minutes = Math.trunc(decimalDegrees * 60);
  const seconds = Math.round((decimalDegrees * 60 - minutes) * 60);
  const dir = degrees >= 0 ? 'E' : 'W';
  return `${Math.abs(degrees)}°${String(minutes).padStart(2,'0')}'${String(seconds).padStart(2,'0')}"${dir}`;
}

function latStr(latitude) {
  const degrees = Math.trunc(latitude);
  const decimalDegrees = Math.abs(latitude - degrees);
  const minutes = Math.trunc(decimalDegrees * 60);
  const seconds = Math.round((decimalDegrees * 60 - minutes) * 60);
  const dir = degrees >= 0 ? 'N' : 'S';
  return `${Math.abs(degrees)}°${String(minutes).padStart(2,'0')}'${String(seconds).padStart(2,'0')}"${dir}`;
}

function directionStr(deg) {
  // 16-sector compass
  const sectors = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.floor(((deg + 11.25) % 360) / 22.5);
  return sectors[idx];
}

function d2r(deg) {
  return deg * Math.PI / 180;
}

function r2d(rad) {
  return rad * 180 / Math.PI;
}

function greatCircleDirection(lat1, lon1, lat2, lon2) {
  lat1 = d2r(lat1);
  lon1 = d2r(lon1);
  lat2 = d2r(lat2);
  lon2 = d2r(lon2);
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon);
  const x = Math.cos(lat1)*Math.tan(lat2) - Math.sin(lat1)*Math.cos(dLon);
  let brng = r2d(Math.atan2(y, x));
  if (brng < 0)
    brng += 360
  else if (brng > 360)
    brng -= 360;
  return `${directionStr(brng)} (${brng.toFixed(0)}°)`;
}

function fullDate(dateStr) {
  const date = new Date(dateStr);
  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(undefined, dateOptions);
}

function currentDateInTimeZone(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;
  return `${year}-${month}-${day}`;
}

function currentTimeStr(timeZone, date = new Date()) {
  return date.toLocaleTimeString(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function timeZoneStr(cityData, dateStr) {
  const date = new Date(dateStr);
  const timeOptions = {
    timeZone: cityData.timezone,
    timeZoneName: "long",
    hour12: false,
  };
  return date.toLocaleTimeString(undefined, timeOptions).match(/\s+(.+)/)[1]
    + ` (${formatOffset(getOffsetMinutes(cityData.timezone, date))})`;
}

function hebrewNumber(num) {
  const thousands = num - num % 1000;
	const hundreds = num - thousands - num % 100;
  const tens = num - thousands - hundreds - num % 10;
  const ones = num - thousands - hundreds - tens;
  const hundredsLetters = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
  const tensLetters = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const onesLetters = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  let letterString = '' + hundredsLetters[hundreds/100] + tensLetters[tens/10] + onesLetters[ones];
  if(letterString.length > 1)
    letterString = letterString.slice(0, letterString.length - 1) + '"' + letterString[letterString.length-1]
  else
    letterString += "'";
  if(letterString.endsWith('י"ה'))
  	letterString = letterString.slice(0, letterString.length - 3) + 'ט"ו'
  else if(letterString.endsWith('י"ו'))
    letterString = letterString.slice(0, letterString.length - 3) + 'ט"ז';
  return letterString;
}

function hebrewDate(date) {
  const dateStr = Intl.DateTimeFormat("he", {calendar: "hebrew"}).format(date);
  const parts = dateStr.split(" ");
  parts[0] = hebrewNumber(parts[0]);
  parts[2] = hebrewNumber(parts[2]);
  return `${parts[0]} ${parts[1]} ${parts[2]}`;
}


function JDtoDate(jd) {
  const unixEpochJD = 2440587.5;
  const msPerDay = 86400000;

  const ms = (jd - unixEpochJD) * msPerDay;
  return new Date(ms);
}

function twilightAngle(dateStr, locationData, decentAngle, evening=false) {
  const dateParts = dateStr.split("-");
  const date = {
    year: Number(dateParts[0]),
    month: Number(dateParts[1]),
    day: Number(dateParts[2])
  };
  const location = {
    lat: locationData.lat,
    long: -locationData.lon
  };
  const timeSetting = {
    timeZone: locationData.timezone,
    hour: "2-digit",
    minute: "numeric",
    second: "numeric",
  };
  const time = JDtoDate(twilightTime(-decentAngle, evening, date, location));
  return time.toLocaleTimeString("he", timeSetting);
}

function elevationTimeStamp(date, location, h, evening=true) {
  return twilightAngle(date, location, -h, evening);
}

function listVisibleStars(dateStr, locationData, stars, settings={}) {
  const dateParts = dateStr.split("-");
  const date = {
    year: Number(dateParts[0]),
    month: Number(dateParts[1]),
    day: Number(dateParts[2])
  };
  const location = {
    lat: locationData.lat,
    long: -locationData.lon
  };

  const dusk = twilightTime(settings.solarDepression, true, date, location);

  const visible = [];

  for (const star of stars) {
    if (!isVisible(star, dusk, location, {
      extinction: settings.atmosphericExtinction
    })) continue;

    const starToday = meanStar(star, dusk);

    const obs = observedPosition(
      starToday.rightAscension,
      starToday.declination,
      dusk,
      location
    );

    visible.push({
      name: star.he,
      des: star.des,
      azimuth: obs.azimuth,
      altitude: obs.altitude
    });
  }

  return visible;
}