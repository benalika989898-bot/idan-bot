import {
  Canvas,
  Circle,
  Line as SkiaLine,
  Path,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  LinearTransition,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Image } from 'expo-image';

import type { DayBarDatum, RevenuePointDatum, SimplePieDatum } from './analyticsTypes';

export type CrewBreakdownEntry = {
  crewMemberName: string;
  crewMemberAvatar?: string;
  value: number;
  revenue: number;
};

type RankingItemProps = {
  item: SimplePieDatum;
  index: number;
  selected: boolean;
  share: number;
  width: string;
  onPress?: () => void;
  crewBreakdown?: CrewBreakdownEntry[];
};

const CHART_HEIGHT = 220;
const CHART_PADDING = { top: 20, right: 16, bottom: 16, left: 16 };

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

function buildLinePath(points: { x: number; y: number }[], closeToY?: number) {
  const path = Skia.Path.Make();
  if (points.length === 0) {
    return path;
  }

  path.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    path.lineTo(points[index].x, points[index].y);
  }

  if (typeof closeToY === 'number') {
    path.lineTo(points[points.length - 1].x, closeToY);
    path.lineTo(points[0].x, closeToY);
    path.close();
  }

  return path;
}

function BarChartAxis({
  data,
  bars,
}: {
  data: DayBarDatum[];
  bars: { x: number; width: number }[];
}) {
  return (
    <View className="mt-3 h-5">
      {data.map((item, index) => {
        const bar = bars[index];
        if (!bar) {
          return null;
        }

        return (
          <View
            key={`${item.day}-${index}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: bar.x + bar.width / 2 - 22,
              width: 44,
            }}>
            <Text numberOfLines={1} className="text-center text-[11px] font-medium text-slate-500">
              {item.day}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function RevenueChartAxis({
  points,
  data,
}: {
  points: { x: number; y: number }[];
  data: RevenuePointDatum[];
}) {
  const tickIndexes = Array.from(
    new Set([
      0,
      Math.floor((data.length - 1) / 3),
      Math.floor(((data.length - 1) * 2) / 3),
      data.length - 1,
    ])
  ).filter((index) => index >= 0 && index < data.length);

  return (
    <View className="mt-3 h-5">
      {tickIndexes.map((index) => {
        const point = points[index];
        const item = data[index];
        if (!point || !item) {
          return null;
        }

        return (
          <View
            key={`${item.date}-${index}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: point.x - 24,
              width: 48,
            }}>
            <Text numberOfLines={1} className="text-center text-[11px] font-medium text-slate-500">
              {item.dayLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function RankingItem({ item, index, selected, share, width, onPress, crewBreakdown }: RankingItemProps) {
  const [expanded, setExpanded] = useState(false);
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected, selection]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selection.value, [0, 1], ['#FFFFFF', '#F8FAFC']),
    borderColor: interpolateColor(selection.value, [0, 1], ['#E5E7EB', '#111827']),
    transform: [{ scale: interpolate(selection.value, [0, 1], [1, 1.015]) }],
  }));

  const hasBreakdown = crewBreakdown && crewBreakdown.length > 0;

  const handlePress = () => {
    if (hasBreakdown) {
      setExpanded((prev) => !prev);
    }
    onPress?.();
  };

  const cardContent = (
    <Animated.View style={animatedCardStyle} className="rounded-2xl border px-4 py-3">
      <View className="mb-3 flex-row-reverse items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row-reverse items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <Animated.Text className="text-right text-sm font-semibold text-slate-900">
              {item.label}
            </Animated.Text>
            {hasBreakdown ? (
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#94A3B8"
              />
            ) : null}
          </View>
          {item.detail ? (
            <Animated.Text className="mt-1 text-right text-xs text-slate-500">
              {item.detail}
            </Animated.Text>
          ) : null}
        </View>
        <View className="items-end">
          <Animated.Text className="text-right text-base font-bold text-slate-900">
            {item.value.toLocaleString('he-IL')}
          </Animated.Text>
          <Animated.Text className="mt-1 text-right text-xs font-medium text-slate-500">
            {share.toFixed(0)}%
          </Animated.Text>
        </View>
      </View>

      <View className="h-2 overflow-hidden rounded-full bg-slate-100">
        <Animated.View
          entering={FadeInUp.delay(60 + index * 40).duration(320)}
          className="h-full rounded-full"
          style={{
            width,
            alignSelf: 'flex-end',
            backgroundColor: item.color,
          }}
        />
      </View>

      {expanded && hasBreakdown ? (
        <Animated.View
          entering={FadeInDown.duration(200)}
          className="mt-3 border-t border-slate-100 pt-3">
          {crewBreakdown.map((crew, crewIndex) => (
            <View
              key={`${crew.crewMemberName}-${crewIndex}`}
              className="mb-2 flex-row-reverse items-center gap-2.5">
              <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                {crew.crewMemberAvatar ? (
                  <Image
                    source={{ uri: crew.crewMemberAvatar }}
                    style={{ width: 28, height: 28, borderRadius: 14 }}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="person" size={13} color="#64748B" />
                )}
              </View>
              <Text className="flex-1 text-right text-xs font-medium text-slate-700">
                {crew.crewMemberName}
              </Text>
              <Text className="text-xs font-semibold text-slate-900">
                {crew.value.toLocaleString('he-IL')}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 45).duration(260).easing(Easing.out(Easing.cubic))}
      layout={LinearTransition}>
      {hasBreakdown || onPress ? (
        <Pressable onPress={handlePress}>{cardContent}</Pressable>
      ) : (
        cardContent
      )}
    </Animated.View>
  );
}

export function AnalyticsBarChart({
  data,
  selectedIndex,
  onSelect,
}: {
  data: DayBarDatum[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const [chartWidth, setChartWidth] = useState(0);
  const touchX = useSharedValue(-1);
  const widthValue = useSharedValue(0);
  const lastSentIndex = useSharedValue(selectedIndex);
  const activeBarLeft = useSharedValue(0);
  const activeBarTop = useSharedValue(0);
  const activeBarWidth = useSharedValue(0);
  const activeBarHeight = useSharedValue(0);
  const hasAnimatedBar = useRef(false);

  useEffect(() => {
    lastSentIndex.value = selectedIndex;
  }, [lastSentIndex, selectedIndex]);

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setChartWidth(nextWidth);
    widthValue.value = nextWidth;
  };

  useAnimatedReaction(
    () => {
      if (widthValue.value <= 0 || touchX.value < 0 || data.length === 0) {
        return -1;
      }

      const plotWidth = widthValue.value - CHART_PADDING.left - CHART_PADDING.right;
      if (plotWidth <= 0) {
        return -1;
      }

      const slotWidth = plotWidth / data.length;
      const clampedX = clamp(touchX.value - CHART_PADDING.left, 0, Math.max(plotWidth - 1, 0));
      return clamp(Math.floor(clampedX / slotWidth), 0, data.length - 1);
    },
    (nextIndex) => {
      if (nextIndex >= 0 && nextIndex !== lastSentIndex.value) {
        lastSentIndex.value = nextIndex;
        runOnJS(onSelect)(nextIndex);
      }
    },
    [data.length, onSelect]
  );

  const gesture = Gesture.Simultaneous(
    Gesture.Tap().onBegin((event) => {
      touchX.value = event.x;
    }),
    Gesture.Pan()
      .activeOffsetX([-4, 4])
      .failOffsetY([-10, 10])
      .onBegin((event) => {
        touchX.value = event.x;
      })
      .onUpdate((event) => {
        touchX.value = event.x;
      })
  );

  const plotWidth = Math.max(chartWidth - CHART_PADDING.left - CHART_PADDING.right, 0);
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const maxY = Math.max(...data.map((datum) => datum.count), 1);
  const slotWidth = data.length > 0 ? plotWidth / data.length : 0;
  const baseBarWidth = Math.min(Math.max(slotWidth * 0.56, 18), 34);
  const bars = data.map((datum, index) => {
    const heightRatio = datum.count / maxY;
    const height = Math.max(plotHeight * heightRatio, datum.count > 0 ? 6 : 0);
    const width = baseBarWidth;
    const x = CHART_PADDING.left + slotWidth * index + (slotWidth - width) / 2;
    const y = CHART_PADDING.top + plotHeight - height;
    const radius = Math.min(width / 2, height / 2);

    return {
      x,
      y,
      width,
      height,
      radius,
      color: '#CBD5E1',
    };
  });
  const gridValues = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    return CHART_PADDING.top + plotHeight * ratio;
  });
  const selectedBar = bars[selectedIndex];

  useEffect(() => {
    if (!selectedBar) {
      return;
    }

    const nextWidth = Math.min(selectedBar.width + 4, Math.max(slotWidth - 4, selectedBar.width));
    const nextHeight = Math.min(selectedBar.height + 10, plotHeight);
    const nextLeft = selectedBar.x - (nextWidth - selectedBar.width) / 2;
    const nextTop = selectedBar.y - (nextHeight - selectedBar.height);

    if (!hasAnimatedBar.current) {
      hasAnimatedBar.current = true;
      activeBarLeft.value = nextLeft;
      activeBarTop.value = nextTop;
      activeBarWidth.value = nextWidth;
      activeBarHeight.value = nextHeight;
      return;
    }

    activeBarLeft.value = withTiming(nextLeft, { duration: 150, easing: Easing.out(Easing.quad) });
    activeBarTop.value = withTiming(nextTop, { duration: 150, easing: Easing.out(Easing.quad) });
    activeBarWidth.value = withTiming(nextWidth, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
    activeBarHeight.value = withTiming(nextHeight, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
  }, [
    activeBarHeight,
    activeBarLeft,
    activeBarTop,
    activeBarWidth,
    plotHeight,
    selectedBar,
    slotWidth,
  ]);

  const activeBarStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: activeBarLeft.value,
    top: activeBarTop.value,
    width: activeBarWidth.value,
    height: activeBarHeight.value,
    borderRadius: Math.min(activeBarWidth.value / 2, activeBarHeight.value / 2),
  }));

  return (
    <View style={{ marginTop: 8 }}>
      <View onLayout={onLayout} style={{ height: CHART_HEIGHT }}>
        <GestureDetector gesture={gesture}>
          <Canvas style={{ flex: 1 }}>
            {gridValues.map((y, index) => (
              <SkiaLine
                key={`grid-${index}`}
                p1={vec(CHART_PADDING.left, y)}
                p2={vec(Math.max(chartWidth - CHART_PADDING.right, CHART_PADDING.left), y)}
                color="#E5E7EB"
                strokeWidth={1}
              />
            ))}
            {bars.map((bar, index) => (
              <RoundedRect
                key={`bar-${index}`}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                r={bar.radius}
                color={bar.color}
              />
            ))}
          </Canvas>
        </GestureDetector>
        {selectedBar ? (
          <Animated.View pointerEvents="none" style={activeBarStyle} className="bg-slate-900" />
        ) : null}
      </View>

      <BarChartAxis data={data} bars={bars} />
    </View>
  );
}

export function AnalyticsRevenueChart({
  data,
  selectedIndex,
  onSelect,
}: {
  data: RevenuePointDatum[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const [chartWidth, setChartWidth] = useState(0);
  const touchX = useSharedValue(-1);
  const widthValue = useSharedValue(0);
  const lastSentIndex = useSharedValue(selectedIndex);

  useEffect(() => {
    lastSentIndex.value = selectedIndex;
  }, [lastSentIndex, selectedIndex]);

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setChartWidth(nextWidth);
    widthValue.value = nextWidth;
  };

  useAnimatedReaction(
    () => {
      if (widthValue.value <= 0 || touchX.value < 0 || data.length === 0) {
        return -1;
      }

      const plotWidth = widthValue.value - CHART_PADDING.left - CHART_PADDING.right;
      if (plotWidth <= 0) {
        return -1;
      }

      if (data.length === 1) {
        return 0;
      }

      const ratio = clamp((touchX.value - CHART_PADDING.left) / plotWidth, 0, 1);
      return clamp(Math.round(ratio * (data.length - 1)), 0, data.length - 1);
    },
    (nextIndex) => {
      if (nextIndex >= 0 && nextIndex !== lastSentIndex.value) {
        lastSentIndex.value = nextIndex;
        runOnJS(onSelect)(nextIndex);
      }
    },
    [data.length, onSelect]
  );

  const gesture = Gesture.Simultaneous(
    Gesture.Tap().onBegin((event) => {
      touchX.value = event.x;
    }),
    Gesture.Pan()
      .activeOffsetX([-4, 4])
      .failOffsetY([-10, 10])
      .onBegin((event) => {
        touchX.value = event.x;
      })
      .onUpdate((event) => {
        touchX.value = event.x;
      })
  );

  const plotWidth = Math.max(chartWidth - CHART_PADDING.left - CHART_PADDING.right, 0);
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const maxRevenue = Math.max(...data.map((item) => item.revenue), 1);
  const points = data.map((item, index) => {
    const x =
      CHART_PADDING.left +
      (data.length === 1 ? plotWidth / 2 : (plotWidth * index) / Math.max(data.length - 1, 1));
    const y = CHART_PADDING.top + plotHeight - (item.revenue / maxRevenue) * plotHeight;
    return { x, y };
  });
  const strokePath = buildLinePath(points);
  const fillPath = buildLinePath(points, CHART_PADDING.top + plotHeight);
  const selectedPoint = points[selectedIndex];
  const gridValues = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    return CHART_PADDING.top + plotHeight * ratio;
  });

  return (
    <View style={{ marginTop: 8 }}>
      <View onLayout={onLayout} style={{ height: CHART_HEIGHT }}>
        <GestureDetector gesture={gesture}>
          <Canvas style={{ flex: 1 }}>
            {gridValues.map((y, index) => (
              <SkiaLine
                key={`grid-${index}`}
                p1={vec(CHART_PADDING.left, y)}
                p2={vec(Math.max(chartWidth - CHART_PADDING.right, CHART_PADDING.left), y)}
                color="#E5E7EB"
                strokeWidth={1}
              />
            ))}
            <Path path={fillPath} color="#2563EB" opacity={0.12} />
            <Path path={strokePath} color="#2563EB" style="stroke" strokeWidth={3} />
            {selectedPoint ? (
              <>
                <SkiaLine
                  p1={vec(selectedPoint.x, CHART_PADDING.top)}
                  p2={vec(selectedPoint.x, CHART_PADDING.top + plotHeight)}
                  color="#BFDBFE"
                  strokeWidth={1}
                />
                <Circle cx={selectedPoint.x} cy={selectedPoint.y} r={11} color="#DBEAFE" opacity={0.75} />
                <Circle cx={selectedPoint.x} cy={selectedPoint.y} r={5} color="#2563EB" />
              </>
            ) : null}
          </Canvas>
        </GestureDetector>
      </View>

      <RevenueChartAxis points={points} data={data} />
    </View>
  );
}

export function AnalyticsPieChart({
  data,
  selectedIndex,
  onSelect,
  crewBreakdowns,
}: {
  data: SimplePieDatum[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  crewBreakdowns?: Map<string, CrewBreakdownEntry[]>;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  return (
    <View className="mt-2 gap-3">
      {data.map((item, index) => {
        const share = total > 0 ? (item.value / total) * 100 : 0;
        const width = maxValue > 0 ? `${Math.max((item.value / maxValue) * 100, 8)}%` : '0%';

        return (
          <RankingItem
            key={`${item.label}-${index}`}
            item={item}
            index={index}
            selected={selectedIndex != null && index === selectedIndex}
            share={share}
            width={width}
            onPress={onSelect ? () => onSelect(index) : undefined}
            crewBreakdown={crewBreakdowns?.get(item.label)}
          />
        );
      })}
    </View>
  );
}
