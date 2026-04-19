import dayjs from 'dayjs';
import 'dayjs/locale/he';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { updateAppointmentTime } from '@/services/crew/appointments';
import { updateBreakDate } from '@/services/crew/breakDates';
import {
  deleteScheduleSlot,
  updateDateScheduleForDate,
  updateScheduleSlot,
  type CrewDateSchedule,
  type CrewSchedule,
  type ScheduleMode,
} from '@/services/crew/schedules';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import {
  CalendarBody,
  CalendarContainer,
  CalendarHeader,
  type EventItem,
  type OnEventResponse,
  type PackedEvent,
  type SelectedEventType,
} from '@howljs/calendar-kit';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

dayjs.locale('he');

const _startHour = 6;
const _startMinute = _startHour * 60;
const _workingEndMinute = 23 * 60 + 45;
const _timeIntervalMinutes = 60;
const _pastDaysToShow = 3650;
const _calendarEndMinute =
  Math.ceil(_workingEndMinute / _timeIntervalMinutes) * _timeIntervalMinutes;

export type CalendarEvent = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'appointment' | 'break' | 'schedule';
  title?: string;
  appointmentId?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  appointmentTypeName?: string;
  appointmentTypeColor?: string;
  appointmentStatus?: string;
  cancellationReason?: string;
  breakId?: string;
  breakReason?: string;
  breakCrewMemberId?: string;
  scheduleId?: string;
  paymentType?: string;
};

const localeConfig = {
  he: {
    weekDayShort: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
    meridiem: { ante: 'AM', post: 'PM' },
    more: 'עוד',
  },
};

const toDateTime = (date: string, time: string) =>
  dayjs(`${date}T${time}`).format('YYYY-MM-DDTHH:mm:ss');


const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  const safeHours = Number.isFinite(hours) ? hours : 0;
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  return safeHours * 60 + safeMinutes;
};

const toMinutesFromDateTime = (dateTime?: string) => {
  if (!dateTime) return null;
  const value = dayjs(dateTime);
  return value.hour() * 60 + value.minute();
};

