"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/api";

export function OAuthClient() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const access = params.get("access");
    const refresh = params.get("refresh");
    if (access && refresh) {
      setTokens(access, refresh);
      router.replace("/feed");
    } else {
      router.replace("/login");
    }
  }, [params, router]);

  return <p className="text-kino-muted">Signing in...</p>;
}
