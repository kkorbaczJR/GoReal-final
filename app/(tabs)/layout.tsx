"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import NotificationHost from "@/components/NotificationHost";
import Splash from "@/components/Splash";
import TabBar from "@/components/TabBar";
import { refreshDay, useGoReal } from "@/lib/store";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const s = useGoReal();
  const router = useRouter();

  useEffect(() => {
    if (s && !s.onboarded) router.replace("/onboarding");
  }, [s, router]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshDay();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!s || !s.onboarded) return <Splash />;

  return (
    <>
      <div style={{ paddingBottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 16px)" }}>{children}</div>
      <TabBar />
      <NotificationHost />
    </>
  );
}
