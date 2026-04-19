import React, { useRef } from 'react';
import { View, Text } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NavigationButtons from '@/components/booking/NavigationButtons';
import { stepTitles } from '@/utils/crew/bookingUtils';

interface BookingStepContainerProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  canProceedToNext: boolean;
  canBookAppointment: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onBookAppointment: () => void;
  showNavigationButtons: boolean;
  children: React.ReactNode;
}

const BookingStepContainer: React.FC<BookingStepContainerProps> = ({
  currentStep,
  onStepChange,
  canProceedToNext,
  canBookAppointment,
  onPrevious,
  onNext,
  onBookAppointment,
  showNavigationButtons,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const progressValue = useSharedValue(0);

  const handlePageChange = (e: any) => {
    const position = e.nativeEvent.position;
    onStepChange(position);
    progressValue.value = withSpring(position);
  };

  return (
    <View style={{ flex: 1, direction: 'rtl' }} className="bg-white">
      {/* Header with Step Title */}
      <View style={{ paddingTop: insets.top + 16 }} className="px-6 pb-4">
        <Text className="text-center text-2xl font-bold text-black">
          {stepTitles[currentStep]}
        </Text>
      </View>

      {/* Page View */}
      <View style={{ flex: 1 }}>
        <PagerView
          ref={pagerRef}
          style={{ flex: 1, direction: 'rtl' }}
          initialPage={0}
          onPageSelected={handlePageChange}
          scrollEnabled={false}
          layoutDirection="rtl">
          {children}
        </PagerView>
      </View>
      
      {/* Navigation Buttons */}
      {showNavigationButtons && (
        <NavigationButtons
          currentStep={currentStep}
          canProceedToNext={canProceedToNext}
          canBookAppointment={canBookAppointment}
          onPrevious={onPrevious}
          onNext={onNext}
          onBookAppointment={onBookAppointment}
        />
      )}
    </View>
  );
};

export default BookingStepContainer;
