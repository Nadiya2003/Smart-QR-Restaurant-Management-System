import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, Dimensions, Switch, Vibration, Platform, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import apiConfig from '../../config/api';
import AccountSection from '../AccountSection';

const { width } = Dimensions.get('window');

const BUSINESS_BANK_INFO = {
    accountName: "Melissa's Cafe & Restaurant",
    accountNumber: "8001234567",
    bankName: "Commercial Bank",
    branch: "Colombo Fort"
};

// ─── Timer Component ──────────────────────────────────────────────
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

const DeliveryRiderDashboard = ({ onLogout }) => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Data States
    const [summary, setSummary] = useState({
        activeDeliveries: 0,
        pendingOrders: 0,
        completedDeliveries: 0,
        cancelRequests: 0
    });
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedPaymentOptions, setSelectedPaymentOptions] = useState({}); // { orderId: 'QR' | 'Cash' | 'Card' }
    const [menuItems, setMenuItems] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isOnDuty, setIsOnDuty] = useState(false);
    
    // Edit Order States
    const [isEditing, setIsEditing] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editCart, setEditCart] = useState([]);
    const [editTotal, setEditTotal] = useState(0);
    
    const prevOrderIds = useRef(new Set());
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showCreateOrder, setShowCreateOrder] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrOrder, setQrOrder] = useState(null);
    
    // Create Order States
    const [newOrder, setNewOrder] = useState({
        customer_name: '',
        phone: '',
        address: '',
        latitude: null,
        longitude: null,
        items: [],
        total_price: 0,
        payment_status: 'Unpaid'
    });
    const [selectedMenuCategory, setSelectedMenuCategory] = useState('');
    const soundRef = useRef(null);

    // Initialize Notification Sound
    useEffect(() => {
        const loadSound = async () => {
            try {
                const sound = require('expo-audio').createAudioPlayer(
                    { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }
                );
                soundRef.current = sound;
            } catch (err) {}
        };
        loadSound();
    }, []);

    const playNotificationSound = async () => {
        try {
            if (soundRef.current) soundRef.current.play();
            Vibration.vibrate([0, 500, 200, 500]);
        } catch (err) {}
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            // Parallel fetches
            const [sumRes, orderRes, menuRes, dutyRes, notifRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/summary`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/orders`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/menu`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/duty/status`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/notifications`, { headers })
            ]);

            if (sumRes.ok) setSummary(await sumRes.json());
            if (orderRes.ok) {
                const ordersData = await orderRes.json();
                const allOrders = ordersData.orders || [];
                
                // Show in Home only if NOT fully completed/settled
                const activeDeliveries = allOrders.filter(o => {
                    const os = (o.order_status || '').toUpperCase();
                    const ps = (o.payment_status || '').toLowerCase();
                    const isSettled = ['paid', 'completed', 'settled'].includes(ps);
                    
                    // Show if not delivered yet, OR if delivered but not yet paid/settled
                    return ['PENDING', 'ACCEPTED', 'PICKED UP', 'ON THE WAY', 'READY', 'COOKING', 'PREPARING'].includes(os) || 
                           (os === 'DELIVERED' && !isSettled);
                });
                setOrders(activeDeliveries);
            }
            const menuData = await menuRes.json();
            setMenuItems(menuData || []);
            
            if (menuData.length > 0 && !selectedMenuCategory) {
               const cats = [...new Set(menuData.map(item => item.category))];
               if (cats.length > 0) setSelectedMenuCategory(cats[0]);
            }

            if (dutyRes.ok) setIsOnDuty((await dutyRes.json()).onDuty);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);

            if (activeTab === 'history') {
                const histRes = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/history`, { headers });
                if (histRes.ok) setHistory((await histRes.json()).history || []);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, user?.id, activeTab]);

    useEffect(() => {
        const socket = io(apiConfig.API_BASE_URL, {
            transports: ['websocket']
        });
        
        socket.on('connect', () => {
            console.log('Connected to socket');
            socket.emit('join', 'delivery_rider');
        });

        socket.on('new_delivery_order', (data) => {
            playNotificationSound();
            Alert.alert('New Order!', data.isUpdate ? 'Order details changed' : 'New Order Started - Begin Preparation');
            fetchData(true);
        });

        socket.on('delivery_order_updated', () => {
            fetchData(true);
        });

        fetchData();

        // Polling as a fallback to ensure data is always fresh (every 30 seconds)
        const pollInterval = setInterval(() => {
            fetchData(true);
        }, 30000);
        
        return () => {
            socket.disconnect();
            clearInterval(pollInterval);
        };
    }, [fetchData]);

    // Separate useEffect for Auto check-in to ensure it ONLY runs once on login
    useEffect(() => {
        const autoCheckIn = async () => {
            if (!token) return;
            try {
                await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/duty/check-in`, {
                    method: 'POST',
                    headers
                });
                setIsOnDuty(true);
                fetchData(true);
            } catch (err) {
                console.log("Auto check-in failed", err);
            }
        };
        autoCheckIn();
    }, [token]); // Only run when token is ready (login)

    // Fetch history whenever user switches to the history tab
    useEffect(() => {
        if (activeTab === 'history') {
            const loadHistory = async () => {
                try {
                    const histRes = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/history`, { headers });
                    if (histRes.ok) setHistory((await histRes.json()).history || []);
                } catch (e) {
                    console.log('History fetch error:', e);
                }
            };
            loadHistory();
        }
    }, [activeTab]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDutyToggle = async () => {
        const endpoint = isOnDuty ? 'check-out' : 'check-in';
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/duty/${endpoint}`, {
                method: 'POST',
                headers
            });
            if (res.ok) {
                const newStatus = !isOnDuty;
                setIsOnDuty(newStatus);
                Alert.alert('Status Updated', `You are now ${newStatus ? 'ON DUTY' : 'OFF DUTY'}`);
                // Use a short timeout to let the DB commit fully before refreshing
                setTimeout(() => fetchData(true), 500);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update duty status');
        }
    };

    const handleUpdateStatus = async (orderId, status) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/orders/${orderId}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert('Success', `Order status updated to ${status}`);
                fetchData();
            } else {
                Alert.alert('Action Restricted', data.message || 'Failed to update status');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleUpdatePaymentStatus = async (orderId, status, method) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/orders/${orderId}/payment-status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status, method })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert('Success', `Payment updated: ${method} - ${status}`);
                fetchData();
            } else {
                Alert.alert('Error', data.message || 'Failed to update payment');
            }
        } catch (error) {
            Alert.alert('Error', 'Connection failed');
        }
    };

    const handleCancelRequest = async () => {
        if (!cancelReason) return Alert.alert('Error', 'Please provide a reason');
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/orders/${selectedOrder.id}/cancel-request`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reason: cancelReason })
            });
            if (res.ok) {
                Alert.alert('Success', 'Cancellation request sent to admin');
                setShowCancelModal(false);
                setCancelReason('');
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to send request');
        }
    };

    const openInMaps = (lat, lng, address) => {
        if (!lat || !lng) {
            // Fallback to address search if no lat/lng
            const url = Platform.select({
                ios: `maps:0,0?q=${encodeURIComponent(address)}`,
                android: `geo:0,0?q=${encodeURIComponent(address)}`,
                web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
            });
            return Linking.openURL(url);
        }
        const url = Platform.select({
            ios: `maps:0,0?q=${lat},${lng}(${address})`,
            android: `geo:0,0?q=${lat},${lng}(${address})`,
            web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        });
        Linking.openURL(url);
    };

    const addToCart = (item) => {
        setNewOrder(prev => {
            const existing = prev.items.find(i => i.id === item.id);
            let updatedItems;
            if (existing) {
                updatedItems = prev.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                updatedItems = [...prev.items, { ...item, quantity: 1 }];
            }
            const total = updatedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            return { ...prev, items: updatedItems, total_price: total };
        });
        
        try {
            Vibration.vibrate(50);
        } catch (e) {}
    };

    const submitNewOrder = async () => {
        if (!newOrder.customer_name || !newOrder.phone || !newOrder.address || newOrder.items.length === 0) {
            return Alert.alert('Error', 'Please fill all details and add items');
        }

        setLoading(true);
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/orders`, {
                method: 'POST',
                headers,
                body: JSON.stringify(newOrder)
            });
            if (res.ok) {
                console.log('Order created successfully');
                Alert.alert('Perfect!', 'Delivery order has been created successfully.');
                
                // Reset form
                setNewOrder({
                    customer_name: '',
                    phone: '',
                    address: '',
                    latitude: null,
                    longitude: null,
                    items: [],
                    total_price: 0,
                    payment_status: 'Unpaid'
                });
                
                // Switch to Home to see the new order
                setActiveTab('home');
                fetchData();
            } else {
                const errData = await res.json();
                Alert.alert('Error', (errData.message || 'Failed to create order') + (errData.error ? `: ${errData.error}` : ''));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    const addToEditCart = (item) => {
        setEditCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            let updated;
            if (existing) {
                updated = prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                updated = [...prev, { ...item, quantity: 1 }];
            }
            setEditTotal(updated.reduce((sum, i) => sum + (i.price * i.quantity), 0));
            return updated;
        });
        Vibration.vibrate(50);
    };

    const submitAddItems = async () => {
        if (editCart.length === 0) return Alert.alert('Error', 'Add items first');
        setLoading(true);
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/orders/${editingOrder.id}/items`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ items: editCart, additional_price: editTotal })
            });
            if (res.ok) {
                Alert.alert('Success', 'Items added to order!');
                setIsEditing(false);
                setEditingOrder(null);
                setEditCart([]);
                setEditTotal(0);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update order');
        } finally {
            setLoading(false);
        }
    };

    // ===== RENDER COMPONENTS =====

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                    onPress={() => setActiveTab('account')}
                    style={[styles.profileBox, activeTab === 'account' && { borderWidth: 2, borderColor: '#3B82F6' }]}
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
                    <Text style={styles.roleTitle}>Delivery Rider Dashboard</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => setActiveTab('notifications')} style={styles.notifBtn}>
                    <Text style={{ fontSize: 22 }}>🔔</Text>
                    {notifications.filter(n => n.status === 'unread').length > 0 && (
                        <View style={styles.badge} />
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
                    <Text style={{ fontSize: 18 }}>🚪</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderEditModal = () => {
        const categories = [...new Set(menuItems.map(item => item.category))];
        const filteredItems = menuItems.filter(item => item.category === selectedMenuCategory);

        return (
            <Modal visible={isEditing} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                    <View style={[styles.modalContent, { height: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Items to #{editingOrder?.id}</Text>
                            <TouchableOpacity onPress={() => setIsEditing(false) || setEditCart([])}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 60 }}>
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

                        <FlatList
                            data={filteredItems}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.menuCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.menuName}>{item.name}</Text>
                                        <Text style={styles.menuPrice}>Rs. {item.price}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {editCart.find(i => i.id === item.id) && (
                                            <Text style={{ marginRight: 10, fontWeight: 'bold' }}>
                                                {editCart.find(i => i.id === item.id).quantity}x
                                            </Text>
                                        )}
                                        <TouchableOpacity style={styles.addBtn} onPress={() => addToEditCart(item)}>
                                            <Text style={styles.addBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />

                        {editCart.length > 0 && (
                            <View style={styles.floatingCreateContainer}>
                                <View style={styles.summaryInfo}>
                                    <Text style={styles.summaryTotal}>+ Rs. {editTotal}</Text>
                                    <Text style={styles.summaryCount}>{editCart.length} new items</Text>
                                </View>
                                <TouchableOpacity style={styles.submitBtn} onPress={submitAddItems}>
                                    <Text style={styles.submitBtnText}>Confirm Add</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        );
    };
    const renderStats = () => (
        <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.statVal}>{summary.activeDeliveries}</Text>
                <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.statVal}>{summary.pendingOrders}</Text>
                <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.statVal}>{summary.completedDeliveries}</Text>
                <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.statVal}>{summary.cancelRequests}</Text>
                <Text style={styles.statLabel}>Cancels</Text>
            </View>
        </View>
    );

    const renderHome = () => (
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.content}
        >
            <View style={[styles.dutyCard, isOnDuty ? styles.onDutyBg : styles.offDutyBg]}>
                <View>
                    <Text style={styles.dutyTitle}>{isOnDuty ? 'AVAILABLE FOR DELIVERY' : 'OFF DUTY'}</Text>
                    <Text style={styles.dutySub}>Toggle to update your attendance status</Text>
                </View>
                <Switch 
                    value={isOnDuty} 
                    onValueChange={handleDutyToggle} 
                    trackColor={{ false: '#9CA3AF', true: '#10B981' }}
                    thumbColor={isOnDuty ? '#fff' : '#f4f3f4'}
                />
            </View>
            
            {renderStats()}

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📦 My Deliveries</Text>
            </View>

            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No delivery orders found.</Text>
                </View>
            ) : (
                orders
                .filter(o => ['PENDING', 'ACCEPTED', 'PICKED UP', 'ON THE WAY', 'DELIVERED', 'READY', 'COOKING', 'PREPARING'].includes((o.order_status || '').toUpperCase()))
                .map(order => renderOrderCard(order))
            )}
        </ScrollView>
    );

    const renderOrderCard = (order) => {
        const rawStatus = (order.order_status || 'Pending');
        const statusSteps = ['Pending', 'Accepted', 'Picked Up', 'On the Way', 'Delivered'];
        
        // Normalize status for comparisons and stepper
        let normStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
        
        // Handle special cases and spaces
        if (normStatus.toLowerCase() === 'on the way') normStatus = 'On the Way';
        if (normStatus.toLowerCase() === 'picked up') normStatus = 'Picked Up';
        
        // Map kitchen/bar prep statuses to the 'Accepted' stage for rider view
        if (['Preparing', 'Ready', 'Cooking'].includes(normStatus)) {
            normStatus = 'Accepted';
        }
        
        const currentIdx = statusSteps.indexOf(normStatus);
        
        const payStatus = (order.payment_status || 'pending').toLowerCase();
        const payMethod = (order.payment_method || 'cash').toLowerCase();
        const isPaid = ['paid', 'completed', 'settled'].includes(payStatus);
        const isCollected = payStatus === 'collected';
        const isOnlineOrder = order.order_type === 'online' || payMethod === 'online';

        return (
            <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                    <View>
                        <Text style={styles.orderIdText}>Order #{order.id}</Text>
                        <Text style={styles.orderTimeText}>{new Date(order.created_at).toLocaleTimeString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, getStatusColor(order.order_status)]}>
                        <Text style={styles.statusBadgeText}>{order.order_status}</Text>
                    </View>
                    <OrderTimer createdAt={order.created_at} />
                </View>

                {/* Status Stepper */}
                <View style={styles.stepperContainer}>
                    {statusSteps.map((s, i) => (
                        <View key={s} style={styles.stepWrapper}>
                            <View style={[
                                styles.stepCircle, 
                                i <= currentIdx && styles.activeStepCircle,
                                i < currentIdx && styles.completedStepCircle
                            ]}>
                                {i < currentIdx ? <Text style={styles.stepIcon}>✓</Text> : <Text style={styles.stepNum}>{i + 1}</Text>}
                            </View>
                            <Text style={[styles.stepLabel, i === currentIdx && styles.activeStepLabel]}>{s}</Text>
                            {i < statusSteps.length - 1 && (
                                <View style={[styles.stepConnector, i < currentIdx && styles.activeConnector]} />
                            )}
                        </View>
                    ))}
                </View>

                {/* Status Actions */}
                <View style={styles.miniActionRow}>
                     {currentIdx < statusSteps.length - 1 && (
                        <TouchableOpacity 
                            style={[styles.miniBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => handleUpdateStatus(order.id, statusSteps[currentIdx + 1])}
                        >
                            <Text style={styles.miniBtnText}>
                                {currentIdx === 0 ? 'Accept Order' : 
                                 currentIdx === 1 ? 'Picked from Kitchen' : 
                                 currentIdx === 2 ? 'Start Delivery' : 'Mark Delivered'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{order?.customer_name || 'Guest'}</Text>
                    <Text style={styles.customerPhone}>📞 {order.phone}</Text>
                    <Text style={styles.customerAddress} numberOfLines={2}>📍 {order.address}</Text>
                </View>

                {/* Payment Section - Requirement: QR/Cash/Card Options */}
                <View style={styles.paymentSection}>
                    <View style={styles.paymentHeader}>
                        <Text style={styles.paymentTitle}>Payment: {isOnlineOrder ? 'PAID ONLINE' : 'COLLECT AT DELIVERY'}</Text>
                        <View style={[styles.payStatusBadge, { backgroundColor: isPaid ? '#D1FAE5' : (isCollected ? '#DBEAFE' : '#FEE2E2') }]}>
                            <Text style={[styles.payStatusText, { color: isPaid ? '#065F46' : (isCollected ? '#1E40AF' : '#991B1B') }]}>
                                {order.payment_status?.toUpperCase() || 'UNPAID'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentAmount}>Total: Rs. {order.total_price}</Text>
                    </View>

                    {/* Rider Payment Actions */}
                    {!isOnlineOrder && order.payment_status !== 'Completed' && (
                        <View style={styles.paymentActionsContainer}>
                            <Text style={styles.paymentSelectLabel}>Choose Payment Method:</Text>
                            <View style={styles.paymentOptionRow}>
                                {['QR', 'Cash', 'Card'].map(opt => (
                                    <TouchableOpacity 
                                        key={opt}
                                        style={[
                                            styles.paymentOptionBtn, 
                                            selectedPaymentOptions[order.id] === opt && styles.activePaymentOptionBtn
                                        ]}
                                        onPress={() => setSelectedPaymentOptions({ ...selectedPaymentOptions, [order.id]: opt })}
                                    >
                                        <Text style={[
                                            styles.paymentOptionText,
                                            selectedPaymentOptions[order.id] === opt && styles.activePaymentOptionText
                                        ]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Dynamic QR Display */}
                            {selectedPaymentOptions[order.id] === 'QR' && (
                                <View style={styles.inlineQrBox}>
                                    <View style={styles.qrPlaceholder}>
                                        <Text style={{ fontSize: 40 }}>📱</Text>
                                        <Image 
                                            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Melissa-Pay-${order.id}` }}
                                            style={{ width: 140, height: 140, marginTop: 10 }}
                                        />
                                        <Text style={styles.qrHelpText}>Customer Scan & Pay</Text>
                                    </View>
                                </View>
                            )}

                            {/* Confirmation Buttons */}
                            <View style={styles.confirmationActionBox}>
                                {selectedPaymentOptions[order.id] === 'QR' && order.payment_status !== 'Paid' && (
                                    <TouchableOpacity 
                                        style={[styles.confirmPayBtn, { backgroundColor: '#10B981' }]}
                                        onPress={() => handleUpdatePaymentStatus(order.id, 'Paid', 'QR')}
                                    >
                                        <Text style={styles.confirmPayText}>Mark as Paid</Text>
                                    </TouchableOpacity>
                                )}
                                {selectedPaymentOptions[order.id] === 'Cash' && order.payment_status !== 'Pending Settlement' && (
                                    <TouchableOpacity 
                                        style={[styles.confirmPayBtn, { backgroundColor: '#3B82F6' }]}
                                        onPress={() => handleUpdatePaymentStatus(order.id, 'Pending Settlement', 'Cash')}
                                    >
                                        <Text style={styles.confirmPayText}>Mark as Cash Collected</Text>
                                    </TouchableOpacity>
                                )}
                                {selectedPaymentOptions[order.id] === 'Card' && order.payment_status !== 'Paid' && (
                                    <TouchableOpacity 
                                        style={[styles.confirmPayBtn, { backgroundColor: '#8B5CF6' }]}
                                        onPress={() => handleUpdatePaymentStatus(order.id, 'Paid', 'Card')}
                                    >
                                        <Text style={styles.confirmPayText}>Mark as Paid (Card)</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Completion Action - ONLY after payment is marked */}
                    {(isPaid || isCollected || isOnlineOrder) && order.order_status !== 'Pending Final Closure' && (
                        <TouchableOpacity 
                            style={styles.completeDeliveryBtn}
                            onPress={() => handleUpdateStatus(order.id, 'Delivered')}
                        >
                            <Text style={styles.completeDeliveryText}>Complete Delivery</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.orderActionRow}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}
                        onPress={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                    >
                        <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Details</Text>
                    </TouchableOpacity>
                    
                    {normStatus === 'On the Way' && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}
                            onPress={() => openInMaps(order.latitude, order.longitude, order.address)}
                        >
                            <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>📍 Map</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const getStatusColor = (status) => {
        const s = (status || '').toUpperCase();
        switch(s) {
            case 'PENDING': return { backgroundColor: '#F3F4F6' };
            case 'ACCEPTED': return { backgroundColor: '#E0E7FF' };
            case 'PICKED UP': return { backgroundColor: '#DBEAFE' };
            case 'ON THE WAY': return { backgroundColor: '#FEF3C7' };
            case 'DELIVERED': return { backgroundColor: '#D1FAE5' };
            case 'CANCELLED': return { backgroundColor: '#FEE2E2' };
            default: return { backgroundColor: '#F3F4F6' };
        }
    };



    const renderCreateTab = () => {
        const categories = [...new Set(menuItems.map(item => item.category))];
        const filteredItems = menuItems.filter(item => item.category === selectedMenuCategory);

        return (
            <View style={{ flex: 1 }}>
                <View style={[styles.content, { flex: 0 }]}>
                    <Text style={styles.sectionTitle}>➕ New Delivery Order</Text>
                    <View style={styles.formCard}>
                        <TextInput 
                            placeholder="Customer Name" 
                            style={styles.input} 
                            value={newOrder.customer_name}
                            onChangeText={txt => setNewOrder({...newOrder, customer_name: txt})}
                        />
                        <TextInput 
                            placeholder="Phone Number" 
                            style={styles.input} 
                            keyboardType="phone-pad"
                            value={newOrder.phone}
                            onChangeText={txt => setNewOrder({...newOrder, phone: txt})}
                        />
                        <TextInput 
                            placeholder="Delivery Address" 
                            style={[styles.input, { height: 60 }]} 
                            multiline
                            value={newOrder.address}
                            onChangeText={txt => setNewOrder({...newOrder, address: txt})}
                        />
                    </View>
                </View>

                <View style={{ paddingHorizontal: 15, marginBottom: 10 }}>
                    <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>Select Items</Text>
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

                <FlatList
                    data={filteredItems}
                    keyExtractor={item => item.id.toString()}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
                    renderItem={({ item }) => (
                        <View style={styles.menuCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuName}>{item.name}</Text>
                                <Text style={styles.menuPrice}>Rs. {item.price}</Text>
                            </View>
                            <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                                <Text style={styles.addBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />

                {newOrder.items.length > 0 && (
                    <View style={styles.floatingCreateContainer}>
                        <View style={styles.summaryInfo}>
                            <Text style={styles.summaryCount}>{newOrder.items.length} items</Text>
                            <Text style={styles.summaryTotal}>Rs. {newOrder.total_price}</Text>
                        </View>
                        <TouchableOpacity style={styles.submitBtn} onPress={submitNewOrder}>
                            <Text style={styles.submitBtnText}>Create Order</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderHistoryTab = () => (
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.content}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles.sectionTitle}>📜 Delivery History</Text>
                <Text style={{ color: '#6B7280', fontSize: 12 }}>{history.length} Orders</Text>
            </View>

            {history.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No past deliveries found.</Text>
                </View>
            ) : (
                history.map(order => (
                    <TouchableOpacity 
                        key={order.id} 
                        style={[styles.historyCard, { flexDirection: 'column', alignItems: 'stretch' }]}
                        onPress={() => {
                            setSelectedOrder(order);
                            setShowOrderModal(true);
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <View>
                                <Text style={styles.historyId}>Order #{order.id}</Text>
                                <Text style={styles.historyDate}>
                                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.historyTotal}>Rs. {order.total_price}</Text>
                                <View style={[styles.payStatusBadge, { backgroundColor: '#D1FAE5' }]}>
                                    <Text style={[styles.payStatusText, { color: '#065F46' }]}>
                                        {order.payment_method || 'CASH'} • {order.payment_status}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', pt: 10, marginTop: 5 }}>
                            <Text style={{ fontSize: 13, color: '#111827', fontWeight: 'bold' }}>{order.customer_name}</Text>
                            <Text style={{ fontSize: 12, color: '#6B7280' }} numberOfLines={1}>{order.address}</Text>
                            <Text style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>📞 {order.phone}</Text>
                        </View>

                        <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 5, fontStyle: 'italic' }}>
                            Tap for items & details
                        </Text>
                    </TouchableOpacity>
                ))
            )}
            <View style={{ height: 100 }} />
        </ScrollView>
    );

    const renderModals = () => (
        <>
            {/* Order Details Modal */}
            <Modal visible={showOrderModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Order Details #{selectedOrder?.id}</Text>
                            <View style={[styles.statusBadge, getStatusColor(selectedOrder?.order_status), { marginLeft: 10 }]}>
                                <Text style={styles.statusBadgeText}>{selectedOrder?.order_status}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.modalSection}>
                                <Text style={styles.modalLabel}>Customer</Text>
                                <Text style={styles.modalVal}>{selectedOrder?.customer_name}</Text>
                                <Text style={styles.modalVal}>📞 {selectedOrder?.phone}</Text>
                            </View>
                            
                            <View style={styles.modalSection}>
                                <Text style={styles.modalLabel}>Address</Text>
                                <Text style={styles.modalVal}>{selectedOrder?.address}</Text>
                                <TouchableOpacity 
                                    style={styles.mapBtn}
                                    onPress={() => selectedOrder && openInMaps(selectedOrder.latitude, selectedOrder.longitude, selectedOrder.address)}
                                >
                                    <Text style={styles.mapBtnText}>📍 Open in Maps</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalSection}>
                                <Text style={styles.modalLabel}>Items</Text>
                                {selectedOrder?.items?.map((item, idx) => (
                                    <View key={idx} style={styles.modalItemRow}>
                                        <Text style={styles.modalItemText}>{item.name} x{item.quantity}</Text>
                                        <Text style={styles.modalItemNotes}>{item.notes}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.modalSection}>
                                <Text style={styles.modalLabel}>Payment</Text>
                                <Text style={[styles.modalVal, { fontWeight: 'bold' }]}>Total: Rs. {selectedOrder?.total_price}</Text>
                                <Text style={styles.modalVal}>Method: {(selectedOrder?.payment_method || 'Cash').toUpperCase()}</Text>
                                <Text style={styles.modalVal}>Status: {selectedOrder?.payment_status}</Text>
                            </View>

                            <View style={styles.modalSection}>
                                <Text style={styles.modalLabel}>Order Time</Text>
                                <Text style={styles.modalVal}>
                                    {selectedOrder?.created_at ? new Date(selectedOrder.created_at).toLocaleString() : '—'}
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            {selectedOrder?.order_status !== 'Delivered' && (
                                <TouchableOpacity 
                                    style={[styles.footerBtn, { backgroundColor: '#EF4444' }]} 
                                    onPress={() => setShowOrderModal(false) || setShowCancelModal(true)}
                                >
                                    <Text style={styles.footerBtnText}>Req. Cancel</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.footerBtn} onPress={() => setShowOrderModal(false)}>
                                <Text style={styles.footerBtnText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Cancel Request Modal */}
            <Modal visible={showCancelModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Cancel Delivery Request</Text>
                        <TextInput 
                            placeholder="Reason for cancellation..."
                            style={[styles.input, { height: 100, marginTop: 15 }]}
                            value={cancelReason}
                            onChangeText={setCancelReason}
                            multiline
                        />
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.footerBtn} onPress={() => setShowCancelModal(false)}>
                                <Text style={styles.footerBtnText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.footerBtn, { backgroundColor: '#EF4444' }]} 
                                onPress={handleCancelRequest}
                            >
                                <Text style={styles.footerBtnText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* QR Modal */}
            <Modal visible={showQRModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { alignItems: 'center', padding: 30 }]}>
                        <Text style={styles.modalTitle}>Scan to Pay</Text>
                        <Text style={{ marginBottom: 20, color: '#6B7280' }}>Order #{qrOrder?.id} - Rs. {qrOrder?.total_price}</Text>
                        
                        <View style={{ padding: 10, backgroundColor: 'white', borderRadius: 15, elevation: 5 }}>
                            <Image 
                                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=REST_ORDER_${qrOrder?.id}_AMT_${qrOrder?.total_price}` }}
                                style={{ width: 200, height: 200 }}
                            />
                        </View>

                        <Text style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
                            Ask the customer to scan this QR with any banking app.
                        </Text>

                        <TouchableOpacity 
                            style={[styles.footerBtn, { backgroundColor: '#111827', width: '100%', marginTop: 25 }]}
                            onPress={() => setShowQRModal(false)}
                        >
                            <Text style={[styles.footerBtnText, { color: 'white' }]}>Close QR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );

    // Final Return Update
    return (
        <View style={styles.container}>
            {renderHeader()}
            
            <View style={styles.mainContainer}>
                {activeTab === 'home' && renderHome()}
                {activeTab === 'create' && renderCreateTab()}
                {activeTab === 'history' && renderHistoryTab()}
                {activeTab === 'account' && (
                    <View style={{ flex: 1, padding: 15 }}>
                        <AccountSection />
                    </View>
                )}
                {activeTab === 'notifications' && (
                    <ScrollView style={styles.content}>
                         <Text style={styles.sectionTitle}>Recent Notifications</Text>
                         {notifications.length === 0 ? (
                             <View style={styles.emptyState}><Text style={styles.emptyText}>No notifications</Text></View>
                         ) : (
                             notifications.map((n, i) => (
                                 <View key={i} style={[styles.notifCard, n.status === 'unread' && styles.unreadNotif]}>
                                     <Text style={styles.notifTitle}>{n.title}</Text>
                                     <Text style={styles.notifMsg}>{n.message}</Text>
                                     <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleTimeString()}</Text>
                                 </View>
                             ))
                         )}
                    </ScrollView>
                )}
            </View>

            {renderEditModal()}
            {renderModals()}

            {/* Duty Lock Overlay */}
            {!isOnDuty && activeTab === 'home' && (
                <View style={styles.lockOverlay}>
                    <View style={styles.lockContent}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.lockTitle}>Off Duty</Text>
                        <Text style={styles.lockSub}>Please check-in at the top to access deliveries</Text>
                        <TouchableOpacity style={styles.lockBtn} onPress={handleDutyToggle}>
                            <Text style={styles.lockBtnText}>Go Available Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => setActiveTab('home')} style={[styles.navItem, activeTab === 'home' && styles.activeNav]}>
                    <Text style={activeTab === 'home' ? styles.activeNavText : styles.navText}>🏠</Text>
                    <Text style={activeTab === 'home' ? styles.activeNavLabel : styles.navLabel}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab('create')} style={[styles.navItem, activeTab === 'create' && styles.activeNav]}>
                    <Text style={activeTab === 'create' ? styles.activeNavText : styles.navText}>➕</Text>
                    <Text style={activeTab === 'create' ? styles.activeNavLabel : styles.navLabel}>New</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.navItem, activeTab === 'history' && styles.activeNav]}>
                    <Text style={activeTab === 'history' ? styles.activeNavText : styles.navText}>📜</Text>
                    <Text style={activeTab === 'history' ? styles.activeNavLabel : styles.navLabel}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('account')} style={[styles.navItem, activeTab === 'account' && styles.activeNav]}>
                    <Text style={activeTab === 'account' ? styles.activeNavText : styles.navText}>👤</Text>
                    <Text style={activeTab === 'account' ? styles.activeNavLabel : styles.navLabel}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Add updated styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' 
    },
    profileBox: { 
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#111827', 
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    profileInitial: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    greeting: { fontSize: 13, color: '#6B7280' },
    roleTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    notifBtn: { marginRight: 15, position: 'relative' },
    badge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: 'white' },
    logoutBtn: { padding: 8 },
    mainContainer: { flex: 1 },
    content: { flex: 1, padding: 15 },
    dutyCard: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        padding: 15, borderRadius: 12, marginBottom: 15 
    },
    onDutyBg: { backgroundColor: '#D1FAE5' },
    offDutyBg: { backgroundColor: '#F3F4F6' },
    dutyTitle: { fontWeight: 'bold', fontSize: 14, color: '#065F46' },
    dutySub: { fontSize: 11, color: '#065F46', opacity: 0.8 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statBox: { width: (width - 60) / 4, padding: 10, borderRadius: 8, alignItems: 'center' },
    statVal: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    statLabel: { fontSize: 9, color: '#6B7280', marginTop: 2, fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    linkText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },
    orderCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    orderIdText: { fontWeight: 'bold', fontSize: 14, color: '#111827' },
    orderTimeText: { fontSize: 11, color: '#9CA3AF' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#111827' },
    customerInfo: { marginBottom: 12 },
    customerName: { fontWeight: 'bold', fontSize: 15, color: '#111827' },
    customerPhone: { fontSize: 13, color: '#4B5563', marginTop: 2 },
    customerAddress: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    orderActionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
    actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    bottomNav: { 
        flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB',
        paddingBottom: Platform.OS === 'ios' ? 25 : 10, paddingTop: 10
    },
    navItem: { flex: 1, alignItems: 'center' },
    navText: { fontSize: 20 },
    navLabel: { fontSize: 10, color: '#6B7280', marginTop: 4 },
    activeNav: { borderTopWidth: 2, borderTopColor: '#111827' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#9CA3AF' },
    formCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15 },
    input: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
    catScroll: { paddingVertical: 5 },
    catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 10 },
    activeCatPill: { backgroundColor: '#111827' },
    catPillText: { fontSize: 12, color: '#4B5563', fontWeight: 'bold' },
    activeCatPillText: { color: 'white' },
    menuCard: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 8, alignItems: 'center' },
    menuName: { fontWeight: 'bold', color: '#111827' },
    menuPrice: { color: '#6B7280', fontSize: 12, marginTop: 2 },
    addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
    addBtnText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    floatingCreateContainer: { 
        position: 'absolute', bottom: 0, left: 0, right: 0, 
        backgroundColor: 'white', padding: 15, flexDirection: 'row', 
        justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 10
    },
    summaryInfo: { flex: 1 },
    summaryCount: { fontSize: 13, color: '#6B7280' },
    summaryTotal: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    submitBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    submitBtnText: { color: 'white', fontWeight: 'bold' },
    historyCard: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 8 
    },
    historyId: { fontWeight: 'bold', color: '#111827' },
    historyDate: { fontSize: 11, color: '#9CA3AF' },
    historyTotal: { fontWeight: 'bold', color: '#059669' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    modalBody: { marginBottom: 20 },
    modalSection: { marginBottom: 15 },
    modalLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
    modalVal: { fontSize: 15, color: '#111827' },
    modalItemRow: { marginBottom: 6 },
    modalItemText: { fontWeight: '600', color: '#111827' },
    modalItemNotes: { fontSize: 12, color: '#6B7280' },
    mapBtn: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginTop: 8, alignItems: 'center' },
    mapBtnText: { color: '#3B82F6', fontWeight: '600', fontSize: 13 },
    modalFooter: { flexDirection: 'row', gap: 10 },
    footerBtn: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
    footerBtnText: { fontWeight: 'bold', color: '#111827' },
    lockOverlay: { 
        position: 'absolute', top: 300, left: 15, right: 15, bottom: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
    },
    lockContent: { alignItems: 'center', padding: 30 },
    lockIcon: { fontSize: 50, marginBottom: 10 },
    lockTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    lockSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 5 },
    lockBtn: { marginTop: 20, backgroundColor: '#111827', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 10 },
    lockBtnText: { color: 'white', fontWeight: 'bold' },
    notifCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
    unreadNotif: { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' },
    notifTitle: { fontWeight: 'bold', color: '#111827', fontSize: 14 },
    notifMsg: { color: '#6B7280', fontSize: 13, marginTop: 4 },
    notifTime: { fontSize: 10, color: '#9CA3AF', marginTop: 8 },
    activeNavText: { color: '#111827' },
    activeNavLabel: { color: '#111827', fontWeight: 'bold' },

    // Timer Styles
    timerBox: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
    timerUrgent: { backgroundColor: '#FEE2E2' },
    timerLate: { backgroundColor: '#EF4444' },
    timerLabel: { fontSize: 8, fontWeight: '900', color: '#94A3B8' },
    timerLabelUrgent: { color: '#EF4444' },
    timerText: { fontSize: 12, fontWeight: '800', color: '#475569' },
    timerTextUrgent: { color: '#EF4444' },

    // Sub Tab Styles
    subTabRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 20 },
    subTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeSubTab: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    subTabText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
    activeSubTabText: { color: '#0F172A' },

    // NEW STYLES
    stepperContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 15 },
    stepWrapper: { flex: 1, alignItems: 'center', position: 'relative' },
    stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    activeStepCircle: { backgroundColor: '#3B82F6' },
    completedStepCircle: { backgroundColor: '#10B981' },
    stepNum: { fontSize: 10, fontWeight: 'bold', color: '#9CA3AF' },
    stepIcon: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    stepLabel: { fontSize: 8, color: '#9CA3AF', marginTop: 4, textAlign: 'center', fontWeight: '600' },
    activeStepLabel: { color: '#3B82F6', fontWeight: 'bold' },
    stepConnector: { position: 'absolute', top: 12, left: '50%', width: '100%', height: 2, backgroundColor: '#F3F4F6', zIndex: 0 },
    activeConnector: { backgroundColor: '#10B981' },

    paymentSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 15 },
    paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    paymentTitle: { fontSize: 12, fontWeight: 'bold', color: '#4B5563', textTransform: 'uppercase' },
    payStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
    payStatusText: { fontSize: 10, fontWeight: 'bold' },
    paymentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    paymentMethodLabel: { fontSize: 13, color: '#6B7280' },
    paymentAmount: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    paymentActions: { flexDirection: 'row', gap: 8 },
    qrBtn: { flex: 1, backgroundColor: 'white', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
    qrBtnText: { fontSize: 12, color: '#4B5563', fontWeight: 'bold' },
    payConfirmBtn: { flex: 1, backgroundColor: '#111827', padding: 8, borderRadius: 8, alignItems: 'center' },
    payConfirmBtnText: { fontSize: 12, color: 'white', fontWeight: 'bold' },
    warningText: { flex: 1, textAlign: 'center', color: '#EF4444', fontSize: 12, fontWeight: 'bold' },

    miniActionRow: { marginBottom: 15 },
    miniBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    miniBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    payActionBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, flex: 1, alignItems: 'center' },
    payActionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
    bankInfoBox: { backgroundColor: 'white', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#3B82F6', marginBottom: 10 },
    bankInfoTitle: { fontSize: 11, fontWeight: 'bold', color: '#3B82F6', marginBottom: 2 },
    bankInfoText: { fontSize: 12, color: '#4B5563' },

    // NEW PAYMENT STYLES
    paymentActionsContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
    paymentSelectLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
    paymentOptionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    paymentOptionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
    activePaymentOptionBtn: { backgroundColor: '#111827', borderColor: '#111827' },
    paymentOptionText: { fontSize: 13, fontWeight: 'bold', color: '#4B5563' },
    activePaymentOptionText: { color: 'white' },
    inlineQrBox: { backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    qrPlaceholder: { alignItems: 'center' },
    qrHelpText: { fontSize: 11, color: '#6B7280', marginTop: 8, fontStyle: 'italic' },
    confirmationActionBox: { marginTop: 5 },
    confirmPayBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    confirmPayText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    completeDeliveryBtn: { marginTop: 15, backgroundColor: '#111827', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    completeDeliveryText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});

export default DeliveryRiderDashboard;
