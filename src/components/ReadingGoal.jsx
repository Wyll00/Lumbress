import { useContext, useState } from 'react';
import { Target, Pencil, Check } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth } from '../config';
import './ReadingGoal.css';

// Reto de lectura anual: meta + progreso (leídos este año) + ritmo + celebración.
const ReadingGoal = ({ books = [] }) => {
    const { user, refreshUser } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);
    const goal = Number(user?.reading_goal) || 0;
    const year = new Date().getFullYear();
    const [editing, setEditing] = useState(false);
    const [input, setInput] = useState('');
    const [saving, setSaving] = useState(false);

    const readThisYear = books.filter(
        (b) => b.status === 'Read' && b.fecha_fin && new Date(b.fecha_fin).getFullYear() === year
    ).length;

    const pct = goal > 0 ? Math.min(100, Math.round((readThisYear / goal) * 100)) : 0;
    const done = goal > 0 && readThisYear >= goal;
    const extra = readThisYear - goal;

    const dayOfYear = Math.floor((Date.now() - new Date(year, 0, 1)) / 86400000) + 1;
    const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
    const expected = Math.floor((goal * dayOfYear) / daysInYear);
    const onTrack = readThisYear >= expected;
    const remaining = Math.max(0, goal - readThisYear);

    const openEdit = () => { setInput(goal ? String(goal) : ''); setEditing(true); };

    const save = async () => {
        const g = Math.max(0, Math.min(9999, parseInt(input, 10) || 0));
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/users/me/reading-goal`, withAuth({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: g }),
            }));
            if (res.ok) { await refreshUser(); setEditing(false); }
        } catch { /* noop */ }
        finally { setSaving(false); }
    };

    return (
        <div className="reading-goal glass-panel">
            <div className="rg-header">
                <h3><Target size={18} /> {t('rgTitle')} {year}</h3>
                {goal > 0 && !editing && (
                    <button className="rg-edit" onClick={openEdit} title={t('rgEdit')}>
                        <Pencil size={14} />
                    </button>
                )}
            </div>

            {editing ? (
                <div className="rg-edit-row">
                    <input
                        type="number" min="1" max="9999" value={input} autoFocus
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
                        placeholder={t('rgPlaceholder')}
                    />
                    <button className="btn-primary" onClick={save} disabled={saving}>
                        <Check size={16} /> {saving ? '…' : t('rgSave')}
                    </button>
                </div>
            ) : goal === 0 ? (
                <div className="rg-empty">
                    <p>{t('rgPrompt')}</p>
                    <button className="btn-primary" onClick={openEdit}>{t('rgSetGoal')}</button>
                </div>
            ) : (
                <>
                    <div className="rg-count">
                        <span className="rg-current">{readThisYear}</span>
                        <span className="rg-of">{t('rgBooksOf', { goal })}</span>
                    </div>
                    <div className="rg-bar">
                        <div className={`rg-fill ${done ? 'done' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="rg-status">
                        {done ? (
                            <span className="rg-done">{t('rgDone')}{extra > 0 ? ` (+${extra})` : ''}</span>
                        ) : (
                            <span className={onTrack ? 'rg-ontrack' : 'rg-behind'}>
                                {pct}% · {onTrack ? t('rgOnTrack') : t('rgBehind')} · {t('rgRemaining', { n: remaining })}
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ReadingGoal;
