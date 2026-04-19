import { ActivityIndicator, View, Text, Pressable, Platform } from 'react-native';
import React from 'react';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDateFormat } from '@/hooks/useDateFormat';
import TicketPaymentIndicator from './TicketPaymentIndicator';

const AppointmentSum = ({
  chosenCustomer,
  chosenAppointmentType,
  chosenAppointmentDate,
  chosenAppointmentTime,
  previousAppointmentDate,
  previousAppointmentTime,
  ticketBalance = 0,
  useTicket = false,
  onUseTicketChange,
  isBooking = false,
  onBack,
  onBookAppointment,
  forceCompact = false,
  showTimeInCompact = false,
}: {
  chosenCustomer: User | null;
  chosenAppointmentType: AppointmentType | null;
  chosenAppointmentDate: string;
  chosenAppointmentTime: string;
  previousAppointmentDate?: string;
  previousAppointmentTime?: string;
  ticketCustomerId?: string;
  ticketCrewMemberId?: string;
  ticketBalance?: number;
  useTicket?: boolean;
  onUseTicketChange?: (value: boolean) => void;
  isBooking?: boolean;
  onBack?: () => void;
  onBookAppointment?: () => void;
  forceCompact?: boolean;
  showTimeInCompact?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const { formatDate: formatDateHook, formatTime: formatTimeHook } = useDateFormat();
  const isExpanded = !!chosenAppointmentTime && !forceCompact;

  // Local pending state flips synchronously inside onPress so the activity
  // indicator appears the instant the button is tapped, instead of waiting
  // for the parent's `isBooking` (useMutation isPending) to propagate through
  // the render cycle.
  const [isLocallyPressing, setIsLocallyPressing] = React.useState(false);
  const localPressingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showBookingLoader = isBooking || isLocallyPressing;

  React.useEffect(() => {
    // Once the parent's mutation finishes (or never started), clear the local
    // optimistic flag so the button can be pressed again.
    if (!isBooking && isLocallyPressing) {
      // Give the parent one tick to flip isBooking=true; if it didn't, this
      // safety timeout still resets us so the button isn't stuck disabled.
      localPressingTimerRef.current = setTimeout(() => setIsLocallyPressing(false), 0);
    }
    return () => {
      if (localPressingTimerRef.current) {
        clearTimeout(localPressingTimerRef.current);
        localPressingTimerRef.current = null;
      }
    };
  }, [isBooking, isLocallyPressing]);

  const handleConfirmPress = () => {
    setIsLocallyPressing(true);
    onBookAppointment?.();
  };

  const layoutTransition = LinearTransition.springify();
  const fadeInSlow = FadeIn.springify();
  const fadeInDownSlow = FadeInDown.springify();
  const avatarStyle = useAnimatedStyle(() => {
    const size = withSpring(isExpanded ? 100 : 40);
    return {
      height: size,
      width: size,
      borderRadius: size / 2,
    };
  });
  const nameTextStyle = useAnimatedStyle(() => {
    return {
      fontSize: withSpring(isExpanded ? 36 : 20),
    };
  });
  const typeTextStyle = useAnimatedStyle(() => {
    return {
      fontSize: withSpring(isExpanded ? 20 : 14),
    };
  });
  const getCustomerDisplayName = (customer: User) => {
    if ((customer as any).full_name) {
      return (customer as any).full_name;
    }
    return 'לקוח ללא שם';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return formatDateHook(dateString, true);
  };

  const formatTime = (timeSlot: string) => {
    if (!timeSlot) return '';

    // Handle format like "09:00-10:00"
    if (timeSlot.includes('-')) {
      const [startTime, endTime] = timeSlot.split('-');
      return formatTimeHook(startTime, endTime);
    }

    return timeSlot;
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime || !durationMinutes) return '';

    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const getFormattedTimeSlot = (timeSlot: string) => {
    if (!timeSlot) return '';

    if (timeSlot.includes('-')) {
      const [startTime] = timeSlot.split('-');
      if (chosenAppointmentType?.duration_minutes && startTime) {
        const endTime = calculateEndTime(startTime.trim(), chosenAppointmentType.duration_minutes);
        return formatTimeHook(startTime.trim(), endTime);
      }
      return formatTime(timeSlot);
    }

    // If we only have start time, calculate end time based on appointment duration
    if (chosenAppointmentType?.duration_minutes) {
      const endTime = calculateEndTime(timeSlot, chosenAppointmentType.duration_minutes);
      return `${timeSlot.slice(0, 5)} - ${endTime}`;
    }

    return timeSlot.slice(0, 5);
  };

  const showPreviousSlot = !!previousAppointmentDate && !!previousAppointmentTime;

  return (
    <View>
      {chosenCustomer && (
        <Animated.View
          style={[
            isExpanded && {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              height: '100%',
              paddingTop: Platform.OS === 'android' ? insets.top * 2 : insets.top,
              paddingBottom: insets.bottom,
            },
            { position: 'relative' },
          ]}
          entering={fadeInDownSlow.delay(500)}
          layout={layoutTransition}
          className={`w-full justify-between bg-neutral-100 ${
            isExpanded ? 'rounded-none px-6' : 'rounded-2xl p-6'
          }`}>
          <Animated.View layout={layoutTransition} className="gap-8">
            {isExpanded && (
              <Animated.View layout={layoutTransition} entering={fadeInSlow}>
                <Text className="text-center text-4xl text-neutral-800">
                  {showPreviousSlot ? 'האם אתה מעוניין להחליף את התור?' : 'האם לקבוע את התור?'}
                </Text>
              </Animated.View>
            )}

            {/* Customer Section */}
            <Animated.View
              layout={layoutTransition}
              className={`${!isExpanded ? 'flex-row justify-between' : 'items-center'}`}>
              <Animated.View
                layout={layoutTransition}
                className={`${!isExpanded && 'flex-row'} items-center gap-3`}>
                <Animated.View layout={layoutTransition} style={avatarStyle}>
                  <Image
                    source={{
                      uri: chosenCustomer?.avatar_url || 'https://via.placeholder.com/40',
                    }}
                    style={{ height: '100%', width: '100%', borderRadius: 999 }}
                    contentFit="cover"
                    className="bg-gray-200 "
                  />
                </Animated.View>
                <Animated.View layout={layoutTransition}>
                  <Animated.Text
                    style={nameTextStyle}
                    className={`${isExpanded ? 'text-center' : 'text-left'} font-semibold text-neutral-800`}>
                    {getCustomerDisplayName(chosenCustomer)}
                  </Animated.Text>
                  {chosenAppointmentType && (
                    <Animated.Text
                      style={typeTextStyle}
                      className={`${isExpanded ? 'text-center' : 'line-clamp-1 max-w-44 truncate text-left'} text-neutral-500`}>
                      {chosenAppointmentType.name}
                    </Animated.Text>
                  )}
                </Animated.View>
              </Animated.View>

              {/* Date & Time Section - Small State Only */}
              {!isExpanded && (
                <Animated.View layout={layoutTransition} entering={fadeInSlow}>
                  <Text className="text-left font-semibold text-neutral-800">
                    {formatDate(chosenAppointmentDate)}
                  </Text>
                  {showTimeInCompact && chosenAppointmentTime ? (
                    <Text className="text-left text-sm text-neutral-500">
                      {getFormattedTimeSlot(chosenAppointmentTime)}
                    </Text>
                  ) : null}
                </Animated.View>
              )}
            </Animated.View>

            {/* Appointment Details Section - Large State Only */}
            {isExpanded && (
              <Animated.View layout={layoutTransition} entering={fadeInSlow} className="gap-4">
                {showPreviousSlot ? (
                  <Animated.View layout={layoutTransition} className="gap-4 rounded-xl p-4">
                    <View className="items-center">
                      <Text className="text-center text-xl font-semibold text-neutral-800">
                        {formatDate(previousAppointmentDate || '')}
                      </Text>
                      <Text className="text-center text-base text-neutral-500">
                        {getFormattedTimeSlot(previousAppointmentTime || '')}
                      </Text>
                    </View>
                    <View className="h-px w-full bg-neutral-200" />
                    <View className="items-center">
                      <Text className="text-center text-sm text-neutral-500">תור חדש</Text>
                      <Text className="text-center text-xl font-semibold text-neutral-800">
                        {formatDate(chosenAppointmentDate)}
                      </Text>
                      <Text className="text-center text-base text-neutral-500">
                        {getFormattedTimeSlot(chosenAppointmentTime)}
                      </Text>
                    </View>
                  </Animated.View>
                ) : (
                  <Animated.View layout={layoutTransition} className="rounded-xl p-4">
                    <View className="flex-row items-center">
                      <View className="flex-1">
                        <Text className="text-center text-lg text-neutral-500">תאריך</Text>
                        <Text className="text-center text-xl font-semibold text-neutral-800">
                          {formatDate(chosenAppointmentDate)}
                        </Text>
                      </View>
                      <View className="h-8 w-px bg-neutral-300" />
                      <View className="flex-1">
                        <Text className="text-center text-lg text-neutral-500">שעה</Text>
                        <Text className="text-center text-xl font-semibold text-neutral-800">
                          {getFormattedTimeSlot(chosenAppointmentTime)}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                )}

                {!showPreviousSlot && chosenAppointmentType?.duration_minutes && (
                  <Animated.View layout={layoutTransition} className="rounded-xl p-4">
                    <View className="flex-row items-center">
                      <View className="flex-1">
                        <Text className="text-center text-lg text-neutral-500">משך הטיפול</Text>
                        <Text className="text-center text-xl font-semibold text-neutral-800">
                          {chosenAppointmentType.duration_minutes} דקות
                        </Text>
                      </View>
                      <View className="h-8 w-px bg-neutral-300" />
                      <View className="flex-1">
                        {chosenAppointmentType.price ? (
                          <>
                            <Text className="text-center text-lg text-neutral-500">עלות</Text>
                            <Text className="text-center text-xl font-semibold text-neutral-800">
                              ₪{chosenAppointmentType.price}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text className="text-center text-lg text-neutral-500">עלות</Text>
                            <Text className="text-center text-xl font-semibold text-neutral-800">
                              ללא עלות
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                )}
                {chosenAppointmentType?.can_use_tickets !== false &&
                  ticketBalance > 0 &&
                  onUseTicketChange && (
                    <TicketPaymentIndicator
                      ticketBalance={ticketBalance}
                      value={useTicket}
                      onValueChange={onUseTicketChange}
                    />
                  )}
              </Animated.View>
            )}
          </Animated.View>
          {isExpanded && (
            <Animated.View layout={layoutTransition} entering={fadeInDownSlow}>
              <Pressable
                onPress={showBookingLoader ? undefined : handleConfirmPress}
                disabled={showBookingLoader}
                style={({ pressed }) => ({
                  opacity: showBookingLoader ? 0.7 : pressed ? 0.85 : 1,
                })}
                className="items-center justify-center rounded-full bg-black py-3">
                {showBookingLoader ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-base font-medium text-white">אישור</Text>
                )}
              </Pressable>
              <Pressable
                onPress={showBookingLoader ? undefined : onBack}
                disabled={showBookingLoader}
                className={`items-center py-4 ${showBookingLoader ? 'opacity-50' : ''}`}>
                <Text className="text-lg text-neutral-600">חזרה</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

export default AppointmentSum;
