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
        loadUser();
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

    const login = async (username, password) => {
        try {
            // Try staff/admin login first (supports hardcoded Admin login)
            const response = await fetch(apiConfig.STAFF.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email: username, password }),
            });

            const data = await response.json();

            if (response.ok && data.token) {
                const userData = {
                    ...data.user,
                    name: data.user.name || data.user.full_name || username,
                    role: data.user.role || 'STAFF',
                };

                setUser(userData);
                setToken(data.token);

                await AsyncStorage.setItem("user", JSON.stringify(userData));
                await AsyncStorage.setItem("token", data.token);

                return { success: true, role: userData.role };
            }

            // If staff login fails, try unified auth (customer login)
            const unifiedResponse = await fetch(apiConfig.AUTH.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password }),
            });

            const unifiedData = await unifiedResponse.json();

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

            // Both failed
            return {
                success: false,
                message: data.message || unifiedData.message || 'Invalid credentials'
            };
        } catch (error) {
            console.error("Login error:", error);
            return {
                success: false,
                message: 'Network error. Make sure the backend server is running.'
            };
        }
    };

    const logout = async () => {
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
