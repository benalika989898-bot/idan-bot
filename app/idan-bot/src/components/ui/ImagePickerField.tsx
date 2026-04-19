import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/AppButton';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickAndUploadImage, takeAndUploadPhoto } from '@/services/imageUpload';

type ImagePickerFieldProps = {
  label: string;
  imageUrl: string;
  onImageChange: (url: string) => void;
  hint?: string;
  disabled?: boolean;
};

export function ImagePickerField({
  label,
  imageUrl,
  onImageChange,
  hint,
  disabled = false,
}: ImagePickerFieldProps) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);

  async function handlePick(mode: 'gallery' | 'camera') {
    setUploading(true);
    try {
      const result = mode === 'gallery' ? await pickAndUploadImage() : await takeAndUploadPhoto();
      onImageChange(result.url);
    } catch (error) {
      if (error instanceof Error && error.message.includes('canceled')) return;
      Alert.alert('העלאה נכשלה', error instanceof Error ? error.message : 'שגיאה לא ידועה');
    } finally {
      setUploading(false);
    }
  }

  function showOptions() {
    Alert.alert('תמונת פוסט', 'בחר איך להוסיף תמונה', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'בחר מהגלריה', onPress: () => void handlePick('gallery') },
      { text: 'צלם תמונה', onPress: () => void handlePick('camera') },
    ]);
  }

  function handleRemove() {
    onImageChange('');
  }

  const isDisabled = disabled || uploading;

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>

      {imageUrl ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.previewImage}
            contentFit="cover"
            transition={200}
          />
          <Pressable
            onPress={handleRemove}
            disabled={isDisabled}
            style={[styles.removeButton, { opacity: isDisabled ? 0.5 : 1 }]}>
            <ThemedText style={styles.removeButtonText}>X</ThemedText>
          </Pressable>
          <Pressable
            onPress={showOptions}
            disabled={isDisabled}
            style={[styles.replaceButton, { opacity: isDisabled ? 0.5 : 1 }]}>
            <ThemedText style={styles.replaceButtonText}>החלף</ThemedText>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={showOptions}
          disabled={isDisabled}
          style={[
            styles.emptyState,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
              opacity: isDisabled ? 0.5 : 1,
            },
          ]}>
          {uploading ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <>
              <ThemedText type="subtitle" style={styles.emptyIcon}>
                +
              </ThemedText>
              <ThemedText type="smallBold">העלה תמונה</ThemedText>
              <ThemedText themeColor="textSecondary">לחץ כדי לבחור תמונה לקמפיין</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                JPG, PNG
              </ThemedText>
            </>
          )}
        </Pressable>
      )}

      {imageUrl ? (
        <View style={styles.actionsRow}>
          <AppButton
            title="החלף תמונה"
            variant="secondary"
            disabled={isDisabled}
            onPress={showOptions}
            style={styles.actionButton}
          />
          <AppButton
            title="הסר"
            variant="ghost"
            disabled={isDisabled}
            onPress={handleRemove}
            style={styles.smallActionButton}
          />
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <AppButton
            title="העלה תמונה"
            variant="secondary"
            disabled={isDisabled}
            onPress={() => void handlePick('gallery')}
            style={styles.actionButton}
          />
          <AppButton
            title="צלם"
            variant="ghost"
            disabled={isDisabled}
            onPress={() => void handlePick('camera')}
            style={styles.smallActionButton}
          />
        </View>
      )}

      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
  smallActionButton: {
    minWidth: 96,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 18,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  replaceButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  replaceButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyState: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderRadius: 18,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  emptyIcon: {
    fontSize: 32,
    lineHeight: 36,
  },
});
