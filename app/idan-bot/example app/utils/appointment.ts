
export const getMinutesBetween = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  return endHour * 60 + endMin - (startHour * 60 + startMin);
};

export const generateAvailableDays = () => {
  const days = [];
  
  // Get current date in Israel timezone
  const now = new Date();
  const israelDateString = now.toLocaleDateString('en-CA', { 
    timeZone: 'Asia/Jerusalem'
  });
  
  // Parse the Israel date to create a proper Date object
  const [year, month, day] = israelDateString.split('-').map(Number);
  let currentDate = new Date(year, month - 1, day); // month is 0-indexed in Date constructor

  while (days.length < 7) {
    // Skip Saturday (6) - get day of week in Israel timezone
    const israelDayOfWeek = new Date(currentDate.toLocaleDateString('en-CA')).getDay();
    
    if (israelDayOfWeek !== 6) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      days.push({
        date: dateString,
        display: dateString, // Will be formatted later in component
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
};

export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  // Create a date object for time calculation (timezone doesn't matter for time-only calculations)
  const startDate = new Date(2024, 0, 1, hours, minutes, 0, 0); // Use fixed date for time calculation
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
};

export const parseTimeSlot = (timeSlot: string, durationMinutes?: number) => {
  if (timeSlot.includes('-')) {
    const [startTime, endTime] = timeSlot.split('-');
    return { startTime: startTime.trim(), endTime: endTime.trim() };
  } else {
    const startTime = timeSlot.trim();
    const endTime = durationMinutes ? calculateEndTime(startTime, durationMinutes) : startTime;
    return { startTime, endTime };
  }
};

export const getCrewMemberDisplayName = (member: { full_name?: string }) => {
  return member.full_name || 'ספק ללא שם';
};

export const stepTitles = ['בחירת איש צוות', 'סוג השירות', 'בחירת תאריך', 'בחירת שעה'];