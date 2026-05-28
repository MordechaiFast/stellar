// (c) by Mordechai Fast

const radToDeg = a => a * (180 / Math.PI);
const degToRad = a => a * (Math.PI / 180);

/***********************************************************************
 * Calculate the Julian Day from the Gregorian date
 * @param {number} year - 4 digit year
 * @param {number} month - January = 1
 * @param {number} day  - 1 - 31
 * @returns {number} The Julian day corresponding to the date
 * 
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 62
 ***********************************************************************/
function calcJD(year, month, day) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year/100);
  const B = 2 - A + Math.floor(A/4);

  const JD = Math.floor(365.25*(year + 4716))
           + Math.floor(30.6001*(month+1))
           + day + B - 1524.5;
  return JD;
}

/***********************************************************************
 * Calculates the Declination, Right Ascension and Equation of Time
 * for a JulianDay.
 * @param {number} JulianDay
 * @returns {object} declination, rightAscension, equationOfTime in degrees
 * 
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 163-165, 185
 ***********************************************************************/
function SunPosition(JulianDay) {
  /**Centuries since the J2000.0 epoch */
  const T = (JulianDay - 2451545) / 36525;
	
  /**Mean obliquity of the ecliptic */
  const e0 = 23.0 + 26.0/60 + (
    21.448 - T*(46.8150 + T*(0.00059 - T*(0.001813)))
  )/3600;
	
  /**Longitude of the ascending node of the moon's mean orbit on
   * the ecliptic, measured from the mean equinox of date. */
  let omega = 125.04 - 1934.136 * T;
  omega = degToRad(omega);
	
  /**Corrected obliquity of the ecliptic */
  let epsilon = e0 + 0.00256 * Math.cos(omega);
  epsilon = degToRad(epsilon);
	
  /**Geometric Mean Longitude of the Sun */
  let L0 = 280.46646 + T * (36000.76983 + 0.0003032 * T);
	
  /**Geometric Mean Anomaly of the Sun */
  let M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  M = degToRad(M);
  const sinM = Math.sin(M);
  const sin2M = Math.sin(M+M);
  const sin3M = Math.sin(M+M+M);
  
  /**Equation of center for the sun */
  const C = sinM * (1.914602 - T * (0.004817 + 0.000014 * T))
          + sin2M * (0.019993 - 0.000101 * T)
          + sin3M * 0.000289;
	
  /**True longitude of the sun */
  const O = L0 + C;
	
  /**Apparent longitude of the sun */
  let lambda = O - 0.00569 - 0.00478 * Math.sin(omega);
  lambda = degToRad(lambda);
	
  /**Declination of the sun */
  const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
	
  /**Sun's right ascension */
  const alpha = Math.atan2(
    Math.cos(epsilon) * Math.sin(lambda),
    Math.cos(lambda)
  );
    
  /**Eccentricity of earth's orbit */
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  let y = Math.tan(epsilon / 2);
  y *= y;
  L0 = degToRad(L0);

  /**The difference between true solar time and mean */
  const equationOfTime = y *  Math.sin(L0 + L0)
                       - 2 * e * sinM 
                       + 4 * e * y * sinM * Math.cos(L0 + L0)
                       - 0.5 * y * y *  Math.sin(4 * L0)
                       - 1.25 * e * e * sin2M;

  return {
    declination: radToDeg(delta),
    rightAscension: radToDeg(alpha),
    equationOfTime: radToDeg(equationOfTime)
  };
}

/************************************************************************
 * Calculate the sidereal time of a given Julian Day.
 * @param {number} JulianDay - the Julian Day to calculate for.
 * @returns {number} the mean sidereal time in degrees
 *
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 87-88
 ************************************************************************/
function siderealTime(JulianDay) {
  /**Centuries since the J2000.0 epoch */
  const T = (JulianDay - 2451545) / 36525;
  
  let theta = 280.46061837
            + 360.98564736629 * (JulianDay - 2451545)
            + 0.000387933 * T * T
            - (T*T*T) / 38710000;

  while (theta < 0)
    theta += 360;
  while (theta >= 360)
    theta -= 360;
  return theta;
}

/************************************************************************
 * Calculate the mean stellar position of a given star, accounting for
 * precession and proper motion.
 * Not accurate for stars close to the poles or for long epochs.
 * @param {number} JulianDay - the Julian Day to calculate for.
 * @param {number} alpha0 - the right ascension of the star J2000.0
 * in degrees
 * @param {number} delta0 - the declination of the star J2000.0
 * in degrees
 * @param {number} pmRightAscension - the annual proper motion 
 * in right Ascension in degrees
 * @param {number} pmDeclination - the annual proper motion 
 * in declination in degrees
 * @returns {object} the current rightAscension and declination in degrees
 *
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 132
 ************************************************************************/
