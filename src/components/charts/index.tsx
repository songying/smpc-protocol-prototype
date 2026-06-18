'use client'

import React from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

// Shared fintech palette
export const CHART = {
  teal: '#2DD4BF',
  blue: '#3B82F6',
  violet: '#A78BFA',
  amber: '#FBBF24',
  rose: '#FB7185',
  grid: '#1F2A3C',
  axis: '#64748B',
  text: '#94A3B8',
}

const tooltipStyle = {
  background: '#0F172A',
  border: '1px solid #1F2A3C',
  borderRadius: 10,
  color: '#E6EDF7',
  fontSize: 12,
}

/** Compact sparkline for KPI cards. */
export function Sparkline({ data, color = CHART.teal, height = 40 }: { data: number[]; color?: string; height?: number }) {
  const series = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Filled area trend with gradient. */
export function AreaTrend({
  data, dataKey = 'value', xKey = 'label', color = CHART.teal, height = 240,
}: { data: any[]; dataKey?: string; xKey?: string; color?: string; height?: number }) {
  const id = `grad-${dataKey}-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={CHART.axis} tick={{ fill: CHART.text, fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART.axis} tick={{ fill: CHART.text, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: color, strokeOpacity: 0.2 }} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Vertical bars. */
export function BarsTrend({
  data, dataKey = 'value', xKey = 'label', color = CHART.blue, height = 240,
}: { data: any[]; dataKey?: string; xKey?: string; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={CHART.axis} tick={{ fill: CHART.text, fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART.axis} tick={{ fill: CHART.text, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Donut for distributions (e.g. the fee split). */
export function DonutSplit({
  data, height = 220, colors = [CHART.teal, CHART.blue, CHART.violet, CHART.amber],
}: { data: { name: string; value: number }[]; height?: number; colors?: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  )
}
