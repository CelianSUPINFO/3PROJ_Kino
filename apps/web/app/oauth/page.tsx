import { Suspense } from "react";
import { OAuthClient } from "./OAuthClient";

export default function OAuthPage() {
  return (
    <Suspense fallback={<p className="text-kino-muted">Loading...</p>}>
      <OAuthClient />
    </Suspense>
  );
}
