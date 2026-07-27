import { useState, useEffect } from "react";
import razas from "./razas.json";
import imagenesLocales from "./imagenesLocales.json";
import popularidadEspana from "./popularidadEspana.json";
const LANDING_BREEDS = ["Labrador Retriever", "Pastor Alemán", "Bulldog Francés", "Caniche"];



const NO_IMPORTA = "no_importa";

// ─── Paleta RSCE ────────────────────────────────────────────────────────────
const C = {
  navy:       "#005577",
  navyDark:   "#005577",
  navyLight:  "#e8eef8",
  gold:       "#ffa019",
  goldLight:  "#f5efd4",
  goldDark:   "#8a7030",
  red:        "#D6293E",
  redLight:   "rgba(214,41,62,0.10)",
  success:    "#3C8A52",
  successLight: "rgba(60,138,82,0.12)",
  white:      "#ffffff",
  surface:    "#f0f0f2",
  pageBg:     "#f0f0f2",
  border:     "rgba(0,48,135,0.12)",
  text:       "#0d1f45",
  muted:      "#6b7a99",
};

const DOG_SIZES = {
  mini:      { w: 28, h: 24 },
  pequeno:   { w: 36, h: 30 },
  mediano:   { w: 50, h: 42 },
  grande:    { w: 64, h: 54 },
  muygrande: { w: 80, h: 66 },
};

const DogSizeIllustration = ({ size, width = 80, height = 66 }) => {
  if (size === "noImporta") {
    return (
      <svg viewBox="0 0 80 66" width={width} height={height}>
        <text x="40" y="42" textAnchor="middle" fontSize="36">?</text>
      </svg>
    );
  }

  const s = DOG_SIZES[size] || DOG_SIZES.mediano;
  return (
    <img
      src="/perro.png"
      alt={size}
      style={{
        width: s.w,
        height: s.h,
        objectFit: "contain",
      }}
    />
  );
};

const imagenCache = {};
const galeriaCache = {};

function urlFotoLocal(nombreArchivo) {
  return "/perros/" + nombreArchivo.split("/").map(encodeURIComponent).join("/");
}

function fotosLocalesDeRaza(nombreRaza) {
  const archivos = imagenesLocales[nombreRaza];
  if (!archivos || archivos.length === 0) return null;
  return archivos.map(urlFotoLocal);
}

function nombreParaBusqueda(nombre) {
  return nombre
    .replace(/\s*\(.*?\)\s*/g, "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function buscarImagenRaza(nombreRaza) {
  if (imagenCache[nombreRaza] !== undefined) return imagenCache[nombreRaza];

  const locales = fotosLocalesDeRaza(nombreRaza);
  if (locales && locales.length > 0) {
    imagenCache[nombreRaza] = locales[0];
    return imagenCache[nombreRaza];
  }

  const query = nombreParaBusqueda(nombreRaza);

  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=640&origin=*`
    );
    const data = await res.json();
    const page = Object.values(data?.query?.pages || {})[0];
    if (page?.thumbnail?.source) {
      imagenCache[nombreRaza] = page.thumbnail.source;
      return imagenCache[nombreRaza];
    }
  } catch {
    /* sigue al siguiente intento */
  }

  try {
    const url =
      "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*&gsrsearch=" +
      encodeURIComponent(`${query} dog filetype:bitmap`);
    const res = await fetch(url);
    const data = await res.json();
    const page = Object.values(data?.query?.pages || {})[0];
    const info = page?.imageinfo?.[0];
    const foundUrl = info?.thumburl || info?.url || null;
    imagenCache[nombreRaza] = foundUrl;
    return foundUrl;
  } catch {
    imagenCache[nombreRaza] = null;
    return null;
  }
}

async function buscarGaleriaRaza(nombreRaza, max = 5) {
  if (galeriaCache[nombreRaza] !== undefined) return galeriaCache[nombreRaza];

  const locales = fotosLocalesDeRaza(nombreRaza);
  if (locales && locales.length > 0) {
    galeriaCache[nombreRaza] = locales.slice(0, max);
    return galeriaCache[nombreRaza];
  }

  const query = nombreParaBusqueda(nombreRaza);

  try {
    const url =
      "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*&gsrsearch=" +
      encodeURIComponent(`${query} dog filetype:bitmap`);
    const res = await fetch(url);
    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {});

    const urls = pages
      .map((p) => p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url)
      .filter(Boolean)
      .filter((u) => !/logo|icon|crest|map|flag/i.test(u))
      .slice(0, max);

    galeriaCache[nombreRaza] = urls.length > 0 ? urls : null;
    return galeriaCache[nombreRaza];
  } catch {
    galeriaCache[nombreRaza] = null;
    return null;
  }
}

const BreedImage = ({ nombre, size = 96, rounded = 12 }) => {
  const [src, setSrc] = useState(imagenCache[nombre] ?? undefined);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let activo = true;
    if (imagenCache[nombre] !== undefined) {
      setSrc(imagenCache[nombre]);
      return;
    }
    buscarImagenRaza(nombre).then((url) => {
      if (activo) setSrc(url);
    });
    return () => { activo = false; };
  }, [nombre]);

  const mostrarFallback = errored || src === null || !src;

  return (
    <div
      style={{
        width: size, height: size, borderRadius: rounded, overflow: "hidden",
        background: C.navyLight, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
      }}
    >
      {mostrarFallback ? (
        <DogSizeIllustration size="mediano" width={size * 0.8} height={size * 0.66} />
      ) : (
        <img
          src={src}
          alt={nombre}
          onError={() => setErrored(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
    </div>
  );
};

const LandingPanelImage = ({ nombre }) => {
  const [src, setSrc] = useState(imagenCache[nombre] ?? undefined);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let activo = true;
    if (imagenCache[nombre] !== undefined) {
      setSrc(imagenCache[nombre]);
      return;
    }
    buscarImagenRaza(nombre).then((url) => {
      if (activo) setSrc(url);
    });
    return () => { activo = false; };
  }, [nombre]);

  const mostrarFallback = errored || src === null || !src;

  if (mostrarFallback) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.navyLight }}>
        <DogSizeIllustration size="mediano" width={64} height={53} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={nombre}
      onError={() => setErrored(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
};

const BreedGallery = ({ nombre, width = 360, height = 280 }) => {
  const [fotos, setFotos] = useState(galeriaCache[nombre] ?? undefined);
  const [idx, setIdx] = useState(0);
  const [errored, setErrored] = useState({});

  useEffect(() => {
    let activo = true;
    setIdx(0);
    setErrored({});
    if (galeriaCache[nombre] !== undefined) {
      setFotos(galeriaCache[nombre]);
      return;
    }
    buscarGaleriaRaza(nombre).then((urls) => {
      if (activo) setFotos(urls);
    });
    return () => { activo = false; };
  }, [nombre]);

  const validas = (fotos || []).filter((_, i) => !errored[i]);
  const sinFotos = fotos === null || (fotos && validas.length === 0);

  if (sinFotos || fotos === undefined) {
    return <BreedImage nombre={nombre} size={Math.min(width, height)} rounded={16} />;
  }

  const actual = Math.min(idx, fotos.length - 1);
  const anterior = () => setIdx((i) => (i - 1 + fotos.length) % fotos.length);
  const siguiente = () => setIdx((i) => (i + 1) % fotos.length);

  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          position: "relative", width: "100%", height, borderRadius: 16,
          overflow: "hidden", background: C.navyLight, flexShrink: 0,
        }}
      >
        {errored[actual] ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DogSizeIllustration size="mediano" width={width * 0.5} height={height * 0.5} />
          </div>
        ) : (
          <img
            src={fotos[actual]}
            alt={`${nombre} - foto ${actual + 1}`}
            onError={() => setErrored((e) => ({ ...e, [actual]: true }))}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {fotos.length > 1 && (
          <>
            <button
              onClick={anterior}
              aria-label="Foto anterior"
              style={{
                position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: "rgba(255,255,255,0.85)", color: C.navyDark, fontSize: 16,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >‹</button>
            <button
              onClick={siguiente}
              aria-label="Foto siguiente"
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: "rgba(255,255,255,0.85)", color: C.navyDark, fontSize: 16,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >›</button>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {fotos.map((url, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Ver foto ${i + 1}`}
              style={{
                width: 52, height: 52, borderRadius: 8, overflow: "hidden", padding: 0,
                border: `2px solid ${i === actual ? C.gold : "transparent"}`,
                cursor: "pointer", background: C.navyLight, flexShrink: 0,
                opacity: errored[i] ? 0.35 : 1,
              }}
            >
              {!errored[i] && (
                <img
                  src={url}
                  alt=""
                  onError={() => setErrored((e) => ({ ...e, [i]: true }))}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const BreedAvatar = ({ nombre, pct, size = 64, activo = false, onClick }) => {
  const grosor = Math.max(3, size * 0.045);
  const r = (size - grosor * 2) / 2;
  const cx = size / 2, cy = size / 2;
  const circunferencia = 2 * Math.PI * r;
  const offset = circunferencia * (1 - Math.min(100, Math.max(0, pct)) / 100);

  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: onClick ? "pointer" : "default",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        padding: 0, width: size + 12,
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={grosor} />
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={activo ? C.gold : C.navy} strokeWidth={grosor}
            strokeDasharray={circunferencia} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: "absolute", top: grosor, left: grosor, width: size - grosor * 2, height: size - grosor * 2,
          borderRadius: "50%", overflow: "hidden", background: C.navyLight,
        }}>
          <BreedImage nombre={nombre} size={size - grosor * 2} rounded={0} />
        </div>
      </div>
      <span style={{
        fontSize: 15, fontWeight: 700,
        color: activo ? C.gold : C.muted,
      }}>{Math.round(pct)}% {activo ? "match" : ""}</span>
    </button>
  );
};

const historiaCache = {};

async function buscarHistoriaRaza(nombreRaza) {
  if (historiaCache[nombreRaza] !== undefined) return historiaCache[nombreRaza];
  const query = nombreParaBusqueda(nombreRaza);
  try {
    const res = await fetch(
      `https://es.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`
    );
    const data = await res.json();
    const page = Object.values(data?.query?.pages || {})[0];
    historiaCache[nombreRaza] = page?.extract || null;
    return historiaCache[nombreRaza];
  } catch {
    historiaCache[nombreRaza] = null;
    return null;
  }
}

const HistoriaRaza = ({ nombre }) => {
  const [texto, setTexto] = useState(historiaCache[nombre] ?? undefined);

  useEffect(() => {
    let activo = true;
    if (historiaCache[nombre] !== undefined) { setTexto(historiaCache[nombre]); return; }
    buscarHistoriaRaza(nombre).then((t) => { if (activo) setTexto(t); });
    return () => { activo = false; };
  }, [nombre]);

  if (!texto) return null;

  return (
    <div style={{ background: C.white, padding: "8px 56px 48px", textAlign: "center" }}>
      <p style={{ fontSize: 12, color: C.goldDark, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
        Historia de la raza
      </p>
      <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.8, maxWidth: 760, margin: 0 }}>{texto}</p>
      <p style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>Fuente: Wikipedia (CC BY-SA)</p>
    </div>
  );
};

