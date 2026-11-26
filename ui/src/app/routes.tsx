import type { RouteObject } from "react-router-dom";
import { HomePage } from "../features/home/home-page";
import { SettingsPage } from "../features/settings/settings-page";
import { NotFoundPage } from "./not-found";
import { AppShell } from "./shell";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
