import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

/** Capitais de província — fallback quando a geocodificação falha. */
const CAPITAIS: Record<string, { lat: number; lon: number }> = {
  Luanda: { lat: -8.839, lon: 13.289 },
  Bengo: { lat: -8.578, lon: 13.664 },
  Benguela: { lat: -12.576, lon: 13.405 },
  Bié: { lat: -12.383, lon: 16.949 },
  Cabinda: { lat: -5.55, lon: 12.2 },
  Cuando: { lat: -14.658, lon: 17.69 },
  "Cuando Cubango": { lat: -14.658, lon: 17.69 },
  "Cuanza Norte": { lat: -9.297, lon: 14.911 },
  "Cuanza Sul": { lat: -11.208, lon: 13.848 },
  Cunene: { lat: -17.065, lon: 15.728 },
  Huambo: { lat: -12.775, lon: 15.738 },
  Huíla: { lat: -14.917, lon: 13.492 },
  "Lunda Norte": { lat: -7.381, lon: 20.832 },
  "Lunda Sul": { lat: -9.655, lon: 20.397 },
  Malanje: { lat: -9.54, lon: 16.34 },
  Moxico: { lat: -11.783, lon: 19.914 },
  Namibe: { lat: -15.195, lon: 12.15 },
  Uíge: { lat: -7.62, lon: 14.99 },
  Zaire: { lat: -6.267, lon: 14.24 },
};

type Geo = {
  lat: number;
  lon: number;
  origem: "gps" | "exacta" | "localidade" | "provincia";
};

async function geocodificar(
  provincia: string,
  municipio: string,
  bairro: string,
  rua: string,
): Promise<Geo> {
  const tentativas: Array<{ q: string; origem: Geo["origem"] }> = [];
  const partes = [rua, bairro, municipio, provincia]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  if (partes.length >= 3)
    tentativas.push({ q: [...partes, "Angola"].join(", "), origem: "exacta" });
  if (municipio.trim() && provincia.trim())
    tentativas.push({
      q: `${bairro.trim() ? bairro.trim() + ", " : ""}${municipio.trim()}, ${provincia.trim()}, Angola`,
      origem: "localidade",
    });
  if (provincia.trim())
    tentativas.push({ q: `${provincia.trim()}, Angola`, origem: "provincia" });
  for (const t of tentativas) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ao&q=${encodeURIComponent(t.q)}`,
        { headers: { Accept: "application/json" } },
      );
      const j = (await r.json()) as Array<{ lat: string; lon: string }>;
      if (Array.isArray(j) && j[0])
        return { lat: Number(j[0].lat), lon: Number(j[0].lon), origem: t.origem };
    } catch {
      /* tenta a próxima granularidade */
    }
  }
  const fb =
    CAPITAIS[provincia.trim()] || CAPITAIS["Luanda"] || { lat: -8.839, lon: 13.289 };
  return { ...fb, origem: "provincia" };
}

/** 2026-09-16 — geocodificação REVERSA (o mesmo recurso OpenStreetMap/
 *  Nominatim que o mapa já utiliza): deriva a localidade aproximada a
 *  partir das coordenadas GPS. Falha suave (objeto vazio) — quem chama
 *  aplica os fallbacks. */
export async function reverterGeocodificacao(
  lat: number,
  lon: number,
): Promise<{
  provincia?: string;
  municipio?: string;
  bairro?: string;
  rua?: string;
}> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&countrycodes=ao&zoom=14&lat=${lat}&lon=${lon}`,
      { headers: { Accept: "application/json" } },
    );
    const j = (await r.json()) as { address?: Record<string, string> };
    const a = j.address || {};
    return {
      provincia: a.state || undefined,
      municipio:
        a.city || a.town || a.municipality || a.county || undefined,
      bairro:
        a.suburb ||
        a.neighbourhood ||
        a.quarter ||
        a.city_district ||
        a.village ||
        undefined,
      rua: a.road
        ? `${a.road}${a.house_number ? ` ${a.house_number}` : ""}`
        : undefined,
    };
  } catch {
    return {};
  }
}

/** 2026-09-16 — província mais próxima pela capital (fallback quando a
 *  geocodificação reversa não devolve estado). */
export function provinciaMaisProxima(lat: number, lon: number): string {
  let melhor = "Luanda";
  let melhorD = Infinity;
  for (const [nome, c] of Object.entries(CAPITAIS)) {
    const d = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (d < melhorD) {
      melhorD = d;
      melhor = nome;
    }
  }
  return melhor;
}

/** Mapa da área da ocorrência (OpenStreetMap incorporado + pino).
 *  2026-09-16 — quando a ocorrência tem coordenadas GPS guardadas
 *  (localização "Automática"), o mapa centra nessa posição real sem
 *  geocodificação; caso contrário mantém a posição estimada da morada. */
export function MapaOcorrencia({
  provincia,
  municipio,
  bairro,
  rua,
  lat,
  lon,
  precisao,
}: {
  provincia: string;
  municipio: string;
  bairro: string;
  rua?: string | null;
  lat?: number | null;
  lon?: number | null;
  precisao?: number | null;
}) {
  const gpsValido =
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180;
  const [geo, setGeo] = useState<Geo | null>(null);
  useEffect(() => {
    if (gpsValido) {
      setGeo({ lat: lat as number, lon: lon as number, origem: "gps" });
      return;
    }
    let vivo = true;
    setGeo(null);
    void geocodificar(provincia, municipio, bairro, rua || "").then((g) => {
      if (vivo) setGeo(g);
    });
    return () => {
      vivo = false;
    };
  }, [provincia, municipio, bairro, rua, gpsValido, lat, lon]);
  if (!geo)
    return (
      <div className="h-56 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" />A localizar a área…
      </div>
    );
  const d =
    geo.origem === "gps"
      ? Math.max(0.0015, (precisao && precisao > 0 ? precisao : 25) / 111320)
      : geo.origem === "exacta"
        ? 0.008
        : geo.origem === "localidade"
          ? 0.02
          : 0.08;
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - d}%2C${geo.lat - d}%2C${geo.lon + d}%2C${geo.lat + d}` +
    `&layer=mapnik&marker=${geo.lat}%2C${geo.lon}`;
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <iframe
          title="Mapa da área da ocorrência"
          src={src}
          className="w-full h-[240px] sm:h-[300px] lg:h-[380px] border-0"
          loading="lazy"
        />
      </div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
        <MapPin size={12} className="shrink-0" />
        {geo.origem === "gps"
          ? `Posição GPS real do dispositivo (±${Math.max(
              1,
              Math.round(precisao ?? 0),
            )} m).`
          : geo.origem === "provincia"
            ? "Aproximação à capital da província (morada sem coordenadas exactas)."
            : geo.origem === "localidade"
              ? "Aproximação à localidade indicada."
              : "Localização estimada da morada indicada."}{" "}
        <a
          href={`https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lon}#map=15/${geo.lat}/${geo.lon}`}
          target="_blank"
          rel="noreferrer"
          className="underline font-bold"
        >
          Abrir no mapa
        </a>
      </p>
    </div>
  );
}