const CARACT_COL1 = [
  { key: "baboseo", label: "Tendencia a babear" },
  { key: "aseo", label: "Necesidades de aseo" },
  { key: "mudaPelo", label: "Nivel de muda" },
  { key: "ladridos", label: "Tendencia a ladrar" },
  { key: "energia", label: "Nivel de energía" },
  { key: "otrasMascotas", label: "Compatibilidad con otras mascotas" },
];
const CARACT_COL2 = [
  { key: "calor", label: "¿Tolera el calor?" },
  { key: "frio", label: "¿Tolera el frío?" },
  { key: "apartamento", label: "Apto para piso" },
  { key: "quedarseSolo", label: "Puede quedarse solo" },
  { key: "familiar", label: "¿Apto para familias?" },
];

const CharacteristicsPanel = ({ raza }) => {
  const [subtab, setSubtab] = useState("caracteristicas");
  const valores = caracteristicasRaza(raza);
  const especificidades = especificidadesRaza(raza);

  const Tab = (key, label) => (
    <button
      onClick={() => setSubtab(key)}
      style={{
        fontSize: 15, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
        fontFamily: "inherit", padding: "0 0 10px",
        color: subtab === key ? C.navyDark : C.muted,
        borderBottom: `2px solid ${subtab === key ? C.navyDark : "transparent"}`,
      }}
    >{label}</button>
  );

  const Row = ({ label, value }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 14, color: C.navyDark, fontWeight: 500 }}>{label}</span>
      <StarRating value={value} />
    </div>
  );

  return (
    <div style={{ background: C.white, padding: "40px 56px 8px" }}>
      <div style={{ display: "flex", gap: 32, justifyContent: "center", marginBottom: 36 }}>
        {Tab("caracteristicas", "Características")}
        {Tab("especificas", "Específicas")}
      </div>

      {subtab === "caracteristicas" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 64, rowGap: 22, maxWidth: 760, margin: "0 auto 40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {CARACT_COL1.map((c) => <Row key={c.key} label={c.label} value={valores[c.key]} />)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {CARACT_COL2.map((c) => <Row key={c.key} label={c.label} value={valores[c.key]} />)}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 600, margin: "0 auto 40px", display: "flex", flexDirection: "column", gap: 10 }}>
          {especificidades.map((linea, i) => (
            <p key={i} style={{ fontSize: 17, fontWeight: 500, color: "#6b7a99", margin: 0 }}>{linea}</p>
          ))}
        </div>
      )}
    </div>
  );
};

const ActivityIcon = ({ level }) => {
  if (level === "bajo") return (
    <svg viewBox="0 0 48 48" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="30" width="32" height="10" rx="3" fill={C.navyLight} stroke={C.navy} strokeWidth="1"/>
      <rect x="12" y="28" width="6" height="3" rx="1.5" fill={C.navy}/>
      <rect x="30" y="28" width="6" height="3" rx="1.5" fill={C.navy}/>
      <circle cx="24" cy="14" r="5" fill={C.navy}/>
      <rect x="20" y="20" width="8" height="10" rx="2" fill={C.navy}/>
      <rect x="16" y="20" width="4" height="2"  rx="1" fill={C.navy}/>
      <rect x="28" y="20" width="4" height="2"  rx="1" fill={C.navy}/>
      <path d="M21 30 L19 38 M27 30 L29 38" stroke={C.navy} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M10 42 L15 38 L20 40 L28 38 L32 40 L38 38" stroke={C.gold} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
  if (level === "medio") return (
    <svg viewBox="0 0 48 48" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="9" r="5" fill={C.navy}/>
      <rect x="20" y="15" width="8" height="11" rx="2" fill={C.navy}/>
      <rect x="14" y="16" width="6" height="2"  rx="1" fill={C.navy}/>
      <rect x="28" y="16" width="6" height="2"  rx="1" fill={C.navy}/>
      <rect x="20" y="26" width="3.5" height="13" rx="1.5" fill={C.navy} transform="rotate(-8 21.7 32)"/>
      <rect x="24.5" y="26" width="3.5" height="13" rx="1.5" fill={C.navy} transform="rotate(8 26.2 32)"/>
      <circle cx="12" cy="34" r="3" fill={C.gold} opacity="0.7"/>
      <circle cx="24" cy="38" r="3" fill={C.gold} opacity="0.7"/>
      <circle cx="36" cy="34" r="3" fill={C.gold} opacity="0.7"/>
      <path d="M12 34 L24 38 L36 34" stroke={C.gold} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="7" r="5" fill={C.navy}/>
      <path d="M22 14 L34 16 L38 28 L30 25 L28 36 L20 26 L12 30 L18 14 Z" fill={C.navy}/>
      <path d="M20 32 L18 42" stroke={C.navy} strokeWidth="3" strokeLinecap="round"/>
      <path d="M28 32 L30 42" stroke={C.navy} strokeWidth="3" strokeLinecap="round"/>
      <path d="M6 38 L14 30 L22 35 L32 22 L42 28" stroke={C.gold} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const HouseIcon = ({ type }) => {
  if (type === "piso") return (
    <svg viewBox="0 0 56 56" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
      <rect x="6"  y="10" width="44" height="38" rx="2" fill={C.navy}/>
      <rect x="6"  y="22" width="44" height="2"  fill={C.navyDark} opacity="0.5"/>
      <rect x="6"  y="34" width="44" height="2"  fill={C.navyDark} opacity="0.5"/>
      <rect x="10" y="26" width="8"  height="10" rx="1" fill="white" opacity="0.3"/>
      <rect x="24" y="26" width="8"  height="10" rx="1" fill="white" opacity="0.3"/>
      <rect x="38" y="26" width="8"  height="10" rx="1" fill="white" opacity="0.3"/>
      <rect x="22" y="36" width="12" height="12" rx="1" fill="white" opacity="0.9"/>
      <rect x="26" y="40" width="4"  height="8"  rx="0.5" fill={C.navy} opacity="0.3"/>
      <line x1="6" y1="48" x2="50" y2="48" stroke={C.gold} strokeWidth="1.5"/>
    </svg>
  );
  if (type === "piso_con_terraza") return (
    <svg viewBox="0 0 56 56" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
      <polygon points="28,6 52,22 4,22" fill={C.navyDark}/>
      <rect x="8"  y="22" width="40" height="28" fill={C.navy}/>
      <rect x="22" y="32" width="12" height="18" rx="1" fill="white" opacity="0.9"/>
      <rect x="26" y="36" width="4"  height="14" rx="0.5" fill={C.navy} opacity="0.3"/>
      <rect x="10" y="24" width="8"  height="7"  rx="1" fill="white" opacity="0.3"/>
      <rect x="38" y="24" width="8"  height="7"  rx="1" fill="white" opacity="0.3"/>
      <rect x="4"  y="48" width="48" height="4"  rx="1" fill={C.gold} opacity="0.7"/>
      <rect x="8"  y="44" width="4"  height="4"  rx="0.5" fill={C.gold} opacity="0.5"/>
      <rect x="44" y="44" width="4"  height="4"  rx="0.5" fill={C.gold} opacity="0.5"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 56 56" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
      <polygon points="28,4 54,20 2,20" fill={C.navyDark}/>
      <rect x="6"  y="20" width="44" height="28" fill={C.navy}/>
      <rect x="22" y="30" width="12" height="18" rx="1" fill="white" opacity="0.9"/>
      <rect x="26" y="34" width="4"  height="14" rx="0.5" fill={C.navy} opacity="0.3"/>
      <rect x="8"  y="22" width="8"  height="7"  rx="1" fill="white" opacity="0.3"/>
      <rect x="40" y="22" width="8"  height="7"  rx="1" fill="white" opacity="0.3"/>
      <circle cx="10" cy="50" r="5" fill={C.success} opacity="0.8"/>
      <circle cx="46" cy="50" r="5" fill={C.success} opacity="0.8"/>
      <circle cx="6"  cy="54" r="3" fill={C.success} opacity="0.6"/>
      <circle cx="50" cy="54" r="3" fill={C.success} opacity="0.6"/>
    </svg>
  );
};

const Star = ({ filled }) => (
  <svg viewBox="0 0 20 20" width="15" height="15" style={{ marginRight: 1 }}>
    <path
      d="M10 1.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L1.4 7.9l6-.8z"
      fill={filled ? C.gold : "none"}
      stroke={C.gold}
      strokeWidth="1"
    />
  </svg>
);

const StarRating = ({ value = 0, max = 5 }) => (
  <div style={{ display: "flex" }}>
    {Array.from({ length: max }).map((_, i) => <Star key={i} filled={i < value} />)}
  </div>
);

const RankingQuestion = ({ pregunta, valorInicial, onConfirmar }) => {
  const [orden, setOrden] = useState(valorInicial || pregunta.items.map((i) => i.key));

  const mover = (key, dir) => {
    setOrden((prev) => {
      const idx = prev.indexOf(key);
      const nuevoIdx = idx + dir;
      if (nuevoIdx < 0 || nuevoIdx >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[nuevoIdx]] = [copia[nuevoIdx], copia[idx]];
      return copia;
    });
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {orden.map((key, i) => {
          const item = pregunta.items.find((it) => it.key === key);
          return (
            <div
              key={key}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: "14px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg viewBox="0 0 20 20" width="16" height="16" fill={C.muted}>
                  <rect y="3" width="20" height="2" />
                  <rect y="9" width="20" height="2" />
                  <rect y="15" width="20" height="2" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.navyDark }}>{item.label}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => mover(key, -1)}
                  disabled={i === 0}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", border: "none",
                    background: i === 0 ? C.navyLight : C.navy,
                    color: i === 0 ? C.muted : C.white,
                    cursor: i === 0 ? "default" : "pointer",
                  }}
                >↑</button>
                <button
                  onClick={() => mover(key, 1)}
                  disabled={i === orden.length - 1}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", border: "none",
                    background: i === orden.length - 1 ? C.navyLight : C.navy,
                    color: i === orden.length - 1 ? C.muted : C.white,
                    cursor: i === orden.length - 1 ? "default" : "pointer",
                  }}
                >↓</button>
              </div>
            </div>
          );
        })}
      </div>
      <button style={S.landingBtn} onClick={() => onConfirmar(orden)}>Continuar</button>
    </div>
  );
};

