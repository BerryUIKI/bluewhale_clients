import type { ReactNode } from "react";
import { BrandMark } from "../components/brand-mark";

/** A full-window status screen used before the shell can render. */
export function FullScreen({
  title,
  children,
  isError = false,
}: {
  title?: string;
  children: ReactNode;
  isError?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-line bg-surface p-8">
        <div className="flex items-center gap-3">
          <BrandMark className="size-8 text-accent" />
          <span className="text-lg font-semibold tracking-tight">Bluewhale</span>
        </div>
        {title ? <h1 className="text-xl font-semibold">{title}</h1> : null}
        <div className="text-sm" {...(isError ? { role: "alert" } : {})}>
          {children}
        </div>
      </div>
    </div>
  );
}
