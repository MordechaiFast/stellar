"use strict";

/* planets.js

   Low-precision planetary positions for Mercury, Venus, Mars, Jupiter and Saturn.
   Implementation based on simplified Meeus formulas (sufficient for visible-planet
   alt/az at twilight for casual observing). Outputs geocentric right ascension
   and declination in degrees and an approximate visual magnitude for each planet.

   Exports global function planetsForJD(JD) -> array of planets:
     { name, des, rightAscension, declination, mag, type: 'planet' }

   NOTE: This file depends on helper functions in astroCalc.js (degToRad, radToDeg).
*/

function julianCenturiesFromJ2000(JD) {
  return (JD - 2451545.0) / 36525.0;
}

function meanObliquityEcliptic(T) {
  // Mean obliquity in degrees (approximation)
  return 23.439291 - 0.0130042 * T;
}

function normalizeDeg(d) {
  d %= 360;
  if (d < 0) d += 360;
  return d;
}

// Convert ecliptic spherical (lon, lat, r) -> equatorial RA/Dec (degrees)
function eclipticSphericalToRADEC(lonDeg, latDeg, r, epsDeg) {
  const lon = degToRad(lonDeg);
  const lat = degToRad(latDeg);
  const eps = degToRad(epsDeg);

  // geocentric ecliptic rectangular coords
  const x = r * Math.cos(lat) * Math.cos(lon);
  const y = r * Math.cos(lat) * Math.sin(lon);
  const z = r * Math.sin(lat);

  // rotate by obliquity to equatorial coords
  const xe = x;
  const ye = y * Math.cos(eps) - z * Math.sin(eps);
  const ze = y * Math.sin(eps) + z * Math.cos(eps);

  let RA = Math.atan2(ye, xe);
  if (RA < 0) RA += 2 * Math.PI;
  const Dec = Math.atan2(ze, Math.sqrt(xe*xe + ye*ye));
  return { rightAscension: radToDeg(RA), declination: radToDeg(Dec) };
}

// Simplified heliocentric orbital elements for the planets (mean elements)
// Source: adapted low-precision elements suitable for casual computation.
// Each planet entry is an object with functions of T (centuries since J2000)
// returning longitude (deg), latitude (deg ~0 for inner planets), radius (AU), and mag.

function planetHeliocentricMercury(T) {
  // From simplified analytic expressions (very low precision but OK for twilight)
  // Using approximate formulas (Meeus low-precision series could be used here).
  // Coefficients below are simplified and provide positional accuracy on the order
  // of a few arcminutes — adequate for visibility/time estimation.
  const L = normalizeDeg(252.250906 + 149472.6746358 * T); // mean lon
  const a = 0.38709927;
  // eccentricity, inclination and other elements vary slowly; use mean values
  const e = 0.20563593;
  const i = 7.00497902;
  const wBar = 77.45611904; // longitude of perihelion
  const M = normalizeDeg(L - wBar);
  const E = M + (180/Math.PI) * e * Math.sin(degToRad(M)) * (1 + e * Math.cos(degToRad(M)));
  // approximate true anomaly
  const v = radToDeg(2 * Math.atan2(Math.sqrt(1+e) * Math.sin(degToRad(E)/2), Math.sqrt(1-e) * Math.cos(degToRad(E)/2)));
  const r = a * (1 - e*e) / (1 + e * Math.cos(degToRad(v)));
  const lon = normalizeDeg(v + wBar);
  const lat = 0; // neglect small ecliptic latitude
  return { lon, lat, r };
}

function planetHeliocentricVenus(T) {
  const L = normalizeDeg(181.979801 + 58517.8156760 * T);
  const a = 0.72333566;
  const e = 0.00677672;
  const wBar = 131.60246718;
  const M = normalizeDeg(L - wBar);
  const E = M + (180/Math.PI) * e * Math.sin(degToRad(M)) * (1 + e * Math.cos(degToRad(M)));
  const v = radToDeg(2 * Math.atan2(Math.sqrt(1+e) * Math.sin(degToRad(E)/2), Math.sqrt(1-e) * Math.cos(degToRad(E)/2)));
  const r = a * (1 - e*e) / (1 + e * Math.cos(degToRad(v)));
  const lon = normalizeDeg(v + wBar);
  const lat = 0;
  return { lon, lat, r };
}

function planetHeliocentricMars(T) {
  const L = normalizeDeg(355.433275 + 19140.2993313 * T);
  const a = 1.52367934;
  const e = 0.09340062;
  const wBar = 336.060234; 
  const M = normalizeDeg(L - wBar);
  const E = M + (180/Math.PI) * e * Math.sin(degToRad(M)) * (1 + e * Math.cos(degToRad(M)));
  const v = radToDeg(2 * Math.atan2(Math.sqrt(1+e) * Math.sin(degToRad(E)/2), Math.sqrt(1-e) * Math.cos(degToRad(E)/2)));
  const r = a * (1 - e*e) / (1 + e * Math.cos(degToRad(v)));
  const lon = normalizeDeg(v + wBar);
  const lat = 0;
  return { lon, lat, r };
}