function meanStellarPosition(JulianDay, alpha0, delta0,
  pmRightAscension, pmDeclination) {
  /**Centuries since the J2000.0 epoch */
  const T = (JulianDay - 2451545) / 36525;
  const t = (JulianDay - 2451545) / 365.25;
  const m = (3.07496 + 0.00186 * T) /3600*15;
  const n = (1.33621 - 0.00057 * T) /3600*15;
  let deltaAlpha = m + n * Math.sin(degToRad(alpha0)) * Math.tan(degToRad(delta0));
  let deltaDelta = n * Math.cos(degToRad(alpha0));
  deltaAlpha += pmRightAscension;
  deltaDelta += pmDeclination;
  const rightAscension = alpha0 + t * deltaAlpha;
  const declination = delta0 + t * deltaDelta;
  return { rightAscension, declination };
}

/************************************************************************
 * Calculate the refraction correction for a given altitude
 * @param {number} h - the altitude in degrees above the horizon
 * @param {number} [P=1010] - the atmospheric pressure in millibars
 * (default 1010)
 * @param {number} [T=10] - the temperature in Celsius (default 10)
 * @returns {number} the refraction correction in degrees
 * 
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 106-107
 ************************************************************************/
function calcRefraction(h, P = 1010, T = 10) {
  if (T > 100) T -= 273; // Convert Kelvin to Celsius
  let R = 1.02 / Math.tan(degToRad(
    h + 10.3 / (h + 5.11)
  )) + .0019279;
  R *= (P / 1010) * (283 / (273 + T));
  return R / 60;  // Convert minutes to degrees
}

/************************************************************************
 * Calculate the local hour angle corresponding to the time when a
 * celestial body reaches a given altitude from the horizon
 * @param {number} phi - the geographic latitude of the observer north of
 * the equator in degrees
 * @param {number} h - the desired altitude of the celestial body in degrees
 * @param {number} delta - the declination of the celestial body, in degrees
 * north of the celestial equator
 * @returns {number} the local hour angle in degrees
 *
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 102
 ************************************************************************/
function calcHourAngle(phi, h, delta) {
  phi = degToRad(phi);
  h = degToRad(h);
  delta = degToRad(delta);
  const H = Math.acos(
    (Math.sin(h) - Math.sin(phi) * Math.sin(delta))
    / (Math.cos(phi) * Math.cos(delta))
  );
  return radToDeg(H);
}

/************************************************************************
 * Calculate the azimuth of a star from a given latitude at a given time of
 * day with a given declination.
 * @param {number} phi - the geographic latitude of the observer north of the
 * equator in degrees
 * @param {number} H - the local hour angle of the star in degrees
 * @param {number} delta - the declination of the star, in degrees north of the
 * celestial equator
 * @returns {number} the azimuth of the star in degrees clockwise from South
 *
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 93
 ************************************************************************/
function calcAzimuth(phi, H, delta) {
  phi = degToRad(phi);
  H = degToRad(H);
  delta = degToRad(delta);
  const A = Math.atan2(
    Math.sin(H), 
    Math.cos(H) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi)
  );
  return radToDeg(A);
}

/************************************************************************
 * Calculate the altitude of a star from a given latitude at a given
 * time of day with a given declination.
 * @param {number} phi - the geographic latitude of the observer north of
 * the equator in degrees
 * @param {number} H - the local hour angle of the star in degrees
 * @param {number} delta - the declination of the star, in degrees north of
 * the celestial equator
 * @returns {number} the altitude of the star in degrees above the horizon
 *
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 93
 ************************************************************************/
function calcAltitude(phi, H, delta) {
  phi = degToRad(phi);
  H = degToRad(H);
  delta = degToRad(delta);
  const h = Math.asin(
    Math.sin(phi) * Math.sin(delta)
    + Math.cos(phi) * Math.cos(delta) * Math.cos(H)
  );
  return radToDeg(h);
}

/************************************************************************
 * Calculate the hour angle of a celestial body at a given position
 * (azimuth and altitude) at a given latitude
 * @param {number} phi - the geographic latitude of the observer north of
 * the equator in degrees
 * @param {number} A - the azimuth of the celestial body in degrees
 * clockwise from South
 * @param {number} h - the altitude of the celestial body in degrees
 * above the horizon
 * @returns {number} the hour angle of the celestial body in degrees
 * 
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 94
 ************************************************************************/
function calcHourAngleOfPosition(phi, A, h) {
  phi = degToRad(phi);
  A = degToRad(A);
  h = degToRad(h);
  const H = Math.atan2(
    Math.sin(A), 
    Math.cos(A) * Math.sin(phi) + Math.tan(h) * Math.cos(phi)
  );  
  return radToDeg(H);
}

