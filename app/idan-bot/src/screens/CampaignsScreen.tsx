import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import PhoneLogin from "@/components/PhoneLogin";
import { ThemedText } from "@/components/themed-text";
import { AppButton } from "@/components/ui/AppButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { schedulerKeys } from "@/lib/query";
import { getPrimaryAccount, listScheduledPosts } from "@/services/scheduler";
import type {
  ScheduledPostRecord,
  ScheduledPostStatus,
} from "@/types/scheduler";

const STATUS_LABELS: Record<ScheduledPostStatus, string> = {
  pending: "ממתין",
  processing: "בעיבוד",
  completed: "הושלם",
  failed: "נכשל",
  disabled: "מושבת",
};

const STATUS_COLORS: Record<ScheduledPostStatus, string> = {
  pending: "#FEF3C7",
  processing: "#DBEAFE",
  completed: "#E4F8EB",
  failed: "#FDE7E7",
  disabled: "#F3F4F6",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CampaignsScreen() {
  const theme = useTheme();
  const router = useRouter();
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

  const posts = postsQuery.data ?? [];
  const hasAccount = Boolean(accountQuery.data);
  const refreshing = accountQuery.isRefetching || postsQuery.isRefetching;

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    await Promise.all([accountQuery.refetch(), postsQuery.refetch()]);
  }, [accountQuery, isAuthenticated, postsQuery]);

  useFocusEffect(
    useCallback(() => {
      void refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    const queryError = accountQuery.error ?? postsQuery.error;
    if (!queryError) {
      return;
    }

    toast.error(
      queryError instanceof Error
        ? queryError.message
        : "שגיאה בטעינת הקמפיינים."
    );
  }, [accountQuery.error, postsQuery.error]);

  const renderHeader = useCallback(
    () => (
      <View className="w-full max-w-[800px] self-center gap-4 px-4 pt-6">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-row flex-wrap gap-2">
            <View
              className="rounded-full px-4 py-1"
              style={{ backgroundColor: theme.backgroundSelected }}
            >
              <ThemedText type="smallBold">
                {hasAccount ? "חשבון שמור" : "חשבון חדש"}
              </ThemedText>
            </View>
            <View
              className="rounded-full px-4 py-1"
              style={{ backgroundColor: theme.backgroundSelected }}
            >
              <ThemedText type="smallBold">{posts.length} קמפיינים</ThemedText>
            </View>
          </View>
          {session ? (
            <AppButton
              title="התנתק"
              variant="ghost"
              onPress={() => void signOut()}
            />
          ) : null}
        </View>
      </View>
    ),
    [hasAccount, posts.length, session, signOut, theme.backgroundSelected]
  );

  const renderCampaign = useCallback(
    ({ item: post }: { item: ScheduledPostRecord }) => (
      <View className="w-full px-4">
        <Pressable
          onPress={() => router.push(`/campaign-modal?id=${post.id}`)}
          className="w-full max-w-[800px] self-center rounded-3xl border p-6 gap-2"
          style={{
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          }}
        >
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 gap-0.5">
              <ThemedText type="smallBold">
                {formatDate(post.scheduled_at)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {post.group_ids.length} קבוצות
              </ThemedText>
            </View>
            <View
              className="rounded-full px-4 py-1"
              style={{ backgroundColor: STATUS_COLORS[post.status] }}
            >
              <ThemedText type="smallBold">
                {STATUS_LABELS[post.status]}
              </ThemedText>
            </View>
          </View>
          <ThemedText numberOfLines={2}>{post.content}</ThemedText>
          {post.image_url ? (
            <Image
              source={{ uri: post.image_url }}
              className="w-full rounded-2xl"
              style={{ aspectRatio: 16 / 9 }}
              contentFit="cover"
              transition={200}
            />
          ) : null}
        </Pressable>
      </View>
    ),
    [router, theme.backgroundElement, theme.backgroundSelected]
  );

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        {!session ? (
          <View className="flex-1">
            {renderHeader()}
            <View className="w-full max-w-[800px] self-center px-4 pt-4 pb-32">
              <View
                className="overflow-hidden rounded-3xl border"
                style={{
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                  minHeight: 620,
                }}
              >
                <PhoneLogin />
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(post) => post.id}
            renderItem={renderCampaign}
            contentInsetAdjustmentBehavior="automatic"
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View className="w-full max-w-[800px] self-center px-4 pt-4 pb-32">
                <View
                  className="items-center rounded-3xl border p-6 gap-1"
                  style={{
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  }}
                >
                  <ThemedText type="subtitle">אין קמפיינים עדיין</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    לחץ על + כדי ליצור קמפיין חדש
                  </ThemedText>
                </View>
              </View>
            }
            ItemSeparatorComponent={() => <View className="h-4" />}
            contentContainerStyle={{ paddingBottom: 128 }}
          />
        )}
      </SafeAreaView>

      {/* FAB - absolutely positioned relative to the root View */}
      {session ? (
        <Pressable
          onPress={() => router.push("/campaign-modal")}
          className="absolute bottom-28 right-6 h-16 w-16 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: theme.text }}
        >
          <ThemedText
            style={{
              color: theme.background,
              fontSize: 30,
              fontWeight: "700",
              lineHeight: 34,
            }}
          >
            +
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}
