import { useState } from 'react';
import { X, Calendar, Clock, Tag } from 'lucide-react';
import './EventModal.css';

const EventModal = ({ isOpen, onClose, onSave, defaultDate = '' }) => {
    const [formData, setFormData] = useState({
        titulo: '',
        fecha: defaultDate,
        hora: '10:00'
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.titulo.trim() || !formData.fecha || !formData.hora) return;
        onSave(formData);
        setFormData({ titulo: '', fecha: defaultDate, hora: '10:00' });
    };

    return (
        <div className="event-modal-overlay animate-fade-in" onClick={onClose}>
            <div className="event-modal-panel glass-panel" onClick={e => e.stopPropagation()}>
                <button className="event-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="event-modal-icon-title">
                    <div className="event-modal-icon">
                        <Calendar size={22} />
                    </div>
                    <h2>Nuevo Evento</h2>
                </div>

                <form onSubmit={handleSubmit} className="event-form">
                    <div className="event-form-group">
                        <label>
                            <Tag size={14} />
                            Nombre del evento
                        </label>
                        <input
                            required
                            autoFocus
                            type="text"
                            name="titulo"
                            className="input"
                            value={formData.titulo}
                            onChange={handleChange}
                            placeholder="Ej: Reunión del club de lectura..."
                        />
                    </div>

                    <div className="event-form-row">
                        <div className="event-form-group">
                            <label>
                                <Calendar size={14} />
                                Fecha
                            </label>
                            <input
                                required
                                type="date"
                                name="fecha"
                                className="input"
                                value={formData.fecha}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="event-form-group">
                            <label>
                                <Clock size={14} />
                                Hora
                            </label>
                            <input
                                required
                                type="time"
                                name="hora"
                                className="input"
                                value={formData.hora}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="event-form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary">
                            Guardar Evento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventModal;