/************************************************************************
 * Calculate the declination of a celestial body at a given position
 * (azimuth and altitude) at a given latitude
 * @param {number} phi - the geographic latitude of the observer north of
 * the equator in degrees
 * @param {number} A - the azimuth of the celestial body in degrees
 * clockwise from South
 * @param {number} h - the altitude of the celestial body in degrees
 * above the horizon
 * @returns {number} the declination of the celestial body in degrees
 * north of the celestial equator
 * 
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 94
 ************************************************************************/
function calcDeclinationOfPosition(phi, A, h) {
  phi = degToRad(phi);
  A = degToRad(A);
  h = degToRad(h);
  const delta = Math.asin(
    Math.sin(phi) * Math.sin(h) - Math.cos(phi) * Math.cos(h) * Math.cos(A)
  );
  return radToDeg(delta);
}

/************************************************************************
 * Calculate the angular separation between two celestial bodies.
 * @param {number} alpha1 - the right ascension of the first body
 * in degrees
 * @param {number} delta1 - the declination of the first body
 * in degrees
 * @param {number} alpha2 - the right ascension of the second body
 * in degrees
 * @param {number} delta2 - the declination of the second body
 * in degrees
 * @returns {number} the angular seperation in degrees
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 109
 ************************************************************************/
function angularSeparation(alpha1, delta1, alpha2, delta2) {
  alpha1 = degToRad(alpha1);
  delta1 = degToRad(delta1);
  alpha2 = degToRad(alpha2);
  delta2 = degToRad(delta2);
  const d = Math.acos(
    Math.sin(delta1) * Math.sin(delta2)
    + Math.cos(delta1) * Math.cos(delta2) * Math.cos(alpha1 - alpha2)
  );
  return radToDeg(d);
}

/************************************************************************
 * Calculate the diameter of the smallest circle containing three 
 * celestial bodies.
 * @param {number} d1 - the first agular separation
 * @param {number} d2 - the second agular separation
 * @param {number} d3 - the third agular separation
 * @returns {number} the length of the diameter of the circle
 * Source: "Astronomical Algorithms" by Jean Meeus, 1998, p. 128
 ************************************************************************/
function minDiameter(d1, d2, d3) {
  let a, b, c;
  if (d1 >= d2 && d1 >= d3) {
    a = d1; b = d2; c = d3;
  } else if (d2 > d1 && d2 >= d3) {
    a = d2; b = d1; c = d3;
  } else {
    a = d3; b = d1; c = d2;
  }
  if (a > Math.sqrt(b**2 + c**2)) {
    return a;
  }
  const Delta = 2 * a * b * c / Math.sqrt(
    (a + b + c) * (a + b - c) * (b + c - a) * (a + c - b)
  )
  return Delta;
}

/**Source: Sky and Telescope ... */
function atmosphericExtinction(altitude, k=0.25) {
  // k = atmospheric extinction at zenith (magnitudes/air mass)
  const sin = Math.sin(degToRad(altitude));
  const airMass = ( altitude > 10 ? 1 / sin :
                    1 / (sin + 0.025 * Math.exp(-11 * sin)) );
  return k * airMass;
}

// Main functions

/** Returns the time when the sun reaches a given elevation below the horizon.
 * 
 *  evening is true for evening twilight, false for morning twilight */
function twilightTime(elevation, evening, date, location) {
  const JulianDay = calcJD(date.year, date.month, date.day); // Julian Day at midnight UTC
  let previous = 0;
  let current = JulianDay + .5 + location.long / 360; // Start at local noon
  while (Math.abs(previous - current) > 1/(86400 * 10)) {
    previous = current;
    let {declination, equationOfTime} = SunPosition(current);
    let hourAngle = calcHourAngle(location.lat, elevation, declination);
    if (isNaN(hourAngle))
      hourAngle = (location.lat + elevation - declination > 90 ? 0 : 180);
    hourAngle *= (evening ? 1 : -1);
    let time = 720 + 4 * (hourAngle + location.long - equationOfTime);
    current = JulianDay + time / 1440; // Convert minutes to days
  }
  return current;
}
    
function observedPosition(body, siderealTime, location) {
  const hourAngle = siderealTime - location.long - body.rightAscension;
  const azimuth = calcAzimuth(location.lat, hourAngle, body.declination);
  const altitude = calcAltitude(location.lat, hourAngle, body.declination);
  return { azimuth, altitude };
}

function isVisible(sunPos, starPos, magnitude, atmosphere={}) {
  if (starPos.altitude < 0)
    return false;

  const observedMag = magnitude + atmosphericExtinction(starPos.altitude, atmosphere.atmosphericExtinction);
  const m = observedMag - .25;  // Atmospheric extinction assumed by threshold formula
  const x = angularSeparation(starPos.azimuth, starPos.altitude,
                              sunPos.azimuth, sunPos.altitude);
  const threshold = (m <= 4.2 ? -2.47 - 1.23 * m : 15.62 - 6.61 * m)
                  - Math.max(0.0338 * (58 - x), 0);
  return sunPos.altitude <= threshold;
}
