"use strict";

/* planets.js

   Low-precision planetary positions for Mercury, Venus, Mars, Jupiter and Saturn.
   Implementation uses a constant table for mean orbital elements and a shared
   heliocentric solver to avoid repeating the same algorithm for each planet.

   Exports global function planetsForJD(JD) -> array of planets:
     { name, rightAscension, declination, mag }

   NOTE: This file depends on helper functions in astroCalc.js (degToRad, radToDeg).
*/

function julianCenturiesFromJ2000(JD) {
  return (JD - 2451545.0) / 36525.0;
}

function meanObliquityEcliptic(T) {
  // Mean obliquity in degrees
  // Source: Astromical Algorithms p. 147
  return 23 + 26/60 + (
    21.448 - T*(46.8150 + T*(0.00059 - T*(0.001813)))
  )/3600;
}

function normalizeDeg(d) {
  d %= 360;
  if (d < 0) d += 360;
  return d;
}

// Table of mean orbital element parameters for each body
// Fields: id,
//         L0 (deg, longitude at epoch J2000.0),
//         Lrate (deg per Julian century), a (AU), e, wBar (deg)
// Source: Astromical Algorithms p. 212-215 
const ORBITAL_PARAMS = [
  { id: 'Mercury', L0: 252.250906, Lrate: 149474.0722491, a: 0.387098310, e: 0.20563175, wBar:  77.456119 },
  { id: 'Venus',   L0: 181.979801, Lrate:  58519.2130302, a: 0.723329820, e: 0.00677192, wBar: 131.563703 },
  { id: 'Earth',   L0: 100.466457, Lrate:  36000.7698278, a: 1.000001018, e: 0.01670863, wBar: 102.937348 },
  { id: 'Mars',    L0: 355.433000, Lrate:  19141.6964471, a: 1.523679342, e: 0.09340065, wBar: 336.060234 },
  { id: 'Jupiter', L0:  34.351519, Lrate:   3036.3027748, a: 5.202603209, e: 0.04849793, wBar:  14.331207 },
  { id: 'Saturn',  L0:  50.077444, Lrate:   1223.5110686, a: 9.554909192, e: 0.05554814, wBar:  93.057237 }
];

// Compute heliocentric spherical coordinates for a single body (by id)
// Returns { lon, lat, r, L, M }
// Source: Astromical Algorithms p. 209-211
function heliocentric(T, id) {
  const p = ORBITAL_PARAMS.find(x => x.id === id);
  if (!p) throw new Error(`Unknown body id: ${id}`);
  const L = normalizeDeg(p.L0 + p.Lrate * T);
  const a = p.a;
  const e = p.e;
  const wBar = p.wBar;
  const M = normalizeDeg(L - wBar);
  // approximate eccentric anomaly (E) from M using a single-iteration correction
  const E = M + (180/Math.PI) * e * Math.sin(degToRad(M)) * (1 + e * Math.cos(degToRad(M)));
  const v = radToDeg(2 * Math.atan2(Math.sqrt(1+e) * Math.sin(degToRad(E)/2), Math.sqrt(1-e) * Math.cos(degToRad(E)/2)));
  const r = a * (1 - e*e) / (1 + e * Math.cos(degToRad(v)));
  const lon = normalizeDeg(v + wBar);
  const lat = 0; // small for planets in this simple model
  return { lon, lat, r, L, M };
}

// Source: Astromical Algorithms p. 223
function geocentricFromHeliocentric(helioPlanet, helioEarth) {
  // Convert heliocentric spherical -> rectangular and compute geocentric spherical
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
  const lat = radToDeg(Math.atan2(zg, Math.sqrt(xg*xg + yg*yg)));
  return { lon, lat, r };
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

// Source: Astronomical Algorithms p. 283-286, 
function approxMagnitude(planetName, r, Delta, R, helioLon=0, earthLon=0) {
  // r = planet-sun distance (AU), Delta = planet-earth distance (AU), R = earth-sun distance (AU ~1)
  // Compute phase angle i (Sun-Planet-Earth)
  let cosi = (r*r + Delta*Delta - R*R) / (2 * r * Delta);
  if (cosi > 1) cosi = 1;
  if (cosi < -1) cosi = -1;
  const i = radToDeg(Math.acos(cosi));

  const logTerm = 5 * Math.log10(r * Delta);
  switch (planetName) {
    case 'Mercury':
      return -0.42 + logTerm + 0.0380 * i - 0.000273 * i * i + 0.000002 * i * i * i;
    case 'Venus':
      return -4.47 + logTerm + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i * i * i;
    case 'Mars':
      return -1.52 + logTerm + 0.016 * i;
    case 'Jupiter':
      return -9.40 + logTerm + 0.005 * i;
    case 'Saturn':
      // Include a simple ring-tilt term. Compute approximate ring opening angle B (radians)
      // using Saturn's obliquity (~26.73 deg) and the longitude difference between
      // Saturn and Earth (heliocentric longitudes). This is an approximation but
      // gives a reasonable brightness dependence on ring tilt.
      const I = degToRad(26.73); // Saturn ring plane obliquity in radians
      const diff = degToRad(helioLon - earthLon);
      const B = Math.asin(Math.sin(I) * Math.cos(diff)); // radians
      const ringTerm = -2.60 * Math.sin(Math.abs(B)) + 1.25 * Math.sin(B)**2;
      return -8.88 + logTerm + 0.044 * i + ringTerm;
    default:
      return 2.0;
  }
}

function planetsForJD(JD) {
  const T = julianCenturiesFromJ2000(JD);
  const eps = meanObliquityEcliptic(T);

  // compute Earth's heliocentric position
  const earthHelio = heliocentric(T, 'Earth');

  const planets = [];
  for (const p of ORBITAL_PARAMS) {
    if (p.id === 'Earth') continue; // skip Earth in returned list
    const hel = heliocentric(T, p.id);
    const geo = geocentricFromHeliocentric(hel, earthHelio);
    const eq = eclipticSphericalToRADEC(geo.lon, geo.lat, geo.r, eps);
    const mag = approxMagnitude(p.id, hel.r, geo.r, earthHelio.r, hel.lon, earthHelio.lon);
    planets.push({ name: p.id, rightAscension: eq.rightAscension, declination: eq.declination, mag });
  }
  return planets;
}
