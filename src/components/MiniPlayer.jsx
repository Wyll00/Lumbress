import { useContext, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Play, Pause, X, SkipBack, SkipForward, Volume2, Headphones, Minimize2 } from 'lucide-react';
import { PlayerContext } from '../context/PlayerContext';
import './MiniPlayer.css';

const formatTime = (s) => {
    if (!Number.isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
};

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

const MiniPlayer = () => {
    const ctx = useContext(PlayerContext);
    const playerRef = useRef(null);
    const bubbleRef = useRef(null);
    const [minimized, setMinimized] = useState(false);

    // Entrada del reproductor completo
    useEffect(() => {
        if (!ctx?.track || minimized || !playerRef.current) return;
        gsap.fromTo(playerRef.current,
            { y: 100, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
        );
    }, [ctx?.track?.id, minimized]);

    // Entrada de la bolita minimizada
    useEffect(() => {
        if (!ctx?.track || !minimized || !bubbleRef.current) return;
        gsap.fromTo(bubbleRef.current,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' }
        );
    }, [minimized, ctx?.track?.id]);

    if (!ctx || !ctx.track) return null;

    const { track, playing, currentTime, duration, volume, rate, togglePlay, seek, skip, changeVolume, changeRate, stop } = ctx;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const cycleRate = () => {
        const idx = RATES.indexOf(rate);
        const next = RATES[(idx + 1) % RATES.length];
        changeRate(next);
    };

    // Cierra con efecto: cae, rota, se encoge y se difumina antes de desaparecer
    const handleClose = () => {
        const el = minimized ? bubbleRef.current : playerRef.current;
        if (!el) { stop(); return; }
        gsap.to(el, {
            y: 180,
            opacity: 0,
            scale: 0.6,
            rotation: 8,
            filter: 'blur(10px)',
            duration: 0.55,
            ease: 'power2.in',
            onComplete: stop,
        });
    };

    // ─── Vista minimizada: bolita en la esquina ──────────────────────
    if (minimized) {
        return (
            <button
                className="mp-bubble"
                ref={bubbleRef}
                onClick={() => setMinimized(false)}
                title="Abrir reproductor"
            >
                <span className="mp-bubble-ring" style={{ '--p': `${progress}%` }} />
                <span className="mp-bubble-art">
                    {track.cover
                        ? <img src={track.cover} alt="" />
                        : <Headphones size={18} />
                    }
                </span>
                <span className="mp-bubble-icon">
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                </span>
                <span
                    className="mp-bubble-close"
                    role="button"
                    title="Cerrar reproductor"
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                >
                    <X size={11} />
                </span>
            </button>
        );
    }

    // ─── Vista completa ──────────────────────────────────────────────
    return (
        <div className="mini-player" ref={playerRef}>
            <div className="mp-corner-btns">
                <button className="mp-icon-btn mp-close" onClick={handleClose} title="Cerrar reproductor" aria-label="Cerrar">
                    <X size={16} />
                </button>
                <button className="mp-icon-btn" onClick={() => setMinimized(true)} title="Minimizar reproductor" aria-label="Minimizar">
                    <Minimize2 size={15} />
                </button>
            </div>
            <div className="mp-track">
                <div className="mp-cover">
                    {track.cover
                        ? <img src={track.cover} alt={track.title} />
                        : <Headphones size={20} />
                    }
                </div>
                <div className="mp-info">
                    <span className="mp-title" title={track.title}>{track.title}</span>
                    {track.author && <span className="mp-author">{track.author}</span>}
                </div>
            </div>

            <div className="mp-controls">
                <div className="mp-buttons">
                    <button className="mp-btn" onClick={() => skip(-15)} title="Atrás 15s">
                        <SkipBack size={18} />
                        <span className="mp-skip-label">15</span>
                    </button>
                    <button className="mp-btn mp-play" onClick={togglePlay} title={playing ? 'Pausar' : 'Reproducir'}>
                        {playing ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button className="mp-btn" onClick={() => skip(30)} title="Adelante 30s">
                        <SkipForward size={18} />
                        <span className="mp-skip-label">30</span>
                    </button>
                </div>

                <div className="mp-progress">
                    <span className="mp-time">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={currentTime}
                        onChange={(e) => seek(Number(e.target.value))}
                        className="mp-seek"
                        style={{ '--progress': `${progress}%` }}
                    />
                    <span className="mp-time">{formatTime(duration)}</span>
                </div>
            </div>

            <div className="mp-extras">
                <div className="mp-extra-item">
                    <span className="mp-extra-label">Velocidad</span>
                    <button className="mp-rate" onClick={cycleRate} title="Cambiar velocidad">
                        {rate}×
                    </button>
                </div>
                <div className="mp-extra-item mp-volume">
                    <span className="mp-extra-label">Volumen · {Math.round(volume * 100)}%</span>
                    <div className="mp-vol-control">
                        <Volume2 size={15} />
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={volume}
                            onChange={(e) => changeVolume(Number(e.target.value))}
                            className="mp-vol-slider"
                            style={{ '--progress': `${volume * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MiniPlayer;
