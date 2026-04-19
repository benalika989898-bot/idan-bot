import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/he';

dayjs.extend(relativeTime);
dayjs.locale('he');

export const formatRelativeTime = (dateString: string) => {
  if (!dateString) return '';
  const now = dayjs();
  const date = dayjs(dateString);
  const diffDays = now.startOf('day').diff(date.startOf('day'), 'day');

  if (diffDays === 1) return 'אתמול';
  if (diffDays === 2) return 'שלשום';
  return date.fromNow();
};
