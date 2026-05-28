import { useState, useMemo, useEffect, useContext } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth } from '../config';
import EventModal from './EventModal';
import './Calendar.css';

const Calendar = () => {
    const { isAuthenticated } = useContext(AuthContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [hoveredDow, setHoveredDow] = useState(null);

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    useEffect(() => {
        if (!isAuthenticated) return;
        fetch(`${API_URL}/api/events`, withAuth())
            .then(r => r.ok ? r.json() : [])
            .then(data => setEvents(data))
            .catch(err => console.error('Error fetching events:', err));
    }, [isAuthenticated]);

    const handleSaveEvent = async (formData) => {
        try {
            const res = await fetch(`${API_URL}/api/events`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            }));
            if (res.ok) {
                const newEvent = await res.json();
                setEvents(prev => [...prev, newEvent]);
            }
        } catch (err) {
            console.error('Error saving event:', err);
        }
        setShowModal(false);
    };

    const handleDeleteEvent = async (e, eventId) => {
        e.stopPropagation();
        try {
            const res = await fetch(`${API_URL}/api/events/${eventId}`, withAuth({ method: 'DELETE' }));
            if (res.ok) {
                setEvents(prev => prev.filter(ev => ev.id !== eventId));
            }
        } catch (err) {
            console.error('Error deleting event:', err);
        }
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const monthYearString = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const capitalizedMonthYear = monthYearString.charAt(0).toUpperCase() + monthYearString.slice(1);

    // ─── Grid ─────────────────────────────────────────────────────────────────
    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push({ id: `empty-prev-${i}`, empty: true });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            const dowIndex = dateObj.getDay();
            const isToday =
                new Date().getDate() === i &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

            // Build ISO date string for this cell (YYYY-MM-DD)
            const mm = String(month + 1).padStart(2, '0');
            const dd = String(i).padStart(2, '0');
            const dateStr = `${year}-${mm}-${dd}`;

            days.push({ id: `day-${i}`, day: i, isToday, dowName: daysOfWeek[dowIndex], dowIndex, dateStr });
        }

        const remainingCells = 42 - days.length;
        for (let i = 0; i < remainingCells; i++) {
            days.push({ id: `empty-next-${i}`, empty: true });
        }

        return days;
    }, [currentDate]);

    // ─── Events per day ───────────────────────────────────────────────────────
    const getEventsForDate = (dateStr) => {
        return events.filter(ev => {
            // ev.fecha puede venir como "2026-05-12T00:00:00.000Z" o "2026-05-12"
            const evDate = ev.fecha ? ev.fecha.toString().split('T')[0] : '';
            return evDate === dateStr;
        });
    };

    // ─── Colors ───────────────────────────────────────────────────────────────
    const getDayColor = (dowIndex) => {
        const colors = [
            'var(--status-abandoned, #e74c3c)',
            '#3498db',
            'var(--success-color, #2ecc71)',
            '#f39c12',
            '#9b59b6',
            '#e67e22',
            '#00b894'
        ];
        return colors[dowIndex] || 'var(--text)';
    };

    const openModalForDate = (dateStr) => {
        setSelectedDate(dateStr);
        setShowModal(true);
    };

    return (
        <>
            <div className="calendar-container glass-panel">
                <div className="calendar-header">
                    <h2>{capitalizedMonthYear}</h2>
                    <div className="calendar-controls">
                        <button
                            className="calendar-add-btn"
                            onClick={() => openModalForDate('')}
                            title="Añadir evento"
                        >
                            <Plus size={16} />
                            Nuevo evento
                        </button>
                        <button onClick={prevMonth} className="calendar-btn" title="Mes anterior">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextMonth} className="calendar-btn" title="Mes siguiente">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="calendar-grid">
                    {daysOfWeek.map((day, idx) => (
                        <div
                            key={`dow-${idx}`}
                            className={`calendar-dow ${hoveredDow === idx ? 'dow-highlighted' : ''}`}
                            style={{ '--day-color': getDayColor(idx), color: 'var(--day-color)' }}
                        >
                            {day}
                        </div>
                    ))}

                    {calendarGrid.map((cell) => {
                        const cellEvents = !cell.empty ? getEventsForDate(cell.dateStr) : [];
                        return (
                            <div
                                key={cell.id}
                                className={`calendar-cell ${cell.empty ? 'empty' : ''} ${cell.isToday ? 'today' : ''} ${cellEvents.length > 0 ? 'has-events' : ''}`}
                                style={{
                                    ...(!cell.empty && cell.isToday ? {
                                        borderColor: getDayColor(cell.dowIndex),
                                        backgroundColor: `color-mix(in srgb, ${getDayColor(cell.dowIndex)} 15%, transparent)`
                                    } : {}),
                                    '--day-color': cell.empty ? 'inherit' : getDayColor(cell.dowIndex)
                                }}
                                onClick={() => !cell.empty && openModalForDate(cell.dateStr)}
                                onMouseEnter={() => !cell.empty && setHoveredDow(cell.dowIndex)}
                                onMouseLeave={() => !cell.empty && setHoveredDow(null)}
                            >
                                {!cell.empty && (
                                    <div className="calendar-day-header">
                                        <span className="calendar-day-name">{cell.dowName}</span>
                                        <span className="calendar-day-number">{cell.day}</span>
                                    </div>
                                )}

                                {/* Eventos del día */}
                                {cellEvents.length > 0 && (
                                    <div className="calendar-events-list">
                                        {cellEvents.slice(0, 2).map(ev => (
                                            <div key={ev.id} className="calendar-event-chip" style={{ '--chip-color': getDayColor(cell.dowIndex) }}>
                                                <span className="calendar-event-time">
                                                    {ev.hora ? ev.hora.substring(0, 5) : ''}
                                                </span>
                                                <span className="calendar-event-title">{ev.titulo}</span>
                                                <button
                                                    className="calendar-event-delete"
                                                    onClick={(e) => handleDeleteEvent(e, ev.id)}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {cellEvents.length > 2 && (
                                            <span className="calendar-events-more">+{cellEvents.length - 2} más</span>
                                        )}
                                    </div>
                                )}

                                {!cell.empty && cell.isToday && (
                                    <div className="calendar-today-badge" style={{ backgroundColor: 'var(--day-color)' }}>
                                        HOY
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <EventModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleSaveEvent}
                defaultDate={selectedDate}
            />
        </>
    );
};

export default Calendar;
