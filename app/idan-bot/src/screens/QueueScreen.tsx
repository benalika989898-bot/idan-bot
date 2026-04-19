import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import PhoneLogin from '@/components/PhoneLogin';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/AppButton';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { schedulerKeys } from '@/lib/query';
import { getPrimaryAccount, listGroups, listScheduledPosts } from '@/services/scheduler';
import type { GroupRecord, ScheduledPostRecord, ScheduledPostStatus } from '@/types/scheduler';

const STATUS_LABELS: Record<ScheduledPostStatus, string> = {
  pending: 'ממתין',
  processing: 'בעיבוד',
  completed: 'הושלם',
  failed: 'נכשל',
  disabled: 'מושבת',
};

function formatResult(result: unknown) {
  if (!result) {
    return null;
  }

  if (Array.isArray(result)) {
    return result
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const maybeResult = entry as { group_url?: string; success?: boolean; error?: string | null };
        return `${maybeResult.success ? 'OK' : 'FAIL'} ${maybeResult.group_url ?? ''}${
          maybeResult.error ? ` - ${maybeResult.error}` : ''
        }`;
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof result === 'object' && result && 'error' in result) {
    return String((result as { error?: unknown }).error ?? '');
  }

  return JSON.stringify(result);
}

export default function QueueScreen() {
  const theme = useTheme();
  const { session, loading, signOut } = useAuth();
  const isAuthenticated = Boolean(session?.user);

  const accountQuery = useQuery({
    queryKey: schedulerKeys.primaryAccount(),
    queryFn: getPrimaryAccount,
    enabled: isAuthenticated,
  });

  const postsQuery = useQuery({
    queryKey: schedulerKeys.scheduledPosts(),
    queryFn: listScheduledPosts,
    enabled: isAuthenticated,
  });

  const groupsQuery = useQuery({
    queryKey: schedulerKeys.groups(accountQuery.data?.id ?? 'none'),
    queryFn: () => listGroups(accountQuery.data!.id),
    enabled: Boolean(accountQuery.data?.id),
  });

  const posts = postsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const refreshing =
    accountQuery.isRefetching || postsQuery.isRefetching || groupsQuery.isRefetching;

  const message =
    accountQuery.error instanceof Error
      ? accountQuery.error.message
      : postsQuery.error instanceof Error
        ? postsQuery.error.message
        : groupsQuery.error instanceof Error
          ? groupsQuery.error.message
          : null;

  const refreshQueue = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    const [nextAccountResult] = await Promise.all([accountQuery.refetch(), postsQuery.refetch()]);
    const nextAccountId = nextAccountResult.data?.id ?? accountQuery.data?.id;

    if (nextAccountId) {
      await groupsQuery.refetch();
    }
  }, [accountQuery, groupsQuery, isAuthenticated, postsQuery]);

  useFocusEffect(
    useCallback(() => {
      void refreshQueue();
    }, [refreshQueue])
  );

  useEffect(() => {
    if (!message) {
      return;
    }

    toast.error(message);
  }, [message]);

  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group.url])),
    [groups]
  );

  const stats = useMemo(
    () => ({
      pending: posts.filter((post) => post.status === 'pending').length,
      processing: posts.filter((post) => post.status === 'processing').length,
      completed: posts.filter((post) => post.status === 'completed').length,
      failed: posts.filter((post) => post.status === 'failed').length,
    }),
    [posts]
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingState}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshQueue()} />}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="title" style={styles.title}>
                  היסטוריית משלוחים
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  שורות ממתינות כאן הן מה שפונקציית ה-edge תעבד הבא.
                </ThemedText>
              </View>
              {session ? <AppButton title="התנתק" variant="ghost" onPress={() => void signOut()} /> : null}
            </View>

            {!session ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    padding: 0,
                    overflow: 'hidden',
                  },
                ]}>
                <PhoneLogin />
              </View>
            ) : (
              <>
                <View style={styles.statsRow}>
                  {([
                    ['ממתין', stats.pending],
                    ['בעיבוד', stats.processing],
                    ['הושלם', stats.completed],
                    ['נכשל', stats.failed],
                  ] as const).map(([label, value]) => (
                    <View
                      key={label}
                      style={[
                        styles.statCard,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: theme.backgroundSelected,
                        },
                      ]}>
                      <ThemedText type="subtitle">{String(value)}</ThemedText>
                      <ThemedText themeColor="textSecondary">{label}</ThemedText>
                    </View>
                  ))}
                </View>

                {posts.length === 0 ? (
                  <View
                    style={[
                      styles.emptyState,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}>
                    <ThemedText type="subtitle">אין פוסטים מתוזמנים</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      צור קמפיין בלשונית קמפיינים, ואז חזור לכאן לעקוב אחרי שינויי סטטוס.
                    </ThemedText>
                  </View>
                ) : (
                  posts.map((post) => {
                    const resultSummary = formatResult(post.result);
                    const postGroupUrls = post.group_ids
                      .map((groupId) => groupMap.get(groupId))
                      .filter(Boolean) as string[];

                    return (
                      <View
                        key={post.id}
                        style={[
                          styles.postCard,
                          {
                            backgroundColor: theme.backgroundElement,
                            borderColor: theme.backgroundSelected,
                          },
                        ]}>
                        <View style={styles.postHeader}>
                          <View style={styles.postHeaderText}>
                            <ThemedText type="smallBold">
                              {new Date(post.scheduled_at).toLocaleString()}
                            </ThemedText>
                            <ThemedText themeColor="textSecondary">
                              {postGroupUrls.length} קבוצות
                            </ThemedText>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  post.status === 'failed'
                                    ? '#FDE7E7'
                                    : post.status === 'completed'
                                      ? '#E4F8EB'
                                      : theme.background,
                              },
                            ]}>
                            <ThemedText type="smallBold">{STATUS_LABELS[post.status] ?? post.status}</ThemedText>
                          </View>
                        </View>

                        <ThemedText>{post.content}</ThemedText>

                        {post.image_url ? (
                          <Image
                            source={{ uri: post.image_url }}
                            style={styles.postImage}
                            contentFit="cover"
                            transition={200}
                          />
                        ) : null}

                        <View style={styles.groupList}>
                          {postGroupUrls.map((url) => (
                            <View
                              key={`${post.id}-${url}`}
                              style={[
                                styles.groupChip,
                                { backgroundColor: theme.backgroundSelected },
                              ]}>
                              <ThemedText type="small">{url}</ThemedText>
                            </View>
                          ))}
                        </View>

                        {resultSummary ? (
                          <View
                            style={[
                              styles.resultBox,
                              {
                                backgroundColor: theme.background,
                                borderColor: theme.backgroundSelected,
                              },
                            ]}>
                            <ThemedText type="smallBold">תוצאה אחרונה</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {resultSummary}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </>
            )}

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
          </View>
        </ScrollView>
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
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statCard: {
    minWidth: 150,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  postHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  groupList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  groupChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  resultBox: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  messageCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
