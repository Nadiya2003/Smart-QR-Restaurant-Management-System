import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';

const screenWidth = Dimensions.get('window').width;

const AdminDashboard = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [orderList, setOrderList] = useState([]);
    const [reservationList, setReservationList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch stats
            const statsRes = await fetch(apiConfig.ADMIN.STATS, { headers });
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData.stats);
            }

            // Fetch based on active tab
            if (activeTab === 'staff' || activeTab === 'overview') {
                const staffRes = await fetch(apiConfig.ADMIN.STAFF, { headers });
                if (staffRes.ok) {
                    const staffData = await staffRes.json();
                    setStaffList(staffData.staff || []);
                }
            }

            if (activeTab === 'customers') {
                const custRes = await fetch(apiConfig.ADMIN.CUSTOMERS, { headers });
                if (custRes.ok) {
                    const custData = await custRes.json();
                    setCustomerList(custData.customers || []);
                }
            }

            if (activeTab === 'orders') {
                const orderRes = await fetch(apiConfig.ADMIN.ORDERS, { headers });
                if (orderRes.ok) {
                    const orderData = await orderRes.json();
                    setOrderList(orderData.orders || []);
                }
            }

            if (activeTab === 'reservations') {
                const resRes = await fetch(apiConfig.ADMIN.RESERVATIONS, { headers });
                if (resRes.ok) {
                    const resData = await resRes.json();
                    setReservationList(resData.reservations || []);
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const toggleStatus = async (id, currentStatus, type = 'staff') => {
        const action = currentStatus === 1 || currentStatus === true ? 'deactivate' : 'activate';
        const baseUrl = type === 'staff' ? apiConfig.ADMIN.STAFF : apiConfig.ADMIN.CUSTOMERS;
        
        try {
            // For customers, we use the status endpoint as per web
            const endpoint = type === 'staff' 
                ? `${baseUrl}/${id}/${action}` 
                : `${baseUrl}/${id}/status`;
            
            const method = type === 'staff' ? 'POST' : 'PUT';
            const body = type === 'customer' ? JSON.stringify({ status: action === 'activate' ? 'active' : 'inactive' }) : null;

            const res = await fetch(endpoint, {
                method,
                headers,
                body
            });

            if (res.ok) {
                Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} ${action}d successfully`);
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to update status');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error');
        }
    };

    const tabs = [
        { key: 'overview', label: 'Overview', icon: '📊' },
        { key: 'staff', label: 'Staff', icon: '👨‍🍳' },
        { key: 'customers', label: 'Customers', icon: '👥' },
        { key: 'orders', label: 'Orders', icon: '🛍️' },
        { key: 'reservations', label: 'Reservations', icon: '📅' },
    ];

    // ===== OVERVIEW TAB =====
    const renderOverview = () => {
        const statCards = [
            { title: "Total Revenue", value: stats ? `Rs. ${Number(stats.revenue || 0).toLocaleString()}` : '...', icon: "💰", color: '#FEF3C7' },
            { title: "Total Orders", value: stats ? `${stats.orders || 0}` : '...', icon: "🛍️", color: '#DBEAFE' },
            { title: "Customers", value: stats ? `${stats.customers || 0}` : '...', icon: "👥", color: '#D1FAE5' },
            { title: "Staff Active", value: stats ? `${staffList.filter(s => s.is_active).length}/${staffList.length}` : '...', icon: "👨‍🍳", color: '#FEE2E2' },
        ];

        return (
            <>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Dashboard Overview</Text>
                    <Text style={styles.headerSubtitle}>Welcome back, Admin! Here's what's happening.</Text>
                    <Text style={styles.date}>{new Date().toDateString()}</Text>
                </View>

                <View style={styles.statsGrid}>
                    {statCards.map((stat, index) => (
                        <View key={index} style={styles.statCard}>
                            <View style={styles.statHeader}>
                                <View style={[styles.iconBox, { backgroundColor: stat.color }]}>
                                    <Text style={styles.icon}>{stat.icon}</Text>
                                </View>
                            </View>
                            <Text style={styles.statTitle}>{stat.title}</Text>
                            <Text style={styles.statValue}>{stat.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Quick Actions */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Quick Stats</Text>
                    <View style={styles.quickStatsRow}>
                        <View style={styles.quickStat}>
                            <Text style={styles.quickStatValue}>{stats?.pendingOrders || 0}</Text>
                            <Text style={styles.quickStatLabel}>Pending</Text>
                        </View>
                        <View style={styles.quickStat}>
                            <Text style={[styles.quickStatValue, { color: '#10B981' }]}>{stats?.completedOrders || 0}</Text>
                            <Text style={styles.quickStatLabel}>Completed</Text>
                        </View>
                        <View style={styles.quickStat}>
                            <Text style={[styles.quickStatValue, { color: '#3B82F6' }]}>{staffList.length}</Text>
                            <Text style={styles.quickStatLabel}>Total Staff</Text>
                        </View>
                    </View>
                </View>
            </>
        );
    };

    // ===== STAFF TAB =====
    const renderStaff = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Staff Management</Text>
                <Text style={styles.headerSubtitle}>{staffList.length} staff members</Text>
            </View>

            {staffList.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👨‍🍳</Text>
                    <Text style={styles.emptyText}>No staff members found</Text>
                </View>
            ) : (
                staffList.map((staff) => (
                    <View key={staff.id} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{(staff.name || '?')[0].toUpperCase()}</Text>
                            </View>
                            <View style={styles.listCardInfo}>
                                <Text style={styles.listCardName}>{staff.name || staff.full_name}</Text>
                                <Text style={styles.listCardSub}>{staff.email}</Text>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                                        <Text style={[styles.badgeText, { color: '#3B82F6' }]}>{staff.role}</Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: staff.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                                        <Text style={[styles.badgeText, { color: staff.is_active ? '#059669' : '#DC2626' }]}>
                                            {staff.is_active ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: staff.is_active ? '#FEE2E2' : '#D1FAE5' }]}
                            onPress={() => toggleStatus(staff.id, staff.is_active, 'staff')}
                        >
                            <Text style={[styles.actionButtonText, { color: staff.is_active ? '#DC2626' : '#059669' }]}>
                                {staff.is_active ? 'Deactivate Account' : 'Activate Account'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </>
    );

    // ===== CUSTOMERS TAB =====
    const renderCustomers = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Customer Management</Text>
                <Text style={styles.headerSubtitle}>{customerList.length} customers</Text>
            </View>

            {customerList.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👥</Text>
                    <Text style={styles.emptyText}>No customers found</Text>
                </View>
            ) : (
                customerList.map((customer) => (
                    <View key={customer.id} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <View style={[styles.avatarCircle, { backgroundColor: '#DBEAFE' }]}>
                                <Text style={[styles.avatarText, { color: '#3B82F6' }]}>{(customer.name || '?')[0].toUpperCase()}</Text>
                            </View>
                            <View style={styles.listCardInfo}>
                                <Text style={styles.listCardName}>{customer.name}</Text>
                                <Text style={styles.listCardSub}>{customer.email}</Text>
                                <Text style={styles.listCardSub}>📞 {customer.phone || 'N/A'}</Text>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                                        <Text style={[styles.badgeText, { color: '#D97706' }]}>⭐ {customer.loyalty_points || 0} pts</Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: customer.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                                        <Text style={[styles.badgeText, { color: customer.is_active ? '#059669' : '#DC2626' }]}>
                                            {customer.is_active ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: customer.is_active ? '#FEE2E2' : '#D1FAE5' }]}
                            onPress={() => toggleStatus(customer.id, customer.is_active, 'customer')}
                        >
                            <Text style={[styles.actionButtonText, { color: customer.is_active ? '#DC2626' : '#059669' }]}>
                                {customer.is_active ? 'Suspend Access' : 'Grant Access'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </>
    );

    // ===== ORDERS TAB =====
    const renderOrders = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Order Management</Text>
                <Text style={styles.headerSubtitle}>{orderList.length} orders</Text>
            </View>

            {orderList.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🛍️</Text>
                    <Text style={styles.emptyText}>No orders found</Text>
                </View>
            ) : (
                orderList.map((order) => (
                    <View key={order.id} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <View style={[styles.avatarCircle, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={styles.avatarText}>#{order.id}</Text>
                            </View>
                            <View style={styles.listCardInfo}>
                                <Text style={styles.listCardName}>Order #{order.id}</Text>
                                <Text style={styles.listCardSub}>Customer: {order.customer_name || 'Guest'}</Text>
                                <Text style={styles.listCardSub}>Total: Rs. {Number(order.total_price || 0).toLocaleString()}</Text>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.badge, {
                                        backgroundColor:
                                            order.status === 'PENDING' ? '#FEF3C7' :
                                                order.status === 'COMPLETED' ? '#D1FAE5' :
                                                    order.status === 'CANCELLED' ? '#FEE2E2' : '#DBEAFE'
                                    }]}>
                                        <Text style={[styles.badgeText, {
                                            color:
                                                order.status === 'PENDING' ? '#D97706' :
                                                    order.status === 'COMPLETED' ? '#059669' :
                                                        order.status === 'CANCELLED' ? '#DC2626' : '#3B82F6'
                                        }]}>
                                            {order.status || 'Unknown'}
                                        </Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
                                        <Text style={[styles.badgeText, { color: '#6B7280' }]}>{order.order_type || 'N/A'}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </>
    );

    // ===== RESERVATIONS TAB =====
    const renderReservations = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Reservations</Text>
                <Text style={styles.headerSubtitle}>{reservationList.length} reservations</Text>
            </View>

            {reservationList.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📅</Text>
                    <Text style={styles.emptyText}>No reservations found</Text>
                </View>
            ) : (
                reservationList.map((res) => (
                    <View key={res.id} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <View style={[styles.avatarCircle, { backgroundColor: '#EDE9FE' }]}>
                                <Text style={styles.avatarText}>📅</Text>
                            </View>
                            <View style={styles.listCardInfo}>
                                <Text style={styles.listCardName}>{res.customer_name}</Text>
                                <Text style={styles.listCardSub}>Table #{res.table_number} • {res.guest_count} guests</Text>
                                <Text style={styles.listCardSub}>{new Date(res.reservation_time).toLocaleString()}</Text>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.badge, {
                                        backgroundColor:
                                            res.status === 'CONFIRMED' ? '#D1FAE5' :
                                                res.status === 'PENDING' ? '#FEF3C7' : '#FEE2E2'
                                    }]}>
                                        <Text style={[styles.badgeText, {
                                            color:
                                                res.status === 'CONFIRMED' ? '#059669' :
                                                    res.status === 'PENDING' ? '#D97706' : '#DC2626'
                                        }]}>
                                            {res.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </>
    );

    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            );
        }

        switch (activeTab) {
            case 'overview': return renderOverview();
            case 'staff': return renderStaff();
            case 'customers': return renderCustomers();
            case 'orders': return renderOrders();
            case 'reservations': return renderReservations();
            default: return renderOverview();
        }
    };

    return (
        <View style={styles.container}>
            {/* Tab Bar */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabBar}
                contentContainerStyle={styles.tabBarContent}
            >
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={styles.tabIcon}>{tab.icon}</Text>
                        <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
            <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {renderContent()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    tabBar: {
        backgroundColor: 'white',
        maxHeight: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tabBarContent: {
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginRight: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#000',
    },
    tabIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    tabLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeTabLabel: {
        color: '#000',
        fontWeight: '700',
    },
    scrollContent: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 14,
    },
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    date: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 6,
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: 'black',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 20,
    },
    statTitle: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    chartCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: 'black',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    quickStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    quickStat: {
        alignItems: 'center',
    },
    quickStatValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F59E0B',
    },
    quickStatLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    // List card styles (shared by staff, customers, orders, reservations)
    listCard: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: 'black',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        elevation: 1,
    },
    listCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    listCardInfo: {
        flex: 1,
    },
    listCardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    listCardSub: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        gap: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    actionButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
});

export default AdminDashboard;
