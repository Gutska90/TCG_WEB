"use client";

import { useEffect, useState } from "react";
import { LEGAL_CONSENT_CHECKBOX } from "@tcg/config";
import type { PublicPlatformConfig } from "@tcg/types";
import { ApiError, loginWithGoogle, loginWithTestOauth } from "../lib/api";
import { fetchPublicConfig } from "../lib/config";
import { userFacingError } from "../lib/errors";
import { FormError, buttonClass, buttonSecondaryClass } from "./ui-feedback";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type Props = {
  onSuccess: () => void;
};

export function OauthButtons({ onSuccess }: Props) {
  const [config, setConfig] = useState<PublicPlatformConfig | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  useEffect(() => {
    void fetchPublicConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (!config?.features.enableGoogleAuth || !clientId || config.features.authStub) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [clientId, config]);

  if (!config?.features.enableGoogleAuth && !config?.features.enableAppleAuth) {
    return null;
  }

  async function finishGoogle(idToken: string) {
    setPending(true);
    setError(null);
    try {
      await loginWithGoogle(idToken, acceptTerms);
      onSuccess();
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(event) => setAcceptTerms(event.target.checked)}
          className="mt-1"
          aria-label="Aceptar términos para Google o Apple"
        />
        <span>{LEGAL_CONSENT_CHECKBOX.label} (requerido si es tu primer ingreso con Google o Apple).</span>
      </label>
      {config.features.enableGoogleAuth && !config.features.authStub && clientId ? (
        <button
          type="button"
          disabled={pending}
          className={buttonSecondaryClass}
          onClick={() => {
            if (!window.google) {
              setError("Google aún no carga. Reintenta.");
              return;
            }
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response) => {
                void finishGoogle(response.credential);
              },
            });
            window.google.accounts.id.prompt();
          }}
        >
          Continuar con Google
        </button>
      ) : null}
      {config.features.authStub && config.features.enableGoogleAuth ? (
        <button
          type="button"
          disabled={pending}
          className={buttonClass}
          onClick={() => {
            setPending(true);
            setError(null);
            const suffix = `${Date.now()}`;
            void loginWithTestOauth({
              provider: "GOOGLE",
              subject: `e2e-google-${suffix}`,
              email: `e2e.google.${suffix}@example.test`,
              acceptTerms,
            })
              .then(onSuccess)
              .catch((err: unknown) => {
                setError(err instanceof ApiError ? err.message : userFacingError(err));
                setPending(false);
              });
          }}
        >
          Continuar con Google (prueba)
        </button>
      ) : null}
      <FormError message={error} />
    </div>
  );
}
