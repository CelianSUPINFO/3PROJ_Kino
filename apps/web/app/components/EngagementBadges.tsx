"use client";

import { useLocale } from "./AppProviders";

type Engagement = {
  streakDays: number;
  weekly: {
    reviews: number;
    completed: number;
    targetReviews: number;
    targetCompleted: number;
  };
  recommendationRefreshAt: string;
};

export function EngagementBadges({ data }: { data: Engagement | null }) {
  const { locale, t } = useLocale();
  if (!data) return null;
  const next = new Date(data.recommendationRefreshAt).toLocaleTimeString(
    locale === "fr" ? "fr-FR" : "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StreakCard days={data.streakDays} label={t("engagement.streak")} daysLabel={t("engagement.days")} />
      <RingCard
        title={t("engagement.reviewsWeek")}
        value={data.weekly.reviews}
        target={data.weekly.targetReviews}
        color="#ff2e7e"
        icon="pen"
      />
      <RingCard
        title={t("engagement.completedWeek")}
        value={data.weekly.completed}
        target={data.weekly.targetCompleted}
        color="#f5c76a"
        icon="check"
        footer={t("engagement.nextPicks", { time: next })}
      />
    </div>
  );
}

function StreakCard({
  days,
  label,
  daysLabel,
}: {
  days: number;
  label: string;
  daysLabel: string;
}) {
  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-4">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-kino pulse-glow">
        <FlameIcon />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-widest text-kino-muted">{label}</p>
        <p className="text-xl font-bold text-white">
          {days} <span className="text-sm font-medium text-kino-muted">{daysLabel}</span>
        </p>
      </div>
    </div>
  );
}

function RingCard({
  title,
  value,
  target,
  color,
  icon,
  footer,
}: {
  title: string;
  value: number;
  target: number;
  color: string;
  icon: "pen" | "check";
  footer?: string;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-4">
      <div className="relative h-14 w-14">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="5"
            fill="none"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={color}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 28 28)"
            style={{ transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-white">
          {icon === "pen" ? <PenIcon /> : <CheckIcon />}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-kino-muted">{title}</p>
        <p className="truncate text-lg font-semibold text-white">
          {value} / {target}
        </p>
        {footer && <p className="text-xs text-kino-muted">{footer}</p>}
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
      <path d="M12 2s4 4.5 4 8.5a4 4 0 11-8 0c0-1.7.8-3 .8-3S8 10 6.5 12C5.5 13.5 5 15 5 16.5 5 20 8.1 22 12 22s7-2 7-5.5c0-4-3-6.5-4-8.5-.9-1.7-3-6-3-6z" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