function rasgosDeRaza(raza) {
  const candidatos = [];
  if (raza.sociabilidad === "muy_sociable") candidatos.push("Amoroso");
  else if (raza.sociabilidad === "sociable") candidatos.push("Sociable");
  else if (raza.sociabilidad === "reservado") candidatos.push("Reservado");
  else if (raza.sociabilidad === "poco_sociable") candidatos.push("Independiente");
  if (raza.proteccion === "no_comparte_nada") candidatos.push("Guardián");
  else if (raza.proteccion === "comparte_mucho") candidatos.push("Confiado");
  if (raza.energia === "muy_alto") candidatos.push("Enérgico");
  else if (raza.energia === "alto") candidatos.push("Activo");
  else if (raza.energia === "bajo") candidatos.push("Tranquilo");
  if (raza.juego === "juguetón") candidatos.push("Juguetón");
  if (raza.adaptabilidad === "adaptable") candidatos.push("Adaptable");
  if (raza.ladridos === "alto") candidatos.push("Atento");
  if (raza.entrenamiento === "muy_alto" || raza.entrenamiento === "alto") candidatos.push("Inteligente");
  if (raza.ninos === "muy_recomendado") candidatos.push("Familiar");
  const unicos = [...new Set(candidatos)];
  return unicos.length > 0 ? unicos.slice(0, 3) : ["Leal", "Compañero", "Equilibrado"];
}

const ESCALA_ENERGIA      = ["bajo", "medio", "alto", "muy_alto"];
const ESCALA_TAMANO       = ["pequeño", "mediano", "grande", "muy_grande"];
const ESCALA_SOCIABILIDAD = ["poco_sociable", "reservado", "sociable", "muy_sociable"];
const ESCALA_PROTECCION   = ["no_comparte_nada", "comparte_poco", "comparte", "comparte_mucho"];
const ESCALA_ENTRENAMIENTO= ["nada", "bajo", "normal", "alto", "muy_alto"];
const ESCALA_ASEO         = ["mensual", "quincenal", "semanal", "frecuente", "diario"];
const ESCALA_MUDA         = ["sin_muda", "baja", "media", "alta"];
const ESCALA_LADRIDOS     = ["bajo", "medio", "alto"];
const ESCALA_RECOMENDACION= ["no_recomendado", "poco_recomendado", "recomendado", "muy_recomendado"];

function escalaAEstrellas(escala, valor, defecto = 3) {
  const i = escala.indexOf(valor);
  if (i === -1) return defecto;
  return Math.round(1 + (i * 4) / (escala.length - 1));
}

function caracteristicasRaza(raza) {
  let apartamento = 3;
  if (raza.vivienda === "piso" || raza.vivienda === "indiferente") apartamento += 1;
  if (raza.vivienda === "casa_con_jardin") apartamento -= 1;
  if (raza.energia === "muy_alto") apartamento -= 1;
  if (raza.energia === "bajo") apartamento += 1;
  if (raza.tamano === "muy_grande") apartamento -= 1;
  let quedarseSolo = 3;
  if (raza.sociabilidad === "poco_sociable" || raza.sociabilidad === "reservado") quedarseSolo += 1;
  if (raza.sociabilidad === "muy_sociable") quedarseSolo -= 1;
  if (raza.proteccion === "no_comparte_nada") quedarseSolo -= 1;
  return {
    baboseo:       escalaAEstrellas(["bajo", "medio", "alto"], raza.baboseo, 2),
    aseo:          escalaAEstrellas(ESCALA_ASEO, raza.aseo, 3),
    mudaPelo:      escalaAEstrellas(ESCALA_MUDA, raza.mudaPelo, 3),
    ladridos:      escalaAEstrellas(ESCALA_LADRIDOS, raza.ladridos, 3),
    energia:       escalaAEstrellas(ESCALA_ENERGIA, raza.energia, 3),
    otrasMascotas: escalaAEstrellas(ESCALA_RECOMENDACION, raza.otrasMascotas, 3),
    calor:         escalaAEstrellas(["bajo", "medio", "alto"], raza.toleranciaCalor, 3),
    frio:          escalaAEstrellas(["bajo", "medio", "alto"], raza.toleranciaFrio, 3),
    apartamento:   Math.min(5, Math.max(1, apartamento)),
    quedarseSolo:  Math.min(5, Math.max(1, quedarseSolo)),
    familiar:      escalaAEstrellas(ESCALA_RECOMENDACION, raza.ninos, 3),
  };
}

const PESOS = {
  tamano: 4, actividad: 5, ninos: 5, temperamento: 3,
  aseo: 3, salud: 2, entrenamiento: 2, otros_perros: 3,
  tuvo_perro: 1, vivienda: 4, ladridos: 2, mudaPelo: 2,
  alergenico: 3,
};

function pesosSegunPrioridad(orden) {
  if (!orden || orden.length === 0) return PESOS;
  const ajustados = { ...PESOS };
  orden.forEach((key, i) => {
    // posición 0 (más importante) = x1.6 ... última posición = x0.5
    const factor = 1.6 - (i / (orden.length - 1)) * 1.1;
    if (ajustados[key] !== undefined) {
      ajustados[key] = PESOS[key] * factor;
    }
  });
  return ajustados;
}

// ─── Razas destacadas ───────────────────────────────────────────────────────
const RAZAS_DESTACADAS = new Set([
  "AKITA AMERICANO", "AKITA", "ALASKAN MALAMUTE", "AMERICAN STAFFORDSHIRE TERRIER",
  "AUSTRALIAN CATTLE DOG", "BASENJI", "BASSET HOUND", "BEAGLE", "BICHON HABANERO",
  "BICHON MALTES", "BORDER COLLIE", "BOSTON TERRIER", "BRACO ALEMAN", "BRACO DE WEIMAR",
  "BRACO FRANCES - TIPO PIRINEOS", "CANICHE", "CAVALIER KING CHARLES SPANIEL", "CHIHUAHUA",
  "CHOW CHOW", "COCKER SPANIEL INGLES", "DOBERMANN", "DOGO ALEMAN", "EPAGNEUL BRETON",
  "EURASIER", "AFGAN HOUND", "GOLDEN RETRIEVER", "PERRO DE PASTOR CATALAN", "GREYHOUND",
  "IRISH WOLFHOUND", "JACK RUSSELL TERRIER", "LABRADOR RETRIEVER", "LHASA APSO",
  "MASTIN DEL PIRINEO", "MASTIN ESPAÑOL", "EPAGNEUL NAIN CONTINENTAL",
  "PASTOR MINIATURA AMERICANO (PROV. ACEP. FCI.)", "PEQUEÑO PERRO RUSO (RUSSKIY TOY)",
  "PERRO DE AGUA ESPAÑOL", "PERRO DE PASTOR ALEMAN", "PERRO DE PASTOR AUSTRALIANO",
  "PERRO DE PASTOR BELGA", "PERRO DE PASTOR BLANCO SUIZO", "ROTTWEILER",
  "SHETLAND SHEEPDOG", "SHIBA", "SHIH TZU", "SHIKOKU", "SIBERIAN HUSKY", "SPITZ ALEMAN",
  "ENGLISH SPRINGER SPANIEL", "TECKEL", "TERRANOVA", "THAI RIDGEBACK DOG",
  "WELSH CORGI PEMBROKE", "YORKSHIRE TERRIER", "ZWERGPINSCHER",
]);

const BOOST_DESTACADAS = 1.12;

const BOOST_POPULARIDAD = {
  1: 1.15,
  2: 1.08,
  3: 1.00,
  4: 0.93,
};

const ETIQ_TAMANO = {
  pequeño: "Mini / pequeño", mediano: "Mediano", grande: "Grande",
  muy_grande: "Gigante", indiferente: "Cualquier tamaño",
};
const ETIQ_ENERGIA = { bajo: "Bajo", medio: "Medio", alto: "Alto", muy_alto: "Muy alto" };
const ETIQ_NINOS = {
  muy_recomendado: "Sí (todas las edades)", recomendado: "Sí, recomendado",
  poco_recomendado: "Con supervisión", no_recomendado: "No recomendado",
};
const ETIQ_SOCIABILIDAD = {
  muy_sociable: "Muy sociable", sociable: "Sociable",
  reservado: "Reservado", poco_sociable: "Independiente",
};
const ETIQ_OTRAS_MASCOTAS = {
  muy_recomendado: "Excelente", recomendado: "Bueno",
  poco_recomendado: "Difícil", no_recomendado: "No recomendado",
};
const ETIQ_ENTRENAMIENTO = {
  nada: "Mínimas", bajo: "Básicas", normal: "Moderadas",
  alto: "Altas", muy_alto: "Muy altas",
};
const ETIQ_ASEO = {
  mensual: "Bajos", quincenal: "Moderados", semanal: "Moderados",
  frecuente: "Altos", diario: "Muy altos",
};
const ETIQ_VIVIENDA = {
  piso: "Piso sin jardín", piso_con_terraza: "Casa sin jardín o con jardín pequeño",
  casa_con_jardin: "Casa con jardín amplio", indiferente: "Cualquier vivienda",
};
const ETIQ_LADRIDOS = { bajo: "Bajo", medio: "Medio", alto: "Alto" };
const ETIQ_MUDA = { sin_muda: "Prácticamente nula", baja: "Baja", media: "Media", alta: "Alta" };

function nivelVeterinario(raza) {
  const muda = { sin_muda: 0, baja: 0.5, media: 1, alta: 1.5 }[raza.mudaPelo] ?? 1;
  const estim = { bajo: 0, medio: 1, alto: 2, muy_alto: 3 }[raza.estimulacion] ?? 1;
  const score = muda + estim;
  if (score >= 3.5) return "alto";
  if (score >= 1.5) return "medio";
  return "bajo";
}
const ETIQ_VETERINARIO = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

function comparar(escala, vU, vR, tolerancia = 0) {
  if (!vU || vU === NO_IMPORTA || !vR) return null;
  const i = escala.indexOf(vU), j = escala.indexOf(vR);
  if (i === -1 || j === -1) return null;
  return Math.abs(i - j) <= tolerancia;
}

