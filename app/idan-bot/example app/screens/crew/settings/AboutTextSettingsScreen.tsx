import { useAuth } from '@/contexts/AuthContext';
import { ImageSection } from './components/Media/ImageSection';
import { uploadAboutImage } from '@/services/imageUpload';
import { getAppSettings, updateAppSettings } from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

export default function AboutTextSettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [aboutText, setAboutText] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const { data, error } = await getAppSettings();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setAboutText(settings?.about_text ?? '');
  }, [settings?.about_text]);

  const updateSettingsMutation = useMutation({
    mutationFn: updateAppSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון טקסט האודות');
    },
  });

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-center text-base text-gray-600">אין הרשאה לערוך את טקסט האודות</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">טוען הגדרות...</Text>
      </View>
    );
  }

  const trimmedAboutText = aboutText.trim();
  const hasTextChanges = trimmedAboutText !== (settings?.about_text?.trim() || '');
  const isSaveDisabled =
    updateSettingsMutation.isPending || isImageLoading || !hasTextChanges;

  const handleAboutImageEdit = async () => {
    try {
      setIsImageLoading(true);
      const imageUrl = await uploadAboutImage();
      await updateSettingsMutation.mutateAsync({ about_image_url: imageUrl });
      toast.success('תמונת האודות עודכנה');
    } catch (error: any) {
      if (error?.message !== 'Image selection was canceled') {
        toast.error('שגיאה בהעלאת תמונת האודות');
      }
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleAboutImageRemove = () => {
    Alert.alert('הסרת תמונה', 'האם להסיר את תמונת האודות?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsImageLoading(true);
            await updateSettingsMutation.mutateAsync({ about_image_url: null });
            toast.success('תמונת האודות הוסרה');
          } catch {
            toast.error('שגיאה בהסרת תמונת האודות');
          } finally {
            setIsImageLoading(false);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (isSaveDisabled) return;

    try {
      await updateSettingsMutation.mutateAsync({ about_text: trimmedAboutText || null });
      toast.success('טקסט האודות עודכן');
    } catch {
      // handled by mutation onError
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} disabled={isSaveDisabled}>
          <Text
            className={`px-4 text-base font-semibold ${isSaveDisabled ? 'text-gray-400' : 'text-black'}`}>
            {updateSettingsMutation.isPending ? 'שומר...' : 'שמירה'}
          </Text>
        </Pressable>
      ),
    });
  }, [handleSave, isSaveDisabled, navigation, updateSettingsMutation.isPending]);

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      <View className="mx-4 mt-6">
        <ImageSection
          title="תמונת אודות"
          subtitle="תמונה נפרדת לכרטיס האודות בדף הבית"
          imageUrl={settings?.about_image_url || undefined}
          onEdit={handleAboutImageEdit}
          onRemove={settings?.about_image_url ? handleAboutImageRemove : undefined}
          isLoading={isImageLoading || updateSettingsMutation.isPending}
        />
      </View>

      <View className="mt-2">
        <View className="mx-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <View className="border-b border-gray-100 px-4 py-3">
            <Text
              className="text-left text-base font-medium text-gray-900"
              style={{ direction: 'rtl' }}>
              טקסט אודות
            </Text>
            <Text className="text-left text-sm text-gray-500" style={{ direction: 'rtl' }}>
              טקסט שיופיע בגב הכרטיס המתהפך בדף הבית
            </Text>
          </View>

          <View className="p-4">
            <TextInput
              value={aboutText}
              onChangeText={setAboutText}
              placeholder="כתבו כאן טקסט אודות שיופיע בכרטיס..."
              multiline
              textAlignVertical="top"
              className="min-h-[220px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base text-gray-900"
              style={{ textAlign: 'right', direction: 'rtl' }}
            />
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-left text-xs text-gray-400" style={{ direction: 'rtl' }}>
                {trimmedAboutText.length} תווים
              </Text>
              {hasTextChanges && (
                <Text className="text-left text-xs font-medium text-amber-600" style={{ direction: 'rtl' }}>
                  יש שינויים שלא נשמרו
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <View className="mx-4 mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <View className="flex-row gap-3">
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <View className="flex-1 gap-1">
            <Text
              className="text-left text-sm font-semibold text-blue-900"
              style={{ direction: 'rtl' }}>
              מידע חשוב
            </Text>
            <Text
              className="text-left text-sm leading-6 text-blue-700"
              style={{ direction: 'rtl' }}>
              • הטקסט הטוב ביותר הוא 2 עד 6 שורות קצרות
              {'\n'}• אם אין טקסט, כרטיס האודות לא יוצג בדף הבית
              {'\n'}• מומלץ להשתמש בתמונה רוחבית ברורה ואיכותית
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: insets.bottom + 24 }} />
    </ScrollView>
  );
}
