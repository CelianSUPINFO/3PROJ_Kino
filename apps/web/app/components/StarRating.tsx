"use client";

export function StarRating({
  value,
  outOf = 5,
  size = 16,
  className = "",
}: {
  value: number;
  outOf?: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(outOf, value));
  const pct = (clamped / outOf) * 100;
  const stars = Array.from({ length: outOf });

  return (
    <span
      className={`relative inline-flex select-none items-center ${className}`}
      aria-label={`${clamped.toFixed(1)} out of ${outOf} stars`}
      style={{ fontSize: size }}
    >
      <span className="flex text-white/15">
        {stars.map((_, i) => (
          <Star key={`bg-${i}`} size={size} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex overflow-hidden text-kino-gold"
        style={{ width: `${pct}%` }}
        aria-hidden
      >
        {stars.map((_, i) => (
          <Star key={`fg-${i}`} size={size} />
        ))}
      </span>
    </span>
  );
}

function Star({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0"
    >
      <path d="M12 17.27l-5.18 3.05 1.4-5.97L3.5 9.97l6.12-.53L12 3.75l2.38 5.69 6.12.53-4.72 4.38 1.4 5.97z" />
    </svg>
  );
}