const toTimeLabel = (value: number) => {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}`;
};

const toCalendarWeekday = (dayOfWeek: number) => (dayOfWeek === 0 ? 7 : dayOfWeek);
const diffMinutes = (startTime: string, endTime: string) => {
  const start = dayjs(`2000-01-01T${startTime}`);
  const end = dayjs(`2000-01-01T${endTime}`);
  const diff = end.diff(start, 'minute');
  return diff > 0 ? diff : 0;
};

const formatTimeRange = (event: PackedEvent) => {
  const startValue = 'dateTime' in event.start ? event.start.dateTime : null;
  const endValue = 'dateTime' in event.end ? event.end.dateTime : null;

  if (!startValue || !endValue) {
    return '';
  }

  const startTime = dayjs(startValue).format('HH:mm');
  const endTime = dayjs(endValue).format('HH:mm');
  return `${startTime}-${endTime}`;
};

const getEventKey = (event: {
  type?: string;
  appointmentId?: string;
  breakId?: string;
  id?: string;
}) => {
  if (event.type === 'appointment' && event.appointmentId) {
    return `appointment-${event.appointmentId}`;
  }
  if (event.type === 'break' && event.breakId) {
    return `break-${event.breakId}`;
  }
  return `event-${event.id || 'unknown'}`;
};

export const GoogleCalendar = ({
  events = [],
  leftHeaderComponent,
  scheduleMode,
  weeklySchedule,
  dateSchedules,
  crewMemberId,
  canEditSchedule,
  isAdmin,
  minAppointmentTypeDuration,
  onDateChanged,
}: {
  events?: CalendarEvent[];
  leftHeaderComponent?: React.ReactElement | null;
  scheduleMode?: ScheduleMode;
  weeklySchedule?: CrewSchedule[];
  dateSchedules?: CrewDateSchedule[];
  crewMemberId?: string;
  canEditSchedule?: boolean;
  isAdmin?: boolean;
  minAppointmentTypeDuration?: number;
  onDateChanged?: (date: string) => void;
}) => {
    const queryClient = useQueryClient();
    const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | undefined>(undefined);
    const selectedScheduleId = useScheduleSelectionStore((state) => state.selectedScheduleId);
    const setSelectedScheduleId = useScheduleSelectionStore((state) => state.setSelectedScheduleId);
    const clearSelectedScheduleId = useScheduleSelectionStore(
      (state) => state.clearSelectedScheduleId
    );
    const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(events);
    const pendingUpdatesRef = useRef<
      Record<string, { date: string; startTime: string; endTime: string }>
    >({});
    const lastTapRef = useRef<{ time: number; date: string; minutes: number } | null>(null);
    const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedScheduleMeta, setSelectedScheduleMeta] = useState<{
      type: 'date' | 'weekly';
      date: string;
    } | null>(null);

    useEffect(() => {
      setLocalEvents((prev) => {
        if (!prev.length) return events;
        const prevByKey = new Map(prev.map((event) => [getEventKey(event), event]));
        const nextKeys = new Set(events.map((event) => getEventKey(event)));
        Object.keys(pendingUpdatesRef.current).forEach((key) => {
          if (!nextKeys.has(key)) {
            delete pendingUpdatesRef.current[key];
          }
        });
        const nextEvents = events.map((event) => {
          const key = getEventKey(event);
          const pending = pendingUpdatesRef.current[key];
          if (!pending) return event;

          const matchesServer =
            event.date === pending.date &&
            event.startTime === pending.startTime &&
            event.endTime === pending.endTime;
          if (matchesServer) {
            delete pendingUpdatesRef.current[key];
            return event;
          }

          return prevByKey.get(key) || event;
        });

        return nextEvents;
      });
    }, [events]);
    const calendarEvents: EventItem[] = localEvents.map((event) => {
      const eventEnd = dayjs(`${event.date}T${event.endTime}`);
      const isPastEvent = eventEnd.isBefore(dayjs());
      const isCancelled = event.appointmentStatus === 'cancelled';
      const baseColor = isCancelled
        ? '#fecaca'
        : event.type === 'break'
          ? '#fdba74'
          : event.type === 'schedule'
            ? '#e2e8f0'
            : event.appointmentTypeColor || '#93c5fd';
      const color = isPastEvent ? `${baseColor}60` : baseColor;
      const titleColor = isCancelled
        ? isPastEvent
          ? '#b91c1c80'
          : '#b91c1c'
        : isPastEvent
          ? '#94a3b8'
          : '#0f172a';
      return {
        id: event.id,
        title: event.title || (event.type === 'break' ? 'הפסקה' : 'תור'),
        start: { dateTime: toDateTime(event.date, event.startTime) },
        end: { dateTime: toDateTime(event.date, event.endTime) },
        color,
        titleColor,
        type: event.type,
        appointmentId: event.appointmentId,
        appointmentTypeName: event.appointmentTypeName,
        appointmentStatus: event.appointmentStatus,
        cancellationReason: event.cancellationReason,
        customerName: event.customerName,
        customerPhone: event.customerPhone,
        customerId: event.customerId,
        breakId: event.breakId,
        breakReason: event.breakReason,
        breakCrewMemberId: event.breakCrewMemberId,
        scheduleId: event.scheduleId,
        paymentType: event.paymentType,
      };
    });

    const workingHoursBackground = (() => {
      const activeColor = '#e2e8f0';
      const pastColumnColor = '#f3f4f6';
      const today = dayjs().format('YYYY-MM-DD');
      const pastDays = 90;

      type BgEntry = {
        start: number;
        end: number;
        backgroundColor: string;
        enableBackgroundInteraction: boolean;
      };

      const fullDayPastEntry: BgEntry = {
        start: _startMinute,
        end: _calendarEndMinute,
        backgroundColor: pastColumnColor,
        enableBackgroundInteraction: true,
      };

      const addPastDayOverlays = (grouped: Record<string, BgEntry[]>) => {
        for (let i = 1; i <= pastDays; i += 1) {
          const dateStr = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
          grouped[dateStr] = [fullDayPastEntry];
        }
      };

      const bgEntry = (start: number, end: number): BgEntry => ({
        start,
        end,
        backgroundColor: activeColor,
        enableBackgroundInteraction: true,
      });

      const fallback = [bgEntry(_startMinute, _workingEndMinute)];

      // Use schedule mode to decide primary source, then fall through
      if (scheduleMode === 'static' && weeklySchedule && weeklySchedule.length > 0) {
        const grouped: Record<string, BgEntry[]> = {};
        weeklySchedule.forEach((slot) => {
          const start = toMinutes(slot.start_time);
          const end = toMinutes(slot.end_time);
          if (end <= start) return;

          const key = String(toCalendarWeekday(slot.day_of_week));
          if (!grouped[key]) {
            grouped[key] = [];
          }
          grouped[key].push(bgEntry(start, end));
        });

        // Overlay date-specific schedules on top of weekly ones
        if (dateSchedules && dateSchedules.length > 0) {
          dateSchedules.forEach((slot) => {
            const start = toMinutes(slot.start_time);
            const end = toMinutes(slot.end_time);
            if (end <= start) return;

            const key = slot.schedule_date;
            if (key < today) return;
            if (!grouped[key]) {
              grouped[key] = [];
            }
            grouped[key].push(bgEntry(start, end));
          });
        }

        // Past dates: full-column gray overrides the weekday entries
        addPastDayOverlays(grouped);

        return grouped;
      }

      if (dateSchedules && dateSchedules.length > 0) {
        const grouped: Record<string, BgEntry[]> = {};
        addPastDayOverlays(grouped);
        dateSchedules.forEach((slot) => {
          const start = toMinutes(slot.start_time);
          const end = toMinutes(slot.end_time);
          if (end <= start) return;

          const key = slot.schedule_date;
          if (key < today) return;
          if (!grouped[key]) {
            grouped[key] = [];
          }
          grouped[key].push(bgEntry(start, end));
        });

        return Object.keys(grouped).length > 0 ? grouped : {};
      }

      if (scheduleMode === 'dynamic') {
        const grouped: Record<string, BgEntry[]> = {};
        addPastDayOverlays(grouped);
        return grouped;
      }

      return fallback;
    })();

    const renderEvent = (event: PackedEvent) => {
      if (event.type === 'schedule') {
        return null;
      }
      const duration = event._internal?.duration ?? 0;
      const titleColor = event.titleColor || '#0f172a';
      const timeLabel = formatTimeRange(event);
      const isTicket = event.paymentType === 'ticket';
      const baseColor = event.color || '#93c5fd';

      const Wrapper = isTicket ? LinearGradient : View;
      const gradientProps = isTicket
        ? {
            colors: [baseColor, '#c4b5fd'] as [string, string],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 1 },
          }
        : {};

      if (duration < 12) {
        const shortLabel = event.title || timeLabel || '';
        return (
          <Wrapper
            {...gradientProps}
            style={[{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }, styles.unmirroredContent]}>
            <Text
              className="text-center text-[8px] font-bold leading-[9px]"
              style={{ color: titleColor }}
              numberOfLines={1}>
              {shortLabel}
            </Text>
          </Wrapper>
        );
      }

      if (duration < 25) {
        const shortLabel = event.title || timeLabel || '';
        return (
          <Wrapper {...gradientProps} style={styles.eventContentTight}>
            <Text
              style={[styles.eventTitle, { color: titleColor }]}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={2}>
              {shortLabel}
            </Text>
          </Wrapper>
        );
      }

      return (
        <Wrapper {...gradientProps} style={styles.eventContent}>
          <Text
            style={[styles.eventTitle, { color: titleColor }]}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={3}>
            {event.title}
          </Text>
          {timeLabel ? (
            <Text style={[styles.eventTime, { color: titleColor }]} numberOfLines={1}>
              {timeLabel}
            </Text>
          ) : null}
        </Wrapper>
      );
    };

    const renderHour = ({ hourStr, style }: { hourStr: string; minutes: number; style: any }) => {
      const flattened = StyleSheet.flatten(style) || {};
      const { top, ...rest } = flattened;
      return <Text style={[rest, styles.hourLabel, styles.unmirroredContent]}>{hourStr}</Text>;
    };

    const renderDayItem = ({ dateUnix }: { dateUnix: number }) => {
      const date = dayjs(dateUnix);
      const weekday = localeConfig.he.weekDayShort[date.day()] || '';

      return (
        <View style={[styles.dayItem, styles.unmirroredContent]}>
          <Text style={styles.dayName}>{weekday}</Text>
          <View style={styles.dayNumberCircle}>
            <Text style={styles.dayNumber}>{date.format('D')}</Text>
          </View>
        </View>
      );
    };

    const mirroredLeftHeaderComponent = (() => {
      if (!leftHeaderComponent) {
        return undefined;
      }

      return (
        <View style={[styles.leftHeaderSlot, styles.unmirroredContent]}>{leftHeaderComponent}</View>
      );
    })();

    const dragStepMinutes = (() => {
      if (minAppointmentTypeDuration && minAppointmentTypeDuration > 0) {
        return minAppointmentTypeDuration;
      }
      const appointmentDurations = localEvents
        .filter((event) => event.type === 'appointment')
        .map((event) => diffMinutes(event.startTime, event.endTime))
        .filter((value) => value > 0);
      if (appointmentDurations.length === 0) return 20;
      return Math.min(...appointmentDurations);
    })();

    const handlePressEvent = (event: {
      appointmentId?: string;
      appointmentTypeName?: string;
      appointmentStatus?: string;
      cancellationReason?: string;
      breakCrewMemberId?: string;
      breakId?: string;
      breakReason?: string;
      customerName?: string;
      customerPhone?: string;
      customerId?: string;
      end?: { dateTime?: string };
      start?: { dateTime?: string };
      type?: string;
      scheduleId?: string;
    }) => {
      if (event.type === 'appointment' && event.appointmentId) {
        router.push({
          pathname: '/(crew)/(tabs)/dashboard/[appointment-id]',
          params: {
            'appointment-id': event.appointmentId,
            appointmentTypeName: event.appointmentTypeName,
            customerName: event.customerName,
            customerPhone: event.customerPhone,
            customerId: event.customerId,
            appointmentStatus: event.appointmentStatus,
            cancellationReason: event.cancellationReason,
            appointmentDate: event.start?.dateTime
              ? dayjs(event.start.dateTime).format('YYYY-MM-DD')
              : undefined,
            startTime: event.start?.dateTime ? dayjs(event.start.dateTime).format('HH:mm') : undefined,
            endTime: event.end?.dateTime ? dayjs(event.end.dateTime).format('HH:mm') : undefined,
          },
        });
        return;
      }

      if (event.type === 'break' && event.breakId) {
        router.push({
          pathname: '/(crew)/(tabs)/dashboard/break/[break-id]',
          params: {
            'break-id': event.breakId,
            crewMemberId: event.breakCrewMemberId,
            reason: event.breakReason,
            startTime: event.start?.dateTime ? dayjs(event.start.dateTime).format('HH:mm') : undefined,
            endTime: event.end?.dateTime ? dayjs(event.end.dateTime).format('HH:mm') : undefined,
            date: event.start?.dateTime
              ? dayjs(event.start.dateTime).format('YYYY-MM-DD')
              : undefined,
          },
        });
        return;
      }

      if (event.type === 'schedule') {
        return;
      }
    };

    const formatScheduleTime = (dateTime?: string) =>
      dateTime ? dayjs(dateTime).format('HH:mm:ss') : null;

    const getScheduleDate = (dateTime?: string, date?: string) =>
      dateTime ? dayjs(dateTime).format('YYYY-MM-DD') : date || null;

    const getScheduleWindowsForDate = (date: string) => {
      const windows: { start: number; end: number }[] = [];

      if (dateSchedules && dateSchedules.length > 0) {
        dateSchedules.forEach((slot) => {
          if (slot.schedule_date !== date || !slot.is_active) return;
          const start = toMinutes(slot.start_time);
          const end = toMinutes(slot.end_time);
          if (end <= start) return;
          windows.push({ start, end });
        });
      }

      if (windows.length > 0) return windows;

      if (scheduleMode !== 'dynamic' && weeklySchedule && weeklySchedule.length > 0) {
        const targetDay = dayjs(date).day();
        const weekday = toCalendarWeekday(targetDay);
        weeklySchedule.forEach((slot) => {
          if (slot.day_of_week !== weekday) return;
          const start = toMinutes(slot.start_time);
          const end = toMinutes(slot.end_time);
          if (end <= start) return;
          windows.push({ start, end });
        });
      }

      if (windows.length > 0) return windows;

      return [{ start: _startMinute, end: _workingEndMinute }];
    };

    const updateScheduleForDate = async (
      date: string,
      scheduleId: string | null,
      startTime: string,
      endTime: string
    ) => {
      if (!crewMemberId) return;
      if (dayjs(date).isBefore(dayjs().startOf('day'))) {
        toast.error('לא ניתן לערוך שעות בתאריך שעבר');
        return;
      }
      const existing = (dateSchedules || []).filter(
        (schedule) => schedule.schedule_date === date && schedule.is_active
      );

      const updated = existing.map((schedule) =>
        schedule.id === scheduleId
          ? { ...schedule, start_time: startTime, end_time: endTime }
          : schedule
      );

      const hasMatch = existing.some((schedule) => schedule.id === scheduleId);
      const nextSchedule = hasMatch
        ? updated
        : [
            ...updated,
            {
              id: `temp-${Date.now()}`,
              crew_member_id: crewMemberId,
              schedule_date: date,
              start_time: startTime,
              end_time: endTime,
              is_active: true,
            },
          ];

      const payload = nextSchedule.map((schedule) => ({
        crew_member_id: crewMemberId,
        schedule_date: date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: true,
      }));

      if (scheduleId) {
        setLocalEvents((prev) =>
          prev.map((item) =>
            item.type === 'schedule' && item.scheduleId === scheduleId
              ? { ...item, date, startTime, endTime }
              : item
          )
        );
      }

      queryClient.setQueriesData(
        { queryKey: ['crew-date-schedule'], exact: false },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            const filtered = oldData.filter((item) => item?.schedule_date !== date);
            return [...filtered, ...nextSchedule];
          }
          if (Array.isArray(oldData?.data)) {
            const filtered = oldData.data.filter((item: any) => item?.schedule_date !== date);
            return { ...oldData, data: [...filtered, ...nextSchedule] };
          }
          return oldData;
        }
      );
      const { error } = await updateDateScheduleForDate(crewMemberId, date, payload);
      if (error) {
        toast.error('שמירת שעות נכשלה');
        queryClient.invalidateQueries({ queryKey: ['crew-date-schedule'], exact: false });
      } else {
        toast.success('שעות עודכנו');
      }
    };

    const deleteWeeklyScheduleSlot = async (scheduleId: string) => {
      const { error } = await deleteScheduleSlot(scheduleId);
      if (error) {
        toast.error('מחיקת שעות נכשלה');
        queryClient.invalidateQueries({ queryKey: ['crew-schedule'], exact: false });
      } else {
        toast.success('שעות נמחקו');
        queryClient.invalidateQueries({ queryKey: ['crew-schedule'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
      }
    };

    const clearSelectedSchedule = () => {
      setSelectedEvent(undefined);
      clearSelectedScheduleId();
      setSelectedScheduleMeta(null);
    };

    const deleteScheduleForDate = async (date: string, scheduleId: string) => {
      if (!crewMemberId) return;
      if (dayjs(date).isBefore(dayjs().startOf('day'))) {
        toast.error('לא ניתן לערוך שעות בתאריך שעבר');
        return;
      }
      const existing = (dateSchedules || []).filter(
        (schedule) => schedule.schedule_date === date && schedule.is_active
      );
      const remaining = existing.filter((schedule) => schedule.id !== scheduleId);
      const payload = remaining.map((schedule) => ({
        crew_member_id: crewMemberId,
        schedule_date: date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: true,
      }));

      queryClient.setQueriesData(
        { queryKey: ['crew-date-schedule'], exact: false },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            const filtered = oldData.filter((item) => item?.schedule_date !== date);
            return [...filtered, ...remaining];
          }
          if (Array.isArray(oldData?.data)) {
            const filtered = oldData.data.filter((item: any) => item?.schedule_date !== date);
            return { ...oldData, data: [...filtered, ...remaining] };
          }
          return oldData;
        }
      );

      const { error } = await updateDateScheduleForDate(crewMemberId, date, payload);
      if (error) {
        toast.error('מחיקת שעות נכשלה');
        queryClient.invalidateQueries({ queryKey: ['crew-date-schedule'], exact: false });
      } else {
        toast.success('שעות נמחקו');
      }
    };

    const confirmScheduleDelete = () =>
      new Promise<boolean>((resolve) => {
        Alert.alert('מחיקת שעות', 'למחוק את בלוק השעות הזה?', [
          { text: 'ביטול', style: 'cancel', onPress: () => resolve(false) },
          { text: 'מחק', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });

    const handlePressBackgroundAction = (props: { date?: string; dateTime?: string }) => {
      if (!canEditSchedule) return;
      if (selectedScheduleId && selectedEvent?.type === 'schedule') {
        clearSelectedSchedule();
        return;
      }
      const selectedDateTime = props.dateTime || undefined;
      const selectedMinutes = toMinutesFromDateTime(selectedDateTime || undefined);
      const pressedTime =
        selectedMinutes !== null && selectedMinutes !== undefined
          ? toTimeLabel(Math.floor(selectedMinutes / 60) * 60)
          : undefined;
      const selectedDate = selectedDateTime
        ? dayjs(selectedDateTime).format('YYYY-MM-DD')
        : props.date;
      if (!selectedDate) return;
      const isPastDate = dayjs(selectedDate).isBefore(dayjs().startOf('day'));
      if (isPastDate && !isAdmin) {
        return;
      }

      if (isPastDate && isAdmin) {
        router.push({
          pathname: '/(modal)/actions/calendar-book-appointment',
          params: {
            prefillDate: selectedDate,
            crewMemberId,
            prefillTime: pressedTime,
          },
        });
        return;
      }

      const scheduleWindows =
        selectedMinutes !== null ? getScheduleWindowsForDate(selectedDate) : [];
      const hasDateSchedule = (dateSchedules || []).some(
        (slot) => slot.schedule_date === selectedDate && slot.is_active
      );
      const weekday = toCalendarWeekday(dayjs(selectedDate).day());
      const hasWeeklySchedule =
        scheduleMode !== 'dynamic' &&
        (weeklySchedule || []).some((slot) => slot.day_of_week === weekday);
      const hasExplicitSchedule = hasDateSchedule || hasWeeklySchedule;
      const activeWindow =
        selectedMinutes !== null
          ? scheduleWindows.find(
              (window) => selectedMinutes >= window.start && selectedMinutes < window.end
            )
          : null;
      const dayEvents =
        activeWindow && selectedMinutes !== null
          ? localEvents
              .filter((event) => event.date === selectedDate && event.type !== 'schedule')
              .map((event) => ({
                start: toMinutes(event.startTime),
                end: toMinutes(event.endTime),
              }))
              .filter(
                (event) =>
                  event.end > event.start &&
                  event.end > activeWindow.start &&
                  event.start < activeWindow.end
              )
              .sort((a, b) => a.start - b.start)
          : [];

      let slotStartTime: string | undefined;
      let slotEndTime: string | undefined;
      if (activeWindow && selectedMinutes !== null) {
        let startBoundary = activeWindow.start;
        let endBoundary = activeWindow.end;

        for (let i = 0; i < dayEvents.length; i += 1) {
          const event = dayEvents[i];
          if (event.end <= selectedMinutes) {
            startBoundary = Math.max(startBoundary, event.end);
            continue;
          }
          if (event.start > selectedMinutes) {
            endBoundary = Math.min(endBoundary, event.start);
            break;
          }
          if (event.start <= selectedMinutes && event.end > selectedMinutes) {
            startBoundary = Math.max(startBoundary, event.end);
            const nextEvent = dayEvents.slice(i + 1).find((item) => item.start >= event.end);
            if (nextEvent) {
              endBoundary = Math.min(endBoundary, nextEvent.start);
            }
            break;
          }
        }

        if (endBoundary > startBoundary) {
          slotStartTime = toTimeLabel(startBoundary);
          slotEndTime = toTimeLabel(endBoundary);
        }
      }

      if (activeWindow && hasExplicitSchedule) {
        router.push({
          pathname: '/(modal)/actions/calendar-book-appointment',
          params: {
            prefillDate: selectedDate || undefined,
            crewMemberId,
            prefillTime: pressedTime,
            slotStartTime,
            slotEndTime,
          },
        });
        return;
      }

      router.push({
        pathname: '/(crew)/(tabs)/dashboard/schedule-empty',
        params: {
          selectedDate,
          selectedDateTime: selectedDateTime || undefined,
          crewMemberId,
          slotStartTime,
          slotEndTime,
          pressedTime,
        },
      });
    };

    const handleDragEventEnd = async (event: OnEventResponse) => {
      if (!canEditSchedule) return;
      const startTime = formatScheduleTime(event.start?.dateTime);
      let endTime = formatScheduleTime(event.end?.dateTime);
      const date = getScheduleDate(event.start?.dateTime);
      if (!startTime || !endTime || !date) return;
      if (dayjs(date).isBefore(dayjs().startOf('day'))) {
        toast.error('לא ניתן לערוך אירועים בתאריך שעבר');
        return;
      }

      if (event.type === 'schedule') {
        await updateScheduleForDate(date, event.scheduleId || null, startTime, endTime);
        return;
      }

      if (event.type === 'break' && event.breakId) {
        const previous = localEvents;
        const pendingKey = getEventKey({ type: 'break', breakId: event.breakId });
        setLocalEvents((prev) =>
          prev.map((item) =>
            item.type === 'break' && item.breakId === event.breakId
              ? { ...item, date, startTime, endTime }
              : item
          )
        );
        pendingUpdatesRef.current[pendingKey] = { date, startTime, endTime };
        const { error } = await updateBreakDate(event.breakId, {
          start_date: date,
          end_date: date,
          start_time: startTime,
          end_time: endTime,
        });
        if (error) {
          toast.error('שמירת הפסקה נכשלה');
          setLocalEvents(previous);
          delete pendingUpdatesRef.current[pendingKey];
        } else {
          toast.success('הפסקה עודכנה');
          queryClient.invalidateQueries({ queryKey: ['breakDates'], exact: false });
          queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
        }
        return;
      }

      if (event.type === 'appointment' && (event.appointmentId || event.id)) {
        const appointmentId = event.appointmentId || event.id;
        const existing = localEvents.find(
          (item) => item.type === 'appointment' && item.appointmentId === appointmentId
        );
        if (existing) {
          const originalDuration = diffMinutes(existing.startTime, existing.endTime);
          const nextDuration = diffMinutes(startTime, endTime);
          if (originalDuration && originalDuration !== nextDuration) {
            endTime = dayjs(`${date}T${startTime}`)
              .add(originalDuration, 'minute')
              .format('HH:mm:ss');
          }
        }
        const previous = localEvents;
        const pendingKey = getEventKey({ type: 'appointment', appointmentId });
        setLocalEvents((prev) =>
          prev.map((item) =>
            item.type === 'appointment' && item.appointmentId === appointmentId
              ? { ...item, date, startTime, endTime }
              : item
          )
        );
        pendingUpdatesRef.current[pendingKey] = { date, startTime, endTime };
        const { error } = await updateAppointmentTime(appointmentId, {
          appointment_date: date,
          start_time: startTime,
          end_time: endTime,
        });
        if (error) {
          toast.error('שמירת התור נכשלה');
          setLocalEvents(previous);
          delete pendingUpdatesRef.current[pendingKey];
        } else {
          toast.success('התור עודכן');
          queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
          queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
        }
      }
    };

    const handleDragSelectedEventEnd = async (event: SelectedEventType) => {
      if (!canEditSchedule) return;
      if (event.type !== 'schedule') return;
      const startTime = formatScheduleTime(event.start?.dateTime);
      const endTime = formatScheduleTime(event.end?.dateTime);
      const date = getScheduleDate(event.start?.dateTime);
      if (!startTime || !endTime || !date || !event.scheduleId) return;
      setSelectedEvent(event);
      const scheduleType =
        (event as { scheduleType?: 'date' | 'weekly' }).scheduleType ||
        selectedScheduleMeta?.type ||
        'date';
      if (scheduleType === 'weekly') {
        const { error } = await updateScheduleSlot(event.scheduleId, {
          start_time: startTime,
          end_time: endTime,
        });
        if (error) {
          toast.error('שמירת שעות נכשלה');
          queryClient.invalidateQueries({ queryKey: ['crew-schedule'], exact: false });
        } else {
          toast.success('שעות עודכנו');
          queryClient.invalidateQueries({ queryKey: ['crew-schedule'], exact: false });
          queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
        }
      } else {
        await updateScheduleForDate(date, event.scheduleId, startTime, endTime);
      }
      setTimeout(() => {
        clearSelectedSchedule();
      }, 150);
    };

    const handlePressBackground = async (props: { date?: string; dateTime?: string }) => {
      if (!canEditSchedule) return;
      const selectedDateTime = props.dateTime || undefined;
      const selectedMinutes = toMinutesFromDateTime(selectedDateTime || undefined);
      const selectedDate = selectedDateTime
        ? dayjs(selectedDateTime).format('YYYY-MM-DD')
        : props.date;
      if (!selectedDate) return;
      if (dayjs(selectedDate).isBefore(dayjs().startOf('day')) && !isAdmin) {
        return;
      }

      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      const matchingDateSchedule =
        selectedMinutes !== null
          ? (dateSchedules || []).find((schedule) => {
              if (schedule.schedule_date !== selectedDate || !schedule.is_active) return false;
              const start = toMinutes(schedule.start_time);
              const end = toMinutes(schedule.end_time);
              return selectedMinutes >= start && selectedMinutes < end;
            })
          : null;
      const weekday = toCalendarWeekday(dayjs(selectedDate).day());
      const matchingWeeklySchedule =
        selectedMinutes !== null
          ? (weeklySchedule || []).find((schedule) => {
              if (schedule.day_of_week !== weekday || !schedule.is_active) return false;
              const start = toMinutes(schedule.start_time);
              const end = toMinutes(schedule.end_time);
              return selectedMinutes >= start && selectedMinutes < end;
            })
          : null;
      const matchingSchedule = matchingDateSchedule
        ? { ...matchingDateSchedule, type: 'date' as const }
        : matchingWeeklySchedule
          ? { ...matchingWeeklySchedule, type: 'weekly' as const }
          : null;

      if (matchingSchedule && canEditSchedule) {
        const now = Date.now();
        const lastTap = lastTapRef.current;
        const isDoubleTap =
          lastTap &&
          now - lastTap.time < 300 &&
          lastTap.date === selectedDate &&
          Math.abs(lastTap.minutes - selectedMinutes) < 5;

        if (isDoubleTap) {
          lastTapRef.current = null;
          const confirmed = await confirmScheduleDelete();
          if (confirmed) {
            if (matchingSchedule.type === 'weekly') {
              await deleteWeeklyScheduleSlot(matchingSchedule.id);
            } else {
              await deleteScheduleForDate(selectedDate, matchingSchedule.id);
            }
            if (selectedScheduleId === matchingSchedule.id) {
              clearSelectedSchedule();
            }
          }
          return;
        }

        lastTapRef.current = { time: now, date: selectedDate, minutes: selectedMinutes };
        singleTapTimeoutRef.current = setTimeout(() => {
          handlePressBackgroundAction(props);
        }, 320);
        return;
      }

      handlePressBackgroundAction(props);
    };

    const handleLongPressBackground = (props: { date?: string; dateTime?: string }) => {
      if (!canEditSchedule) return;
      const selectedDateTime = props.dateTime || undefined;
      if (!selectedDateTime) return;
      const selectedDate = dayjs(selectedDateTime).format('YYYY-MM-DD');
      if (dayjs(selectedDate).isBefore(dayjs().startOf('day'))) {
        return;
      }

      const slotMinutes = dayjs(selectedDateTime).hour() * 60 + dayjs(selectedDateTime).minute();
      const matchingDate = (dateSchedules || []).find((schedule) => {
        if (schedule.schedule_date !== selectedDate || !schedule.is_active) return false;
        const start = toMinutes(schedule.start_time);
        const end = toMinutes(schedule.end_time);
        return slotMinutes >= start && slotMinutes < end;
      });
      const weekday = toCalendarWeekday(dayjs(selectedDate).day());
      const matchingWeekly = (weeklySchedule || []).find((schedule) => {
        if (schedule.day_of_week !== weekday || !schedule.is_active) return false;
        const start = toMinutes(schedule.start_time);
        const end = toMinutes(schedule.end_time);
        return slotMinutes >= start && slotMinutes < end;
      });

      const matching = matchingDate || matchingWeekly;
      if (matching) {
        const scheduleType = matchingDate ? 'date' : 'weekly';
        setSelectedScheduleId(matching.id);
        setSelectedScheduleMeta({ type: scheduleType, date: selectedDate });
        setSelectedEvent({
          id: matching.id,
          start: {
            dateTime: toDateTime(selectedDate, matching.start_time),
            timeZone: 'Asia/Jerusalem',
          },
          end: {
            dateTime: toDateTime(selectedDate, matching.end_time),
            timeZone: 'Asia/Jerusalem',
          },
          title: '',
          color: '#e2e8f0',
          titleColor: 'transparent',
          type: 'schedule',
          scheduleId: matching.id,
          scheduleType,
        } as SelectedEventType);
      }
    };

    useEffect(() => {
      if (!selectedScheduleId) return;
      if (selectedScheduleMeta?.type === 'weekly') {
        const matched = (weeklySchedule || []).find(
          (schedule) => schedule.id === selectedScheduleId
        );
        if (!matched) return;
        const selectedDate = selectedScheduleMeta.date;
        const start = toDateTime(selectedDate, matched.start_time);
        const end = toDateTime(selectedDate, matched.end_time);
        setSelectedEvent({
          id: matched.id,
          start: { dateTime: start, timeZone: 'Asia/Jerusalem' },
          end: { dateTime: end, timeZone: 'Asia/Jerusalem' },
          title: '',
          color: '#e2e8f0',
          titleColor: 'transparent',
          type: 'schedule',
          scheduleId: matched.id,
          scheduleType: 'weekly',
        } as SelectedEventType);
        return;
      }
      const matched = (dateSchedules || []).find((schedule) => schedule.id === selectedScheduleId);
      if (!matched) return;
      const start = toDateTime(matched.schedule_date, matched.start_time);
      const end = toDateTime(matched.schedule_date, matched.end_time);
      setSelectedEvent({
        id: matched.id,
        start: { dateTime: start, timeZone: 'Asia/Jerusalem' },
        end: { dateTime: end, timeZone: 'Asia/Jerusalem' },
        title: '',
        color: '#e2e8f0',
        titleColor: 'transparent',
        type: 'schedule',
        scheduleId: matched.id,
        scheduleType: 'date',
      } as SelectedEventType);
      if (!selectedScheduleMeta) {
        setSelectedScheduleMeta({ type: 'date', date: matched.schedule_date });
      }
    }, [dateSchedules, selectedScheduleId, selectedScheduleMeta, weeklySchedule]);

    const pastDateStyles = (() => {
      const dates: Record<
        string,
        { dayName?: { opacity: number }; dayNumber?: { opacity: number } }
      > = {};
      const today = dayjs().startOf('day');
      for (let i = 1; i <= _pastDaysToShow; i += 1) {
        const date = today.subtract(i, 'day').format('YYYY-MM-DD');
        dates[date] = {
          dayName: { opacity: 0.35 },
          dayNumber: { opacity: 0.35 },
        };
      }
      return dates;
    })();

    return (
      <SafeAreaView style={styles.calendarRoot}>
        <View style={styles.calendarMirror}>
          <CalendarContainer
            events={calendarEvents}
            initialDate={dayjs().format('YYYY-MM-DD')}
            minDate={dayjs().subtract(_pastDaysToShow, 'day').format('YYYY-MM-DD')}
            numberOfDays={7}
            firstDay={7}
            timeZone="Asia/Jerusalem"
            start={_startMinute}
            end={_calendarEndMinute}
            timeInterval={_timeIntervalMinutes}
            spaceFromBottom={250}
            unavailableHours={workingHoursBackground}
            initialTimeIntervalHeight={80}
            minTimeIntervalHeight={80}
            maxTimeIntervalHeight={120}
            overlapType="no-overlap"
            theme={{ outOfRangeBackgroundColor: '#f1f5f9' }}
            highlightDates={pastDateStyles}
            locale="he"
            initialLocales={localeConfig}
            onDateChanged={onDateChanged}
            onPressEvent={handlePressEvent}
            onPressBackground={handlePressBackground}
            onLongPressBackground={handleLongPressBackground}
            allowDragToCreate={false}
            allowDragToEdit={!!canEditSchedule}
            dragStep={dragStepMinutes}
            defaultDuration={60}
            selectedEvent={selectedEvent}
            onDragEventEnd={handleDragEventEnd}
            onDragSelectedEventEnd={handleDragSelectedEventEnd}
            scrollToNow={true}>
            <CalendarHeader
              LeftAreaComponent={mirroredLeftHeaderComponent}
              renderDayItem={renderDayItem}
            />
            <CalendarBody
              renderEvent={renderEvent}
              renderHour={renderHour}
              renderDraggingHour={renderHour}


            />
          </CalendarContainer>
        </View>
      </SafeAreaView>
    );
};

GoogleCalendar.displayName = 'GoogleCalendar';

const styles = StyleSheet.create({
  calendarRoot: {
    flex: 1,
    direction: 'ltr',
  },
  calendarMirror: {
    flex: 1,
    transform: [{ scaleX: -1 }],
  },
  unmirroredContent: {
    transform: [{ scaleX: -1 }],
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 12,
    color: '#5f6267',
    marginBottom: 2,
    textAlign: 'center',
  },
  dayNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    textAlign: 'center',
  },
  hourLabel: {
    paddingRight: 8,
    textAlign: 'right',
  },
  leftHeaderSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    gap: 2,
    transform: [{ scaleX: -1 }],
  },
  eventContentTight: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  eventTitle: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    textAlign: 'center',
  },
  eventTime: {
    fontSize: 8,
    lineHeight: 10,
    opacity: 0.8,
    textAlign: 'center',
  },
});
