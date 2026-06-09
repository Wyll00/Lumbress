import { useContext } from 'react';
import { LibraryContext } from '../context/LibraryContext';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import './Achievements.css';

// Logros / insignias — se calculan en vivo desde tus libros + perfil (sin BD).
const Achievements = () => {
    const { books } = useContext(LibraryContext);
    const { user } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);
    const year = new Date().getFullYear();

    const booksRead = books.filter((b) => b.status === 'Read').length;
    const booksTotal = books.length;
    const readingHours = Number(user?.reading_hours) || 0;
    const distinctGenres = new Set(books.map((b) => (b.genre || '').trim().toLowerCase()).filter(Boolean)).size;
    const booksRated = books.filter((b) => Number(b.rating) > 0).length;
    const readThisYear = books.filter(
        (b) => b.status === 'Read' && b.fecha_fin && new Date(b.fecha_fin).getFullYear() === year
    ).length;
    const goal = Number(user?.reading_goal) || 0;

    const defs = [
        { emoji: '📖', name: t('ach1Name'), desc: t('ach1Desc'), value: booksRead, target: 1 },
        { emoji: '📚', name: t('ach2Name'), desc: t('ach2Desc'), value: booksRead, target: 5 },
        { emoji: '🏆', name: t('ach3Name'), desc: t('ach3Desc'), value: booksRead, target: 10 },
        { emoji: '👑', name: t('ach4Name'), desc: t('ach4Desc'), value: booksRead, target: 25 },
        { emoji: '🗃️', name: t('ach5Name'), desc: t('ach5Desc'), value: booksTotal, target: 25 },
        { emoji: '⏱️', name: t('ach6Name'), desc: t('ach6Desc'), value: readingHours, target: 100 },
        { emoji: '🔥', name: t('ach7Name'), desc: t('ach7Desc'), value: readingHours, target: 500 },
        { emoji: '⭐', name: t('ach8Name'), desc: t('ach8Desc'), value: booksRated, target: 5 },
        { emoji: '🌈', name: t('ach9Name'), desc: t('ach9Desc'), value: distinctGenres, target: 3 },
    ];
    if (goal > 0) {
        defs.push({ emoji: '🎯', name: t('achGoalName'), desc: t('achGoalDesc', { year }), value: readThisYear, target: goal });
    }

    const unlocked = defs.filter((d) => d.value >= d.target).length;

    return (
        <div className="achievements glass-panel">
            <div className="ach-header">
                <h2>🏅 {t('achTitle')}</h2>
                <span className="ach-count">{t('achUnlocked', { n: unlocked, total: defs.length })}</span>
            </div>
            <div className="ach-grid">
                {defs.map((d, i) => {
                    const done = d.value >= d.target;
                    const pct = Math.min(100, Math.round((d.value / d.target) * 100));
                    return (
                        <div key={i} className={`ach-badge ${done ? 'unlocked' : 'locked'}`}>
                            <span className="ach-emoji">{done ? d.emoji : '🔒'}</span>
                            <span className="ach-name">{d.name}</span>
                            <span className="ach-desc">{d.desc}</span>
                            {done ? (
                                <span className="ach-done-tag">{t('achDone')}</span>
                            ) : (
                                <div className="ach-progress">
                                    <div className="ach-progress-bar"><div style={{ width: `${pct}%` }} /></div>
                                    <span className="ach-progress-text">{Math.min(d.value, d.target)}/{d.target}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Achievements;
