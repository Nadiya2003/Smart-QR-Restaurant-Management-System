import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // loadUser(); // Disabled auto-login as per user request
        setLoading(false);
    }, []);


    const loadUser = async () => {
        try {
            const storedUser = await AsyncStorage.getItem("user");
            const storedToken = await AsyncStorage.getItem("token");
            if (storedUser && storedToken) {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            }
        } catch (e) {
            console.error("Failed to load user", e);
        } finally {
            setLoading(false);
        }
    };

    // Helper: fetch with a timeout to avoid hanging on unreachable servers
    const fetchWithTimeout = (url, options, timeoutMs = 10000) => {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
            fetch(url, options)
                .then(res => { clearTimeout(timer); resolve(res); })
                .catch(err => { clearTimeout(timer); reject(err); });
        });
    };

    const login = async (username, password) => {
        let staffData = null;
        let staffResponse = null;
        let unifiedData = null;
        let unifiedResponse = null;

        // --- Try staff/admin login first ---
        try {
            staffResponse = await fetchWithTimeout(apiConfig.STAFF.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email: username,
                    password,
                    deviceType: 'mobile'
                }),
            });
            staffData = await staffResponse.json();

            if (staffResponse.ok && staffData.token) {
                const userData = {
                    ...staffData.user,
                    name: staffData.user.name || staffData.user.full_name || username,
                    role: staffData.user.role || 'STAFF',
                };
                setUser(userData);
                setToken(staffData.token);
                await AsyncStorage.setItem("user", JSON.stringify(userData));
                await AsyncStorage.setItem("token", staffData.token);
                return { success: true, role: userData.role };
            }
        } catch (staffErr) {
            console.warn("Staff login attempt failed (network):", staffErr.message);
        }

        // --- Fallback: try unified auth (customer / any role) ---
        try {
            unifiedResponse = await fetchWithTimeout(apiConfig.AUTH.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password }),
            });
            unifiedData = await unifiedResponse.json();

            if (unifiedResponse.ok && unifiedData.token) {
                const userData = {
                    ...unifiedData.user,
                    name: unifiedData.user.name || unifiedData.user.full_name || username,
                    role: unifiedData.user.role || 'CUSTOMER',
                };
                setUser(userData);
                setToken(unifiedData.token);
                await AsyncStorage.setItem("user", JSON.stringify(userData));
                await AsyncStorage.setItem("token", unifiedData.token);
                return { success: true, role: userData.role };
            }
        } catch (unifiedErr) {
            console.warn("Unified login attempt failed (network):", unifiedErr.message);
            return {
                success: false,
                message: 'Network error. Make sure the backend server is running and your IP is correct.'
            };
        }

        // Both endpoints responded but neither accepted credentials
        const errorMsg =
            (unifiedData?.message) ||
            (staffData?.message) ||
            'Invalid credentials. Please check your username/email and password.';
        return { success: false, message: errorMsg };
    };

    const logout = async () => {
        // If it's a staff member, notify backend to record logout time for attendance
        if (token && user && user.role !== 'CUSTOMER') {
            try {
                await fetch(apiConfig.STAFF.LOGOUT, { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) {
                console.warn("Backend logout failed:", e.message);
            }
        }


        setUser(null);
        setToken(null);
        try {
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("token");
        } catch (e) {
            console.error("Failed to remove user", e);
        }
    };


    const forgotPassword = async (email) => {
        try {
            const response = await fetch(apiConfig.AUTH.FORGOT_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            return { success: false, message: 'Network error' };
        }
    };

    const verifyOTP = async (email, otp) => {
        try {
            const response = await fetch(apiConfig.AUTH.VERIFY_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            return { success: false, message: 'Network error' };
        }
    };

    const resetPassword = async (email, otp, newPassword) => {
        try {
            const response = await fetch(apiConfig.AUTH.RESET_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });
            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            return { success: false, message: 'Network error' };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            logout,
            forgotPassword,
            verifyOTP,
            resetPassword,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};
