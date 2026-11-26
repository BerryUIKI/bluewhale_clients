import { useMemo } from "react";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { desktopIpcClient } from "../lib/ipc-client";
import type { IpcClient } from "../lib/ipc-context";
import { AppErrorBoundary } from "./error-boundary";
import { AppProviders } from "./providers";
import { routes } from "./routes";

/** The application shell. */
export function App({ ipc = desktopIpcClient }: { ipc?: IpcClient }) {
  const router = useMemo(() => createHashRouter(routes), []);

  return (
    <AppProviders ipc={ipc}>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </AppProviders>
  );
}
