import { lazy, Suspense, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Newspaper, Headphones, Feather } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import './Descubrir.css';

// Hub "Descubrir": reúne Novedades, Blog, Podcasts y Taller de novela en una sola
// página con pestañas, para descargar el menú lateral (4 entradas -> 1). Cada pestaña
// carga de forma diferida: solo se descarga el contenido de la que está activa.
const Novedades = lazy(() => import('./Novedades'));
const Blog = lazy(() => import('./Blog'));
const Podcasts = lazy(() => import('./Podcasts'));
const TallerNovela = lazy(() => import('./TallerNovela'));

const Descubrir = () => {
    const { t, language } = useContext(LanguageContext);
    const [params, setParams] = useSearchParams();

    const TABS = [
        { key: 'novedades', label: language === 'es' ? 'Novedades' : "What's new", Icon: Sparkles, Comp: Novedades },
        { key: 'blog', label: 'Blog', Icon: Newspaper, Comp: Blog },
        { key: 'podcasts', label: 'Podcasts', Icon: Headphones, Comp: Podcasts },
        { key: 'taller', label: t('workshop'), Icon: Feather, Comp: TallerNovela },
    ];

    // Pestaña activa: query param -> última recordada -> primera
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('descubrir-tab') : null;
    const active = TABS.find((x) => x.key === params.get('tab'))?.key
        || TABS.find((x) => x.key === stored)?.key
        || 'novedades';
    const ActiveComp = (TABS.find((x) => x.key === active) || TABS[0]).Comp;

    const selectTab = (key) => {
        localStorage.setItem('descubrir-tab', key);
        setParams({ tab: key }, { replace: true });
    };

    return (
        <div className="descubrir-page">
            <nav className="descubrir-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        className={`descubrir-tab ${active === tab.key ? 'active' : ''}`}
                        onClick={() => selectTab(tab.key)}
                    >
                        <tab.Icon size={16} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className="descubrir-content">
                <Suspense fallback={<div className="descubrir-loading"><div className="loading-spinner" /></div>}>
                    <ActiveComp />
                </Suspense>
            </div>
        </div>
    );
};

export default Descubrir;
