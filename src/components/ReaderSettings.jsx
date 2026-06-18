import { ALargeSmall, Minus, Plus, X } from 'lucide-react';
import { THEMES } from './readerThemes';

const round1 = (n) => Math.round(n * 10) / 10;

const Stepper = ({ label, display, onDec, onInc, decDisabled, incDisabled }) => (
    <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 7px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-secondary" onClick={onDec} disabled={decDisabled} style={{ padding: '8px 12px', display: 'flex' }} aria-label={`Reducir ${label}`}>
                <Minus size={16} />
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{display}</span>
            <button className="btn-secondary" onClick={onInc} disabled={incDisabled} style={{ padding: '8px 12px', display: 'flex' }} aria-label={`Aumentar ${label}`}>
                <Plus size={16} />
            </button>
        </div>
    </div>
);

const Segmented = ({ label, options, value, onChange }) => (
    <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 7px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</p>
        <div style={{ display: 'flex', gap: 8 }}>
            {options.map((o) => {
                const active = value === o.value;
                return (
                    <button
                        key={o.value}
                        onClick={() => onChange(o.value)}
                        style={{
                            flex: 1, padding: '8px 6px', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                            border: `1px solid ${active ? 'var(--accent-color, #e0a93b)' : 'var(--card-border, rgba(255,255,255,0.15))'}`,
                            background: active ? 'rgba(224,169,59,0.15)' : 'transparent',
                            color: active ? 'var(--accent-color, #e0a93b)' : 'var(--text)',
                            fontFamily: o.fontFamily,
                        }}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    </div>
);

// Panel de ajustes de lectura. Props: settings, onChange(nuevoSettings), isPdf, onClose
const ReaderSettings = ({ settings, onChange, isPdf, onClose }) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const set = (k, v) => onChange({ ...settings, [k]: v });

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(1px)' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="glass-panel"
                style={{
                    position: 'fixed', top: 64, right: isMobile ? 12 : 16, left: isMobile ? 12 : 'auto',
                    width: isMobile ? 'auto' : 300, maxWidth: 'calc(100vw - 24px)',
                    borderRadius: 14, padding: '16px 18px',
                    background: 'var(--card-bg, #1f1a14)', border: '1px solid var(--card-border, rgba(255,255,255,0.12))',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <strong style={{ color: 'var(--text)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ALargeSmall size={18} style={{ color: 'var(--accent-color)' }} /> Ajustes de lectura
                    </strong>
                    <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                        <X size={18} />
                    </button>
                </div>

                {isPdf ? (
                    <Stepper
                        label="Zoom"
                        display={`${settings.zoom}%`}
                        onDec={() => set('zoom', Math.max(50, settings.zoom - 10))}
                        onInc={() => set('zoom', Math.min(250, settings.zoom + 10))}
                        decDisabled={settings.zoom <= 50}
                        incDisabled={settings.zoom >= 250}
                    />
                ) : (
                    <>
                        <Stepper
                            label="Tamaño de letra"
                            display={`${settings.fontSize}%`}
                            onDec={() => set('fontSize', Math.max(70, settings.fontSize - 10))}
                            onInc={() => set('fontSize', Math.min(200, settings.fontSize + 10))}
                            decDisabled={settings.fontSize <= 70}
                            incDisabled={settings.fontSize >= 200}
                        />
                        <Stepper
                            label="Interlineado"
                            display={round1(settings.lineHeight).toFixed(1)}
                            onDec={() => set('lineHeight', Math.max(1.0, round1(settings.lineHeight - 0.1)))}
                            onInc={() => set('lineHeight', Math.min(2.4, round1(settings.lineHeight + 0.1)))}
                            decDisabled={settings.lineHeight <= 1.0}
                            incDisabled={settings.lineHeight >= 2.4}
                        />
                        <Segmented
                            label="Tipografía"
                            value={settings.font}
                            onChange={(v) => set('font', v)}
                            options={[
                                { value: 'original', label: 'Original' },
                                { value: 'serif', label: 'Serif', fontFamily: 'Georgia, serif' },
                                { value: 'sans', label: 'Sans', fontFamily: 'system-ui, sans-serif' },
                            ]}
                        />
                        <div>
                            <p style={{ margin: '0 0 7px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tema</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {Object.entries(THEMES).map(([key, t]) => {
                                    const active = settings.theme === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => set('theme', key)}
                                            title={t.label}
                                            style={{
                                                flex: 1, padding: '10px 6px', borderRadius: 9, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                                background: t.bg, color: t.fg,
                                                border: `2px solid ${active ? 'var(--accent-color, #e0a93b)' : 'rgba(0,0,0,0.15)'}`,
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReaderSettings;
