import React, { useState } from 'react';
import { View, Text, Modal, Alert, TextInput } from 'react-native';
import { Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Button from './ui/Button';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';

interface WaitingListModalProps {
  visible: boolean;
  onClose: () => void;
  onRegistrationComplete: () => void;
  selectedDate: string;
  appointmentType: AppointmentType | null;
  crewMember: User | null;
}

const WaitingListModal: React.FC<WaitingListModalProps> = ({
  visible,
  onClose,
  onRegistrationComplete,
  selectedDate,
  appointmentType,
  crewMember,
}) => {
  const [timeStart, setTimeStart] = useState<Date | null>(null);
  const [timeEnd, setTimeEnd] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [showTimeStartPicker, setShowTimeStartPicker] = useState(false);
  const [showTimeEndPicker, setShowTimeEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  const formatTime = (date: Date | null) => {
    if (!date) return 'בחר שעה (אופציונלי)';
    return date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const handleSubmit = async () => {
    if (!user || !appointmentType) {
      Alert.alert('שגיאה', 'נתונים חסרים לרישום');
      return;
    }

    setLoading(true);
    try {
      const waitingListEntry = {
        customer_id: user.id,
        preferred_date: selectedDate,
        preferred_time_start: timeStart ? timeStart.toTimeString().split(' ')[0] : null,
        preferred_time_end: timeEnd ? timeEnd.toTimeString().split(' ')[0] : null,
        appointment_type_id: appointmentType.id,
        crew_member_id: crewMember?.id || null,
        notes: notes.trim() || null,
        status: 'active',
      };

      const { error } = await supabase
        .from('waiting_list')
        .insert([waitingListEntry]);

      if (error) throw error;

      Alert.alert(
        'נרשמת בהצלחה!',
        'נוסף לרשימת המתנה. תקבל הודעה כשמקום יתפנה.',
        [{ text: 'אישור', onPress: onRegistrationComplete }]
      );
    } catch (error) {
      console.error('Error registering for waiting list:', error);
      Alert.alert('שגיאה', 'לא הצלחנו להוסיף אותך לרשימת המתנה. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTimeStart(null);
    setTimeEnd(null);
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet">
      <View className="flex-1 bg-white">
        <View className="px-6 py-8">
          <View className="flex-row justify-between items-center mb-6">
            <Pressable onPress={handleClose}>
              <Text className="text-blue-600 text-lg">ביטול</Text>
            </Pressable>
            <Text className="text-xl font-bold text-black">
              הירשם לרשימת המתנה
            </Text>
            <View className="w-12" />
          </View>

          <Text className="text-base text-gray-600 mb-8 text-right">
            נרשם לרשימת המתנה ותקבל הודעה ברגע שיתפנה מקום
          </Text>

          {/* פרטי הטיפול */}
          <View className="bg-gray-50 rounded-lg p-4 mb-6">
            <Text className="text-lg font-semibold text-black mb-3 text-right">
              פרטי הטיפול
            </Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">סוג טיפול:</Text>
                <Text className="text-black font-medium">
                  {appointmentType?.name}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">תאריך מועדף:</Text>
                <Text className="text-black font-medium">
                  {formatDate(selectedDate)}
                </Text>
              </View>
              {crewMember && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">איש צוות:</Text>
                  <Text className="text-black font-medium">
                    {crewMember.full_name || 'ללא שם'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* טווח שעות מועדף */}
          <View className="mb-6">
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

          {/* הערות */}
          <View className="mb-6">
            <Text className="text-lg font-medium text-black mb-3 text-right">
              הערות (אופציונלי)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="הוסף הערות או בקשות מיוחדות..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlign="right"
              className="border border-gray-200 rounded-lg p-4 bg-white text-black"
            />
          </View>

          {/* כפתור הירשמות */}
          <Button
            title={loading ? "נרשם..." : "הירשם לרשימת המתנה"}
            onPress={handleSubmit}
            disabled={loading}
          />
        </View>

        {/* Time Pickers */}
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
      </View>
    </Modal>
  );
};

export default WaitingListModal;