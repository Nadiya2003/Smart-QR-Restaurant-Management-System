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
    const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 mins for kitchen
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
    const isLate = timeLeft === 0;

    return (
        <View style={[styles.timerBox, isUrgent && styles.timerUrgent, isLate && styles.timerLate]}>
            <Text style={[styles.timerLabel, isUrgent && !isLate && styles.timerLabelUrgent, isLate && { color: '#FFFFFF' }]}>{isLate ? 'OVERDUE' : 'TIME'}</Text>
            <Text style={[styles.timerText, isUrgent && !isLate && styles.timerTextUrgent, isLate && { color: '#FFFFFF' }]}>
                {isLate ? '⚠️ LATE' : formatTime(timeLeft)}
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
    const [isOnDuty, setIsOnDuty] = useState(true);
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

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', onPress: logout }
        ]);
    };

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
                
                // Deduplicate orders
                const uniqueOrders = Array.from(new Map(newOrders.map(o => [o.id, o])).values());
                setOrders(uniqueOrders);
            }
            if (historyRes.ok) {
                const hData = await historyRes.json();
                const uniqueHist = Array.from(new Map((hData.history || []).map(h => [h.id, h])).values());
                setHistory(uniqueHist);
            }
            if (notifRes.ok) {
                const nData = await notifRes.json();
                const uniqueNotifs = Array.from(new Map((nData.notifications || []).map(n => [n.id || (Date.now().toString()+Math.random()), n])).values());
                setNotifications(uniqueNotifs);
            }
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
                    title: data.isUpdate ? '🍽️ ORDER UPDATED!' : '🔥 NEW ORDER!',
                    message: data.isUpdate ? 'Order details changed' : 'New Order Started - Begin Preparation',
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
                table: data.tableNumber || data.table_number || 'N/A',
                reason: data.reason || 'Customer request'
            });
            setAlertPopupVisible(true);
            playNotificationSound();
        });

        socket.on('orderCancelled', (data) => {
            console.log('[Kitchen] orderCancelled received:', data);
            fetchData(true);
            
            // Only alert if it's the full order or specifically includes food
            if (!data.department || data.department === 'KITCHEN') {
                setActiveAlert({
                    title: '🛑 ORDER CANCELLED! STOP!',
                    type: 'CANCEL',
                    orderId: data.orderId || data.id,
                    table: data.tableNumber || data.table_number || 'N/A',
                    reason: data.reason || 'Order terminated'
                });
                setAlertPopupVisible(true);
                playNotificationSound();
            }
        });

        socket.on('itemCancelled', (data) => {
            console.log('[Kitchen] itemCancelled received:', data);
            fetchData(true);
            if (!data.department || data.department === 'KITCHEN') {
                setActiveAlert({
                    title: '⚠️ ITEM REMOVED!',
                    type: 'CANCEL',
                    orderId: data.orderId,
                    message: `Item "${data.itemName}" was removed from Order #${data.orderId} (T-${data.tableNumber})`,
                    table: data.tableNumber || 'N/A',
                    color: '#F87171'
                });
                setAlertPopupVisible(true);
                playNotificationSound();
            }
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
        const isTerminal = ['CANCELLED', 'COMPLETED', 'SERVED', 'FINISHED', 'REJECTED', 'READY', 'READY TO SERVE', 'READY_TO_SERVE'].includes((order.status || '').toUpperCase()) || (order.kitchen_status || '').toUpperCase() === 'READY';
        const hasPendingItems = order.items?.some(i => (i.item_status || 'PENDING').toUpperCase() === 'PENDING');
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                            <Text style={styles.orderId}>#{order.id}</Text>
                            <View style={styles.largeTableBadge}>
                                <Text style={styles.largeTableText}>
                                    {order.order_type_name?.includes('TAKE') ? 'WALK-IN' : 
                                     order.order_type_name?.includes('DELI') ? 'DELIVERY' : 
                                     `T-${order.table_number || order.tableNumber || 'C'}`}
                                </Text>
                            </View>
                            <View style={[styles.typePill, { backgroundColor: typeColor }]}>
                                <Text style={styles.typePillText}>{(order.order_type_name || 'DINE-IN').replace('_', ' ')}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.cardSubInfoRow}>
                            <View style={[styles.highlightPill, { backgroundColor: '#F1F5F9' }]}>
                                <Text style={styles.highlightEmoji}>👤</Text>
                                <Text style={styles.highlightTitle}>STEWARD</Text>
                                <Text style={styles.highlightVal}>{order.steward_name || 'System'}</Text>
                            </View>
                        </View>

                        {/* Customer Info */}
                        <Text style={styles.customerNameRow}>👤 {order.customer_name || 'Guest Customer'}</Text>

                        {/* Requirement #6: Split Status Display */}
                        <View style={styles.splitStatusContainer}>
                             <View style={styles.splitStatusItem}>
                                <Text style={[styles.splitEmoji, (order.kitchen_status || '').toLowerCase() === 'ready' && styles.readyEmoji]}>🍛</Text>
                                <Text style={[styles.splitValue, (order.kitchen_status || '').toLowerCase() === 'ready' && styles.readyText]}>
                                    {(order.kitchen_status || 'PENDING').toUpperCase()}
                                </Text>
                             </View>
                             <View style={styles.splitDivider} />
                             <View style={styles.splitStatusItem}>
                                <Text style={[styles.splitEmoji, (order.bar_status || '').toLowerCase() === 'ready' && styles.readyEmoji]}>🍹</Text>
                                <Text style={[styles.splitValue, (order.bar_status || '').toLowerCase() === 'ready' && styles.readyText]}>
                                    {(order.bar_status || 'PENDING').toUpperCase()}
                                </Text>
                             </View>
                        </View>
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
                                    if (isTerminal) return;
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
                    {(isPending || hasPendingItems) && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#3B82F6', flex: 1 }]} 
                            onPress={() => updateStatus(order.id, 'PREPARING', order.order_type_name)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <ActivityIndicator color="white" size="small" /> : (
                                <><Text style={styles.actionBtnIcon}>👨‍🍳</Text><Text style={styles.actionBtnText}>{isPreparing ? 'PREPARE NEW ITEMS' : 'START PREPARING'}</Text></>
                            )}
                        </TouchableOpacity>
                    )}
                    {isPreparing && !hasPendingItems && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]} 
                            onPress={() => updateStatus(order.id, 'READY', order.order_type_name)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <ActivityIndicator color="white" size="small" /> : (
                                <><Text style={styles.actionBtnIcon}>✅</Text><Text style={styles.actionBtnText}>READY TO SERVE</Text></>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const [orderSubTab, setOrderSubTab] = useState('DINE-IN');

    const renderOrders = () => {
        const filteredByType = orders.filter(o => (o.order_type_name || 'DINE-IN').replace('_', '-').toUpperCase() === (orderSubTab === 'DINE-IN' ? 'DINE-IN' : orderSubTab));
        
        const preparing = filteredByType.filter(o => ['PREPARING', 'COOKING'].includes((o.status || '').toUpperCase()));
        const ready = filteredByType.filter(o => ['READY', 'READY TO SERVE', 'READY_TO_SERVE'].includes((o.status || '').toUpperCase()));
        const terminal = filteredByType.filter(o => ['CANCELLED', 'COMPLETED', 'SERVED', 'FINISHED', 'REJECTED'].includes((o.status || '').toUpperCase()));
        const pending = filteredByType.filter(o => {
            const s = (o.status || '').toUpperCase();
            return !['PREPARING', 'COOKING', 'READY', 'READY TO SERVE', 'READY_TO_SERVE'].includes(s) && 
                   !['CANCELLED', 'COMPLETED', 'SERVED', 'FINISHED', 'REJECTED'].includes(s);
        });

        // Counts for tabs
        const getCount = (type) => orders.filter(o => 
            (o.order_type_name || 'DINE-IN').replace('_', '-').toUpperCase() === type && 
            !['COMPLETED', 'CANCELLED', 'REJECTED'].includes((o.status || '').toUpperCase())
        ).length;

        return (
            <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {/* Order Type Tabs */}
                <View style={styles.subTabRow}>
                    {[
                        { key: 'DINE-IN', label: 'Dine-In', icon: '🍽️' },
                        { key: 'TAKEAWAY', label: 'Takeaway', icon: '🥡' },
                        { key: 'DELIVERY', label: 'Delivery', icon: '🚚' }
                    ].map(tab => (
                        <TouchableOpacity 
                            key={tab.key} 
                            style={[styles.subTab, orderSubTab === tab.key && styles.activeSubTab]}
                            onPress={() => setOrderSubTab(tab.key)}
                        >
                            <Text style={[styles.subTabText, orderSubTab === tab.key && styles.activeSubTabText]}>
                                {tab.icon} {tab.label} ({getCount(tab.key)})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stats */}
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
                        <Text style={styles.sectionTitle}>👨‍🍳 {orderSubTab.replace('-', ' ')} Tickets</Text>
                        <Text style={styles.sectionSub}>Active and Recently Completed</Text>
                    </View>
                    <TouchableOpacity onPress={() => fetchData()} style={styles.refreshBtn}>
                        <Text style={styles.refreshBtnText}>↻ Refresh</Text>
                    </TouchableOpacity>
                </View>

                {filteredByType.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIcon}><Text style={{ fontSize: 40 }}>✨</Text></View>
                        <Text style={styles.emptyTitle}>No {orderSubTab.replace('-', ' ')} Tickets</Text>
                        <Text style={styles.emptyText}>New orders will appear here automatically.</Text>
                    </View>
                ) : (
                    <>
                        {pending.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.groupText}>NEW ORDERS ({pending.length})</Text></View>{pending.map(renderOrderCard)}</>}
                        {preparing.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#3B82F6' }]} /><Text style={styles.groupText}>IN PREPARATION ({preparing.length})</Text></View>{preparing.map(renderOrderCard)}</>}
                        {ready.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#10B981' }]} /><Text style={styles.groupText}>READY FOR SERVICE ({ready.length})</Text></View>{ready.map(renderOrderCard)}</>}
                        {terminal.length > 0 && <><View style={styles.groupLabel}><View style={[styles.groupDot, { backgroundColor: '#64748B' }]} /><Text style={styles.groupText}>COMPLETED ORDERS ({terminal.length})</Text></View>{terminal.map(renderOrderCard)}</>}
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
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => setActiveTab('account')} style={styles.userInfo}>
                        <View style={styles.avatarWrapper}>
                            {user?.profile_image ? (
                                <Image source={{ uri: user.profile_image.startsWith('http') ? user.profile_image : `${apiConfig.API_BASE_URL}${user.profile_image}` }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarInitial}>{user?.name?.charAt(0)}</Text>
                            )}
                            <View style={styles.onlineIndicator} />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.userName}>{user?.name || 'Chef'}</Text>
                            <View style={styles.roleTag}>
                                <Text style={styles.roleTagText}>KITCHEN LEAD</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerActions}>
                        <TouchableOpacity 
                            onPress={() => setActiveTab('notifications')} 
                            style={[styles.iconBtn, activeTab === 'notifications' && styles.activeIconBtn]}
                        >
                            <Text style={{ fontSize: 20 }}>🔔</Text>
                            {notifications.filter(n => n.status === 'unread').length > 0 && <View style={styles.notifBadge} />}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleLogout} style={[styles.iconBtn, { marginLeft: 8 }]}>
                            <Text style={{ fontSize: 20 }}>🚪</Text>
                        </TouchableOpacity>

                        {!socketConnected && <View style={styles.offlineWarning}><Text style={styles.offlineText}>OFFLINE</Text></View>}
                    </View>
                </View>
                
                {activeTab === 'notifications' && (
                    <TouchableOpacity onPress={() => setActiveTab('orders')} style={styles.backLink}>
                        <Text style={styles.backLinkText}>← Back to Orders</Text>
                    </TouchableOpacity>
                )}
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
                            {activeAlert?.message && (
                                <View style={[styles.alertRow, { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderBottomWidth: 0, marginTop: 8 }]}>
                                    <Text style={[styles.alertVal, { textAlign: 'center', width: '100%', color: '#475569', fontSize: 13 }]}>{activeAlert.message}</Text>
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
                        {!['CANCELLED', 'COMPLETED', 'SERVED', 'FINISHED', 'REJECTED', 'READY', 'READY TO SERVE', 'READY_TO_SERVE'].includes((selectedOrder?.status || '').toUpperCase()) && (
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
                                        {['PREPARING', 'COOKING'].includes((selectedOrder?.status || '').toUpperCase()) ? 'READY TO SERVE ✅' : 'START PREPARING 🔥'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
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
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    
    // Header Styles
    header: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarWrapper: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    avatarImg: { width: '100%', height: '100%', borderRadius: 16 },
    avatarInitial: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    onlineIndicator: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: 'white' },
    userName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
    roleTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
    roleTagText: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    activeIconBtn: { backgroundColor: '#E2E8F0' },
    notifBadge: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: 'white' },
    
    // Sub Tab Styles
    subTabRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 20 },
    subTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeSubTab: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    subTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    activeSubTabText: { color: '#0F172A' },

    offlineWarning: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FEF2F2' },
    offlineText: { color: '#EF4444', fontSize: 10, fontWeight: 'bold' },
    backLink: { marginTop: 12, paddingVertical: 4 },
    backLinkText: { color: '#3B82F6', fontWeight: '700', fontSize: 13 },

    mainContainer: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
    
    // Stats Styles
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statBox: { flex: 1, padding: 16, borderRadius: 24, backgroundColor: 'white', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    statVal: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
    statLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 4 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
    sectionSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
    refreshBtn: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    refreshBtnText: { color: '#0F172A', fontWeight: '800', fontSize: 13 },

    groupLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 },
    groupDot: { width: 10, height: 10, borderRadius: 5 },
    groupText: { fontSize: 12, fontWeight: '900', color: '#475569', letterSpacing: 1.5 },

    // Card Styles
    orderCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 8 },
    newOrderBorder: { borderWidth: 2, borderColor: '#EF4444' },
    newBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
    newBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    cardIdRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    largeTableBadge: { backgroundColor: '#0F172A', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12 },
    largeTableText: { color: 'white', fontSize: 22, fontWeight: '900' },
    orderId: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
    typePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    typePillText: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    cardSubInfoRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
    highlightPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
    highlightEmoji: { fontSize: 14 },
    highlightTitle: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5 },
    highlightVal: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
    customerNameRow: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 16, marginLeft: 4 },
    
    // Split Status
    splitStatusContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 20, alignItems: 'center' },
    splitStatusItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    splitEmoji: { fontSize: 16, opacity: 0.5 },
    readyEmoji: { opacity: 1 },
    splitValue: { fontSize: 12, fontWeight: '800', color: '#64748B' },
    readyText: { color: '#10B981' },
    splitDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 10 },

    timerBox: { padding: 12, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', minWidth: 80 },
    timerUrgent: { backgroundColor: '#FEF2F2' },
    timerLate: { backgroundColor: '#EF4444' },
    timerLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
    timerLabelUrgent: { color: '#EF4444' },
    timerText: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    timerTextUrgent: { color: '#EF4444' },

    itemsBox: { backgroundColor: '#F8FAFC', borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    itemsLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginBottom: 16 },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: 'white', padding: 12, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1 },
    itemName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    itemCategory: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    qtyBadge: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    qtyText: { fontSize: 16, fontWeight: '900' },
    noteBox: { backgroundColor: '#FFFBEB', padding: 8, borderRadius: 10, marginTop: 4 },
    itemNote: { fontSize: 11, color: '#D97706', fontWeight: '600' },

    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flexDirection: 'row', height: 60, borderRadius: 24, justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    actionBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
    actionBtnIcon: { fontSize: 22 },

    // Navigation Styles
    bottomNav: { flexDirection: 'row', backgroundColor: 'white', height: 85, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingBottom: 25, paddingHorizontal: 20 },
    navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navIcon: { fontSize: 24, opacity: 0.4 },
    activeNavIcon: { opacity: 1 },
    navLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 4 },
    activeNavLabel: { color: '#0F172A' },
    activeNav: { borderTopWidth: 4, borderTopColor: '#0F172A' },

    // Extras
    emptyCard: { flex: 1, marginTop: 60, alignItems: 'center' },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 20 },
    emptyText: { fontSize: 14, color: '#64748B', marginTop: 8 },
    historyCard: { backgroundColor: 'white', padding: 20, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    logoutBtn: { padding: 10 },
    
    // Modal & Popups
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertPopup: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 32, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
    alertHeader: { backgroundColor: '#10B981', padding: 30, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 15 },
    alertEmoji: { fontSize: 30 },
    alertTitle: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    alertBody: { padding: 30 },
    alertRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    alertLabel: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold' },
    alertVal: { fontSize: 15, color: '#0F172A', fontWeight: '900' },
    alertCloseBtn: { backgroundColor: '#10B981', paddingVertical: 20, alignItems: 'center' },
    alertCloseText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    alertItemsList: { marginTop: 10 },
    alertItemsLabel: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold', marginBottom: 8 },
    alertItemTxt: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
    alertItemMore: { fontSize: 12, color: '#10B981', fontWeight: 'bold', fontStyle: 'italic' },

    detailsModal: { backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, width: '100%', maxHeight: '90%', position: 'absolute', bottom: 0, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
    detailsHeader: { padding: 30, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailsTitle: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 2 },
    detailsId: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginTop: 4 },
    closeBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    detailsScroll: { padding: 30 },
    detailsInfoRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
    infoCol: { flex: 1, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '900', marginBottom: 5 },
    infoVal: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    foodList: { marginTop: 20 },
    foodListTitle: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginBottom: 20 },
    detailItemRow: { flexDirection: 'row', gap: 16, marginBottom: 24, alignItems: 'center' },
    detailQty: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    detailQtyText: { color: '#0F172A', fontWeight: '900', fontSize: 16 },
    detailItemName: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
    detailItemCat: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
    detailsFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    footerActionBtn: { backgroundColor: '#0F172A', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    footerActionText: { color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 1 },

    // History styles
    historyId: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    historyDate: { fontSize: 12, color: '#64748B', marginTop: 4 },
    historyStatus: { fontSize: 12, fontWeight: '900', color: '#10B981', marginTop: 6, textTransform: 'uppercase' },
    historyItems: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
});

export default KitchenDashboard;
