import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { GroupUrlsField, createGroupUrlItem, type GroupUrlItem } from '@/components/ui/GroupUrlsField';
import { ImagePickerField } from '@/components/ui/ImagePickerField';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { schedulerKeys } from '@/lib/query';
import {
  createScheduledPost,
  deleteScheduledPost,
  ensureGroups,
  getScheduledPost,
  getPrimaryAccount,
  listGroups,
  parseGroupUrls,
  savePrimaryAccount,
  updateScheduledPost,
} from '@/services/scheduler';

function makeDefaultScheduleDate(offsetMinutes = 15) {
  return new Date(Date.now() + offsetMinutes * 60_000);
}

function buildGroupUrlItems(urls: string[]) {
  return urls.length > 0 ? urls.map((url) => createGroupUrlItem(url)) : [createGroupUrlItem()];
}

function serializeGroupUrlItems(items: GroupUrlItem[]) {
  return items.map((item) => item.url).join('\n');
}

export default function CampaignModalScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [message, setMessage] = useState<string | null>(null);

  // Account fields
  const [accountId, setAccountId] = useState<string | null>(null);
  const [facebookEmail, setFacebookEmail] = useState('');
  const [facebookPassword, setFacebookPassword] = useState('');

  // Post fields
  const [enabled, setEnabled] = useState(true);
  const [scheduledAt, setScheduledAt] = useState(makeDefaultScheduleDate);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [groupUrls, setGroupUrls] = useState<GroupUrlItem[]>([createGroupUrlItem()]);

  const accountHydratedRef = useRef(false);
  const createGroupsHydratedRef = useRef(false);
  const postHydratedRef = useRef(false);
  const postGroupsHydratedRef = useRef(false);

  const accountQuery = useQuery({
    queryKey: schedulerKeys.primaryAccount(),
    queryFn: getPrimaryAccount,
    enabled: Boolean(session?.user),
  });

  const groupsQuery = useQuery({
    queryKey: schedulerKeys.groups(accountQuery.data?.id ?? 'none'),
    queryFn: () => listGroups(accountQuery.data!.id),
    enabled: Boolean(accountQuery.data?.id),
  });

  const postQuery = useQuery({
    queryKey: id ? schedulerKeys.scheduledPost(id) : [...schedulerKeys.all, 'scheduledPost', 'new'],
    queryFn: () => getScheduledPost(id!),
    enabled: Boolean(session?.user && id),
  });

  useEffect(() => {
    if (!accountQuery.data || accountHydratedRef.current) {
      return;
    }

    setAccountId(accountQuery.data.id);
    setFacebookEmail(accountQuery.data.email ?? '');
    setFacebookPassword(accountQuery.data.password ?? '');
    accountHydratedRef.current = true;
  }, [accountQuery.data]);

  useEffect(() => {
    if (isEditMode || !groupsQuery.data || createGroupsHydratedRef.current) {
      return;
    }

    setGroupUrls(buildGroupUrlItems(groupsQuery.data.map((group) => group.url)));
    createGroupsHydratedRef.current = true;
  }, [groupsQuery.data, isEditMode]);

  useEffect(() => {
    if (!postQuery.data || postHydratedRef.current) {
      return;
    }

    setContent(postQuery.data.content);
    setImageUrl(postQuery.data.image_url ?? '');
    setScheduledAt(new Date(postQuery.data.scheduled_at));
    setEnabled(postQuery.data.status !== 'disabled');
    postHydratedRef.current = true;
  }, [postQuery.data]);

  useEffect(() => {
    if (!isEditMode || !postQuery.data || !groupsQuery.data || postGroupsHydratedRef.current) {
      return;
    }

    const groupMap = new Map(groupsQuery.data.map((group) => [group.id, group.url]));
    const postGroupUrls = postQuery.data.group_ids
      .map((groupId) => groupMap.get(groupId))
      .filter(Boolean) as string[];

    setGroupUrls(
      buildGroupUrlItems(
        postGroupUrls.length > 0 ? postGroupUrls : groupsQuery.data.map((group) => group.url)
      )
    );
    postGroupsHydratedRef.current = true;
  }, [groupsQuery.data, isEditMode, postQuery.data]);

  useEffect(() => {
    const queryError = accountQuery.error ?? groupsQuery.error ?? postQuery.error;
    if (!queryError) {
      return;
    }

    const nextMessage =
      queryError instanceof Error ? queryError.message : 'שגיאה בטעינת הנתונים';
    setMessage(nextMessage);
    toast.error(nextMessage);
  }, [accountQuery.error, groupsQuery.error, postQuery.error]);

  const saveTitle = isEditMode ? 'שמור' : 'צור';
  const normalizedGroupUrls = parseGroupUrls(serializeGroupUrlItems(groupUrls));
  const hasPostContent = content.trim().length > 0;
  const hasFacebookAccount =
    facebookEmail.trim().length > 0 && facebookPassword.trim().length > 0;
  const canSubmit = hasPostContent && hasFacebookAccount && normalizedGroupUrls.length > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user) {
        throw new Error('יש להתחבר כדי לשמור קמפיין.');
      }

      const account = await savePrimaryAccount({
        existingId: accountId,
        userId: session.user.id,
        email: facebookEmail.trim(),
        password: facebookPassword,
      });

      const groups = await ensureGroups(account.id, normalizedGroupUrls);
      const groupIds = groups.map((group) => group.id);

      if (isEditMode && id) {
        await updateScheduledPost(id, {
          content: content.trim(),
          image_url: imageUrl.trim() || null,
          scheduled_at: scheduledAt.toISOString(),
          status: enabled ? 'pending' : 'disabled',
          group_ids: groupIds,
        });
        return;
      }

      await createScheduledPost({
        accountId: account.id,
        groupIds,
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        scheduledAt: scheduledAt.toISOString(),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: schedulerKeys.all }),
        id
          ? queryClient.invalidateQueries({ queryKey: schedulerKeys.scheduledPost(id) })
          : Promise.resolve(),
      ]);

      toast.success(isEditMode ? 'הקמפיין נשמר' : 'הקמפיין נוצר');
      router.back();
    },
    onError: (error) => {
      const nextMessage =
        error instanceof Error ? error.message : 'שגיאה בשמירת הקמפיין.';
      setMessage(nextMessage);
      toast.error(nextMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error('לא נמצא קמפיין למחיקה.');
      }

      await deleteScheduledPost(id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: schedulerKeys.all }),
        id
          ? queryClient.removeQueries({ queryKey: schedulerKeys.scheduledPost(id) })
          : Promise.resolve(),
      ]);

      toast.success('הקמפיין נמחק');
      router.back();
    },
    onError: (error) => {
      const nextMessage =
        error instanceof Error ? error.message : 'שגיאה במחיקת הקמפיין.';
      setMessage(nextMessage);
      toast.error(nextMessage);
    },
  });

  const handleSave = useCallback(async () => {
    if (!session?.user) return;

    if (!content.trim()) {
      const nextMessage = 'כתוב את תוכן הפוסט לפני השמירה.';
      setMessage(nextMessage);
      toast.error(nextMessage);
      return;
    }

    if (normalizedGroupUrls.length === 0) {
      const nextMessage = 'הוסף לפחות כתובת קבוצה אחת לפני השמירה.';
      setMessage(nextMessage);
      toast.error(nextMessage);
      return;
    }

    setMessage(null);
    saveMutation.mutate();
  }, [content, normalizedGroupUrls.length, saveMutation, session?.user]);

  const handleDelete = useCallback(() => {
    if (!id) {
      return;
    }

    Alert.alert('מחיקת קמפיין', 'למחוק את הקמפיין הזה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: () => {
          setMessage(null);
          deleteMutation.mutate();
        },
      },
    ]);
  }, [deleteMutation, id]);

  const handleSaveRef = useRef(handleSave);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const saving = saveMutation.isPending;
  const deleting = deleteMutation.isPending;
  const submitDisabled = !canSubmit || saving || deleting;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: isEditMode ? 'עריכת קמפיין' : 'קמפיין חדש',
      presentation: 'modal',
      headerRight: () => (
        <Pressable
          onPress={() => void handleSaveRef.current()}
          disabled={submitDisabled}
          hitSlop={8}>
          <ThemedText
            type="smallBold"
            style={{
              color: submitDisabled ? theme.textSecondary : theme.text,
              paddingHorizontal: Spacing.two,
            }}>
            {saving ? 'שומר...' : saveTitle}
          </ThemedText>
        </Pressable>
      ),
    });
  }, [
    isEditMode,
    navigation,
    saveTitle,
    saving,
    submitDisabled,
    theme.text,
    theme.textSecondary,
  ]);

  const loadingPost =
    accountQuery.isPending || (isEditMode && (postQuery.isPending || groupsQuery.isPending));

  if (loadingPost) {
    return (
      <ThemedView style={styles.loadingState}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.select({ ios: 'padding', default: undefined })}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.formContent}>
              {/* Enable/Disable switch — only in edit mode */}
              {isEditMode ? (
                <View
                  style={[
                    styles.switchRow,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}>
                  <ThemedText type="smallBold">פעיל</ThemedText>
                  <Switch
                    value={enabled}
                    onValueChange={setEnabled}
                    trackColor={{ false: '#ccc', true: '#34C759' }}
                    disabled={saving}
                  />
                </View>
              ) : null}

              {/* Date & Time */}
              <DateTimeField
                label="תאריך ושעה"
                value={scheduledAt}
                onChange={setScheduledAt}
                minimumDate={new Date()}
                hint="מתי הפוסט ישלח."
              />

              {/* Post content */}
              <TextField
                label="תוכן הפוסט"
                multiline
                value={content}
                onChangeText={setContent}
                placeholder="כתוב את ההודעה שתפורסם..."
                editable={!saving}
              />

              {/* Image */}
              <ImagePickerField
                label="תמונה (אופציונלי)"
                imageUrl={imageUrl}
                onImageChange={setImageUrl}
                hint="לא חובה להעלות תמונה. אפשר לשמור גם בלי תמונה."
                disabled={saving}
              />

              {/* Group URLs */}
              <GroupUrlsField
                label="כתובות קבוצות"
                items={groupUrls}
                onChange={setGroupUrls}
                hint="הוסף כל קבוצה כשורה נפרדת, עם אנימציית מעבר כמו במסך ה-schedule."
                disabled={saving}
              />

              {/* Facebook credentials */}
              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}>
                <ThemedText type="smallBold">חשבון פייסבוק</ThemedText>
                <TextField
                  label="אימייל"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={facebookEmail}
                  onChangeText={setFacebookEmail}
                  placeholder="email@example.com"
                  editable={!saving}
                />
                <TextField
                  label="סיסמה"
                  secureTextEntry
                  value={facebookPassword}
                  onChangeText={setFacebookPassword}
                  placeholder="סיסמת פייסבוק"
                  editable={!saving}
                />
              </View>

              {/* Message */}
              {message ? (
                <View
                  style={[
                    styles.messageCard,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}>
                  <ThemedText>{message}</ThemedText>
                </View>
              ) : null}

              {isEditMode ? (
                <Pressable
                  onPress={handleDelete}
                  disabled={saving || deleting}
                  style={[
                    styles.deleteButton,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: '#F2B8B5',
                      opacity: saving || deleting ? 0.55 : 1,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={styles.deleteButtonLabel}>
                    {deleting ? 'מוחק...' : 'מחק קמפיין'}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    alignItems: 'center',
  },
  formContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
  },
  section: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  messageCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  deleteButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  deleteButtonLabel: {
    color: '#C62828',
    textAlign: 'center',
  },
});
