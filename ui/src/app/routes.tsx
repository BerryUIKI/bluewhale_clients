import type { RouteObject } from "react-router-dom";
import { HomePage } from "../features/home/home-page";
import { LedgerListPage } from "../features/ledgers/ledger-list-page";
import { LedgerSetupPage } from "../features/ledgers/ledger-setup-page";
import { AccountsPage } from "../features/master-data/accounts-page";
import { CategoriesPage } from "../features/master-data/categories-page";
import { CounterpartiesPage } from "../features/master-data/counterparties-page";
import { TagsPage } from "../features/master-data/tags-page";
import { SettingsPage } from "../features/settings/settings-page";
import { TransactionEditorPage } from "../features/transactions/transaction-editor-page";
import { TransactionRecoveryPage } from "../features/transactions/transaction-recovery-page";
import { TransactionsPage } from "../features/transactions/transactions-page";
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
          { path: "transactions", element: <TransactionsPage /> },
          { path: "transactions/new", element: <TransactionEditorPage mode="create" /> },
          { path: "transactions/recovery", element: <TransactionRecoveryPage /> },
          {
            path: "transactions/:transactionId/edit",
            element: <TransactionEditorPage mode="edit" />,
          },
          { path: "accounts", element: <AccountsPage /> },
          { path: "categories", element: <CategoriesPage /> },
          { path: "tags", element: <TagsPage /> },
          { path: "counterparties", element: <CounterpartiesPage /> },
          { path: "ledgers", element: <LedgerListPage /> },
          { path: "ledgers/new", element: <LedgerSetupPage variant="add" /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
