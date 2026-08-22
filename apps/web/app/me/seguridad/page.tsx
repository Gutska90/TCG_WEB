"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import type { AuthMethodsView, SessionView } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";
import { fetchPublicConfig } from "../../../lib/config";
import { userFacingError, loginHref } from "../../../lib/errors";
import {
  FormError,
  LoadingBlock,
  PageMain,
  SuccessNote,
  buttonClass,
  buttonSecondaryClass,
} from "../../../components/ui-feedback";

export default function SecurityPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<AuthMethodsView | null>(null);
  const [sessions, setSessions] = useState<SessionView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [authStub, setAuthStub] = useState(false);

  function load() {
    Promise.all([api<AuthMethodsView>("/v1/me/auth-identities"), api<SessionView[]>("/v1/me/sessions")])
      .then(([nextMethods, nextSessions]) => {
        setMethods(nextMethods);
        setSessions(nextSessions);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref("/me/seguridad"));
        else setError(userFacingError(err));
      });
  }

  useEffect(() => {
    load();
    void fetchPublicConfig()
      .then((config) => {
        setGoogleEnabled(config.features.enableGoogleAuth);
        setAuthStub(config.features.authStub);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!methods || !sessions) {
    return (
      <PageMain>
        {error ? <FormError message={error} /> : <LoadingBlock />}
      </PageMain>
    );
  }

  const google = methods.identities.find((row) => row.provider === "GOOGLE");
  const apple = methods.identities.find((row) => row.provider === "APPLE");

  return (
    <PageMain>
      <h1 className="text-2xl font-semibold">Seguridad</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Métodos de acceso y sesiones. No mostramos secretos de sesión.
      </p>
      <FormError message={error} />
      <SuccessNote message={notice} />

      <section className="mt-8">
        <h2 className="font-semibold">Métodos de acceso</h2>
        <ul className="mt-3 grid gap-3 text-sm">
          <li className="rounded border p-4">
            <p>Email/contraseña · {methods.hasPassword ? "Conectado" : "No configurado"}</p>
            <form
              className="mt-3 grid gap-2"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                setError(null);
                void api("/v1/me/password", {
                  method: "POST",
                  body: JSON.stringify({
                    password,
                    currentPassword: methods.hasPassword ? currentPassword : undefined,
                  }),
                })
                  .then(() => {
                    setNotice(methods.hasPassword ? "Contraseña actualizada." : "Contraseña agregada.");
                    setPassword("");
                    setCurrentPassword("");
                    load();
                  })
                  .catch((err: unknown) => setError(userFacingError(err)));
              }}
            >
              {methods.hasPassword ? (
                <label className="grid gap-1">
                  Contraseña actual
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="rounded border px-3 py-2"
                  />
                </label>
              ) : null}
              <label className="grid gap-1">
                {methods.hasPassword ? "Nueva contraseña" : "Agregar contraseña"}
                <input
                  type="password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded border px-3 py-2"
                />
              </label>
              <button type="submit" className={buttonSecondaryClass}>
                Guardar contraseña
              </button>
            </form>
          </li>
          <li className="rounded border p-4">
            <p>Google · {google ? "Conectado" : "No conectado"}</p>
            {google ? (
              <button
                type="button"
                className={`${buttonSecondaryClass} mt-2`}
                onClick={() => {
                  void api("/v1/me/auth-identities/GOOGLE", { method: "DELETE" })
                    .then(() => {
                      setNotice("Google desvinculado.");
                      load();
                    })
                    .catch((err: unknown) => setError(userFacingError(err)));
                }}
              >
                Desvincular
              </button>
            ) : googleEnabled ? (
              <button
                type="button"
                className={`${buttonSecondaryClass} mt-2`}
                onClick={() => {
                  if (!authStub) {
                    setError("Usa Continuar con Google en Ingresar, o configura el cliente Google.");
                    return;
                  }
                  void api<AuthMethodsView>("/v1/me/auth-identities/link/test", {
                    method: "POST",
                    body: JSON.stringify({ provider: "GOOGLE", subject: `link-google-${Date.now()}` }),
                  })
                    .then(() => {
                      setNotice("Google vinculado.");
                      load();
                    })
                    .catch((err: unknown) => setError(userFacingError(err)));
                }}
              >
                Conectar
              </button>
            ) : (
              <p className="mt-2 text-neutral-600">Google no está habilitado.</p>
            )}
          </li>
          <li className="rounded border p-4">
            <p>Apple · {apple ? "Conectado" : "No conectado"}</p>
            <p className="mt-1 text-neutral-600">Apple se vincula desde la app iOS.</p>
            {apple ? (
              <button
                type="button"
                className={`${buttonSecondaryClass} mt-2`}
                onClick={() => {
                  void api("/v1/me/auth-identities/APPLE", { method: "DELETE" })
                    .then(() => {
                      setNotice("Apple desvinculado.");
                      load();
                    })
                    .catch((err: unknown) => setError(userFacingError(err)));
                }}
              >
                Desvincular
              </button>
            ) : null}
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold">Sesiones</h2>
        <ul className="mt-3 grid gap-3">
          {sessions.map((row) => (
            <li key={row.id} className="rounded border p-4 text-sm">
              <p>{row.current ? "Esta sesión" : row.userAgent ?? "Otro dispositivo"}</p>
              <p className="text-neutral-600">
                Inicio {new Date(row.createdAt).toLocaleString("es-CL")} · expira{" "}
                {new Date(row.expiresAt).toLocaleString("es-CL")}
              </p>
              {!row.current ? (
                <button
                  type="button"
                  className={`${buttonSecondaryClass} mt-2`}
                  onClick={() => {
                    void api(`/v1/me/sessions/${row.id}`, { method: "DELETE" })
                      .then(() => {
                        setNotice("Sesión cerrada.");
                        load();
                      })
                      .catch((err: unknown) => setError(userFacingError(err)));
                  }}
                >
                  Cerrar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${buttonClass} mt-4`}
          onClick={() => {
            void api("/v1/me/sessions/revoke-all", { method: "POST" })
              .then(() => {
                setNotice("Cerramos las otras sesiones.");
                load();
              })
              .catch((err: unknown) => setError(userFacingError(err)));
          }}
        >
          Cerrar todas las sesiones
        </button>
      </section>
      <p className="mt-8 text-sm">
        <Link href="/me" className="underline">
          Volver a mi cuenta
        </Link>
      </p>
    </PageMain>
  );
}
