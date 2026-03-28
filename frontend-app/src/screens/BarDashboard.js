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
const OrderTimer = ({ createdAt }) => {
    const [timeLeft, setTimeLeft] = useState(20 * 60);
    const timerRef = useRef(null);

    useEffect(() => {
        const calculateTime = () => {
            const start = new Date(createdAt).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - start) / 1000);
            const remaining = Math.max(0, (20 * 60) - elapsed);
            setTimeLeft(remaining);
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

    const isUrgent = timeLeft < 5 * 60;

    return (
        <View style={[styles.timerBox, isUrgent && styles.timerUrgent]}>
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
                {timeLeft > 0 ? formatTime(timeLeft) : '⚠️ OVR'}
            </Text>
        </View>
    );
};

const BarDashboard = () => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isOnDuty, setIsOnDuty] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    
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
            console.error('Bar fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
        const autoCheckIn = async () => {
            try {
                const res = await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/duty/check-in`, {
                    method: 'POST', headers
                });
                if (res.ok) setIsOnDuty(true);
            } catch (err) {}
        };
        autoCheckIn();
        const interval = setInterval(() => fetchData(true), 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const handleDutyToggle = async () => {
        const endpoint = isOnDuty ? 'check-out' : 'check-in';
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/duty/${endpoint}`, {
                method: 'POST', headers
            });
            if (res.ok) {
                setIsOnDuty(!isOnDuty);
                Alert.alert('Attendance', `Shift ${!isOnDuty ? 'Started ✅' : 'Ended 🔴'}`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update attendance');
        }
    };

    const updateStatus = async (orderId, newStatus, orderTypeName) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: newStatus, type: orderTypeName })
            });
            if (res.ok) {
                fetchData(true);
            } else {
                Alert.alert('Error', 'Failed to update order status');
            }
        } catch (error) {
            Alert.alert('Error', 'Connection failed');
        } finally {
            setUpdatingId(null);
        }
    };

    const getStatusColor = (status) => {
        switch ((status || '').toUpperCase()) {
            case 'PENDING': return '#F59E0B';
            case 'CONFIRMED': return '#8B5CF6'; // Changed to fit bar colors
            case 'PREPARING': return '#7E22CE';
            case 'READY': return '#10B981';
            default: return '#6B7280';
        }
    };

    const getTypeColor = (typeName) => {
        if (!typeName) return '#8B5CF6';
        if (typeName.includes('DINE')) return '#8B5CF6';
        if (typeName.includes('TAKEAWAY')) return '#F59E0B';
        if (typeName.includes('DELIVERY')) return '#10B981';
        return '#6B7280';
    };

    // ====================================================
    // RENDER: ORDER CARD (used in both Home and Live tabs)
    // ====================================================
    const renderOrderCard = (order, compact = false) => {
        const typeColor = getTypeColor(order.order_type_name);
        const statusColor = getStatusColor(order.status);
        const isPreparing = (order.status || '').toUpperCase() === 'PREPARING';
        const isReady = (order.status || '').toUpperCase() === 'READY';
        const isPending = !isPreparing && !isReady;
        const isVeryRecent = (Date.now() - new Date(order.created_at).getTime()) < 120000;
        const isUpdating = updatingId === order.id;

        return (
            <View key={`${order.order_type_name}-${order.id}`}
                style={[styles.orderCard, { borderLeftColor: typeColor }, isVeryRecent && styles.newOrderBorder]}
            >
                {/* NEW Badge */}
                {isVeryRecent && (
                    <View style={styles.newBadge}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}

                {/* Header Row */}
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={styles.orderId}>#{order.id}</Text>
                            <View style={[styles.typePill, { backgroundColor: typeColor }]}>
                                <Text style={styles.typePillText}>
                                    {(order.order_type_name || 'DINE-IN').replace('_', ' ')}
                                </Text>
                            </View>
                            <View style={[styles.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                                <Text style={[styles.statusPillText, { color: statusColor }]}>
                                    {order.status || 'PENDING'}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.cardSubInfo}>
                            {order.table_number ? `📍 Table ${order.table_number}` : '📍 Counter'}
                            {'   '}👤 {order.customer_name || 'Guest'}
                            {'   '}🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <OrderTimer createdAt={order.created_at} />
                </View>

                {/* Items */}
                <View style={styles.itemsBox}>
                    <Text style={styles.itemsLabel}>BEVERAGE LIST</Text>
                    {order.items?.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                            <View style={[styles.qtyBadge, { backgroundColor: typeColor + '18' }]}>
                                <Text style={[styles.qtyText, { color: typeColor }]}>{item.quantity}x</Text>
                            </View>
                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            {item.notes ? <Text style={styles.itemNote}>({item.notes})</Text> : null}
                        </View>
                    ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    {/* START MIXING — shown when PENDING/CONFIRMED */}
                    {isPending && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#7E22CE', flex: 1 }]} // Purple for Bar
                            onPress={() => updateStatus(order.id, 'PREPARING', order.order_type_name)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.actionBtnIcon}>🍹</Text>
                                    <Text style={styles.actionBtnText}>START MIXING</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* MARK READY — shown when PREPARING */}
                    {isPreparing && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]}
                            onPress={() => updateStatus(order.id, 'READY', order.order_type_name)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.actionBtnIcon}>✅</Text>
                                    <Text style={styles.actionBtnText}>DRINKS READY</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* READY State Info */}
                    {isReady && (
                        <View style={[styles.actionBtn, { backgroundColor: '#D1FAE5', flex: 1 }]}>
                            <Text style={styles.actionBtnIcon}>🚀</Text>
                            <Text style={[styles.actionBtnText, { color: '#065F46' }]}>WAITING FOR STEWARD</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // ====================================================
    // RENDER: HOME TAB — Summary + Live Orders
    // ====================================================
    const renderHome = () => {
        const pendingOrders = orders.filter(o => !['PREPARING', 'READY'].includes((o.status || '').toUpperCase()));
        const preparingOrders = orders.filter(o => (o.status || '').toUpperCase() === 'PREPARING');
        const readyOrders = orders.filter(o => (o.status || '').toUpperCase() === 'READY');
        const lowStock = inventory.filter(i => (i.category === 'Bar' || i.item_name.toLowerCase().includes('bottle')) && i.quantity <= i.min_level);

        return (
            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Duty Card */}
                <View style={[styles.dutyCard, isOnDuty ? styles.onDutyBg : styles.offDutyBg]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dutyTitle}>{isOnDuty ? '🟢 Bar is OPEN' : '🔴 Bar is CLOSED'}</Text>
                        <Text style={styles.dutySub}>Toggle to start/stop receiving drink tickets</Text>
                    </View>
                    <Switch
                        value={isOnDuty}
                        onValueChange={handleDutyToggle}
                        trackColor={{ false: '#9CA3AF', true: '#8B5CF6' }} // Purple switch
                        thumbColor={isOnDuty ? '#fff' : '#f4f3f4'}
                    />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
                        <Text style={[styles.statVal, { color: '#C2410C' }]}>{pendingOrders.length}</Text>
                        <Text style={styles.statLabel}>⏳ Queue</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}>
                        <Text style={[styles.statVal, { color: '#7E22CE' }]}>{preparingOrders.length}</Text>
                        <Text style={styles.statLabel}>🍹 Mixing</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' }]}>
                        <Text style={[styles.statVal, { color: '#065F46' }]}>{readyOrders.length}</Text>
                        <Text style={styles.statLabel}>✅ Ready</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: lowStock.length > 0 ? '#FEF2F2' : '#F9FAFB', borderColor: lowStock.length > 0 ? '#FCA5A5' : '#E5E7EB' }]}>
                        <Text style={[styles.statVal, { color: lowStock.length > 0 ? '#DC2626' : '#9CA3AF' }]}>{lowStock.length}</Text>
                        <Text style={styles.statLabel}>📦 Low Stock</Text>
                    </View>
                </View>

                {/* ── LIVE ORDERS SECTION ── */}
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>🔥 Live Bar Orders</Text>
                        <Text style={styles.sectionSub}>
                            {orders.length === 0 ? 'No pending orders' : `${orders.length} order${orders.length !== 1 ? 's' : ''} to process`}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => fetchData(true)} style={styles.refreshBtn}>
                        <Text style={styles.refreshBtnText}>↻ Refresh</Text>
                    </TouchableOpacity>
                </View>

                {orders.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={{ fontSize: 52, marginBottom: 10 }}>🍸</Text>
                        <Text style={styles.emptyTitle}>Slow Day?</Text>
                        <Text style={styles.emptyText}>No drink orders right now. Perfect time to restock!</Text>
                    </View>
                ) : (
                    <>
                        {/* PENDING orders first */}
                        {pendingOrders.length > 0 && (
                            <>
                                <View style={styles.groupLabel}>
                                    <View style={[styles.groupDot, { backgroundColor: '#F59E0B' }]} />
                                    <Text style={styles.groupText}>QUEUE — Needs Attention</Text>
                                </View>
                                {pendingOrders.map(order => renderOrderCard(order))}
                            </>
                        )}

                        {/* PREPARING orders */}
                        {preparingOrders.length > 0 && (
                            <>
                                <View style={styles.groupLabel}>
                                    <View style={[styles.groupDot, { backgroundColor: '#7E22CE' }]} />
                                    <Text style={styles.groupText}>MIXING — In Progress</Text>
                                </View>
                                {preparingOrders.map(order => renderOrderCard(order))}
                            </>
                        )}

                        {/* READY orders */}
                        {readyOrders.length > 0 && (
                            <>
                                <View style={styles.groupLabel}>
                                    <View style={[styles.groupDot, { backgroundColor: '#10B981' }]} />
                                    <Text style={styles.groupText}>READY — Awaiting Steward</Text>
                                </View>
                                {readyOrders.map(order => renderOrderCard(order))}
                            </>
                        )}
                    </>
                )}

                {/* Today's Completion */}
                {history.length > 0 && (
                    <View style={styles.completedSummary}>
                        <Text style={styles.completedTitle}>✅ Served Today: {history.length} orders</Text>
                        <Text style={styles.completedSub}>Cheers to good work! 🎉</Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>
        );
    };

    // ====================================================
    // RENDER: LIVE ORDERS TAB (full detail view)
    // ====================================================
    const renderLiveOrders = () => (
        <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 Processing Tickets</Text>
                <TouchableOpacity onPress={() => fetchData(true)} style={styles.refreshBtn}>
                    <Text style={styles.refreshBtnText}>↻ Refresh</Text>
                </TouchableOpacity>
            </View>

            {orders.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 64, marginBottom: 12 }}>🍻</Text>
                    <Text style={styles.emptyTitle}>All caught up!</Text>
                    <Text style={styles.emptyText}>No active drink orders to prepare right now.</Text>
                </View>
            ) : (
                orders.map(order => renderOrderCard(order))
            )}
        </ScrollView>
    );

    // ====================================================
    // RENDER: INVENTORY TAB
    // ====================================================
    const renderInventory = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>📦 Beverage Storage</Text>
            <View style={styles.invGrid}>
                {inventory.map(item => {
                    const isLow = item.quantity <= item.min_level;
                    return (
                        <View key={item.id} style={[styles.invCard, isLow && styles.invCardLow]}>
                            <Text style={styles.invName}>{item.item_name}</Text>
                            <Text style={[styles.invQty, { color: isLow ? '#EF4444' : '#111827' }]}>
                                {item.quantity} {item.unit}
                            </Text>
                            {isLow && <Text style={styles.lowTag}>⚠️ LOW STOCK</Text>}
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );

    // ====================================================
    // RENDER: HISTORY TAB
    // ====================================================
    const renderHistory = () => (
        <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={styles.sectionTitle}>📜 Served Today</Text>
            {history.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No drink orders completed yet today.</Text>
                </View>
            ) : (
                history.map(order => (
                    <View key={order.id} style={[styles.historyCard]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.historyId}>#{order.id} — {order.order_type_name}</Text>
                            <View style={[styles.statusPill, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
                                <Text style={[styles.statusPillText, { color: '#065F46' }]}>{order.status}</Text>
                            </View>
                        </View>
                        {order.items?.map((item, idx) => (
                            <Text key={idx} style={styles.historyItem}>• {item.quantity}x {item.name}</Text>
                        ))}
                        <Text style={styles.historyTime}>
                            🕒 {new Date(order.updated_at || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                ))
            )}
        </ScrollView>
    );

    // ====================================================
    // RENDER: NOTIFICATIONS TAB
    // ====================================================
    const renderNotifications = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>🔔 Notifications</Text>
            {notifications.length === 0 ? (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>No notifications.</Text></View>
            ) : (
                notifications.map(n => (
                    <View key={n.id} style={[styles.notifCard, n.status === 'unread' && styles.unreadNotif]}>
                        <Text style={styles.notifTitle}>{n.title}</Text>
                        <Text style={styles.notifMsg}>{n.message}</Text>
                        <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleTimeString()}</Text>
                    </View>
                ))
            )}
        </ScrollView>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading bar data...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => setActiveTab('account')}
                    style={[styles.profileBox, activeTab === 'account' && { borderWidth: 2, borderColor: '#8B5CF6' }]}
                >
                    {user?.profile_image ? (
                        <Image
                            source={{ uri: user.profile_image.startsWith('http') ? user.profile_image : `${apiConfig.API_BASE_URL}${user.profile_image}` }}
                            style={styles.profileImg}
                        />
                    ) : (
                        <Text style={styles.profileInitial}>{user?.name?.charAt(0)}</Text>
                    )}
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.greeting}>Hello, {user?.name}</Text>
                    <Text style={styles.roleTitle}>Bar Dashboard</Text>
                </View>
                <View style={styles.headerRight}>
                    {orders.length > 0 && (
                        <View style={styles.liveOrdersBadge}>
                            <Text style={styles.liveOrdersText}>{orders.length} Live</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => setActiveTab('notifications')} style={styles.notifBtn}>
                        <Text style={{ fontSize: 22 }}>🔔</Text>
                        {notifications.filter(n => n.status === 'unread').length > 0 && (
                            <View style={styles.badge} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Text style={{ fontSize: 18 }}>🚪</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <View style={styles.mainContainer}>
                {activeTab === 'home'          && renderHome()}
                {activeTab === 'live'          && renderLiveOrders()}
                {activeTab === 'history'       && renderHistory()}
                {activeTab === 'inventory'     && renderInventory()}
                {activeTab === 'notifications' && renderNotifications()}
                {activeTab === 'account'       && (
                    <View style={{ flex: 1, padding: 15 }}><AccountSection /></View>
                )}
            </View>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                {[
                    { key: 'home',          icon: '🏠', label: 'Home' },
                    { key: 'live',          icon: '🍹', label: 'Live', badge: orders.length },
                    { key: 'history',       icon: '📜', label: 'History' },
                    { key: 'inventory',     icon: '🍾', label: 'Storage' },
                    { key: 'notifications', icon: '🔔', label: 'Alerts', badge: notifications.filter(n => n.status === 'unread').length },
                    { key: 'account',       icon: '👤', label: 'Profile' },
                ].map(item => (
                    <TouchableOpacity
                        key={item.key}
                        onPress={() => setActiveTab(item.key)}
                        style={[styles.navItem, activeTab === item.key && styles.activeNav]}
                    >
                        <View style={{ position: 'relative' }}>
                            <Text style={[styles.navIcon, activeTab === item.key && styles.activeNavIcon]}>
                                {item.icon}
                            </Text>
                            {item.badge > 0 && (
                                <View style={styles.navBadge}>
                                    <Text style={styles.navBadgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.navLabel, activeTab === item.key && styles.activeNavLabel]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },

    // Header
    header: {
        padding: 14, backgroundColor: 'white',
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 3,
    },
    profileBox: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#7E22CE', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    profileInitial: { fontSize: 18, fontWeight: 'bold', color: 'white' },
    greeting: { fontSize: 11, color: '#6B7280' },
    roleTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    liveOrdersBadge: {
        backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20, marginRight: 4,
    },
    liveOrdersText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
    notifBtn: { position: 'relative', padding: 4 },
    badge: {
        position: 'absolute', top: 4, right: 4, width: 8, height: 8,
        borderRadius: 4, backgroundColor: '#EF4444',
    },
    logoutBtn: { padding: 4 },

    mainContainer: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

    // Duty card
    dutyCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 18, borderRadius: 20, marginBottom: 16, borderLeftWidth: 6,
    },
    onDutyBg: { backgroundColor: '#F3E8FF', borderLeftColor: '#8B5CF6' },
    offDutyBg: { backgroundColor: '#F3F4F6', borderLeftColor: '#9CA3AF' },
    dutyTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
    dutySub: { fontSize: 11, color: '#6B7280', marginTop: 2 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statBox: {
        flex: 1, padding: 12, borderRadius: 16, alignItems: 'center',
        borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2,
    },
    statVal: { fontSize: 22, fontWeight: '900' },
    statLabel: { fontSize: 10, color: '#6B7280', marginTop: 3, textAlign: 'center' },

    // Section header
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
    },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
    sectionSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    refreshBtn: {
        backgroundColor: '#F5F3FF', paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE',
    },
    refreshBtnText: { color: '#7E22CE', fontWeight: '700', fontSize: 13 },

    // Group labels
    groupLabel: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginBottom: 10, marginTop: 4,
    },
    groupDot: { width: 10, height: 10, borderRadius: 5 },
    groupText: { fontSize: 11, fontWeight: '900', color: '#6B7280', letterSpacing: 0.5 },

    // Order Card
    orderCard: {
        backgroundColor: 'white', borderRadius: 24,
        padding: 18, marginBottom: 16, borderLeftWidth: 8,
        shadowColor: '#1E3A5F', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    },
    newOrderBorder: { borderWidth: 2, borderColor: '#EF4444' },
    newBadge: {
        position: 'absolute', top: -10, right: 16,
        backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5,
        zIndex: 10, elevation: 4,
    },
    pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'white' },
    newBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },

    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14,
    },
    orderId: { fontSize: 22, fontWeight: '900', color: '#111827' },
    typePill: {
        paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
    },
    typePillText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    statusPill: {
        paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
    },
    statusPillText: { fontSize: 10, fontWeight: 'bold' },
    cardSubInfo: { fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 18 },

    // Timer
    timerBox: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
        backgroundColor: '#F3F4F6', alignItems: 'center',
    },
    timerUrgent: { backgroundColor: '#FEE2E2' },
    timerText: {
        fontSize: 16, fontWeight: '800', color: '#4B5563',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    timerTextUrgent: { color: '#EF4444' },

    // Items
    itemsBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, marginBottom: 14 },
    itemsLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1, marginBottom: 10 },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    qtyBadge: {
        width: 40, height: 40, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    qtyText: { fontSize: 15, fontWeight: '900' },
    itemName: { fontSize: 16, fontWeight: 'bold', color: '#111827', flex: 1 },
    itemNote: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginLeft: 6 },

    // Action Buttons
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 52, borderRadius: 16, gap: 8, elevation: 2,
    },
    actionBtnIcon: { fontSize: 18 },
    actionBtnText: { color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

    // Empty
    emptyCard: {
        backgroundColor: 'white', borderRadius: 24, padding: 40,
        alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
    emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },

    // Today's completed summary banner
    completedSummary: {
        backgroundColor: '#D1FAE5', borderRadius: 16, padding: 16,
        marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#10B981',
    },
    completedTitle: { fontSize: 14, fontWeight: 'bold', color: '#065F46' },
    completedSub: { fontSize: 12, color: '#059669', marginTop: 2 },

    // History
    historyCard: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#9CA3AF',
    },
    historyId: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
    historyItem: { fontSize: 13, color: '#6B7280', marginTop: 3 },
    historyTime: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },

    // Inventory
    invGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
    invCard: {
        width: (width - 44) / 2, backgroundColor: 'white', padding: 14,
        borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#8B5CF6', elevation: 2,
    },
    invCardLow: { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' },
    invName: { fontSize: 13, fontWeight: 'bold', color: '#4B5563' },
    invQty: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
    lowTag: { fontSize: 10, color: '#EF4444', fontWeight: 'bold', marginTop: 4 },

    // Notifications
    notifCard: {
        backgroundColor: 'white', padding: 14, borderRadius: 14,
        marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#D1D5DB',
    },
    unreadNotif: { backgroundColor: '#EFF6FF', borderLeftColor: '#8B5CF6' },
    notifTitle: { fontWeight: 'bold', fontSize: 15 },
    notifMsg: { color: '#4B5563', marginTop: 4, fontSize: 13 },
    notifTime: { fontSize: 10, color: '#9CA3AF', marginTop: 8 },

    // Bottom Nav
    bottomNav: {
        height: 72, backgroundColor: 'white',
        borderTopWidth: 1, borderTopColor: '#E5E7EB',
        flexDirection: 'row', paddingBottom: 10, paddingTop: 6,
    },
    navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navIcon: { fontSize: 20, opacity: 0.5 },
    navLabel: { fontSize: 9, color: '#6B7280', marginTop: 3, fontWeight: '600' },
    activeNav: { borderTopWidth: 3, borderTopColor: '#8B5CF6' },
    activeNavIcon: { fontSize: 24, opacity: 1 },
    activeNavLabel: { fontWeight: 'bold', color: '#8B5CF6' },
    navBadge: {
        position: 'absolute', top: -4, right: -8,
        backgroundColor: '#EF4444', borderRadius: 8,
        minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    },
    navBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
});

export default BarDashboard;
