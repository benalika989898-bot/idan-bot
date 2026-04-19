import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { User } from '@/types/auth';
import { Ionicons } from '@expo/vector-icons';

interface CrewMemberSelectionStepProps {
  crewMembers: User[];
  selectedCrewMember: User | null;
  setSelectedCrewMember: (member: User) => void;
  loading: boolean;
  refreshControl?: React.ReactElement;
}

const CrewMemberSelectionStep: React.FC<CrewMemberSelectionStepProps> = ({
  crewMembers,
  selectedCrewMember,
  setSelectedCrewMember,
  loading,
  refreshControl,
}) => {
  const getCrewMemberDisplayName = (member: User) => {
    if (member.full_name) {
      return member.full_name;
    }
    return 'ספק ללא שם';
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ direction: 'rtl' }}>
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-4 text-gray-500">טוען אנשי צוות...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ direction: 'rtl' }}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}>
      <View className="px-6 py-6">
        {crewMembers.length > 0 ? (
          crewMembers.map((member, index) => {
            const isSelected = selectedCrewMember?.id === member.id;
            return (
              <Pressable
                key={member.id}
                onPress={() => setSelectedCrewMember(member)}
                className={`py-5 ${index < crewMembers.length - 1 ? 'border-b border-gray-100' : ''} ${
                  isSelected ? 'bg-gray-50' : ''
                }`}
                style={{
                  marginHorizontal: isSelected ? -24 : 0,
                  paddingHorizontal: isSelected ? 24 : 0,
                }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    {isSelected && <View className="ml-2 h-2 w-2 rounded-full bg-black" />}
                    <Image
                      source={{
                        uri: member.avatar_url || 'https://via.placeholder.com/40',
                      }}
                      style={{ height: 40, width: 40, borderRadius: 20 }}
                      contentFit="cover"
                      transition={300}
                      className="bg-gray-200"
                    />
                    <View>
                      <Text
                        className={`text-lg font-semibold ${isSelected ? 'text-black' : 'text-black'}`}>
                        {getCrewMemberDisplayName(member)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-back" size={16} color="#d1d5db" />
                </View>
              </Pressable>
            );
          })
        ) : (
          <View className="items-center py-8">
            <Text className="text-center text-lg text-gray-500">אין אנשי צוות זמינים</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default CrewMemberSelectionStep;
