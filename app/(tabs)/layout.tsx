"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Splash from "@/components/Splash";
import TabBar from "@/components/TabBar";
import { useGoReal } from "@/lib/store";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const s = useGoReal();
  const router = useRouter();

  useEffect(() => {
    if (s && !s.onboarded) router.replace("/onboarding");
  }, [s, router]);

  if (!s || !s.onboarded) return <Splash />;

  return (
    <>
      <div style={{ paddingBottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 16px)" }}>{children}</div>
      <TabBar />
    </>
  );
}
