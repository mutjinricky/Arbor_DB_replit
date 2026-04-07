import { type CauseChip, CAUSE_SEVERITY_STYLES } from "@/lib/riskCalculations";

interface CauseChipsProps {
  chips: CauseChip[];
  maxVisible?: number;
  size?: "sm" | "md";
}

export function CauseChips({ chips, maxVisible, size = "sm" }: CauseChipsProps) {
  if (chips.length === 0) {
    return (
      <span className="text-[11px] text-muted-foreground italic">원인 없음</span>
    );
  }

  const visible = maxVisible !== undefined ? chips.slice(0, maxVisible) : chips;
  const hidden  = maxVisible !== undefined ? chips.length - maxVisible : 0;

  const px  = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const txt = size === "md" ? "text-xs"     : "text-[11px]";

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map((chip) => {
        const s = CAUSE_SEVERITY_STYLES[chip.severity];
        return (
          <span
            key={chip.displayCode}
            data-testid={`chip-cause-${chip.displayCode}`}
            title={`${chip.causeName} (${chip.severity}, ${chip.detailCode})`}
            className={`inline-flex items-center rounded-full border font-semibold cursor-default select-none ${px} ${txt}`}
            style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
          >
            {chip.causeName}
          </span>
        );
      })}
      {hidden > 0 && (
        <span
          className={`inline-flex items-center rounded-full border bg-slate-50 border-slate-200 text-slate-500 font-semibold ${px} ${txt}`}
        >
          +{hidden}
        </span>
      )}
    </div>
  );
}
