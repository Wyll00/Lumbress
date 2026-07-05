import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth } from '../config';
import { Heart, Trash2, ImagePlus, X, Send, Users, AlertTriangle, Newspaper, Tag, BadgeCheck, Pencil, Plus, Sparkles } from 'lucide-react';
import NewsFeed from '../components/NewsFeed';
import OffersFeed from '../components/OffersFeed';
import './Community.css';

// ── Modal de confirmación personalizado ──────────────────────────
function ConfirmModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">
          <AlertTriangle size={32} color="#e74c3c" />
        </div>
        <h3>¿Eliminar publicación?</h3>
        <p>Esta acción no se puede deshacer. El post desaparecerá para todos los usuarios.</p>
        <div className="confirm-actions">
          <button className="btn-secondary confirm-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="confirm-delete-btn" onClick={onConfirm}>
            <Trash2 size={15} /> Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

const API = `${API_URL}/api/posts`;

const TIPO_CONFIG = {
  general:       { label: '💬 General',       name: 'General',        color: '#8b7bff' },
  reseña:        { label: '📖 Reseña',         name: 'Reseña',         color: '#e7c65a' },
  recomendacion: { label: '⭐ Recomendación',  name: 'Recomendación',  color: '#7fc99a' },
  reflexion:     { label: '💭 Reflexión',      name: 'Reflexión',      color: '#c9a0ff' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

function Avatar({ username, profile_image, size = 44 }) {
  const initials = username ? username.substring(0, 2).toUpperCase() : '?';
  return (
    <div className="post-avatar" style={{ width: size, height: size, minWidth: size }}>
      {profile_image
        ? <img src={profile_image} alt={username} />
        : <span>{initials}</span>
      }
    </div>
  );
}

function PostCard({ post, currentUserId, onDelete, onLike }) {
  const [liking, setLiking] = useState(false);
  const tipo = TIPO_CONFIG[post.tipo] || TIPO_CONFIG.general;

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    await onLike(post.id);
    setLiking(false);
  };

  return (
    <article className="post-card glass-panel animate-slide-in">
      <div className="post-card-header">
        <Avatar username={post.autor_username} profile_image={post.autor_avatar} />
        <div className="post-meta">
          <span className="post-author" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            @{post.autor_username}
            {post.autor_verificado ? <BadgeCheck size={14} color="#1DA1F2" /> : null}
          </span>
          <span className="post-time">{timeAgo(post.created_at)}</span>
        </div>
        <span className="post-tipo-badge" style={{ '--tipo-color': tipo.color }}>
          {tipo.label}
        </span>
        {post.autor_id === currentUserId && (
          <button
            className="post-delete-btn"
            onClick={() => onDelete(post.id)}
            title="Eliminar post"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {post.titulo && <h3 className="post-title">{post.titulo}</h3>}

      <p className="post-content">{post.contenido}</p>

      {post.imagen && (
        <div className="post-image-wrapper">
          <img src={post.imagen} alt="Imagen del post" className="post-image" />
        </div>
      )}

      <div className="post-card-footer">
        <button
          className={`like-btn ${post.liked_by_me ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={liking}
        >
          <Heart size={16} fill={post.liked_by_me ? 'currentColor' : 'none'} />
          <span>{post.likes_count}</span>
        </button>
      </div>
    </article>
  );
}

const Community = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todo');
  const [editorOpen, setEditorOpen] = useState(false); // hoja inferior del editor

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    tipo: 'general',
    titulo: '',
    contenido: '',
    imagen: null,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const fileInputRef = useRef(null);

  const fetchPosts = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}?limit=50`, withAuth());
      if (res.ok) setPosts(await res.json());
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(f => ({ ...f, imagen: reader.result }));
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setForm(f => ({ ...f, imagen: null }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Sin contenido no se publica; si además está vacío, solo cerramos la hoja.
    if (!form.contenido.trim()) { setEditorOpen(false); return; }
    setSubmitting(true);
    try {
      const res = await fetch(API, withAuth({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }));
      if (res.ok) {
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
        setForm({ tipo: 'general', titulo: '', contenido: '', imagen: null });
        setImagePreview(null);
        setCharCount(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setEditorOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Abre el modal de confirmación
  const handleDelete = (id) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  // Confirma y ejecuta el borrado
  const confirmDelete = async () => {
    setConfirmOpen(false);
    if (!pendingDeleteId) return;
    try {
      const res = await fetch(`${API}/${pendingDeleteId}`, withAuth({ method: 'DELETE' }));
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== pendingDeleteId));
      }
    } catch (e) {
      console.error('Error deleting post:', e);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
  };

  const handleLike = async (id) => {
    const res = await fetch(`${API}/${id}/like`, withAuth({ method: 'POST' }));
    if (res.ok) {
      const { liked, likes_count } = await res.json();
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, liked_by_me: liked ? 1 : 0, likes_count } : p
      ));
    }
  };

  const handleContenidoChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, contenido: val }));
    setCharCount(val.length);
  };

  const filteredPosts = activeFilter === 'todo' ? posts : posts.filter(p => p.tipo === activeFilter);

  return (
    <div className="community-page animate-fade-in">
      <ConfirmModal
        isOpen={confirmOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <div className="cm-container">
        {/* Título */}
        <header className="cm-header">
          <Users size={22} color="#8b7bff" />
          <h1>Comunidad</h1>
        </header>

        {/* CTA: vender libro */}
        <button className="cm-sell-cta" onClick={() => navigate('/vender')}>
          <span className="cm-sell-chip"><Plus size={13} /></span>
          Vende tu libro con nosotros
        </button>

        {/* Composer compacto (abre la hoja del editor). Oculto en Noticias/Ofertas */}
        {activeFilter !== 'noticias' && activeFilter !== 'ofertas' && (
          <button className="cm-composer" onClick={() => setEditorOpen(true)}>
            <span className="cm-composer-avatar">
              {user?.profile_image
                ? <img src={user.profile_image} alt="" />
                : (user?.username ? user.username.substring(0, 2).toUpperCase() : '?')}
            </span>
            <span className="cm-composer-placeholder">Comparte algo con la comunidad…</span>
            <span className="cm-composer-pencil"><Pencil size={15} /></span>
          </button>
        )}

        {/* Filtros del feed */}
        <div className="feed-filters">
          <button className={`filter-pill ${activeFilter === 'todo' ? 'active' : ''}`} onClick={() => setActiveFilter('todo')}>Todo</button>
          <button className={`filter-pill ${activeFilter === 'reseña' ? 'active' : ''}`} onClick={() => setActiveFilter('reseña')}>Reseñas</button>
          <button className={`filter-pill ${activeFilter === 'recomendacion' ? 'active' : ''}`} onClick={() => setActiveFilter('recomendacion')}>Recomendaciones</button>
          <button className={`filter-pill ${activeFilter === 'reflexion' ? 'active' : ''}`} onClick={() => setActiveFilter('reflexion')}>Reflexión</button>
          <button
            className={`filter-pill ${activeFilter === 'noticias' ? 'active' : ''}`}
            onClick={() => setActiveFilter('noticias')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Newspaper size={14} /> Noticias
          </button>
          <button
            className={`filter-pill ${activeFilter === 'ofertas' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ofertas')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Tag size={14} /> Ofertas
          </button>
        </div>

        {/* Feed */}
        <section className="posts-feed">
          {activeFilter === 'noticias' ? (
            <NewsFeed />
          ) : activeFilter === 'ofertas' ? (
            <OffersFeed />
          ) : loading ? (
            <div className="feed-loading">
              <div className="loading-spinner" />
              <p>Cargando publicaciones...</p>
            </div>
          ) : error ? (
            <p className="feed-error">{error}</p>
          ) : filteredPosts.length === 0 ? (
            <div className="cm-empty">
              <span className="cm-empty-icon"><Sparkles size={22} /></span>
              <p className="cm-empty-title">Aún no hay publicaciones</p>
              <p className="cm-empty-sub">Toca «Comparte algo…» para empezar</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onDelete={handleDelete}
                onLike={handleLike}
              />
            ))
          )}
        </section>
      </div>

      {/* ── Editor: hoja inferior (bottom sheet). Portal al body: la animación de la
             página crea un transform que rompería el position:fixed del backdrop. ── */}
      {editorOpen && createPortal(
        <div className="cm-sheet-backdrop" onClick={() => setEditorOpen(false)}>
          <div className="cm-sheet" onClick={e => e.stopPropagation()}>
            <div className="cm-grabber" />
            <div className="cm-sheet-header">
              <h2>Nueva publicación</h2>
              <button className="cm-sheet-close" onClick={() => setEditorOpen(false)} title="Cerrar">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="cm-sheet-form">
              <label className="cm-label">Título (opcional)</label>
              <input
                className="cm-input"
                type="text"
                placeholder="Ej: Mi libro favorito del año…"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                maxLength={120}
              />

              <label className="cm-label">Contenido</label>
              <textarea
                className="cm-textarea"
                placeholder="Cuéntanos algo interesante…"
                value={form.contenido}
                onChange={handleContenidoChange}
                maxLength={5000}
                rows={4}
              />
              <span className={`cm-counter ${charCount > 4500 ? 'warn' : ''}`}>{charCount}/5000</span>

              {/* Imagen (opcional) */}
              {imagePreview ? (
                <div className="cm-image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button type="button" className="cm-image-remove" onClick={removeImage}><X size={14} /></button>
                </div>
              ) : (
                <button type="button" className="cm-image-add" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus size={15} /> Añadir imagen
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: 'none' }} />

              <div className="cm-sep" />

              <p className="cm-type-q">¿Qué tipo de publicación es?</p>
              <div className="cm-type-chips">
                {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    className={`cm-type-chip ${form.tipo === key ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, tipo: key }))}
                  >
                    {cfg.name}
                  </button>
                ))}
              </div>

              <button type="submit" className="cm-publish" disabled={submitting || !form.contenido.trim()}>
                <Send size={15} />
                {submitting ? 'Publicando…' : 'Publicar'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Community;
