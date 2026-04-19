import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { toast } from 'sonner-native';
import { sendMessageToAllCustomers } from '@/services/crew/messages';

const SendMessageScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendMessageMutation = useMutation({
    mutationFn: sendMessageToAllCustomers,
    onSuccess: () => {
      router.back();
      setTimeout(() => toast.success('הודעה נשלחה בהצלחה לכל הלקוחות!'), 300);
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('שגיאה בשליחת ההודעה');
    },
  });

  const handleSendMessage = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }

    if (!user?.id) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendMessageMutation.mutateAsync({
        title: title.trim(),
        content: message.trim(),
        crew_member_id: user.id,
      });
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = title.trim().length > 0 && message.trim().length > 0;
  const isButtonDisabled = !isValid || isSubmitting;

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={handleSendMessage} disabled={isButtonDisabled}>
          <Text className={`text-base font-semibold ${isButtonDisabled ? 'text-gray-400' : 'text-black'}`}>
            {isSubmitting ? 'שולח...' : 'שלח'}
          </Text>
        </Pressable>
      ),
    });
  }, [isButtonDisabled, isSubmitting, title, message]);

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      bottomOffset={40}>
      {/* Title Input */}
      <View className="gap-2 px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">כותרת ההודעה</Text>
        <TextInput
          className="rounded-lg bg-gray-50 px-4 py-3 text-right text-gray-900"
          placeholder="לדוגמה: עדכון חשוב מהסלון"
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text className="text-left text-xs text-gray-400">{title.length}/100 תווים</Text>
      </View>

      <View className="px-6">
        <View className="h-px bg-gray-100" />
      </View>

      {/* Message Input */}
      <View className="gap-2 px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">תוכן ההודעה</Text>
        <TextInput
          className="h-40 rounded-lg bg-gray-50 px-4 py-3 text-right text-gray-900"
          placeholder="כתבי כאן את תוכן ההודעה שתרצי לשלוח לכל הלקוחות..."
          placeholderTextColor="#9ca3af"
          value={message}
          onChangeText={setMessage}
          maxLength={500}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />
        <Text className="text-left text-xs text-gray-400">{message.length}/500 תווים</Text>
      </View>

      <View className="px-6">
        <View className="h-px bg-gray-100" />
      </View>

      {/* Preview Section */}
      {(title.trim() || message.trim()) && (
        <View className="gap-2 px-6 py-4">
          <Text className="text-left text-xs font-medium text-gray-500">תצוגה מקדימה</Text>
          <View className="gap-2 rounded-lg bg-gray-50 px-4 py-3">
            {title.trim() && (
              <Text className="text-left text-base font-bold text-gray-900">{title}</Text>
            )}
            {message.trim() && (
              <Text className="text-left text-sm text-gray-700">{message}</Text>
            )}
          </View>
        </View>
      )}
    </KeyboardAwareScrollView>
  );
};

export default SendMessageScreen;
