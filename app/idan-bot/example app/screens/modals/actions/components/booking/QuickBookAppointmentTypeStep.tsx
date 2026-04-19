import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { AppointmentType } from '@/types/appointments';

interface QuickBookAppointmentTypeStepProps {
  appointmentTypes: AppointmentType[];
  selectedAppointmentType: AppointmentType | null;
  setSelectedAppointmentType: (type: AppointmentType) => void;
}

const QuickBookAppointmentTypeStep: React.FC<QuickBookAppointmentTypeStepProps> = ({
  appointmentTypes,
  selectedAppointmentType,
  setSelectedAppointmentType,
}) => {
  return (
    <View className="flex-1" style={{ direction: 'rtl' }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {appointmentTypes.map((type, index) => {
            const isSelected = selectedAppointmentType?.id === type.id;
            return (
              <Pressable
                key={type.id}
                onPress={() => setSelectedAppointmentType(type)}
                className={`py-5 ${index < appointmentTypes.length - 1 ? 'border-b border-white/20' : ''} ${
                  isSelected ? 'bg-white/10' : ''
                }`}
                style={{
                  marginHorizontal: isSelected ? -24 : 0,
                  paddingHorizontal: isSelected ? 24 : 0,
                  borderRadius: isSelected ? 12 : 0,
                }}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      {isSelected && <View className="ml-2 h-2 w-2 rounded-full bg-white" />}
                      <Text
                        className={`text-left text-lg font-semibold ${isSelected ? 'text-white' : 'text-white'}`}>
                        {type.name}
                      </Text>
                    </View>
                    {type.description && (
                      <Text className="mt-1 text-left text-sm leading-5 text-white/70">
                        {type.description}
                      </Text>
                    )}
                    <View className="mt-2 flex-row items-center">
                      <View className="flex-row items-center">
                        <Text className="text-xs text-white/60">משך הטיפול: </Text>
                        <Text className="text-xs font-medium text-white/80">
                          {type.duration_minutes} דקות
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-bold text-white">
                      {type.price ? `₪${type.price}` : 'ללא עלות'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default QuickBookAppointmentTypeStep;