function construirFilasResultado(raza, resp) {
  const tamanoUsuarioOk =
    resp.tamano === NO_IMPORTA || !resp.tamano
      ? null
      : raza.tamano === "indiferente"
        ? true
        : comparar(ESCALA_TAMANO, resp.tamano, raza.tamano, 0);

  const vetNivel = nivelVeterinario(raza);
  const ESCALA_VET = ["bajo", "medio", "alto"];

  return {
    Cuéntanos_un_poco_más_sobre_ti: [
      { label: "Tamaño", valor: ETIQ_TAMANO[raza.tamano] || raza.tamano, acierto: tamanoUsuarioOk },
      { label: "Nivel de energía", valor: ETIQ_ENERGIA[raza.energia] || raza.energia, acierto: comparar(ESCALA_ENERGIA, resp.actividad, raza.energia, 0) },
    ],
    temperamento: [
      {
        label: "Apto para niños",
        valor: ETIQ_NINOS[raza.ninos] || raza.ninos,
        acierto: !resp.ninos || resp.ninos === "sin_ninos" ? null : raza.ninos === "muy_recomendado" || raza.ninos === "recomendado",
      },
      {
        label: "Temperamento con las personas",
        valor: ETIQ_SOCIABILIDAD[raza.sociabilidad] || raza.sociabilidad,
        acierto: (() => {
          if (!resp.temperamento) return null;
          if (resp.temperamento === "amistoso") return comparar(ESCALA_SOCIABILIDAD, "muy_sociable", raza.sociabilidad, 1);
          if (resp.temperamento === "independiente") return comparar(ESCALA_SOCIABILIDAD, "reservado", raza.sociabilidad, 1);
          if (resp.temperamento === "protector") return comparar(ESCALA_PROTECCION, "comparte_mucho", raza.proteccion, 1);
          if (resp.temperamento === "timido") return comparar(ESCALA_SOCIABILIDAD, "poco_sociable", raza.sociabilidad, 1);
          return null;
        })(),
      },
      {
        label: "Temperamento con otros perros",
        valor: ETIQ_OTRAS_MASCOTAS[raza.otrasMascotas] || raza.otrasMascotas,
        acierto: resp.otros_perros !== "si" ? null : raza.otrasMascotas === "muy_recomendado" || raza.otrasMascotas === "recomendado",
      },
    ],
    cuidados: [
      { label: "Necesidades educativas", valor: ETIQ_ENTRENAMIENTO[raza.entrenamiento] || raza.entrenamiento, acierto: comparar(ESCALA_ENTRENAMIENTO, resp.entrenamiento, raza.entrenamiento, 1) },
      { label: "Cuidados de aseo y muda de pelo", valor: ETIQ_ASEO[raza.aseo] || raza.aseo, acierto: comparar(ESCALA_ASEO, resp.aseo, raza.aseo, 1) },
      { label: "Tendencia a ladrar", valor: ETIQ_LADRIDOS[raza.ladridos] || raza.ladridos, acierto: comparar(ESCALA_LADRIDOS, resp.ladridos, raza.ladridos, 0) },
      { label: "Nivel de muda de pelo", valor: ETIQ_MUDA[raza.mudaPelo] || raza.mudaPelo, acierto: comparar(ESCALA_MUDA, resp.mudaPelo, raza.mudaPelo, 0) },
      {
        label: "Nivel de cuidados veterinarios",
        valor: ETIQ_VETERINARIO[vetNivel],
        acierto: !resp.salud || resp.salud === NO_IMPORTA ? null : comparar(ESCALA_VET, resp.salud === "alto" ? "alto" : resp.salud === "bajo" ? "bajo" : "medio", vetNivel, 0),
      },
      {
        label: "Perro poco alergénico",
        valor: raza.mudaPelo === "sin_muda" ? "Sí, muda mínima" : raza.mudaPelo === "baja" ? "Bastante, muda baja" : "No especialmente",
        acierto: resp.alergenico !== "si" ? null : raza.mudaPelo === "sin_muda" || raza.mudaPelo === "baja",
      },
    ],
    acercaDeTi: [
      {
        label: "Adaptado para una primera experiencia",
        valor: raza.entrenamiento === "bajo" || raza.entrenamiento === "nada" ? "Sí" : "Requiere experiencia previa",
        acierto: resp.tuvo_perro !== "primerizo" ? null : raza.entrenamiento === "bajo" || raza.entrenamiento === "nada",
      },
      {
        label: "Requisitos del entorno vital",
        valor: ETIQ_VIVIENDA[raza.vivienda] || raza.vivienda,
        acierto: resp.vivienda === NO_IMPORTA || !resp.vivienda ? null : raza.vivienda === "indiferente" ? true : comparar(["piso", "piso_con_terraza", "casa_con_jardin"], resp.vivienda, raza.vivienda, 0),
      },
    ],
  };
}

function descripcionGenerada(raza, nombreFormateado) {
  const tamanoTxt = { pequeño: "de tamaño pequeño", mediano: "de tamaño mediano", grande: "de tamaño grande", muy_grande: "de gran tamaño", indiferente: "de tamaño variable" }[raza.tamano] || "";
  const energiaTxt = { bajo: "un nivel de energía tranquilo, feliz con paseos moderados", medio: "un nivel de energía moderado, con necesidad de ejercicio regular", alto: "un nivel de energía alto, que agradece largas sesiones de actividad", muy_alto: "un nivel de energía muy alto, ideal para personas muy activas" }[raza.energia] || "";
  const socialTxt = { muy_sociable: "Es una raza muy sociable y afectuosa con las personas", sociable: "Es una raza sociable que disfruta de la compañía humana", reservado: "Es una raza algo reservada, que necesita tiempo para confiar", poco_sociable: "Es una raza independiente y selectiva con los desconocidos" }[raza.sociabilidad] || "";
  const aseoTxt = { mensual: "sus necesidades de aseo son mínimas", quincenal: "requiere un aseo moderado", semanal: "requiere cepillado semanal", frecuente: "necesita cuidados de aseo frecuentes", diario: "necesita cuidados de aseo intensivos y regulares" }[raza.aseo] || "";
  const ninosTxt = { muy_recomendado: "Se considera muy recomendada para hogares con niños.", recomendado: "Se considera recomendada para la convivencia con niños.", poco_recomendado: "Su convivencia con niños requiere supervisión.", no_recomendado: "No suele recomendarse para hogares con niños pequeños." }[raza.ninos] || "";
  return (`El ${nombreFormateado} es un perro ${tamanoTxt}, con ${energiaTxt}. ${socialTxt}, y ${aseoTxt}. ${ninosTxt}`).replace(/\s+/g, " ").trim();
}

function urlFCI(nombreRaza) {
  const limpio = nombreRaza.replace(/\s*\(.*?\)\s*/g, "").trim();
  const inicial = limpio.charAt(0).toUpperCase();
  return `https://www.fci.be/Nomenclature/races.aspx?init=${encodeURIComponent(inicial)}`;
}

const CATEGORIA_TAMANO = { pequeño: "Pequeño / mini", mediano: "Mediano", grande: "Grande", muy_grande: "Muy grande", indiferente: "Variable" };
const ESPERANZA_VIDA = { pequeño: "12-15 años", mediano: "10-13 años", grande: "9-12 años", muy_grande: "8-10 años", indiferente: "10-13 años" };

const ESPECIFICACIONES_TAMANO = {
  pequeño: {
    alturaMacho: "18 – 35 cm", alturaHembra: "18 – 35 cm",
    pesoMacho: "1 – 10 kg", pesoHembra: "1 – 10 kg",
    cachorro: "Nacimiento a 10 meses",
    adulto: "10 meses a 8 años",
    maduro: "8 a 12 años",
    senior: "Desde 12 años",
  },
  mediano: {
    alturaMacho: "36 – 50 cm", alturaHembra: "35 – 48 cm",
    pesoMacho: "11 – 25 kg", pesoHembra: "10 – 23 kg",
    cachorro: "Nacimiento a 12 meses",
    adulto: "12 meses a 7 años",
    maduro: "7 a 10 años",
    senior: "Desde 10 años",
  },
  grande: {
    alturaMacho: "51 – 65 cm", alturaHembra: "48 – 62 cm",
    pesoMacho: "26 – 44 kg", pesoHembra: "24 – 40 kg",
    cachorro: "Nacimiento a 15 meses",
    adulto: "15 meses a 6 años",
    maduro: "6 a 9 años",
    senior: "Desde 9 años",
  },
  muy_grande: {
    alturaMacho: "65 – 80 cm", alturaHembra: "60 – 75 cm",
    pesoMacho: "45 – 90 kg", pesoHembra: "40 – 80 kg",
    cachorro: "Nacimiento a 18 meses",
    adulto: "18 meses a 5 años",
    maduro: "5 a 8 años",
    senior: "Desde 8 años",
  },
  indiferente: {
    alturaMacho: "Variable", alturaHembra: "Variable",
    pesoMacho: "Variable", pesoHembra: "Variable",
    cachorro: "Nacimiento a 12 meses",
    adulto: "12 meses a 7 años",
    maduro: "7 a 10 años",
    senior: "Desde 10 años",
  },
};

function caracterRaza(raza) { return rasgosDeRaza(raza).join(" / "); }

function especificidadesRaza(raza) {
  return [
    `Categoría de tamaño: ${CATEGORIA_TAMANO[raza.tamano] || raza.tamano}`,
    `Esperanza de vida aproximada: ${ESPERANZA_VIDA[raza.tamano] || "10-13 años"}`,
    caracterRaza(raza),
  ];
}

function hechosClave(raza) {
  const hechos = [];
  if (raza.aseo === "mensual" || raza.aseo === "quincenal") hechos.push("Requiere cuidados de aseo mínimos");
  else if (raza.aseo === "diario") hechos.push("Necesita aseo diario");
  if (raza.entrenamiento === "nada" || raza.entrenamiento === "bajo") hechos.push("Necesita poco entrenamiento");
  else if (raza.entrenamiento === "muy_alto") hechos.push("Requiere entrenamiento intensivo");
  if (raza.vivienda === "piso" || raza.vivienda === "indiferente") hechos.push("Jardín no esencial");
  else if (raza.vivienda === "casa_con_jardin") hechos.push("Necesita jardín amplio");
  if (raza.energia === "bajo" || raza.energia === "medio") hechos.push("Se adapta bien a la vida tranquila en casa");
  else if (raza.energia === "muy_alto") hechos.push("Necesita mucho ejercicio diario");
  if (raza.mudaPelo === "sin_muda" || raza.mudaPelo === "baja") hechos.push("Muda de pelo baja");
  else if (raza.mudaPelo === "alta") hechos.push("Muda de pelo abundante");
  if (raza.ninos === "muy_recomendado") hechos.push("Excelente con niños");
  if (raza.otrasMascotas === "muy_recomendado") hechos.push("Se lleva bien con otras mascotas");
  if (raza.ladridos === "bajo") hechos.push("Poco ladrador");
  return hechos.slice(0, 5);
}

function puntajeEscala(escala, vU, vR) {
  if (!vU || vU === NO_IMPORTA || !vR) return null;
  const i = escala.indexOf(vU), j = escala.indexOf(vR);
  if (i === -1 || j === -1) return null;
  return 1 - Math.abs(i - j) / (escala.length - 1);
}

