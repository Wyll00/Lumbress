import { createContext, useState, useRef, useEffect, useCallback } from 'react';
import { API_URL, withAuth } from '../config';

export const PlayerContext = createContext(null);

export const PlayerProvider = ({ children }) => {
    const audioRef = useRef(null);
    const [track, setTrack] = useState(null);   // { id, title, author, cover, audio_url }
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [rate, setRate] = useState(1);
    const [endedTrack, setEndedTrack] = useState(null);  // track que acaba de terminar

    // Ref al track actual — para leerlo desde los listeners de audio sin cierres obsoletos
    const trackRef = useRef(null);
    useEffect(() => { trackRef.current = track; }, [track]);

    // Buffer local de segundos escuchados que aún no se han enviado al backend
    const pendingSecondsRef = useRef(0);
    // Última vez que sumamos tiempo (para calcular delta real entre ticks)
    const lastTickRef = useRef(null);
    // Listeners para notificar a la UI cuando se actualice el contador del backend
    const totalSecondsListenersRef = useRef(new Set());

    const flushListened = useCallback(async () => {
        const seconds = Math.floor(pendingSecondsRef.current);
        if (seconds < 1) return;
        pendingSecondsRef.current -= seconds;
        try {
            const res = await fetch(`${API_URL}/api/users/me/podcast-time`, withAuth({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secondsToAdd: seconds }),
            }));
            if (res.ok) {
                const data = await res.json();
                totalSecondsListenersRef.current.forEach(fn => fn(data.podcast_seconds));
            }
        } catch (err) {
            console.error('Error flushing podcast time', err);
            // Si falla, devolvemos los segundos al buffer para reintentar
            pendingSecondsRef.current += seconds;
        }
    }, []);

    const onTotalSecondsUpdate = useCallback((fn) => {
        totalSecondsListenersRef.current.add(fn);
        return () => totalSecondsListenersRef.current.delete(fn);
    }, []);

    if (!audioRef.current && typeof Audio !== 'undefined') {
        audioRef.current = new Audio();
        audioRef.current.preload = 'metadata';
    }

    // Tick que acumula tiempo escuchado mientras el audio reproduce
    useEffect(() => {
        if (!playing) {
            lastTickRef.current = null;
            return;
        }
        lastTickRef.current = Date.now();
        const interval = setInterval(() => {
            const now = Date.now();
            const delta = (now - (lastTickRef.current ?? now)) / 1000;
            lastTickRef.current = now;
            // Multiplicamos por playbackRate para que 2x cuente como tiempo real escuchado al double speed
            pendingSecondsRef.current += delta;
        }, 1000);
        return () => clearInterval(interval);
    }, [playing]);

    // Flush periódico al backend cada 30s mientras suena
    useEffect(() => {
        if (!playing) return;
        const flushInterval = setInterval(flushListened, 30000);
        return () => clearInterval(flushInterval);
    }, [playing, flushListened]);

    // Flush al pausar/cerrar
    useEffect(() => {
        if (!playing) {
            flushListened();
        }
    }, [playing, flushListened]);

    // Flush antes de cerrar la pestaña/recargar
    useEffect(() => {
        const handler = () => { flushListened(); };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [flushListened]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTime = () => setCurrentTime(audio.currentTime);
        const onMeta = () => setDuration(audio.duration || 0);
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onEnded = () => {
            setPlaying(false);
            // Notifica qué track terminó (para marcarlo como escuchado / pedir valoración)
            if (trackRef.current) setEndedTrack(trackRef.current);
        };
        const onError = () => {
            console.error('Audio error', audio.error);
            setPlaying(false);
        };

        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onMeta);
        audio.addEventListener('durationchange', onMeta);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onMeta);
            audio.removeEventListener('durationchange', onMeta);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
        };
    }, []);

    const play = useCallback((newTrack) => {
        const audio = audioRef.current;
        if (!audio || !newTrack?.audio_url) return;

        if (track?.id !== newTrack.id || audio.src !== newTrack.audio_url) {
            audio.src = newTrack.audio_url;
            audio.currentTime = 0;
            setTrack(newTrack);
            setCurrentTime(0);
            setDuration(0);
        }
        audio.playbackRate = rate;
        audio.volume = volume;
        audio.play().catch(err => {
            console.error('Play failed', err);
            setPlaying(false);
        });
    }, [track, rate, volume]);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !track) return;
        if (audio.paused) {
            audio.play().catch(err => console.error('Play failed', err));
        } else {
            audio.pause();
        }
    }, [track]);

    const seek = useCallback((seconds) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(audio.duration || 0, seconds));
    }, []);

    const skip = useCallback((delta) => {
        const audio = audioRef.current;
        if (!audio) return;
        seek(audio.currentTime + delta);
    }, [seek]);

    const changeVolume = useCallback((v) => {
        const audio = audioRef.current;
        if (!audio) return;
        const clamped = Math.max(0, Math.min(1, v));
        audio.volume = clamped;
        setVolume(clamped);
    }, []);

    const changeRate = useCallback((r) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.playbackRate = r;
        setRate(r);
    }, []);

    const stop = useCallback(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        }
        setTrack(null);
        setPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }, []);

    const clearEndedTrack = useCallback(() => setEndedTrack(null), []);

    return (
        <PlayerContext.Provider value={{
            track, playing, currentTime, duration, volume, rate,
            play, togglePlay, seek, skip, changeVolume, changeRate, stop,
            onTotalSecondsUpdate,
            endedTrack, clearEndedTrack,
        }}>
            {children}
        </PlayerContext.Provider>
    );
};
