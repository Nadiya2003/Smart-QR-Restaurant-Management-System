import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, Dimensions, Switch, Vibration, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';
import AccountSection from './AccountSection';

const { width } = Dimensions.get('window');

// Timer Component for individual orders
const OrderTimer = ({ createdAt }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins for bar
    const timerRef = useRef(null);

    useEffect(() => {
        const calculateTime = () => {
            const start = new Date(createdAt).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - start) / 1000);
            const remaining = Math.max(0, (25 * 60) - elapsed);
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
    const [activeTab, setActiveTab] = useState('orders');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Data States
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [updatingId, setUpdatingId] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);

    // Sound & Notification refs
    const prevOrderIds = useRef(new Set());
    const prevItemCount = useRef(0);
    const soundRef = useRef(null);
    const socketRef = useRef(null);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    // Initialize Bell Sound
    useEffect(() => {
        const loadSound = async () => {
            try {
                const sound = createAudioPlayer(
                    { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }
                );
                soundRef.current = sound;
            } catch (err) {
                console.log('Failed to load bar sound:', err);
            }
        };
        loadSound();
        return () => {
        };
    }, []);

    const playNotificationSound = async () => {
        try {
            if (soundRef.current) {
                soundRef.current.play();
            }
            Vibration.vibrate([0, 500, 200, 500]);
        } catch (err) {}
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [orderRes, historyRes, notifRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/bar/orders`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/bar/history`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/notifications`, { headers })
            ]);

            if (orderRes.ok) {
                const data = await orderRes.json();
                const newOrders = data.orders || [];
                const currentIds = new Set(newOrders.map(o => o.id));
                const currentItemSum = newOrders.reduce((sum, o) => (sum + (o.items?.length || 0)), 0);
                
                const hasNewOrder = Array.from(currentIds).some(id => !prevOrderIds.current.has(id));
                const itemsAdded = currentItemSum > prevItemCount.current && !hasNewOrder;

                if ((hasNewOrder || itemsAdded) && isSilent) {
                    playNotificationSound();
                    if (hasNewOrder) {
                        const newOrder = newOrders.find(o => !prevOrderIds.current.has(o.id));
                        if (newOrder) {
                            setActiveAlert({
                                title: "NEW DRINK TICKET! 🍹",
                                type: "NEW_ORDER",
                                orderId: newOrder.id,
                                table: newOrder.table_number || 'Counter',
                                customer: newOrder.customer_name || 'Guest'
                            });
                            setAlertPopupVisible(true);
                        }
                    }
                }
                
                prevOrderIds.current = currentIds;
                prevItemCount.current = currentItemSum;
                setOrders(newOrders);
            }
            if (historyRes.ok) setHistory((await historyRes.json()).history || []);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);
        } catch (error) {
            console.error('Bar fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    // Setup Socket.io
    useEffect(() => {
        fetchData();
        
        const socketIO = require('socket.io-client');
        const socket = socketIO(apiConfig.API_BASE_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketConnected(true);
            socket.emit('join', 'bar_room');
        });

        socket.on('newOrder', (data) => {
            fetchData(true);
            setActiveAlert({
                title: "NEW ORDER RECEIVED!",
                type: "SYNC",
                orderId: data.orderId || 'NEW',
                table: data.tableNumber || 'N/A',
                customer: data.customerName || 'Guest'
            });
            setAlertPopupVisible(true);
            playNotificationSound();
        });

        socket.on('orderUpdate', (data) => {
            fetchData(true);
            if (data.updatedBy !== 'BAR') {
                setActiveAlert({
                    title: "ORDER UPDATED",
                    type: "UPDATE",
                    orderId: data.orderId || data.id,
                    status: data.status,
                    table: data.tableNumber || 'N/A'
                });
                setAlertPopupVisible(true);
                playNotificationSound();
            }
        });
        
        socket.on('cancelRequest', (data) => {
            fetchData(true);
            setActiveAlert({
                title: "⚠️ CANCELLATION REQUEST",
                type: "CANCEL",
                orderId: data.orderId,
                table: data.tableNumber || 'N/A',
                reason: data.reason || 'Customer request'
            });
            setAlertPopupVisible(true);
            playNotificationSound();
        });

        socket.on('orderCancelled', (data) => {
            fetchData(true);
            setActiveAlert({
                title: "🛑 ORDER CANCELLED! STOP!",
                type: "CANCEL",
                orderId: data.orderId || data.id,
                table: data.tableNumber || 'N/A',
                reason: data.reason || 'Order terminated'
            });
            setAlertPopupVisible(true);
            playNotificationSound();
        });

        const autoCheckIn = async () => {
            try {
                await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/duty/check-in`, { method: 'POST', headers });
                setIsOnDuty(true);
            } catch (err) {}
        };
        autoCheckIn();
        
        const interval = setInterval(() => fetchData(true), 20000);
        return () => {
            clearInterval(interval);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [fetchData]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const handleDutyToggle = async () => {
        // Auto check-in only — bar staff don't manually toggle
    };

    const updateStatus = async (orderId, newStatus, orderTypeName) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/kitchen/orders/${orderId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: newStatus, type: orderTypeName, isBar: true })
            });
            if (res.ok) {
                fetchData(true);
            } else {
                Alert.alert('Error', 'Failed to update status');
            }
        } catch (error) {
            Alert.alert('Error', 'Connection failed');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleItemStatusUpdate = async (itemId, newStatus) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/orders/items/${itemId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchData(true);
                Vibration.vibrate(50);
            }
        } catch (error) {
            console.error('Drink item update failed:', error);
        }
    };

    const getStatusColor = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'PLACED') return '#94A3B8'; // Gray
        if (s === 'CONFIRMED') return '#6366F1'; // Indigo
        if (s === 'PREPARING') return '#F59E0B'; // Orange
        if (s === 'READY') return '#10B981'; // Green
        return '#6B7280';
    };

    const getTypeColor = (typeName) => {
        if (!typeName) return '#8B5CF6';
        if (typeName.includes('DINE')) return '#8B5CF6';
        if (typeName.includes('TAKEAWAY')) return '#F59E0B';
        if (typeName.includes('DELIVERY')) return '#10B981';
        return '#6B7280';
    };

    // ===================================
    // RENDER: ORDER CARD (STEWARD TYPE 1)
    // ===================================
    const renderOrderCard = (order) => {
        const typeColor = getTypeColor(order.order_type_name);
        const statusColor = getStatusColor(order.status);
        const stationStatus = (order.bar_status || '').toUpperCase();
        const isPreparing = stationStatus === 'PREPARING';
        const isReady = stationStatus === 'READY';
        const isPending = !isPreparing && !isReady;
        const isVeryRecent = (Date.now() - new Date(order.created_at).getTime()) < 120000;
        const isUpdating = updatingId === order.id;

        return (
            <View key={`${order.order_type_name}-${order.id}`} style={[styles.orderCard, { borderLeftColor: typeColor }, isVeryRecent && styles.newOrderBorder]}>
                {isVeryRecent && (
                    <View style={styles.newBadge}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.newBadgeText}>NEW DRINKS</Text>
                    </View>
                )}

                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={styles.orderId}>#{order.id}</Text>
                            <View style={[styles.typePill, { backgroundColor: typeColor }]}>
                                <Text style={styles.typePillText}>{(order.order_type_name || 'DINE-IN').replace('_', ' ')}</Text>
                            </View>
                            <View style={[styles.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                                <Text style={[styles.statusPillText, { color: statusColor }]}>{order.status || 'PENDING'}</Text>
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

                <View style={styles.itemsBox}>
                    <Text style={styles.itemsLabel}>DRINK TICKET (TAP TO UPDATE)</Text>
                    {order.items?.map((item, idx) => {
                        const itemStatus = (item.item_status || 'pending').toUpperCase();
                        let statusColor = '#94A3B8';
                        if (itemStatus === 'PREPARING') statusColor = '#A855F7';
                        if (itemStatus === 'READY') statusColor = '#10B981';

                        return (
                            <TouchableOpacity 
                                key={idx} 
                                style={[styles.itemRow, itemStatus === 'READY' && { opacity: 0.6 }]}
                                onPress={() => {
                                    const nextStatus = itemStatus === 'PENDING' ? 'PREPARING' : (itemStatus === 'PREPARING' ? 'READY' : 'PENDING');
                                    handleItemStatusUpdate(item.id, nextStatus);
                                }}
                            >
                                <View style={[styles.qtyBadge, { backgroundColor: typeColor + '18' }]}>
                                    <Text style={[styles.qtyText, { color: typeColor }]}>{item.quantity}x</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={[styles.itemName, itemStatus === 'READY' && { textDecorationLine: 'line-through' }]}>{item.name}</Text>
                                        <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: statusColor }}>
                                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: statusColor }}>{itemStatus}</Text>
                                        </View>
                                    </View>
                                    {item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
                                    {item.notes ? <Text style={styles.itemNote}>({item.notes})</Text> : null}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.actionRow}>
                    {isPending && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#7E22CE', flex: 1 }]} 
                            onPress={() => updateStatus(order.id, 'PREPARING', order.order_type_name)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <ActivityIndicator color="white" size="small" /> : (
                                <><Text style={styles.actionBtnIcon}>🍹</Text><Text style={styles.actionBtnText}>START MIXING</Text></>
                            )}
                        </TouchableOpacity>
                    )}
                    {isPreparing && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]} 
                            onPress={() => updateStatus(order.id, 'READY', order.order_type_name)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <ActivityIndicator color="white" size="small" /> : (
                                <><Text style={styles.actionBtnIcon}>✅</Text><Text style={styles.actionBtnText}>FINISH ALL</Text></>
                            )}
                        </TouchableOpacity>
                    )}
                    {isReady && (
                        <View style={[styles.actionBtn, { backgroundColor: '#D1FAE5', flex: 1 }]}>
                            <Text style={styles.actionBtnIcon}>✅</Text>
                            <Text style={[styles.actionBtnText, { color: '#065F46' }]}>STATION READY</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderOrders = () => {
        const pending = orders.filter(o => !['PREPARING', 'READY'].includes((o.status || '').toUpperCase()));
        const preparing = orders.filter(o => (o.status || '').toUpperCase() === 'PREPARING');
        const ready = orders.filter(o => (o.status || '').toUpperCase() === 'READY');

        return (
            <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {/* Stats — no duty card, no stock box */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
                        <Text style={[styles.statVal, { color: '#C2410C' }]}>{pending.length}</Text>
                        <Text style={styles.statLabel}>⏳ Queue</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}>
                        <Text style={[styles.statVal, { color: '#7E22CE' }]}>{preparing.length}</Text>
                        <Text style={styles.statLabel}>🍹 Mixing</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' }]}>
                        <Text style={[styles.statVal, { color: '#065F46' }]}>{ready.length}</Text>
                        <Text style={styles.statLabel}>✅ Ready</Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <View><Text style={styles.sectionTitle}>🍹 Active Beverage Tickets</Text></View>
                    <TouchableOpacity onPress={() => fetchData()} style={styles.refreshBtn}><Text style={styles.refreshBtnText}>↻ Refresh</Text></TouchableOpacity>
                </View>

                {orders.length === 0 ? (
                    <View style={styles.emptyCard}><Text style={styles.emptyTitle}>All Clean! ✨</Text><Text style={styles.emptyText}>No active drink orders right now.</Text></View>
                ) : (
                    <>
                        {pending.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.groupText}>NEW TICKETS ({pending.length})</Text></View>{pending.map(renderOrderCard)}</>}
                        {preparing.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#8B5CF6' }]} /><Text style={styles.groupText}>PREPARING ({preparing.length})</Text></View>{preparing.map(renderOrderCard)}</>}
                        {ready.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#10B981' }]} /><Text style={styles.groupText}>STATION READY ({ready.length})</Text></View>{ready.map(renderOrderCard)}</>}
                    </>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setActiveTab('account')} style={[styles.profileBox, activeTab === 'account' && { borderWidth: 2, borderColor: '#8B5CF6' }]}>
                    {user?.profile_image ? (
                        <Image source={{ uri: user.profile_image.startsWith('http') ? user.profile_image : `${apiConfig.API_BASE_URL}${user.profile_image}` }} style={styles.profileImg} />
                    ) : (
                        <Text style={styles.profileInitial}>{user?.name?.charAt(0)}</Text>
                    )}
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.greeting}>Hello, {user?.name}</Text>
                    <Text style={styles.roleTitle}>Bar Dashboard</Text>
                </View>
                <View style={styles.headerRight}>
                    {!socketConnected && <View style={styles.offlineDot} />}
                    <TouchableOpacity onPress={() => setActiveTab('notifications')} style={styles.notifBtn}>
                        <Text style={{ fontSize: 22 }}>🔔</Text>
                        {notifications.filter(n => n.status === 'unread').length > 0 && <View style={styles.badge} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}><Text style={{ fontSize: 18 }}>🚪</Text></TouchableOpacity>
                </View>
            </View>

            {/* Notification ALERT POPUP */}
            <Modal animationType="fade" transparent={true} visible={alertPopupVisible} onRequestClose={() => setAlertPopupVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.alertPopup}>
                        <View style={[styles.alertHeader, activeAlert?.type === 'CANCEL' && { backgroundColor: '#EF4444' }]}>
                            <Text style={styles.alertEmoji}>{activeAlert?.type === 'CANCEL' ? '🚨' : '🍹'}</Text>
                            <Text style={styles.alertTitle}>{activeAlert?.title}</Text>
                        </View>
                        <View style={styles.alertBody}>
                            <View style={styles.alertRow}>
                                <Text style={styles.alertLabel}>ORDER ID:</Text>
                                <Text style={styles.alertVal}>#{activeAlert?.orderId}</Text>
                            </View>
                            <View style={styles.alertRow}>
                                <Text style={styles.alertLabel}>LOCATION:</Text>
                                <Text style={styles.alertVal}>{activeAlert?.table ? `Table ${activeAlert.table}` : 'Counter'}</Text>
                            </View>
                            {activeAlert?.customer && (
                                <View style={styles.alertRow}>
                                    <Text style={styles.alertLabel}>CUSTOMER:</Text>
                                    <Text style={styles.alertVal}>{activeAlert.customer}</Text>
                                </View>
                            )}
                            {activeAlert?.reason && (
                                <View style={[styles.alertRow, { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, borderBottomWidth: 0 }]}>
                                    <Text style={[styles.alertLabel, { color: '#EF4444' }]}>REASON:</Text>
                                    <Text style={[styles.alertVal, { color: '#991B1B', flex: 1, textAlign: 'right' }]}>{activeAlert.reason}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.alertCloseBtn, activeAlert?.type === 'CANCEL' && { backgroundColor: '#EF4444' }]}
                            onPress={() => { setAlertPopupVisible(false); setActiveTab('orders'); fetchData(); }}
                        >
                            <Text style={styles.alertCloseText}>VIEW ORDERS 📑</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* HISTORY DETAIL MODAL */}
            <Modal visible={showHistoryModal} transparent animationType="slide" onRequestClose={() => setShowHistoryModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.historyModal}>
                        <View style={styles.historyModalHeader}>
                            <View>
                                <Text style={styles.historyModalTitle}>Order History</Text>
                                <Text style={styles.historyModalId}>#{selectedHistoryOrder?.id}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.closeBtn}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ padding: 25 }}>
                            <View style={{ marginBottom: 15 }}>
                                <Text style={{ fontSize: 13, color: '#64748B' }}>Date: {selectedHistoryOrder && new Date(selectedHistoryOrder.created_at).toLocaleString()}</Text>
                                <Text style={{ fontSize: 13, color: '#64748B' }}>Table: {selectedHistoryOrder?.table_number || 'Counter'}</Text>
                                <Text style={{ fontSize: 13, color: '#64748B' }}>Status: {selectedHistoryOrder?.status}</Text>
                            </View>
                            <Text style={{ fontWeight: 'bold', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 5 }}>Beverage Items</Text>
                            {selectedHistoryOrder?.items && (typeof selectedHistoryOrder.items === 'string' ? JSON.parse(selectedHistoryOrder.items) : selectedHistoryOrder.items).map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontWeight: '500' }}>{item.name}</Text>
                                    <Text style={{ color: '#64748B' }}>x{item.quantity}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.alertCloseBtn, { borderRadius: 0 }]} onPress={() => setShowHistoryModal(false)}>
                            <Text style={styles.alertCloseText}>CLOSE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={styles.mainContainer}>
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'history' && (
                    <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                        <View style={styles.sectionHeader}>
                            <View><Text style={styles.sectionTitle}>📜 Bar Order History</Text></View>
                            <TouchableOpacity onPress={() => fetchData()} style={styles.refreshBtn}><Text style={styles.refreshBtnText}>↻ Refresh</Text></TouchableOpacity>
                        </View>
                        {history.length === 0 ? (
                            <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No History</Text><Text style={styles.emptyText}>Completed drink orders appear here.</Text></View>
                        ) : (
                            history.map(order => (
                                <TouchableOpacity
                                    key={order.id}
                                    style={styles.historyCard}
                                    onPress={() => { setSelectedHistoryOrder(order); setShowHistoryModal(true); }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.historyId}>#{order.id} — Table {order.table_number || 'Counter'}</Text>
                                        <Text style={{ fontSize: 18 }}>👁️</Text>
                                    </View>
                                    <Text style={styles.historyDate}>{new Date(order.created_at).toLocaleString()}</Text>
                                    <Text style={styles.historyStatus}>{order.status}</Text>
                                    <Text style={styles.historyItems}>{(order.items || []).length} beverage item(s)</Text>
                                </TouchableOpacity>
                            ))
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
                {activeTab === 'account' && <View style={{ flex: 1, padding: 15 }}><AccountSection /></View>}
                {activeTab === 'notifications' && (
                    <ScrollView style={styles.content}>
                        <Text style={styles.sectionTitle}>Recent Notifications</Text>
                        {notifications.map((n, idx) => (
                            <TouchableOpacity key={idx} onPress={() => setActiveTab('orders')} style={styles.historyCard}>
                                <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>{n.title}</Text>
                                <Text style={{ color: '#64748B', fontSize: 13 }}>{n.message}</Text>
                                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>{new Date(n.created_at).toLocaleTimeString()}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            <View style={styles.bottomNav}>
                {[
                    { key: 'orders', icon: '🍹', label: 'Orders' },
                    { key: 'history', icon: '📜', label: 'History' },
                    { key: 'account', icon: '👤', label: 'Profile' }
                ].map(item => (
                    <TouchableOpacity key={item.key} onPress={() => setActiveTab(item.key)} style={[styles.navItem, activeTab === item.key && styles.activeNav]}>
                        <Text style={[styles.navIcon, activeTab === item.key && styles.activeNavIcon]}>{item.icon}</Text>
                        <Text style={[styles.navLabel, activeTab === item.key && styles.activeNavLabel]}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 14, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 2 },
    profileBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    profileImg: { width: '100%', height: '100%' },
    profileInitial: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    greeting: { fontSize: 11, color: '#64748B' },
    roleTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 4 },
    notifBtn: { position: 'relative', padding: 4 },
    badge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    logoutBtn: { padding: 4 },
    mainContainer: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    dutyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 24, marginBottom: 16, borderLeftWidth: 8 },
    onDutyBg: { backgroundColor: '#F5F3FF', borderLeftColor: '#8B5CF6' },
    offDutyBg: { backgroundColor: '#F1F5F9', borderLeftColor: '#94A3B8' },
    dutyTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    dutySub: { fontSize: 11, color: '#64748B', marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statBox: { flex: 1, padding: 12, borderRadius: 20, alignItems: 'center', borderWidth: 1 },
    statVal: { fontSize: 24, fontWeight: '900' },
    statLabel: { fontSize: 10, color: '#64748B', marginTop: 3 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    refreshBtn: { backgroundColor: '#F5F3FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#C4B5FD' },
    refreshBtnText: { color: '#7E22CE', fontWeight: '700', fontSize: 13 },
    groupLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
    groupDot: { width: 8, height: 8, borderRadius: 4 },
    groupText: { fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
    orderCard: { backgroundColor: 'white', borderRadius: 28, padding: 20, marginBottom: 20, borderLeftWidth: 10, shadowColor: '#1E293B', shadowOpacity: 0.1, shadowRadius: 15, elevation: 6 },
    newOrderBorder: { borderWidth: 2, borderColor: '#EF4444' },
    newBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
    newBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
    orderId: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
    typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    typePillText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    statusPillText: { fontSize: 10, fontWeight: 'bold' },
    cardSubInfo: { fontSize: 12, color: '#64748B', marginTop: 8, lineHeight: 18 },
    timerBox: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 15, backgroundColor: '#F8FAFC', alignItems: 'center' },
    timerUrgent: { backgroundColor: '#FEE2E2' },
    timerText: { fontSize: 18, fontWeight: '800', color: '#475569', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    timerTextUrgent: { color: '#EF4444' },
    itemsBox: { backgroundColor: '#F1F5F9', borderRadius: 20, padding: 16, marginBottom: 18 },
    itemsLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 12 },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    itemCategory: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
    qtyBadge: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    qtyText: { fontSize: 16, fontWeight: '900' },
    itemName: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
    itemNote: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginLeft: 8 },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 18, gap: 10, elevation: 4 },
    actionBtnIcon: { fontSize: 20 },
    actionBtnText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    emptyCard: { backgroundColor: 'white', borderRadius: 32, padding: 40, alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
    emptyText: { color: '#64748B', fontSize: 15, textAlign: 'center' },
    bottomNav: { height: 80, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', paddingBottom: 25, paddingTop: 10 },
    navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navIcon: { fontSize: 22, opacity: 0.4 },
    navLabel: { fontSize: 10, color: '#64748B', marginTop: 4, fontWeight: '600' },
    activeNav: { borderTopWidth: 3, borderTopColor: '#8B5CF6' },
    activeNavIcon: { fontSize: 26, opacity: 1 },
    activeNavLabel: { fontWeight: 'bold', color: '#8B5CF6' },

    // ALERT POPUP
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertPopup: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 32, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
    alertHeader: { backgroundColor: '#8B5CF6', padding: 30, alignItems: 'center' },
    alertEmoji: { fontSize: 50, marginBottom: 10 },
    alertTitle: { color: 'white', fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
    alertBody: { padding: 30 },
    alertRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    alertLabel: { fontSize: 13, color: '#94A3B8', fontWeight: 'bold' },
    alertVal: { fontSize: 16, color: '#1E293B', fontWeight: '900' },
    alertCloseBtn: { backgroundColor: '#8B5CF6', paddingVertical: 22, alignItems: 'center' },
    alertCloseText: { color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 1 },

    // History card styles
    historyCard: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 14, borderLeftWidth: 5, borderLeftColor: '#8B5CF6', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    historyId: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    historyDate: { fontSize: 12, color: '#64748B', marginTop: 4 },
    historyStatus: { fontSize: 13, fontWeight: '700', color: '#8B5CF6', marginTop: 4 },
    historyItems: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

    // History detail modal
    historyModal: { width: '90%', maxWidth: 500, maxHeight: '80%', backgroundColor: 'white', borderRadius: 32, overflow: 'hidden' },
    historyModalHeader: { padding: 25, backgroundColor: '#F5F3FF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyModalTitle: { fontSize: 12, fontWeight: '900', color: '#7C3AED', letterSpacing: 1.5, textTransform: 'uppercase' },
    historyModalId: { fontSize: 32, fontWeight: '900', color: '#1E293B' },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
});

export default BarDashboard;
