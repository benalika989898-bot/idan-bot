import { parseIsraelDate } from '@/utils/dateUtils';

const JERUSALEM_TIME_ZONE = 'Asia/Jerusalem';
const isoDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: JERUSALEM_TIME_ZONE });
const shortMonthFormatter = new Intl.DateTimeFormat('he-IL', {
  month: 'short',
  timeZone: JERUSALEM_TIME_ZONE,
});
const fullDateFormatter = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: JERUSALEM_TIME_ZONE,
});

export const useDateFormat = () => {
  const formatDate = (dateString: string, includeMonthInToday = false) => {
    const date = parseIsraelDate(dateString);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Format dates for comparison (Israel timezone)
    const todayStr = isoDateFormatter.format(today);
    const tomorrowStr = isoDateFormatter.format(tomorrow);
    const inputDateStr = isoDateFormatter.format(date);

    if (inputDateStr === todayStr) {
      if (includeMonthInToday) {
        const day = date.getDate();
        const month = shortMonthFormatter.format(date);
        return `היום ${day} ב${month}`;
      }
      return 'היום';
    } else if (inputDateStr === tomorrowStr) {
      if (includeMonthInToday) {
        const day = date.getDate();
        const month = shortMonthFormatter.format(date);
        return `מחר ${day} ב${month}`;
      }
      return 'מחר';
    }

    return fullDateFormatter.format(date);
  };

  const formatTime = (startTime: string, endTime: string) =>
    `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;

  return { formatDate, formatTime };
};
