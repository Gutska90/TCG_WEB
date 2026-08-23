"use client";

import { CHILE_REGIONS } from "@tcg/config";
import { useMemo, useState } from "react";

export function ChilePlaceFields({
  defaultRegion,
  defaultComuna,
}: {
  defaultRegion?: string;
  defaultComuna?: string;
}) {
  const rm = CHILE_REGIONS.find((row) => row.zone === "RM");
  const fallback = CHILE_REGIONS.find((row) => row.name.length > 0);
  const initialRegion =
    CHILE_REGIONS.find((row) => row.name === defaultRegion)?.name ??
    rm?.name ??
    fallback?.name ??
    "Metropolitana de Santiago";
  const [region, setRegion] = useState(initialRegion);
  const comunas = useMemo(
    () => [...(CHILE_REGIONS.find((row) => row.name === region)?.comunas ?? [])],
    [region],
  );
  const [comuna, setComuna] = useState(() =>
    defaultComuna && comunas.includes(defaultComuna) ? defaultComuna : (comunas[0] ?? ""),
  );

  return (
    <>
      <label className="text-sm">
        Región
        <select
          name="region"
          required
          className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2"
          value={region}
          onChange={(event) => {
            const nextRegion = event.target.value;
            const nextComunas = [...(CHILE_REGIONS.find((row) => row.name === nextRegion)?.comunas ?? [])];
            setRegion(nextRegion);
            setComuna(nextComunas[0] ?? "");
          }}
        >
          {CHILE_REGIONS.map((row) => (
            <option key={row.name} value={row.name}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Comuna
        <select
          name="comuna"
          required
          className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2"
          value={comuna}
          onChange={(event) => setComuna(event.target.value)}
        >
          {comunas.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
