import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Feather, UserRound, MapPin, Sparkles, Languages, Package, Clock, Network, BookOpen,
  Plus, Trash2, X, Save, Search, ChevronRight, ChevronDown, Pencil,
} from "lucide-react";
import { API_URL, withAuth } from "../config";

/* ===========================================================================
   Taller de Novela — módulo Lumbres
   Persistencia: GET/PUT /api/taller (un JSON por usuario)
=========================================================================== */

const C = {
  bg: "#100f0c",
  panel: "#161410",
  panel2: "#1c1a15",
  card: "#1f1c16",
  border: "#2c2820",
  borderSoft: "#241f18",
  text: "#e9e4d8",
  textMuted: "#a39b89",
  textDim: "#6f685a",
  amber: "#e0a93b",
  amberSoft: "#3a2e12",
  amberPill: "#2a2110",
};

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

const uid = () => Math.random().toString(36).slice(2, 10);

const EMPTY = {
  meta: { title: "Mi novela", genre: "", synopsis: "", target: 50000 },
  characters: [],
  locations: [],
  species: [],
  languages: [],
  items: [],
  chapters: [],
  relationships: [],
};

const newCharacter = () => ({
  id: uid(),
  name: "Personaje sin nombre",
  role: "secondary",
  appearance: { age: "", height: "", eyeColor: "", hairColor: "", marks: "", attire: "" },
  personality: { traits: "", strengths: "", weaknesses: "", fears: "", desires: "", motivations: "" },
  background: { birthplace: "", family: "", occupation: "", status: "", events: "" },
  arc: { initial: "", transformation: "", final: "" },
  notes: "",
});

const newLocation = (parentId = null) => ({
  id: uid(), parentId, name: "Nueva ubicación", type: "city",
  description: "", ambiance: "", climate: "", inhabitants: "",
});

const newSpecies = () => ({ id: uid(), name: "Nueva especie", description: "", traits: "", abilities: "" });
const newLanguage = () => ({ id: uid(), name: "Nuevo idioma", speakers: "", sample: "", notes: "" });
const newItem = () => ({ id: uid(), name: "Nuevo objeto", type: "artifact", description: "", powers: "" });
const newChapter = (n) => ({ id: uid(), number: n, title: `Capítulo ${n}`, status: "idea", content: "", summary: "" });

const wordCount = (txt) => (txt || "").trim().split(/\s+/).filter(Boolean).length;

const ROLE_LABELS = {
  protagonist: "Protagonista", antagonist: "Antagonista",
  secondary: "Secundario", extra: "Extra",
};
const STATUS_LABELS = {
  idea: "Idea", outline: "Esquema", draft: "Borrador",
  revision: "Revisión", final: "Final",
};

