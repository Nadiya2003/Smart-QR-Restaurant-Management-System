import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // sessionStorage clears automatically when the browser/tab is closed
        // This provides automatic logout on browser close (guest mode by default)
        const savedUser = sessionStorage.getItem('user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Corrupted user data in sessionStorage", e);
                sessionStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        // Use sessionStorage so data clears on browser/tab close (auto logout)
        sessionStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('token', userData.token);
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        // Do NOT clear all sessionStorage as it may wipe pending reservations, cart, etc.
        window.location.href = '/'; // Redirect to home (guest mode) after logout
    };

    const refreshUser = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${config.API_BASE_URL}/api/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Merge token back since backend profile might not return it
                const updatedUser = { ...data, token };
                setUser(updatedUser);
                sessionStorage.setItem('user', JSON.stringify(updatedUser));
            } else if (res.status === 401) {
                // Token expired during refresh
                logout();
            }
        } catch (err) {
            console.error('Refresh profile error:', err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated: !!user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
