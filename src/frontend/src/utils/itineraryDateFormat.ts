/**
 * Formats a journey date range in the pattern "DD MMM YY (ddd) ~ DD MMM YY (ddd)"
 * Example: "18 Feb 26 (Wed) ~ 20 Feb 26 (Fri)"
 */
export function formatJourneyPeriod(startDate: bigint, endDate: bigint): string {
  const start = new Date(Number(startDate) / 1000000);
  const end = new Date(Number(endDate) / 1000000);

  const formatSingleDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    return `${day} ${month} ${year} (${weekday})`;
  };

  return `${formatSingleDate(start)} ~ ${formatSingleDate(end)}`;
}
