import type { MoneyDto } from "@bluewhale/ipc";
import { MoneyAmount } from "./money-amount";

/** A labeled money total used by the dashboard and reports. */
export function TotalCard({ label, money }: { label: string; money: MoneyDto | null | undefined }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">
        <MoneyAmount money={money} />
      </dd>
    </div>
  );
}
