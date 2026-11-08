"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Splash from "@/components/Splash";
import { useGoReal } from "@/lib/store";

export default function Start() {
  const s = useGoReal();
  const router = useRouter();

  useEffect(() => {
    if (s) router.replace(s.onboarded ? "/home" : "/onboarding");
  }, [s, router]);

  return <Splash />;
}
