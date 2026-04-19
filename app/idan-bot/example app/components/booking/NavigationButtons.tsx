import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const NAVIGATION_BUTTONS_HEIGHT = 56;
const NAVIGATION_BUTTONS_GAP = -12;

export const getNavigationButtonsBottomOffset = (bottomInset: number) =>
  Platform.OS === 'android' ? Math.max(bottomInset, 12) + 12 : bottomInset + 12;

export const getNavigationButtonsReservedSpace = (bottomInset: number) =>
  getNavigationButtonsBottomOffset(bottomInset) +
  NAVIGATION_BUTTONS_HEIGHT +
  NAVIGATION_BUTTONS_GAP;

interface NavigationButtonsProps {
  currentStep: number;
  canProceedToNext: boolean;
  canBookAppointment: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onBookAppointment: () => void;
  totalSteps?: number;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentStep,
  canProceedToNext,
  canBookAppointment,
  onPrevious,
  onNext,
  onBookAppointment,
  totalSteps = 4,
}) => {
  const insets = useSafeAreaInsets();
  const isLastStep = currentStep === totalSteps - 1;
  const canProceed = isLastStep ? canBookAppointment : canProceedToNext;
  const handlePrimaryAction = isLastStep ? onBookAppointment : onNext;
  const bottomOffset = getNavigationButtonsBottomOffset(insets.bottom);

  return (
    <Animated.View
      layout={LinearTransition}
      className="absolute left-0 right-0 flex-row gap-3 px-6"
      style={{ bottom: bottomOffset }}>
      {currentStep > 0 && (
        <Animated.View layout={LinearTransition} className="flex-1">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onPrevious();
            }}
            className="items-center justify-center rounded-lg border border-gray-200 bg-neutral-300 py-4 transition-all duration-150 active:scale-95 active:opacity-80"
            style={{ minHeight: NAVIGATION_BUTTONS_HEIGHT }}>
            <Text className="text-lg font-medium text-gray-600">חזור</Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View layout={LinearTransition} className="flex-1">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            handlePrimaryAction();
          }}
          disabled={!canProceed}
          className={`items-center justify-center rounded-lg py-4 transition-all duration-150 active:scale-95 active:opacity-80 ${
            canProceed ? 'bg-black' : 'bg-gray-200'
          }`}
          style={{ minHeight: NAVIGATION_BUTTONS_HEIGHT }}>
          <Text className={`text-lg font-medium ${canProceed ? 'text-white' : 'text-gray-400'}`}>
            {isLastStep ? 'קבע תור' : 'המשך'}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

export default NavigationButtons;
