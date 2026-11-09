"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import NotificationHost from "@/components/NotificationHost";
import PhoneTracker from "@/components/PhoneTracker";
import Splash from "@/components/Splash";
import TabBar from "@/components/TabBar";
import { refreshDay, useGoReal, useWaitingForPhone } from "@/lib/store";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const s = useGoReal();
  const waitingForPhone = useWaitingForPhone();
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

  if (!s || !s.onboarded || waitingForPhone) {
    return (
      <>
        <Splash />
        <PhoneTracker />
      </>
    );
  }

  return (
    <>
      <PhoneTracker />
      <div style={{ paddingBottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 16px)" }}>{children}</div>
      <TabBar />
      <NotificationHost />
    </>
  );
}
