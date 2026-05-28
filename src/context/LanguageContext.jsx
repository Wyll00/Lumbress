import React, { createContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('appLanguage');
        return saved || 'es'; // Default to Spanish
    });

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'es' ? 'en' : 'es');
    };

    const t = (key, params = {}) => {
        let text = translations[language][key];
        if (!text) return key;

        // Optional basic templating logic (e.g. for {count})
        Object.keys(params).forEach(p => {
            text = text.replace(`{${p}}`, params[p]);
        });

        return text;
    };

    // Helper dictionary directly available if needed,
    // but using `t(key)` is preferred.
    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
