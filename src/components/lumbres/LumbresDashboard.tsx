'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import styles from './dashboard.module.css';
import type { Book, BookStatus, LumbresDashboardProps } from './types';

export type { Book, BookStatus, CoverTone, LumbresDashboardProps } from './types';

type Modal = { kind: 'progress' | 'detail' | 'review'; bookId: string } | { kind: 'goal' } | null;
type Operation = 'progress' | 'goal' | 'want' | 'review';

const statusLabels: Record<BookStatus, string> = {
  reading: 'Leyendo',
  'want-to-read': 'Por leer',
  finished: 'Terminado',
};

const normalizeSearch = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

const nonnegativeInteger = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

const validGoal = (value: number) => Math.min(1000, Math.max(1, nonnegativeInteger(value)));

function cleanBooks(books: readonly Book[]): Book[] {
  const seen = new Set<string>();
  return books.filter((book) => {
    if (!book.id || seen.has(book.id)) return false;
    seen.add(book.id);
    return true;
  }).map((book) => ({ ...book }));
}

function progressOf(book: Book) {
  const total = nonnegativeInteger(book.totalPages);
  const page = Math.min(total, nonnegativeInteger(book.currentPage));
  return { page, total, percent: total > 0 ? Math.round((page / total) * 100) : 0 };
}

function Cover({ book }: { book: Book }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (book.coverUrl && failedUrl !== book.coverUrl) {
    return (
      <img
        className="l-cover l-cover-image"
        src={book.coverUrl}
        alt=""
        loading="lazy"
        width={200}
        height={300}
        onError={() => setFailedUrl(book.coverUrl ?? null)}
      />
    );
  }
  return (
    <div className={`l-cover l-cover-${book.coverTone ?? 'olive'}`} aria-hidden="true">
      <small>{book.author}</small>
      <strong>{book.coverLabel ?? book.title}</strong>
      <span>LUMBRES</span>
    </div>
  );
}

