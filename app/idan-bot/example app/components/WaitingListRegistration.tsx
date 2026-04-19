import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert } from 'react-native';
import { Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Button from './ui/Button';

interface WaitingListRegistrationProps {
  appointmentTypeId?: string;
  crewMemberId?: string;
  onRegistrationComplete?: (waitingListId: string) => void;
  onCancel?: () => void;
}

interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
}

interface CrewMember {
  id: string;
  full_name: string;
}

const WaitingListRegistration: React.FC<WaitingListRegistrationProps> = ({
  appointmentTypeId,
  crewMemberId,
  onRegistrationComplete,
  onCancel,
}) => {
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [timeStart, setTimeStart] = useState<Date | null>(null);
  const [timeEnd, setTimeEnd] = useState<Date | null>(null);
  const [selectedAppointmentTypeId, setSelectedAppointmentTypeId] = useState(appointmentTypeId);
  const [selectedCrewMemberId, setSelectedCrewMemberId] = useState(crewMemberId);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeStartPicker, setShowTimeStartPicker] = useState(false);
  const [showTimeEndPicker, setShowTimeEndPicker] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  React.useEffect(() => {
    loadAppointmentTypes();
    loadCrewMembers();
  }, []);

  const loadAppointmentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_types')
        .select('id, name, duration_minutes')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      
      if (error) throw error;
      setAppointmentTypes(data || []);
    } catch (error) {
      console.error('Error loading appointment types:', error);
    }
  };

  const loadCrewMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'crew');
      
      if (error) throw error;
      setCrewMembers(data || []);
    } catch (error) {
      console.error('Error loading crew members:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('שגיאה', 'עליך להיות מחובר כדי להירשם לרשימת המתנה');
      return;
    }

    if (!selectedAppointmentTypeId) {
      Alert.alert('שגיאה', 'אנא בחר סוג טיפול');
      return;
    }

    setLoading(true);
    try {
      const waitingListEntry = {
        customer_id: user.id,
        preferred_date: preferredDate.toISOString().split('T')[0],
        preferred_time_start: timeStart ? timeStart.toTimeString().split(' ')[0] : null,
        preferred_time_end: timeEnd ? timeEnd.toTimeString().split(' ')[0] : null,
        appointment_type_id: selectedAppointmentTypeId,
        crew_member_id: selectedCrewMemberId || null,
        notes: notes.trim() || null,
        status: 'active',
      };

      const { data, error } = await supabase
        .from('waiting_list')
        .insert([waitingListEntry])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'נרשמת בהצלחה!',
        'נוסף לרשימת המתנה. תקבל הודעה כשמקום יתפנה.',
        [{ text: 'אישור', onPress: () => onRegistrationComplete?.(data.id) }]
      );
    } catch (error) {
      console.error('Error registering for waiting list:', error);
      Alert.alert('שגיאה', 'לא הצלחנו להוסיף אותך לרשימת המתנה. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'בחר שעה';
    return date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-8">
        <Text className="text-2xl font-bold text-black mb-6 text-right">
          הרשמה לרשימת המתנה
        </Text>
        
        <Text className="text-base text-gray-600 mb-8 text-right">
          הירשם לרשימת המתנה ותקבל הודעה ברגע שיתפנה מקום בתאריך הרצוי
        </Text>

        <View className="gap-6">
          {/* תאריך מועדף */}
          <View>
            <Text className="text-lg font-medium text-black mb-3 text-right">
              תאריך מועדף
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="border border-gray-200 rounded-lg p-4 bg-white">
              <Text className="text-base text-black text-right">
                {preferredDate.toLocaleDateString('he-IL')}
              </Text>
            </Pressable>
          </View>

          {/* טווח שעות (אופציונלי) */}
          <View>
            <Text className="text-lg font-medium text-black mb-3 text-right">
              טווח שעות מועדף (אופציונלי)
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-2 text-right">עד שעה</Text>
                <Pressable
                  onPress={() => setShowTimeEndPicker(true)}
                  className="border border-gray-200 rounded-lg p-4 bg-white">
                  <Text className="text-base text-black text-right">
                    {formatTime(timeEnd)}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-2 text-right">משעה</Text>
                <Pressable
                  onPress={() => setShowTimeStartPicker(true)}
                  className="border border-gray-200 rounded-lg p-4 bg-white">
                  <Text className="text-base text-black text-right">
                    {formatTime(timeStart)}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* סוג טיפול */}
          <View>
            <Text className="text-lg font-medium text-black mb-3 text-right">
              סוג טיפול
            </Text>
            <View className="gap-2">
              {appointmentTypes.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => setSelectedAppointmentTypeId(type.id)}
                  className={`border rounded-lg p-4 ${
                    selectedAppointmentTypeId === type.id
                      ? 'border-black bg-black'
                      : 'border-gray-200 bg-white'
                  }`}>
                  <Text className={`text-base text-right ${
                    selectedAppointmentTypeId === type.id
                      ? 'text-white'
                      : 'text-black'
                  }`}>
                    {type.name} ({type.duration_minutes} דקות)
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* בחירת איש צוות (אופציונלי) */}
          <View>
            <Text className="text-lg font-medium text-black mb-3 text-right">
              איש צוות מועדף (אופציונלי)
            </Text>
            <View className="gap-2">
              <Pressable
                onPress={() => setSelectedCrewMemberId(undefined)}
                className={`border rounded-lg p-4 ${
                  !selectedCrewMemberId
                    ? 'border-black bg-black'
                    : 'border-gray-200 bg-white'
                }`}>
                <Text className={`text-base text-right ${
                  !selectedCrewMemberId ? 'text-white' : 'text-black'
                }`}>
                  כל איש צוות זמין
                </Text>
              </Pressable>
              {crewMembers.map((crew) => (
                <Pressable
                  key={crew.id}
                  onPress={() => setSelectedCrewMemberId(crew.id)}
                  className={`border rounded-lg p-4 ${
                    selectedCrewMemberId === crew.id
                      ? 'border-black bg-black'
                      : 'border-gray-200 bg-white'
                  }`}>
                  <Text className={`text-base text-right ${
                    selectedCrewMemberId === crew.id
                      ? 'text-white'
                      : 'text-black'
                  }`}>
                    {crew.full_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* הערות */}
          <View>
            <Text className="text-lg font-medium text-black mb-3 text-right">
              הערות (אופציונלי)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="הוסף הערות או בקשות מיוחדות..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlign="right"
              className="border border-gray-200 rounded-lg p-4 bg-white text-black"
            />
          </View>

          {/* כפתורים */}
          <View className="flex-row gap-3 pt-6">
            {onCancel && (
              <View className="flex-1">
                <Button
                  title="ביטול"
                  onPress={onCancel}
                  variant="outline"
                  disabled={loading}
                />
              </View>
            )}
            <View className="flex-1">
              <Button
                title={loading ? "מוסיף לרשימה..." : "הירשם לרשימת המתנה"}
                onPress={handleSubmit}
                disabled={loading}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={preferredDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setPreferredDate(selectedDate);
            }
          }}
        />
      )}

      {/* Time Start Picker */}
      {showTimeStartPicker && (
        <DateTimePicker
          value={timeStart || new Date()}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimeStartPicker(false);
            if (selectedTime) {
              setTimeStart(selectedTime);
            }
          }}
        />
      )}

      {/* Time End Picker */}
      {showTimeEndPicker && (
        <DateTimePicker
          value={timeEnd || new Date()}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimeEndPicker(false);
            if (selectedTime) {
              setTimeEnd(selectedTime);
            }
          }}
        />
      )}
    </ScrollView>
  );
};

export default WaitingListRegistration;
