"use client";

import { useEffect } from "react";
import { startAccounts } from "@/lib/account";

/** Signs back in and keeps the account's copy of the progress up to date. Renders nothing. */
export default function AccountSync() {
  useEffect(() => startAccounts(), []);
  return null;
}
