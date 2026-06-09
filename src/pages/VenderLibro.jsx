import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowLeft, BookPlus, Upload, Tag, Trash2, CheckCircle, Edit3, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth, mediaUrl, uploadFile } from '../config';
import AuthorAutocomplete from '../components/AuthorAutocomplete';
import AddressAutocomplete from '../components/AddressAutocomplete';
import './VenderLibro.css';

const ESTADOS = ['Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'];
const MONEDAS = ['€', '$', '£'];

const emptyForm = {
    titulo_libro: '', autor: '', precio: '', moneda: '€',
    estado_libro: 'Buen estado', genero: '', descripcion: '',
    imagen_url: '', contacto: '', telefono: '',
    direccion: '', codigo_postal: '', ciudad: '', provincia: '', pais: 'España',
};

const VenderLibro = () => {
    const { isAuthenticated } = useContext(AuthContext);
    const navigate = useNavigate();
    const rootRef = useRef(null);

    const [form, setForm] = useState(emptyForm);
    const [imgUploading, setImgUploading] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [misAnuncios, setMisAnuncios] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const fetchMisAnuncios = async () => {
        try {
            const res = await fetch(`${API_URL}/api/anuncios/mios`, withAuth());
            if (res.ok) setMisAnuncios(await res.json());
        } catch (err) {
            console.error('Error fetching mis anuncios', err);
        }
    };

    useEffect(() => {
        if (isAuthenticated) fetchMisAnuncios();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from('.vender-card', { y: 24, opacity: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out', clearProps: 'all' });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setError('La imagen supera los 10 MB.');
            e.target.value = '';
            return;
        }
        setError('');
        setImgUploading(0);
        try {
            const { url } = await uploadFile('covers', file, (p) => setImgUploading(p));
            setForm(prev => ({ ...prev, imagen_url: url }));
        } catch (err) {
            setError(`No se pudo subir la imagen: ${err.message}`);
        } finally {
            setImgUploading(null);
        }
    };

    const startEdit = (a) => {
        setEditingId(a.id);
        setForm({
            titulo_libro: a.titulo_libro || '',
            autor: a.autor || '',
            precio: a.precio ?? '',
            moneda: a.moneda || '€',
            estado_libro: a.estado_libro || 'Buen estado',
            genero: a.genero || '',
            descripcion: a.descripcion || '',
            imagen_url: a.imagen_url || '',
            contacto: a.contacto || '',
            telefono: a.telefono || '',
            direccion: a.direccion || '',
            codigo_postal: a.codigo_postal || '',
            ciudad: a.ciudad || '',
            provincia: a.provincia || '',
            pais: a.pais || 'España',
        });
        setError('');
        if (rootRef.current) rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.titulo_libro.trim()) {
            setError('El título del libro es obligatorio.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const url = editingId
                ? `${API_URL}/api/anuncios/${editingId}`
                : `${API_URL}/api/anuncios`;
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, withAuth({
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, precio: Number(form.precio) || 0 }),
            }));
            if (res.ok) {
                setForm(emptyForm);
                setEditingId(null);
                await fetchMisAnuncios();
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.message || 'No se pudo guardar el anuncio.');
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setSaving(false);
        }
    };

    const toggleVendido = async (anuncio) => {
        try {
            const res = await fetch(`${API_URL}/api/anuncios/${anuncio.id}`, withAuth({
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vendido: anuncio.vendido ? 0 : 1 }),
            }));
            if (res.ok) fetchMisAnuncios();
        } catch (err) {
            console.error('Error toggling vendido', err);
        }
    };

    const deleteAnuncio = async (id) => {
        if (!confirm('¿Eliminar este anuncio?')) return;
        try {
            const res = await fetch(`${API_URL}/api/anuncios/${id}`, withAuth({ method: 'DELETE' }));
            if (res.ok) fetchMisAnuncios();
        } catch (err) {
            console.error('Error deleting anuncio', err);
        }
    };

    return (
        <div className="vender-page" ref={rootRef}>
            <button className="vender-back" onClick={() => navigate('/community')}>
                <ArrowLeft size={18} /> Volver a Comunidad
            </button>

            <header className="vender-header">
                <BookPlus size={34} />
                <div>
                    <h1>Vende tu libro con nosotros</h1>
                    <p>Publica tu libro y llega a otros lectores de la comunidad.</p>
                </div>
            </header>

            <div className="vender-layout">
                {/* Formulario */}
                <form className="vender-card vender-form glass-panel" onSubmit={handleSubmit}>
                    <h2>{editingId ? '✏️ Editar anuncio' : '📚 Datos del libro'}</h2>

                    <div className="vender-field">
                        <label>Título del libro *</label>
                        <input type="text" name="titulo_libro" value={form.titulo_libro} onChange={handleChange} maxLength={255} required />
                    </div>

                    <div className="vender-row">
                        <div className="vender-field">
                            <label>Autor</label>
                            <AuthorAutocomplete
                                value={form.autor}
                                onChange={(val) => setForm(prev => ({ ...prev, autor: val }))}
                                id="venta-autor"
                                name="autor"
                                className=""
                                maxLength={255}
                            />
                        </div>
                        <div className="vender-field">
                            <label>Género</label>
                            <input type="text" name="genero" value={form.genero} onChange={handleChange} placeholder="Novela, Fantasía..." maxLength={100} />
                        </div>
                    </div>

                    <div className="vender-row">
                        <div className="vender-field vender-precio">
                            <label>Precio</label>
                            <div className="precio-group">
                                <input type="number" name="precio" value={form.precio} onChange={handleChange} min={0} step="0.01" placeholder="0.00" />
                                <select name="moneda" value={form.moneda} onChange={handleChange}>
                                    {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="vender-field">
                            <label>Estado del libro</label>
                            <select name="estado_libro" value={form.estado_libro} onChange={handleChange}>
                                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="vender-field">
                        <label>Foto del libro</label>
                        <div className="vender-image-upload">
                            <label className="vender-upload-btn">
                                <Upload size={16} /> Subir foto
                                <input type="file" accept="image/*" onChange={handleImage} hidden disabled={imgUploading !== null} />
                            </label>
                            {imgUploading !== null && (
                                <div className="vender-progress">
                                    <div className="vender-progress-bar"><div style={{ width: `${imgUploading}%` }} /></div>
                                    <span>{imgUploading}%</span>
                                </div>
                            )}
                            {form.imagen_url && imgUploading === null && (
                                <img src={mediaUrl(form.imagen_url)} alt="preview" className="vender-preview" />
                            )}
                        </div>
                    </div>

                    <div className="vender-field">
                        <label>Descripción</label>
                        <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} placeholder="Estado real, ediciones, detalles..." maxLength={2000} />
                    </div>

                    <div className="vender-row">
                        <div className="vender-field">
                            <label>📱 Móvil de contacto</label>
                            <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 600 123 456" maxLength={30} />
                        </div>
                        <div className="vender-field">
                            <label>Otro contacto</label>
                            <input type="text" name="contacto" value={form.contacto} onChange={handleChange} placeholder="Email, @usuario..." maxLength={200} />
                        </div>
                    </div>

                    <h2 className="vender-subhead">📍 Dirección</h2>

                    <div className="vender-field">
                        <label>Calle y número</label>
                        <AddressAutocomplete
                            value={form.direccion}
                            onChange={(val) => setForm(prev => ({ ...prev, direccion: val }))}
                            onSelect={(addr) => setForm(prev => ({
                                ...prev,
                                direccion: addr.direccion || prev.direccion,
                                codigo_postal: addr.codigo_postal || prev.codigo_postal,
                                ciudad: addr.ciudad || prev.ciudad,
                                provincia: addr.provincia || prev.provincia,
                                pais: addr.pais || prev.pais,
                            }))}
                            id="venta-direccion"
                            name="direccion"
                            className=""
                            maxLength={255}
                            placeholder="Ej: C/ Mayor, 12, 3º B"
                        />
                    </div>

                    <div className="vender-row">
                        <div className="vender-field" style={{ flex: '0 0 110px' }}>
                            <label>Código postal</label>
                            <input type="text" name="codigo_postal" value={form.codigo_postal} onChange={handleChange} placeholder="38001" maxLength={15} />
                        </div>
                        <div className="vender-field">
                            <label>Ciudad / Localidad</label>
                            <input type="text" name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Santa Cruz de Tenerife" maxLength={100} />
                        </div>
                    </div>

                    <div className="vender-row">
                        <div className="vender-field">
                            <label>Provincia</label>
                            <input type="text" name="provincia" value={form.provincia} onChange={handleChange} placeholder="Santa Cruz de Tenerife" maxLength={100} />
                        </div>
                        <div className="vender-field">
                            <label>País</label>
                            <input type="text" name="pais" value={form.pais} onChange={handleChange} placeholder="España" maxLength={100} />
                        </div>
                    </div>

                    {error && <div className="vender-error">⚠️ {error}</div>}

                    <div className="vender-submit-row">
                        {editingId && (
                            <button type="button" className="btn-secondary" onClick={cancelEdit}>
                                Cancelar
                            </button>
                        )}
                        <button type="submit" className="btn-primary vender-submit" disabled={saving || imgUploading !== null}>
                            {saving ? 'Guardando...'
                                : imgUploading !== null ? 'Subiendo foto...'
                                : editingId ? 'Guardar cambios' : 'Publicar anuncio'}
                        </button>
                    </div>
                </form>

                {/* Mis anuncios */}
                <div className="vender-card vender-mios glass-panel">
                    <h2><Tag size={18} /> Mis anuncios ({misAnuncios.length})</h2>
                    {misAnuncios.length === 0 ? (
                        <p className="vender-empty">Aún no has publicado ningún libro.</p>
                    ) : (
                        <div className="mios-list">
                            {misAnuncios.map(a => (
                                <div key={a.id} className={`mio-item ${a.vendido ? 'vendido' : ''}`}>
                                    <div className="mio-thumb">
                                        {a.imagen_url
                                            ? <img src={mediaUrl(a.imagen_url)} alt="" />
                                            : <BookPlus size={20} />
                                        }
                                    </div>
                                    <div className="mio-info">
                                        <span className="mio-title">{a.titulo_libro}</span>
                                        <span className="mio-price">{Number(a.precio).toFixed(2)} {a.moneda}</span>
                                        {a.vendido === 1 && <span className="mio-badge">✓ Vendido</span>}
                                    </div>
                                    <div className="mio-actions">
                                        <button onClick={() => startEdit(a)} title="Editar anuncio">
                                            <Edit3 size={15} />
                                        </button>
                                        <button onClick={() => toggleVendido(a)} title={a.vendido ? 'Marcar disponible' : 'Marcar vendido'}>
                                            <CheckCircle size={15} />
                                        </button>
                                        <button onClick={() => deleteAnuncio(a.id)} title="Eliminar" className="mio-del">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VenderLibro;
