import { useContext, useMemo, useState, useEffect } from 'react';
import { LibraryContext } from '../context/LibraryContext';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth } from '../config';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line
} from 'recharts';
import { BookOpen, Layers, Target, Library, Star } from 'lucide-react';
import Calendar from '../components/Calendar';
import ReadBooksModal from '../components/ReadBooksModal';
import Achievements from '../components/Achievements';
import './Statistics.css';

const COLORS = ['#7b61ff', '#2ecc71', '#f1c40f', '#e74c3c', '#00C49F', '#FFBB28', '#FF8042'];

const GenreTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value, titles = [] } = payload[0].payload;
    const color = payload[0].payload.fill || payload[0].color;
    const shown = titles.slice(0, 8);
    const remaining = titles.length - shown.length;
    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '0.85rem',
            color: 'var(--text)',
            maxWidth: '260px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                <strong>{name}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>· {value} {value === 1 ? 'libro' : 'libros'}</span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {shown.map((b, i) => (
                    <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        • <span style={{ color: 'var(--text)' }}>{b.title}</span>
                        {b.author && <span style={{ color: 'var(--text-muted)' }}> — {b.author}</span>}
                    </li>
                ))}
                {remaining > 0 && (
                    <li style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                        +{remaining} más…
                    </li>
                )}
            </ul>
        </div>
    );
};

