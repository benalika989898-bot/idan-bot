import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';

interface BookingStateManagerProps {
  children: (state: BookingState, actions: BookingActions) => React.ReactNode;
}

export interface BookingState {
  currentStep: number;
  isExistingCustomer: boolean;
  selectedCustomer: User | null;
  guestName: string;
  selectedAppointmentType: AppointmentType | null;
  selectedDate: string;
  selectedTimeSlot: string;
}

export interface BookingActions {
  setCurrentStep: (step: number) => void;
  setIsExistingCustomer: (value: boolean) => void;
  setSelectedCustomer: (customer: User | null) => void;
  setGuestName: (name: string) => void;
  setSelectedAppointmentType: (type: AppointmentType | null) => void;
  setSelectedDate: (date: string) => void;
  setSelectedTimeSlot: (slot: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceedToStep: (step: number) => boolean;
  canBookAppointment: () => boolean;
}

const BookingStateManager: React.FC<BookingStateManagerProps> = ({ children }) => {
  const params = useLocalSearchParams();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isExistingCustomer, setIsExistingCustomer] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [guestName, setGuestName] = useState('');
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // Handle customer selection from params
  useEffect(() => {
    if (params.selectedCustomer) {
      try {
        const customer = JSON.parse(params.selectedCustomer as string);
        setSelectedCustomer(customer);
      } catch (error) {
        console.error('Error parsing selected customer:', error);
      }
    }
  }, [params.selectedCustomer]);

  const canProceedToStep = (step: number): boolean => {
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

  const canBookAppointment = (): boolean => {
    return canProceedToStep(3) && selectedTimeSlot !== '';
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const state: BookingState = {
    currentStep,
    isExistingCustomer,
    selectedCustomer,
    guestName,
    selectedAppointmentType,
    selectedDate,
    selectedTimeSlot,
  };

  const actions: BookingActions = {
    setCurrentStep,
    setIsExistingCustomer,
    setSelectedCustomer,
    setGuestName,
    setSelectedAppointmentType,
    setSelectedDate,
    setSelectedTimeSlot,
    nextStep,
    prevStep,
    canProceedToStep,
    canBookAppointment,
  };

  return <>{children(state, actions)}</>;
};

export default BookingStateManager;