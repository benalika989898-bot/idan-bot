import { useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { toast } from 'sonner-native';
import PagerView from 'react-native-pager-view';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';
import { useCrewBookingStore } from '@/stores/crewBookingStore';

export interface CrewBookingState {
  currentStep: number;
  isExistingCustomer: boolean;
  selectedCustomer: User | null;
  guestName: string;
  selectedAppointmentType: AppointmentType | null;
  selectedDate: string;
  disabledDates: string[];
  selectedTimeSlot: string;
  isRefreshing: boolean;
}

const getCustomerDisplayName = (customer: User) => {
  if ((customer as any).full_name) {
    return (customer as any).full_name;
  }
  return 'לקוח ללא שם';
};

export const useInitializeCrewBookingFromParams = () => {
  const params = useLocalSearchParams();
  const setSelectedCustomer = useCrewBookingStore((state) => state.setSelectedCustomer);

  useEffect(() => {
    if (params.selectedCustomer) {
      try {
        const customer = JSON.parse(params.selectedCustomer as string);
        setSelectedCustomer(customer);
      } catch (error) {
        console.error('Error parsing selected customer:', error);
      }
    }
  }, [params.selectedCustomer, setSelectedCustomer]);
};

export const useCrewBookingPager = () => {
  const pagerRef = useRef<PagerView>(null);
  const progressValue = useSharedValue(0);
  const currentStep = useCrewBookingStore((state) => state.currentStep);
  const setCurrentStep = useCrewBookingStore((state) => state.setCurrentStep);

  const navigateToStep = (step: number) => {
    setCurrentStep(step);
    pagerRef.current?.setPage(step);
    progressValue.value = withSpring(step);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      navigateToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      navigateToStep(currentStep - 1);
    }
  };

  return {
    pagerRef,
    progressValue,
    navigateToStep,
    nextStep,
    prevStep,
  };
};

export const useCrewBookingCustomerState = () => {
  const isExistingCustomer = useCrewBookingStore((state) => state.isExistingCustomer);
  const selectedCustomer = useCrewBookingStore((state) => state.selectedCustomer);
  const guestName = useCrewBookingStore((state) => state.guestName);
  const currentStep = useCrewBookingStore((state) => state.currentStep);
  const setIsExistingCustomer = useCrewBookingStore((state) => state.setIsExistingCustomer);
  const setSelectedCustomer = useCrewBookingStore((state) => state.setSelectedCustomer);
  const setGuestName = useCrewBookingStore((state) => state.setGuestName);
  const setSelectedDate = useCrewBookingStore((state) => state.setSelectedDate);

  return {
    isExistingCustomer,
    selectedCustomer,
    guestName,
    setIsExistingCustomer,
    setSelectedCustomer,
    setGuestName,
    handleCustomerSelection: (
      customer: User,
      navigateToStep?: (step: number) => void
    ) => {
      setSelectedCustomer(customer);
      setSelectedDate('');
      if (currentStep === 0) {
        navigateToStep?.(1);
      }
    },
    handleGuestNameChange: (name: string, navigateToStep?: (step: number) => void) => {
      setGuestName(name);
      setSelectedDate('');
      if (name.trim().length > 0) {
        setTimeout(() => {
          const { currentStep: latestStep, isExistingCustomer: latestCustomerMode } =
            useCrewBookingStore.getState();
          if (latestStep === 0 && !latestCustomerMode) {
            navigateToStep?.(1);
          }
        }, 1000);
      }
    },
  };
};

export const useCrewBookingAppointmentState = () => {
  const selectedAppointmentType = useCrewBookingStore((state) => state.selectedAppointmentType);
  const setSelectedAppointmentType = useCrewBookingStore((state) => state.setSelectedAppointmentType);
  const setSelectedDate = useCrewBookingStore((state) => state.setSelectedDate);
  const currentStep = useCrewBookingStore((state) => state.currentStep);

  return {
    selectedAppointmentType,
    setSelectedAppointmentType,
    handleAppointmentTypeSelection: (
      type: AppointmentType,
      navigateToStep?: (step: number) => void
    ) => {
      setSelectedAppointmentType(type);
      setSelectedDate('');
      if (currentStep === 1) {
        navigateToStep?.(2);
      }
    },
  };
};

