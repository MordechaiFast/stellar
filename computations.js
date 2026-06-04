"use strict"

const TWILIGHT_LIMIT = -8.5;

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

function degMin(decimal) {
  const degrees = Math.trunc(decimal);
  const decimalDegrees = Math.abs(decimal - degrees);
  const minutes = Math.round(decimalDegrees * 60);
  return `${degrees}°${String(minutes).padStart(2,'0')}'`;
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
  else if (brng >= 360)
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

function roundJulianDay(jd, seconds=1) {
  const step = seconds / 86400;
  return Math.round(jd / step) * step;
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

function todaysStars(jd, stars, maxDistance) {
  const starMeans = [];
  for (const star of stars) {
    const starToday = meanStellarPosition(
      jd, star.ra, star.dec, star.pmRA / 1000 / 3600, star.pmDec / 1000 / 3600);
    starMeans.push({
      name: star.he,
      des: star.des,
      rightAscension: starToday.rightAscension,
      declination: starToday.declination,
      mag: star.mag,
    });
  }
  starMeans.sort((a, b) => a.declination - b.declination);

  // Precompute nearby pair distances
  const nearby = new Map();
  for (let i = 0; i < starMeans.length; i++) {
    const a = starMeans[i];
    for (let j = i + 1; j < starMeans.length; j++) {
      const b = starMeans[j];
      if (b.declination - a.declination > maxDistance) {
        break;
      }
      const d = angularSeparation(
        a.rightAscension, a.declination,
        b.rightAscension, b.declination
      );
      if (d <= maxDistance) {
        if (!nearby.has(i)) nearby.set(i, []);
        if (!nearby.has(j)) nearby.set(j, []);
        nearby.get(i).push([j, d]);
        nearby.get(j).push([i, d]);
      }
    }
  }
  return { starMeans, nearby };
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
  const sunset = twilightTime(-5/6, settings.mornEve, date, location);
  const dusk = twilightTime(TWILIGHT_LIMIT, settings.mornEve, date, location);
  const { starMeans, nearby } = todaysStars(sunset, stars, settings.maxDistance);

  // Visibility search
  const visibleList = new Map();
  const visibleIndices = new Set();
  const closeGroups = [];
  const groupKeys = new Set();
 
  let time = roundJulianDay(sunset, settings.step);
  while (settings.mornEve ? time <= dusk : time >= dusk) {
    const sTime = siderealTime(time);
    const sunPos = observedPosition(SunPosition(time), sTime, location);

    for (let i = 0; i < starMeans.length; i++) {
      if (visibleIndices.has(i)) {
        continue;
      }

      const star = starMeans[i];
      const starPos = observedPosition(star, sTime, location);
      if (!isVisible(sunPos, starPos, star.mag, settings)) {
        continue;
      }
      visibleIndices.add(i);
      visibleList.set(star.des, {
        solarDepression: sunPos.altitude,
        time: JDtoDate(time),
        starPos,
        name: star.name,
      });

      // Find visible triples including this star
      const neighbors1 = nearby.get(i) || [];
      for (const n1 of neighbors1) {
        const j = n1[0];
        if (!visibleIndices.has(j)) {
          continue;
        }
        const neighbors2 = nearby.get(j) || [];
        for (const n2 of neighbors2) {
          const k = n2[0];
          if (k === i || !visibleIndices.has(k)) {
            continue;
          }
          const key = [i, j, k].sort().join(",");
          if (groupKeys.has(key)) {
            continue;
          }
          groupKeys.add(key);
          closeGroups.push({
            solarDepression: sunPos.altitude,
            time: JDtoDate(time),
            stars: [starMeans[i], starMeans[j], starMeans[k]],
          });
        }
      }
    }
    time += 1 / 86400 * (settings.mornEve ? settings.step : -settings.step);
  }
  return { visibleList, closeGroups };
}
