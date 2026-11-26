import { createContext, useContext } from "react";
import type { AppInfo } from "@bluewhale/ipc";

/** The subset of the IPC surface the interface depends on. */
export interface IpcClient {
  /** Returns build and platform information for this application. */
  appInfo(): Promise<AppInfo>;
}

/** The injection point for the IPC client. */
export const IpcContext = createContext<IpcClient | null>(null);

/** Returns the IPC client. */
export function useIpc(): IpcClient {
  const client = useContext(IpcContext);
  if (client === null) {
    throw new Error("IpcProvider is missing");
  }
  return client;
}
