import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';
import AccountSection from './AccountSection';

const StaffDashboard = () => {
    const { user, token, logout } = useAuth();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [colleagues, setColleagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAccount, setShowAccount] = useState(false);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch colleagues
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/staff/auth/team`, { headers });
            if (res.ok) {
                const data = await res.json();
                setColleagues(data.staff || []);
            }

            // Fetch current attendance status
            const attendRes = await fetch(`${apiConfig.API_BASE_URL}/api/cashier/attendance`, { headers });
            if (attendRes.ok) {
                const attData = await attendRes.json();
                const today = new Date().toISOString().split('T')[0];
                const myAttendance = attData.attendance.find(a => a.staff_id === user.id && a.date.split('T')[0] === today && !a.check_out_time);
                setIsCheckedIn(!!myAttendance);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCheckInToggle = async () => {
        const endpoint = isCheckedIn ? 'checkout' : 'checkin';
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/cashier/attendance/${endpoint}`, {
                method: 'POST',
                headers
            });
            if (res.ok) {
                setIsCheckedIn(!isCheckedIn);
                Alert.alert('Success', `Shift ${isCheckedIn ? 'Ended' : 'Started'}`);
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Operation failed');
            }
        } catch (err) {
            Alert.alert('Error', 'Server connection failed');
        }
    };

    // Ensure permissions is an array
    const permissions = Array.isArray(user?.permissions) 
        ? user.permissions 
        : (typeof user?.permissions === 'string' ? JSON.parse(user.permissions || '[]') : []);

    const userRole = (user?.role || 'Staff').split('_').join(' ');

    const QuickActionCard = ({ title, desc, icon, color, buttonText, onPress }) => (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={[styles.cardIconBox, { backgroundColor: color + '20' }]}>
                <Text style={[styles.cardIcon, { color: color }]}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{desc}</Text>
            </View>
            <View style={[styles.cardChevron, { backgroundColor: color + '10' }]}>
                <Text style={{ color: color, fontSize: 18, fontWeight: 'bold' }}>→</Text>
            </View>
        </TouchableOpacity>
    );

    // Permission-based capabilities
    const CAPABILITIES = [
        {
            id: 'orders',
            perm: 'orders',
            title: 'Order Terminal',
            desc: 'View incoming orders and update preparation status.',
            icon: '📋',
            color: '#3B82F6'
        },
        {
            id: 'menu',
            perm: 'menu',
            title: 'Menu Engine',
            desc: 'Manage categories, items and availability.',
            icon: '🍽️',
            color: '#F59E0B'
        },
        {
            id: 'inventory',
            perm: 'inventory',
            title: 'Stock Control',
            desc: 'Monitor inventory levels and supplier stock.',
            icon: '📦',
            color: '#10B981'
        },
        {
            id: 'reports',
            perm: 'reports',
            title: 'Analytics',
            desc: 'View sales trends and performance reports.',
            icon: '📈',
            color: '#8B5CF6'
        },
        {
            id: 'attendance',
            perm: 'attendance',
            title: 'My Attendance',
            desc: 'Review your check-in history and shifts.',
            icon: '🕒',
            color: '#EC4899'
        }
    ];

    const activeCapabilities = CAPABILITIES.filter(cap => permissions.includes(cap.perm));

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>Synchronizing Workspace...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {showAccount ? (
                <View style={{ flex: 1 }}>
                    <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
                        onPress={() => setShowAccount(false)}
                    >
                        <Text style={{ fontSize: 20, marginRight: 10 }}>←</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Back to Dashboard</Text>
                    </TouchableOpacity>
                    <AccountSection />
                </View>
            ) : (
                <>
            {/* Header Section */}
            <View style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.welcomeText}>Hello, {user?.name || 'Staff'}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{userRole.toUpperCase()}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => Alert.alert('Logout', 'Terminate session?', [{ text: 'Cancel' }, { text: 'Logout', onPress: logout }])}
                        style={styles.logoutIcon}
                    >
                        <Text style={{ fontSize: 20 }}>🚪</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowAccount(true)}
                        style={[styles.profileBox, { marginLeft: 10, borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 }]}
                    >
                        {user?.profile_image ? (
                            <Image 
                                source={{ uri: user.profile_image.startsWith('http') ? user.profile_image : `${apiConfig.API_BASE_URL}${user.profile_image}` }} 
                                style={styles.profileImg}
                            />
                        ) : (
                            <Text style={{ fontSize: 20, color: 'white' }}>👤</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.checkInSection}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.statusLabel}>SHIFT STATUS</Text>
                        <Text style={[styles.statusValue, { color: isCheckedIn ? '#10B981' : '#EF4444' }]}>
                            {isCheckedIn ? 'ON DUTY' : 'OFF DUTY'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.checkInBtn, isCheckedIn ? styles.checkInBtnActive : styles.checkInBtnInactive]}
                        onPress={handleCheckInToggle}
                    >
                        <Text style={styles.checkInBtnText}>
                            {isCheckedIn ? 'CHECK OUT' : 'CHECK IN'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Role Capabilities Grid */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Workspace Capability</Text>
                <View style={styles.capabilityCount}>
                    <Text style={styles.countText}>{activeCapabilities.length} MODULES</Text>
                </View>
            </View>

            <View style={styles.grid}>
                {activeCapabilities.length > 0 ? (
                    activeCapabilities.map(cap => (
                        <QuickActionCard
                            key={cap.id}
                            title={cap.title}
                            desc={cap.desc}
                            icon={cap.icon}
                            color={cap.color}
                            onPress={() => Alert.alert(cap.title, 'Navigation to module coming soon')}
                        />
                    ))
                ) : (
                    <View style={styles.noPermCard}>
                        <Text style={{ fontSize: 40, marginBottom: 10 }}>🔒</Text>
                        <Text style={styles.noPermTitle}>No Assigned Modules</Text>
                        <Text style={styles.noPermDesc}>Your role has no specific module permissions assigned. Contact admin to classify your role.</Text>
                    </View>
                )}
            </View>

            {/* Team Section */}
            <View style={styles.teamContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Team ({colleagues.length})</Text>
                    <TouchableOpacity onPress={fetchData}>
                        <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: 'bold' }}>REFRESH</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.teamList}>
                    {colleagues.length === 0 ? (
                        <Text style={styles.emptyText}>No colleagues online</Text>
                    ) : (
                        colleagues.map((member) => (
                            <View key={member.id} style={styles.teamMember}>
                                <View style={[styles.memberAvatar, { backgroundColor: member.is_active ? '#D1FAE5' : '#F3F4F6' }]}>
                                    <Text style={styles.memberAvatarText}>{(member.name || member.full_name || '?')[0].toUpperCase()}</Text>
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>{member.name || member.full_name}</Text>
                                    <Text style={styles.memberRoleBadge}>{member.role.split('_').join(' ')}</Text>
                                </View>
                                <View style={[styles.statusDot, { backgroundColor: member.is_active ? '#10B981' : '#D1D5DB' }]} />
                            </View>
                        ))
                    )}
                </View>
            </View>
            </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
    },
    profileBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    headerCard: {
        backgroundColor: '#111827',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        elevation: 8,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: -0.5,
    },
    roleBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    roleText: {
        fontSize: 10,
        color: '#FFD700',
        fontWeight: '900',
        letterSpacing: 1,
    },
    logoutIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkInSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statusLabel: {
        fontSize: 9,
        color: '#9CA3AF',
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2,
    },
    statusValue: {
        fontSize: 16,
        fontWeight: '900',
    },
    checkInBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    checkInBtnInactive: {
        backgroundColor: 'white',
    },
    checkInBtnActive: {
        backgroundColor: '#EF4444',
    },
    checkInBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#111827',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    capabilityCount: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    countText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    grid: {
        marginBottom: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 2,
    },
    cardIconBox: {
        width: 54,
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardIcon: {
        fontSize: 24,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    cardDesc: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 16,
    },
    cardChevron: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    noPermCard: {
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    noPermTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    noPermDesc: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
    },
    teamContainer: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 2,
    },
    teamList: {
        marginTop: 8,
    },
    teamMember: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    memberAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111827',
    },
    memberRoleBadge: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 20,
    },
});

export default StaffDashboard;
