import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';

const StaffDashboard = () => {
    const { user, token } = useAuth();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [colleagues, setColleagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch colleagues
            const res = await fetch(`${apiConfig.API_URL}/staff/auth/team`, { headers });
            if (res.ok) {
                const data = await res.json();
                setColleagues(data.staff || []);
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

    const handleCheckIn = () => {
        setIsCheckedIn(!isCheckedIn);
    };

    const permissions = user?.permissions || [];
    const userRole = user?.role || 'Staff';

    const StatusCard = ({ title, desc, icon, color, buttonText }) => (
        <TouchableOpacity style={styles.card}>
            <View style={[styles.cardIconBox, { backgroundColor: color }]}>
                <Text style={styles.cardIcon}>{icon}</Text>
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDesc}>{desc}</Text>
            <View style={[styles.cardButton, { backgroundColor: color }]}>
                <Text style={styles.cardButtonText}>{buttonText}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header Section */}
            <View style={styles.headerCard}>
                <View>
                    <Text style={styles.welcomeText}>Hello, {user?.name || 'Staff'}! 👋</Text>
                    <Text style={styles.roleText}>{userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()}</Text>
                    <Text style={styles.goalText}>
                        Today's goal: Ensure customer satisfaction with every interaction.
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.checkInButton, isCheckedIn ? styles.checkedIn : styles.checkedOut]}
                    onPress={handleCheckIn}
                >
                    <Text style={[styles.checkInText, isCheckedIn ? styles.checkedInText : styles.checkedOutText]}>
                        {isCheckedIn ? '⏹ Check Out' : '▶ Check In'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Permissions Section */}
            {permissions.length > 0 && (
                <View style={styles.permissionCard}>
                    <Text style={styles.sectionTitle}>Your Permissions</Text>
                    <View style={styles.permissionGrid}>
                        {permissions.map((perm, index) => (
                            <View key={index} style={styles.permissionBadge}>
                                <Text style={styles.permissionText}>{perm}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Quick Access Cards */}
            <Text style={[styles.sectionTitle, { marginBottom: 12, marginTop: 8 }]}>Quick Access</Text>
            <View style={styles.grid}>
                <StatusCard
                    title="Assigned Orders"
                    desc="Check your assigned orders and updates."
                    icon="📋"
                    color="#EFF6FF"
                    buttonText="View Details"
                />
                <StatusCard
                    title="Shift Schedule"
                    desc="View your upcoming shift schedule."
                    icon="⏰"
                    color="#F0FDF4"
                    buttonText="View Roster"
                />
                <StatusCard
                    title="Messages"
                    desc="Check messages from management."
                    icon="💬"
                    color="#FFF7ED"
                    buttonText="Inbox"
                />
            </View>

            {/* Team Section */}
            <View style={styles.teamSection}>
                <Text style={styles.sectionTitle}>Team Members ({colleagues.length})</Text>
                {colleagues.length === 0 ? (
                    <Text style={styles.emptyText}>No team members found</Text>
                ) : (
                    colleagues.slice(0, 5).map((member) => (
                        <View key={member.id} style={styles.teamMember}>
                            <View style={[styles.memberAvatar, { backgroundColor: member.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                                <Text style={styles.memberAvatarText}>{(member.full_name || '?')[0].toUpperCase()}</Text>
                            </View>
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>{member.full_name}</Text>
                                <Text style={styles.memberRole}>{member.role} {member.sub_role ? `• ${member.sub_role}` : ''}</Text>
                            </View>
                            <View style={[styles.statusDot, { backgroundColor: member.is_active ? '#10B981' : '#EF4444' }]} />
                        </View>
                    ))
                )}
            </View>
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
    },
    headerCard: {
        backgroundColor: '#111827',
        borderRadius: 20,
        padding: 22,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 5,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    roleText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 8,
    },
    goalText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        marginBottom: 18,
        lineHeight: 20,
    },
    checkInButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    checkedOut: {
        backgroundColor: '#fff',
    },
    checkedIn: {
        backgroundColor: '#EF4444',
    },
    checkInText: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 13,
    },
    checkedOutText: {
        color: '#111827',
    },
    checkedInText: {
        color: 'white',
    },
    permissionCard: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        shadowColor: 'black',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        elevation: 1,
    },
    permissionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    permissionBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    permissionText: {
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    grid: {
        marginBottom: 20,
    },
    card: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 18,
        marginBottom: 12,
        shadowColor: 'black',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        elevation: 1,
    },
    cardIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    cardIcon: {
        fontSize: 22,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 14,
    },
    cardButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    cardButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    teamSection: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 16,
        shadowColor: 'black',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        elevation: 1,
    },
    teamMember: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    memberAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    memberAvatarText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    memberRole: {
        fontSize: 12,
        color: '#6B7280',
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
