import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import StewardDashboard from './steward/StewardDashboard';

const Dashboard = ({ onLogout }) => {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        onLogout();
    };

    const renderContent = () => {
        const role = (user?.role || '').toUpperCase();
        
        // Admin always has access
        if (role === 'ADMIN') {
            return <AdminDashboard />;
        }

        // Staff members must be active to access features
        const isActive = user?.is_active === 1 || user?.is_active === true || user?.status === 'active';

        if (!isActive && role !== 'CUSTOMER') {
            return (
                <View style={[styles.content, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                    <Text style={{ fontSize: 50, marginBottom: 20 }}>⏳</Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#111827' }}>Waiting for Admin Permission</Text>
                    <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 10 }}>Your account has been created successfully. Please wait for an administrator to activate your account.</Text>
                    <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { marginTop: 40, width: '100%' }]}>
                        <Text style={[styles.logoutText, { textAlign: 'center' }]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (role === 'CUSTOMER') {
            return (
                <View style={[styles.content, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                    <Text style={{ fontSize: 50, marginBottom: 20 }}>📱</Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#111827' }}>Customer Portal</Text>
                    <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 10 }}>Please use our mobile-optimized web application by scanning the QR code on your table to place orders.</Text>
                    <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { marginTop: 40, width: '100%' }]}>
                        <Text style={[styles.logoutText, { textAlign: 'center' }]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Steward-specific dashboard
        if (role === 'STEWARD') {
            return <StewardDashboard />;
        }

        // All other active staff roles
        return <StaffDashboard />;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {renderContent()}
            </View>
        </SafeAreaView>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        zIndex: 10,
    },
    welcomeText: {
        fontSize: 13,
        color: '#6B7280',
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    roleText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
        marginTop: 2,
    },
    logoutButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#111827',
    },
    logoutText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    }
});

export default Dashboard;