function calcularResultado(resp) {
  const pesos = pesosSegunPrioridad(resp.prioridades);

  const maxPts = Object.entries(pesos).reduce((a, [k, p]) => {
    if (resp[k] === NO_IMPORTA) return a;
    if (k === "alergenico" && resp[k] !== "si") return a;
    return a + p;
  }, 0);

  const resultados = razas.map((raza) => {
    let pts = 0;
    if (resp.tamano !== NO_IMPORTA) {
      if (raza.tamano === "indiferente") pts += pesos.tamano;
      else { const p = puntajeEscala(ESCALA_TAMANO, resp.tamano, raza.tamano); if (p !== null) pts += p * pesos.tamano; }
    }
    const pEn = puntajeEscala(ESCALA_ENERGIA, resp.actividad, raza.energia);
    if (pEn !== null) pts += pEn * pesos.actividad;
    if (resp.ninos === "convive_siempre") {
      if (raza.ninos === "muy_recomendado") pts += pesos.ninos;
      else if (raza.ninos === "recomendado") pts += pesos.ninos * 0.6;
      else if (raza.ninos === "poco_recomendado") pts -= pesos.ninos * 0.5;
      else if (raza.ninos === "no_recomendado") pts -= pesos.ninos * 1.5;
    } else if (resp.ninos === "alguna_visita") {
      if (raza.ninos === "muy_recomendado" || raza.ninos === "recomendado") pts += pesos.ninos * 0.7;
      else if (raza.ninos === "no_recomendado") pts -= pesos.ninos * 0.5;
      else pts += pesos.ninos * 0.3;
    } else {
      pts += pesos.ninos * 0.3;
    }
    if (resp.temperamento === "amistoso") { const p = puntajeEscala(ESCALA_SOCIABILIDAD, "muy_sociable", raza.sociabilidad); if (p !== null) pts += p * pesos.temperamento; }
    else if (resp.temperamento === "independiente") { const p = puntajeEscala(ESCALA_SOCIABILIDAD, "reservado", raza.sociabilidad); if (p !== null) pts += p * pesos.temperamento; }
    else if (resp.temperamento === "protector") { const p = puntajeEscala(ESCALA_PROTECCION, "comparte_mucho", raza.proteccion); if (p !== null) pts += p * pesos.temperamento; }
    else if (resp.temperamento === "timido") { const p = puntajeEscala(ESCALA_SOCIABILIDAD, "poco_sociable", raza.sociabilidad); if (p !== null) pts += p * pesos.temperamento; }
    const pAd = puntajeEscala(ESCALA_ENTRENAMIENTO, resp.entrenamiento, raza.entrenamiento);
    if (pAd !== null) pts += pAd * pesos.entrenamiento;
    if (resp.tuvo_perro === "primerizo") {
      if (raza.entrenamiento === "muy_alto") pts -= pesos.tuvo_perro * 2;
      else if (raza.entrenamiento === "alto") pts -= pesos.tuvo_perro;
      else pts += pesos.tuvo_perro * 0.5;
    } else { pts += pesos.tuvo_perro * 0.5; }
    const pAs = puntajeEscala(ESCALA_ASEO, resp.aseo, raza.aseo);
    if (pAs !== null) pts += pAs * pesos.aseo;
    if (resp.salud !== NO_IMPORTA) {
      if (resp.salud === "bajo") { const p = puntajeEscala(ESCALA_MUDA, "sin_muda", raza.mudaPelo); if (p !== null) pts += p * pesos.salud; }
      else if (resp.salud === "alto") { pts += pesos.salud * 0.5; }
      else { const p = puntajeEscala(ESCALA_MUDA, "media", raza.mudaPelo); if (p !== null) pts += p * pesos.salud; }
    }
    if (resp.otros_perros === "si") {
      if (raza.otrasMascotas === "muy_recomendado") pts += pesos.otros_perros;
      else if (raza.otrasMascotas === "recomendado") pts += pesos.otros_perros * 0.6;
      else if (raza.otrasMascotas === "no_recomendado") pts -= pesos.otros_perros * 1.5;
      else if (raza.otrasMascotas === "poco_recomendado") pts -= pesos.otros_perros * 0.5;
    }
    if (resp.vivienda !== NO_IMPORTA) {
      if (resp.vivienda === "piso" && (raza.tamano === "grande" || raza.tamano === "muy_grande")) pts -= pesos.vivienda * 0.75;
      if (resp.vivienda === "piso" && raza.energia === "muy_alto") pts -= pesos.vivienda * 0.5;
      if (raza.vivienda === resp.vivienda) pts += pesos.vivienda;
      else if (raza.vivienda === "indiferente") pts += pesos.vivienda * 0.6;
      else { const p = puntajeEscala(["piso", "piso_con_terraza", "casa_con_jardin"], resp.vivienda, raza.vivienda); if (p !== null) pts += p * pesos.vivienda * 0.5; }
    }
    const pLad = puntajeEscala(ESCALA_LADRIDOS, resp.ladridos, raza.ladridos);
    if (pLad !== null) pts += pLad * pesos.ladridos;
    const pMuda = puntajeEscala(ESCALA_MUDA, resp.mudaPelo, raza.mudaPelo);
    if (pMuda !== null) pts += pMuda * pesos.mudaPelo;
    if (resp.alergenico === "si") {
      if (raza.mudaPelo === "sin_muda") pts += pesos.alergenico;
      else if (raza.mudaPelo === "baja") pts += pesos.alergenico * 0.6;
      else if (raza.mudaPelo === "alta") pts -= pesos.alergenico * 0.75;
    }
    if (RAZAS_DESTACADAS.has(raza.nombre) && pts > 0) {
      pts *= BOOST_DESTACADAS;
      const nivelPopularidad = popularidadEspana[raza.nombre];
    if (nivelPopularidad && pts > 0) {
      pts *= BOOST_POPULARIDAD[nivelPopularidad] ?? 1;
    }
    }
    return { nombre: raza.nombre, pts, pct: maxPts > 0 ? Math.max(0, (pts / maxPts) * 100) : 0 };
  });

  const ord = resultados.sort((a, b) => b.pts - a.pts);

  const UMBRAL = 60;
  const mejor = ord[0];
  const compatibles = ord.filter((r) => r.pct >= UMBRAL);
  return { mejor, alternativas: compatibles.slice(1, 4), recomendarPeluche: !mejor || mejor.pct < UMBRAL };
}

const ASIDE_TIPS = [
  "El tamaño no siempre determina el nivel de energía de un perro.",
  "La socialización temprana es clave para cualquier raza.",
  "Un perro activo en casa feliz es un perro feliz.",
  "El tiempo de aseo varía mucho según la raza y el tipo de pelo.",
  "La compatibilidad con niños depende también de la educación.",
  "Visitas regulares al veterinario alargan la vida de tu perro.",
  "Invertir en adiestramiento es invertir en convivencia.",
  "Conocer la raza ayuda a establecer expectativas realistas.",
  "La vivienda importa, pero el ejercicio diario importa más.",
  "La experiencia previa facilita la adaptación mutua.",
  "Ningún perro es 100% hipoalergénico, pero algunas razas sueltan mucho menos pelo.",
];

const PREGUNTAS = [
  // ─── BLOQUE 1 · Cuéntanos un poco más sobre ti ─────────────────────────
  {
    seccion: "Cuéntanos un poco más sobre ti",
    seccionCorta: "Sobre ti",
    key: "tuvo_perro",
    titulo: "¿Como adulto has tenido perro antes?",
    desc: "Tu experiencia previa determina qué razas te resultarán más cómodas de gestionar.",
    hasIcon: false,
    cols: 1,
    opciones: [
      {
        label: "Sí, tengo experiencia",
        sub: "He convivido con perros como propietario principal",
        value: "experimentado",
      },
      {
        label: "Primera vez",
        sub: "Nunca he tenido o solo convivía con el perro de la familia",
        value: "primerizo",
      },
    ],
  },

  {
    seccion: "Cuéntanos un poco más sobre ti",
    seccionCorta: "Sobre ti",
    key: "actividad",
    titulo: "¿Cuál es tu nivel de actividad?",
    desc: "Tu estilo de vida es uno de los factores más importantes para encontrar una raza compatible.",
    hasIcon: false,
    cols: 1,
    opciones: [
      {
        label: "Tranquilo",
        sub: "Prefiero un ritmo relajado",
        value: "bajo",
        icon: <ActivityIcon level="bajo" />,
      },
      {
        label: "Moderado",
        sub: "Me gusta mantenerme activo",
        value: "medio",
        icon: <ActivityIcon level="medio" />,
      },
      {
        label: "Muy activo",
        sub: "Hago deporte o actividades al aire libre con frecuencia",
        value: "alto",
        icon: <ActivityIcon level="alto" />,
      },
    ],
  },

  {
    seccion: "Cuéntanos un poco más sobre ti",
    seccionCorta: "Sobre ti",
    key: "ninos",
    titulo: "¿Hay niños en casa o los habrá próximamente?",
    desc: "Algunas razas muestran una paciencia y afecto excepcional con los más pequeños.",
    hasIcon: false,
    cols: 1,
    opciones: [
      {
        label: "Sí, viven en casa",
        value: "convive_siempre",
      },
      {
        label: "Probablemente en los próximos años",
        value: "alguna_visita",
      },
      {
        label: "No",
        value: "sin_ninos",
      },
    ],
  },

  {
    seccion: "Cuéntanos un poco más sobre ti",
    seccionCorta: "Sobre ti",
    key: "vivienda",
    titulo: "¿Qué tipo de vivienda tienes?",
    desc: "El tipo de vivienda ayuda a determinar qué razas se adaptan mejor a tu entorno.",
    hasIcon: false,
    cols: 1,
    opciones: [
      {
        label: "Piso",
        sub: "Sin jardín",
        value: "piso",
        icon: <HouseIcon type="piso" />,
      },
      {
        label: "Casa con jardín pequeño",
        sub: "Espacio exterior reducido",
        value: "piso_con_terraza",
        icon: <HouseIcon type="piso_con_terraza" />,
      },
      {
        label: "Casa con jardín amplio",
        sub: "Gran espacio exterior",
        value: "casa_con_jardin",
        icon: <HouseIcon type="casa_con_jardin" />,
      },
    ],
  },

  {
    seccion: "Cuéntanos un poco más sobre ti",
    seccionCorta: "Sobre ti",
    key: "alergenico",
    titulo: "¿Buscas un perro poco alergénico?",
    desc: "Algunas razas producen menos alérgenos gracias a su tipo de pelo. Ningún perro es 100% hipoalergénico, pero algunas razas sueltan mucho menos pelo y caspa.",
    hasIcon: false,
    cols: 1,
    opciones: [
      {
        label: "Sí, es importante",
        sub: "Prefiero una raza que suelte poco pelo y caspa.",
        value: "si",
      },
      {
        label: "No es necesario",
        sub: "No es un factor determinante para mí.",
        value: "no",
      },
      {
        label: "No lo tengo claro",
        sub: "Prefiero no descartar razas por este motivo.",
        value: NO_IMPORTA,
      },
    ],
  },

   // ─── Características del perro (queda tamaño y aseo) ──────────────────────
{
  seccion: "Características del perro",
  seccionCorta: "Características",
  key: "tamano",
  titulo: "¿Qué tamaño de perro encaja mejor en tu vida?",
  hasIcon: true,
  cols: 3,
  opciones: [
    { label: "Miniatura", sub: "Menos de 4 kg", value: "pequeño", icon: <DogSizeIllustration size="mini" /> },
    { label: "Mini", sub: "De 4 a 10 kg", value: "pequeño", icon: <DogSizeIllustration size="pequeno" /> },
    { label: "Mediano", sub: "De 11 a 25 kg", value: "mediano", icon: <DogSizeIllustration size="mediano" /> },
    { label: "Maxi", sub: "De 26 a 44 kg", value: "grande", icon: <DogSizeIllustration size="grande" /> },
    { label: "Gigante", sub: "Más de 45 kg", value: "muy_grande", icon: <DogSizeIllustration size="muygrande" /> },
    { label: "No importa", sub: "Cualquier tamaño", value: NO_IMPORTA, icon: <DogSizeIllustration size="noImporta" /> },
  ],
},

{
  seccion: "Características del perro",
  seccionCorta: "Cuidados",
  key: "aseo",
  titulo: "¿Cuánto tiempo puedes dedicar al cuidado de su pelo y sus uñas?",
  desc: "Piensa en el tiempo, la constancia y el presupuesto que puedes destinar a sus cuidados.",
  hasIcon: false,
  cols: 1,
  opciones: [
    { label: "Lo esencial", sub: "Cuidados sencillos", value: "mensual" },
    { label: "De vez en cuando", sub: "Cepillado semanal", value: "semanal" },
    { label: "Con frecuencia", sub: "Cepillado frecuente", value: "frecuente" },
    { label: "Todo lo necesario", sub: "Estoy dispuesto a dedicarle todo el tiempo que necesite", value: "diario" },
  ],
},

// ─── Rasgos de comportamiento ───────────────────────────────────────────────
{
  seccion: "Rasgos de comportamiento",
  seccionCorta: "Comportamiento",
  key: "entrenamiento",
  titulo: "¿Qué facilidad de aprendizaje buscas en tu perro?",
  desc: "Algunas razas disfrutan aprendiendo y colaborando con sus personas, mientras que otras tienen un carácter más independiente y necesitan un enfoque educativo paciente y constante.",
  hasIcon: false,
  cols: 1,
  opciones: [
    { label: "Alto", sub: "Le encantará aprender y hacer actividades contigo.", value: "muy_alto" },
    { label: "Medio", sub: "Disfrutará participando con cierta frecuencia.", value: "alto" },
    { label: "Normal", sub: "Se adaptará a actividades sencillas y ocasionales.", value: "normal" },
    { label: "Bajo", sub: "Preferirá una rutina tranquila y más independiente.", value: "bajo" },
  ],
},

{
  seccion: "Rasgos de comportamiento",
  seccionCorta: "Comportamiento",
  key: "actividadPersona",
  titulo: "¿Qué nivel de energía buscas en tu perro?",
  desc: "Algunas razas son muy activas y siempre están preparadas para correr, jugar o acompañarte en una nueva aventura. Otras prefieren los paseos tranquilos, los momentos de descanso y disfrutar de tu compañía en casa.",
  hasIcon: false,
  cols: 1,
  opciones: [
    { label: "Tranquilo", sub: "Paseos relajados y vida calmada", value: "bajo", icon: <ActivityIcon level="bajo" /> },
    { label: "Moderado", sub: "Un equilibrio entre actividad y descanso", value: "medio", icon: <ActivityIcon level="medio" /> },
    { label: "Muy activo", sub: "Deporte, excursiones y mucha actividad", value: "alto", icon: <ActivityIcon level="alto" /> },
  ],
},

{
  seccion: "Rasgos de comportamiento",
  seccionCorta: "Comportamiento",
  key: "ladridos",
  titulo: "¿Te molesta que tu perro sea comunicativo?",
  desc: "Algunas razas ladran con frecuencia ante cualquier estímulo, mientras que otras solo lo hacen en momentos concretos. Incluso las razas consideradas poco ladradoras pueden expresarse mediante otros sonidos.",
  hasIcon: false,
  cols: 1,
  opciones: [
    { label: "Muy poquito", sub: "Mejor si se hace notar sin montar un concierto.", value: "bajo" },
    { label: "De vez en cuando", sub: "Algún ladrido está bien.", value: "medio" },
    { label: "Bastante", sub: "No me importa que tenga muchas cosas que contar.", value: "alto" },
    { label: "Mucho", sub: "¡En casa hay sitio para una buena conversación perruna!", value: "alto" },
],
},
];

