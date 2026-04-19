import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';

import type {
  ChartCardProps,
  InsightStatProps,
  MetricCardProps,
} from './analyticsTypes';

export function MetricCard({ title, value, icon, color, subtitle }: MetricCardProps) {
  return (
    <View className="mx-1 flex-1 py-2" style={{ direction: 'rtl' }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-right text-xs font-medium text-slate-500">{title}</Text>
          <Text className="mt-1 text-right text-[22px] font-bold leading-7 text-slate-950">
            {typeof value === 'number' ? value.toLocaleString('he-IL') : value}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-right text-[11px] leading-4 text-slate-400">{subtitle}</Text>
          ) : null}
        </View>
        <Ionicons name={icon as never} size={16} color={color} />
      </View>
    </View>
  );
}

export function ChartCard({
  title,
  subtitle,
  accentColor = '#111827',
  hint,
  children,
}: ChartCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}
      layout={LinearTransition}
      className="mx-4 mb-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 3,
      }}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View className="px-5 pt-5">
        <View className="flex-row-reverse items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row-reverse items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
              <Text className="text-right text-lg font-bold text-slate-950">{title}</Text>
            </View>
            {subtitle ? (
              <Text className="mt-2 text-right text-sm leading-5 text-slate-500">{subtitle}</Text>
            ) : null}
          </View>

          {hint ? (
            <View className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5">
              <Text className="text-right text-[11px] font-medium text-slate-500">{hint}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="mt-4 border-t border-slate-100 px-5 pb-5 pt-4">{children}</View>
    </Animated.View>
  );
}

function InsightStat({ label, value }: InsightStatProps) {
  return (
    <View className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
      <Text className="text-right text-xs font-medium text-slate-500">{label}</Text>
      <Text className="mt-1 text-right text-base font-bold text-slate-900">{value}</Text>
    </View>
  );
}

export function AnalyticsInsightsRow({
  left,
  right,
}: {
  left: InsightStatProps;
  right: InsightStatProps;
}) {
  return (
    <Animated.View
      layout={LinearTransition}
      className="mb-3 flex-row gap-3">
      <InsightStat label={left.label} value={left.value} />
      <InsightStat label={right.label} value={right.value} />
    </Animated.View>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <View className="items-center justify-center gap-4 py-8">
      <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
      <Text className="text-center text-gray-500">{message}</Text>
    </View>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="px-4 pt-4">
      <Text className="text-right text-base font-semibold text-gray-900">{title}</Text>
      {subtitle ? <Text className="mt-1 text-right text-xs text-gray-500">{subtitle}</Text> : null}
    </View>
  );
}

export function ChartSelectionSummary({
  title,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
}: {
  title: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel?: string;
  secondaryValue?: string;
}) {
  return (
    <Animated.View
      layout={LinearTransition}
      className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <Text className="mb-3 text-right text-xs font-semibold text-slate-500">{title}</Text>
      <View className="flex-row-reverse items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-right text-xs text-slate-500">{primaryLabel}</Text>
          <Text className="mt-1 text-right text-base font-bold text-slate-900">{primaryValue}</Text>
        </View>
        {secondaryLabel && secondaryValue ? (
          <View className="flex-1">
            <Text className="text-right text-xs text-slate-500">{secondaryLabel}</Text>
            <Text className="mt-1 text-right text-base font-bold text-slate-900">
              {secondaryValue}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
