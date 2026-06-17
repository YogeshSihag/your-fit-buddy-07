import type { MuscleStats } from "@/lib/analytics";
import type { MuscleGroup } from "@/lib/exercises";

interface Props {
  stats: MuscleStats[];
}

// Returns rgba color for given intensity 0..1
function heat(intensity: number): string {
  if (intensity <= 0) return "oklch(0.28 0.006 240)";
  // Blend from dim to neon green
  const a = 0.25 + intensity * 0.75;
  return `oklch(0.86 0.22 140 / ${a.toFixed(2)})`;
}

export function MuscleHeatmap({ stats }: Props) {
  const by = (m: MuscleGroup) => stats.find((s) => s.muscle === m)?.intensity ?? 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <BodyView label="Front" stats={stats} side="front" by={by} />
      <BodyView label="Back" stats={stats} side="back" by={by} />
    </div>
  );
}

function BodyView({
  label,
  side,
  by,
}: {
  label: string;
  stats: MuscleStats[];
  side: "front" | "back";
  by: (m: MuscleGroup) => number;
}) {
  const stroke = "oklch(0.4 0.006 240)";
  const skin = "oklch(0.22 0.006 240)";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-center text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <svg viewBox="0 0 200 360" className="mx-auto h-72">
        {/* Head */}
        <circle cx="100" cy="30" r="20" fill={skin} stroke={stroke} />
        {/* Torso */}
        <path
          d="M 70 55 Q 60 100 65 170 L 135 170 Q 140 100 130 55 Z"
          fill={skin}
          stroke={stroke}
        />
        {/* Arms */}
        <path d="M 65 60 Q 45 100 50 175 L 65 175 Q 62 100 75 65 Z" fill={skin} stroke={stroke} />
        <path
          d="M 135 60 Q 155 100 150 175 L 135 175 Q 138 100 125 65 Z"
          fill={skin}
          stroke={stroke}
        />
        {/* Legs */}
        <path
          d="M 70 170 L 65 170 L 60 320 L 90 320 L 95 200 Z"
          fill={skin}
          stroke={stroke}
        />
        <path
          d="M 130 170 L 135 170 L 140 320 L 110 320 L 105 200 Z"
          fill={skin}
          stroke={stroke}
        />

        {side === "front" ? (
          <>
            {/* Chest */}
            <ellipse cx="85" cy="85" rx="14" ry="11" fill={heat(by("Chest"))} />
            <ellipse cx="115" cy="85" rx="14" ry="11" fill={heat(by("Chest"))} />
            {/* Shoulders */}
            <circle cx="68" cy="62" r="9" fill={heat(by("Shoulders"))} />
            <circle cx="132" cy="62" r="9" fill={heat(by("Shoulders"))} />
            {/* Biceps */}
            <ellipse cx="56" cy="105" rx="7" ry="14" fill={heat(by("Biceps"))} />
            <ellipse cx="144" cy="105" rx="7" ry="14" fill={heat(by("Biceps"))} />
            {/* Abs */}
            <rect x="92" y="105" width="16" height="55" rx="4" fill={heat(by("Abs"))} />
            {/* Legs (quads) */}
            <ellipse cx="80" cy="230" rx="13" ry="35" fill={heat(by("Legs"))} />
            <ellipse cx="120" cy="230" rx="13" ry="35" fill={heat(by("Legs"))} />
          </>
        ) : (
          <>
            {/* Upper back / lats */}
            <path
              d="M 72 65 L 128 65 L 132 130 L 68 130 Z"
              fill={heat(by("Back"))}
              opacity={0.95}
            />
            {/* Rear shoulders */}
            <circle cx="68" cy="62" r="9" fill={heat(by("Shoulders"))} />
            <circle cx="132" cy="62" r="9" fill={heat(by("Shoulders"))} />
            {/* Triceps */}
            <ellipse cx="56" cy="110" rx="7" ry="15" fill={heat(by("Triceps"))} />
            <ellipse cx="144" cy="110" rx="7" ry="15" fill={heat(by("Triceps"))} />
            {/* Hamstrings */}
            <ellipse cx="80" cy="235" rx="12" ry="32" fill={heat(by("Legs"))} />
            <ellipse cx="120" cy="235" rx="12" ry="32" fill={heat(by("Legs"))} />
          </>
        )}
      </svg>
    </div>
  );
}
