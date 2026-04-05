import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, Dimensions, Switch, Vibration, Platform,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useAuth } from '../../context/AuthContext';
import apiConfig from '../../config/api';
import AccountSection from '../AccountSection';
import { io } from 'socket.io-client';

const { width } = Dimensions.get('window');
const HORIZ_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - (HORIZ_PADDING * 2) - CARD_GAP) / 2;

const StewardDashboard = () => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Data States
    const [tables, setTables] = useState([]);
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [isOnDuty, setIsOnDuty] = useState(false);
    const [diningAreas, setDiningAreas] = useState([]);
    const [cart, setCart] = useState([]);
    const [stewardStats, setStewardStats] = useState({ rating: 5.0, points: 0, review_count: 0 });

    // Modal States
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [orderDetail, setOrderDetail] = useState(null);
    const [showAddItems, setShowAddItems] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatusOrder, setSelectedStatusOrder] = useState(null);
    const [selectedMenuCategory, setSelectedMenuCategory] = useState('');
    const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // New Order System States
    const [activeOrderContext, setActiveOrderContext] = useState(null); // { table, orderId, type: 'new' | 'update' }
    const [showCart, setShowCart] = useState(false);

    // Cross-platform Filter Modal
    const [filterModal, setFilterModal] = useState({ show: false, title: '', placeholder: '', value: '', type: '', onSubmit: null });
    // Unified Notification Queue (Requirement: No overlapping popups)
    const [modalQueue, setModalQueue] = useState([]); // [{ type, data }]
    const activeModal = modalQueue[0] || null;

    const pushToQueue = (type, data) => {
        setModalQueue(prev => [...prev, { type, data }]);
    };

    const nextModal = () => {
        setModalQueue(prev => prev.slice(1));
    };

    // Reservation & Table Filters (Restore missing states)
    const [filterResDate, setFilterResDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTableDate, setFilterTableDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTableTime, setFilterTableTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));


    // Notification log
    const [readyAlerts, setReadyAlerts] = useState([]);
    const notifiedIds = useRef(new Set());
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const playNotificationSound = async () => {
        try {
            // Short notification buzzer
            const sound = createAudioPlayer(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }
            );
            sound.play();
            // In expo-audio, we don't need to manually unload for brief sounds usually, 
            // but we can manage instances if needed.
        } catch (error) {
            console.warn('Sound play error:', error);
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            // Parallel fetches
            const [tableRes, orderRes, notifRes, menuRes, dutyRes, resvRes, statsRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/tables?date=${filterTableDate}&time=${filterTableTime}`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/orders/steward/${user.id}`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/notifications`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/menu`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/duty/status`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/reservations?date=${filterResDate}`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/my-stats`, { headers })
            ]);

            if (tableRes.ok) {
                const data = await tableRes.json().catch(() => ({}));
                setTables(data.tables || []);
            }
            if (orderRes.ok) {
                const data = await orderRes.json().catch(() => ({}));
                setOrders(data.orders || []);
            }
            if (notifRes.ok) {
                const data = await notifRes.json().catch(() => ({}));
                setNotifications(data.notifications || []);
            }
            if (menuRes.ok) {
                const menuData = await menuRes.json().catch(() => []);
                setMenuItems(menuData || []);

                // Set default category if not set
                if (Array.isArray(menuData) && menuData.length > 0 && !selectedMenuCategory) {
                    const cats = [...new Set(menuData.map(item => item.category))];
                    if (cats.length > 0) setSelectedMenuCategory(cats[0]);
                }
            }

            if (dutyRes.ok) setIsOnDuty((await dutyRes.json()).onDuty);
            if (resvRes.ok) setReservations((await resvRes.json()).reservations || []);
            if (statsRes.ok) setStewardStats(await statsRes.json());

            // Fetch dining areas for grouping
            const areaRes = await fetch(`${apiConfig.API_BASE_URL}/api/admin/areas`, { headers });
            if (areaRes.ok) setDiningAreas((await areaRes.json()).areas || []);

            // Fetch history with 'all' filter to show total completed orders correctly
            const histRes = await fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/orders/history/${user.id}?filter=all`, { headers });
            if (histRes.ok) {
                const histData = await histRes.json();
                setHistory(histData.orders || []);
            }
        } catch (error) {
            console.error('Steward fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, user.id, filterResDate, filterTableDate, filterTableTime, selectedMenuCategory]);

    const appendNotification = (title, message, extras = {}) => {
        setNotifications(prev => [{
            id: Date.now().toString() + Math.random().toString(),
            title,
            message,
            status: 'unread',
            created_at: new Date().toISOString(),
            ...extras
        }, ...prev]);
    };

    useEffect(() => {
        fetchData();
        // Set up polling (every 10 seconds) for real-time feel
        const interval = setInterval(() => {
            fetchData(true);
        }, 10000);

        // Set up real-time socket for notifications
        const socket = io(apiConfig.API_BASE_URL, {
            transports: ['websocket']
        });

        socket.on('orderUpdate', (data) => {
            // Requirement #1: Reliable popups for status updates
            if (data.staffId === user.id || !data.staffId) {
                Vibration && Vibration.vibrate([100, 200, 100, 200]);
                playNotificationSound();

                if (data.action === 'ITEM_REMOVED') {
                    pushToQueue('UPDATE', { ...data, title: 'Item Cancelled!', message: 'A customer dropped an item from Order #' + data.orderId, color: '#FCD34D' });
                    appendNotification('Item Removed 🗑️', `Order #${data.orderId} item altered.`);
                } else if (data.status && data.status !== 'SESSION_ENDED') {
                    pushToQueue('UPDATE', {
                        ...data,
                        title: 'Status Updated 🔔',
                        message: `Order #${data.orderId} is now ${data.status.replace(/_/g, ' ')}.`,
                        color: data.status === 'READY' || data.status === 'READY_TO_SERVE' ? '#A7F3D0' : '#DBEAFE'
                    });
                    appendNotification('Order Updated', `Order #${data.orderId} status changed to ${data.status}`);
                }

                fetchData(true);
            }
        });

        // Real-time table updates (Requirement #5)
        socket.on('tableUpdate', (data) => {
            console.log('Real-time Table Update:', data);
            fetchData(true); // Refetch to stay in sync with unified state
        });

        socket.on('newOrder', (data) => {
            // Requirement #1: Reliable sound + Popup for NEW orders
            if (!data.staffId || data.staffId === user.id) {
                Vibration && Vibration.vibrate([200, 100, 200]);
                playNotificationSound();
                appendNotification('New Order Placed 🥗', `Table ${data.tableNumber || 'Counter'} has placed Order #${data.orderId}`, { type: 'NEW_ORDER', refId: data.orderId });
                pushToQueue('NEW_ORDER', {
                    ...data,
                    title: "NEW ORDER RECEIVED! 🥗",
                    orderId: data.orderId || 'NEW',
                    tableNumber: data.tableNumber || 'Counter',
                    customerName: data.customerName || 'Guest'
                });
                fetchData(true);
            }
        });

        socket.on('paymentRequest', (data) => {
            if (!data.staffId || data.staffId === user.id) {
                Vibration && Vibration.vibrate([100, 50, 100, 50, 100]);
                if (data.playSound || true) playNotificationSound();
                appendNotification('Payment Pending 💰', `Table ${data.tableNumber} is ready to settle. Amount: Rs. ${data.total}`, { type: 'PAYMENT_REQ', method: data.method });
                pushToQueue('PAYMENT', data);
                fetchData(true);
            }
        });

        socket.on('cancelRequest', (data) => {
            if (data.staffId === user.id) {
                Vibration && Vibration.vibrate([300, 150, 300]);
                if (data.playSound || true) playNotificationSound();
                appendNotification('Cancel Request 🚫', `Table ${data.tableNumber} wants to cancel: "${data.reason}".`, { type: 'CANCEL_REQ', refId: data.orderId });
                pushToQueue('CANCEL', data);
                fetchData(true);
            }
        });

        socket.on('orderCancelled', (data) => {
            Vibration && Vibration.vibrate([100, 50, 400]);
            playNotificationSound();
            fetchData(true);
            appendNotification('Order Cancelled 🛑', `Order #${data.orderId} for Table ${data.tableNumber} cancelled officially.`);
            pushToQueue('CANCEL', {
                ...data,
                title: '🛑 ORDER CANCELLED!',
                message: `Table ${data.tableNumber} order #${data.orderId} has been cancelled. STOP preparation and clear table if needed.`,
                color: '#EF4444'
            });
        });

        // VOICE NOTIFICATION (Requirement: Voice sound for ready orders)
        socket.on('orderReadyNotify', (data) => {
            // Prevent duplicate announcements
            if (notifiedIds.current.has(data.orderId)) return;
            notifiedIds.current.add(data.orderId);

            try {
                const message = `Table ${data.tableNumber} order is ready`;
                Speech.speak(message, {
                    pitch: 1.0,
                    rate: 0.9,
                    onStart: () => Vibration.vibrate([0, 100, 50, 100])
                });
                appendNotification('Order Ready to Serve 🛎️', message);
                fetchData(true);
            } catch (err) {
                console.warn('Speech error:', err);
            }
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [fetchData, user.id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDutyToggle = async () => {
        const endpoint = isOnDuty ? 'check-out' : 'check-in';
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/duty/${endpoint}`, {
                method: 'POST',
                headers
            });
            if (res.ok) {
                setIsOnDuty(!isOnDuty);
                Alert.alert('Status Updated', `You are now ${!isOnDuty ? 'ON DUTY' : 'OFF DUTY'}`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update duty status');
        }
    };

    const handleUpdateStatus = async (orderId, status) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status, type: 'DINE-IN' })
            });

            if (res.ok) {
                fetchData();
            } else {
                const err = await res.json();
                if (err.message && err.message.includes('Payment pending')) {
                    Alert.alert('Payment Required', err.message);
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleProcessPayment = async (orderId, method) => {
        setLoading(true);
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: 'COMPLETED', type: 'DINE-IN' })
            });

            if (res.ok) {
                nextModal(); // Clear current payment modal
                fetchData();
                Alert.alert('Success', 'Order completed and closed across all sections.');
            } else {
                const err = await res.json();
                Alert.alert('Error', err.message || 'Failed to complete order');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to process payment completion');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!cancelReason) return Alert.alert('Error', 'Please provide a reason');
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/orders/${orderDetail.id}/cancel-request`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reason: cancelReason })
            });
            if (res.ok) {
                setShowCancelModal(false);
                setCancelReason('');
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to send request');
        }
    };

    const addToCart = (menuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === menuItem.id);
            if (existing) {
                return prev.map(i => i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...menuItem, quantity: 1 }];
        });
        Vibration && Vibration.vibrate(50);
    };

    const removeFromCart = (itemId) => {
        setCart(prev => prev.filter(i => i.id !== itemId));
    };

    const updateCartQty = (itemId, delta) => {
        setCart(prev => prev.map(i => {
            if (i.id === itemId) {
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));
    };

    const placeFinalOrder = async () => {
        if (!activeOrderContext) return Alert.alert('Error', 'No table selected');
        if (cart.length === 0) return Alert.alert('Empty Cart', 'Please add items before placing order');

        setLoading(true);
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/orders/dine-in`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    table_number: activeOrderContext.table.table_number,
                    steward_id: user.id,
                    order_id: activeOrderContext.orderId, // Existing order ID for updates
                    items: cart.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        category: item.category,
                        quantity: item.quantity
                    })),
                    total_price: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                })
            });

            if (res.ok) {
                const data = await res.json();
                setCart([]);
                setShowCart(false);
                setActiveOrderContext(null);
                setActiveTab('orders');
                fetchData();
            } else {
                console.error('Order Failed');
            }
        } catch (error) {
            console.error('Place order error:', error);
            Alert.alert('Error', 'Failed to reach server');
        } finally {
            setLoading(false);
        }
    };


    const handleRemovePlacedItem = async (orderId, itemId, itemName) => {
        Alert.alert(
            'Remove Item',
            `Are you sure you want to remove "${itemName}" from Order #${orderId}? This will update the total price automatically.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await fetch(`${apiConfig.API_BASE_URL}/api/orders/${orderId}/items/${itemId}`, {
                                method: 'DELETE',
                                headers
                            });
                            if (res.ok) {
                                fetchData(true);
                            } else {
                                const err = await res.json();
                                Alert.alert('Error', err.message || 'Failed to remove item');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Connection failed');
                        }
                    }
                }
            ]
        );
    };


    const handleTableStatusUpdate = async (id, status) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/admin/tables/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchData(true);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update table');
        }
    };

    // ===== RENDER COMPONENTS =====

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.headerProfileContainer}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('account')}
                        style={[styles.profileBox, activeTab === 'account' && { borderWidth: 2, borderColor: '#3B82F6' }]}
                    >
                        {user?.profile_image || user?.steward_image ? (
                            <Image
                                source={{ uri: (user.profile_image || user.steward_image).startsWith('http') ? (user.profile_image || user.steward_image) : `${apiConfig.API_BASE_URL}${user.profile_image || user.steward_image}` }}
                                style={styles.profileImg}
                            />
                        ) : (
                            <Text style={styles.profileInitial}>{user?.name?.charAt(0)}</Text>
                        )}
                    </TouchableOpacity>
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>⭐ {Number(stewardStats.rating || 0).toFixed(1)}</Text>
                    </View>
                </View>
                <View style={{ marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.greeting}>Hello, {user?.name}</Text>
                        <View style={styles.pointsBadge}>
                            <Text style={styles.pointsText}>🪙 {stewardStats.points || 0}</Text>
                        </View>
                    </View>
                    <Text style={styles.roleTitle}>Steward Dashboard</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
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
    );

    const renderDutyCard = () => (
        <View style={[styles.dutyCard, isOnDuty ? styles.onDutyBg : styles.offDutyBg]}>
            <View>
                <Text style={styles.dutyTitle}>{isOnDuty ? 'You are ON DUTY' : 'You are OFF DUTY'}</Text>
                <Text style={styles.dutySub}>Toggle to update your attendance and visibility</Text>
            </View>
            <Switch
                value={isOnDuty}
                onValueChange={handleDutyToggle}
                trackColor={{ false: '#9CA3AF', true: '#10B981' }}
                thumbColor={isOnDuty ? '#fff' : '#f4f3f4'}
            />
        </View>
    );

    const renderStats = () => (
        <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.statVal}>{tables.filter(t => t.status === 'available').length}</Text>
                <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.statVal}>{tables.filter(t => t.status === 'not available' || t.status === 'occupied').length}</Text>
                <Text style={styles.statLabel}>Not Available</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.statVal}>{orders.length}</Text>
                <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#EDE9FE' }]}>
                <Text style={styles.statVal}>
                    {history.filter(o => o.status && ['COMPLETED', 'PAID', 'FINISHED'].includes(o.status.toUpperCase())).length}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
            </View>
        </View>
    );

    const renderHome = () => (
        <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.content}
        >
            {renderDutyCard()}
            {renderStats()}

            {/* My Active Orders Section */}
            {orders.length > 0 && (
                <View style={styles.myOrdersContainer}>
                    <View style={styles.areaHeader}>
                        <Text style={styles.areaTitle}>📋 Assigned to You</Text>
                        <Text style={styles.areaSub}>You have {orders.length} active orders</Text>
                    </View>
                    <View style={styles.tableGrid}>
                        {orders.map(order => {
                            const createdTime = new Date(order.created_at || Date.now()).getTime();
                            const diffMinutes = Math.floor((Date.now() - createdTime) / (1000 * 60));
                            const isLate = diffMinutes >= 20;

                            return (
                                <TouchableOpacity
                                    key={`order-${order.id}`}
                                    style={[
                                        styles.tableBox,
                                        { width: (width - (HORIZ_PADDING * 2) - CARD_GAP) / 2 },
                                        styles.tableBoxOccupied,
                                        isLate && { borderColor: '#EF4444', borderWidth: 2.5 }
                                    ]}
                                    onPress={() => setActiveTab('orders')}
                                >
                                    <View style={styles.tableTop}>
                                        <Text style={styles.tableNum}>T-{order.table_number}</Text>
                                        <Text style={{ fontSize: 12 }}>{isLate ? '⚠️' : '🔴'}</Text>
                                    </View>
                                    <View style={styles.custBadge}>
                                        <Text style={styles.custBadgeText} numberOfLines={1}>
                                            👤 {order.customer_name || 'Guest'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusPill, isLate && { backgroundColor: '#FEE2E2' }]}>
                                        <Text style={[styles.statusPillText, isLate && { color: '#EF4444' }]}>
                                            {isLate ? '⚠️ LATE! ' : ''}{order.status === 'READY' ? 'READY' : order.status === 'PLACED' ? 'PENDING' : order.status}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Ready Alerts Log */}
            {readyAlerts.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.sectionTitle, { fontSize: 14, color: '#10B981' }]}>🔔 Recent Ready Alerts</Text>
                    <View style={{ gap: 8, marginTop: 10 }}>
                        {readyAlerts.slice(0, 3).map((alert, idx) => (
                            <View key={idx} style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#10B981', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={{ fontWeight: 'bold', color: '#065F46' }}>Table {alert.table_number}</Text>
                                    <Text style={{ fontSize: 12, color: '#047857' }}>{alert.items_count} items ready to serve</Text>
                                </View>
                                <Text style={{ fontSize: 10, color: '#059669' }}>{alert.time || 'Just now'}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>🗺️ Restaurant Layout</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Tap a table to manage it</Text>
                </View>
                <TouchableOpacity onPress={() => fetchData(true)}>
                    <Text style={styles.linkText}>Refresh</Text>
                </TouchableOpacity>
            </View>

            {/* Table Filters */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={styles.filterItem}
                    onPress={() => setFilterModal({
                        show: true,
                        title: 'Check Date',
                        placeholder: 'Format: YYYY-MM-DD',
                        value: filterTableDate,
                        onSubmit: (val) => {
                            if (val.match(/^\d{4}-\d{2}-\d{2}$/)) setFilterTableDate(val);
                            else Alert.alert('Invalid Format', 'Please use YYYY-MM-DD');
                        }
                    })}
                >
                    <Text style={styles.filterText}>📅 {filterTableDate}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.filterItem}
                    onPress={() => setFilterModal({
                        show: true,
                        title: 'Check Time',
                        placeholder: 'Format: HH:MM',
                        value: filterTableTime,
                        onSubmit: (val) => {
                            if (val.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) setFilterTableTime(val);
                            else Alert.alert('Invalid Format', 'Please use HH:MM (24h)');
                        }
                    })}
                >
                    <Text style={styles.filterText}>🕒 {filterTableTime}</Text>
                </TouchableOpacity>
            </View>

            {diningAreas.length === 0 ? (
                <View style={styles.tableGrid}>
                    {tables.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No tables configured yet.</Text>
                        </View>
                    ) : (
                        tables.map(table => renderTableItem(table))
                    )}
                </View>
            ) : (
                diningAreas.map(area => {
                    const areaTables = tables.filter(t => t.area_id === area.id);
                    return (
                        <View key={area.id} style={styles.areaSection}>
                            <View style={styles.areaHeader}>
                                <Text style={styles.areaTitle}>{area.area_name}</Text>
                                <Text style={styles.areaSub}>{area.description || 'Seating Area'} · {areaTables.length} tables</Text>
                            </View>
                            <View style={styles.tableGrid}>
                                {areaTables.length === 0 ? (
                                    <Text style={{ color: '#9CA3AF', fontSize: 12, padding: 10 }}>No tables in this area</Text>
                                ) : (
                                    areaTables.map(table => renderTableItem(table))
                                )}
                            </View>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );

const renderTableItem = (table) => {
    const isReserved = table.status === 'Reserved' || table.is_reserved;
    const isOccupied = table.status === 'Occupied' || table.is_occupied;

    return (
        <TouchableOpacity
            key={table.id}
            style={[
                styles.tableBox,
                isReserved ? styles.tableBoxReserved : (isOccupied ? styles.tableBoxOccupied : styles.tableBoxAvailable)
            ]}
            onPress={() => {
                if (isReserved && !isOccupied) {
                    const res = table.reservation_details;
                    Alert.alert(
                        `Table ${table.table_number} - RESERVED`,
                        `Customer: ${res?.customer_name || 'Guest'}\nSlot: ${table.reservation_time || '--:--'}\nGuests: ${res?.guests || 0}\n\nThis table is reserved within the 6-hour window.`,
                        [{
                            text: 'Start Order Anyway',
                            onPress: () => {
                                setActiveOrderContext({ type: 'new', table, orderId: null });
                                setActiveTab('menu');
                            }
                        }, { text: 'Close', style: 'cancel' }]
                    );
                    return;
                }
                if (!isOnDuty) return Alert.alert('Attention', 'Please check-in to manage tables');
                setSelectedTable(table);

                if (isOccupied) {
                    Alert.alert(
                        `Table ${table.table_number}`,
                        `Order Status: ${table.active_order_status || 'In Progress'}`,
                        [
                            {
                                text: 'View Items / Update',
                                onPress: () => {
                                    setActiveOrderContext({ type: 'update', table, orderId: table.active_order_id });
                                    setActiveTab('menu');
                                }
                            },
                            { text: 'Go to Order List', onPress: () => setActiveTab('orders') },
                            { text: 'Close', style: 'cancel' }
                        ]
                    );
                } else {
                    Alert.alert(
                        `Table ${table.table_number}`,
                        `Capacity: ${table.capacity || 4} seats.`,
                        [
                            {
                                text: 'Start New Order',
                                onPress: () => {
                                    setActiveOrderContext({ type: 'new', table, orderId: null });
                                    setActiveTab('menu');
                                }
                            },
                            { text: 'Mark Unavailable', onPress: () => handleTableStatusUpdate(table.id, 'not available') },
                            { text: 'Cancel', style: 'cancel' }
                        ]
                    );
                }
            }}
        >
            <View style={styles.tableTop}>
                <Text style={styles.tableNum}>T-{table.table_number}</Text>
                <Text style={{ fontSize: 12 }}>{isOccupied ? '🔴' : (isReserved ? '🟡' : '🟢')}</Text>
            </View>

            <Text style={styles.tableCap}>👥 {table.capacity || 4} Seats</Text>

            {isReserved && !isOccupied ? (
                <View style={styles.resvBadgePill}>
                    <Text style={styles.resvBadgePillText} numberOfLines={1}>
                        📅 {table.reservation_details?.customer_name || 'Reserved'}
                    </Text>
                </View>
            ) : (
                <>
                    {table.steward_name && (
                        <Text style={styles.assignedSteward}>👤 {table.steward_name}</Text>
                    )}

                    {isOccupied && (
                        <View style={styles.statusPill}>
                            <Text style={styles.statusPillText}>{table.active_order_status || 'Occupied'}</Text>
                        </View>
                    )}
                </>
            )}
        </TouchableOpacity>
    );
};

const renderOrders = () => (
    <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.content}
    >
        <View style={{ paddingHorizontal: HORIZ_PADDING, marginTop: 15 }}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
        </View>

        {orders.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No active orders assigned to you.</Text>
            </View>
        ) : (
            orders.map(order => {
                const createdTime = new Date(order.created_at || Date.now()).getTime();
                const diffMinutes = Math.floor((Date.now() - createdTime) / (1000 * 60));
                const isLate = diffMinutes >= 20;

                return (
                        <View key={order.id} style={[
                            styles.orderCard,
                            { 
                                borderWidth: 2,
                                borderColor: isLate ? '#EF4444' : // RED for late orders
                                             (order.main_status || order.status) === 'READY' || (order.main_status || order.status) === 'READY_TO_SERVE' ? '#EF4444' : 
                                             (order.main_status || order.status) === 'PLACED' || (order.main_status || order.status) === 'PENDING' ? '#3B82F6' : 
                                             (order.main_status || order.status) === 'CONFIRMED' ? '#3B82F6' : 
                                             (order.main_status || order.status) === 'SERVED' ? '#10B981' : 
                                             '#8B5CF6'
                            }
                        ]}>
                            <View style={styles.orderHeader}>
                                <View style={[styles.orderTableHighlight, isLate && { backgroundColor: '#EF4444' }]}>
                                    <Text style={styles.orderTableHighlightText}>T-{order.table_number}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.orderId}>Order #{order.id}</Text>
                                        {isLate && <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: 'bold' }}>🕒 LATE ({diffMinutes}m)</Text>}
                                    </View>
                                    <Text style={styles.stewardHighlight}>Assignee: {user?.name || 'You'}</Text>
                                </View>
                                <View style={[styles.statusBadge, { 
                                    backgroundColor: isLate ? '#EF4444' :
                                                     (order.main_status || order.status) === 'READY' || (order.main_status || order.status) === 'READY_TO_SERVE' ? '#EF4444' : 
                                                     (order.main_status || order.status) === 'SERVED' ? '#10B981' :
                                                     (order.main_status || order.status) === 'PLACED' || (order.main_status || order.status) === 'PENDING' ? '#3B82F6' : '#F59E0B'
                                }]}>
                                    <Text style={styles.statusText}>
                                        {isLate ? 'LATE! ' : ''}{((order.main_status || order.status) === 'READY' || (order.main_status || order.status) === 'READY_TO_SERVE') ? 'READY' : ((order.main_status || order.status) === 'PLACED' ? 'PENDING' : (order.main_status || order.status))}
                                    </Text>
                                </View>
                            </View>

                        {/* Table + Customer Info Row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={styles.orderTable}>Table {order.table_number}</Text>
                            <View style={{ 
                                backgroundColor: order.customer_type === 'Registered' ? '#EEF2FF' : '#FEF3C7', 
                                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 
                            }}>
                                <Text style={{ 
                                    fontSize: 10, fontWeight: '700', 
                                    color: order.customer_type === 'Registered' ? '#4F46E5' : '#92400E' 
                                }}>
                                    {order.customer_type === 'Registered' ? '👤' : '🙋'} {order.customer_name || 'Guest'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.orderItems}>
                            {/* Group items by category */}
                            {(() => {
                                const foodItems = (order.items || []).filter(i => !(i.category || '').toLowerCase().includes('beverage'));
                                const bevItems = (order.items || []).filter(i => (i.category || '').toLowerCase().includes('beverage'));
                                
                                return (
                                    <>
                                        {foodItems.length > 0 && (
                                            <View style={{ marginBottom: 10 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                                    <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '900' }}>KITCHEN (FOODS)</Text>
                                                    <Text style={{ fontSize: 9, color: order.kitchen_status === 'ready' ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                                                        {order.kitchen_status === 'ready' ? '✓ READY' : '● PREPARING'}
                                                    </Text>
                                                </View>
                                                {foodItems.map((item, idx) => (
                                                    <View key={`f-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                        <Text style={styles.itemText}>• {item.name} x{item.quantity}</Text>
                                                        {(order.status !== 'COMPLETED' && order.status !== 'CANCELLED') && (
                                                            <TouchableOpacity onPress={() => handleRemovePlacedItem(order.id, item.id, item.name)}>
                                                                <Text style={{ fontSize: 16, color: '#EF4444', paddingHorizontal: 5 }}>✕</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                        {bevItems.length > 0 && (
                                            <View style={{ marginBottom: 5 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                                    <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '900' }}>BAR (BEVERAGES)</Text>
                                                    <Text style={{ fontSize: 9, color: order.bar_status === 'ready' ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                                                        {order.bar_status === 'ready' ? '✓ READY' : '● PREPARING'}
                                                    </Text>
                                                </View>
                                                {bevItems.map((item, idx) => (
                                                    <View key={`b-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                        <Text style={styles.itemText}>• {item.name} x{item.quantity}</Text>
                                                        {(order.status !== 'COMPLETED' && order.status !== 'CANCELLED') && (
                                                            <TouchableOpacity onPress={() => handleRemovePlacedItem(order.id, item.id, item.name)}>
                                                                <Text style={{ fontSize: 16, color: '#EF4444', paddingHorizontal: 5 }}>✕</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                );
                            })()}
                        </View>

                        <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#6B7280', fontSize: 12 }}>Items Total</Text>
                            <Text style={{ fontWeight: 'bold', color: '#111827' }}>Rs. {order.total_price}</Text>
                        </View>
                        
                        <View style={styles.actionRow}>
                            <TouchableOpacity 
                                style={styles.actionBtn} 
                                onPress={() => {
                                    setOrderDetail(order);
                                    setActiveOrderContext({ type: 'update', table: { table_number: order.table_number }, orderId: order.id });
                                    setActiveTab('menu');
                                }}
                            >
                                <Text style={styles.actionBtnText}>Add Items</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} 
                                onPress={() => {
                                    setSelectedStatusOrder(order);
                                    setShowStatusModal(true);
                                }}
                            >
                                <Text style={styles.actionBtnText}>Status</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} 
                                onPress={() => {
                                    setOrderDetail(order);
                                    setShowCancelModal(true);
                                }}
                            >
                                <Text style={styles.actionBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            })
        )}
<View style={{ height: 40 }} />
        </ScrollView >
    );

const renderMenu = () => {
    const categories = [...new Set(menuItems.map(item => item.category))];
    const filteredItems = menuItems.filter(item => item.category === selectedMenuCategory);

    return (
        <View style={{ flex: 1 }}>
            {/* Context Header */}
            <View style={styles.menuContextHeader}>
                <View>
                    <Text style={styles.menuContextTitle}>
                        {activeOrderContext ? `Ordering for T-${activeOrderContext.table.table_number}` : 'Select a Table First'}
                    </Text>
                    <Text style={styles.menuContextSub}>
                        {activeOrderContext?.type === 'update' ? `Updating Order #${activeOrderContext.orderId}` : 'Starting New Session'}
                    </Text>
                </View>
                {!activeOrderContext && (
                    <TouchableOpacity style={styles.contextSwitchBtn} onPress={() => setActiveTab('home')}>
                        <Text style={styles.contextSwitchText}>Go to Map</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ marginBottom: 15, paddingHorizontal: 15 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.catPill, selectedMenuCategory === cat && styles.activeCatPill]}
                            onPress={() => setSelectedMenuCategory(cat)}
                        >
                            <Text style={[styles.catPillText, selectedMenuCategory === cat && styles.activeCatPillText]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

{
    filteredItems.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyText}>No items in this category</Text></View>
    ) : (
        <FlatList
            data={filteredItems}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
            renderItem={({ item }) => (
                <View style={styles.menuCard}>
                    <Image
                        source={{ uri: (item.image && item.image.startsWith('http')) ? item.image : (item.image ? `${apiConfig.API_BASE_URL}${item.image}` : 'https://via.placeholder.com/100') }}
                        style={styles.menuImg}
                    />
                    <View style={styles.menuInfo}>
                         <Text style={styles.menuName}>{item.name}</Text>
                         <Text style={styles.menuPrice}>Rs. {item.price}</Text>
                    </View>
                    {activeOrderContext && (
                        <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                            <Text style={styles.addBtnText}>+</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        />

    )}

    {/* Floating Cart Button */}
    {cart.length > 0 && (
        <View style={styles.floatingCartContainer}>
            <TouchableOpacity style={styles.floatingCart} onPress={() => setShowCart(true)}>
                <View style={styles.cartContent}>
                    <View style={styles.cartLeft}>
                        <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cart.reduce((s, i) => s + i.quantity, 0)}</Text></View>
                        <Text style={styles.cartLabel}>View Order Cart</Text>
                    </View>
                    <Text style={styles.cartTotal}>Rs. {cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</Text>
                </View>
            </TouchableOpacity>
        </View>
    )}
</View>
    );
};


const renderReservations = () => (
    <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.content}
    >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={styles.sectionTitle}>Confirmed Reservations</Text>
            <TouchableOpacity
                style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                onPress={() => setFilterModal({
                    show: true,
                    title: 'Filter Reservations',
                    placeholder: 'Format: YYYY-MM-DD',
                    type: 'DATE',
                    value: filterResDate,
                    onSubmit: (val) => {
                        if (val.match(/^\d{4}-\d{2}-\d{2}$/)) setFilterResDate(val);
                        else Alert.alert('Invalid Format', 'Please use YYYY-MM-DD');
                    }
                })}
            >
                <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: 'bold' }}>📅 {filterResDate}</Text>
            </TouchableOpacity>
        </View>
        {reservations.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No upcoming reservations.</Text>
            </View>
        ) : (
            reservations.map(res => (
                <View key={res.id} style={styles.resvCard}>
                    <View style={styles.resvTimeBox}>
                        <Text style={styles.resvTime}>{res.reservation_time}</Text>
                        <Text style={styles.resvDate}>{new Date(res.reservation_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.resvInfo}>
                        <Text style={styles.resvCust}>{res.customer_name}</Text>
                        <Text style={styles.resvTable}>Table {res.table_number} • {res.guests_count} Guests</Text>
                        <View style={styles.resvBadgeSmall}>
                            <Text style={styles.resvBadgeTextSmall}>Confirmed</Text>
                        </View>
                    </View>
                </View>
            ))
        )}
    </ScrollView>
);

const renderHistory = () => (
    <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.content}
    >
        <Text style={styles.sectionTitle}>My Handled Orders</Text>
        {history.map(order => (
            <TouchableOpacity
                key={order.id}
                style={styles.historyCard}
                onPress={() => {
                    setSelectedHistoryOrder(order);
                    setShowHistoryModal(true);
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.historyId}>#{order.id} - Table {order.table_number}</Text>
                    <Text style={{ fontSize: 18 }}>👁️</Text>
                </View>
                <Text style={styles.historyDate}>{new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}</Text>
                <Text style={styles.historyStatus}>{order.status}</Text>
                <Text style={styles.historyTotal}>Rs. {order.total_price}</Text>
            </TouchableOpacity>
        ))}
    </ScrollView>
);

return (
    <View style={styles.container}>
        <View style={{ backgroundColor: 'white' }}>
            <SafeAreaView edges={['top', 'left', 'right']}>
                {renderHeader()}
                <Modal visible={!!activeModal} transparent animationType="slide">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: activeModal?.type === 'CANCEL' ? '#FEE2E2' : (activeModal?.type === 'NEW_ORDER' ? '#DCFCE7' : '#DBEAFE'), justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={{ fontSize: 36 }}>
                                    {activeModal?.type === 'CANCEL' ? '🚫' : (activeModal?.type === 'NEW_ORDER' ? '🥗' : (activeModal?.type === 'PAYMENT' ? '💰' : '🔔'))}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 4, textAlign: 'center' }}>
                                {activeModal?.type === 'PAYMENT' ? 'Payment Requested' : (activeModal?.type === 'NEW_ORDER' ? 'New Order Received!' : (activeModal?.type === 'CANCEL' ? 'Cancel Request!' : 'Order Status Update'))}
                            </Text>
                            
                            {/* STATUS HIGHLIGHT - Requested as the main part */}
                            <View style={{ backgroundColor: activeModal?.type === 'CANCEL' ? '#EF4444' : '#3B82F6', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, marginBottom: 15 }}>
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {activeModal?.type === 'NEW_ORDER' ? 'PLACED' : (activeModal?.data?.status || 'Active')}
                                </Text>
                            </View>

                            <View style={{ width: '100%', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 20, gap: 10, marginBottom: 24 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: 'bold' }}>TABLE</Text>
                                    <View style={{ backgroundColor: '#111827', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 20, color: 'white' }}>T-{activeModal?.data?.tableNumber}</Text>
                                    </View>
                                </View>

                                {activeModal?.data?.orderId && (
                                    <View style={{ marginTop: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', pb: 15, mb: 10 }}>
                                        <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: 'bold', marginBottom: 4 }}>BILL / ORDER NUMBER</Text>
                                        <Text style={{ fontWeight: '900', fontSize: 42, color: '#111827', letterSpacing: -1 }}>
                                            #{activeModal?.data?.orderId}
                                        </Text>
                                    </View>
                                )}

                                {(activeModal?.type === 'NEW_ORDER' || activeModal?.type === 'PAYMENT' || activeModal?.type === 'UPDATE') && activeModal?.data?.items && (
                                    <View style={{ marginTop: 5 }}>
                                        <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '900', marginBottom: 8, letterSpacing: 1 }}>FOOD ITEMS</Text>
                                        {activeModal.data.items.map((item, idx) => (
                                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>• {item.name}</Text>
                                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>x{item.quantity}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Bill total removed for NEW_ORDER/UPDATE as requested. Only show for PAYMENT type. */}
                                {activeModal?.type === 'PAYMENT' && (
                                    <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 5 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: 'bold' }}>TOTAL BILL</Text>
                                            <Text style={{ fontWeight: '900', color: '#10B981', fontSize: 18 }}>Rs. {activeModal?.data?.total || activeModal?.data?.totalPrice || '0.00'}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: 'bold' }}>METHOD</Text>
                                            <Text style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#4F46E5' }}>{activeModal.data.method}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                            
                            <View style={{ width: '100%', gap: 10 }}>
                                {activeModal?.type === 'PAYMENT' ? (
                                    <TouchableOpacity 
                                        style={{ backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 20, alignItems: 'center' }}
                                        onPress={() => handleProcessPayment(activeModal.data.orderId, activeModal.data.method)}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '900' }}>Confirm Payment & Close Order ✓</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity 
                                        style={{ backgroundColor: '#111827', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }}
                                        onPress={() => { nextModal(); if(activeModal?.type === 'NEW_ORDER') setActiveTab('orders'); }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>OKAY</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
        <View style={styles.mainContainer}>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'menu' && renderMenu()}
            {activeTab === 'reservations' && renderReservations()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'account' && (
                <View style={{ flex: 1, padding: 15 }}>
                    <AccountSection />
                </View>
            )}
            {activeTab === 'notifications' && (
                <ScrollView style={styles.content}>
                    <Text style={styles.sectionTitle}>Recent Notifications</Text>
                    {notifications.map(n => (
                        <TouchableOpacity key={n.id} onPress={() => setActiveTab('orders')} style={[styles.notifCard, n.status === 'unread' && styles.unreadNotif]}>
                            <Text style={styles.notifTitle}>{n.title}</Text>
                            <Text style={styles.notifMsg}>{n.message}</Text>
                            <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleTimeString()}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
        {!isOnDuty && activeTab === 'home' && (
            <View style={styles.lockOverlay}>
                <View style={styles.lockContent}>
                    <Text style={styles.lockIcon}>🔒</Text>
                    <Text style={styles.lockTitle}>Off Duty</Text>
                    <Text style={styles.lockSub}>Check-in at the top to manage tables and orders</Text>
                    <TouchableOpacity style={styles.lockBtn} onPress={handleDutyToggle}>
                        <Text style={styles.lockBtnText}>Go On Duty Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'white' }}>
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => setActiveTab('home')} style={[styles.navItem, activeTab === 'home' && styles.activeNav]}>
                    <Text style={activeTab === 'home' ? styles.activeNavText : styles.navText}>🏠</Text>
                    <Text style={activeTab === 'home' ? styles.activeNavLabel : styles.navLabel}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('orders')} style={[styles.navItem, activeTab === 'orders' && styles.activeNav]}>
                    <Text style={activeTab === 'orders' ? styles.activeNavText : styles.navText}>🛍️</Text>
                    <Text style={activeTab === 'orders' ? styles.activeNavLabel : styles.navLabel}>Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('reservations')} style={[styles.navItem, activeTab === 'reservations' && styles.activeNav]}>
                    <Text style={activeTab === 'reservations' ? styles.activeNavText : styles.navText}>📅</Text>
                    <Text style={activeTab === 'reservations' ? styles.activeNavLabel : styles.navLabel}>Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('menu')} style={[styles.navItem, activeTab === 'menu' && styles.activeNav]}>
                    <Text style={activeTab === 'menu' ? styles.activeNavText : styles.navText}>🍽️</Text>
                    <Text style={activeTab === 'menu' ? styles.activeNavLabel : styles.navLabel}>Menu</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.navItem, activeTab === 'history' && styles.activeNav]}>
                    <Text style={activeTab === 'history' ? styles.activeNavText : styles.navText}>📜</Text>
                    <Text style={activeTab === 'history' ? styles.activeNavLabel : styles.navLabel}>Stats</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('account')} style={[styles.navItem, activeTab === 'account' && styles.activeNav]}>
                    <Text style={activeTab === 'account' ? styles.activeNavText : styles.navText}>👤</Text>
                    <Text style={activeTab === 'account' ? styles.activeNavLabel : styles.navLabel}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
        <Modal visible={showCancelModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Request Cancellation</Text>
                    <TextInput
                        placeholder="Reason for cancellation..."
                        style={styles.input}
                        value={cancelReason}
                        onChangeText={setCancelReason}
                        multiline
                    />
                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setShowCancelModal(false)} style={styles.cancelBtn}>
                            <Text>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCancelRequest} style={styles.confirmBtn}>
                            <Text style={{ color: 'white' }}>Send Request</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        <Modal visible={showCart} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { height: '85%' }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Table T-{activeOrderContext?.table.table_number}</Text>
                            <Text style={styles.modalSub}>Confirm items to place order</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowCart(false)}>
                            <Text style={{ fontSize: 24, padding: 5 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.cartList}>
                        {cart.map(item => (
                            <View key={item.id} style={styles.cartItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cartItemName}>{item.name}</Text>
                                    <Text style={styles.cartItemPrice}>Rs. {item.price}</Text>
                                </View>
                                <View style={styles.qtyRow}>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.id, -1)}>
                                        <Text style={styles.qtyBtnText}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.quantity}</Text>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.id, 1)}>
                                        <Text style={styles.qtyBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
                                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={styles.cartFooter}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>Rs. {cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.finalOrderBtn, loading && { opacity: 0.7 }]}
                            onPress={placeFinalOrder}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.finalOrderBtnText}>Place Order Now</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        <Modal visible={showStatusModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Update Status</Text>
                        <TouchableOpacity onPress={() => setShowStatusModal(false)}><Text style={{ fontSize: 20 }}>✕</Text></TouchableOpacity>
                    </View>
                    <Text style={{ marginBottom: 20, color: '#6B7280' }}>Order #{selectedStatusOrder?.id} - Table {selectedStatusOrder?.table_number}</Text>
                    <View style={{ gap: 10 }}>
                        {['PENDING', 'CONFIRMED', 'PREPARING', 'READY TO SERVE', 'SERVED', 'COMPLETED'].map((status) => {
                            const normalizedStatus = selectedStatusOrder?.status === 'READY' ? 'READY TO SERVE' : selectedStatusOrder?.status === 'PLACED' ? 'PENDING' : selectedStatusOrder?.status;
                            const isActive = normalizedStatus === status;
                            return (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.statusOption,
                                        isActive && { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' }
                                    ]}
                                    onPress={() => {
                                        handleUpdateStatus(selectedStatusOrder.id, status);
                                        setShowStatusModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.statusOptionText,
                                        isActive && { color: '#1E40AF', fontWeight: 'bold' }
                                    ]}>{status}</Text>
                                    {isActive && <Text>✅</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
        <Modal
            visible={filterModal.show}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setFilterModal({ ...filterModal, show: false })}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, width: '90%', maxWidth: 400 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{filterModal.title}</Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 15 }}>{filterModal.placeholder}</Text>
                    <TextInput
                        style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 }}
                        value={filterModal.value}
                        onChangeText={(text) => setFilterModal({ ...filterModal, value: text })}
                        placeholder={filterModal.placeholder}
                        autoFocus={true}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                            style={{ padding: 12, marginRight: 10 }}
                            onPress={() => setFilterModal({ ...filterModal, show: false })}
                        >
                            <Text style={{ color: '#6B7280', fontWeight: 'bold' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 }}
                            onPress={() => {
                                filterModal.onSubmit(filterModal.value);
                                setFilterModal({ ...filterModal, show: false });
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        <Modal visible={showHistoryModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Order Details</Text>
                            <Text style={styles.modalSub}>Viewing #{selectedHistoryOrder?.id}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                            <Text style={{ fontSize: 24, padding: 5 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 400, marginBottom: 20 }}>
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ fontSize: 14, color: '#6B7280' }}>Date: {selectedHistoryOrder && new Date(selectedHistoryOrder.created_at).toLocaleString()}</Text>
                            <Text style={{ fontSize: 14, color: '#6B7280' }}>Table: {selectedHistoryOrder?.table_number}</Text>
                            <Text style={{ fontSize: 14, color: '#6B7280' }}>Status: {selectedHistoryOrder?.status}</Text>
                        </View>
                        <Text style={{ fontWeight: 'bold', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 5 }}>Items Ordered</Text>
                        {selectedHistoryOrder?.items && (typeof selectedHistoryOrder.items === 'string' ? JSON.parse(selectedHistoryOrder.items) : selectedHistoryOrder.items).map((item, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '500' }}>{item.name}</Text>
                                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Rs. {item.price} x {item.quantity}</Text>
                                </View>
                                <Text style={{ fontWeight: '600' }}>Rs. {item.price * item.quantity}</Text>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 15 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ color: '#6B7280' }}>Items Total</Text>
                            <Text style={{ fontWeight: 'bold' }}>Rs. {selectedHistoryOrder?.total_price}</Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={[styles.confirmBtn, { backgroundColor: '#111827', marginTop: 20, flex: 0 }]} 
                        onPress={() => setShowHistoryModal(false)}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Close Review</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    </View>
);
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        paddingHorizontal: HORIZ_PADDING,
        paddingBottom: 15,
        paddingTop: 10,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    profileBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    profileImg: { width: '100%', height: '100%' },
    profileInitial: { fontSize: 18, fontWeight: 'bold', color: '#1D4ED8' },
    greeting: { fontSize: 12, color: '#6B7280' },
    roleTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    headerActions: { flexDirection: 'row', gap: 15 },
    notifBtn: { position: 'relative', padding: 5 },
    badge: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    logoutBtn: { padding: 5 },
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { flex: 1 },
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
        marginBottom: 25,
        paddingHorizontal: HORIZ_PADDING,
        marginTop: 15
    },
    statBox: {
        width: CARD_WIDTH,
        padding: 15,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statVal: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
    statLabel: { fontSize: 10, color: '#64748B', marginTop: 4, fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    linkText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
    dutyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 20, borderLeftWidth: 6 },
    onDutyBg: { backgroundColor: '#D1FAE5', borderLeftColor: '#10B981' },
    offDutyBg: { backgroundColor: '#F3F4F6', borderLeftColor: '#9CA3AF' },
    dutyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    dutySub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    tableGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
        justifyContent: 'flex-start',
        paddingHorizontal: HORIZ_PADDING,
        marginBottom: 20
    },
    tableCard: { width: (width - 50) / 2, height: 100, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
    availableTable: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
    occupiedTable: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    reservedTable: { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' },
    tableTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    tableName: { fontSize: 18, fontWeight: '800', color: '#111827' },
    resvBadgeTextSimple: { fontSize: 16 },
    tableStatus: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#6B7280' },
    tableOrderNote: { fontSize: 9, color: '#3B82F6', marginTop: 2, fontWeight: '600' },
    capacityText: { position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: '#9CA3AF' },
    areaSection: { marginBottom: 30 },
    myOrdersContainer: {
        backgroundColor: '#F0FDF4',
        paddingVertical: 15,
        borderRadius: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#DCFCE7'
    },
    areaHeader: {
        marginBottom: 15,
        paddingHorizontal: HORIZ_PADDING,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
        paddingLeft: 12
    },
    areaTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    areaSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    tableBox: {
        width: CARD_WIDTH,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 1.5,
    },
    tableBoxOccupied: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    tableBoxAvailable: {
        backgroundColor: '#F0FDF4',
        borderColor: '#86EFAC',
    },
    tableBoxReserved: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    resvBadgePill: {
        marginTop: 8,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FDE68A'
    },
    resvBadgePillText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#92400E',
        textAlign: 'center'
    },
    assignedSteward: {
        fontSize: 9,
        color: '#059669',
        fontWeight: '700',
        marginTop: 6
    },
    statusPill: {
        marginTop: 6,
        backgroundColor: '#DBEAFE',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4
    },
    statusPillText: {
        fontSize: 8,
        color: '#1E40AF',
        fontWeight: 'bold',
        textAlign: 'center',
        textTransform: 'uppercase'
    },
    custBadge: {
        marginTop: 8,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6
    },
    custBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#4B5563',
        textAlign: 'center'
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
        paddingHorizontal: HORIZ_PADDING
    },
    filterItem: {
        flex: 1,
        backgroundColor: 'white',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center'
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151'
    },
    tableNum: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1E293B',
    },
    tableCap: {
        fontSize: 12,
        color: '#6B7280',
    },
    lockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 10, marginTop: 300 },
    lockContent: { backgroundColor: 'white', padding: 30, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, width: width * 0.8 },
    lockIcon: { fontSize: 40, marginBottom: 15 },
    lockTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    lockSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 20 },
    lockBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    lockBtnText: { color: 'white', fontWeight: 'bold' },
    resvBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#F59E0B', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
    resvBadgeText: { fontSize: 8, color: 'white', fontWeight: 'bold' },
    bottomNav: { height: 75, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', paddingBottom: 15 },
    navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navText: { fontSize: 22, opacity: 0.5 },
    navLabel: { fontSize: 10, color: '#6B7280', marginTop: 4 },
    activeNav: { borderTopWidth: 3, borderTopColor: '#3B82F6' },
    activeNavText: { fontSize: 26 },
    activeNavLabel: { fontWeight: 'bold', color: '#3B82F6' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#9CA3AF' },
    orderCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#3B82F6', elevation: 2 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    orderId: { fontWeight: 'bold', fontSize: 16 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    orderTable: { color: '#6B7280', marginBottom: 10 },
    orderItems: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginBottom: 15 },
    itemText: { fontSize: 14, color: '#4B5563', marginBottom: 3 },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, backgroundColor: '#10B981', padding: 10, borderRadius: 8, alignItems: 'center' },
    actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    menuImg: { width: 60, height: 60, borderRadius: 10, marginRight: 15 },
    menuInfo: { flex: 1 },
    menuName: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
    menuPrice: { color: '#3B82F6', fontWeight: 'bold', marginTop: 4 },
    addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
    addBtnText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    resvCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 12, elevation: 2 },
    resvTimeBox: { width: 80, borderRightWidth: 1, borderRightColor: '#E5E7EB', marginRight: 15 },
    resvTime: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    resvDate: { fontSize: 10, color: '#6B7280' },
    resvInfo: { flex: 1 },
    resvCust: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
    resvTable: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    resvBadgeSmall: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    resvBadgeTextSmall: { color: '#065F46', fontSize: 10, fontWeight: 'bold' },
    historyCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, padding: 15, borderLeftWidth: 4, borderLeftColor: '#10B981' },
    historyId: { fontWeight: 'bold', fontSize: 15 },
    historyDate: { fontSize: 12, color: '#6B7280' },
    historyStatus: { color: '#10B981', fontWeight: 'bold', marginTop: 4 },
    historyTotal: { fontSize: 16, fontWeight: 'bold', marginTop: 8, color: '#111827' },
    notifCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#D1D5DB' },
    unreadNotif: { backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' },
    notifTitle: { fontWeight: 'bold' },
    notifMsg: { color: '#4B5563', marginTop: 4 },
    notifTime: { fontSize: 10, color: '#9CA3AF', marginTop: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 15, marginBottom: 15 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 15, height: 120, textAlignVertical: 'top', backgroundColor: '#F9FAFB' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12 },
    confirmBtn: { flex: 2, padding: 16, alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 12 },
    catScroll: { paddingVertical: 5 },
    catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    activeCatPill: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    catPillText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
    activeCatPillText: { color: 'white' },
    statusOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
    statusOptionText: { fontSize: 16, color: '#111827' },

    // New Order System Styles
    menuContextHeader: {
        padding: 15,
        backgroundColor: '#F3F4F6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    menuContextTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    menuContextSub: { fontSize: 11, color: '#6B7280' },
    contextSwitchBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    contextSwitchText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

    floatingCartContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        paddingHorizontal: 15,
        zIndex: 100
    },
    floatingCart: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10
    },
    cartContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cartLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cartBadge: { backgroundColor: '#3B82F6', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cartBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    cartLabel: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    cartTotal: { color: 'white', fontWeight: 'bold', fontSize: 18 },

    // Modal Styles
    modalSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    cartList: { flex: 1, paddingVertical: 10 },
    cartItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    cartItemName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    cartItemPrice: { fontSize: 14, color: '#3B82F6', fontWeight: '600', marginTop: 2 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4, marginHorizontal: 10 },
    qtyBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    qtyText: { marginHorizontal: 10, fontWeight: 'bold', fontSize: 16, minWidth: 20, textAlign: 'center' },
    removeBtn: { padding: 5 },
    cartFooter: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingVertical: 20 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    totalLabel: { fontSize: 16, color: '#6B7280' },
    totalValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    finalOrderBtn: { backgroundColor: '#10B981', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    finalOrderBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    headerProfileContainer: { position: 'relative' },
    ratingBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#1E293B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#fff'
    },
    ratingText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    pointsBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A'
    },
    pointsText: { color: '#92400E', fontSize: 11, fontWeight: 'bold' },
    content: { flex: 1 },
    orderTableHighlight: {
        backgroundColor: '#111827',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    orderTableHighlightText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 18,
    },
    stewardHighlight: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: 'bold',
        marginTop: 2,
    },
    orderGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
        paddingHorizontal: HORIZ_PADDING,
        paddingTop: 15,
    },
    orderCardGrid: {
        width: CARD_WIDTH,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
    },
    orderHeaderCompact: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderTableHighlightSmall: {
        backgroundColor: '#111827',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    orderTableHighlightTextSmall: {
        color: 'white',
        fontWeight: '900',
        fontSize: 14,
    },
    orderIdSmall: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748B',
    },
    orderInfoCompact: {
        marginBottom: 10,
    },
    orderCustName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1E293B',
    },
    orderItemsCount: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 2,
    },
    statusBadgeSmall: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    statusTextSmall: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    orderActionRow: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 8,
    },
    gridActionBtn: {
        backgroundColor: '#F1F5F9',
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: 'center',
    },
    gridActionBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
    },
});

export default StewardDashboard;