const SECCIONES = ["Cuéntanos un poco más sobre ti", "Características del perro", "Rasgos de comportamiento"];

const S = {
  wrapper: { width: "100%", minHeight: "100vh", background: C.pageBg, fontFamily: "'Lato', sans-serif", color: C.text, overflowX: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column" },
  page: { maxWidth: 1080, width: "calc(100% - 48px)", margin: "32px auto", borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(13,31,69,0.10)" },
  siteHeader: { background: C.navy, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, borderBottom: `3px solid ${C.gold}`, width: "100%", boxSizing: "border-box" },
  logoArea: { display: "flex", alignItems: "center", gap: 14 },
  logoText: { color: C.white, textAlign: "left" },
  acronym: { fontSize: 15, fontWeight: 700, letterSpacing: "0.18em", color: C.gold, display: "block", lineHeight: 1, textAlign: "left" },
  fullName: { fontSize: 9.5, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", textAlign: "left" },
  headerTag: { fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em" },
  hero: { background: C.white, borderBottom: `1px solid ${C.border}`, padding: "40px 56px 36px", textAlign: "center" },
  heroEyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: C.goldDark, textTransform: "uppercase", marginBottom: 10 },
  heroTitle: { fontFamily: "'Poppins', sans-serif", fontSize: 30, fontWeight: 700, color: C.navyDark, lineHeight: 1.25, marginBottom: 10, margin: "0 0 10px" },
  heroDesc: { fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" },
  heroDisclaimer: { fontSize: 12, color: C.muted, lineHeight: 1.65, maxWidth: 520, margin: "16px auto 0", fontStyle: "italic" },
  progressRail: { background: C.white, borderBottom: `1px solid ${C.border}` },
  sectionTabs: { display: "flex" },
  sectionTab: (active, done) => ({ flex: 1, padding: "14px 0 12px", textAlign: "center", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.04em", borderBottom: `3px solid ${done ? C.gold : active ? C.navy : "transparent"}`, color: done ? C.goldDark : active ? C.navy : C.muted, cursor: "default" }),
  progressDots: { display: "flex", gap: 4, padding: "8px 56px 10px", justifyContent: "center" },
  pdot: (state) => ({ width: 6, height: 6, borderRadius: "50%", background: state === "done" ? C.gold : state === "current" ? C.navy : C.border }),
  qLayout: { display: "flex", minHeight: 380 },
  qLeft: { flex: 1, padding: "40px 56px 36px", background: C.white },
  qAside: { width: 260, background: C.navyDark, padding: "36px 28px", display: "flex", flexDirection: "column", gap: 16 },
  qBadge: { fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: C.gold, textTransform: "uppercase", marginBottom: 6 },
  qTitle: { fontFamily: "'Poppins', sans-serif", fontSize: 20, fontWeight: 700, color: C.navyDark, lineHeight: 1.35, margin: "0 0 10px" },
  qDesc: { fontSize: 13, color: C.muted, lineHeight: 1.65, margin: "0 0 24px" },
  optsGrid: (cols) => ({ display: "grid", gridTemplateColumns: cols === 3 ? "1fr 1fr 1fr" : cols === 2 ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 8 }),
  optBtn: (selected) => ({ background: selected ? C.navyLight : C.white, border: `1.5px solid ${selected ? C.navy : C.border}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 12, outline: "none", boxShadow: selected ? `0 0 0 3px rgba(0,48,135,0.1)` : "none", transition: "border-color 0.15s, background 0.15s" }),
  optIconWrap: { flexShrink: 0, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" },
  optLabel: { fontSize: 13.5, fontWeight: 700, color: C.navyDark, display: "block", marginBottom: 2 },
  optSub: { fontSize: 11.5, color: C.muted, display: "block", lineHeight: 1.4 },
  optRadio: (selected) => ({ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 2, border: `1.5px solid ${selected ? C.navy : C.border}`, background: selected ? C.navy : C.white, display: "flex", alignItems: "center", justifyContent: "center" }),
  qNav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 56px 24px", background: C.white, borderTop: `1px solid ${C.border}` },
  qCounter: { fontSize: 12, color: C.muted },
  btnBack: { fontSize: 13, fontWeight: 600, color: C.navy, background: "none", border: `1.5px solid ${C.border}`, borderRadius: 7, padding: "8px 18px", cursor: "pointer" },
  asideTip: { background: "rgba(201,169,75,0.12)", borderLeft: `3px solid ${C.gold}`, borderRadius: "0 6px 6px 0", padding: "12px 14px" },
  asideTipP: { fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.55, margin: 0 },
  asideStat: { textAlign: "center", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.1)" },
  asideNum: { fontFamily: "'Poppins', sans-serif", fontSize: 28, fontWeight: 700, color: C.gold, display: "block" },
  asideLbl: { fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" },
  resultHero: { background: C.navy, padding: "52px 56px 44px", textAlign: "center" },
  resultEyebrow: { fontSize: 11, letterSpacing: "0.18em", color: C.goldDark, textTransform: "uppercase", marginBottom: 10, fontWeight: 700 },
  resultBreed: { fontFamily: "'Poppins', sans-serif", fontSize: 36, fontWeight: 700, color: C.white, marginBottom: 10, margin: "0 0 10px" },
  compatPill: { display: "inline-flex", alignItems: "center", gap: 10, background: C.gold, color: C.navyDark, fontSize: 15, fontWeight: 700, padding: "9px 26px", borderRadius: 24, marginTop: 10 },
  resultBody: { background: C.white, padding: "36px 56px", textAlign: "center" },
  avatarStrip: { display: "flex", justifyContent: "center", gap: 26, padding: "40px 32px", background: C.surface, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" },
  resultBody2: { background: C.white, padding: "56px 64px 60px", textAlign: "center" },
  resultBreedBig: { fontFamily: "'Poppins', sans-serif", fontSize: 48, fontWeight: 700, color: C.navyDark, margin: "0 0 16px" },
  resultRasgos: { fontSize: 18, color: C.muted, margin: 0 },
  resultLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: 16, display: "block" },
  altRow: { display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 4 },
  altName: { fontSize: 14, fontWeight: 700, color: C.navyDark },
  altPct: { fontSize: 13, color: C.muted },
  pctBar: { height: 4, background: C.navyLight, borderRadius: 2, marginBottom: 10 },
  pctFill: (w) => ({ height: 4, background: C.gold, borderRadius: 2, width: `${w}%` }),
  btnPrimary: { background: C.navy, color: C.white, border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em", marginTop: 24, display: "block", margin: "24px auto 0" },
  peluche: { textAlign: "center", padding: "60px 56px", background: C.white },
  pelucheH2: { fontFamily: "'Poppins', sans-serif", fontSize: 22, color: C.navyDark, margin: "16px 0 10px" },
  pelucheP: { fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 24px" },
  landing: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 40, padding: "40px 24px", background: C.white, maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" },
  landingLeft: { flex: 1, maxWidth: 560, display: "flex",flexDirection: "column", alignItems: "center", textAlign: "center",},
  landingEyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", color: C.goldDark, textTransform: "uppercase", marginBottom: 18 },
  landingTitle: { fontFamily: "'Poppins', sans-serif", fontSize: 60, fontWeight: 700, color: C.navyDark, lineHeight: 1.15, margin: "0 0 22px" },
  landingDesc: { fontSize: 16, color: C.muted, lineHeight: 1.7, margin: "0 0 18px", maxWidth: 460 },
  landingDisclaimer: { fontSize: 12.5, color: C.muted, lineHeight: 1.65, margin: "0 0 32px", maxWidth: 460, fontStyle: "italic" },
  landingSteps: { listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: 18 },
  landingStep: { display: "flex", alignItems: "center", gap: 16, fontSize: 15, color: C.text, fontWeight: 500 },
  landingStepNum: { width: 32, height: 32, borderRadius: "50%", background: C.gold, color: C.navyDark, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  landingBtn: { background: C.navy, color: C.white, border: "none", borderRadius: 8, padding: "16px 42px", fontSize: 15, fontWeight: 700, letterSpacing: "0.03em", cursor: "pointer" },
  landingRight: { flex: 1, height: 560, display: "flex", gap: 10, alignItems: "stretch" },
  filmPanel: {
    flexGrow: 1, flexShrink: 1, flexBasis: 0,
    position: "relative",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    overflow: "hidden",
    cursor: "pointer",
    transition: "flex-grow 0.55s cubic-bezier(.22,.9,.3,1), border-color 0.3s, box-shadow 0.3s",
  },
  filmPanelActive: { flexGrow: 4, border: `2px solid ${C.gold}`, boxShadow: "0 10px 24px rgba(0,48,135,0.10)" },
  detailWrap: { display: "flex", gap: 24, padding: "32px 40px 40px", alignItems: "flex-start", flexWrap: "wrap", background: C.surface },
  detailLeft: { flex: "1 1 420px", minWidth: 320, background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" },
  detailTabs: { display: "flex", borderBottom: `1px solid ${C.border}`, padding: "0 24px" },
  detailTab: (active) => ({ padding: "18px 16px 14px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: active ? C.navy : C.muted, background: "none", border: "none", borderBottom: `3px solid ${active ? C.navy : "transparent"}`, marginBottom: -1, fontFamily: "inherit", whiteSpace: "nowrap" }),
  detailRows: { padding: "8px 24px 20px" },
  detailRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "18px 0", borderBottom: `1px solid ${C.border}` },
  detailRowLabel: { fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" },
  detailRowValue: { fontSize: 13, color: C.muted, margin: 0 },
  detailIcon: (acierto) => ({ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: acierto === null ? C.navyLight : acierto ? C.successLight : C.redLight, color: acierto === null ? C.muted : acierto ? C.success : C.red, marginTop: 2 }),
  detailRight: { border: `1px solid ${C.gold}`, borderRadius: 14, padding: "32px 28px", textAlign: "center", background: C.white },
  detailBadge: { width: 64, height: 64, borderRadius: "50%", border: `1.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" },
  detailTitle: { fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 700, color: C.navyDark, margin: "0 0 14px", lineHeight: 1.35 },
  detailDesc: { fontSize: 13.5, color: C.muted, lineHeight: 1.7, margin: "0 0 22px" },
  btnFCI: { background: C.navy, color: C.white, border: "none", borderRadius: 8, padding: "13px 30px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" },

  specsCard: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" },
  specsTitle: { fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 700, color: C.navyDark, margin: "0 0 8px" },
  specsTitleRule: { width: 36, height: 3, background: C.gold, marginBottom: 24 },
  specsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 28 },
  specsColLabel: { fontSize: 13, fontWeight: 700, color: C.navyDark, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` },
  specsRowLabel: { fontSize: 11.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 },
  specsRowValue: { fontSize: 15, color: C.text, marginBottom: 16 },
  specsStagesGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, borderTop: `1px solid ${C.border}`, paddingTop: 24 },
  specsStageLabel: { fontSize: 11.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 },
  specsStageValue: { fontSize: 14, color: C.text },
  specsNote: { fontSize: 11.5, color: C.muted, fontStyle: "italic", marginTop: 24 },

  fichaWrap: { background: C.white, padding: "44px 56px 56px" },
  fichaBack: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.navy, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 28 },
  fichaHead: { display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 48 },
  fichaHeadLeft: { flex: "1 1 360px", minWidth: 280 },
  fichaTitle: { fontFamily: "'Poppins', sans-serif", fontSize: 44, fontWeight: 700, color: C.red, lineHeight: 1.12, margin: "0 0 18px" },
  fichaShare: { display: "flex", gap: 14, alignItems: "center", marginBottom: 26 },
  fichaShareBtn: { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, cursor: "default" },
  fichaDesc: { fontSize: 14.5, color: C.text, lineHeight: 1.75, maxWidth: 460, margin: 0 },
  fichaHeadRight: { flex: "1 1 360px", minWidth: 260, display: "flex", justifyContent: "center" },
  fichaImgWrap: { width: "100%", maxWidth: 420, aspectRatio: "4/3", borderRadius: 16, overflow: "hidden", background: C.navyLight },
  fichaCols: { display: "flex", gap: 40, flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 36 },
  fichaCol: { flex: "1 1 260px", minWidth: 220 },
  fichaColTitle: { fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 700, color: C.red, margin: "0 0 14px" },
  fichaColP: { fontSize: 13.5, color: C.text, lineHeight: 1.75, margin: "0 0 10px" },
  fichaColLine: { fontSize: 13.5, color: C.text, lineHeight: 1.9, margin: 0 },
};

export default function TestPerroIdeal() {
  const [step, setStep]             = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado]   = useState(null);
  const [hovered, setHovered]       = useState(null);
  const [mostrarInicio, setMostrarInicio] = useState(() => {
    if (typeof window === "undefined") return true;
    return new URLSearchParams(window.location.search).get("start") !== "test";
  });

  const irAlTest = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("start", "test");
    window.open(url.toString(), "_blank");
  };

  const pregunta = !resultado ? PREGUNTAS[step] : null;

  const seccionInfo = () =>
    SECCIONES.map((s) => {
      const qs       = PREGUNTAS.filter((p) => p.seccion === s);
      const total    = qs.length;
      const resp     = qs.filter((p) => respuestas[p.key] !== undefined).length;
      const idxFirst = PREGUNTAS.findIndex((p) => p.seccion === s);
      const done     = step > idxFirst + total - 1;
      const active   = step >= idxFirst && step <= idxFirst + total - 1;
      return { s, total, resp, done, active, idxFirst };
    });

  const seleccionar = (value) => {
    const nueva = { ...respuestas, [pregunta.key]: value };
    setRespuestas(nueva);
    if (step + 1 < PREGUNTAS.length) {
      setStep(step + 1);
    } else {
      setResultado(calcularResultado(nueva));
    }
  };

  const reiniciar = () => { setStep(0); setRespuestas({}); setResultado(null); };

  const ProgressRail = () => (
    <div style={S.progressRail}>
      <div style={S.sectionTabs}>
        {seccionInfo().map(({ s, done, active }) => (
          <div key={s} style={S.sectionTab(active, done)}>
            {done && <span style={{ marginRight: 4 }}>✓</span>}
            {s}
          </div>
        ))}
      </div>
      <div style={S.progressDots}>
        {PREGUNTAS.map((_, i) => (
          <div key={i} style={S.pdot(i < step ? "done" : i === step ? "current" : "idle")} />
        ))}
      </div>
    </div>
  );

  const LANDING_PANELS = [
    { nombre: "Golden Retriever", src: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?fm=jpg" },
    { nombre: "Border Collie",    src: "https://img.magnific.com/premium-photo/vertical-shot-adorable-border-collie-holding-stick-forest-sunlight_181624-42671.jpg" },
    { nombre: "Beagle",           src: "https://st.depositphotos.com/3019365/4430/i/450/depositphotos_44302091-stock-photo-beagle-puppy-close-up-portrait.jpg"},
    { nombre: "Husky Siberiano",  src: "https://img.magnific.com/free-photo/vertical-shallow-focus-side-view-siberian-husky-dog_181624-60703.jpg" },
  ];

  const Landing = () => {
    const [panelActivo, setPanelActivo] = useState(1);

    return (
      <div style={S.landing}>
        <div style={S.landingLeft}>
          <div style={S.landingEyebrow}>RSCE · Test de razas</div>
          <h1 style={S.landingTitle}>Encuentra la<br />raza perfecta</h1>
          <p style={S.landingDesc}>
            Responde a unas sencillas preguntas y descubre qué razas podrían encajar mejor
            contigo. Tendremos en cuenta tus preferencias, tu rutina y lo que esperas de tu
            futuro compañero.
          </p>
          <p style={S.landingDisclaimer}>
            El resultado será una primera orientación. Antes de tomar una decisión, te
            recomendamos conocer personalmente las razas que más te interesen y consultar
            con propietarios y criadores responsables.
          </p>
          <ol style={S.landingSteps}>
            <li style={S.landingStep}><span style={S.landingStepNum}>1</span><span>Responde a preguntas sobre tu estilo de vida</span></li>
            <li style={S.landingStep}><span style={S.landingStepNum}>2</span><span>Descubre la raza más adecuada para ti</span></li>
            <li style={S.landingStep}><span style={S.landingStepNum}>3</span><span>Accede a contenido detallado sobre tu raza favorita</span></li>
          </ol>
          <button style={S.landingBtn} onClick={irAlTest}>Realizar el test</button>
        </div>
        <div style={S.landingRight}>
          {LANDING_PANELS.map((panel, i) => (
            <div
              key={panel.nombre}
              style={{ ...S.filmPanel, ...(i === panelActivo ? S.filmPanelActive : {}) }}
              onMouseEnter={() => setPanelActivo(i)}
              onClick={() => setPanelActivo(i)}
            >
              <img
                src={panel.src}
                alt={panel.nombre}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Hero = () => (
    <div style={S.hero}>
      <div style={S.heroEyebrow}>Test de compatibilidad de razas</div>
      <h1 style={S.heroTitle}>Encuentra la raza de perro<br />más adecuada para ti</h1>
      <p style={S.heroDesc}>
        Responde a unas sencillas preguntas y descubre qué razas podrían encajar mejor
        contigo. Tendremos en cuenta tus preferencias, tu rutina y lo que esperas de tu
        futuro compañero.
      </p>
    </div>
  );

  const Question = () => {
    const tip = ASIDE_TIPS[step % ASIDE_TIPS.length];
    return (
      <>
        <ProgressRail />
        <div style={S.qLayout}>
          <div style={S.qLeft}>
            <div style={S.qBadge}>{pregunta.seccionCorta || pregunta.seccion} · Pregunta {step + 1} de {PREGUNTAS.length}</div>
            <h2 style={S.qTitle}>{pregunta.titulo}</h2>
            <p style={S.qDesc}>{pregunta.desc}</p>
            {pregunta.tipo === "orden" ? (
  <RankingQuestion
    pregunta={pregunta}
    valorInicial={respuestas[pregunta.key]}
    onConfirmar={(orden) => seleccionar(orden)}
  />
) : (
  <div style={S.optsGrid(pregunta.cols)}>
    {pregunta.opciones.map((op, idx) => {
      const sel = respuestas[pregunta.key] === op.value;
      const hov = hovered === `${step}-${idx}`;
      return (
        <button
          key={idx}
          onClick={() => seleccionar(op.value)}
          onMouseEnter={() => setHovered(`${step}-${idx}`)}
          onMouseLeave={() => setHovered(null)}
          style={{ ...S.optBtn(sel), ...(hov && !sel ? { borderColor: C.navy, background: C.navyLight } : {}) }}
        >
          {pregunta.hasIcon && op.icon && <div style={S.optIconWrap}>{op.icon}</div>}
          {!pregunta.hasIcon && (
            <div style={S.optRadio(sel)}>
              {sel && <svg viewBox="0 0 12 12" width="8" height="8"><circle cx="6" cy="6" r="3.5" fill="white" /></svg>}
            </div>
          )}
          <div>
            <span style={S.optLabel}>{op.label}</span>
            {op.sub && <span style={S.optSub}>{op.sub}</span>}
          </div>
        </button>
      );
    })}
  </div>
)}
          </div>
          <div style={S.qAside}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <img
                src="/logo-rsce.png"
                alt="Real Sociedad Canina de España"
                style={{ width: 80, height: 80, objectFit: "contain", display: "inline-block" }}
              />
            </div>
            <div style={S.asideTip}><p style={S.asideTipP}>{tip}</p></div>
            <div style={S.asideStat}>
              <span style={S.asideNum}>{razas.length}</span>
              <span style={S.asideLbl}>Razas analizadas</span>
            </div>
            <div style={S.asideStat}>
              <span style={S.asideNum}>{Math.round((step / PREGUNTAS.length) * 100)}%</span>
              <span style={S.asideLbl}>Completado</span>
            </div>
          </div>
        </div>
        <div style={S.qNav}>
          {step > 0 ? (
            <button style={S.btnBack} onClick={() => setStep(step - 1)}>← Anterior</button>
          ) : <span />}
          <span style={S.qCounter}>Selecciona una opción para continuar</span>
        </div>
      </>
    );
  };

  const Resultado = () => {
    const [seleccionada, setSeleccionada] = useState(0);
    const [tab, setTab] = useState("Cuéntanos_un_poco_más_sobre_ti");

    if (resultado.recomendarPeluche) {
      return (
        <div style={S.peluche}>
          <div style={{ fontSize: 56 }}>🧸</div>
          <h2 style={S.pelucheH2}>Ninguna raza encaja del todo</h2>
          <p style={S.pelucheP}>
            Según tus respuestas, no encontramos una raza con compatibilidad suficiente.
            Quizás un perro de peluche sea la opción más sensata por ahora.
          </p>
          <button style={S.btnPrimary} onClick={reiniciar}>Repetir el test</button>
        </div>
      );
    }

    const { mejor, alternativas } = resultado;
    const todas = [mejor, ...alternativas];
    const actual = todas[seleccionada] || mejor;
    const razaActual = razas.find((r) => r.nombre === actual.nombre);
    const rasgos = razaActual ? rasgosDeRaza(razaActual) : [];
    const nombreFormateado = actual.nombre.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const filas = razaActual ? construirFilasResultado(razaActual, respuestas) : null;
    const descripcion = razaActual ? descripcionGenerada(razaActual, nombreFormateado) : "";

  const TABS = [
  { key: "Cuéntanos_un_poco_más_sobre_ti", label: "Cuéntanos un poco más sobre ti"},
  { key: "cuidados", label: "Características del perro" },
  ];

    const IconoAcierto = ({ acierto }) => (
      <div style={S.detailIcon(acierto)}>
        {acierto === null ? (
          <svg viewBox="0 0 20 20" width="13" height="13"><circle cx="10" cy="10" r="2" fill="currentColor" /></svg>
        ) : acierto ? (
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="9" /><path d="M6 10.5l2.6 2.6L14 7.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="9" /><path d="M7 7l6 6M13 7l-6 6" />
          </svg>
        )}
      </div>
    );

    const specs = razaActual
      ? (ESPECIFICACIONES_TAMANO[razaActual.tamano] || ESPECIFICACIONES_TAMANO.mediano)
      : null;

    return (
      <>
        <div style={S.avatarStrip}>
          {todas.map((p, i) => (
            <BreedAvatar
              key={i} nombre={p.nombre} pct={p.pct} size={84}
              activo={i === seleccionada}
              onClick={() => { setSeleccionada(i); setTab("Cuéntanos_un_poco_más_sobre_ti"); }}
            />
          ))}
        </div>

        <div style={S.resultBody2}>
          <div style={S.resultEyebrow}>{seleccionada === 0 ? "Tu mejor opción" : "Otra buena opción"}</div>
          <h2 style={S.resultBreedBig}>{nombreFormateado}</h2>
          {rasgos.length > 0 && <p style={S.resultRasgos}>{rasgos.join(", ")}</p>}
          <div style={{ display: "flex", justifyContent: "center", margin: "28px 0" }}>
            <BreedGallery nombre={actual.nombre} width={460} height={350} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={S.compatPill}>
              <svg viewBox="0 0 20 20" width="14" height="14" fill={C.navyDark} xmlns="http://www.w3.org/2000/svg">
                <circle cx="5" cy="5" r="2.5" /><circle cx="15" cy="5" r="2.5" />
                <circle cx="2.5" cy="10" r="2" /><circle cx="17.5" cy="10" r="2" />
                <ellipse cx="10" cy="14" rx="5" ry="4.5" />
              </svg>
              {actual.pct >= 80 ? "Excelente compatibilidad" : "Buena compatibilidad"} · {Math.round(actual.pct)}%
            </div>
          </div>
        </div>

        {filas && (
  <div style={S.detailWrap}>
    <div style={S.detailLeft}>
      <div style={{ ...S.detailTabs, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <button key={t.key} style={{ ...S.detailTab(tab === t.key), whiteSpace: "nowrap", fontSize: 13, padding: "18px 12px 14px" }} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

              <div style={S.detailRows}>
  {tab === "especificaciones" && specs ? (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, padding: "16px 0 24px" }}>
        <div>
          <div style={S.specsColLabel}>Macho</div>
          <div style={S.specsRowLabel}>Altura</div>
          <div style={S.specsRowValue}>{specs.alturaMacho}</div>
          <div style={S.specsRowLabel}>Peso</div>
          <div style={S.specsRowValue}>{specs.pesoMacho}</div>
        </div>
        <div>
          <div style={S.specsColLabel}>Hembra</div>
          <div style={S.specsRowLabel}>Altura</div>
          <div style={S.specsRowValue}>{specs.alturaHembra}</div>
          <div style={S.specsRowLabel}>Peso</div>
          <div style={S.specsRowValue}>{specs.pesoHembra}</div>
        </div>
      </div>
      <div style={{ ...S.specsColLabel, marginBottom: 12 }}>Etapas de vida</div>
      <div style={S.specsStagesGrid}>
        <div>
          <div style={S.specsStageLabel}>Cachorro</div>
          <div style={S.specsStageValue}>{specs.cachorro}</div>
        </div>
        <div>
          <div style={S.specsStageLabel}>Adulto</div>
          <div style={S.specsStageValue}>{specs.adulto}</div>
        </div>
        <div>
          <div style={S.specsStageLabel}>Maduro</div>
          <div style={S.specsStageValue}>{specs.maduro}</div>
        </div>
        <div>
          <div style={S.specsStageLabel}>Senior</div>
          <div style={S.specsStageValue}>{specs.senior}</div>
        </div>
      </div>
      <p style={S.specsNote}>Valores aproximados según el tamaño de la raza.</p>
    </>
  ) : (
    filas[tab]?.map((f, i) => (
      <div key={i} style={{ ...S.detailRow, borderBottom: i === filas[tab].length - 1 ? "none" : S.detailRow.borderBottom }}>
        <div>
          <p style={S.detailRowLabel}>{f.label}</p>
          <p style={S.detailRowValue}>{f.valor}</p>
        </div>
        <IconoAcierto acierto={f.acierto} />
      </div>
    ))
  )}
</div>
            </div>

            {/* ── Columna derecha: card de raza + especificaciones ── */}
            <div style={{ flex: "1 1 340px", minWidth: 300, maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Card "Acerca de" */}
              <div style={S.detailRight}>
                <div style={S.detailBadge}>
                  <svg viewBox="0 0 40 40" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="13" r="6" fill={C.gold} />
                    <ellipse cx="20" cy="28" rx="11" ry="9" fill={C.gold} />
                    <ellipse cx="9" cy="11" rx="4" ry="6" fill={C.gold} transform="rotate(-20 9 11)" />
                    <ellipse cx="31" cy="11" rx="4" ry="6" fill={C.gold} transform="rotate(20 31 11)" />
                  </svg>
                </div>
                <h3 style={S.detailTitle}>Acerca de {nombreFormateado}</h3>
                <p style={S.detailDesc}>{descripcion}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: "0 0 22px", fontStyle: "italic" }}>
                  En la página de RSCE, selecciona "{nombreFormateado}" en el filtro de razas para ver los criadores disponibles.
                </p>
                <a
                  href="https://www.rsce.es/criadores/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={S.btnFCI}
                >
                  Buscar criadores de {nombreFormateado}
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4l6 6-6 6" />
                  </svg>
                </a>
              </div>

              
            </div>
          </div>
        )}

        <div style={{ background: C.white, padding: "0 0 40px", display: "flex", justifyContent: "center" }}>
          <button style={S.btnPrimary} onClick={reiniciar}>Repetir el test</button>
        </div>
      </>
    );
  };

  return (
    <div style={{ ...S.wrapper, justifyContent: mostrarInicio ? "center" : "flex-start", alignItems: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Poppins:wght@500;600;700&display=swap');`}</style>
      {mostrarInicio && (
        <header style={S.siteHeader}>
          <div style={S.logoArea}>
            <img
              src="/logo-rsce.png"
              alt="Real Sociedad Canina de España"
              style={{ width: 42, height: 42, objectFit: "contain", display: "block" }}
            />
            <div style={S.logoText}>
              <span style={S.acronym}>RSCE</span>
              <span style={S.fullName}>Real Sociedad Canina de España</span>
            </div>
          </div>
          <span style={S.headerTag}>Test de razas · Edición 2026</span>
        </header>
      )}

      {mostrarInicio ? (
        <Landing />
      ) : (
        <div style={{ ...S.page, margin: "40px auto" }}>
          {resultado ? (
            <>
              <Hero />
              <Resultado />
            </>
          ) : (
            <Question />
          )}
        </div>
      )}
    </div>
  );
}