/** A self-contained dashboard. Supply callbacks to persist changes in your app. */
export function LumbresDashboard({
  books,
  featuredBookId,
  recommendation,
  readingGoal,
  challengeYear,
  challengeCompletedCount,
  logoSrc = '/lumbres/logo.webp',
  onProgressChange,
  onGoalChange,
  onWantToReadChange,
  onReviewDraftSave,
  onOpenBook,
}: LumbresDashboardProps) {
  const instanceId = useId();
  const id = (part: string) => `${instanceId}-${part}`;
  const [library, setLibrary] = useState<Book[]>(() => cleanBooks(books));
  const [goal, setGoal] = useState(() => validGoal(readingGoal));
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [pageInput, setPageInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [drafts, setDrafts] = useState<Map<string, string>>(() => new Map());
  const [pending, setPending] = useState<Operation | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastDialogKind = useRef<NonNullable<Modal>['kind'] | null>(null);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);

  // Ignore freshly allocated but equivalent arrays, so parent rerenders do not
  // undo local demo edits. A changed prop payload remains authoritative.
  const booksSignature = JSON.stringify(books);
  const lastBooksSignature = useRef(booksSignature);
  useEffect(() => {
    if (lastBooksSignature.current !== booksSignature) {
      lastBooksSignature.current = booksSignature;
      setLibrary(cleanBooks(books));
    }
  }, [books, booksSignature]);
  useEffect(() => { setGoal(validGoal(readingGoal)); }, [readingGoal]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modal && !dialog.open) dialog.showModal();
    else if (modal && modal.kind !== lastDialogKind.current) {
      // Switching from the details view to a form keeps the same native dialog.
      // Move focus off the removed action and into the new form.
      dialog.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    }
    if (!modal && dialog.open) dialog.close();
    lastDialogKind.current = modal?.kind ?? null;
  }, [modal]);

  const featured = library.find((book) => book.id === featuredBookId)
    ?? library.find((book) => book.status === 'reading')
    ?? library[0];
  const readingCount = library.filter((book) => book.status === 'reading').length;
  const finishedCount = library.filter((book) => book.status === 'finished').length;
  const completed = challengeCompletedCount === undefined
    ? finishedCount
    : nonnegativeInteger(challengeCompletedCount);
  const goalPercent = Math.min(100, (completed / goal) * 100);
  const featuredProgress = featured ? progressOf(featured) : null;
  const savedRecommendation = recommendation && library.find((book) => book.id === recommendation.id);
  const recommendationBook = savedRecommendation || recommendation;
  const wanted = savedRecommendation?.status === 'want-to-read';
  const recommendationAlreadyReading = !!savedRecommendation && savedRecommendation.status !== 'want-to-read';
  const selectedBook = modal && 'bookId' in modal
    ? library.find((book) => book.id === modal.bookId)
    : undefined;

  const recentBooks = useMemo(() => {
    const dated = library.map((book, index) => ({
      book,
      index,
      time: book.addedAt ? Date.parse(book.addedAt) : Number.NaN,
    }));
    dated.sort((a, b) => {
      if (Number.isFinite(a.time) && Number.isFinite(b.time)) return b.time - a.time || a.index - b.index;
      if (Number.isFinite(a.time)) return -1;
      if (Number.isFinite(b.time)) return 1;
      return a.index - b.index;
    });
    const normalizedQuery = normalizeSearch(query);
    const matches = dated.map(({ book }) => book).filter((book) =>
      normalizeSearch(`${book.title} ${book.author}`).includes(normalizedQuery),
    );
    return normalizedQuery ? matches : matches.slice(0, 6);
  }, [library, query]);

  function dismissModal() {
    if (pendingRef.current) return;
    setModal(null);
    setError('');
  }

  function openReview(book = featured) {
    if (!book || pendingRef.current) return;
    setError('');
    setModal({ kind: 'review', bookId: book.id });
  }

  function openProgress(book: Book) {
    if (pendingRef.current) return;
    if (book.status === 'finished') {
      openReview(book);
      return;
    }
    setError('');
    setPageInput(String(progressOf(book).page));
    setModal({ kind: 'progress', bookId: book.id });
  }

  function openBook(book: Book) {
    if (pendingRef.current) return;
    setError('');
    if (onOpenBook) {
      try { onOpenBook(book); }
      catch { setError('No se pudo abrir el libro. Inténtalo otra vez.'); }
      return;
    }
    setModal({ kind: 'detail', bookId: book.id });
  }

  async function mutate(
    operation: Operation,
    persist: () => Promise<void> | void,
    commit: () => void,
    successMessage: string,
    errorMessage: string,
    closeDialog = false,
  ) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(operation);
    setError('');
    setFeedback('');
    try {
      await persist();
      if (!mountedRef.current) return;
      commit();
      setFeedback(successMessage);
      if (closeDialog) setModal(null);
    } catch {
      if (mountedRef.current) setError(errorMessage);
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) setPending(null);
    }
  }

  function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBook) return;
    const page = Number(pageInput);
    const total = selectedBook.totalPages;
    if (!pageInput.trim() || !Number.isInteger(page) || !Number.isFinite(page)
      || !Number.isInteger(total) || total < 1 || page < 0 || page > total) {
      setError(`Introduce una página entera entre 0 y ${total}.`);
      return;
    }
    const bookId = selectedBook.id;
    void mutate('progress', () => onProgressChange?.(bookId, page), () => {
      setLibrary((current) => current.map((book) => book.id === bookId
        ? { ...book, currentPage: page, status: page === total ? 'finished' : 'reading' }
        : book));
    }, `Progreso actualizado: página ${page} de ${total}.`,
    'No se pudo guardar el progreso. Tus datos no han cambiado. Inténtalo otra vez.', true);
  }

  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextGoal = Number(goalInput);
    if (!goalInput.trim() || !Number.isFinite(nextGoal) || !Number.isInteger(nextGoal)
      || nextGoal < 1 || nextGoal > 1000) {
      setError('Introduce un objetivo entero entre 1 y 1000 libros.');
      return;
    }
    void mutate('goal', () => onGoalChange?.(nextGoal), () => setGoal(nextGoal),
      `Tu objetivo ahora es de ${nextGoal} libros.`,
      'No se pudo guardar la meta. Inténtalo otra vez.', true);
  }

  function toggleRecommendation() {
    if (!recommendationBook || recommendationAlreadyReading) return;
    const book = recommendationBook;
    const nextWanted = !wanted;
    void mutate('want', () => onWantToReadChange?.(book, nextWanted), () => {
      setLibrary((current) => {
        if (!nextWanted) return current.filter((entry) => entry.id !== book.id || entry.status !== 'want-to-read');
        if (current.some((entry) => entry.id === book.id)) return current;
        return [{ ...book, status: 'want-to-read', currentPage: 0, addedAt: new Date().toISOString() }, ...current];
      });
    }, nextWanted ? `${book.title} está en tu lista «Por leer».` : `${book.title} se ha quitado de «Por leer».`,
    'No se pudo cambiar tu lista. Inténtalo otra vez.');
  }

  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBook) return;
    const bookId = selectedBook.id;
    const text = (drafts.get(bookId) ?? '').trim();
    if (!text || text.length > 10000) {
      setError('Escribe una reseña de entre 1 y 10 000 caracteres.');
      return;
    }
    void mutate('review', () => onReviewDraftSave?.(bookId, text), () => {
      setDrafts((current) => new Map(current).set(bookId, text));
    }, `Borrador de reseña guardado: ${selectedBook.title}.`,
    'No se pudo guardar el borrador. El texto sigue aquí para que puedas reintentarlo.', true);
  }

  const modalTitle = modal?.kind === 'goal' ? 'Un reto a tu medida'
    : modal?.kind === 'progress' ? '¿Por dónde vas?'
    : modal?.kind === 'review' ? 'Tu lectura, tus palabras.'
    : selectedBook?.title ?? 'Libro no disponible';

  return (
    <div className={styles.dashboard} aria-label="Inicio de Lumbres">
      <header className="l-top">
        <a href={`#${id('home')}`} aria-label="Lumbres, inicio">
          <img className="l-logo" src={logoSrc} alt="Lumbres" width={360} height={70} />
        </a>
        <nav className="l-nav" aria-label="Principal">
          <a href={`#${id('home')}`} aria-current="page">Inicio</a>
          <a href={`#${id('shelf')}`}>Mi biblioteca</a>
          <a href={`#${id('discover')}`}>Descubrir</a>
          <a href={`#${id('community')}`}>Comunidad</a>
        </nav>
        <span className="l-avatar" aria-hidden="true">L</span>
      </header>
      <main className="l-main" id={id('home')}>
        <div className="l-intro">
          <div>
            <h1>Tu biblioteca, a tu ritmo.</h1>
            <div className="l-summary">
              <span><strong>{library.length}</strong> libros</span>
              <span><strong>{readingCount}</strong> en lectura</span>
              <span><strong>{finishedCount}</strong> terminados</span>
            </div>
          </div>
          <a className="l-button" href={`#${id('discover')}`}>Explorar libros <span aria-hidden="true">↗</span></a>
        </div>

        <div className="l-feature-grid">
          <section className="l-reading" aria-labelledby={id('current-title')}>
            {featured && featuredProgress ? (
              <>
                <Cover book={featured} />
                <div>
                  <div className="l-kicker">{featured.status === 'finished' ? 'LECTURA TERMINADA' : featured.status === 'reading' ? 'LEYENDO AHORA' : 'TU PRÓXIMA LECTURA'}</div>
                  <h2 id={id('current-title')}>{featured.title}</h2>
                  <p className="l-author">{featured.author}</p>
                  <div className="l-progress-meta"><span><b>{featuredProgress.page}</b> de {featuredProgress.total} páginas</span><b>{featuredProgress.percent} %</b></div>
                  <div className="l-track" role="progressbar" aria-label={`Progreso en ${featured.title}`} aria-valuemin={0} aria-valuemax={featuredProgress.total || 1} aria-valuenow={featuredProgress.page}>
                    <div className="l-fill" style={{ width: `${featuredProgress.percent}%` }} />
                  </div>
                  <div className="l-reading-actions">
                    <button className="l-button l-button-primary" type="button" disabled={!!pending} onClick={() => openProgress(featured)}>{featured.status === 'finished' ? 'Escribir reseña' : 'Actualizar progreso'}</button>
                    <button className="l-text-button" type="button" disabled={!!pending} onClick={() => openBook(featured)}>Ver libro</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="l-empty"><h2 id={id('current-title')}>Tu próxima lectura empieza aquí.</h2><p>Añade un libro a tu biblioteca para ver tu progreso.</p></div>
            )}
          </section>
          <section className="l-goal" aria-labelledby={id('goal-title')}>
            <div className="l-goal-heading">
              <h2 id={id('goal-title')}>Tu reto de {challengeYear}</h2>
              <button className="l-text-button" type="button" disabled={!!pending} onClick={() => { setGoalInput(String(goal)); setError(''); setModal({ kind: 'goal' }); }}>Ajustar</button>
            </div>
            <div className="l-goal-number"><strong>{completed}</strong><span>de <b>{goal}</b> libros</span></div>
            <div className="l-track" role="progressbar" aria-label={`Reto de lectura de ${challengeYear}`} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, completed)} aria-valuetext={`${completed} de ${goal} libros`}>
              <div className="l-fill" style={{ width: `${goalPercent}%` }} />
            </div>
            <p>{completed >= goal ? '¡Has alcanzado tu objetivo!' : readingCount > 0 ? `Tienes ${readingCount} ${readingCount === 1 ? 'lectura en marcha' : 'lecturas en marcha'}.` : 'Cada libro abre una nueva perspectiva.'}</p>
          </section>
        </div>

        <section id={id('shelf')} aria-labelledby={id('shelf-title')}>
          <div className="l-section-head">
            <h2 id={id('shelf-title')}>{query.trim() ? 'Resultados en tu biblioteca' : 'Añadidos recientemente'}</h2>
            <input className="l-search" type="search" placeholder="Buscar en tu biblioteca" aria-label="Buscar libros por título o autor" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="l-books">
            {recentBooks.map((book) => (
              <article className="l-book" key={book.id}>
                <Cover book={book} />
                <div className="l-book-body">
                  <h3><button className="l-title-button" type="button" disabled={!!pending} onClick={() => openBook(book)}>{book.title}</button></h3><p className="l-author">{book.author}</p>
                  <span className="l-state">{statusLabels[book.status]}{book.status === 'reading' ? ` · ${progressOf(book).percent} %` : ''}</span>
                  <button className="l-text-button" type="button" disabled={!!pending} onClick={() => book.status === 'finished' ? openReview(book) : book.status === 'reading' ? openProgress(book) : openBook(book)}>
                    {book.status === 'finished' ? 'Escribir reseña' : book.status === 'reading' ? 'Actualizar progreso' : 'Ver libro'} <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
          {recentBooks.length === 0 && <p className="l-empty" role="status">{library.length ? 'No hay coincidencias. Prueba otro título o autor.' : 'Todavía no hay libros en tu biblioteca.'}</p>}
        </section>

        <div className="l-bottom">
          <section id={id('discover')} aria-labelledby={id('discover-title')}>
            <h2 id={id('discover-title')}>Para tu próxima lectura</h2>
            <p className="l-subtitle">Un libro para seguir descubriendo.</p>
            {recommendationBook ? (
              <div className="l-recommendation">
                <Cover book={recommendationBook} />
                <div><h3>{recommendationBook.title}</h3><p>{recommendationBook.author}</p></div>
                <button className="l-button" type="button" disabled={!!pending || recommendationAlreadyReading} aria-pressed={!!savedRecommendation} onClick={toggleRecommendation}>
                  {pending === 'want' ? 'Guardando…' : recommendationAlreadyReading ? 'En tu biblioteca' : wanted ? '✓ En tu lista' : '+ Quiero leer'}
                </button>
              </div>
            ) : <p className="l-empty">Aquí aparecerá tu próxima recomendación.</p>}
          </section>
          <section className="l-community" id={id('community')} aria-labelledby={id('community-title')}>
            <div className="l-kicker">ENTRE LECTORES</div>
            <h2 id={id('community-title')}>Las ideas también se comparten.</h2>
            <p>¿Qué te está haciendo pensar tu última lectura?</p>
            <button className="l-text-button" type="button" disabled={!!pending || !featured} onClick={() => openReview()}>Escribir una reseña <span aria-hidden="true">→</span></button>
          </section>
        </div>
        <p className="l-feedback" role="status">{feedback}</p>
        {pending === 'want' && <p className="l-loading" role="status">Guardando tu lista…</p>}
        {error && !modal && <p className="l-error" role="alert">{error}</p>}
      </main>

      <dialog
        ref={dialogRef}
        aria-labelledby={id('dialog-title')}
        aria-busy={!!pending}
        onCancel={(event) => { if (pendingRef.current) event.preventDefault(); else dismissModal(); }}
        onClose={() => { if (!dialogRef.current?.open) setModal(null); }}
      >
        <h2 id={id('dialog-title')}>{modalTitle}</h2>
        {modal?.kind === 'progress' && selectedBook && (
          <form onSubmit={saveProgress}>
            <p>{selectedBook.title} · {selectedBook.totalPages} páginas</p>
            <label htmlFor={id('page-input')}>Última página leída</label>
            <input id={id('page-input')} type="number" min={0} max={selectedBook.totalPages} step={1} required value={pageInput} disabled={!!pending} onChange={(event) => setPageInput(event.target.value)} />
            <div className="l-dialog-actions">
              <button className="l-button" type="button" disabled={!!pending} onClick={dismissModal}>Cancelar</button>
              <button className="l-button l-button-primary" type="submit" disabled={!!pending}>{pending === 'progress' ? 'Guardando…' : 'Guardar progreso'}</button>
            </div>
          </form>
        )}
        {modal?.kind === 'goal' && (
          <form onSubmit={saveGoal}>
            <p>Puedes cambiar tu objetivo cuando quieras.</p>
            <label htmlFor={id('goal-input')}>Libros que quieres leer en {challengeYear}</label>
            <input id={id('goal-input')} type="number" min={1} max={1000} step={1} required value={goalInput} disabled={!!pending} onChange={(event) => setGoalInput(event.target.value)} />
            <div className="l-dialog-actions">
              <button className="l-button" type="button" disabled={!!pending} onClick={dismissModal}>Cancelar</button>
              <button className="l-button l-button-primary" type="submit" disabled={!!pending}>{pending === 'goal' ? 'Guardando…' : 'Guardar meta'}</button>
            </div>
          </form>
        )}
        {modal?.kind === 'detail' && selectedBook && (
          <>
            <p>{selectedBook.author} · {selectedBook.totalPages} páginas</p>
            <span className="l-state l-detail-state">{statusLabels[selectedBook.status]}</span>
            <p className="l-progress-meta">{progressOf(selectedBook).page} páginas leídas · {progressOf(selectedBook).percent} %</p>
            <div className="l-dialog-actions">
              <button className="l-button" type="button" onClick={dismissModal}>Cerrar</button>
              <button className="l-button l-button-primary" type="button" onClick={() => openReview(selectedBook)}>Escribir reseña</button>
            </div>
          </>
        )}
        {modal?.kind === 'review' && selectedBook && (
          <form onSubmit={saveReview}>
            <label htmlFor={id('note-book')}>Libro</label>
            <select id={id('note-book')} value={selectedBook.id} disabled={!!pending} onChange={(event) => { setError(''); setModal({ kind: 'review', bookId: event.target.value }); }}>
              {library.map((book) => <option value={book.id} key={book.id}>{book.title} — {book.author}</option>)}
            </select>
            <label htmlFor={id('note-text')}>¿Qué te ha parecido?</label>
            <textarea id={id('note-text')} required maxLength={10000} disabled={!!pending} placeholder="Una idea, un personaje, algo que te haya sorprendido…" value={drafts.get(selectedBook.id) ?? ''} onChange={(event) => { const text = event.target.value; setDrafts((current) => new Map(current).set(selectedBook.id, text)); }} />
            <div className="l-dialog-actions">
              <button className="l-button" type="button" disabled={!!pending} onClick={dismissModal}>Cancelar</button>
              <button className="l-button l-button-primary" type="submit" disabled={!!pending}>{pending === 'review' ? 'Guardando…' : 'Guardar borrador'}</button>
            </div>
          </form>
        )}
        {modal && modal.kind !== 'goal' && !selectedBook && <><p>Este libro ya no está en tu biblioteca.</p><button className="l-button" type="button" disabled={!!pending} onClick={dismissModal}>Cerrar</button></>}
        {pending && modal && <p className="l-loading" role="status">Guardando cambios…</p>}
        {error && modal && <p className="l-error" role="alert">{error}</p>}
      </dialog>
    </div>
  );
}

export default LumbresDashboard;
