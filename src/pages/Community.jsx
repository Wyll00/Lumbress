import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth } from '../config';
import { Heart, Trash2, ImagePlus, X, Send, Users, AlertTriangle, Newspaper, Tag, BookPlus, BadgeCheck } from 'lucide-react';
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
  general:       { label: '💬 General',       color: '#7b61ff' },
  reseña:        { label: '📖 Reseña',         color: '#e6b345' },
  recomendacion: { label: '⭐ Recomendación',  color: '#27ae60' },
  reflexion:     { label: '💭 Reflexión',      color: '#3498db' },
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
    if (!form.contenido.trim()) return;
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
      <header className="page-header community-header">
        <div>
          <h1><Users size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />Comunidad</h1>
          <p>Comparte reseñas, recomendaciones y reflexiones con otros lectores</p>
        </div>
        <button className="sell-book-btn" onClick={() => navigate('/vender')}>
          <BookPlus size={18} />
          Vende tu libro con nosotros
        </button>
      </header>

      <div className={`community-layout ${(activeFilter === 'noticias' || activeFilter === 'ofertas') ? 'no-composer' : ''}`}>
        {/* ── Composer (oculto en Noticias / Ofertas) ── */}
        {activeFilter !== 'noticias' && activeFilter !== 'ofertas' && (
        <aside className="composer-panel glass-panel">
          <h2>✍️ Nueva publicación</h2>
          <form onSubmit={handleSubmit} className="composer-form">
            {/* Tipo */}
            <div className="composer-field">
              <label>Tipo</label>
              <div className="tipo-grid">
                {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    className={`tipo-btn ${form.tipo === key ? 'active' : ''}`}
                    style={{ '--tipo-color': cfg.color }}
                    onClick={() => setForm(f => ({ ...f, tipo: key }))}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Título opcional */}
            <div className="composer-field">
              <label>Título <span className="optional">(opcional)</span></label>
              <input
                type="text"
                placeholder="Ej: Mi libro favorito del año..."
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Contenido */}
            <div className="composer-field">
              <label>Contenido</label>
              <textarea
                placeholder="Cuéntanos algo interesante..."
                value={form.contenido}
                onChange={handleContenidoChange}
                maxLength={5000}
                rows={5}
                required
              />
              <span className={`char-count ${charCount > 4500 ? 'warn' : ''}`}>
                {charCount}/5000
              </span>
            </div>

            {/* Imagen */}
            {imagePreview ? (
              <div className="image-preview-wrapper">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button type="button" className="remove-image-btn" onClick={removeImage}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="add-image-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={18} />
                Añadir imagen
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              style={{ display: 'none' }}
            />

            <button
              type="submit"
              className="btn-primary composer-submit"
              disabled={submitting || !form.contenido.trim()}
            >
              <Send size={16} />
              {submitting ? 'Publicando...' : 'Publicar'}
            </button>
          </form>
        </aside>
        )}

        {/* ── Feed ── */}
        <section className="posts-feed">
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
            <div className="feed-empty glass-panel">
              <p>🌟 ¡Sé la primera persona en publicar algo en esta categoría!</p>
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
    </div>
  );
};

export default Community;