export default function TallerNovela() {
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [section, setSection] = useState("dashboard");
  const saveTimer = useRef(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved

  // Cargar el documento del usuario al montar
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/taller`, withAuth());
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) setData({ ...EMPTY, ...json.data });
        }
      } catch { /* primera vez, usamos EMPTY */ }
      finally { setLoaded(true); }
    })();
  }, []);

  // Guardado con debounce
  const persist = useCallback((next) => {
    setData(next);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/taller`, withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: next }),
        }));
        if (res.ok) {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        } else {
          setSaveState("idle");
        }
      } catch { setSaveState("idle"); }
    }, 700);
  }, []);

  const addTo = (key, item) => persist({ ...data, [key]: [...data[key], item] });
  const updateIn = (key, id, patch) =>
    persist({ ...data, [key]: data[key].map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const removeFrom = (key, id) =>
    persist({ ...data, [key]: data[key].filter((x) => x.id !== id) });

  const moduleNav = [
    { id: "dashboard", label: "Resumen", icon: BookOpen },
    { id: "characters", label: "Personajes", icon: UserRound, count: data.characters.length },
    { id: "locations", label: "Ubicaciones", icon: MapPin, count: data.locations.length },
    { id: "species", label: "Especies", icon: Sparkles, count: data.species.length },
    { id: "languages", label: "Idiomas", icon: Languages, count: data.languages.length },
    { id: "items", label: "Objetos", icon: Package, count: data.items.length },
    { id: "chapters", label: "Capítulos", icon: Feather, count: data.chapters.length },
    { id: "board", label: "Relaciones", icon: Network },
  ];

  if (!loaded) {
    return (
      <div style={{ background: C.bg, color: C.textMuted, fontFamily: FONT,
        height: "calc(100vh - 80px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Cargando taller…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", background: C.bg,
      fontFamily: FONT, color: C.text, borderRadius: 14, overflow: "hidden",
      border: `1px solid ${C.border}` }}>
      <FontInjector />

      {/* Navegación interna del módulo */}
      <nav style={{ width: 196, background: C.panel, borderRight: `1px solid ${C.borderSoft}`,
        padding: "18px 10px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ padding: "2px 10px 14px", fontSize: 11, fontWeight: 700,
          letterSpacing: 1.2, textTransform: "uppercase", color: C.textDim }}>
          Taller de novela
        </div>
        {moduleNav.map((m) => (
          <button key={m.id} onClick={() => setSection(m.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 11px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: FONT, fontSize: 13.5, fontWeight: section === m.id ? 700 : 500,
              background: section === m.id ? C.amberPill : "transparent",
              color: section === m.id ? C.amber : C.textMuted,
              transition: "background .15s",
            }}>
            <m.icon size={17} strokeWidth={section === m.id ? 2.4 : 2} />
            <span style={{ flex: 1, textAlign: "left" }}>{m.label}</span>
            {typeof m.count === "number" && m.count > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700,
                color: section === m.id ? C.amber : C.textDim }}>{m.count}</span>
            )}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <SaveBadge state={saveState} />
      </nav>

      {/* Panel principal */}
      <main style={{ flex: 1, overflow: "auto", background: C.bg }}>
        {section === "dashboard" && <Dashboard data={data} persist={persist} go={setSection} />}
        {section === "characters" && (
          <Characters data={data} addTo={addTo} updateIn={updateIn} removeFrom={removeFrom} />
        )}
        {section === "locations" && (
          <Locations data={data} addTo={addTo} updateIn={updateIn} removeFrom={removeFrom} />
        )}
        {section === "species" && (
          <SimpleCollection title="Especies" emptyHint="Razas, criaturas y especies de tu mundo."
            items={data.species} factory={newSpecies}
            fields={[
              { k: "name", label: "Nombre", type: "input" },
              { k: "description", label: "Descripción", type: "area" },
              { k: "traits", label: "Rasgos físicos", type: "area" },
              { k: "abilities", label: "Habilidades", type: "area" },
            ]}
            add={(i) => addTo("species", i)} update={(id, p) => updateIn("species", id, p)}
            remove={(id) => removeFrom("species", id)} icon={Sparkles} />
        )}
        {section === "languages" && (
          <SimpleCollection title="Idiomas" emptyHint="Lenguas inventadas de tu universo."
            items={data.languages} factory={newLanguage}
            fields={[
              { k: "name", label: "Nombre", type: "input" },
              { k: "speakers", label: "Hablantes", type: "input" },
              { k: "sample", label: "Texto de muestra", type: "area" },
              { k: "notes", label: "Notas gramaticales", type: "area" },
            ]}
            add={(i) => addTo("languages", i)} update={(id, p) => updateIn("languages", id, p)}
            remove={(id) => removeFrom("languages", id)} icon={Languages} />
        )}
        {section === "items" && (
          <SimpleCollection title="Objetos" emptyHint="Armas, artefactos y reliquias."
            items={data.items} factory={newItem}
            fields={[
              { k: "name", label: "Nombre", type: "input" },
              { k: "type", label: "Tipo", type: "select",
                options: [["weapon","Arma"],["artifact","Artefacto"],["document","Documento"],["magical","Mágico"],["common","Común"]] },
              { k: "description", label: "Descripción", type: "area" },
              { k: "powers", label: "Poderes / propiedades", type: "area" },
            ]}
            add={(i) => addTo("items", i)} update={(id, p) => updateIn("items", id, p)}
            remove={(id) => removeFrom("items", id)} icon={Package} />
        )}
        {section === "chapters" && (
          <Chapters data={data} addTo={addTo} updateIn={updateIn} removeFrom={removeFrom} />
        )}
        {section === "board" && <Board data={data} addTo={addTo} removeFrom={removeFrom} />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function SaveBadge({ state }) {
  const map = {
    idle: { t: "Guardado automático", c: C.textDim },
    saving: { t: "Guardando…", c: C.amber },
    saved: { t: "Guardado ✓", c: "#7bbf7b" },
  };
  const s = map[state] || map.idle;
  return (
    <div style={{ padding: "8px 11px", fontSize: 11, color: s.c, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 6 }}>
      <Save size={13} /> {s.t}
    </div>
  );
}

function Header({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      padding: "28px 34px 18px", borderBottom: `1px solid ${C.borderSoft}` }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: C.text }}>{title}</h1>
        {subtitle && <p style={{ margin: "6px 0 0", fontSize: 13.5, color: C.textDim }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function AddButton({ onClick, label }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
        borderRadius: 10, border: `1px solid ${C.amber}55`, background: C.amberPill,
        color: C.amber, fontFamily: FONT, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
      <Plus size={16} strokeWidth={2.6} /> {label}
    </button>
  );
}

// eslint-disable-next-line no-unused-vars -- `Icon` se usa como componente en JSX (patrón icono-por-prop)
function EmptyState({ icon: Icon, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "70px 20px", color: C.textDim, gap: 14 }}>
      <Icon size={44} strokeWidth={1.4} style={{ opacity: 0.5 }} />
      <p style={{ margin: 0, fontSize: 14 }}>{hint}</p>
    </div>
  );
}

const inputStyle = {
  width: "100%", background: C.panel2, border: `1px solid ${C.border}`,
  borderRadius: 9, padding: "10px 12px", color: C.text, fontFamily: FONT,
  fontSize: 13.5, outline: "none", boxSizing: "border-box",
};
function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3,
        textTransform: "uppercase", color: C.textDim, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
function TextInput(props) { return <input {...props} style={inputStyle} />; }
function TextArea(props) { return <textarea {...props} rows={props.rows || 3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />; }
function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{ ...inputStyle, cursor: "pointer" }}>
      {options.map(([v, l]) => <option key={v} value={v} style={{ background: C.panel }}>{l}</option>)}
    </select>
  );
}

function Dashboard({ data, persist, go }) {
  const totalWords = data.chapters.reduce((a, c) => a + wordCount(c.content), 0);
  const pct = data.meta.target ? Math.min(100, Math.round((totalWords / data.meta.target) * 100)) : 0;
  const setMeta = (patch) => persist({ ...data, meta: { ...data.meta, ...patch } });

  const stats = [
    { label: "Personajes", value: data.characters.length, sec: "characters", icon: UserRound },
    { label: "Ubicaciones", value: data.locations.length, sec: "locations", icon: MapPin },
    { label: "Capítulos", value: data.chapters.length, sec: "chapters", icon: Feather },
    { label: "Relaciones", value: data.relationships.length, sec: "board", icon: Network },
  ];

  return (
    <div>
      <Header title="Resumen de la novela" subtitle="Vista general de tu proyecto y progreso de escritura." />
      <div style={{ padding: "26px 34px" }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <Field label="Título de la obra">
            <TextInput value={data.meta.title} onChange={(e) => setMeta({ title: e.target.value })} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Género">
              <TextInput value={data.meta.genre} placeholder="Fantasía, romance…"
                onChange={(e) => setMeta({ genre: e.target.value })} />
            </Field>
            <Field label="Objetivo de palabras">
              <TextInput type="number" value={data.meta.target}
                onChange={(e) => setMeta({ target: Number(e.target.value) || 0 })} />
            </Field>
          </div>
          <Field label="Sinopsis">
            <TextArea value={data.meta.synopsis} rows={3}
              onChange={(e) => setMeta({ synopsis: e.target.value })} />
          </Field>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.textMuted, marginBottom: 7 }}>
              <span>{totalWords.toLocaleString("es")} palabras</span>
              <span>{pct}% de {Number(data.meta.target).toLocaleString("es")}</span>
            </div>
            <div style={{ height: 9, background: C.panel2, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: C.amber, borderRadius: 6, transition: "width .4s" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {stats.map((s) => (
            <button key={s.label} onClick={() => go(s.sec)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: "20px 18px", cursor: "pointer", textAlign: "left", fontFamily: FONT,
                display: "flex", flexDirection: "column", gap: 12 }}>
              <s.icon size={22} color={C.amber} strokeWidth={2} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12.5, color: C.textDim, marginTop: 5 }}>{s.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Characters({ data, addTo, updateIn, removeFrom }) {
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("appearance");
  const [q, setQ] = useState("");

  const list = data.characters.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const sel = data.characters.find((c) => c.id === selectedId);

  const add = () => {
    const c = newCharacter();
    addTo("characters", c);
    setSelectedId(c.id);
    setTab("appearance");
  };

  const tabs = [
    { id: "appearance", label: "Apariencia" },
    { id: "personality", label: "Personalidad" },
    { id: "background", label: "Trasfondo" },
    { id: "arc", label: "Arco" },
    { id: "notes", label: "Notas" },
  ];

  return (
    <div>
      <Header title="Personajes" subtitle="Fichas detalladas de cada personaje de tu novela."
        action={<AddButton onClick={add} label="Nuevo personaje" />} />

      <div style={{ display: "flex", height: "calc(100% - 95px)" }}>
        <div style={{ width: 280, borderRight: `1px solid ${C.borderSoft}`, padding: 16, overflow: "auto" }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={15} color={C.textDim} style={{ position: "absolute", left: 11, top: 11 }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
              style={{ ...inputStyle, paddingLeft: 34 }} />
          </div>
          {list.length === 0 && <p style={{ color: C.textDim, fontSize: 13, textAlign: "center", marginTop: 30 }}>Sin personajes aún.</p>}
          {list.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 12px",
                borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 5, fontFamily: FONT,
                background: selectedId === c.id ? C.amberPill : "transparent", textAlign: "left" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: C.panel2, border: `1px solid ${C.border}`, display: "flex",
                alignItems: "center", justifyContent: "center", color: C.amber, fontWeight: 800, fontSize: 14 }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: selectedId === c.id ? C.amber : C.text,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: C.textDim }}>{ROLE_LABELS[c.role]}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: sel ? "22px 30px" : 0 }}>
          {!sel ? (
            <EmptyState icon={UserRound} hint="Selecciona o crea un personaje para editar su ficha." />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ flex: 1, marginRight: 14 }}>
                  <input value={sel.name} onChange={(e) => updateIn("characters", sel.id, { name: e.target.value })}
                    style={{ ...inputStyle, fontSize: 20, fontWeight: 800, background: "transparent", border: "none", padding: 0 }} />
                </div>
                <select value={sel.role} onChange={(e) => updateIn("characters", sel.id, { role: e.target.value })}
                  style={{ ...inputStyle, width: "auto", cursor: "pointer", marginRight: 10 }}>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: C.panel }}>{l}</option>)}
                </select>
                <button onClick={() => { removeFrom("characters", sel.id); setSelectedId(null); }}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9,
                    padding: 9, cursor: "pointer", color: "#c47", display: "flex" }}>
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.borderSoft}`, marginBottom: 20 }}>
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer",
                      fontFamily: FONT, fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                      color: tab === t.id ? C.amber : C.textMuted,
                      borderBottom: tab === t.id ? `2px solid ${C.amber}` : "2px solid transparent", marginBottom: -1 }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "appearance" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
                  <FieldFor obj={sel} k="appearance" sub="age" label="Edad" upd={updateIn} />
                  <FieldFor obj={sel} k="appearance" sub="height" label="Estatura" upd={updateIn} />
                  <FieldFor obj={sel} k="appearance" sub="eyeColor" label="Color de ojos" upd={updateIn} />
                  <FieldFor obj={sel} k="appearance" sub="hairColor" label="Color de cabello" upd={updateIn} />
                  <FieldFor obj={sel} k="appearance" sub="marks" label="Marcas distintivas" upd={updateIn} area span />
                  <FieldFor obj={sel} k="appearance" sub="attire" label="Vestimenta habitual" upd={updateIn} area span />
                </div>
              )}
              {tab === "personality" && (
                <div>
                  <FieldFor obj={sel} k="personality" sub="traits" label="Rasgos" upd={updateIn} area />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
                    <FieldFor obj={sel} k="personality" sub="strengths" label="Fortalezas" upd={updateIn} area />
                    <FieldFor obj={sel} k="personality" sub="weaknesses" label="Debilidades" upd={updateIn} area />
                    <FieldFor obj={sel} k="personality" sub="fears" label="Miedos" upd={updateIn} area />
                    <FieldFor obj={sel} k="personality" sub="desires" label="Deseos" upd={updateIn} area />
                  </div>
                  <FieldFor obj={sel} k="personality" sub="motivations" label="Motivaciones" upd={updateIn} area />
                </div>
              )}
              {tab === "background" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
                  <FieldFor obj={sel} k="background" sub="birthplace" label="Lugar de origen" upd={updateIn} />
                  <FieldFor obj={sel} k="background" sub="occupation" label="Ocupación" upd={updateIn} />
                  <FieldFor obj={sel} k="background" sub="family" label="Familia" upd={updateIn} area span />
                  <FieldFor obj={sel} k="background" sub="status" label="Estatus social" upd={updateIn} />
                  <FieldFor obj={sel} k="background" sub="events" label="Eventos significativos" upd={updateIn} area span />
                </div>
              )}
              {tab === "arc" && (
                <div>
                  <FieldFor obj={sel} k="arc" sub="initial" label="Estado inicial — cómo empieza" upd={updateIn} area />
                  <FieldFor obj={sel} k="arc" sub="transformation" label="Transformación — qué le cambia" upd={updateIn} area />
                  <FieldFor obj={sel} k="arc" sub="final" label="Estado final — cómo termina" upd={updateIn} area />
                </div>
              )}
              {tab === "notes" && (
                <Field label="Notas libres">
                  <TextArea value={sel.notes} rows={10}
                    onChange={(e) => updateIn("characters", sel.id, { notes: e.target.value })} />
                </Field>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldFor({ obj, k, sub, label, upd, area, span }) {
  const val = obj[k]?.[sub] ?? "";
  const onChange = (e) =>
    upd("characters", obj.id, { [k]: { ...obj[k], [sub]: e.target.value } });
  return (
    <div style={{ gridColumn: span ? "1 / -1" : "auto" }}>
      <Field label={label}>
        {area ? <TextArea value={val} onChange={onChange} /> : <TextInput value={val} onChange={onChange} />}
      </Field>
    </div>
  );
}

function Locations({ data, addTo, updateIn, removeFrom }) {
  const [selId, setSelId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const sel = data.locations.find((l) => l.id === selId);

  const roots = data.locations.filter((l) => !l.parentId);
  const childrenOf = (id) => data.locations.filter((l) => l.parentId === id);

  const addRoot = () => { const l = newLocation(null); addTo("locations", l); setSelId(l.id); };
  const addChild = (pid) => { const l = newLocation(pid); addTo("locations", l); setExpanded({ ...expanded, [pid]: true }); setSelId(l.id); };

  const TreeNode = ({ loc, depth }) => {
    const kids = childrenOf(loc.id);
    const open = expanded[loc.id];
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: depth * 14 }}>
          <button onClick={() => setExpanded({ ...expanded, [loc.id]: !open })}
            style={{ background: "none", border: "none", cursor: kids.length ? "pointer" : "default",
              color: C.textDim, display: "flex", padding: 3, opacity: kids.length ? 1 : 0 }}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <button onClick={() => setSelId(loc.id)}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              borderRadius: 8, border: "none", cursor: "pointer", fontFamily: FONT, textAlign: "left",
              background: selId === loc.id ? C.amberPill : "transparent",
              color: selId === loc.id ? C.amber : C.text, fontSize: 13.5, fontWeight: selId === loc.id ? 700 : 500 }}>
            <MapPin size={14} /> <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{loc.name}</span>
          </button>
          <button onClick={() => addChild(loc.id)} title="Añadir sububicación"
            style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", padding: 5, display: "flex" }}>
            <Plus size={14} />
          </button>
        </div>
        {open && kids.map((k) => <TreeNode key={k.id} loc={k} depth={depth + 1} />)}
      </div>
    );
  };

  return (
    <div>
      <Header title="Ubicaciones" subtitle="Lugares de tu mundo con sububicaciones anidadas."
        action={<AddButton onClick={addRoot} label="Nueva ubicación" />} />
      <div style={{ display: "flex", height: "calc(100% - 95px)" }}>
        <div style={{ width: 300, borderRight: `1px solid ${C.borderSoft}`, padding: 14, overflow: "auto" }}>
          {roots.length === 0 && <p style={{ color: C.textDim, fontSize: 13, textAlign: "center", marginTop: 30 }}>Sin ubicaciones aún.</p>}
          {roots.map((l) => <TreeNode key={l.id} loc={l} depth={0} />)}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: sel ? "24px 30px" : 0 }}>
          {!sel ? <EmptyState icon={MapPin} hint="Selecciona o crea una ubicación." /> : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <input value={sel.name} onChange={(e) => updateIn("locations", sel.id, { name: e.target.value })}
                  style={{ ...inputStyle, fontSize: 20, fontWeight: 800, background: "transparent", border: "none", padding: 0 }} />
                <button onClick={() => { removeFrom("locations", sel.id); setSelId(null); }}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, padding: 9, cursor: "pointer", color: "#c47", display: "flex" }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
                <Field label="Tipo">
                  <Select value={sel.type} onChange={(e) => updateIn("locations", sel.id, { type: e.target.value })}
                    options={[["continent","Continente"],["country","País"],["city","Ciudad"],["building","Edificio"],["room","Estancia"],["natural","Natural"],["other","Otro"]]} />
                </Field>
                <Field label="Clima"><TextInput value={sel.climate} onChange={(e) => updateIn("locations", sel.id, { climate: e.target.value })} /></Field>
              </div>
              <Field label="Descripción"><TextArea value={sel.description} rows={4} onChange={(e) => updateIn("locations", sel.id, { description: e.target.value })} /></Field>
              <Field label="Ambiente"><TextArea value={sel.ambiance} onChange={(e) => updateIn("locations", sel.id, { ambiance: e.target.value })} /></Field>
              <Field label="Habitantes"><TextArea value={sel.inhabitants} onChange={(e) => updateIn("locations", sel.id, { inhabitants: e.target.value })} /></Field>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleCollection({ title, emptyHint, items, factory, fields, add, update, remove, icon }) {
  const [selId, setSelId] = useState(null);
  const sel = items.find((i) => i.id === selId);
  const create = () => { const it = factory(); add(it); setSelId(it.id); };
  return (
    <div>
      <Header title={title} subtitle={emptyHint} action={<AddButton onClick={create} label="Nuevo" />} />
      <div style={{ display: "flex", height: "calc(100% - 95px)" }}>
        <div style={{ width: 260, borderRight: `1px solid ${C.borderSoft}`, padding: 14, overflow: "auto" }}>
          {items.length === 0 && <p style={{ color: C.textDim, fontSize: 13, textAlign: "center", marginTop: 30 }}>Vacío.</p>}
          {items.map((it) => (
            <button key={it.id} onClick={() => setSelId(it.id)}
              style={{ display: "block", width: "100%", padding: "11px 12px", borderRadius: 9, border: "none",
                cursor: "pointer", marginBottom: 4, fontFamily: FONT, textAlign: "left", fontSize: 13.5,
                background: selId === it.id ? C.amberPill : "transparent",
                color: selId === it.id ? C.amber : C.text, fontWeight: selId === it.id ? 700 : 500 }}>
              {it.name}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: sel ? "24px 30px" : 0 }}>
          {!sel ? <EmptyState icon={icon} hint={emptyHint} /> : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button onClick={() => { remove(sel.id); setSelId(null); }}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, padding: 9, cursor: "pointer", color: "#c47", display: "flex" }}>
                  <Trash2 size={16} />
                </button>
              </div>
              {fields.map((f) => (
                <Field key={f.k} label={f.label}>
                  {f.type === "area" ? (
                    <TextArea value={sel[f.k]} onChange={(e) => update(sel.id, { [f.k]: e.target.value })} />
                  ) : f.type === "select" ? (
                    <Select value={sel[f.k]} onChange={(e) => update(sel.id, { [f.k]: e.target.value })} options={f.options} />
                  ) : (
                    <TextInput value={sel[f.k]} onChange={(e) => update(sel.id, { [f.k]: e.target.value })} />
                  )}
                </Field>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Chapters({ data, addTo, updateIn, removeFrom }) {
  const [selId, setSelId] = useState(null);
  const titleRef = useRef(null);
  const sel = data.chapters.find((c) => c.id === selId);
  const add = () => {
    const c = newChapter(data.chapters.length + 1);
    addTo("chapters", c); setSelId(c.id);
  };
  return (
    <div>
      <Header title="Capítulos" subtitle="Escribe tu novela. El contenido se guarda solo."
        action={<AddButton onClick={add} label="Nuevo capítulo" />} />
      <div style={{ display: "flex", height: "calc(100% - 95px)" }}>
        <div style={{ width: 260, borderRight: `1px solid ${C.borderSoft}`, padding: 14, overflow: "auto" }}>
          {data.chapters.length === 0 && <p style={{ color: C.textDim, fontSize: 13, textAlign: "center", marginTop: 30 }}>Sin capítulos aún.</p>}
          {data.chapters.map((c) => (
            <button key={c.id} onClick={() => setSelId(c.id)}
              style={{ display: "block", width: "100%", padding: "11px 12px", borderRadius: 9, border: "none",
                cursor: "pointer", marginBottom: 4, fontFamily: FONT, textAlign: "left",
                background: selId === c.id ? C.amberPill : "transparent" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: selId === c.id ? C.amber : C.text }}>{c.title}</div>
              <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 3, display: "flex", gap: 8 }}>
                <span>{STATUS_LABELS[c.status]}</span><span>·</span><span>{wordCount(c.content)} pal.</span>
              </div>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: sel ? "22px 38px" : 0 }}>
          {!sel ? <EmptyState icon={Feather} hint="Selecciona o crea un capítulo para escribir." /> : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <input ref={titleRef} value={sel.title} onChange={(e) => updateIn("chapters", sel.id, { title: e.target.value })}
                  title="Haz clic para renombrar el capítulo"
                  onFocus={(e) => { e.target.style.borderBottom = `1px dashed ${C.amber}`; }}
                  onBlur={(e) => { e.target.style.borderBottom = "1px dashed transparent"; }}
                  style={{ ...inputStyle, fontSize: 19, fontWeight: 800, background: "transparent", border: "none",
                    borderBottom: "1px dashed transparent", borderRadius: 0, padding: 0, flex: 1 }} />
                <button onClick={() => { titleRef.current?.focus(); titleRef.current?.select(); }}
                  title="Renombrar capítulo"
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, padding: 9, cursor: "pointer", color: C.textDim, display: "flex" }}>
                  <Pencil size={16} />
                </button>
                <select value={sel.status} onChange={(e) => updateIn("chapters", sel.id, { status: e.target.value })}
                  style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: C.panel }}>{l}</option>)}
                </select>
                <button onClick={() => { removeFrom("chapters", sel.id); setSelId(null); }}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, padding: 9, cursor: "pointer", color: "#c47", display: "flex" }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <input value={sel.summary} placeholder="Resumen breve del capítulo…"
                onChange={(e) => updateIn("chapters", sel.id, { summary: e.target.value })}
                style={{ ...inputStyle, marginBottom: 14, fontStyle: "italic", color: C.textMuted }} />
              <textarea value={sel.content} placeholder="Empieza a escribir…"
                onChange={(e) => updateIn("chapters", sel.id, { content: e.target.value })}
                style={{ width: "100%", minHeight: 360, background: C.panel, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: "22px 26px", color: C.text, fontFamily: "'Spectral', Georgia, serif",
                  fontSize: 16.5, lineHeight: 1.75, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              <div style={{ marginTop: 10, fontSize: 12.5, color: C.textDim, textAlign: "right" }}>
                {wordCount(sel.content)} palabras · {sel.content.length} caracteres
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Board({ data, addTo, removeFrom }) {
  const entities = [
    ...data.characters.map((c) => ({ id: c.id, name: c.name, type: "character", label: "Personaje" })),
    ...data.locations.map((l) => ({ id: l.id, name: l.name, type: "location", label: "Ubicación" })),
    ...data.items.map((i) => ({ id: i.id, name: i.name, type: "item", label: "Objeto" })),
    ...data.species.map((s) => ({ id: s.id, name: s.name, type: "species", label: "Especie" })),
  ];
  const nameOf = (id) => entities.find((e) => e.id === id)?.name || "—";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rel, setRel] = useState("");

  const create = () => {
    if (!from || !to || !rel.trim()) return;
    const fe = entities.find((e) => e.id === from);
    const te = entities.find((e) => e.id === to);
    addTo("relationships", { id: uid(), fromId: from, fromType: fe.type, toId: to, toType: te.type, relationType: rel.trim() });
    setRel("");
  };

  return (
    <div>
      <Header title="Relaciones" subtitle="Vincula personajes, lugares y objetos entre sí." />
      <div style={{ padding: "24px 34px" }}>
        {entities.length < 2 ? (
          <EmptyState icon={Network} hint="Crea al menos dos elementos (personajes, lugares…) para vincularlos." />
        ) : (
          <>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 24,
              display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr auto", gap: 12, alignItems: "end" }}>
              <Field label="Desde">
                <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Elige…</option>
                  {entities.map((e) => <option key={e.id} value={e.id} style={{ background: C.panel }}>{e.name} ({e.label})</option>)}
                </select>
              </Field>
              <Field label="Relación">
                <TextInput value={rel} placeholder="hermano de, vive en, posee…" onChange={(e) => setRel(e.target.value)} />
              </Field>
              <Field label="Hacia">
                <select value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Elige…</option>
                  {entities.map((e) => <option key={e.id} value={e.id} style={{ background: C.panel }}>{e.name} ({e.label})</option>)}
                </select>
              </Field>
              <button onClick={create} style={{ padding: "11px 18px", borderRadius: 10, border: `1px solid ${C.amber}55`,
                background: C.amberPill, color: C.amber, fontFamily: FONT, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
                Vincular
              </button>
            </div>

            {data.relationships.length === 0 ? (
              <p style={{ color: C.textDim, fontSize: 13.5, textAlign: "center" }}>Aún no hay relaciones creadas.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.relationships.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.card,
                    border: `1px solid ${C.border}`, borderRadius: 11, padding: "13px 16px" }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{nameOf(r.fromId)}</span>
                    <span style={{ color: C.amber, fontSize: 13, fontStyle: "italic" }}>— {r.relationType} →</span>
                    <span style={{ fontWeight: 700, color: C.text, flex: 1 }}>{nameOf(r.toId)}</span>
                    <button onClick={() => removeFrom("relationships", r.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, display: "flex" }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FontInjector() {
  useEffect(() => {
    const id = "codice-novela-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Spectral:ital,wght@0,400;0,500;1,400&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}
