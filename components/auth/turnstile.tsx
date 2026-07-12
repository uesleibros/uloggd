"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef } from "react";

export const AuthTurnstile = forwardRef<
  TurnstileInstance,
  { onToken: (token: string | null) => void; language: "en" | "pt-BR" }
>(function AuthTurnstile({ onToken, language }, ref) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    return <p className="field-error">Turnstile is not configured.</p>;
  }
  return (
    <div className="turnstile-wrap">
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
        options={{ theme: "dark", language, size: "flexible" }}
      />
    </div>
  );
});
