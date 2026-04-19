import { AppointmentType } from '@/types/appointments';
import { CreateAppointmentData } from '@/services/crew/appointments';

export const generateAvailableDays = (numberOfDays: number = 14, formatDateFn?: (date: string) => string) => {
  const days = [];
  const today = new Date();
  let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (days.length < numberOfDays) {
    // Skip Saturday (6)
    if (currentDate.getDay() !== 6) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      days.push({
        date: dateString,
        display: formatDateFn ? formatDateFn(dateString) : currentDate.toLocaleDateString('he-IL', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jerusalem'
        }),
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
};

export const parseTimeSlot = (timeSlot: string, appointmentType: AppointmentType) => {
  let startTime: string;
  let endTime: string;

  if (timeSlot.includes('-')) {
    [startTime, endTime] = timeSlot.split('-');
  } else {
    // Calculate end time based on duration
    startTime = timeSlot;
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(
      startDate.getTime() + appointmentType.duration_minutes * 60000
    );
    endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }

  return { startTime: startTime.trim(), endTime: endTime.trim() };
};

export const createAppointmentData = (
  appointmentType: AppointmentType,
  selectedDate: string,
  selectedTimeSlot: string,
  crewMemberId: string,
  isExistingCustomer: boolean,
  selectedCustomerId?: string,
  guestName?: string
): CreateAppointmentData => {
  const { startTime, endTime } = parseTimeSlot(selectedTimeSlot, appointmentType);

  return {
    appointment_type_id: appointmentType.id,
    appointment_date: selectedDate,
    start_time: startTime,
    end_time: endTime,
    crew_member_id: crewMemberId,
    ...(isExistingCustomer
      ? { customer_id: selectedCustomerId }
      : { customer_name: guestName }),
  };
};

export const stepTitles = ['בחירת לקוח', 'סוג השירות', 'בחירת תאריך', 'בחירת שעה'];