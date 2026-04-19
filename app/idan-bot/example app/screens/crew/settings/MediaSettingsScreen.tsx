import { ImageSection } from './components/Media/ImageSection';
import { StoryImage } from './components/Media/StoryImage';
import BottomSpacing from '@/components/ui/BottomSpacing';
import { uploadHeroImage, uploadStoryMedia } from '@/services/imageUpload';
import { getAppSettings, updateAppSettings } from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

export default function MediaSettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [loadingStates, setLoadingStates] = useState({
    heroEdit: false,
    heroRemove: false,
    storyAdd: false,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const { data, error } = await getAppSettings();
      if (error) throw error;
      return data;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateAppSettings,
    onSuccess: () => {
      toast.success('התמונות עודכנו בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון התמונות');
    },
  });

  const handleHeroImageEdit = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, heroEdit: true }));
      const imageUrl = await uploadHeroImage();
      updateSettingsMutation.mutate({ hero_image_url: imageUrl });
    } catch (error: any) {
      if (error.message !== 'Image selection was canceled') {
        toast.error('שגיאה בהעלאת התמונה');
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, heroEdit: false }));
    }
  };

  const handleHeroImageRemove = () => {
    Alert.alert('הסרת תמונה', 'האם אתה בטוח שברצונך להסיר את תמונת הרקע?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר',
        style: 'destructive',
        onPress: () => {
          setLoadingStates((prev) => ({ ...prev, heroRemove: true }));
          updateSettingsMutation.mutate(
            { hero_image_url: null },
            {
              onSettled: () => {
                setLoadingStates((prev) => ({ ...prev, heroRemove: false }));
              },
            }
          );
        },
      },
    ]);
  };

  const handleAddStoryMedia = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, storyAdd: true }));
      const mediaUrls = await uploadStoryMedia();
      const currentMedia = settings?.stories_image_urls || [];
      const newMedia = [...currentMedia, ...mediaUrls];
      updateSettingsMutation.mutate({ stories_image_urls: newMedia });
    } catch (error: any) {
      if (error.message !== 'Media selection was canceled') {
        toast.error('שגיאה בהעלאת המדיה');
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, storyAdd: false }));
    }
  };

  const handleRemoveStoryImage = (index: number) => {
    Alert.alert('הסרת תמונה', 'האם אתה בטוח שברצונך להסיר תמונה זו מהסטורי?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר',
        style: 'destructive',
        onPress: () => {
          const currentImages = settings?.stories_image_urls || [];
          const newImages = currentImages.filter((_, i) => i !== index);
          updateSettingsMutation.mutate({ stories_image_urls: newImages });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">טוען תמונות...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Hero Image */}
      <View className="mt-6">
        <ImageSection
          title="תמונת רקע ראשית"
          subtitle="תמונה שתוצג בדף הבית של האפליקציה"
          imageUrl={settings?.hero_image_url}
          onEdit={handleHeroImageEdit}
          onRemove={settings?.hero_image_url ? handleHeroImageRemove : undefined}
          isLoading={loadingStates.heroEdit || loadingStates.heroRemove}
        />
      </View>

      {/* Story Images */}
      <View className="mt-2">
        <View className="mx-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <View className="border-b border-gray-100 px-4 py-3">
            <Text
              className="text-left text-base font-medium text-gray-900"
              style={{ direction: 'rtl' }}>
              מדיה סטורי
            </Text>
            <Text className="text-left text-sm text-gray-500" style={{ direction: 'rtl' }}>
              תמונות וסרטונים שיוצגו בחלק הסטוריז באפליקציה
            </Text>
          </View>

          <View className="p-4">
            <Animated.View layout={LinearTransition} className="flex-row flex-wrap">
              {settings?.stories_image_urls?.map((mediaUrl, index) => (
                <StoryImage
                  key={index}
                  mediaUrl={mediaUrl}
                  onRemove={() => handleRemoveStoryImage(index)}
                />
              ))}
              <Animated.View layout={LinearTransition}>
                <Pressable
                  onPress={handleAddStoryMedia}
                  disabled={loadingStates.storyAdd}
                  className="mb-3 mr-3 h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#f9fafb' : '#fafafa',
                    borderColor: pressed ? '#d1d5db' : '#e5e7eb',
                    opacity: loadingStates.storyAdd ? 0.6 : 1,
                  })}>
                  {loadingStates.storyAdd ? (
                    <ActivityIndicator size="small" color="#6b7280" />
                  ) : (
                    <Ionicons name="add" size={20} color="#6b7280" />
                  )}
                </Pressable>
              </Animated.View>
            </Animated.View>

            {(settings?.stories_image_urls?.length || 0) === 0 && (
              <View className="items-center py-8">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Ionicons name="images-outline" size={20} color="#6b7280" />
                </View>
                <Text className="text-center text-sm text-gray-500" style={{ direction: 'rtl' }}>
                  עדיין לא נוספו תמונות או סרטונים לסטורי
                </Text>
                <Text
                  className="mt-1 text-center text-xs text-gray-400"
                  style={{ direction: 'rtl' }}>
                  הוסף תמונות וסרטונים כדי ליצור גלריית סטוריז
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View className="mx-4 mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <View className="flex-row gap-3">
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <View className="flex-1 gap-1">
            <Text
              className="text-left text-sm font-semibold text-blue-900"
              style={{ direction: 'rtl' }}>
              טיפים לתמונות
            </Text>
            <Text
              className="text-left text-sm leading-6 text-blue-700"
              style={{ direction: 'rtl' }}>
              • השתמש בתמונות באיכות גבוהה (לפחות 1080p)
              {'\n'}• תמונת רקע: יחס 16:9 (רוחב יותר מגובה)
              {'\n'}• תמונות סטורי: יחס 9:16 (גובה יותר מרוחב)
              {'\n'}• ניתן להעלות גם סרטוני וידאו לסטוריז
              {'\n'}• הקפד על תמונות מקצועיות שמייצגות את העסק
            </Text>
          </View>
        </View>
      </View>

      <BottomSpacing />
    </ScrollView>
  );
}
