import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';

export const useAppointmentNavigation = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCrewMember, setSelectedCrewMember] = useState<User | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pagerRef = useRef<PagerView>(null);
  const progressValue = useSharedValue(0);

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1: // Can go to appointment types
        return selectedCrewMember !== null;
      case 2: // Can go to date selection
        return selectedCrewMember !== null && selectedAppointmentType !== null;
      case 3: // Can go to time selection
        return selectedCrewMember !== null && selectedAppointmentType !== null && selectedDate !== '';
      default:
        return true;
    }
  };

  const nextStep = () => {
    const isCurrentStepValid = (() => {
      switch (currentStep) {
        case 0:
          return selectedCrewMember !== null;
        case 1:
          return selectedAppointmentType !== null;
        case 2:
          return selectedDate !== '';
        case 3:
          return selectedTimeSlot !== '';
        default:
          return false;
      }
    })();

    if (!isCurrentStepValid) {
      Alert.alert('שגיאה', 'אנא השלם את השדות הנדרשים לפני המעבר לשלב הבא');
      return;
    }

    if (currentStep < 3) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      pagerRef.current?.setPage(newStep);
      progressValue.value = withSpring(newStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      pagerRef.current?.setPage(newStep);
      progressValue.value = withSpring(newStep);
    }
  };

  const handleCrewMemberSelection = (member: User) => {
    setSelectedCrewMember(member);
    setSelectedAppointmentType(null);
    setSelectedDate('');

    if (currentStep === 0) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      pagerRef.current?.setPage(newStep);
      progressValue.value = withSpring(newStep);
    }
  };

  const handleAppointmentTypeSelection = (type: AppointmentType) => {
    setSelectedAppointmentType(type);
    setSelectedDate('');
    
    if (currentStep === 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      pagerRef.current?.setPage(newStep);
      progressValue.value = withSpring(newStep);
    }
  };

  const handleDateSelection = (date: string) => {
    setSelectedDate(date);
    
    if (currentStep === 2) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      pagerRef.current?.setPage(newStep);
      progressValue.value = withSpring(newStep);
    }
  };

  const handlePageSelected = (position: number) => {
    setCurrentStep(position);
    progressValue.value = withSpring(position);
  };

  return {
    // State
    currentStep,
    selectedCrewMember,
    selectedAppointmentType,
    selectedDate,
    selectedTimeSlot,
    isRefreshing,
    
    // Refs and values
    pagerRef,
    progressValue,
    
    // Actions
    setCurrentStep,
    setSelectedTimeSlot,
    setIsRefreshing,
    canProceedToStep,
    nextStep,
    prevStep,
    handleCrewMemberSelection,
    handleAppointmentTypeSelection,
    handleDateSelection,
    handlePageSelected,
  };
};