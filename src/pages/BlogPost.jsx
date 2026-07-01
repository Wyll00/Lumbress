import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Loader2, Newspaper } from 'lucide-react';
import { API_URL, withAuth, mediaUrl } from '../config';
import { AuthContext } from '../context/AuthContext';
import './Blog.css';

const BlogPost = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const isAdmin = !!user?.is_admin;

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setNotFound(false);
            try {
                const res = await fetch(`${API_URL}/api/blog/${id}`, withAuth());
                if (!res.ok) { setNotFound(true); return; }
                const { post: p } = await res.json();
                setPost(p);
            } catch { setNotFound(true); }
            finally { setLoading(false); }
        })();
    }, [id]);

    const fmtDate = (d) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--text-secondary)' }}>
                <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (notFound || !post) {
        return (
            <div className="glass-panel" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center', padding: 40 }}>
                <Newspaper size={32} style={{ color: 'var(--text-secondary)', marginBottom: 10 }} />
                <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>No encontramos este artículo.</p>
                <button className="btn-secondary" onClick={() => navigate('/blog')} style={{ marginTop: 16 }}>Volver al blog</button>
            </div>
        );
    }

    const paragraphs = (post.contenido || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

    return (
        <div className="blog-page animate-fade-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                <button className="btn-secondary" onClick={() => navigate('/blog')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
                    <ArrowLeft size={16} /> Blog
                </button>
                {isAdmin && (
                    <button className="btn-secondary" onClick={() => navigate(`/blog?editar=${post.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
                        <Pencil size={15} /> Editar
                    </button>
                )}
            </div>

            <article className="blog-article">
                {post.portada_url && <img className="blog-article-cover" src={mediaUrl(post.portada_url)} alt={post.titulo} />}
                {(post.categoria || post.estado === 'borrador') && (
                    <div className="blog-card-meta" style={{ marginBottom: 14 }}>
                        {post.categoria && <span className="blog-chip">{post.categoria}</span>}
                        {post.estado === 'borrador' && <span className="blog-draft">Borrador</span>}
                    </div>
                )}
                <h1 className="blog-article-title">{post.titulo}</h1>
                <div className="blog-article-meta">{fmtDate(post.created_at)}{post.autor ? ` · por ${post.autor}` : ''}</div>
                {post.resumen && <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px', fontStyle: 'italic' }}>{post.resumen}</p>}
                <div className="blog-content">
                    {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
            </article>
        </div>
    );
};

export default BlogPost;
