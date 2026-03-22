import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, Dimensions, Switch, Vibration, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';
import AccountSection from './AccountSection';

const { width } = Dimensions.get('window');

// Timer Component for individual orders
const OrderTimer = ({ createdAt, onTimeout }) => {
    const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes in seconds
    const timerRef = useRef(null);

    useEffect(() => {
        const calculateTime = () => {
            const start = new Date(createdAt).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - start) / 1000);
            const remaining = Math.max(0, (20 * 60) - elapsed);
            setTimeLeft(remaining);
            if (remaining === 0) onTimeout && onTimeout();
        };

        calculateTime();
        timerRef.current = setInterval(calculateTime, 1000);

        return () => clearInterval(timerRef.current);
    }, [createdAt]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const isUrgent = timeLeft < 5 * 60; // Less than 5 minutes

    return (
        <View style={[styles.timerBox, isUrgent && styles.timerUrgent]}>
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
                {timeLeft > 0 ? formatTime(timeLeft) : "EXPIRED"}
            </Text>
        </View>
    );
};

const BarDashboard = () => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('orders'); // orders, inventory, notifications
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Data States
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isOnDuty, setIsOnDuty] = useState(false);
    
    const prevOrderIds = useRef(new Set());

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [orderRes, historyRes, invRes, statusRes, notifRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/bar/orders`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/bar/history`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/inventory?category=Bar`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/duty/status`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/notifications`, { headers })
            ]);

            if (orderRes.ok) {
                const data = await orderRes.json();
                const newOrders = data.orders || [];
                
                // Better new order detection
                const currentIds = new Set(newOrders.map(o => o.id));
                const hasNewOrder = [...currentIds].some(id => !prevOrderIds.current.has(id));
                
                if (hasNewOrder && isSilent) {
                    Vibration.vibrate([0, 500, 200, 500]);
                }
                
                prevOrderIds.current = currentIds;
                setOrders(newOrders);
            }
            if (historyRes.ok) setHistory((await historyRes.json()).history || []);
            if (invRes.ok) setInventory((await invRes.json()).inventory || []);
            if (statusRes.ok) setIsOnDuty((await statusRes.json()).onDuty);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);

        } catch (error) {
            console.error('Bar Fetch error:', error);
            if (!isSilent) {
                Alert.alert('Connection Error', 'Could not reach the server.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
        
        // Auto check-in
        const autoCheckIn = async () => {
            try {
                const res = await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/duty/check-in`, {
                    method: 'POST',
                    headers
                });
                if (res.ok) setIsOnDuty(true);
            } catch (err) {
                console.log("Auto check-in failed", err);
            }
        };
        autoCheckIn();

        const interval = setInterval(() => fetchData(true), 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDutyToggle = async () => {
        const endpoint = isOnDuty ? 'check-out' : 'check-in';
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/duty/${endpoint}`, {
                method: 'POST',
                headers
            });
            if (res.ok) {
                setIsOnDuty(!isOnDuty);
                Alert.alert('Attendance', `Shift ${!isOnDuty ? 'Started' : 'Ended'}`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update attendance');
        }
    };

    const updateStatus = async (orderId, status, type) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status, type })
            });
            if (res.ok) {
                fetchData(true);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handlePrintKOT = (order) => {
        Alert.alert(
            "Print KOT",
            `Order #${order.id} ticket ready.`,
            [
                { text: "Download PDF", onPress: () => Alert.alert("Success", "KOT Downloaded as PDF") },
                { text: "Download PNG", onPress: () => Alert.alert("Success", "KOT Downloaded as PNG") },
                { text: "Close", style: "cancel" }
            ]
        );
    };

    // ===== RENDERERS =====

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                    onPress={() => setActiveTab('account')}
                    style={[styles.profileBox, { backgroundColor: '#8B5CF6' }, activeTab === 'account' && { borderWidth: 2, borderColor: '#3B82F6' }]}
                >
                    {user?.profile_image || user?.image ? (
                        <Image 
                            source={{ uri: (user.profile_image || user.image).startsWith('http') ? (user.profile_image || user.image) : `${apiConfig.API_BASE_URL}${user.profile_image || user.image}` }} 
                            style={styles.profileImg}
                        />
                    ) : (
                        <Text style={styles.profileInitial}>{user?.name?.charAt(0)}</Text>
                    )}
                </TouchableOpacity>
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.greeting}>Hello, {user?.name}</Text>
                    <Text style={styles.roleTitle}>Bar Dashboard</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => setActiveTab('notifications')} style={styles.notifBtn}>
                    <Text style={{ fontSize: 22 }}>🔔</Text>
                    {notifications.filter(n => n.status === 'unread').length > 0 && <View style={styles.badge} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Text style={{ fontSize: 18 }}>🚪</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderDutyCard = () => (
        <View style={[styles.dutyCard, isOnDuty ? styles.onDutyBarBg : styles.offDutyBg]}>
            <View>
                <Text style={styles.dutyTitle}>{isOnDuty ? 'Bar is OPEN' : 'Bar is CLOSED'}</Text>
                <Text style={styles.dutySub}>Toggle to start receiving drink orders in real-time</Text>
            </View>
            <Switch 
                value={isOnDuty} 
                onValueChange={handleDutyToggle} 
                trackColor={{ false: '#9CA3AF', true: '#8B5CF6' }}
                thumbColor={isOnDuty ? '#fff' : '#f4f3f4'}
            />
        </View>
    );

    const renderStats = () => (
        <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.statVal, { color: '#6D28D9' }]}>{orders.length}</Text>
                <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[styles.statVal, { color: '#7E22CE' }]}>{orders.filter(o => o.status === 'PREPARING').length}</Text>
                <Text style={styles.statLabel}>Mixing</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#F5F3FF' }]}>
                <Text style={[styles.statVal, { color: '#5B21B6' }]}>{inventory.filter(i => (i.category === 'Bar' || i.item_name.toLowerCase().includes('bottle')) && i.quantity <= i.min_level).length}</Text>
                <Text style={styles.statLabel}>Low Stock</Text>
            </View>
        </View>
    );

    const renderOrders = () => (
        <ScrollView 
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {renderDutyCard()}
            {renderStats()}

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🍹 Beverage Tasks</Text>
                <TouchableOpacity onPress={() => fetchData(true)}>
                    <Text style={styles.linkText}>Refresh</Text>
                </TouchableOpacity>
            </View>

            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                         <Text style={{ fontSize: 60 }}>🍹</Text>
                    </View>
                    <Text style={styles.emptyTitle}>Slow Day?</Text>
                    <Text style={styles.emptyText}>No beverage orders in the queue. Perfect time to restock!</Text>
                    <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => fetchData()}>
                        <Text style={styles.refreshBtnText}>Check Queue</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                orders.map(order => {
                    const typeColor = order.order_type_name?.includes('DINE') ? '#3B82F6' : (order.order_type_name?.includes('TAKEAWAY') ? '#F59E0B' : '#10B981');
                    const isVeryRecent = (Date.now() - new Date(order.created_at).getTime()) < 120000;
                    const isPreparing = order.status === 'PREPARING';

                    return (
                        <View key={`${order.order_type_name}-${order.id}`} style={[styles.orderCard, { borderLeftColor: typeColor }, isVeryRecent && styles.newOrderBorder]}>
                            {isVeryRecent && (
                                <View style={styles.newBadgeContainer}>
                                    <View style={styles.pulsingDot} />
                                    <Text style={styles.newBadgeText}>NEW DRINK ORDER</Text>
                                </View>
                            )}
                            
                            <View style={styles.orderHeader}>
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.orderId}>#{order.id}</Text>
                                        <View style={[styles.typePill, { backgroundColor: typeColor }]}>
                                            <Text style={styles.typePillText}>{order.order_type_name?.replace('_', ' ') || 'DINE-IN'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.dot, { backgroundColor: isPreparing ? '#8B5CF6' : '#6B7280' }]} />
                                        <Text style={[styles.statusText, { color: isPreparing ? '#8B5CF6' : '#6B7280' }]}>
                                            {isPreparing ? 'Mixing / Preparing' : 'Awaiting Service'}
                                        </Text>
                                    </View>
                                </View>
                                <OrderTimer createdAt={order.created_at} />
                            </View>

                            <View style={styles.detailsGrid}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>LOCATION</Text>
                                    <Text style={styles.detailValue}>📍 {order.table_number ? `Table ${order.table_number}` : 'Counter'}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>SERVICE</Text>
                                    <Text style={styles.detailValue}>👤 {order.steward_name || 'System'}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>SENT</Text>
                                    <Text style={styles.detailValue}>🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                            </View>

                            <View style={styles.itemsContainer}>
                                <Text style={styles.itemsSectionTitle}>BEVERAGE LIST</Text>
                                {order.items?.map((item, idx) => (
                                    <View key={idx} style={styles.itemRow}>
                                        <View style={[styles.qtyBox, { backgroundColor: typeColor + '15' }]}>
                                            <Text style={[styles.qtyText, { color: typeColor }]}>{item.quantity}x</Text>
                                        </View>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        {item.notes && <Text style={styles.itemNotes}>({item.notes})</Text>}
                                    </View>
                                ))}
                            </View>

                            <View style={styles.orderFooter}>
                                <TouchableOpacity style={styles.printBtn} onPress={() => handlePrintKOT(order)}>
                                    <Text style={styles.printBtnIcon}>🖨️</Text>
                                    <Text style={styles.printBtnText}>Label Print</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[
                                        styles.mainActionBtn, 
                                        { backgroundColor: isPreparing ? '#10B981' : '#8B5CF6' }
                                    ]} 
                                    onPress={() => updateStatus(order.id, isPreparing ? 'READY' : 'PREPARING', order.order_type_name)}
                                >
                                    <Text style={styles.mainActionText}>
                                        {isPreparing ? 'DRINKS READY' : 'START MIXING'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );

    const renderInventory = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Beverage Inventory</Text>
            <View style={styles.invGrid}>
                {inventory.map(item => {
                    const isLow = item.quantity <= item.min_level;
                    return (
                        <View key={item.id} style={[styles.invCard, isLow && styles.invCardLow]}>
                            <Text style={styles.invName}>{item.item_name}</Text>
                            <Text style={[styles.invQty, { color: isLow ? '#EF4444' : '#111827' }]}>
                                {item.quantity} {item.unit}
                            </Text>
                            {isLow && <Text style={styles.lowTag}>LOW STOCK</Text>}
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );

    const renderHistory = () => (
        <ScrollView 
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={styles.sectionTitle}>Served Today</Text>
            {history.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No beverage orders completed yet today.</Text>
                </View>
            ) : (
                history.map(order => (
                    <View key={order.id} style={[styles.orderCard, { borderLeftColor: '#9CA3AF', opacity: 0.8 }]}>
                        <View style={styles.orderHeader}>
                            <View>
                                <Text style={styles.orderId}>ORDER #{order.id}</Text>
                                <View style={[styles.typeBadge, { backgroundColor: '#F3F4F6' }]}>
                                    <Text style={[styles.typeText, { color: '#6B7280' }]}>{order.status}</Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <View style={styles.itemsSection}>
                            {order.items?.map((item, idx) => (
                                <View key={idx} style={styles.itemRow}>
                                    <Text style={[styles.itemQty, { color: '#9CA3AF' }]}>{item.quantity}x</Text>
                                    <Text style={[styles.itemName, { color: '#6B7280' }]}>{item.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );

    const renderNotifications = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>System Notifications</Text>
            {notifications.map(n => (
                <View key={n.id} style={[styles.notifCard, n.status === 'unread' && styles.unreadNotif]}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    <Text style={styles.notifMsg}>{n.message}</Text>
                    <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleTimeString()}</Text>
                </View>
            ))}
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <View style={styles.mainContainer}>
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'history' && renderHistory()}
                {activeTab === 'inventory' && renderInventory()}
                {activeTab === 'notifications' && renderNotifications()}
                {activeTab === 'account' && (
                    <View style={{ flex: 1, padding: 15 }}>
                        <AccountSection />
                    </View>
                )}
            </View>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => setActiveTab('orders')} style={[styles.navItem, activeTab === 'orders' && styles.activeNav]}>
                    <Text style={[styles.navIcon, activeTab === 'orders' && styles.activeNavIcon]}>🍹</Text>
                    <Text style={[styles.navLabel, activeTab === 'orders' && styles.activeNavLabel]}>Live</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.navItem, activeTab === 'history' && styles.activeNav]}>
                    <Text style={[styles.navIcon, activeTab === 'history' && styles.activeNavIcon]}>📜</Text>
                    <Text style={[styles.navLabel, activeTab === 'history' && styles.activeNavLabel]}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('inventory')} style={[styles.navItem, activeTab === 'inventory' && styles.activeNav]}>
                    <Text style={[styles.navIcon, activeTab === 'inventory' && styles.activeNavIcon]}>🍾</Text>
                    <Text style={[styles.navLabel, activeTab === 'inventory' && styles.activeNavLabel]}>Storage</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('notifications')} style={[styles.navItem, activeTab === 'notifications' && styles.activeNav]}>
                    <Text style={[styles.navIcon, activeTab === 'notifications' && styles.activeNavIcon]}>🔔</Text>
                    <Text style={[styles.navLabel, activeTab === 'notifications' && styles.activeNavLabel]}>Alerts</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('account')} style={[styles.navItem, activeTab === 'account' && styles.activeNav]}>
                    <Text style={[styles.navIcon, activeTab === 'account' && styles.activeNavIcon]}>👤</Text>
                    <Text style={[styles.navLabel, activeTab === 'account' && styles.activeNavLabel]}>Profile</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { padding: 15, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    profileBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    profileInitial: { fontSize: 18, fontWeight: 'bold', color: '#7E22CE' },
    greeting: { fontSize: 12, color: '#6B7280' },
    roleTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    headerActions: { flexDirection: 'row', gap: 15 },
    notifBtn: { position: 'relative', padding: 5 },
    badge: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    logoutBtn: { padding: 5 },
    mainContainer: { flex: 1 },
    content: { flex: 1, padding: 20 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statBox: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    statVal: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 12, color: '#4B5563', marginTop: 4 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    linkText: { color: '#8B5CF6', fontSize: 13, fontWeight: '600' },
    dutyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 20, borderLeftWidth: 6 },
    onDutyBarBg: { backgroundColor: '#F5F3FF', borderLeftColor: '#8B5CF6' },
    offDutyBg: { backgroundColor: '#F3F4F6', borderLeftColor: '#9CA3AF' },
    dutyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    dutySub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    orderCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 20, borderLeftWidth: 8, elevation: 4 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    orderId: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
    typeText: { fontSize: 10, fontWeight: 'bold' },
    timerBox: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'center' },
    timerUrgent: { backgroundColor: '#FEE2E2' },
    timerText: { fontSize: 16, fontWeight: 'bold', color: '#4B5563', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    timerTextUrgent: { color: '#EF4444' },
    orderInfoRow: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
    orderInfoText: { fontSize: 12, color: '#6B7280', backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    itemsSection: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 15, marginBottom: 20 },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    itemQty: { fontSize: 18, fontWeight: 'bold', color: '#8B5CF6', marginRight: 10 },
    itemName: { fontSize: 18, fontWeight: 'bold', color: '#111827', flex: 1 },
    orderActions: { flexDirection: 'row', gap: 10 },
    kotBtn: { flex: 1, backgroundColor: '#F3F4F6', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    kotBtnText: { fontWeight: 'bold', color: '#111827' },
    statusBtn: { flex: 2, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statusBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    invGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    invCard: { width: (width - 55) / 2, backgroundColor: 'white', padding: 15, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#8B5CF6', elevation: 2 },
    invCardLow: { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' },
    invName: { fontSize: 14, fontWeight: 'bold', color: '#4B5563' },
    invQty: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
    lowTag: { fontSize: 9, color: '#EF4444', fontWeight: 'bold', marginTop: 4 },
    notifCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#D1D5DB' },
    unreadNotif: { backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' },
    notifTitle: { fontWeight: 'bold', fontSize: 16 },
    notifMsg: { color: '#4B5563', marginTop: 4, fontSize: 14 },
    notifTime: { fontSize: 10, color: '#9CA3AF', marginTop: 8 },
    bottomNav: { height: 75, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', paddingBottom: 15 },
    navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navIcon: { fontSize: 22, opacity: 0.5 },
    navLabel: { fontSize: 10, color: '#6B7280', marginTop: 4 },
    activeNav: { borderTopWidth: 3, borderTopColor: '#8B5CF6' },
    activeNavIcon: { fontSize: 26, opacity: 1 },
    activeNavLabel: { fontWeight: 'bold', color: '#8B5CF6' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: 40 },
    emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
    emptyText: { color: '#6B7280', fontSize: 16, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    refreshBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, elevation: 2 },
    refreshBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    
    orderCard: { backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 24, borderLeftWidth: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
    newOrderBorder: { borderColor: '#EF4444', borderWidth: 2 },
    newBadgeContainer: { position: 'absolute', top: -12, right: 24, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10, elevation: 4 },
    pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
    newBadgeText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    orderId: { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: -1 },
    typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
    typePillText: { color: 'white', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    statusText: { fontSize: 13, fontWeight: '600' },
    
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, backgroundColor: '#F9FAFB', padding: 15, borderRadius: 20 },
    detailItem: { alignItems: 'center', flex: 1 },
    detailLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    detailValue: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
    
    itemsContainer: { marginBottom: 24 },
    itemsSectionTitle: { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1, marginBottom: 15 },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    qtyBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    qtyText: { fontSize: 18, fontWeight: '900' },
    itemName: { fontSize: 18, fontWeight: 'bold', color: '#111827', flex: 1 },
    itemNotes: { fontSize: 14, color: '#6B7280', fontStyle: 'italic', marginLeft: 10 },
    
    orderFooter: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 20 },
    printBtn: { flex: 1, height: 56, borderRadius: 18, backgroundColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    printBtnIcon: { fontSize: 18 },
    printBtnText: { fontWeight: 'bold', color: '#111827', fontSize: 14 },
    mainActionBtn: { flex: 2, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    mainActionText: { color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
    
    timerBox: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 15, backgroundColor: '#F3F4F6', alignItems: 'center' },
    timerUrgent: { backgroundColor: '#FEE2E2' },
    timerText: { fontSize: 20, fontWeight: '800', color: '#4B5563' },
    timerTextUrgent: { color: '#EF4444' },
});

export default BarDashboard;