const Statistics = () => {
    const { books } = useContext(LibraryContext);
    const { t } = useContext(LanguageContext);
    const { isAuthenticated } = useContext(AuthContext);
    const [weeklyData, setWeeklyData] = useState([]);
    const [showBooksModal, setShowBooksModal] = useState(false);

    useEffect(() => {
        const fetchReadingStats = async () => {
            if (!isAuthenticated) return;
            try {
                const res = await fetch(`${API_URL}/api/users/me/reading-stats`, withAuth());
                if (res.ok) {
                    const data = await res.json();
                    setWeeklyData(data);
                }
            } catch (err) {
                console.error('Error fetching reading stats:', err);
            }
        };
        fetchReadingStats();
    }, [isAuthenticated]);

    const stats = useMemo(() => {
        const total = books.length;
        const totalPages = books.reduce((sum, b) => sum + (b.totalPages || 0), 0);
        const completedPages = books.reduce((sum, b) => sum + (b.pagesRead || 0), 0);

        // Genre Data for Pie Chart — guardamos también los títulos por género
        const genreMap = books.reduce((acc, book) => {
            const label = (book.genre || '').trim() || t('uncategorized');
            const key = label.toLocaleLowerCase(); // agrupa ignorando mayúsculas y espacios sobrantes
            if (!acc[key]) acc[key] = { label, titles: [] };
            acc[key].titles.push({ title: book.title, author: book.author });
            return acc;
        }, {});

        const genreData = Object.values(genreMap).map(({ label, titles }) => ({
            name: label,
            value: titles.length,
            titles,
        })).sort((a, b) => b.value - a.value);

        // Status Data for Bar Chart
        const statusData = [
            { name: t('read'), count: books.filter(b => b.status === 'Read').length },
            { name: t('reading'), count: books.filter(b => b.status === 'Reading').length },
            { name: t('toRead'), count: books.filter(b => b.status === 'To Read').length },
        ];

        // Average Rating
        const ratedBooks = books.filter(b => b.rating && b.rating > 0);
        const averageRating = ratedBooks.length > 0
            ? (ratedBooks.reduce((sum, b) => sum + Number(b.rating), 0) / ratedBooks.length).toFixed(1)
            : 0;

        // Ratings Distribution for Line Chart or Bar Chart
        const ratingsCount = books.reduce((acc, book) => {
            if (book.rating > 0) {
                const r = Math.round(Number(book.rating));
                if (r >= 1 && r <= 5) {
                    acc[r] = (acc[r] || 0) + 1;
                }
            }
            return acc;
        }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

        const ratingsData = [1, 2, 3, 4, 5].map(star => ({
            name: `${star} ${t('stars')}`,
            count: ratingsCount[star]
        }));

        // Top Authors
        const authorCount = books.reduce((acc, book) => {
            const author = book.author || t('unknownAuthor');
            acc[author] = (acc[author] || 0) + 1;
            return acc;
        }, {});

        const authorData = Object.keys(authorCount)
            .map(name => ({ name, count: authorCount[name] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // top 5 authors

        const uniqueGenresCount = Object.keys(genreMap).length;

        // Build weekly ranking from real data
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const last7Days = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = daysOfWeek[d.getDay()];
            // Adjust to local date string to match MySQL YYYY-MM-DD
            const offset = d.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(d - offset)).toISOString().split('T')[0];
            last7Days.push({ name: dayName, dateStr: localISOTime, hours: 0 });
        }

        weeklyData.forEach(log => {
            const logDate = new Date(log.log_date);
            const offset = logDate.getTimezoneOffset() * 60000;
            const logDateStr = (new Date(logDate - offset)).toISOString().split('T')[0];
            
            const dayEntry = last7Days.find(d => d.dateStr === logDateStr);
            if (dayEntry) {
                dayEntry.hours = Number(log.total_hours);
            }
        });

        // Reverse to show today at the top of the vertical bar chart
        const weeklyRankingData = last7Days.reverse();

        const totalWeeklyHours = weeklyRankingData.reduce((sum, day) => sum + day.hours, 0);
        const weeklyHoursText = `${totalWeeklyHours}h`;

        return { total, totalPages, completedPages, genreData, statusData, averageRating, ratingsData, authorData, uniqueGenresCount, weeklyRankingData, weeklyHoursText };
    }, [books, t, weeklyData]);

    if (books.length === 0) {
        return (
            <div className="statistics animate-fade-in">
                <header className="page-header">
                    <h1>{t('readingStats')}</h1>
                </header>
                <div className="empty-stats glass-panel">
                    <p>{t('addBooksForStats')}</p>
                </div>
            </div>
        );
    }

    const completionRate = stats.totalPages > 0
        ? Math.round((stats.completedPages / stats.totalPages) * 100)
        : 0;

    return (
        <div className="statistics animate-fade-in">
            <header className="page-header">
                <h1>{t('readingStats')}</h1>
                <p>{t('analyzeHabits')}</p>
            </header>

            <div className="stats-overview-grid">
                <div
                    className="stat-overview-card glass-panel clickable-card"
                    onClick={() => setShowBooksModal(true)}
                    title="Click para ver detalle de tus libros"
                >
                    <div className="stat-icon" style={{ background: 'rgba(52, 152, 219, 0.2)', color: '#3498db' }}>
                        <Library size={24} />
                    </div>
                    <div>
                        <h3>{t('totalBooks')}</h3>
                        <p className="large-number">{stats.total.toLocaleString()}</p>
                        <span className="card-hint">Click para ver detalle</span>
                    </div>
                </div>

                <div className="stat-overview-card glass-panel">
                    <div className="stat-icon" style={{ background: 'rgba(123, 97, 255, 0.2)', color: 'var(--accent-color)' }}>
                        <Layers size={24} />
                    </div>
                    <div>
                        <h3>{t('totalPagesLibrary')}</h3>
                        <p className="large-number">{stats.totalPages.toLocaleString()}</p>
                    </div>
                </div>

                <div className="stat-overview-card glass-panel">
                    <div className="stat-icon" style={{ background: 'rgba(46, 204, 113, 0.2)', color: 'var(--success-color)' }}>
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h3>{t('pagesReadStat')}</h3>
                        <p className="large-number">{stats.completedPages.toLocaleString()}</p>
                    </div>
                </div>

                <div className="stat-overview-card glass-panel">
                    <div className="stat-icon" style={{ background: 'rgba(241, 196, 15, 0.2)', color: 'var(--warning-color)' }}>
                        <Target size={24} />
                    </div>
                    <div>
                        <h3>{t('overallCompletion')}</h3>
                        <p className="large-number">{completionRate}%</p>
                    </div>
                </div>

                <div className="stat-overview-card glass-panel">
                    <div className="stat-icon" style={{ background: 'rgba(230, 126, 34, 0.2)', color: '#e67e22' }}>
                        <Star size={24} />
                    </div>
                    <div>
                        <h3>{t('avgRating')}</h3>
                        <p className="large-number">{stats.averageRating}</p>
                    </div>
                </div>

                <div className="stat-overview-card glass-panel">
                    <div className="stat-icon" style={{ background: 'rgba(155, 89, 182, 0.2)', color: '#9b59b6' }}>
                        <Library size={24} />
                    </div>
                    <div>
                        <h3>Géneros únicos</h3>
                        <p className="large-number">{stats.uniqueGenresCount}</p>
                    </div>
                </div>
            </div>

            <Achievements />

            <div className="charts-grid-main">
                {/* 1. Libros por género */}
                <div className="chart-container glass-panel">
                    <div className="chart-header">
                        <h2>{t('booksByGenre')}</h2>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={stats.genreData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stats.genreData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<GenreTooltip />} />
                                <Legend formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{value}</span>} layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Desglose por estado */}
                <div className="chart-container glass-panel">
                    <div className="chart-header">
                        <h2>{t('readingStatusBreakdown')}</h2>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={stats.statusData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
                                    contentStyle={{ background: 'rgba(20, 20, 28, 0.96)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', fontSize: '0.85rem' }}
                                    labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value) => [value, 'Libros']}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                                    {stats.statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Top Authors */}
                <div className="chart-container glass-panel">
                    <div className="chart-header">
                        <h2>Autores Principales</h2>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={stats.authorData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={70} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
                                    contentStyle={{ background: 'rgba(20, 20, 28, 0.96)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', fontSize: '0.85rem' }}
                                    labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value) => [value, 'Libros']}
                                />
                                <Bar dataKey="count" fill="#3498db" radius={[0, 4, 4, 0]} barSize={15}>
                                    {stats.authorData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Rating Distribution */}
                <div className="chart-container glass-panel">
                    <div className="chart-header">
                        <h2>Distribución de Puntuaciones</h2>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={stats.ratingsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(20, 20, 28, 0.96)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', fontSize: '0.85rem' }}
                                    labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value) => [value, 'Libros']}
                                />
                                <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={3} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 5. Ranking Semanal */}
                <div className="chart-container glass-panel" style={{ position: 'relative' }}>
                    <div className="chart-header">
                        <h2>Ranking Semanal</h2>
                    </div>
                    <div className="chart-wrapper" style={{ paddingBottom: '16px' }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={stats.weeklyRankingData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={40} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
                                    contentStyle={{ background: 'rgba(20, 20, 28, 0.96)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', fontSize: '0.85rem' }}
                                    labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value) => [`${value} h`, 'Tiempo']}
                                />
                                <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={15}>
                                    {stats.weeklyRankingData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent)' : 'var(--text-muted)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ position: 'absolute', bottom: '16px', right: '24px', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: '600' }}>
                        Total: {stats.weeklyHoursText}
                    </div>
                </div>
                {/* 6. Calendario (Visual) */}
                <div className="calendar-full-width-container" style={{ width: '100%', marginTop: '16px' }}>
                    <Calendar />
                </div>
            </div>

            <ReadBooksModal
                isOpen={showBooksModal}
                onClose={() => setShowBooksModal(false)}
                books={books}
                title="Tus libros"
            />
        </div>
    );
};

export default Statistics;
