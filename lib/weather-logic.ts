/**
 * Refined rain detection logic for West African weather patterns (Cameroon, Ghana).
 * 
 * Reality in these regions:
 * - Rainy Day: Precipitation is usually > 8.5 mm.
 * - Temperature Effect: Rain causes a temperature drop compared to the previous day.
 * - Post-Rain Day: Precipitation may still be around 2mm (residual), but it's not "raining".
 *   In these cases, temperatures usually climb back up.
 * 
 * @param currentDay The weather data for the day being evaluated.
 * @param prevDay The weather data for the previous day (if available).
 * @returns boolean True if it's considered a rainy day.
 */
export const checkIsRainy = (currentDay: any, prevDay?: any): boolean => {
  const precip = currentDay.precipitation_sum || 0;
  const temp = currentDay.temperature_max || 0;
  
  // If we have previous day data, compare temperatures
  const prevTemp = prevDay ? (prevDay.temperature_max || 0) : temp;
  const tempDropped = temp < prevTemp;

  // 1. High precipitation threshold (always rain)
  if (precip > 8.5) return true;

  // 2. Moderate precipitation WITH a temperature drop (likely rain)
  if (precip > 3.0 && tempDropped) return true;

  // 3. Moderate precipitation BUT temperature is rising or high (likely residual/dry)
  // 4. Minor precipitation (like 2mm) is residual
  return false;
};
