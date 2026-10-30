"use client";

import { useSyncExternalStore } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// Validierte kategoriale Palette (feste Reihenfolge, nie zyklisch) – je eine Stufe für Hell und Dunkel.
const LIGHT = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  other: "#a3a3a0", grid: "#e5e5ea", muted: "#636366", text: "#3a3a3c", surface: "#ffffff", warn: "#b45309", border: "#d8d8dd",
};
const DARK = {
  series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
  other: "#6e6e73", grid: "#2c2c2e", muted: "#aeaeb2", text: "#e5e5ea", surface: "#1c1c1e", warn: "#ffa65a", border: "#38383a",
};

const query = "(prefers-color-scheme: dark)";
function useTheme() {
  const dark = useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
  return dark ? DARK : LIGHT;
}

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
// Achsenbeschriftung: unter 10.000 € mit einer Nachkommastelle, damit keine Werte doppelt erscheinen
const compactEur = (v: number) =>
  Math.abs(v) >= 10000
    ? `${Math.round(v / 1000)} T€`
    : Math.abs(v) >= 1000
      ? `${(v / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} T€`
      : `${Math.round(v)} €`;

const tooltipStyle = (t: typeof LIGHT) => ({
  contentStyle: { borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 13, boxShadow: "0 6px 20px rgba(0,0,0,.12)" },
  labelStyle: { color: t.text, fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: t.text },
});

export type StackedRow = { label: string } & Record<string, number | string>;

/** Gestapelte Monatskosten je Projekt. `series` in fester Reihenfolge; "Sonstige" bekommt Grau. */
export function StackedCostChart({ data, series, unit = "eur" }: { data: StackedRow[]; series: string[]; unit?: "eur" | "hours" }) {
  const t = useTheme();
  const fmt = (v: number) => (unit === "eur" ? eur.format(v) : `${v.toLocaleString("de-DE", { maximumFractionDigits: 1 })} h`);
  const axis = (v: number) => (unit === "eur" ? compactEur(v) : `${Math.round(v)} h`);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={t.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.muted, fontSize: 12 }} />
        <YAxis tickFormatter={axis} tickLine={false} axisLine={false} tick={{ fill: t.muted, fontSize: 12 }} width={56} />
        <Tooltip {...tooltipStyle(t)} cursor={{ fill: t.grid, fillOpacity: 0.5 }} formatter={(v: number, n: string) => [fmt(v), n]} />
        <Legend
          iconType="circle"
          iconSize={8}
          itemSorter="dataKey"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(v: string) => <span style={{ color: t.text }}>{v}</span>}
        />
        {series.map((s, i) => (
          <Bar
            key={s}
            // Projektnamen können Punkte enthalten (Recharts liest die als Pfad) – daher neutrale Schlüssel.
            dataKey={`s${i}`}
            name={s}
            isAnimationActive={false}
            stackId="a"
            fill={s === "Sonstige" ? t.other : t.series[i % t.series.length]}
            stroke={t.surface}
            strokeWidth={1}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Kumulierte Personalkosten eines Projekts mit Budgetlinie. */
export function CumulativeCostChart({ data, budget }: { data: { label: string; kumuliert: number }[]; budget: number | null }) {
  const t = useTheme();
  const max = Math.max(budget ?? 0, ...data.map((d) => d.kumuliert));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={t.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.muted, fontSize: 12 }} />
        <YAxis domain={[0, Math.ceil(max * 1.1) || 100]} tickFormatter={compactEur} tickLine={false} axisLine={false} tick={{ fill: t.muted, fontSize: 12 }} width={56} />
        <Tooltip {...tooltipStyle(t)} formatter={(v: number) => [eur.format(v), "Kosten kumuliert"]} />
        {budget != null && (
          <ReferenceLine y={budget} stroke={t.warn} strokeDasharray="5 4" label={{ value: `Budget ${eur.format(budget)}`, position: "insideTopRight", fill: t.warn, fontSize: 12 }} />
        )}
        <Line isAnimationActive={false} type="monotone" dataKey="kumuliert" stroke={t.series[0]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: t.surface, fill: t.series[0] }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Monatliche Stunden (einzelne Reihe). */
export function MonthlyHoursChart({ data }: { data: { label: string; stunden: number }[] }) {
  const t = useTheme();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={t.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.muted, fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: t.muted, fontSize: 12 }} width={40} />
        <Tooltip {...tooltipStyle(t)} cursor={{ fill: t.grid, fillOpacity: 0.5 }} formatter={(v: number) => [`${v.toLocaleString("de-DE")} h`, "Stunden"]} />
        <Bar isAnimationActive={false} dataKey="stunden" fill={t.series[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
