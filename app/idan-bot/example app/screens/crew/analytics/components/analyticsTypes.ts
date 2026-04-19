import type { ReactNode } from 'react';

export type AnalyticsContentProps = {
  year: number;
  month: number;
  userId?: string;
  isAdmin?: boolean;
};

export type MetricCardProps = {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
};

export type DayBarDatum = {
  day: string;
  count: number;
  revenue: number;
};

export type RevenuePointDatum = {
  date: string;
  dayLabel: string;
  revenue: number;
  appointments: number;
};

export type SimplePieDatum = {
  label: string;
  value: number;
  color: string;
  detail?: string;
};

export type InsightStatProps = {
  label: string;
  value: string;
};

export type ChartCardProps = {
  title: string;
  subtitle?: string;
  accentColor?: string;
  hint?: string;
  children: ReactNode;
};
