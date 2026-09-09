import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LibraryContext } from '../context/LibraryContext';
import { API_URL, withAuth, mediaUrl } from '../config';
import LumbresDashboard from '../components/lumbres/LumbresDashboard';

// PANTALLA DE PRUEBA (/nuevo) — dashboard del paquete "Lumbres React/Next"
// conectado a datos REALES. Convive con el Dashboard actual para poder
// compararlos; no sustituye a nada todavía.
//
// El paquete habla su propio idioma (title/currentPage/status en inglés) y
// nuestra API el suyo ('Read' | 'Reading' | 'To Read'), así que aquí va el
// adaptador entre ambos.

const ESTADO_A_STATUS = {
    Read: 'finished',
    Reading: 'reading',
    'To Read': 'want-to-read',
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

const DashboardNuevo = () => {
    const { user, refreshUser } = useContext(AuthContext);
    const { books, refetchBooks } = useContext(LibraryContext);
    const navigate = useNavigate();

    const year = new Date().getFullYear();

    // ── Nuestros libros -> el modelo que espera el componente ────────────────
    const librosAdaptados = useMemo(() => (books || []).map((b) => {
        // El componente exige totalPages entero positivo y currentPage dentro de rango.
        const total = Math.max(1, Number(b.totalPages) || 1);
        const actual = Math.min(Math.max(0, Number(b.pagesRead) || 0), total);
        return {
            id: String(b.id),
            title: b.title || '(sin título)',
            author: b.author || '',
            totalPages: total,
            currentPage: actual,
            status: ESTADO_A_STATUS[b.status] || 'want-to-read',
            coverUrl: b.coverUrl ? mediaUrl(b.coverUrl) : undefined,
            coverLabel: b.title || '',
        };
    }), [books]);

    // Leídos ESTE año: mismo criterio que usa ReadingGoal (status + fecha_fin).
    const terminadosEsteAno = useMemo(() => (books || []).filter(
        (b) => b.status === 'Read' && b.fecha_fin && new Date(b.fecha_fin).getFullYear() === year
    ).length, [books, year]);

    // ── Guardado: el componente revierte si la promesa se rechaza, así que
    //    comprobamos response.ok y lanzamos (fetch no lanza ante 4xx/5xx).
    const guardarProgreso = async (bookId, page) => {
        const libro = (books || []).find((b) => String(b.id) === String(bookId));
        if (!libro) throw new Error('Ese libro ya no está en tu biblioteca.');

        const total = Math.max(1, Number(libro.totalPages) || 1);
        const cambios = { pagesRead: page };
        // Terminar el libro también marca estado y fecha de fin, como hace la app.
        if (page >= total && libro.status !== 'Read') {
            cambios.status = 'Read';
            cambios.fecha_fin = hoyISO();
        }

        const res = await fetch(`${API_URL}/api/books/${bookId}`, withAuth({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...libro, ...cambios }),
        }));
        if (!res.ok) throw new Error('No se pudo guardar el progreso.');
        await refetchBooks();
    };

    const guardarMeta = async (goal) => {
        const res = await fetch(`${API_URL}/api/users/me/reading-goal`, withAuth({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal }),
        }));
        if (!res.ok) throw new Error('No se pudo guardar la meta.');
        await refreshUser();
    };

    return (
        <LumbresDashboard
            books={librosAdaptados}
            readingGoal={Number(user?.reading_goal) || 0}
            challengeYear={year}
            challengeCompletedCount={terminadosEsteAno}
            logoSrc="/lumbres/nombre.webp"
            onProgressChange={guardarProgreso}
            onGoalChange={guardarMeta}
            onOpenBook={(book) => navigate(`/library?libro=${encodeURIComponent(book.id)}`)}
        />
    );
};

export default DashboardNuevo;
