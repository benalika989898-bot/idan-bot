// Centralized date utilities for consistent timezone handling

/**
 * Convert a date to Israel timezone date string (YYYY-MM-DD)
 */
export const toIsraelDateString = (date: Date): string => {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
};

/**
 * Get current date in Israel timezone as YYYY-MM-DD
 */
export const getCurrentIsraelDateString = (): string => {
  return toIsraelDateString(new Date());
};

/**
 * Parse a date string as Israel timezone date
 */
export const parseIsraelDate = (dateString: string): Date => {
  if (!dateString) {
    return new Date(NaN);
  }

  const rawDate = dateString.trim();
  if (!rawDate) {
    return new Date(NaN);
  }

  // If a full ISO timestamp is provided, let the native parser handle it.
  if (rawDate.includes('T')) {
    return new Date(rawDate);
  }

  // Some callers may pass a date-time separated by a space instead of T.
  const normalizedDate = rawDate.split(' ')[0];

  // Resolve the correct Israel offset dynamically (handles DST: +02:00 winter, +03:00 summer)
  const tempDate = new Date(`${normalizedDate}T12:00:00Z`);
  if (Number.isNaN(tempDate.getTime())) {
    return new Date(NaN);
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour: 'numeric',
    hour12: false,
  });
  const israelHour = parseInt(formatter.format(tempDate), 10);
  const offsetHours = israelHour - tempDate.getUTCHours();
  const sign = offsetHours >= 0 ? '+' : '-';
  const abs = String(Math.abs(offsetHours)).padStart(2, '0');
  return new Date(`${normalizedDate}T00:00:00${sign}${abs}:00`);
};

/**
 * Get day of week for Israel timezone (0=Sunday, 6=Saturday)
 */
export const getIsraelDayOfWeek = (dateString: string): number => {
  return parseIsraelDate(dateString).getDay();
};

/**
 * Get current time in Israel timezone as minutes since midnight
 */
export const getCurrentIsraelTimeMinutes = (): number => {
  const now = new Date();
  // Use Intl.DateTimeFormat for more reliable timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  
  return hours * 60 + minutes;
};

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};
