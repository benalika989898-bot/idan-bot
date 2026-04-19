import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/AppButton';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GroupUrlItem = {
  id: string;
  url: string;
};

const cardLayout = LinearTransition.duration(180);
const cardEntering = FadeInDown.duration(180);

export function createGroupUrlItem(url = ''): GroupUrlItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
  };
}

type GroupUrlsFieldProps = {
  label: string;
  items: GroupUrlItem[];
  onChange: (items: GroupUrlItem[]) => void;
  hint?: string;
  disabled?: boolean;
};

export function GroupUrlsField({
  label,
  items,
  onChange,
  hint,
  disabled = false,
}: GroupUrlsFieldProps) {
  const theme = useTheme();
  const filledCount = items.filter((item) => item.url.trim()).length;

  function updateItem(id: string, url: string) {
    onChange(items.map((item) => (item.id === id ? { ...item, url } : item)));
  }

  function addItem() {
    onChange([...items, createGroupUrlItem()]);
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      onChange([createGroupUrlItem()]);
      return;
    }

    onChange(items.filter((item) => item.id !== id));
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {filledCount} קבוצות
        </ThemedText>
      </View>

      <View style={styles.list}>
        {items.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={cardEntering}
            layout={cardLayout}
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.indexBadge,
                  { backgroundColor: theme.background },
                ]}>
                <ThemedText type="smallBold">קבוצה {index + 1}</ThemedText>
              </View>
              <Pressable
                onPress={() => removeItem(item.id)}
                disabled={disabled}
                hitSlop={8}
                style={({ pressed }) => ({
                  opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
                })}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {items.length === 1 ? 'נקה' : 'הסר'}
                </ThemedText>
              </Pressable>
            </View>

            <TextInput
              className="text-left"
              value={item.url}
              onChangeText={(text) => updateItem(item.id, text)}
              placeholder="https://www.facebook.com/groups/123"
              placeholderTextColor={theme.textSecondary}
              editable={!disabled}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            />
          </Animated.View>
        ))}
      </View>

      <AppButton
        title="הוסף קבוצה"
        variant="secondary"
        disabled={disabled}
        onPress={addItem}
      />

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indexBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'left',
  },
});
