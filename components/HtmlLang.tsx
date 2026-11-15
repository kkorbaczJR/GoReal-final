"use client";

import { useEffect } from "react";
import { useGoReal } from "@/lib/store";

/** Keeps the document language in step with the switch in the profile. */
export default function HtmlLang() {
  const lang = useGoReal()?.lang === "pl" ? "pl" : "en";
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
