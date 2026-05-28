import { createContext, useState, useEffect, useCallback } from 'react';
import { API_URL, withAuth } from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/users/me`, withAuth());
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                return data;
            }
            setUser(null);
            return null;
        } catch (err) {
            console.error('Error fetching user', err);
            setUser(null);
            return null;
        }
    }, []);

    useEffect(() => {
        refreshUser().finally(() => setLoading(false));
    }, [refreshUser]);

    const login = async (userData) => {
        if (userData) setUser(userData);
        // Always fetch full profile (incluye profile_image, reading_hours, phone)
        await refreshUser();
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/api/auth/logout`, withAuth({ method: 'POST' }));
        } catch (err) {
            console.error('Error logging out', err);
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            loading,
            login,
            logout,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
