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

// ─── Timer Component for Kitchen ──────────────────────────────────────────────
const OrderTimer = ({ createdAt }) => {
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 mins for kitchen
    const timerRef = useRef(null);

    useEffect(() => {
        const calculateTime = () => {
            const start = new Date(createdAt).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - start) / 1000);
            const remaining = Math.max(0, (30 * 60) - elapsed);
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
                {timeLeft > 0 ? formatTime(timeLeft) : '⚠️ LATE'}
            </Text>
        </View>
    );
};

const KitchenDashboard = () => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('orders');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Notification Popup State
    const [alertPopupVisible, setAlertPopupVisible] = useState(false);
    const [activeAlert, setActiveAlert] = useState(null);

    // Detailed Modal State
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailsVisible, setDetailsVisible] = useState(false);
    
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

    // Initialize Notification Sound
    useEffect(() => {
        const loadSound = async () => {
            try {
                const sound = createAudioPlayer(
                    { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }
                );
                soundRef.current = sound;
            } catch (err) {
                console.log('Failed to load kitchen sound:', err);
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
                fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/kitchen/orders`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/kitchen/history`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/notifications`, { headers })
            ]);

                if (orderRes.ok) {
                const data = await orderRes.json();
                const newOrders = (data.orders || []).map(o => ({
                    ...o,
                    // Normalize items for all order types (Dine-in uses items, others might use foodItems)
                    items: o.items || o.foodItems || []
                }));

                const currentIds = new Set(newOrders.map(o => o.id));
                const currentItemSum = newOrders.reduce((sum, o) => (sum + (o.items?.length || 0)), 0);
                
                const hasNewOrder = Array.from(currentIds).some(id => !prevOrderIds.current.has(id));
                const itemsAdded = currentItemSum > prevItemCount.current && !hasNewOrder;

                if ((hasNewOrder || itemsAdded) && isSilent) {
                    playNotificationSound();
                }

                prevOrderIds.current = currentIds;
                prevItemCount.current = currentItemSum;
                setOrders(newOrders);
            }
            if (historyRes.ok) setHistory((await historyRes.json()).history || []);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);
        } catch (error) {
            console.error('Kitchen fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    // Setup Socket.io
    useEffect(() => {
        fetchData();
        
        const socketIO = require('socket.io-client');
        const socket = socketIO(apiConfig.API_BASE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketConnected(true);
            socket.emit('join', 'kitchen_room');
            console.log('[Kitchen] Socket connected & joined kitchen_room');
        });

        socket.on('connect_error', (err) => {
            console.log('[Kitchen] Socket connect_error:', err.message);
            setSocketConnected(false);
        });

        socket.on('disconnect', () => {
            setSocketConnected(false);
        });

        // Handler for new order placed by customer (from customer_qr_scan or other portals)
        socket.on('newOrder', (data) => {
            console.log('[Kitchen] newOrder received:', data);
            
            // Extract items based on data structure
            let orderItems = [];
            if (data.items) {
                orderItems = Array.isArray(data.items) ? data.items : [];
            }
            
            // Filter food items if category information is available
            const foodItems = orderItems.filter(i => {
                const cat = (i.category || i.category_name || i.categoryName || 'Food').toLowerCase();
                return !cat.includes('beverage');
            });
            
            if (foodItems.length > 0 || !data.items) {
                fetchData(true);
                setActiveAlert({
                    title: data.isUpdate ? '🍽️ ORDER UPDATED!' : '🔥 NEW ORDER TICKET!',
                    type: 'NEW_ORDER',
                    orderId: data.orderId || 'NEW',
                    table: data.tableNumber || data.table_number || 'Counter',
                    customer: data.customerName || data.customer_name || 'Guest',
                    items: foodItems
                });
                setAlertPopupVisible(true);
                playNotificationSound();
            }
        });

        socket.on('orderUpdate', (data) => {
            console.log('[Kitchen] orderUpdate received:', data);
            fetchData(true);
            if (data.updatedBy !== 'KITCHEN') {
                setActiveAlert({
                    title: '📋 ORDER UPDATED',
                    type: 'UPDATE',
                    orderId: data.orderId || data.id,
                    status: data.status,
                    table: data.tableNumber || 'N/A'
                });
                setAlertPopupVisible(true);
                playNotificationSound();
            }
        });
        
        socket.on('cancelRequest', (data) => {
            console.log('[Kitchen] cancelRequest received:', data);
            fetchData(true);
            setActiveAlert({
                title: '⚠️ CANCELLATION REQUEST',
                type: 'CANCEL',
                orderId: data.orderId,
                table: data.tableNumber || 'N/A',
                reason: data.reason || 'Customer request'
            });
            setAlertPopupVisible(true);
            playNotificationSound();
        });

        socket.on('orderCancelled', (data) => {
            console.log('[Kitchen] orderCancelled received:', data);
            fetchData(true);
            setActiveAlert({
                title: '🛑 ORDER CANCELLED! STOP!',
                type: 'CANCEL',
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
        
        const interval = setInterval(() => fetchData(true), 15000);
        return () => {
            clearInterval(interval);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [fetchData]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const handleDutyToggle = async () => {
        // Auto check-in only — kitchen staff don't manually toggle
    };

    const updateStatus = async (orderId, newStatus, orderTypeName) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/kitchen/orders/${orderId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: newStatus, type: orderTypeName, isBar: false })
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

    const handleItemStatusUpdate = async (itemId, newStatus) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/kitchen-bar/orders/items/${itemId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchData(true);
                // Subtle vibration for feedback
                Vibration.vibrate(50);
            }
        } catch (error) {
            console.error('Item update failed:', error);
        }
    };

    const getStatusColor = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'PLACED') return '#94A3B8'; // Gray
        if (s === 'CONFIRMED') return '#6366F1'; // Indigo/Deep Blue
        if (s === 'PREPARING') return '#F59E0B'; // Orange
        if (s === 'READY_TO_SERVE') return '#3B82F6'; // Blue
        if (s === 'SERVED') return '#8B5CF6'; // Purple
        if (s === 'COMPLETED') return '#10B981'; // Green
        return '#6B7280';
    };

    const getTypeColor = (typeName) => {
        if (!typeName) return '#3B82F6';
        const t = typeName.toUpperCase();
        if (t.includes('DINE')) return '#3B82F6';
        if (t.includes('TAKEAWAY')) return '#F59E0B';
        if (t.includes('DELIVERY')) return '#10B981';
        return '#64748B';
    };

    // UI RENDER: ORDER TICKET CARD
    const renderOrderCard = (order) => {
        const typeColor = getTypeColor(order.order_type_name);
        const statusColor = getStatusColor(order.status);
        const stationStatus = (order.kitchen_status || '').toUpperCase();
        const isPreparing = stationStatus === 'PREPARING';
        const isReady = stationStatus === 'READY';
        const isTerminal = ['CANCELLED', 'COMPLETED', 'SERVED', 'FINISHED', 'REJECTED'].includes((order.status || '').toUpperCase());
        const isPending = !isPreparing && !isReady && !isTerminal;
        const isVeryRecent = (Date.now() - new Date(order.created_at).getTime()) < 120000;
        const isUpdating = updatingId === order.id;

        return (
            <TouchableOpacity 
                key={`${order.order_type_name}-${order.id}`} 
                style={[styles.orderCard, { borderLeftColor: typeColor }, isVeryRecent && styles.newOrderBorder]}
                onPress={() => { setSelectedOrder(order); setDetailsVisible(true); }}
            >
                {isVeryRecent && (
                    <View style={styles.newBadge}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.newBadgeText}>NEW FOOD TICKET</Text>
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
                                <Text style={[styles.statusPillText, { color: statusColor }]}>{order.main_status || order.status || 'PLACED'}</Text>
                            </View>
                        </View>
                        
                        {/* Requirement #6: Split Status Display */}
                        <View style={styles.splitStatusBox}>
                             <Text style={[styles.splitLabel, (order.kitchen_status || '').toLowerCase() === 'ready' && { color: '#10B981' }]}>
                                🍛 Food: {(order.kitchen_status || 'PENDING').toUpperCase()} { (order.kitchen_status || '').toLowerCase() === 'ready' ? '✓' : '⏳'}
                             </Text>
                             <Text style={[styles.splitLabel, (order.bar_status || '').toLowerCase() === 'ready' && { color: '#10B981' }]}>
                                🍹 Drinks: {(order.bar_status || 'PENDING').toUpperCase()} { (order.bar_status || '').toLowerCase() === 'ready' ? '✓' : '⏳'}
                             </Text>
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
                    <Text style={styles.itemsLabel}>CHEF'S TICKET (TAP ITEM TO UPDATE STATUS)</Text>
                    {order.items?.map((item, idx) => {
                        const itemStatus = (item.item_status || 'pending').toUpperCase();
                        let statusColor = '#94A3B8';
                        if (itemStatus === 'PREPARING') statusColor = '#F59E0B';
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
                                        <Text style={[styles.itemName, itemStatus === 'READY' && { textDecorationLine: 'line-through' }]}>
                                            {item.name}
                                        </Text>
                                        <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: statusColor }}>
                                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: statusColor }}>{itemStatus}</Text>
                                        </View>
                                    </View>
                                    {item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
                                    {item.notes ? (
                                        <View style={styles.noteBox}>
                                            <Text style={styles.itemNote}>📝 {item.notes}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.actionRow}>
                    {isPending && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#3B82F6', flex: 1 }]} 
                            onPress={() => updateStatus(order.id, 'PREPARING', order.order_type_name)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <ActivityIndicator color="white" size="small" /> : (
                                <><Text style={styles.actionBtnIcon}>👨‍🍳</Text><Text style={styles.actionBtnText}>START ALL</Text></>
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
                        <View style={[styles.actionBtn, { backgroundColor: '#F0FDF4', flex: 1, borderWidth: 1, borderColor: '#10B981' }]}>
                            <Text style={styles.actionBtnIcon}>✅</Text>
                            <Text style={[styles.actionBtnText, { color: '#065F46' }]}>FOOD READY</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderOrders = () => {
        const NEW_STATUSES = ['PENDING', 'CONFIRMED', 'ORDER PLACED', 'PLACED', 'ACCEPTED', 'RECEIVED'];
        const preparing = orders.filter(o => ['PREPARING', 'COOKING'].includes((o.status || '').toUpperCase()));
        const ready = orders.filter(o => ['READY', 'READY TO SERVE'].includes((o.status || '').toUpperCase()));
        const pending = orders.filter(o => {
            const s = (o.status || '').toUpperCase();
            return !['PREPARING', 'COOKING', 'READY', 'READY TO SERVE'].includes(s);
        });

        return (
            <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {/* Stats — no duty card, no stock box */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
                        <Text style={[styles.statVal, { color: '#C2410C' }]}>{pending.length}</Text>
                        <Text style={styles.statLabel}>⏳ Queue</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#F0F9FF', borderColor: '#7DD3FC' }]}>
                        <Text style={[styles.statVal, { color: '#0369A1' }]}>{preparing.length}</Text>
                        <Text style={styles.statLabel}>👨‍🍳 Cooking</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' }]}>
                        <Text style={[styles.statVal, { color: '#065F46' }]}>{ready.length}</Text>
                        <Text style={styles.statLabel}>✅ Ready</Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>👨‍🍳 Active Kitchen Tickets</Text>
                        <Text style={styles.sectionSub}>Waiting for preparation</Text>
                    </View>
                    <TouchableOpacity onPress={() => fetchData()} style={styles.refreshBtn}>
                        <Text style={styles.refreshBtnText}>↻ Refresh</Text>
                    </TouchableOpacity>
                </View>

                {orders.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIcon}><Text style={{ fontSize: 40 }}>🍳</Text></View>
                        <Text style={styles.emptyTitle}>No Active Food Tickets</Text>
                        <Text style={styles.emptyText}>New orders will appear here automatically.</Text>
                    </View>
                ) : (
                    <>
                        {pending.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.groupText}>NEW ORDERS ({pending.length})</Text></View>{pending.map(renderOrderCard)}</>}
                        {preparing.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#3B82F6' }]} /><Text style={styles.groupText}>IN PREPARATION ({preparing.length})</Text></View>{preparing.map(renderOrderCard)}</>}
                        {ready.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#10B981' }]} /><Text style={styles.groupText}>READY FOR SERVICE ({ready.length})</Text></View>{ready.map(renderOrderCard)}</>}
                    </>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        );
    };

    const renderHistory = () => {
        if (!history || history.length === 0) {
            return (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No History 📜</Text>
                    <Text style={styles.emptyText}>Completed food orders will appear here.</Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <View style={styles.sectionHeader}>
                    <View><Text style={styles.sectionTitle}>📜 Kitchen Order History</Text></View>
                    <TouchableOpacity onPress={() => fetchData()} style={styles.refreshBtn}><Text style={styles.refreshBtnText}>↻ Refresh</Text></TouchableOpacity>
                </View>
                {history.map(order => (
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
                        <Text style={styles.historyItems}>{(order.items || []).length} food item(s)</Text>
                    </TouchableOpacity>
                ))}
                <View style={{ height: 40 }} />
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setActiveTab('account')} style={[styles.profileBox, activeTab === 'account' && { borderWidth: 2, borderColor: '#10B981' }]}>
                    {user?.profile_image ? (
                        <Image source={{ uri: user.profile_image.startsWith('http') ? user.profile_image : `${apiConfig.API_BASE_URL}${user.profile_image}` }} style={styles.profileImg} />
                    ) : (
                        <Text style={styles.profileInitial}>{user?.name?.charAt(0)}</Text>
                    )}
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.greeting}>Hello Chef, {user?.name}</Text>
                    <Text style={styles.roleTitle}>Kitchen Dashboard</Text>
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
                            <Text style={styles.alertEmoji}>{activeAlert?.type === 'CANCEL' ? '🚨' : '🔥'}</Text>
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
                            {activeAlert?.reason && (
                                <View style={[styles.alertRow, { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, borderBottomWidth: 0 }]}>
                                    <Text style={[styles.alertLabel, { color: '#EF4444' }]}>REASON:</Text>
                                    <Text style={[styles.alertVal, { color: '#991B1B', flex: 1, textAlign: 'right' }]}>{activeAlert.reason}</Text>
                                </View>
                            )}
                            {activeAlert?.items && activeAlert.items.length > 0 && (
                                <View style={styles.alertItemsList}>
                                    <Text style={styles.alertItemsLabel}>FOOD ITEMS:</Text>
                                    {activeAlert.items.slice(0, 5).map((it, idx) => (
                                        <Text key={idx} style={styles.alertItemTxt}>• {it.quantity}x {it.name}</Text>
                                    ))}
                                    {activeAlert.items.length > 5 && <Text style={styles.alertItemMore}>+ {activeAlert.items.length - 5} more...</Text>}
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

            {/* DETAILED ORDER TICKET MODAL */}
            <Modal animationType="slide" transparent={true} visible={detailsVisible} onRequestClose={() => setDetailsVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.detailsModal}>
                        <View style={styles.detailsHeader}>
                            <View>
                                <Text style={styles.detailsTitle}>Order Details</Text>
                                <Text style={styles.detailsId}>#{selectedOrder?.id}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setDetailsVisible(false)} style={styles.closeBtn}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.detailsScroll}>
                            <View style={styles.detailsInfoRow}>
                                <View style={styles.infoCol}>
                                    <Text style={styles.infoLabel}>LOCATION</Text>
                                    <Text style={styles.infoVal}>{selectedOrder?.table_number ? `Table ${selectedOrder.table_number}` : 'Counter'}</Text>
                                </View>
                                <View style={styles.infoCol}>
                                    <Text style={styles.infoLabel}>STEWARD</Text>
                                    <Text style={styles.infoVal}>{selectedOrder?.steward_name || 'System'}</Text>
                                </View>
                            </View>
                            <View style={styles.foodList}>
                                <Text style={styles.foodListTitle}>FOOD ITEMS</Text>
                                {selectedOrder?.items?.map((item, idx) => (
                                    <View key={idx} style={styles.detailItemRow}>
                                        <View style={styles.detailQty}><Text style={styles.detailQtyText}>{item.quantity}x</Text></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.detailItemName}>{item.name}</Text>
                                            <Text style={styles.detailItemCat}>{item.category || 'Food'}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                        <View style={styles.detailsFooter}>
                            <TouchableOpacity
                                style={styles.footerActionBtn}
                                onPress={() => {
                                    if (['PREPARING', 'COOKING'].includes((selectedOrder?.status || '').toUpperCase())) {
                                        updateStatus(selectedOrder.id, 'READY TO SERVE', selectedOrder.order_type_name);
                                    } else {
                                        updateStatus(selectedOrder.id, 'PREPARING', selectedOrder.order_type_name);
                                    }
                                    setDetailsVisible(false);
                                }}
                            >
                                <Text style={styles.footerActionText}>
                                    {['PREPARING', 'COOKING'].includes((selectedOrder?.status || '').toUpperCase()) ? 'MARK AS READY ✅' : 'START PREPARING 🔥'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* HISTORY DETAIL MODAL */}
            <Modal visible={showHistoryModal} transparent animationType="slide" onRequestClose={() => setShowHistoryModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.detailsModal}>
                        <View style={styles.detailsHeader}>
                            <View>
                                <Text style={styles.detailsTitle}>Order History</Text>
                                <Text style={styles.detailsId}>#{selectedHistoryOrder?.id}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.closeBtn}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.detailsScroll}>
                            <View style={{ marginBottom: 15 }}>
                                <Text style={{ fontSize: 13, color: '#64748B' }}>Date: {selectedHistoryOrder && new Date(selectedHistoryOrder.created_at).toLocaleString()}</Text>
                                <Text style={{ fontSize: 13, color: '#64748B' }}>Table: {selectedHistoryOrder?.table_number || 'Counter'}</Text>
                                <Text style={{ fontSize: 13, color: '#64748B' }}>Status: {selectedHistoryOrder?.status}</Text>
                            </View>
                            <Text style={{ fontWeight: 'bold', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 5 }}>Food Items</Text>
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
                {activeTab === 'orders'    && renderOrders()}
                {activeTab === 'history' && renderHistory()}
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
                    { key: 'orders', icon: '🍳', label: 'Orders' },
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
    profileBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
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
    onDutyBg: { backgroundColor: '#ECFDF5', borderLeftColor: '#10B981' },
    offDutyBg: { backgroundColor: '#F1F5F9', borderLeftColor: '#94A3B8' },
    dutyTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    dutySub: { fontSize: 11, color: '#64748B', marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statBox: { flex: 1, padding: 12, borderRadius: 20, alignItems: 'center', borderWidth: 1 },
    statVal: { fontSize: 24, fontWeight: '900' },
    statLabel: { fontSize: 10, color: '#64748B', marginTop: 3 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    refreshBtn: { backgroundColor: '#F0FDF4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#6EE7B7' },
    refreshBtnText: { color: '#059669', fontWeight: '700', fontSize: 13 },
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
    stewardInfo: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
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
    noteBox: { backgroundColor: 'white', borderRadius: 10, padding: 8, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
    itemNote: { fontSize: 12, color: '#64748B', fontStyle: 'italic', },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 18, gap: 10, elevation: 4 },
    actionBtnIcon: { fontSize: 20 },
    actionBtnText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

    // ALERT POPUP
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertPopup: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 32, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
    alertHeader: { backgroundColor: '#10B981', padding: 30, alignItems: 'center' },
    alertEmoji: { fontSize: 50, marginBottom: 10 },
    alertTitle: { color: 'white', fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
    alertBody: { padding: 30 },
    alertRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    alertLabel: { fontSize: 13, color: '#94A3B8', fontWeight: 'bold' },
    alertVal: { fontSize: 16, color: '#1E293B', fontWeight: '900' },
    alertCloseBtn: { backgroundColor: '#10B981', paddingVertical: 22, alignItems: 'center' },
    alertCloseText: { color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 1 },

    emptyCard: { backgroundColor: 'white', borderRadius: 32, padding: 40, alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
    emptyText: { color: '#64748B', fontSize: 15, textAlign: 'center' },
    bottomNav: { height: 80, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', paddingBottom: 25, paddingTop: 10 },
    navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navIcon: { fontSize: 22, opacity: 0.4 },
    navLabel: { fontSize: 10, color: '#64748B', marginTop: 4, fontWeight: '600' },
    activeNav: { borderTopWidth: 3, borderTopColor: '#10B981' },
    activeNavIcon: { fontSize: 26, opacity: 1 },
    activeNavLabel: { fontWeight: 'bold', color: '#10B981' },

    // Alert Details
    alertItemsList: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    alertItemsLabel: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold', marginBottom: 8 },
    alertItemTxt: { fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 4 },
    alertItemMore: { fontSize: 12, color: '#10B981', fontWeight: 'bold', fontStyle: 'italic', marginTop: 4 },

    // Details Modal
    detailsModal: { width: '90%', maxWidth: 500, maxHeight: '80%', backgroundColor: 'white', borderRadius: 32, overflow: 'hidden' },
    detailsHeader: { padding: 25, backgroundColor: '#F8FAFC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailsTitle: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase' },
    detailsId: { fontSize: 32, fontWeight: '900', color: '#1E293B' },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    detailsScroll: { padding: 25 },
    detailsInfoRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
    infoCol: { flex: 1, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 20 },
    infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '900', marginBottom: 5 },
    infoVal: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    foodListTitle: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 15 },
    detailItemRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    detailQty: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' },
    detailQtyText: { color: '#3B82F6', fontWeight: '900', fontSize: 16 },
    detailItemName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    detailItemCat: { fontSize: 12, color: '#64748B', marginTop: 2 },
    detailNoteBox: { backgroundColor: '#FFFBEB', padding: 10, borderRadius: 12, marginTop: 8 },
    detailNoteText: { fontSize: 13, color: '#92400E', fontStyle: 'italic' },
    detailsFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    footerActionBtn: { backgroundColor: '#10B981', height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    footerActionText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
    foodList: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, marginBottom: 10 },
    splitStatusBox: { flexDirection: 'row', gap: 12, marginTop: 10, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 12 },
    splitLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },

    // History card styles
    historyCard: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 14, borderLeftWidth: 5, borderLeftColor: '#10B981', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    historyId: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    historyDate: { fontSize: 12, color: '#64748B', marginTop: 4 },
    historyStatus: { fontSize: 13, fontWeight: '700', color: '#10B981', marginTop: 4 },
    historyItems: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});

export default KitchenDashboard;
