import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';

const Dashboard = ({ onLogout }) => {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        onLogout();
    };

    const renderContent = () => {
        const role = (user?.role || '').toUpperCase();
        if (role === 'ADMIN') {
            return <AdminDashboard />;
        }
        // All other roles (STAFF, MANAGER, CASHIER, STEWARD, etc.)
        return <StaffDashboard />;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome,</Text>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.roleText}>{(user?.role || 'User').toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

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
        paddingTop: Platform.OS === 'android' ? 30 : 0,
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
