"use client";

import { Suspense } from "react";
import { OAuthClient } from "./OAuthClient";
import { useLocale } from "../components/AppProviders";

function OAuthFallback() {
  const { t } = useLocale();
  return <p className="text-kino-muted">{t("oauth.loading")}</p>;
}

export default function OAuthPage() {
  return (
    <Suspense fallback={<OAuthFallback />}>
      <OAuthClient />
    </Suspense>
  );
}
