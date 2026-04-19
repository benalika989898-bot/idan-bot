export const CHART_COLORS = ['#111827', '#2563EB', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6'];

export const formatCurrency = (amount: number) => `₪${amount.toLocaleString('he-IL')}`;

export const formatShortDate = (dateString: string) =>
  new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(dateString));

export const formatReadableDate = (dateString: string) =>
  new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(dateString));

const HEBREW_WEEKDAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_WEEKDAY_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export const formatWeekdayFromDate = (dateString: string) => {
  const date = new Date(dateString);
  return HEBREW_WEEKDAY_NAMES[date.getDay()] ?? '';
};

export const formatWeekdayDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const shortWeekday = HEBREW_WEEKDAY_SHORT[date.getDay()] ?? '';
  return `${shortWeekday} ${formatShortDate(dateString)}`;
};

export const formatReadableDateWithWeekday = (dateString: string) =>
  `${formatWeekdayFromDate(dateString)} · ${formatReadableDate(dateString)}`;

const WEEKDAY_LABELS: Record<string, string> = {
  sunday: 'ראשון',
  monday: 'שני',
  tuesday: 'שלישי',
  wednesday: 'רביעי',
  thursday: 'חמישי',
  friday: 'שישי',
  saturday: 'שבת',
  ראשון: 'ראשון',
  שני: 'שני',
  שלישי: 'שלישי',
  רביעי: 'רביעי',
  חמישי: 'חמישי',
  שישי: 'שישי',
  שבת: 'שבת',
};

export const formatWeekdayLabel = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return WEEKDAY_LABELS[normalized] ?? value;
};

export function sortByPrimaryValue<T extends { revenue: number; count?: number; quantity?: number }>(
  items: T[],
  limit?: number
) {
  const sorted = [...items].sort((a, b) => {
    const aPrimary = typeof a.count === 'number' ? a.count : a.quantity || 0;
    const bPrimary = typeof b.count === 'number' ? b.count : b.quantity || 0;

    if (bPrimary !== aPrimary) {
      return bPrimary - aPrimary;
    }

    return b.revenue - a.revenue;
  });

  return limit ? sorted.slice(0, limit) : sorted;
}
