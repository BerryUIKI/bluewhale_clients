import type { RouteObject } from "react-router-dom";
import { HomePage } from "../features/home/home-page";
import { LedgerListPage } from "../features/ledgers/ledger-list-page";
import { LedgerSetupPage } from "../features/ledgers/ledger-setup-page";
import { SettingsPage } from "../features/settings/settings-page";
import { NotFoundPage } from "./not-found";
import { RootGate } from "./root-gate";
import { AppShell } from "./shell";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootGate />,
    children: [
      { path: "setup", element: <LedgerSetupPage variant="first-run" /> },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "ledgers", element: <LedgerListPage /> },
          { path: "ledgers/new", element: <LedgerSetupPage variant="add" /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
