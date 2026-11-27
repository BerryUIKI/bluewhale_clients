import type { MoneyDto } from "@bluewhale/ipc";

/** Renders an exact money amount returned by Rust. */
export function MoneyAmount({
  money,
  className = "",
}: {
  money: MoneyDto | null | undefined;
  className?: string;
}) {
  if (!money) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span className={`tabular-nums ${className}`}>
      {money.text} <span className="text-sm font-normal text-muted">{money.currencyCode}</span>
    </span>
  );
}