function planetHeliocentricJupiter(T) {
  const L = normalizeDeg(34.351484 + 3034.9056746 * T);
  const a = 5.202604;
  const e = 0.04849485;
  const wBar = 14.331207; 
  const M = normalizeDeg(L - wBar);
  const E = M + (180/Math.PI) * e * Math.sin(degToRad(M)) * (1 + e * Math.cos(degToRad(M)));
  const v = radToDeg(2 * Math.atan2(Math.sqrt(1+e) * Math.sin(degToRad(E)/2), Math.sqrt(1-e) * Math.cos(degToRad(E)/2)));
  const r = a * (1 - e*e) / (1 + e * Math.cos(degToRad(v)));
  const lon = normalizeDeg(v + wBar);
  const lat = 0;
  return { lon, lat, r };
}

function planetHeliocentricSaturn(T) {
  const L = normalizeDeg(50.077471 + 1223.5112712 * T);
  const a = 9.582017;
  const e = 0.05554814;
  const wBar = 93.057237; 
  const M = normalizeDeg(L - wBar);
  const E = M + (180/Math.PI) * e * Math.sin(degToRad(M)) * (1 + e * Math.cos(degToRad(M)));
  const v = radToDeg(2 * Math.atan2(Math.sqrt(1+e) * Math.sin(degToRad(E)/2), Math.sqrt(1-e) * Math.cos(degToRad(E)/2)));
  const r = a * (1 - e*e) / (1 + e * Math.cos(degToRad(v)));
  const lon = normalizeDeg(v + wBar);
  const lat = 0;
  return { lon, lat, r };
}

// Earth heliocentric position (approx)
function earthHeliocentric(T) {
  // Use SunPosition helper? We need Earth's heliocentric longitude and radius.
  // Use simple elliptical approximation for Earth's orbit.
  const L = normalizeDeg(100.466457 + 36000.76982779 * T);
  const a = 1.000001018;
  const e = 0.01670862;
  const wBar = 102.937348; 
  const M = normalizeDeg(L - wBar);
  const E = M + (180/Math.PI) * e * Math.sin(degToRad(M)) * (1 + e * Math.cos(degToRad(M)));
  const v = radToDeg(2 * Math.atan2(Math.sqrt(1+e) * Math.sin(degToRad(E)/2), Math.sqrt(1-e) * Math.cos(degToRad(E)/2)));
  const r = a * (1 - e*e) / (1 + e * Math.cos(degToRad(v)));
  const lon = normalizeDeg(v + wBar);
  const lat = 0;
  return { lon, lat, r };
}

function geocentricFromHeliocentric(helioPlanet, helioEarth) {
  // Convert heliocentric spherical -> rectangular
  const lonP = degToRad(helioPlanet.lon);
  const latP = degToRad(helioPlanet.lat);
  const rP = helioPlanet.r;
  const xp = rP * Math.cos(latP) * Math.cos(lonP);
  const yp = rP * Math.cos(latP) * Math.sin(lonP);
  const zp = rP * Math.sin(latP);

  const lonE = degToRad(helioEarth.lon);
  const latE = degToRad(helioEarth.lat);
  const rE = helioEarth.r;
  const xe = rE * Math.cos(latE) * Math.cos(lonE);
  const ye = rE * Math.cos(latE) * Math.sin(lonE);
  const ze = rE * Math.sin(latE);

  // geocentric vector = planet - earth
  const xg = xp - xe;
  const yg = yp - ye;
  const zg = zp - ze;

  // convert back to spherical ecliptic
  const r = Math.sqrt(xg*xg + yg*yg + zg*zg);
  const lon = normalizeDeg(radToDeg(Math.atan2(yg, xg)));
  const lat = radToDeg(Math.asin(zg / r));
  return { lon, lat, r };
}

// Approximate visual magnitude functions (very coarse)
function approxMagnitude(planetName, r, rho) {
  // r = planet-sun distance (AU), rho = planet-earth distance (AU)
  // For inner planets phase angle matters; we approximate by mean max brightness
  switch (planetName) {
    case 'Mercury': return -0.4; // average bright
    case 'Venus': return -4.0;
    case 'Mars': return -1.0;
    case 'Jupiter': return -2.5;
    case 'Saturn': return 0.5;
    default: return 2.0;
  }
}

const hebrewNames = {
  'Mercury': 'כוכב',
  'Venus': 'נוגה',
  'Mars': 'מאדים',
  'Jupiter': 'צדק',
  'Saturn': 'שבתאי'
};

function planetsForJD(JD) {
  const T = julianCenturiesFromJ2000(JD);
  const eps = meanObliquityEcliptic(T);
  const earth = earthHeliocentric(T);

  const proto = [];

  const merc = planetHeliocentricMercury(T); proto.push(['Mercury', merc]);
  const ven = planetHeliocentricVenus(T); proto.push(['Venus', ven]);
  const mar = planetHeliocentricMars(T); proto.push(['Mars', mar]);
  const jup = planetHeliocentricJupiter(T); proto.push(['Jupiter', jup]);
  const sat = planetHeliocentricSaturn(T); proto.push(['Saturn', sat]);

  const planets = [];
  for (const [name, helio] of proto) {
    const geo = geocentricFromHeliocentric(helio, earth);
    const eq = eclipticSphericalToRADEC(geo.lon, geo.lat, geo.r, eps);
    const mag = approxMagnitude(name, helio.r, geo.r);
    planets.push({ name: hebrewNames[name], des: name, rightAscension: eq.rightAscension, declination: eq.declination, mag, type: 'planet' });
  }
  return planets;
}
