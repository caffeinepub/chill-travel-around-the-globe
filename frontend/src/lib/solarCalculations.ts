/**
 * Solar calculation utilities for astronomical computations
 */

/**
 * Calculates the solar declination angle for a given day of the year.
 * 
 * Solar declination is the angle between the rays of the sun and the plane of the Earth's equator.
 * It varies throughout the year due to Earth's axial tilt.
 * 
 * @param day_of_year - Integer from 1 to 365 representing the day of the year
 * @returns Solar declination angle in degrees
 * 
 * Formula: δ = -23.45 * cos((2 * π / 365) * (day_of_year + 10))
 * where δ is the declination angle in degrees
 */
export function calculate_solar_declination(day_of_year: number): number {
  // Validate input
  if (day_of_year < 1 || day_of_year > 365) {
    throw new Error('Day of year must be between 1 and 365');
  }

  // Calculate solar declination using the formula
  const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (day_of_year + 10));
  
  return declination;
}

/**
 * Test cases for solar declination calculation
 */
export function runSolarDeclinationTests(): void {
  console.log('=== Solar Declination Test Cases ===\n');

  // Test case 1: Vernal Equinox (around March 20, day 80)
  const vernalEquinoxDay = 80;
  const vernalEquinoxDeclination = calculate_solar_declination(vernalEquinoxDay);
  console.log(`Vernal Equinox (Day ${vernalEquinoxDay}):`);
  console.log(`  Expected: ~0.0°`);
  console.log(`  Actual: ${vernalEquinoxDeclination.toFixed(2)}°`);
  console.log(`  Pass: ${Math.abs(vernalEquinoxDeclination) < 1.0 ? '✓' : '✗'}\n`);

  // Test case 2: Summer Solstice (around June 21, day 172)
  const summerSolsticeDay = 172;
  const summerSolsticeDeclination = calculate_solar_declination(summerSolsticeDay);
  console.log(`Summer Solstice (Day ${summerSolsticeDay}):`);
  console.log(`  Expected: ~+23.45°`);
  console.log(`  Actual: ${summerSolsticeDeclination.toFixed(2)}°`);
  console.log(`  Pass: ${Math.abs(summerSolsticeDeclination - 23.45) < 1.0 ? '✓' : '✗'}\n`);

  // Test case 3: Autumnal Equinox (around September 22, day 265)
  const autumnalEquinoxDay = 265;
  const autumnalEquinoxDeclination = calculate_solar_declination(autumnalEquinoxDay);
  console.log(`Autumnal Equinox (Day ${autumnalEquinoxDay}):`);
  console.log(`  Expected: ~0.0°`);
  console.log(`  Actual: ${autumnalEquinoxDeclination.toFixed(2)}°`);
  console.log(`  Pass: ${Math.abs(autumnalEquinoxDeclination) < 1.0 ? '✓' : '✗'}\n`);

  // Test case 4: Winter Solstice (around December 21, day 355)
  const winterSolsticeDay = 355;
  const winterSolsticeDeclination = calculate_solar_declination(winterSolsticeDay);
  console.log(`Winter Solstice (Day ${winterSolsticeDay}):`);
  console.log(`  Expected: ~-23.45°`);
  console.log(`  Actual: ${winterSolsticeDeclination.toFixed(2)}°`);
  console.log(`  Pass: ${Math.abs(winterSolsticeDeclination + 23.45) < 1.0 ? '✓' : '✗'}\n`);

  console.log('=== Test Summary ===');
  console.log('All test cases validate the solar declination formula.');
  console.log('The function correctly calculates declination angles for key astronomical events.\n');
}
