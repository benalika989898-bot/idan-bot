import { useAuth } from '@/contexts/AuthContext';
import {
  createMessageBoardMessage,
  fetchMessageBoardEditorMessage,
  updateMessageBoardMessage,
} from '@/services/messageBoard';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { toast } from 'sonner-native';

export default function MessageBoardFormScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(true);

  const { data: entry, isLoading } = useQuery({
    queryKey: ['message-board-editor'],
    queryFn: fetchMessageBoardEditorMessage,
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!entry) return;
    setTitle(entry.title);
    setMessage(entry.message);
    setActive(entry.active);
  }, [entry]);

  const createMutation = useMutation({
    mutationFn: createMessageBoardMessage,
    onSuccess: () => {
      toast.success('ההודעה נשמרה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['message-board'] });
      queryClient.invalidateQueries({ queryKey: ['message-board-latest'] });
      queryClient.invalidateQueries({ queryKey: ['message-board-editor'] });
    },
    onError: () => toast.error('שגיאה בשמירת ההודעה'),
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      updateMessageBoardMessage(entry!.id, {
        title,
        message,
        active,
      }),
    onSuccess: () => {
      toast.success('ההודעה נשמרה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['message-board'] });
      queryClient.invalidateQueries({ queryKey: ['message-board-latest'] });
      queryClient.invalidateQueries({ queryKey: ['message-board-editor'] });
    },
    onError: () => toast.error('שגיאה בשמירת ההודעה'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isFormValid = title.trim().length > 0 && message.trim().length > 0;
  const hasChanges = useMemo(() => {
    if (!entry) return true;
    return title !== entry.title || message !== entry.message || active !== entry.active;
  }, [active, entry, message, title]);
  const isButtonDisabled = isPending || !isFormValid || (!!entry && !hasChanges);
  const buttonTitle = isPending ? 'שומר...' : 'שמירה';

  const handleSave = () => {
    if (!isFormValid) {
      toast.error('יש למלא כותרת והודעה');
      return;
    }
    if (entry?.id) {
      updateMutation.mutate();
      return;
    }
    createMutation.mutate({ title, message, active });
  };

  useEffect(() => {
    navigation.setOptions({
      title: 'לוח הודעות',
      headerRight: () => (
        <Pressable onPress={handleSave} disabled={isButtonDisabled}>
          <Text
            className={`px-6 text-base font-semibold ${isButtonDisabled ? 'text-gray-400' : 'text-black'}`}>
            {buttonTitle}
          </Text>
        </Pressable>
      ),
    });
  }, [buttonTitle, handleSave, isButtonDisabled, navigation]);

  if (!isAdmin) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white px-6"
        style={{ direction: 'rtl' }}>
        <Text className="text-center text-base text-gray-700">אין לך הרשאה לצפות במסך זה.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">טוען הודעה...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      style={{ direction: 'rtl' }}
      showsVerticalScrollIndicator={false}>
      <View className="p-4">
        <View className="mb-4">
          <Text className="mb-2 text-left font-medium text-gray-700">כותרת *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="כותרת ההודעה"
            editable={!isPending}
            maxLength={80}
            className="rounded-lg bg-white p-3 text-right disabled:bg-gray-100"
          />
        </View>

        <View className="mb-4">
          <Text className="mb-2 text-left font-medium text-gray-700">תוכן ההודעה *</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="כתוב את תוכן ההודעה..."
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={!isPending}
            maxLength={600}
            className="min-h-[140px] rounded-lg bg-white p-3 text-right disabled:bg-gray-100"
          />
        </View>

        <View className="rounded-lg bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-left font-medium text-gray-700">הודעה פעילה</Text>
            <Switch value={active} onValueChange={setActive} disabled={isPending} />
          </View>
        </View>
        <Text className="mt-3 text-left text-xs text-gray-500">
          ניתן להציג רק הודעה אחת פעילה ללקוחות בכל רגע.
        </Text>
        <View className="mt-3 rounded-lg bg-blue-50 p-4">
          <View className="flex-row gap-3">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View className="flex-1 gap-1">
              <Text className="text-left text-sm font-medium text-blue-900">הערה חשובה למנהל</Text>
              <Text className="text-left text-sm text-blue-700" style={{ direction: 'rtl' }}>
                ההודעה תופיע ללקוח פעם אחת בלבד אחרי פרסום או עדכון, ולא בכל כניסה לאפליקציה.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
