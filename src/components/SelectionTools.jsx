import { Highlighter, Search, X, BookA, Volume2, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';

// Herramientas que aparecen al seleccionar texto en el lector:
// diccionario ("¿Qué significa?") + colores de subrayado.
// En ESCRITORIO se muestra como barra superior; en MÓVIL como hoja deslizante
// desde abajo (más cómoda y sin saturar la parte de arriba).

const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 };
const posChip = { display: 'inline-block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-color)', background: 'rgba(224,169,59,0.12)', borderRadius: 999, padding: '1px 9px', marginBottom: 5 };

// Resultado del diccionario (cargando / error / definición). Compartido por ambos diseños.
const DictResult = ({ dict, onLookupLang, onSpeak, onSaveWord }) => {
    if (dict.loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Buscando definición…
            </div>
        );
    }
    if (dict.error) {
        return (
            <div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{dict.error}</p>
                <div style={{ display: 'flex', gap: 14, marginTop: 7, flexWrap: 'wrap' }}>
                    {dict.lang === 'es' && (
                        <button onClick={() => onLookupLang('en')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-color)', fontSize: '0.82rem', fontWeight: 600 }}>
                            Buscar en inglés →
                        </button>
                    )}
                    {dict.word.trim().split(/\s+/).length > 1 && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>💡 Prueba con una sola palabra.</span>
                    )}
                </div>
            </div>
        );
    }
    if (dict.data) {
        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <BookA size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <strong style={{ color: 'var(--text)', fontSize: '1rem', textTransform: 'capitalize' }}>{dict.data.word}</strong>
                    {dict.data.phonetic && <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic' }}>{dict.data.phonetic}</span>}
                    <button onClick={() => onSpeak(dict.data.word, dict.data.lang)} title="Escuchar pronunciación" style={iconBtn}>
                        <Volume2 size={16} />
                    </button>
                    <button
                        onClick={onSaveWord}
                        disabled={dict.saved}
                        title="Guardar en Mis palabras"
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: dict.saved ? 'default' : 'pointer', color: dict.saved ? 'var(--accent-color)' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                        {dict.saved ? <><BookmarkCheck size={15} /> Guardada</> : <><Bookmark size={15} /> Guardar</>}
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {dict.data.meanings.map((m, i) => (
                        <div key={i}>
                            {m.partOfSpeech && <span style={posChip}>{m.partOfSpeech}</span>}
                            <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {m.definitions.map((d, j) => (
                                    <li key={j} style={{ fontSize: '0.86rem', lineHeight: 1.45 }}>{d}</li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const ColorDots = ({ colors, labels, saving, onSaveHighlight, size = 26 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Object.entries(colors).map(([key, c]) => (
            <button
                key={key}
                onClick={() => onSaveHighlight(key)}
                disabled={saving}
                title={labels[key]}
                style={{
                    width: size, height: size, borderRadius: '50%', cursor: 'pointer',
                    background: c.hex, border: '2px solid rgba(255,255,255,0.25)',
                    opacity: saving ? 0.5 : 1, flexShrink: 0,
                }}
            />
        ))}
    </div>
);

const SelectionTools = ({ isMobile, pending, dict, colors, labels, saving, onSaveHighlight, onLookup, onLookupLang, onSpeak, onSaveWord, onClose }) => {
    // ----- MÓVIL: hoja deslizante desde abajo -----
    if (isMobile) {
        return (
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', background: 'var(--card-bg, #1f1a14)',
                        borderTop: '1px solid var(--card-border, rgba(255,255,255,0.12))',
                        borderRadius: '18px 18px 0 0', padding: '10px 16px 20px',
                        maxHeight: '72vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 -8px 30px rgba(0,0,0,0.45)',
                    }}
                >
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--card-border, rgba(255,255,255,0.25))', margin: '2px auto 12px' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Highlighter size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            «{pending.text}»
                        </span>
                        <button onClick={onClose} aria-label="Cerrar" style={iconBtn}><X size={18} /></button>
                    </div>

                    {dict && (
                        <div style={{ flex: '0 1 auto', overflowY: 'auto', marginBottom: 14 }}>
                            <DictResult dict={dict} onLookupLang={onLookupLang} onSpeak={onSpeak} onSaveWord={onSaveWord} />
                        </div>
                    )}

                    {!dict && (
                        <button
                            className="btn-secondary"
                            onClick={onLookup}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', marginBottom: 14, fontSize: '0.95rem', width: '100%' }}
                        >
                            <Search size={18} /> ¿Qué significa?
                        </button>
                    )}

                    <div style={{ borderTop: '1px solid var(--card-border, rgba(255,255,255,0.1))', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Subrayar</span>
                        <ColorDots colors={colors} labels={labels} saving={saving} onSaveHighlight={onSaveHighlight} size={32} />
                    </div>
                </div>
            </div>
        );
    }

    // ----- ESCRITORIO: barra superior -----
    return (
        <div className="glass-panel" style={{ padding: '10px 16px', marginBottom: 10, borderLeft: '4px solid var(--accent-color, #e0a93b)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Highlighter size={18} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 140, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    «{pending.text.length > 90 ? pending.text.slice(0, 90) + '…' : pending.text}»
                </span>
                <button
                    className="btn-secondary"
                    onClick={onLookup}
                    title="Buscar el significado en el diccionario"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', flexShrink: 0, whiteSpace: 'nowrap', color: dict ? 'var(--accent-color)' : undefined }}
                >
                    <Search size={15} /> ¿Qué significa?
                </button>
                <ColorDots colors={colors} labels={labels} saving={saving} onSaveHighlight={onSaveHighlight} />
                <button className="btn-secondary" onClick={onClose} style={{ padding: '7px 10px' }} title="Cancelar">
                    <X size={15} />
                </button>
            </div>
            {dict && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--card-border, rgba(255,255,255,0.1))', maxHeight: 220, overflowY: 'auto' }}>
                    <DictResult dict={dict} onLookupLang={onLookupLang} onSpeak={onSpeak} onSaveWord={onSaveWord} />
                </div>
            )}
        </div>
    );
};

export default SelectionTools;