export const useCrewBookingScheduleState = () => {
  const selectedDate = useCrewBookingStore((state) => state.selectedDate);
  const disabledDates = useCrewBookingStore((state) => state.disabledDates);
  const selectedTimeSlot = useCrewBookingStore((state) => state.selectedTimeSlot);
  const currentStep = useCrewBookingStore((state) => state.currentStep);
  const setSelectedDate = useCrewBookingStore((state) => state.setSelectedDate);
  const setDisabledDates = useCrewBookingStore((state) => state.setDisabledDates);
  const setSelectedTimeSlot = useCrewBookingStore((state) => state.setSelectedTimeSlot);
  const clearSelections = useCrewBookingStore((state) => state.clearSelections);

  return {
    selectedDate,
    disabledDates,
    selectedTimeSlot,
    setSelectedDate,
    setDisabledDates,
    setSelectedTimeSlot,
    clearSelections,
    handleDateSelection: (date: string, navigateToStep?: (step: number) => void) => {
      setSelectedDate(date);
      if (currentStep === 2) {
        navigateToStep?.(3);
      }
    },
  };
};

export const useCrewBookingUiState = () => {
  const currentStep = useCrewBookingStore((state) => state.currentStep);
  const isRefreshing = useCrewBookingStore((state) => state.isRefreshing);
  const setCurrentStep = useCrewBookingStore((state) => state.setCurrentStep);
  const setIsRefreshing = useCrewBookingStore((state) => state.setIsRefreshing);

  return {
    currentStep,
    isRefreshing,
    setCurrentStep,
    setIsRefreshing,
  };
};

export const useCrewBookingValidation = () => {
  const currentStep = useCrewBookingStore((state) => state.currentStep);
  const isExistingCustomer = useCrewBookingStore((state) => state.isExistingCustomer);
  const selectedCustomer = useCrewBookingStore((state) => state.selectedCustomer);
  const guestName = useCrewBookingStore((state) => state.guestName);
  const selectedAppointmentType = useCrewBookingStore((state) => state.selectedAppointmentType);
  const selectedDate = useCrewBookingStore((state) => state.selectedDate);
  const selectedTimeSlot = useCrewBookingStore((state) => state.selectedTimeSlot);

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1:
        return isExistingCustomer ? selectedCustomer !== null : guestName.trim().length > 0;
      case 2:
        return canProceedToStep(1) && selectedAppointmentType !== null;
      case 3:
        return canProceedToStep(2) && selectedDate !== '';
      default:
        return true;
    }
  };

  const canBookAppointment = () => {
    return canProceedToStep(3) && selectedTimeSlot !== '';
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 0:
        return isExistingCustomer ? selectedCustomer !== null : guestName.trim().length > 0;
      case 1:
        return selectedAppointmentType !== null;
      case 2:
        return selectedDate !== '';
      case 3:
        return selectedTimeSlot !== '';
      default:
        return false;
    }
  };

  return {
    canProceedToStep,
    canBookAppointment,
    isCurrentStepValid,
  };
};

export const useCrewBookingState = () => {
  useInitializeCrewBookingFromParams();

  const customerState = useCrewBookingCustomerState();
  const appointmentState = useCrewBookingAppointmentState();
  const scheduleState = useCrewBookingScheduleState();
  const uiState = useCrewBookingUiState();
  const validation = useCrewBookingValidation();
  const pager = useCrewBookingPager();

  const nextStep = () => {
    if (!validation.isCurrentStepValid()) {
      toast.error('אנא השלם את השדות הנדרשים לפני המעבר לשלב הבא');
      return;
    }

    pager.nextStep();
  };

  return {
    ...uiState,
    ...customerState,
    ...appointmentState,
    ...scheduleState,
    ...pager,
    ...validation,
    nextStep,
    prevStep: pager.prevStep,
    navigateToStep: pager.navigateToStep,
    handleCustomerSelection: (customer: User) =>
      customerState.handleCustomerSelection(customer, pager.navigateToStep),
    handleGuestNameChange: (name: string) =>
      customerState.handleGuestNameChange(name, pager.navigateToStep),
    handleAppointmentTypeSelection: (type: AppointmentType) =>
      appointmentState.handleAppointmentTypeSelection(type, pager.navigateToStep),
    handleDateSelection: (date: string) =>
      scheduleState.handleDateSelection(date, pager.navigateToStep),
    getCustomerDisplayName,
  };
};
