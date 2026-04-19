import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { ChipGroup } from '@/shared/ui/molecules/animated-chip/Chip';
import { formatCurrency } from './analyticsUtils';

type SummaryTotals = {
  totalRevenue?: number;
  totalProductRevenue?: number;
  totalTicketRevenue?: number;
  totalAppointments?: number;
  totalProductsSold?: number;
  totalCustomers?: number;
  totalTicketsGranted?: number;
};

type SummaryMetricItem = {
  title: string;
  value: string;
  meta?: string;
  icon: string;
  color: string;
};

type AdminSummarySectionsProps = {
  allCrewData?: SummaryTotals;
  individualData?: SummaryTotals;
  mode: 'team' | 'mine';
};

const SUMMARY_ICON_COLORS = {
  ink: '#0F172A',
  slate: '#475569',
  blue: '#2563EB',
  teal: '#0F766E',
  plum: '#6D28D9',
} as const;

function SummaryMetric({ title, value, meta, icon, color }: SummaryMetricItem) {
  return (
    <View className="min-h-[66px] flex-1 border-b border-slate-200/80 py-2.5">
      <View className="mb-1 flex-row items-center gap-2">
        <Ionicons name={icon as never} size={14} color={color} />
        <Text className="flex-1 text-left text-[11px] font-medium text-slate-500">{title}</Text>
      </View>
      <Text className="text-left text-[20px] font-bold leading-6 text-slate-950">{value}</Text>
      {meta ? (
        <Text className="mt-1 text-left text-[11px] leading-4 text-slate-400">{meta}</Text>
      ) : null}
    </View>
  );
}

function SummaryRow({ left, right }: { left: SummaryMetricItem; right?: SummaryMetricItem }) {
  return (
    <View className="flex-row gap-5">
      <SummaryMetric {...left} />
      {right ? <SummaryMetric {...right} /> : <View className="flex-1" />}
    </View>
  );
}

const SUMMARY_CHIPS = [
  {
    label: 'כל הצוות',
    icon: () => <Ionicons name="people-outline" size={18} color="#fff" />,
    activeColor: '#0f172a',
    inActiveBackgroundColor: '#e2e8f0',
    labelColor: '#ffffff',
  },
  {
    label: 'אני',
    icon: () => <Ionicons name="person-outline" size={18} color="#fff" />,
    activeColor: '#0f172a',
    inActiveBackgroundColor: '#e2e8f0',
    labelColor: '#ffffff',
  },
];

function SummarySegmentedControl({
  value,
  onChange,
}: {
  value: 'team' | 'mine';
  onChange: (mode: 'team' | 'mine') => void;
}) {
  const currentIndex = value === 'team' ? 0 : 1;

  return (
    <ChipGroup
      chips={SUMMARY_CHIPS}
      selectedIndex={currentIndex}
      onChange={(index: number) => onChange(index === 0 ? 'team' : 'mine')}
      containerStyle={{ justifyContent: 'center' }}
    />
  );
}

function SummaryBlock({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: [SummaryMetricItem, SummaryMetricItem?][];
}) {
  return (
    <View className="px-6 pb-5 pt-4" style={{ direction: 'rtl' }}>
      <View className="mb-3 border-b border-slate-200 pb-3">
        <Text className="text-left text-lg font-bold text-slate-950">{title}</Text>
        <Text className="mt-1 text-left text-sm text-slate-500">{subtitle}</Text>
      </View>

      <View>
        {rows.map(([left, right], index) => (
          <SummaryRow key={`${title}-${left.title}-${index}`} left={left} right={right} />
        ))}
      </View>
    </View>
  );
}

function buildTeamRows(data?: SummaryTotals): [SummaryMetricItem, SummaryMetricItem?][] {
  return [
    [
      {
        title: 'הכנסות כוללות',
        value: formatCurrency(
          (data?.totalRevenue || 0) +
            (data?.totalProductRevenue || 0) +
            (data?.totalTicketRevenue || 0)
        ),
        meta: 'טיפולים + מוצרים + כרטיסיות',
        icon: 'cash',
        color: SUMMARY_ICON_COLORS.ink,
      },
      {
        title: 'תורים',
        value: (data?.totalAppointments || 0).toLocaleString('he-IL'),
        meta: 'בחודש הנוכחי',
        icon: 'calendar',
        color: SUMMARY_ICON_COLORS.slate,
      },
    ],
    [
      {
        title: 'הכנסות ממוצרים',
        value: formatCurrency(data?.totalProductRevenue || 0),
        meta: `${data?.totalProductsSold || 0} פריטים נמכרו`,
        icon: 'cart',
        color: SUMMARY_ICON_COLORS.blue,
      },
      {
        title: 'לקוחות',
        value: (data?.totalCustomers || 0).toLocaleString('he-IL'),
        meta: 'לקוחות ייחודיים',
        icon: 'people',
        color: SUMMARY_ICON_COLORS.plum,
      },
    ],
    [
      {
        title: 'הכנסות מכרטיסיות',
        value: formatCurrency(data?.totalTicketRevenue || 0),
        meta: `${data?.totalTicketsGranted || 0} כרטיסיות נמכרו`,
        icon: 'ticket',
        color: SUMMARY_ICON_COLORS.teal,
      },
    ],
  ];
}

function buildPersonalRows(data?: SummaryTotals): [SummaryMetricItem, SummaryMetricItem?][] {
  return [
    [
      {
        title: 'הכנסות',
        value: formatCurrency(
          (data?.totalRevenue || 0) +
            (data?.totalProductRevenue || 0) +
            (data?.totalTicketRevenue || 0)
        ),
        meta: 'טיפולים + מוצרים + כרטיסיות',
        icon: 'cash-outline',
        color: SUMMARY_ICON_COLORS.ink,
      },
      {
        title: 'תורים',
        value: (data?.totalAppointments || 0).toLocaleString('he-IL'),
        meta: 'בחודש הנוכחי',
        icon: 'calendar-outline',
        color: SUMMARY_ICON_COLORS.slate,
      },
    ],
    [
      {
        title: 'הכנסות ממוצרים',
        value: formatCurrency(data?.totalProductRevenue || 0),
        meta: `${data?.totalProductsSold || 0} פריטים נמכרו`,
        icon: 'cart-outline',
        color: SUMMARY_ICON_COLORS.blue,
      },
    ],
  ];
}

export function AdminSummarySections({
  allCrewData,
  individualData,
  mode,
}: AdminSummarySectionsProps) {
  const isTeamMode = mode === 'team';

  return (
    <SummaryBlock
      title={isTeamMode ? 'סיכום כל הצוות' : 'הביצועים שלי'}
      subtitle={isTeamMode ? 'מבט מהיר על הביצועים החודשיים' : 'סיכום אישי לחודש הנבחר'}
      rows={isTeamMode ? buildTeamRows(allCrewData) : buildPersonalRows(individualData)}
    />
  );
}

export function AdminAnalyticsModeSwitch({
  mode,
  onModeChange,
}: {
  mode: 'team' | 'mine';
  onModeChange: (mode: 'team' | 'mine') => void;
}) {
  return <SummarySegmentedControl value={mode} onChange={onModeChange} />;
}

export function PersonalSummarySections({ analyticsData }: { analyticsData: SummaryTotals }) {
  return (
    <SummaryBlock
      title="סיכום החודש"
      subtitle="מבט מהיר על הביצועים שלך"
      rows={buildTeamRows(analyticsData).slice(0, 2)}
    />
  );
}
