import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  memo,
} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { toast } from 'sonner-native';
import PagerView from 'react-native-pager-view';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchCrewDateSchedules,
  fetchCrewScheduleMode,
  updateCrewScheduleMode,
  updateDateScheduleForDate,
  updateFullSchedule,
  ScheduleMode,
} from '@/services/crew/schedules';
import { useAuth } from '@/contexts/AuthContext';
import { Day } from './Day';
import { Hours } from './Hours';
import { getCurrentIsraelDateString } from '@/utils/dateUtils';
import DateTimeField from '@/components/ui/DateTimeField';

const weekDays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const _spacing = 10;

type CrewSchedule = {
  id: string;
  crew_member_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

type CrewDateSchedule = {
  id: string;
  crew_member_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

type ScheduleModeChipProps = {
  scheduleMode: ScheduleMode;
  onChange: (mode: ScheduleMode) => void;
};

const ScheduleModeChip = memo(({ scheduleMode, onChange }: ScheduleModeChipProps) => {
  return (
    <View
      style={{
        backgroundColor: '#f1f5f9',
        borderRadius: 999,
        padding: 4,
        flexDirection: 'row',
      }}>
      <Pressable
        style={{
          flex: 1,
          paddingVertical: 8,
          alignItems: 'center',
          borderRadius: 999,
          backgroundColor: scheduleMode === 'static' ? '#111827' : 'transparent',
        }}
        disabled={false}
        onPress={() => onChange('static')}>
        <Text style={{ color: scheduleMode === 'static' ? '#fff' : '#1f2937', fontSize: 13 }}>
          שבועי
        </Text>
      </Pressable>
      <Pressable
        style={{
          flex: 1,
          paddingVertical: 8,
          alignItems: 'center',
          borderRadius: 999,
          backgroundColor: scheduleMode === 'dynamic' ? '#111827' : 'transparent',
        }}
        disabled={false}
        onPress={() => onChange('dynamic')}>
        <Text style={{ color: scheduleMode === 'dynamic' ? '#fff' : '#1f2937', fontSize: 13 }}>
          לפי תאריך
        </Text>
      </Pressable>
    </View>
  );
});

interface ScheduleManagerProps {
  contentContainerStyle?: object;
  showsVerticalScrollIndicator?: boolean;
  className?: string;
  containerStyle?: object;
  initialDate?: string;
  onChangesStateChange?: (hasChanges: boolean) => void;
}

export interface ScheduleManagerRef {
  savePendingChanges: () => Promise<void>;
  hasChanges: boolean;
}

export const ScheduleManager = forwardRef<ScheduleManagerRef, ScheduleManagerProps>(
  (
    {
      contentContainerStyle,
      showsVerticalScrollIndicator = false,
      className = 'flex-1',
      containerStyle,
      initialDate,
      onChangesStateChange,
    },
    ref
  ) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [schedules, setSchedules] = useState<CrewSchedule[]>([]);
    const [originalSchedules, setOriginalSchedules] = useState<CrewSchedule[]>([]);
    const [pendingSchedules, setPendingSchedules] = useState<CrewSchedule[]>([]);
    const [isModeLoading, setIsModeLoading] = useState(true);
    const [isStaticLoading, setIsStaticLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [savedScheduleMode, setSavedScheduleMode] = useState<ScheduleMode>('static');
    const [pendingScheduleMode, setPendingScheduleMode] = useState<ScheduleMode>('static');
    const [modeLoaded, setModeLoaded] = useState(false);
    const [selectedDate, setSelectedDate] = useState(
      initialDate || getCurrentIsraelDateString()
    );
    const [originalDateSchedules, setOriginalDateSchedules] = useState<CrewDateSchedule[]>([]);
    const [pendingDateSchedules, setPendingDateSchedules] = useState<CrewDateSchedule[]>([]);
    const [activeDateBlocks, setActiveDateBlocks] = useState<
      { id: string | null; range: [Date, Date] }[]
    >([]);
    const [isDateLoading, setIsDateLoading] = useState(false);
    const pagerRef = useRef<PagerView>(null);

    const hasDateScheduleChanges = () => {
      const normalizedOriginal = originalDateSchedules
        .map((s) => ({
          ...s,
          id: s.id.startsWith('temp-') ? 'temp' : s.id,
        }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      const normalizedPending = pendingDateSchedules
        .map((s) => ({
          ...s,
          id: s.id.startsWith('temp-') ? 'temp' : s.id,
        }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedPending);
    };

    const hasWeeklyScheduleChanges = () => {
      const normalizedOriginal = originalSchedules
        .map((s) => ({
          ...s,
          id: s.id.startsWith('temp-') ? 'temp' : s.id,
        }))
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));

      const normalizedPending = pendingSchedules
        .map((s) => ({
          ...s,
          id: s.id.startsWith('temp-') ? 'temp' : s.id,
        }))
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));

      return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedPending);
    };

    const checkForChanges = () => {
      if (pendingScheduleMode !== savedScheduleMode) {
        return true;
      }
      if (pendingScheduleMode === 'dynamic') {
        return hasDateScheduleChanges();
      }
      return hasWeeklyScheduleChanges();
    };

    // Update hasChanges when pendingSchedules change
    useEffect(() => {
      const changesDetected = checkForChanges();
      if (changesDetected !== hasChanges) {
        setHasChanges(changesDetected);
      }
    }, [
      pendingSchedules,
      originalSchedules,
      pendingDateSchedules,
      originalDateSchedules,
      pendingScheduleMode,
      savedScheduleMode,
    ]);

    useEffect(() => {
      onChangesStateChange?.(hasChanges);
    }, [hasChanges, onChangesStateChange]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      savePendingChanges,
      hasChanges,
    }));

    useEffect(() => {
      const fetchScheduleMode = async () => {
        if (!user?.id) return;

        try {
          setIsModeLoading(true);
          const { data, error } = await fetchCrewScheduleMode(user.id);
          if (error) throw error;
          const resolvedMode = data || 'static';
          setSavedScheduleMode(resolvedMode);
          setPendingScheduleMode(resolvedMode);
        } catch (error) {
          console.error('Error fetching schedule mode:', error);
          toast.error('לא ניתן לטעון את הגדרת לוח הזמנים');
        } finally {
          setIsModeLoading(false);
          setModeLoaded(true);
        }
      };

      fetchScheduleMode();
    }, [user?.id]);

    useEffect(() => {
      if (!modeLoaded || !user?.id) return;

      const fetchSchedules = async () => {
        try {
          setIsStaticLoading(true);
          const { data, error } = await supabase
            .from('crew_schedules')
            .select('*')
            .eq('crew_member_id', user.id)
            .order('day_of_week');

          if (error) throw error;
          const scheduleData = data || [];
          setSchedules(scheduleData);
          setOriginalSchedules(JSON.parse(JSON.stringify(scheduleData))); // Deep copy
          setPendingSchedules(scheduleData);
        } catch (error) {
          console.error('Error fetching schedules:', error);
          toast.error('לא ניתן לטעון את לוח הזמנים');
        } finally {
          setIsStaticLoading(false);
        }
      };

      fetchSchedules();
    }, [user?.id, modeLoaded]);

    useEffect(() => {
      if (initialDate) {
        setSelectedDate(initialDate);
      }
    }, [initialDate]);

    useEffect(() => {
      if (!modeLoaded || !user?.id) return;

      const fetchDateSchedules = async () => {
        try {
          setIsDateLoading(true);
          const { data, error } = await fetchCrewDateSchedules(user.id, selectedDate, selectedDate);
          if (error) throw error;

          const dateData = data || [];
          setOriginalDateSchedules(JSON.parse(JSON.stringify(dateData)));
          setPendingDateSchedules(dateData);

          const blocks = dateData.map((schedule) => {
            const startHourParts = schedule.start_time.split(':').map(Number);
            const endHourParts = schedule.end_time.split(':').map(Number);

            const startDate = new Date();
            startDate.setHours(startHourParts[0], startHourParts[1] || 0, 0, 0);

            const endDate = new Date();
            endDate.setHours(endHourParts[0], endHourParts[1] || 0, 0, 0);

            return {
              id: schedule.id,
              range: [startDate, endDate] as [Date, Date],
            };
          });

          setActiveDateBlocks(blocks);
        } catch (error) {
          console.error('Error fetching date schedules:', error);
        toast.error('לא ניתן לטעון את לוח הזמנים לתאריך הנבחר');
        } finally {
          setIsDateLoading(false);
        }
      };

      fetchDateSchedules();
    }, [user?.id, modeLoaded, selectedDate]);

    const updatePendingSchedule = (dayIndex: number, startTime: string, endTime: string) => {
      if (!user?.id) return;

      // Create a temporary ID for new schedules
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const newSchedule: CrewSchedule = {
        id: tempId,
        crew_member_id: user.id,
        day_of_week: dayIndex,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      };

      setPendingSchedules((prev) => {
        const existsInLocal = prev.some(
          (schedule) =>
            schedule.crew_member_id === user.id &&
            schedule.day_of_week === dayIndex &&
            schedule.start_time === startTime &&
            schedule.end_time === endTime
        );
        if (existsInLocal) {
          return prev;
        }
        return [...prev, newSchedule];
      });

      setHasChanges(true);
    };

    const handleScheduleModeChange = useCallback(
      (mode: ScheduleMode) => {
        if (mode === pendingScheduleMode) return;
        setPendingScheduleMode(mode);
      },
      [pendingScheduleMode]
    );

    const formatTimeString = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}:00`;
    };

    const buildDateSchedulesFromBlocks = (blocks: { id: string | null; range: [Date, Date] }[]) => {
      if (!user?.id) return [];
      return blocks.map((block) => ({
        id: block.id || `temp-${Date.now()}-${Math.random()}`,
        crew_member_id: user.id,
        schedule_date: selectedDate,
        start_time: formatTimeString(block.range[0]),
        end_time: formatTimeString(block.range[1]),
        is_active: true,
      }));
    };

    const handleDateHoursUpdate = (updatedHours: [Date, Date][]) => {
      const updatedBlocks = updatedHours.map((range, index) => {
        if (index < activeDateBlocks.length) {
          return { id: activeDateBlocks[index].id, range };
        }
        return { id: null, range };
      });

      setActiveDateBlocks(updatedBlocks);
      setPendingDateSchedules(buildDateSchedulesFromBlocks(updatedBlocks));
    };

    const addDateHourRange = () => {
      const baseDate = new Date();
      baseDate.setHours(9, 0, 0, 0);

      const endDate = new Date(baseDate);
      endDate.setHours(baseDate.getHours() + 1, 0, 0, 0);

      let newBlocks = [];
      if (activeDateBlocks.length === 0) {
        newBlocks = [
          { id: `temp-${Date.now()}-${Math.random()}`, range: [baseDate, endDate] as [Date, Date] },
        ];
      } else {
        const lastBlock = activeDateBlocks[activeDateBlocks.length - 1];
        const lastEnd = new Date(lastBlock.range[1]);
        const newStart = new Date(lastEnd);
        const newEnd = new Date(lastEnd);
        newEnd.setHours(newEnd.getHours() + 1);

        newBlocks = [
          ...activeDateBlocks,
          { id: `temp-${Date.now()}-${Math.random()}`, range: [newStart, newEnd] as [Date, Date] },
        ];
      }

      setActiveDateBlocks(newBlocks);
      setPendingDateSchedules(buildDateSchedulesFromBlocks(newBlocks));
    };

    const savePendingChanges = async () => {
      if (!user?.id || !hasChanges) return;

      try {
        setIsSaving(true);

        const shouldUpdateMode = pendingScheduleMode !== savedScheduleMode;
        const shouldUpdateDateSchedules =
          pendingScheduleMode === 'dynamic' && hasDateScheduleChanges();
        const shouldUpdateWeeklySchedules =
          pendingScheduleMode === 'static' && hasWeeklyScheduleChanges();

        if (shouldUpdateMode) {
          const { error: modeError } = await updateCrewScheduleMode(user.id, pendingScheduleMode);
          if (modeError) throw modeError;
          setSavedScheduleMode(pendingScheduleMode);
        }

        if (shouldUpdateDateSchedules) {
          const scheduleSlots = pendingDateSchedules.map((schedule) => ({
            crew_member_id: user.id,
            schedule_date: selectedDate,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_active: schedule.is_active ?? true,
          }));

          const { error } = await updateDateScheduleForDate(user.id, selectedDate, scheduleSlots);
          if (error) throw error;

          const { data: updatedSchedules } = await fetchCrewDateSchedules(
            user.id,
            selectedDate,
            selectedDate
          );

          const finalSchedules = updatedSchedules || [];
          setOriginalDateSchedules(JSON.parse(JSON.stringify(finalSchedules)));
          setPendingDateSchedules(finalSchedules);
          setActiveDateBlocks(
            finalSchedules.map((schedule) => {
              const startHourParts = schedule.start_time.split(':').map(Number);
              const endHourParts = schedule.end_time.split(':').map(Number);

              const startDate = new Date();
              startDate.setHours(startHourParts[0], startHourParts[1] || 0, 0, 0);

              const endDate = new Date();
              endDate.setHours(endHourParts[0], endHourParts[1] || 0, 0, 0);

              return { id: schedule.id, range: [startDate, endDate] as [Date, Date] };
            })
          );
          setHasChanges(false);

          queryClient.invalidateQueries({ queryKey: ['crew-schedule-mode', user.id] });
          queryClient.invalidateQueries({ queryKey: ['crew-date-schedule', user.id] });
          queryClient.invalidateQueries({ queryKey: ['schedule-range', user.id] });
          toast.success('לוח הזמנים נשמר בהצלחה');
          return;
        }

        if (!shouldUpdateWeeklySchedules) {
          setHasChanges(false);
          queryClient.invalidateQueries({ queryKey: ['crew-schedule-mode', user.id] });
          queryClient.invalidateQueries({ queryKey: ['crew-schedule', user.id] });
          queryClient.invalidateQueries({ queryKey: ['crew-date-schedule', user.id] });
          queryClient.invalidateQueries({ queryKey: ['schedule-range', user.id] });
          toast.success('לוח הזמנים נשמר בהצלחה');
          return;
        }

        // Prepare schedule slots for bulk update
        const scheduleSlots = pendingSchedules
          .filter((schedule) => !schedule.id.startsWith('temp-')) // Filter out temp IDs
          .map((schedule) => ({
            crew_member_id: user.id,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_active: schedule.is_active ?? true,
          }));

        // Add new schedules (temp IDs)
        const newSchedules = pendingSchedules
          .filter((schedule) => schedule.id.startsWith('temp-'))
          .map((schedule) => ({
            crew_member_id: user.id,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_active: schedule.is_active ?? true,
          }));

        const allSchedules = [...scheduleSlots, ...newSchedules];

        const { error } = await updateFullSchedule(user.id, allSchedules);

        if (error) {
          throw error;
        }

        console.log('📡 [ScheduleManager] Saved all schedule changes with broadcast');

        // Refresh schedules from database
        const { data: updatedSchedules } = await supabase
          .from('crew_schedules')
          .select('*')
          .eq('crew_member_id', user.id)
          .order('day_of_week');

        const finalSchedules = updatedSchedules || [];
        setSchedules(finalSchedules);
        setOriginalSchedules(JSON.parse(JSON.stringify(finalSchedules))); // Deep copy
        setPendingSchedules(finalSchedules);
        setHasChanges(false);

        queryClient.invalidateQueries({ queryKey: ['crew-schedule-mode', user.id] });
        queryClient.invalidateQueries({ queryKey: ['crew-schedule', user.id] });
        queryClient.invalidateQueries({ queryKey: ['crew-date-schedule', user.id] });
        queryClient.invalidateQueries({ queryKey: ['schedule-range', user.id] });
        toast.success('לוח הזמנים נשמר בהצלחה');
      } catch (error) {
        console.error('Error saving schedule changes:', error);
        toast.error('לא ניתן לשמור את השינויים');
      } finally {
        setIsSaving(false);
      }
    };

    useEffect(() => {
      if (!modeLoaded || !pagerRef.current) return;
      const targetPage = pendingScheduleMode === 'dynamic' ? 1 : 0;
      pagerRef.current.setPage(targetPage);
    }, [modeLoaded, pendingScheduleMode]);

    const formatDateLabel = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    };

    const formatDateISO = (date: Date) => {
      return date.toLocaleDateString('en-CA');
    };

    const minSelectableDate = new Date();
    minSelectableDate.setHours(0, 0, 0, 0);

    if (isModeLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="mt-4 text-gray-500">טוען לוח זמנים...</Text>
        </View>
      );
    }

    const pageContainerStyle = {
      gap: _spacing,
      padding: _spacing,
      paddingHorizontal: _spacing * 2,
      paddingTop: _spacing * 2,
    };

    return (
      <View className={className} style={[{ direction: 'rtl', flex: 1 }, containerStyle]}>
        <View style={pageContainerStyle}>
          <ScheduleModeChip
            scheduleMode={pendingScheduleMode}
            onChange={handleScheduleModeChange}
          />
        </View>

        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          scrollEnabled={false}
          initialPage={pendingScheduleMode === 'dynamic' ? 1 : 0}
          onPageSelected={(event) => {
            const nextMode = event.nativeEvent.position === 1 ? 'dynamic' : 'static';
            if (nextMode !== pendingScheduleMode) {
              setPendingScheduleMode(nextMode);
            }
          }}>
          <ScrollView
            key="static"
            className="flex-1"
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            contentContainerStyle={[pageContainerStyle, contentContainerStyle]}>
            {isStaticLoading ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text className="mt-3 text-gray-500">טוען לוח זמנים שבועי...</Text>
              </View>
            ) : (
              weekDays.map((day, index) => (
                <Day
                  key={`day-${day}`}
                  day={day}
                  dayIndex={index}
                  schedules={pendingSchedules}
                  saveSchedule={updatePendingSchedule}
                  crewMemberId={user?.id}
                  setSchedules={setPendingSchedules}
                />
              ))
            )}
          </ScrollView>

          <ScrollView
            key="dynamic"
            className="flex-1"
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            contentContainerStyle={[pageContainerStyle, contentContainerStyle]}>
            <View className="rounded-lg bg-slate-100 p-4">
              <Text className="text-left text-sm font-medium text-slate-700">תאריך נבחר</Text>
              <Text className="mt-1 text-center text-base font-semibold text-slate-800">
                {formatDateLabel(selectedDate)}
              </Text>
            </View>

            <View className="rounded-lg bg-white p-4 shadow-sm">
              <Text className="text-left text-sm text-slate-600">בחירת תאריך</Text>
              <DateTimeField
                value={new Date(`${selectedDate}T00:00:00`)}
                mode="date"
                locale="he-IL"
                minimumDate={minSelectableDate}
                displayValue={formatDateLabel(selectedDate)}
                onChange={(date) => setSelectedDate(formatDateISO(date))}
                triggerStyle={{
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginTop: 8,
                  backgroundColor: '#f8fafc',
                  alignItems: 'center',
                }}
                labelStyle={{ fontSize: 16, color: '#334155' }}
              />
            </View>

            <View className="rounded-lg bg-white p-4 shadow-sm">
              <Text className="text-left text-base font-medium text-slate-900">
                שעות פעילות לתאריך זה
              </Text>
              <Text className="text-left text-sm text-slate-600">
                לוח זמנים שבועי לא בשימוש במצב דינמי
              </Text>

              {isDateLoading ? (
                <View className="items-center justify-center py-6">
                  <ActivityIndicator size="small" color="#4f46e5" />
                  <Text className="mt-3 text-gray-500">טוען שעות לתאריך...</Text>
                </View>
              ) : activeDateBlocks.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <Hours
                    day="Selected Date"
                    activeHours={activeDateBlocks.map((block) => block.range)}
                    setActiveHours={handleDateHoursUpdate}
                    onSave={() => {}}
                  />
                </View>
              ) : (
                <Text className="text-left" style={{ marginTop: 12, color: '#94a3b8' }}>
                  אין שעות מוגדרות לתאריך זה
                </Text>
              )}

              <Pressable onPress={addDateHourRange}>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: _spacing / 2,
                    padding: _spacing,
                    borderRadius: 12,
                    backgroundColor: '#e2e8f0',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: _spacing,
                  }}>
                  <Text style={{ fontSize: 14, color: '#1f2937' }}>הוסף עוד</Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </PagerView>
      </View>
    );
  }
);
