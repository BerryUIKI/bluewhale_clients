import type { ReactNode } from "react";
import { IpcContext } from "./ipc-context";
import type { IpcClient } from "./ipc-context";

/** Injects the IPC client so tests and other platform shells can substitute it. */
export function IpcProvider({ client, children }: { client: IpcClient; children: ReactNode }) {
  return <IpcContext.Provider value={client}>{children}</IpcContext.Provider>;
}
