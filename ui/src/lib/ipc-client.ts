import { appInfo } from "@bluewhale/ipc";
import type { IpcClient } from "./ipc-context";

/** The desktop IPC client used by the application shell. */
export const desktopIpcClient: IpcClient = {
  appInfo,
};
