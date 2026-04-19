import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, Dimensions, Switch, Vibration, KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';
import AccountSection from './AccountSection';
import { validateTimeFormat } from '../utils/validation';

import { io } from 'socket.io-client';

const { width } = Dimensions.get('window');

// Round a price up to the nearest 10 (e.g. Rs. 1153 → Rs. 1160)
const roundUpToTen = (n) => Math.ceil((n || 0) / 10) * 10;

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

const CashierDashboard = () => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTabState] = useState('home'); // home, tables, pos, reservations, stats, reports
    const [orderSubTab, setOrderSubTab] = useState('DINE-IN');
    const [resSubTab, setResSubTab] = useState('CONFIRMED');

    const setActiveTab = (tab) => {
        if (tab === 'home' || tab === 'reports') {
            setOrderSubTab('DINE-IN');
        } else if (tab === 'stats') {
            setOrderSubTab('HISTORY');
        }
        setActiveTabState(tab);
    };
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const soundRef = useRef(null);
    const socketRef = useRef(null);
    const prevOrderIds = useRef(new Set());
    const [tables, setTables] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [diningAreas, setDiningAreas] = useState([]);
    const [isOnDuty, setIsOnDuty] = useState(true);
    const [stewards, setStewards] = useState([]);

    // POS Cart State
    const [cart, setCart] = useState([]);
    const [showCartModal, setShowCartModal] = useState(false);
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [posType, setPosType] = useState('DINE_IN');
    const [selectedPosTable, setSelectedPosTable] = useState(null);
    const [selectedStewardId, setSelectedStewardId] = useState(null);
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', needed_time: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [settlementData, setSettlementData] = useState({ payment_method_id: null, email: '' });
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showPastOrdersModal, setShowPastOrdersModal] = useState(false);

    // Dine-in Multi-table Selection
    const [guestCount, setGuestCount] = useState('');

    const getStatusColor = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'PLACED' || s === 'PENDING') return '#94A3B8';
        if (s === 'CONFIRMED') return '#6366F1';
        if (s === 'PREPARING') return '#F59E0B';
        if (s === 'READY_TO_SERVE') return '#3B82F6';
        if (s === 'SERVED') return '#8B5CF6';
        if (s === 'PAYMENT_PENDING') return '#F59E0B';
        if (s === 'PAYMENT_COMPLETED' || s === 'PAYMENT COMPLETE') return '#10B981';
        if (s === 'COMPLETED' || s === 'CLOSED') return '#10B981';
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

    const renderMinimalOrderCard = (order) => {
        const typeColor = getTypeColor(order.type_name);
        const statusColor = getStatusColor(order.status_name);
        
        const orderTime = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        return (
            <TouchableOpacity
                key={`small-card-${order.id}`}
                style={styles.smallOrderCard}
                onPress={() => {
                    setSelectedOrder(order);
                    setSelectedStatus(order.status_name);
                    setSettlementData({ payment_method_id: order.payment_method_id, email: '' });
                    setShowSettlementModal(true);
                }}
            >
                <View style={[styles.compactCardSide, { backgroundColor: typeColor }]} />
                <View style={{ flex: 1, padding: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ justifyContent: 'space-between' }}>
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>#{order.id}</Text>
                            {order.needed_time && (order.type_name === 'TAKEAWAY' || order.type_name === 'DELIVERY') && (
                                <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: 'bold' }}>⏰ {order.needed_time}</Text>
                            )}
                        </View>
                        <Text style={{ fontSize: 14, color: '#64748B', marginTop: 10, fontWeight: 'bold' }}>{order.steward_name || 'System'}</Text>
                    </View>
                    <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A' }}>
                            {order.display_location || (order.table_number ? `T-${order.table_number}` : 'Table')}
                        </Text>
                        <View style={[styles.compactStatus, { backgroundColor: statusColor + '20', marginTop: 5, paddingHorizontal: 10, paddingVertical: 4 }]}>
                            <Text style={[styles.compactStatusText, { color: statusColor, fontSize: 10 }]}>{order.status_name}</Text>
                        </View>
                    </View>
                    <View style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: 'bold' }}>{orderTime}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 10 }}>
                            Rs.{roundUpToTen(order.total_price).toLocaleString()}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };
    const [selectedTables, setSelectedTables] = useState([]);
    const [showTableModal, setShowTableModal] = useState(false);

    // Reservation Filters
    const [filterResDate, setFilterResDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTableDate, setFilterTableDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTableTime, setFilterTableTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }));
    const [showResDetailModal, setShowResDetailModal] = useState(false);
    const [selectedRes, setSelectedRes] = useState(null);
    const [showEditItemsModal, setShowEditItemsModal] = useState(false);
    const [removalReason, setRemovalReason] = useState('');
    const [pendingRemoval, setPendingRemoval] = useState(null);
    const [isEditingExistingOrder, setIsEditingExistingOrder] = useState(null); // Stores the order ID being edited

    // Reports State
    const [reportType, setReportType] = useState('FINANCIAL'); // FINANCIAL, FOOD_WISE, CANCELLATIONS
    const [reportFilters, setReportFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'All',
        orderType: 'All'
    });
    const [reportData, setReportData] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [orderSearch, setOrderSearch] = useState('');

    // Cross-platform Filter Modal
    const [filterModal, setFilterModal] = useState({ show: false, title: '', placeholder: '', value: '', type: '', onSubmit: null });

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
                console.log('Failed to load cashier sound:', err);
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
        } catch (err) { }
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const localNow = new Date();
            const todayStr = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;

            const [tableRes, menuRes, catRes, attendRes, orderRes, resRes, bookRes, areaRes, payRes, stewardRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/tables?date=${filterTableDate}&time=${filterTableTime}`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/menu`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/menu/categories/all`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/cashier/attendance`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/cashier/orders`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/cashier/reservations`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/cashier/bookings`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/admin/areas`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/cashier/payment-methods`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/stewards`, { headers })
            ]);

            if (tableRes.ok) setTables((await tableRes.json()).tables || []);
            if (menuRes.ok) setMenuItems(await menuRes.json() || []);
            if (catRes.ok) {
                const fetchedCats = await catRes.json() || [];
                setCategories(fetchedCats);
                if (fetchedCats.length > 0 && !selectedCategory) {
                    setSelectedCategory(fetchedCats[0].id);
                }
            }
            if (orderRes.ok) setOrders((await orderRes.json()).orders || []);
            if (resRes.ok) setReservations((await resRes.json()).reservations || []);
            if (bookRes.ok) setBookings((await bookRes.json()).bookings || []);
            if (areaRes.ok) setDiningAreas((await areaRes.json()).areas || []);
            if (payRes.ok) setPaymentMethods((await payRes.json()).methods || []);
            if (stewardRes.ok) setStewards((await stewardRes.json()).stewards || []);
        } catch (error) {
            console.error('Cashier Fetch Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, user.id, filterResDate, filterTableDate, filterTableTime]);

    useEffect(() => {
        fetchData();

        const socket = io(apiConfig.API_BASE_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketConnected(true);
            socket.emit('join', 'cashier_room');
        });

        socket.on('newOrder', (data) => {
            playNotificationSound();
            if (data && (data.type === 'TAKEAWAY' || data.type === 'DELIVERY')) {
                const title = data.type === 'TAKEAWAY' ? 'Walk-in Order Paid' : 'Delivery Order Paid';
                Alert.alert(`✅ Payment Successful - ${title}`, `A new ${data.type.toLowerCase()} order was paid online.\nCustomer: ${data.customerName || 'N/A'}\nAmount: Rs.${data.totalPrice || 0}`);
            } else {
                Alert.alert('New Order!', 'New Order Started - Begin Preparation');
            }
            fetchData(true);
        });

        socket.on('orderUpdate', () => fetchData(true));
        socket.on('paymentRequest', (data) => {
            playNotificationSound();
            Alert.alert(
                'Payment Requested! 💰',
                `Table ${data.tableNumber || '?'} is ready to pay Rs. ${data.total} via ${data.method}.`
            );
            fetchData(true);
        });

        socket.on('newReservation', () => {
            playNotificationSound();
            Alert.alert('New Reservation!', 'A new table reservation has been placed.');
            fetchData(true);
        });

        socket.on('removalStatusUpdate', ({ orderId, status }) => {
            if (status === 'approved') {
                Alert.alert('Request Approved ✅', `Item removal request for Order #${orderId} was approved.`);
            } else {
                Alert.alert('Request Rejected ❌', `Item removal request for Order #${orderId} was rejected.`);
            }
            fetchData(true);
        });

        socket.on('menuUpdate', (data) => {
            console.log('[Cashier] Menu update received:', data);
            setMenuItems(prev => prev.map(item => 
                item.id === parseInt(data.itemId) ? { ...item, is_available: data.isAvailable ? 1 : 0 } : item
            ));
        });

        socket.on('menuChange', (data) => {
            console.log('[Cashier] Menu structural change:', data);
            fetchData(true);
        });

        fetchData(true);

        const interval = setInterval(() => fetchData(true), 25000);
        return () => {
            clearInterval(interval);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDutyToggle = async () => {
        const endpoint = isOnDuty ? 'checkout' : 'checkin';
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/cashier/attendance/${endpoint}`, {
                method: 'POST',
                headers
            });
            if (res.ok) {
                setIsOnDuty(!isOnDuty);
                Alert.alert('Status Updated', `You are now ${!isOnDuty ? 'ON DUTY' : 'OFF DUTY'}`);
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Operation failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Server connection failed');
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };

    // --- POS ACTIONS ---
    const addToCart = (item) => {
        const existing = cart.find(i => i.id === item.id);
        if (existing) {
            setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
        // User Friendly: removed Alert
    };

    const updateCartQty = (itemId, delta) => {
        setCart(prev => prev.map(i => {
            if (i.id === itemId) {
                const newQty = i.quantity + delta;
                return newQty > 0 ? { ...i, quantity: newQty } : null;
            }
            return i;
        }).filter(Boolean));
    };

    const removeFromCart = (itemId) => {
        setCart(prev => prev.filter(i => i.id !== itemId));
    };

    const handlePlaceOrder = async () => {
        try {
            setLoading(true);

            if (isEditingExistingOrder) {
                // Update Existing Order
                const res = await fetch(`${apiConfig.API_BASE_URL}/api/orders/dine-in`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        order_id: isEditingExistingOrder,
                        items: cart,
                        total_price: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                        steward_id: selectedStewardId
                    })
                });

                if (res.ok) {
                    Alert.alert('Success', 'Items added to order successfully');
                    setCart([]);
                    setIsEditingExistingOrder(null);
                    setShowCartModal(false);
                    fetchData(true);
                    setActiveTab('home');
                } else {
                    const err = await res.json();
                    Alert.alert('Error', err.message);
                }
                return;
            }

            if (posType !== 'DINE_IN') {
                if (!customerInfo.name.trim()) {
                    Alert.alert('Missing Field', 'Please enter customer name');
                    setLoading(false);
                    return;
                }
                if (customerInfo.needed_time && !validateTimeFormat(customerInfo.needed_time)) {
                    Alert.alert('Invalid Time', 'Please enter time in HH:MM AM/PM or 24h format');
                    setLoading(false);
                    return;
                }
            }

            const body = {
                order_type: posType,
                table_id: selectedTables.map(t => t.id).join(','), // Support multi-table
                customer_name: customerInfo.name,
                phone: customerInfo.phone,
                address: customerInfo.address,
                items: cart,
                total_price: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                steward_id: selectedStewardId,
                guest_count: 0,
                needed_time: customerInfo.needed_time
            };

            const res = await fetch(`${apiConfig.API_BASE_URL}/api/cashier/orders`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                Alert.alert('Success', 'Order placed successfully');
                setCart([]);
                setCustomerInfo({ name: '', phone: '', address: '', needed_time: '' });
                setSelectedTables([]);
                setGuestCount('');
                setSelectedStewardId(null);
                setShowCartModal(false);
                fetchData(true); // Refetch immediately to show occupied tables
                setActiveTab('home'); // Switch back to home
            } else {
                const err = await res.json();
                Alert.alert('Error', err.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };
    const handleSettleOrder = async () => {
        if (!settlementData.payment_method_id) return Alert.alert('Error', 'Please select payment method');

        try {
            setLoading(true);
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/cashier/orders/${selectedOrder.id}/settle`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...settlementData,
                    source_table: selectedOrder.source_table
                })
            });

            if (res.ok) {
                Alert.alert('Success', 'Order settled and bill generated');
                setShowSettlementModal(false);
                setSelectedOrder(null);
                setSettlementData({ payment_method_id: null, email: '' });
                fetchData();
            } else {
                const err = await res.json();
                Alert.alert('Error', err.error || err.message || 'Settlement failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Settlement failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseOrder = async (orderId) => {
        try {
            setLoading(true);
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/orders/${orderId}/close`, {
                method: 'PUT',
                headers
            });
            if (res.ok) {
                Alert.alert('✅ Order Closed', 'Payment verified and table freed successfully.');
                fetchData(true);
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to close order');
            }
        } catch (error) {
            Alert.alert('Connection Error', 'Failed to reach the server.');
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERERS ---

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity
                    onPress={() => setActiveTab('account')}
                    style={[styles.profileBox, activeTab === 'account' && styles.activeProfileBox]}
                >
                    {user?.profile_image || user?.image || user?.steward_image ? (
                        <Image
                            source={{ uri: user.profile_image.startsWith('http') ? user.profile_image : `${apiConfig.API_BASE_URL}${user.profile_image}` }}
                            style={styles.profileImg}
                        />
                    ) : (
                        <Text style={styles.profileInitial}>{user?.name?.charAt(0) || 'C'}</Text>
                    )}
                </TouchableOpacity>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.greeting}>Good Day, {user?.name?.split(' ')[0]}</Text>
                    <Text style={styles.roleTitle}>Cashier Terminal</Text>
                </View>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity
                    style={styles.headerIconButton}
                    onPress={() => fetchData()}
                >
                    <Text style={{ fontSize: 18 }}>🔄</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={{ fontSize: 18 }}>🚪</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const handleRemoveItem = async (orderId, itemId, currentStatus) => {
        if ((currentStatus || "").toUpperCase() === 'PREPARING') {
            setPendingRemoval({ orderId, itemId });
            setFilterModal({
                show: true,
                title: 'Request Item Removal',
                placeholder: 'Reason for removal...',
                type: 'TEXT',
                value: '',
                onSubmit: (reason) => {
                    requestRemoval(orderId, itemId, reason);
                }
            });
            return;
        }

        Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
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
                            Alert.alert('Success', 'Item removed');
                            fetchData(true);
                        } else {
                            const data = await res.json();
                            Alert.alert('Error', data.message || 'Failed to remove item');
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Connection failed');
                    }
                }
            }
        ]);
    };

    const requestRemoval = async (orderId, itemId, reason) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/orders/${orderId}/items/${itemId}/removal-request`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                Alert.alert('Request Sent', 'Your removal request has been sent to the Admin/Manager for approval.');
                fetchData(true);
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to send request');
            }
        } catch (error) {
            Alert.alert('Error', 'Connection failed');
        }
    };

    const renderDutyCard = () => (
        <View style={[styles.dutyCard, isOnDuty ? styles.onDutyBg : styles.offDutyBg]}>
            <View>
                <Text style={styles.dutyTitle}>{isOnDuty ? 'You are ON DUTY' : 'You are OFF DUTY'}</Text>
                <Text style={styles.dutySub}>Toggle to update your attendance and access features</Text>
            </View>
            <Switch
                value={isOnDuty}
                onValueChange={handleDutyToggle}
                trackColor={{ false: '#9CA3AF', true: '#10B981' }}
                thumbColor={isOnDuty ? '#fff' : '#f4f3f4'}
            />
        </View>
    );



    const renderCashierOrderCard = (order) => {
        const typeColor = getTypeColor(order.type_name);
        const statusColor = getStatusColor(order.status_name);
        const isVeryRecent = (Date.now() - new Date(order.created_at).getTime()) < 120000;

        return (
            <View
                key={`${order.source_table || 'orders'}-${order.id}`}
                style={[styles.orderCard, { borderLeftColor: typeColor }, isVeryRecent && styles.newOrderBorder]}
            >
                {isVeryRecent && (
                    <View style={styles.newBadge}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.newBadgeText}>NEW TICKET</Text>
                    </View>
                )}

                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                            <Text style={styles.orderIdText}>#{order.id}</Text>
                            <View style={styles.largeTableBadge}>
                                <Text style={styles.largeTableText}>
                                    {order.type_name?.includes('TAKE') ? 'WALK-IN' :
                                        order.type_name?.includes('DELI') ? 'DELIVERY' :
                                            `T-${order.table_number || 'C'}`}
                                </Text>
                            </View>
                            <View style={[styles.typePill, { backgroundColor: typeColor }]}>
                                <Text style={styles.typePillText}>{(order.type_name || 'DINE-IN').replace('_', ' ')}</Text>
                            </View>
                        </View>

                        <View style={[styles.cardSubInfoRow, { marginBottom: 12 }]}>
                            <View style={[styles.highlightPill, { backgroundColor: '#F1F5F9', minWidth: 100 }]}>
                                <Text style={styles.highlightEmoji}>🤵</Text>
                                <View>
                                    <Text style={styles.highlightTitle}>STAFF ASSIGNED</Text>
                                    <Text style={styles.highlightVal} numberOfLines={1}>{order.steward_name || 'Unassigned'}</Text>
                                </View>
                            </View>
                            {order.needed_time && (order.type_name === 'TAKEAWAY' || order.type_name === 'DELIVERY') && (
                                <View style={[styles.highlightPill, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}>
                                    <Text style={styles.highlightEmoji}>⏰</Text>
                                    <View>
                                        <Text style={[styles.highlightTitle, { color: '#B45309' }]}>NEEDED BY</Text>
                                        <Text style={[styles.highlightVal, { color: '#B45309' }]}>{order.needed_time}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <Text style={styles.customerNameRow}>👤 {order.customer_name || 'Guest Customer'}</Text>
                        {order.phone ? <Text style={styles.customerNameRow}>📞 {order.phone}</Text> : null}
                        {order.type_name?.includes('DELI') && order.address ? (
                            <Text style={styles.customerNameRow}>📍 {order.address}</Text>
                        ) : null}
                        {order.payment_method_name || order.payment_status ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.customerNameRow}>💰 {order.payment_method_name || (order.payment_status === 'PAID' ? 'Paid Online' : 'Unpaid')}</Text>
                                {order.slip_image && (
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(`${apiConfig.API_BASE_URL}${order.slip_image}`)}
                                        style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}
                                    >
                                        <Text style={{ fontSize: 10, color: '#2563EB', fontWeight: 'bold' }}>🖼️ VIEW SLIP</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : null}

                        <View style={styles.splitStatusContainer}>
                            <View style={styles.splitStatusItem}>
                                <Text style={[styles.splitEmoji, (order.status_name || '').toUpperCase() === 'READY_TO_SERVE' && styles.readyEmoji]}>🍛</Text>
                                <Text style={[styles.splitValue, (order.status_name || '').toUpperCase() === 'READY_TO_SERVE' && styles.readyText]}>
                                    {(order.status_name || 'PENDING').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <OrderTimer createdAt={order.created_at} />
                </View>

                <View style={styles.itemsBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={styles.itemsLabel}>ORDER ITEMS</Text>
                        <TouchableOpacity
                            style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                            onPress={() => {
                                setSelectedOrder(order);
                                setShowEditItemsModal(true);
                            }}
                        >
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#3B82F6' }}>📝 EDIT ORDER</Text>
                        </TouchableOpacity>
                    </View>
                    {(() => {
                        try {
                            const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
                            return items.map((item, idx) => (
                                <View key={idx} style={styles.itemRow}>
                                    <View style={[styles.qtyBadge, { backgroundColor: typeColor + '18' }]}>
                                        <Text style={[styles.qtyText, { color: typeColor }]}>{item.quantity}x</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={[styles.itemCategory, { backgroundColor: '#F1F5F9', paddingHorizontal: 6, borderRadius: 4, color: '#64748B' }]}>
                                                {(item.item_status || 'PENDING').toUpperCase()}
                                            </Text>
                                            {item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
                                        </View>
                                    </View>
                                    {!['COMPLETED', 'CANCELLED'].includes((order.status_name || '').toUpperCase()) && (
                                        <TouchableOpacity
                                            onPress={() => handleRemoveItem(order.id, item.id, item.item_status)}
                                            style={{ padding: 8 }}
                                        >
                                            <Text style={{ fontSize: 16 }}>🗑️</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ));
                        } catch (e) {
                            return <Text style={{ color: '#EF4444' }}>Error reading items</Text>;
                        }
                    })()}
                </View>

                {!order.paid_at &&
                    (order.payment_status || '').toUpperCase() !== 'PAID' &&
                    (order.payment_method_name || '').toUpperCase() !== 'ONLINE' &&
                    !['COMPLETED', 'CANCELLED', 'REJECTED'].includes((order.status_name || '').toUpperCase()) && (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#10B981',
                                    paddingVertical: 18,
                                    borderRadius: 20,
                                    shadowColor: '#10B981',
                                    shadowOpacity: 0.4,
                                    shadowRadius: 12,
                                    elevation: 8,
                                    gap: 12
                                }}
                                onPress={() => {
                                    setSelectedOrder(order);
                                    setSettlementData({ ...settlementData, payment_method_id: null });
                                    setShowSettlementModal(true);
                                }}
                            >
                                <Text style={{ fontSize: 18, fontWeight: '900', color: 'white' }}>PAY NOW 💳</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                {(order.status_name === 'Pending Final Closure' || (order.status || '').toUpperCase() === 'PENDING FINAL CLOSURE') && (
                    <TouchableOpacity
                        onPress={() => handleCloseOrder(order.id)}
                        style={{
                            marginTop: 15,
                            backgroundColor: '#10B981',
                            paddingVertical: 16,
                            borderRadius: 16,
                            alignItems: 'center',
                            shadowColor: '#10B981',
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>✅ Close & Finalize Delivery</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderEditItemsModal = () => {
        if (!selectedOrder) return null;
        return (
            <Modal visible={showEditItemsModal} transparent animationType="slide">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { height: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Order #{selectedOrder.id}</Text>
                                <Text style={styles.sectionSub}>Add or Remove Items</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowEditItemsModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.inputLabel, { marginBottom: 15 }]}>ADD MORE ITEMS</Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#F3F4F6',
                                padding: 20,
                                borderRadius: 16,
                                alignItems: 'center',
                                borderStyle: 'dashed',
                                borderWidth: 1,
                                borderColor: '#94A3B8'
                            }}
                            onPress={() => {
                                setShowEditItemsModal(false);
                                setIsEditingExistingOrder(selectedOrder.id);
                                setCart([]); // Clear cart to start adding new items
                                setActiveTab('pos');
                                Alert.alert('Add Mode Active', `Adding items to Order #${selectedOrder.id}. Selection will be appended.`);
                            }}
                        >
                            <Text style={{ fontWeight: 'bold', color: '#444' }}>+ DISCOVER MENU & ADD</Text>
                        </TouchableOpacity>

                        <View style={{ height: 30 }} />
                        <Text style={[styles.inputLabel, { marginBottom: 15 }]}>CURRENT ITEMS</Text>
                        <ScrollView>
                            {(() => {
                                const items = Array.isArray(selectedOrder.items) ? selectedOrder.items : JSON.parse(selectedOrder.items || '[]');
                                return items.map((item, idx) => (
                                    <View key={`edit-item-${idx}`} style={[styles.itemRow, { padding: 15 }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: 'bold' }}>{item.name} x{item.quantity}</Text>
                                            <Text style={{ fontSize: 10, color: (item.item_status || '').toLowerCase() === 'preparing' ? '#F59E0B' : '#10B981', fontWeight: 'bold' }}>
                                                STATUS: {(item.item_status || 'PENDING').toUpperCase()}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 8 }}
                                            onPress={() => handleRemoveItem(selectedOrder.id, item.id, item.item_status)}
                                        >
                                            <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>REMOVE</Text>
                                        </TouchableOpacity>
                                    </View>
                                ));
                            })()}
                        </ScrollView>

                        <TouchableOpacity
                            style={{ backgroundColor: '#111827', padding: 18, borderRadius: 16, marginTop: 20, alignItems: 'center' }}
                            onPress={() => setShowEditItemsModal(false)}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>DONE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };




    const renderHome = () => {
        const filteredOrders = orders.filter(o => {
            // Type filter
            const matchesType = (o.type_name || 'DINE-IN').replace('_', '-').toUpperCase() === (orderSubTab === 'DINE-IN' ? 'DINE-IN' : orderSubTab);

            // Search filter
            const query = orderSearch.toLowerCase();
            const matchesSearch =
                o.id.toString().includes(query) ||
                (o.table_number || '').toString().includes(query) ||
                (o.steward_name || '').toLowerCase().includes(query) ||
                (o.customer_name || '').toLowerCase().includes(query);

            // Terminal status filter (Home only shows active)
            const isActive = !['CANCELLED', 'COMPLETED', 'FINISHED', 'REJECTED'].includes((o.status_name || '').toUpperCase());

            return matchesType && matchesSearch && isActive;
        });

        const getCount = (type) => {
            const finishedStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FINISHED'];
            return orders.filter(o =>
                (o.type_name || 'DINE-IN').replace('_', '-').toUpperCase() === type &&
                !finishedStatuses.includes((o.status_name || '').toUpperCase())
            ).length;
        };

        return (
            <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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

                {/* SEARCH BAR */}
                <View style={styles.orderSearchContainer}>
                    <View style={styles.orderSearchBox}>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                        <TextInput
                            placeholder="Filter by Table, Steward, or Order #"
                            style={styles.orderSearchInput}
                            value={orderSearch}
                            onChangeText={setOrderSearch}
                            placeholderTextColor="#94A3B8"
                        />
                        {orderSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setOrderSearch('')}>
                                <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>👨‍🍳 {orderSubTab.replace('-', ' ')} Active Jobs</Text>
                        <Text style={styles.sectionSub}>Grid View • Synchronized Status</Text>
                    </View>
                    <TouchableOpacity onPress={() => fetchData()} style={styles.refreshBtn}>
                        <Text style={styles.refreshBtnText}>↻ Refresh</Text>
                    </TouchableOpacity>
                </View>

                {filteredOrders.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No Matching Tickets</Text>
                        <Text style={styles.emptyText}>Adjust your filters or search query.</Text>
                    </View>
                ) : (
                    <View style={styles.orderGridContainer}>
                        {filteredOrders.map(renderMinimalOrderCard)}
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
        );
    };

    const renderTableItem = (table) => {
        const status = table.status?.toLowerCase() || '';
        const isReserved = status === 'reserved' || table.is_reserved;
        const isOccupied = status === 'occupied' || table.is_occupied;
        const isCleaning = status === 'cleaning';

        // Multi-selection logic for POS Dine-In
        const isSelected = selectedTables.some(t => t.id === table.id);

        return (
            <TouchableOpacity
                key={table.id}
                style={[
                    styles.tableBox,
                    isOccupied ? styles.tableBoxOccupied : (isReserved ? styles.tableBoxReserved : (isCleaning ? styles.tableBoxCleaning : styles.tableBoxAvailable)),
                    isSelected && { borderColor: '#3B82F6', borderWidth: 3 }
                ]}
                onPress={() => {
                    if (isOccupied || isReserved) {
                        return Alert.alert('Invalid Selection', `Table ${table.table_number} is currently ${isOccupied ? 'Occupied' : 'Reserved'}.`);
                    }
                    if (isCleaning) return Alert.alert('Attention', 'Table is currently being cleaned.');

                    // Direct Routing to Menu
                    setSelectedTables([table]);
                    setPosType('DINE_IN');
                    setActiveTab('pos');
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.tableNum}>T-{table.table_number}</Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        {isSelected && <Text>✅</Text>}
                        <Text style={{ fontSize: 12 }}>{isOccupied ? '🔴' : (isReserved ? '🟡' : (isCleaning ? '🧹' : '🟢'))}</Text>
                    </View>
                </View>
                <Text style={styles.tableCap}>👥 {table.capacity} Seats</Text>
                {isReserved ? (
                    <View style={{ marginTop: 5, backgroundColor: '#FEE2E2', padding: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 8, color: '#DC2626', fontWeight: 'bold', textAlign: 'center' }}>📅 {table.reservation_details?.customer_name || 'Guest'}</Text>
                    </View>
                ) : (
                    <Text style={[styles.tableStatus, { color: isOccupied ? '#EF4444' : (isCleaning ? '#854D0E' : '#11B911') }]}>
                        {isOccupied ? 'SEATED' : (isCleaning ? 'CLEANING' : 'AVAILABLE')}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    const renderTables = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Restaurant Layout</Text>

            {/* Filter Row */}
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 15 }}>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
                    onPress={() => setFilterModal({
                        show: true,
                        title: 'Check Date',
                        placeholder: 'Format: YYYY-MM-DD',
                        type: 'DATE',
                        value: filterTableDate,
                        onSubmit: (val) => {
                            if (val.match(/^\d{4}-\d{2}-\d{2}$/)) setFilterTableDate(val);
                            else Alert.alert('Invalid Format', 'Please use YYYY-MM-DD');
                        }
                    })}
                >
                    <Text style={{ fontSize: 12, textAlign: 'center' }}>📅 {filterTableDate}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
                    onPress={() => setFilterModal({
                        show: true,
                        title: 'Check Time',
                        placeholder: 'Format: HH:MM',
                        type: 'TIME',
                        value: filterTableTime,
                        onSubmit: (val) => {
                            if (val.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) setFilterTableTime(val);
                            else Alert.alert('Invalid Format', 'Please use HH:MM (24h)');
                        }
                    })}
                >
                    <Text style={{ fontSize: 12, textAlign: 'center' }}>🕒 {filterTableTime}</Text>
                </TouchableOpacity>
            </View>

            {diningAreas.map(area => {
                const areaTables = tables.filter(t => t.area_id === area.id);
                return (
                    <View key={area.id} style={styles.areaSection}>
                        <View style={styles.areaHeader}>
                            <Text style={styles.areaTitle}>{area.area_name}</Text>
                            <Text style={styles.areaSub}>{area.description || 'Seating Area'} · {areaTables.length} tables</Text>
                        </View>
                        <View style={styles.tableGrid}>
                            {areaTables.map(table => renderTableItem(table))}
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );

    const renderCartFloating = () => {
        const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        return (
            <TouchableOpacity
                style={styles.floatingCart}
                onPress={() => setShowCartModal(true)}
            >
                <View style={styles.cartBadgeStatic}>
                    <Text style={styles.cartBadgeStaticText}>{cart.length}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>VIEW CART</Text>
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Rs. {roundUpToTen(total).toLocaleString()}</Text>
                </View>
                <View style={styles.checkoutBtnPos}>
                    <Text style={{ color: '#111827', fontWeight: 'bold' }}>Checkout ➔</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderPOS = () => {
        // Phase 1: Filter by search, existence of image, and active status
        const validItems = menuItems.filter(item => {
            const hasImage = item.image_url || item.image;
            const isActive = item.is_active !== 0 && item.is_active !== false;
            const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            return hasImage && isActive && matchesSearch;
        });

        // Phase 2: Category grouping and slice (max 6 per category)
        const filteredItems = validItems.filter(item => !selectedCategory || item.category_id === selectedCategory);
        
        // If searching, we show all matches. If browsing by category, we limit to 6 per category.
        const displayedItems = searchQuery ? filteredItems : filteredItems.slice(0, 6);

        return (
            <View style={styles.content}>
                <View style={{ marginBottom: 25 }}>
                    <Text style={styles.sectionTitle}>🍴 Menu Ordering</Text>
                    <Text style={styles.sectionSub}>Select order type and items</Text>
                </View>

                {/* Main Order Type Switcher */}
                <View style={[styles.subTabRow, { marginBottom: 20 }]}>
                    {[
                        { key: 'DINE_IN', label: 'Dine-In', icon: '🍽️' },
                        { key: 'TAKEAWAY', label: 'Takeaway', icon: '🥡' },
                        { key: 'DELIVERY', label: 'Delivery', icon: '🚚' }
                    ].map(t => (
                        <TouchableOpacity
                            key={`pos-type-${t.key}`}
                            style={[styles.subTab, posType === t.key && styles.activeSubTab]}
                            onPress={() => setPosType(t.key)}
                        >
                            <Text style={[styles.subTabText, posType === t.key && styles.activeSubTabText]}>
                                {t.icon} {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Dine-In Configuration (Top Section) */}
                {posType === 'DINE_IN' && (
                    <View style={{ marginBottom: 20, backgroundColor: 'white', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' }}>
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.inputLabel}>TABLES ({selectedTables.length})</Text>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#F3F4F6', height: 45, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 12 }}
                                    onPress={() => setActiveTab('tables')}
                                >
                                    <Text style={{ fontWeight: 'bold', color: selectedTables.length > 0 ? '#111827' : '#9CA3AF' }}>
                                        {selectedTables.length > 0 ? selectedTables.map(t => t.table_number).join(', ') : 'Select tables...'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Search & Categories */}
                <View style={{ marginBottom: 20 }}>
                    <View style={[styles.searchInputRow, { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 15, marginBottom: 15 }]}>
                        <Text style={{ fontSize: 18 }}>🔍</Text>
                        <TextInput
                            placeholder="Search dishes..."
                            style={{ flex: 1, padding: 12, fontSize: 14 }}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity style={[styles.catBadge, !selectedCategory && styles.activeCatBadge]} onPress={() => setSelectedCategory(null)}>
                            <Text style={[styles.catBadgeText, !selectedCategory && styles.activeCatBadgeText]}>All</Text>
                        </TouchableOpacity>
                        {categories.map(cat => (
                            <TouchableOpacity key={cat.id} style={[styles.catBadge, selectedCategory === cat.id && styles.activeCatBadge]} onPress={() => setSelectedCategory(cat.id)}>
                                <Text style={[styles.catBadgeText, selectedCategory === cat.id && styles.activeCatBadgeText]}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={displayedItems}
                    numColumns={2}
                    keyExtractor={item => `pos-menu-${item.id}`}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.menuGridCard} onPress={() => addToCart(item)}>
                            <Image
                                source={{ uri: item.image ? (item.image.startsWith('http') ? item.image : `${apiConfig.API_BASE_URL}${item.image}`) : 'https://via.placeholder.com/150' }}
                                style={styles.menuGridImg}
                            />
                            <View style={styles.menuGridInfo}>
                                <Text style={styles.menuName} numberOfLines={1}>{item.name}</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                    <Text style={styles.menuPrice}>Rs. {item.price}</Text>
                                    <View style={styles.addGridBtn}><Text style={{ color: 'white', fontWeight: 'bold' }}>+</Text></View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    ListEmptyComponent={() => (
                        <View style={{ padding: 50, alignItems: 'center' }}><Text style={{ color: '#9CA3AF' }}>No items found</Text></View>
                    )}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />

                {cart.length > 0 && renderCartFloating()}
            </View>
        );
    };

    const renderCartModal = () => (
        <Modal visible={showCartModal} transparent animationType="slide">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalContent, { maxHeight: '90%', height: '85%' }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Complete Order</Text>
                            <Text style={{ fontSize: 11, color: '#6B7280' }}>Review details before submission</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowCartModal(false)}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        <View style={{ paddingBottom: 20 }}>
                            <Text style={styles.inputLabel}>ORDER TYPE</Text>
                            <View style={[styles.typeSelectorRow, { marginTop: 8, marginBottom: 20 }]}>
                                {['DINE_IN', 'TAKEAWAY', 'DELIVERY'].map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.typeBtnSmall, posType === t && styles.activeTypeBtnSmall]}
                                        onPress={() => setPosType(t)}
                                    >
                                        <Text style={[styles.typeBtnTextSmall, posType === t && styles.activeTypeBtnTextSmall]}>{t.replace('_', ' ')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {posType === 'DINE_IN' ? (
                                <>
                                    <View style={styles.inputSection}>
                                        <Text style={styles.inputLabel}>TABLES</Text>
                                        <View style={{ backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1E293B' }}>🪑 {selectedTables.length > 0 ? selectedTables.map(t => `T-${t.table_number}`).join(', ') : 'No Table Selected'}</Text>
                                            <TouchableOpacity onPress={() => setShowCartModal(false)}>
                                                <Text style={{ fontSize: 11, color: '#3B82F6', marginTop: 8, fontWeight: 'bold' }}>Change Selection in POS Tab</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={[styles.inputSection, { marginTop: 20 }]}>
                                        <Text style={styles.inputLabel}>ASSIGN STEWARD</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                            {(() => {
                                                const avail = stewards.filter(s => s.isAvailable === 1 || s.isAvailable === true);
                                                const withLoad = avail.map(s => {
                                                    const load = orders.filter(o => o.steward_id === s.id && !['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED'].includes((o.status_name || '').toUpperCase())).length;
                                                    return { ...s, activeLoad: load };
                                                }).sort((a, b) => a.activeLoad - b.activeLoad);
                                                if (withLoad.length === 0) return <Text style={{ color: '#EF4444', fontSize: 12 }}>No steward available</Text>;
                                                return withLoad.map(s => (
                                                    <TouchableOpacity key={`stew-cart-${s.id}`} style={[styles.tableChip, { height: 55, minWidth: 100 }, selectedStewardId === s.id && styles.activeTableChip]} onPress={() => setSelectedStewardId(s.id)}>
                                                        <Text style={[styles.tableChipText, selectedStewardId === s.id && styles.activeTableChipText]}>{s.name || s.full_name}</Text>
                                                        <Text style={{ fontSize: 8, color: selectedStewardId === s.id ? 'white' : '#94A3B8' }}>Load: {s.activeLoad}</Text>
                                                    </TouchableOpacity>
                                                ));
                                            })()}
                                        </ScrollView>
                                    </View>
                                </>
                            ) : (
                                <View style={[styles.inputSection, { marginTop: 10 }]}>
                                    <Text style={styles.inputLabel}>CUSTOMER DETAILS</Text>
                                    <TextInput placeholder="Customer Name" style={[styles.modalInput, { marginTop: 8 }]} value={customerInfo.name} onChangeText={v => setCustomerInfo({ ...customerInfo, name: v })} />
                                    <TextInput placeholder="Mobile Number" style={styles.modalInput} keyboardType="phone-pad" value={customerInfo.phone} onChangeText={v => setCustomerInfo({ ...customerInfo, phone: v })} />
                                    <TextInput placeholder="Needed Time (e.g. 12:30 PM)" style={styles.modalInput} value={customerInfo.needed_time} onChangeText={v => setCustomerInfo({ ...customerInfo, needed_time: v })} />
                                    {posType === 'DELIVERY' && <TextInput placeholder="Delivery Address" style={[styles.modalInput, { height: 80 }]} multiline value={customerInfo.address} onChangeText={v => setCustomerInfo({ ...customerInfo, address: v })} />}
                                </View>
                            )}

                            <View style={{ marginTop: 25 }}>
                                <Text style={styles.inputLabel}>ITEMS SUMMARY</Text>
                                {cart.map(item => (
                                    <View key={`cart-item-${item.id}`} style={styles.cartItemRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cartItemName}>{item.name}</Text>
                                            <Text style={styles.cartItemPrice}>Rs. {item.price} x {item.quantity}</Text>
                                        </View>
                                        <View style={styles.qtyContainer}>
                                            <TouchableOpacity onPress={() => updateCartQty(item.id, -1)} style={styles.qtyBtn}><Text style={{ fontWeight: 'bold' }}>-</Text></TouchableOpacity>
                                            <Text style={styles.qtyText}>{item.quantity}</Text>
                                            <TouchableOpacity onPress={() => updateCartQty(item.id, 1)} style={styles.qtyBtn}><Text style={{ fontWeight: 'bold' }}>+</Text></TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={[styles.checkoutFooter, { backgroundColor: 'white', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalAmount}>Rs. {roundUpToTen(cart.reduce((s, i) => s + (i.price * i.quantity), 0)).toLocaleString()}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.confirmOrderBtn, { backgroundColor: '#111827', paddingVertical: 18, borderRadius: 16 }]}
                            disabled={loading}
                            onPress={handlePlaceOrder}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmOrderBtnText}>🚀 SUBMIT ORDER</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    const renderReservations = () => {
        const now = new Date();

        const confirmed = [];
        const history = [];

        reservations.forEach(res => {
            const status = (res.reservation_status || res.status || '').toUpperCase();
            const resDateStr = res.reservation_date || res.date;
            const resTimeStr = res.reservation_time || res.time;

            let resDateTime = new Date();
            if (resDateStr && resTimeStr) {
                const datePart = new Date(resDateStr).toISOString().split('T')[0];
                resDateTime = new Date(`${datePart}T${resTimeStr}`);
            }

            const isPassed = resDateTime < now;
            const isCompleted = ['CANCELLED', 'COMPLETED', 'NOSHOW'].includes(status);

            if (isCompleted || isPassed) {
                history.push(res);
            } else {
                confirmed.push(res);
            }
        });

        // Nearest upcoming on top
        confirmed.sort((a, b) => {
            const dateA = new Date(`${new Date(a.reservation_date || a.date).toISOString().split('T')[0]}T${a.reservation_time || a.time}`);
            const dateB = new Date(`${new Date(b.reservation_date || b.date).toISOString().split('T')[0]}T${b.reservation_time || b.time}`);
            return dateA - dateB;
        });

        // Most recent past right after
        history.sort((a, b) => {
            const dateA = new Date(`${new Date(a.reservation_date || a.date).toISOString().split('T')[0]}T${a.reservation_time || a.time}`);
            const dateB = new Date(`${new Date(b.reservation_date || b.date).toISOString().split('T')[0]}T${b.reservation_time || b.time}`);
            return dateB - dateA;
        });

        return (
            <ScrollView style={styles.content}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={styles.sectionTitle}>Reservations</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>{confirmed.length + history.length} Total</Text>
                </View>

                {/* 2-Column Tab Toggles */}
                <View style={styles.subTabRow}>
                    <TouchableOpacity
                        style={[styles.subTab, resSubTab === 'CONFIRMED' && styles.activeSubTab]}
                        onPress={() => setResSubTab('CONFIRMED')}
                    >
                        <Text style={[styles.subTabText, resSubTab === 'CONFIRMED' && styles.activeSubTabText]}>
                            ✅ Confirmed ({confirmed.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.subTab, resSubTab === 'HISTORY' && styles.activeSubTab]}
                        onPress={() => setResSubTab('HISTORY')}
                    >
                        <Text style={[styles.subTabText, resSubTab === 'HISTORY' && styles.activeSubTabText]}>
                            📜 History ({history.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {resSubTab === 'CONFIRMED' && (
                    <View>
                        {confirmed.length === 0 ? (
                            <Text style={{ color: '#9CA3AF', textAlign: 'center', marginVertical: 20 }}>No upcoming reservations</Text>
                        ) : confirmed.map((res, index) => (
                            <TouchableOpacity
                                key={`conf-${res.id}-${index}`}
                                style={styles.resvCard}
                                onPress={() => {
                                    setSelectedRes(res);
                                    setShowResDetailModal(true);
                                }}
                            >
                                <View style={styles.resvTimeBox}>
                                    <Text style={styles.resvTime}>{res.reservation_time || res.time}</Text>
                                    <Text style={styles.resvDate}>{new Date(res.reservation_date || res.date).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.resvInfo}>
                                    <Text style={styles.resvCust}>{res.customer_name}</Text>
                                    <Text style={styles.resvTable}>Guest Count: {res.guest_count || res.guests}</Text>
                                </View>
                                <View style={[styles.resvStatusBadge, { backgroundColor: '#ECFDF5', paddingHorizontal: 10, borderRadius: 8 }]}>
                                    <Text style={{ color: '#059669', fontSize: 9, fontWeight: 'bold' }}>
                                        {(res.reservation_status || res.status || 'UNCONFIRMED').toUpperCase()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {resSubTab === 'HISTORY' && (
                    <View>
                        {history.length === 0 ? (
                            <Text style={{ color: '#9CA3AF', textAlign: 'center', marginVertical: 20 }}>No history records</Text>
                        ) : history.map((res, index) => (
                            <TouchableOpacity
                                key={`hist-${res.id}-${index}`}
                                style={[styles.resvCard, { opacity: 0.7 }]}
                                onPress={() => {
                                    setSelectedRes(res);
                                    setShowResDetailModal(true);
                                }}
                            >
                                <View style={styles.resvTimeBox}>
                                    <Text style={styles.resvTime}>{res.reservation_time || res.time}</Text>
                                    <Text style={styles.resvDate}>{new Date(res.reservation_date || res.date).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.resvInfo}>
                                    <Text style={styles.resvCust}>{res.customer_name}</Text>
                                    <Text style={styles.resvTable}>Guest Count: {res.guest_count || res.guests}</Text>
                                </View>
                                <View style={[styles.resvStatusBadge, { backgroundColor: '#F1F5F9', paddingHorizontal: 10, borderRadius: 8 }]}>
                                    <Text style={{ color: '#64748B', fontSize: 9, fontWeight: 'bold' }}>
                                        {(res.reservation_status || res.status || 'COMPLETED').toUpperCase()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderStatsTab = () => {
        const historyStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FINISHED', 'PAYMENT_COMPLETED'];

        const filteredOrders = orders.filter(o => {
            const statusUpper = (o.status_name || '').toUpperCase();
            if (orderSubTab === 'HISTORY') {
                return historyStatuses.includes(statusUpper);
            } else {
                const type = (o.type_name || 'DINE-IN').replace('_', '-').toUpperCase();
                const target = orderSubTab === 'DINE-IN' ? 'DINE-IN' : orderSubTab;
                return type === target && !historyStatuses.includes(statusUpper);
            }
        });

        return (
            <ScrollView style={styles.content}>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>All Orders History</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Reviewing {filteredOrders.length} records</Text>
                </View>

                {filteredOrders.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ fontSize: 40 }}>📋</Text>
                        <Text style={{ color: '#9CA3AF', marginTop: 10 }}>No {orderSubTab.toLowerCase()} orders found</Text>
                    </View>
                ) : filteredOrders.map(order => (
                    <TouchableOpacity
                        key={`stats-${order.source_table || 'orders'}-${order.id}`}
                        style={[styles.historyCard, order.status_name === 'COMPLETED' ? styles.orderCompleted : styles.orderPending]}
                        onPress={() => {
                            setSelectedOrder(order);
                            setSettlementData({ ...settlementData, email: order.phone ? '' : '' });
                            setShowSettlementModal(true);
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.historyId}>#{order.id}</Text>
                                    <View style={[styles.typeBadge, { backgroundColor: '#F3F4F6', paddingHorizontal: 6, borderRadius: 4 }]}>
                                        <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{order.type_name}</Text>
                                    </View>
                                </View>
                                <Text style={styles.historyDate}>{new Date(order.created_at).toLocaleString()}</Text>
                                {order.needed_time && (order.type_name === 'TAKEAWAY' || order.type_name === 'DELIVERY') && (
                                    <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: 'bold', marginTop: 2 }}>⏰ Needed By: {order.needed_time}</Text>
                                )}
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: order.status_name === 'COMPLETED' ? '#D1FAE5' : '#FEF3C7' }]}>
                                <Text style={[styles.statusText, { color: order.status_name === 'COMPLETED' ? '#065F46' : '#92400E' }]}>
                                    {order.status_name}
                                </Text>
                            </View>
                        </View>
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 11, color: '#4B5563' }} numberOfLines={1}>
                                📦 {(() => {
                                    try {
                                        if (!order.items) return 'No items';
                                        const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
                                        return items.map(i => `${i.name} x${i.quantity}`).join(', ');
                                    } catch (e) {
                                        return 'Error reading items';
                                    }
                                })()}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'flex-end' }}>
                            <View>
                                <Text style={styles.historyTable}>
                                    {order.table_number ? `🪑 Table ${order.table_number}` : `👤 ${order.customer_name || 'Walk-in'}`}
                                </Text>
                                {order.steward_name && <Text style={{ fontSize: 10, color: '#6B7280' }}>🤵 Staff: {order.steward_name}</Text>}
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 10, color: '#6B7280' }}>
                                    {order.paid_at ? `💳 ${order.payment_method_name || 'Settled'}` : '⏳ Unpaid'}
                                </Text>
                                <Text style={styles.historyTotal}>Rs. {roundUpToTen(order.total_price).toLocaleString()}</Text>
                            </View>
                        </View>

                        {order.status_name === 'SERVED' && !order.paid_at && (
                            <TouchableOpacity
                                style={{ backgroundColor: '#10B981', padding: 8, borderRadius: 8, marginTop: 12, alignItems: 'center' }}
                                onPress={() => {
                                    setSelectedOrder(order);
                                    setShowSettlementModal(true);
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>💳 MARK AS PAID</Text>
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const BUSINESS_BANK_INFO = {
        bankName: "BOC - Bank of Ceylon",
        accountName: "GALAXY RESTAURANT (PVT) LTD",
        accountNumber: "8450123908",
        branch: "Colombo Fort Main"
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            setLoading(true);
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/cashier/orders/${selectedOrder.id}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    status: newStatus,
                    source_table: selectedOrder.source_table || 'orders'
                })
            });

            if (res.ok) {
                setSelectedStatus(newStatus);
                fetchData(true);
            } else {
                const err = await res.json();
                Alert.alert('Error', err.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Connection failed');
        } finally {
            setLoading(false);
        }
    };

    const renderSettlementModal = () => {
        if (!selectedOrder) return null;
        const isClosed = selectedOrder.status_name === 'COMPLETED' || selectedOrder.status_name === 'CLOSED';

        let statusOptions = [
            { label: 'Received', value: 'PLACED' },
            { label: 'Confirmed', value: 'CONFIRMED' },
            { label: 'Preparing', value: 'PREPARING' },
            { label: 'Ready to Serve', value: 'READY_TO_SERVE' },
            { label: 'Served', value: 'SERVED' },
            { label: 'Payment Complete', value: 'PAYMENT_COMPLETED' }
        ];

        if (selectedOrder.type_name === 'TAKEAWAY') {
            statusOptions = [
                { label: 'Confirmed', value: 'CONFIRMED' },
                { label: 'Preparing', value: 'PREPARING' },
                { label: 'Ready', value: 'READY' },
                { label: 'Pickup', value: 'PICKUP' },
                { label: 'Complete', value: 'COMPLETED' }
            ];
        }

        return (
            <Modal visible={showSettlementModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Order Details #{selectedOrder.id}</Text>
                                <Text style={styles.sectionSub}>{selectedOrder.steward_name || 'System'} · {selectedOrder.type_name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowSettlementModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Status Selector */}
                            {!isClosed && selectedOrder.type_name !== 'DELIVERY' && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={styles.inputLabel}>MANAGE ORDER STATUS</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                        {statusOptions.map(opt => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[
                                                    styles.statusPill,
                                                    selectedStatus === opt.value && styles.activeStatusPill
                                                ]}
                                                onPress={() => handleStatusUpdate(opt.value)}
                                            >
                                                <Text style={[
                                                    styles.statusPillText,
                                                    selectedStatus === opt.value && styles.activeStatusPillText
                                                ]}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Order Items List */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.inputLabel}>ITEMIZED BILL</Text>
                                <View style={styles.itemsBoxFlat}>
                                    {(() => {
                                        let items = [];
                                        try {
                                            items = Array.isArray(selectedOrder.items) ? selectedOrder.items : JSON.parse(selectedOrder.items || '[]');
                                        } catch (e) {
                                            console.error("Error parsing items in settlement modal:", e);
                                        }
                                        
                                        if (!items || items.length === 0) {
                                            return <Text style={{ padding: 10, color: '#94A3B8', fontStyle: 'italic' }}>No items recorded</Text>;
                                        }

                                        return items.map((item, idx) => (
                                            <View key={idx} style={styles.billItemRow}>
                                                <Text style={styles.billItemQty}>{item.quantity}x</Text>
                                                <Text style={styles.billItemName}>{item.name}</Text>
                                                <Text style={styles.billItemPrice}>Rs. {(item.price * item.quantity).toLocaleString()}</Text>
                                            </View>
                                        ));
                                    })()}
                                    <View style={styles.billTotalRow}>
                                        <Text style={styles.billTotalLabel}>Final Total</Text>
                                        <Text style={styles.billTotalValue}>Rs. {roundUpToTen(selectedOrder.total_price).toLocaleString()}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Payment Options */}
                            {/* Payment Options / Customer Info */}
                            {(selectedOrder.type_name === 'TAKEAWAY' || selectedOrder.type_name === 'DELIVERY') ? (
                                <View style={{ marginBottom: 20, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={styles.inputLabel}>ONLINE ORDER DETAILS</Text>
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={{ fontSize: 14, color: '#64748B' }}>Customer Name:</Text>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 }}>{selectedOrder.customer_name || 'N/A'}</Text>
                                        
                                        <Text style={{ fontSize: 14, color: '#64748B' }}>Mobile Number:</Text>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 }}>{selectedOrder.phone || 'N/A'}</Text>
                                        
                                        <Text style={{ fontSize: 14, color: '#64748B' }}>Expected {selectedOrder.type_name === 'TAKEAWAY' ? 'Pickup' : 'Delivery'} Time:</Text>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#EF4444' }}>{selectedOrder.needed_time || 'ASAP'}</Text>

                                        <View style={{ marginTop: 15, backgroundColor: '#D1FAE5', padding: 10, borderRadius: 8 }}>
                                            <Text style={{ color: '#065F46', fontWeight: 'bold', textAlign: 'center' }}>✅ Already Paid via Card (Online)</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : !isClosed && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={styles.inputLabel}>CHOOSE PAYMENT METHOD</Text>
                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                        {[
                                            { id: 1, label: 'Cash', icon: '💵' },
                                            { id: 2, label: 'Card', icon: '💳' },
                                            { id: 4, label: 'QR Pay', icon: '📱' },
                                            { id: 5, label: 'Bank', icon: '🏦' }
                                        ].map(method => (
                                            <TouchableOpacity
                                                key={method.id}
                                                style={[
                                                    styles.paymentMethodBtn,
                                                    settlementData.payment_method_id === method.id && styles.activePaymentMethod
                                                ]}
                                                onPress={() => {
                                                    setSettlementData({ ...settlementData, payment_method_id: method.id });
                                                    handleStatusUpdate('PAYMENT_PENDING');
                                                }}
                                            >
                                                <Text style={{ fontSize: 20 }}>{method.icon}</Text>
                                                <Text style={[
                                                    styles.paymentMethodText,
                                                    settlementData.payment_method_id === method.id && styles.activePaymentMethodText
                                                ]}>{method.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {isClosed && (
                                <View style={styles.successBox}>
                                    <Text style={{ fontSize: 40 }}>✅</Text>
                                    <Text style={styles.successTitle}>Payment Successful</Text>
                                    <Text style={styles.successSub}>Thank you, visit again!</Text>
                                </View>
                            )}
                        </ScrollView>

                        {!isClosed && (
                            <TouchableOpacity
                                style={[
                                    styles.confirmSettleBtn,
                                    (!settlementData.payment_method_id && selectedOrder.type_name !== 'TAKEAWAY' && selectedOrder.type_name !== 'DELIVERY') && { backgroundColor: '#94A3B8' }
                                ]}
                                disabled={(!settlementData.payment_method_id && selectedOrder.type_name !== 'TAKEAWAY' && selectedOrder.type_name !== 'DELIVERY') || loading}
                                onPress={() => {
                                    if (selectedOrder.type_name === 'TAKEAWAY' || selectedOrder.type_name === 'DELIVERY') {
                                        // Auto-close it without actual settlement
                                        handleStatusUpdate('COMPLETED');
                                    } else {
                                        handleSettleOrder();
                                    }
                                }}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmSettleBtnText}>{selectedOrder.type_name === 'TAKEAWAY' || selectedOrder.type_name === 'DELIVERY' ? 'CLOSE COMPLETED ORDER' : 'CONFIRM SETTLEMENT'}</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    const renderQRModal = () => {
        const qrData = JSON.stringify({
            merchant: BUSINESS_BANK_INFO.accountName,
            acc: BUSINESS_BANK_INFO.accountNumber,
            orderId: selectedOrder?.id,
            amount: selectedOrder?.total_price,
            ref: `ORDER_${selectedOrder?.id}`
        });

        return (
            <Modal visible={showQRModal} transparent animationType="fade">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                    <View style={{ backgroundColor: 'white', padding: 30, borderRadius: 32, alignItems: 'center', width: '100%', maxWidth: 400 }}>
                        <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 5 }}>DINE-IN PAYMENT</Text>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 5 }}>Rs. {roundUpToTen(selectedOrder?.total_price).toLocaleString()}</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 25 }}>Order #{selectedOrder?.id}</Text>

                        <View style={{ padding: 20, backgroundColor: 'white', borderRadius: 32, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: '#F3F4F6' }}>
                            <Image
                                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}` }}
                                style={{ width: 220, height: 220 }}
                            />
                        </View>

                        <View style={{ marginTop: 25, width: '100%', padding: 15, backgroundColor: '#F8FAFC', borderRadius: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Text style={{ fontSize: 20 }}>🏦</Text>
                                <View>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#334155' }}>{BUSINESS_BANK_INFO.bankName}</Text>
                                    <Text style={{ fontSize: 12, color: '#64748B' }}>{BUSINESS_BANK_INFO.accountNumber}</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={{ marginTop: 20, fontSize: 11, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 }}>Scan using HelaPay or any Lankasign QR bank app to complete the transfer.</Text>

                        <TouchableOpacity
                            style={{ marginTop: 30, backgroundColor: '#111827', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center' }}
                            onPress={() => setShowQRModal(false)}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>I've Generated the QR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderPastOrdersModal = () => {
        const terminalOrders = orders.filter(o => ['CANCELLED', 'COMPLETED', 'FINISHED', 'REJECTED'].includes((o.status_name || '').toUpperCase()));

        return (
            <Modal visible={showPastOrdersModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Past Orders History</Text>
                                <Text style={{ fontSize: 12, color: '#6B7280' }}>Detailed Audit Trail</Text>
                            </View>
                            <TouchableOpacity style={{ padding: 10 }} onPress={() => setShowPastOrdersModal(false)}>
                                <Text style={{ fontSize: 20 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={terminalOrders}
                            style={{ padding: 10 }}
                            renderItem={({ item }) => (
                                <View style={[styles.historyCard, { borderLeftColor: item.status_name === 'COMPLETED' ? '#10B981' : '#EF4444' }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.historyId}>#{item.id} • Table {item.table_number || 'C'}</Text>
                                        <Text style={{ fontWeight: 'bold', color: item.status_name === 'COMPLETED' ? '#10B981' : '#EF4444' }}>{item.status_name}</Text>
                                    </View>
                                    <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleString()}</Text>

                                    <View style={{ marginTop: 10, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 12 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12, color: '#6B7280' }}>Total Amount</Text>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Rs. {roundUpToTen(item.total_price).toLocaleString()}</Text>
                                        </View>
                                        {item.paid_at && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                                                <Text style={{ fontSize: 12, color: '#6B7280' }}>Payment Method</Text>
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#10B981' }}>
                                                    {item.payment_method_name || 'Paid (System)'}
                                                </Text>
                                            </View>
                                        )}
                                        {item.paid_at && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                                <Text style={{ fontSize: 10, color: '#94A3B8' }}>Time</Text>
                                                <Text style={{ fontSize: 10, color: '#94A3B8' }}>{new Date(item.paid_at).toLocaleTimeString()}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}
                            keyExtractor={item => `${item.source_table || 'orders'}-${item.id}`}
                            ListEmptyComponent={() => (
                                <View style={{ padding: 50, alignItems: 'center' }}>
                                    <Text style={{ color: '#9CA3AF' }}>No past orders found.</Text>
                                </View>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        );
    };
    const handleDownloadPDF = async () => {
        try {
            const params = new URLSearchParams({
                token,
                type: reportType,
                startDate: reportFilters.startDate,
                endDate: reportFilters.endDate
            }).toString();
            const url = `${apiConfig.API_URL}/reports/pdf?${params}`;
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open download link.');
            }
        } catch (error) {
            Alert.alert('Download Failed', 'Could not generate PDF.');
        }
    };

    const fetchReportData = async () => {
        setIsGenerating(true);
        try {
            let endpoint = '';
            switch (reportType) {
                case 'FINANCIAL': endpoint = '/reports/financial-audit'; break;
                case 'INVENTORY_COSTS': endpoint = '/reports/inventory-costs'; break;
                case 'SUPPLIER_PAYMENTS': endpoint = '/reports/supplier-payments'; break;
                case 'FOOD_WISE': endpoint = '/reports/food'; break;
                case 'REVENUE': endpoint = '/reports/revenue'; break;
                case 'STAFF': endpoint = '/reports/staff'; break;
                case 'CANCELLATIONS': endpoint = '/reports/cancellations'; break;
                case 'CUSTOMERS': endpoint = '/reports/customers'; break;
                default: endpoint = '/reports/revenue';
            }

            const query = `?type=${reportType}&startDate=${reportFilters.startDate}&endDate=${reportFilters.endDate}`;
            const res = await fetch(`${apiConfig.API_URL}${endpoint}${query}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setReportData(data);
            } else {
                const err = await res.json();
                Alert.alert('Report Error', err.message || 'Could not fetch report data.');
            }
        } catch (error) {
            Alert.alert('Connection Error', 'Network error while fetching report.');
        } finally {
            setIsGenerating(false);
        }
    };

    const renderReportsTab = () => {
        const reportTypes = [
            { key: 'FINANCIAL', label: 'Financial Hub', icon: '💰' },
            { key: 'FOOD_WISE', label: 'Dish Performance', icon: '🍲' },
            { key: 'CANCELLATIONS', label: 'Cancellations', icon: '🚫' },
        ];

        const setQuickRange = (range) => {
            const now = new Date();
            let start = new Date();
            if (range === 'today') start = now;
            else if (range === 'weekly') start.setDate(now.getDate() - 7);
            else if (range === 'monthly') start.setMonth(now.getMonth() - 1);

            setReportFilters({
                ...reportFilters,
                startDate: start.toISOString().split('T')[0],
                endDate: now.toISOString().split('T')[0]
            });
        };

        return (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                    <View>
                        <Text style={styles.sectionTitle}>💎 Financial Intelligence</Text>
                        <Text style={styles.sectionSub}>Business performance & liquidity audits</Text>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {reportTypes.map(item => (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.subTab, { minWidth: 100, marginRight: 10, paddingVertical: 12 }, reportType === item.key && styles.activeSubTab]}
                            onPress={() => { setReportType(item.key); setReportData(null); }}
                        >
                            <Text style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</Text>
                            <Text style={[styles.subTabText, reportType === item.key && styles.activeSubTabText]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={[styles.summaryCard, { padding: 18, marginBottom: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 1, marginBottom: 15 }}>PERIOD SELECTION</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                        <TouchableOpacity style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }} onPress={() => setFilterModal({ show: true, title: 'Start Date', placeholder: 'YYYY-MM-DD', value: reportFilters.startDate, onSubmit: (v) => setReportFilters({ ...reportFilters, startDate: v }) })}>
                            <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: 'bold' }}>START</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1E293B' }}>{reportFilters.startDate}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }} onPress={() => setFilterModal({ show: true, title: 'End Date', placeholder: 'YYYY-MM-DD', value: reportFilters.endDate, onSubmit: (v) => setReportFilters({ ...reportFilters, endDate: v }) })}>
                            <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: 'bold' }}>END</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1E293B' }}>{reportFilters.endDate}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {['today', 'weekly', 'monthly'].map(r => (
                            <TouchableOpacity key={r} onPress={() => setQuickRange(r)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10 }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={{ marginTop: 20, backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }} onPress={fetchReportData}>
                        {isGenerating ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', letterSpacing: 1 }}>GET INTEL DATA</Text>}
                    </TouchableOpacity>
                </View>

                {reportData && (
                    <View>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <View style={{ flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#000' }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748B' }}>TOTAL INFLOW</Text>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>Rs.{(Number(reportData.summary?.revenue || 0)).toLocaleString()}</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#EF4444' }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748B' }}>TOTAL OUTFLOW</Text>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#EF4444' }}>Rs.{(Number(reportData.summary?.totalCost || 0)).toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={{ backgroundColor: '#111827', padding: 20, borderRadius: 20, marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: 'bold' }}>NET PROJECTED SURPLUS</Text>
                                    <Text style={{ color: '#10B981', fontSize: 24, fontWeight: 'bold' }}>Rs. {(Number(reportData.summary?.profit || 0)).toLocaleString()}</Text>
                                </View>
                                <View style={{ backgroundColor: '#374151', padding: 10, borderRadius: 10 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{((reportData.summary?.profit / reportData.summary?.revenue) * 100 || 0).toFixed(1)}%</Text>
                                    <Text style={{ color: '#94A3B8', fontSize: 8 }}>Margin</Text>
                                </View>
                            </View>
                        </View>

                        <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 50 }}>
                            <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>AUDIT LOG DATA</Text>
                            <View style={{ backgroundColor: '#F8FAFC', padding: 10, flexDirection: 'row', borderRadius: 8 }}>
                                {reportData.table?.headers?.map((h, i) => (
                                    <Text key={i} style={{ fontSize: 9, fontWeight: 'bold', flex: 1 }}>{h}</Text>
                                ))}
                            </View>
                            {reportData.table?.rows?.slice(0, 15).map((row, i) => (
                                <View key={i} style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                                    {row.map((cell, ci) => (
                                        <Text key={ci} style={{ fontSize: 8, flex: 1 }}>{cell}</Text>
                                    ))}
                                </View>
                            ))}
                            <TouchableOpacity style={{ marginTop: 25, backgroundColor: '#DC2626', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }} onPress={handleDownloadPDF}>
                                <Text style={{ fontSize: 18 }}>📄</Text>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Export Financial PDF</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderResDetailModal = () => (
        <Modal visible={showResDetailModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { borderRadius: 24 }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Reservation Details</Text>
                        <TouchableOpacity onPress={() => setShowResDetailModal(false)}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
                    </View>
                    {selectedRes && (
                        <ScrollView style={{ paddingBottom: 20 }}>
                            <View style={{ alignItems: 'center', marginBottom: 25 }}>
                                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                                    <Text style={{ fontSize: 24 }}>👤</Text>
                                </View>
                                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedRes.customer_name}</Text>
                                <Text style={{ color: '#6B7280' }}>{selectedRes.mobile_number}</Text>
                            </View>
                            <View style={{ gap: 15 }}>
                                <View style={styles.detailRow}><Text style={styles.detailLabel}>📅 Date</Text><Text style={styles.detailVal}>{new Date(selectedRes.reservation_date).toLocaleDateString()}</Text></View>
                                <View style={styles.detailRow}><Text style={styles.detailLabel}>🕒 Time</Text><Text style={styles.detailVal}>{selectedRes.reservation_time}</Text></View>
                                <View style={styles.detailRow}><Text style={styles.detailLabel}>👥 Guests</Text><Text style={styles.detailVal}>{selectedRes.guest_count} People</Text></View>
                                <View style={styles.detailRow}><Text style={styles.detailLabel}>🪑 Table</Text><Text style={styles.detailVal}>Table {selectedRes.table_number || 'N/A'}</Text></View>
                                <View style={styles.detailRow}><Text style={styles.detailLabel}>🚩 Status</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
                                        <Text style={{ color: '#1E40AF', fontWeight: 'bold', fontSize: 10 }}>{selectedRes.reservation_status}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}><Text style={styles.detailLabel}>📝 Notes</Text><Text style={[styles.detailVal, { fontStyle: 'italic' }]}>{selectedRes.special_requests || 'None'}</Text></View>
                            </View>

                            <View style={{ height: 20 }} />
                            <Text style={styles.inputLabel}>UPDATE STATUS</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                                {['CONFIRMED', 'ARRIVED', 'COMPLETED', 'NOSHOW', 'CANCELLED'].map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        style={{
                                            paddingHorizontal: 15,
                                            paddingVertical: 10,
                                            borderRadius: 12,
                                            backgroundColor: selectedRes.reservation_status === s ? '#111827' : '#F3F4F6',
                                            borderWidth: 1,
                                            borderColor: selectedRes.reservation_status === s ? '#111827' : '#E5E7EB'
                                        }}
                                        onPress={async () => {
                                            try {
                                                const res = await fetch(`${apiConfig.API_BASE_URL}/api/reservations/${selectedRes.id}/status`, {
                                                    method: 'PUT',
                                                    headers,
                                                    body: JSON.stringify({ status: s })
                                                });
                                                if (res.ok) {
                                                    Alert.alert('Success', `Reservation marked as ${s}`);
                                                    setShowResDetailModal(false);
                                                    fetchData(true);
                                                }
                                            } catch (error) {
                                                Alert.alert('Error', 'Status update failed');
                                            }
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: selectedRes.reservation_status === s ? 'white' : '#6B7280' }}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );

    function renderFilterModal() {
        return (
            <Modal visible={filterModal.show} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, width: '90%', maxWidth: 400 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{filterModal.title}</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 }} value={filterModal.value} onChangeText={(text) => setFilterModal({ ...filterModal, value: text })} placeholder={filterModal.placeholder} autoFocus={true} />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <TouchableOpacity style={{ padding: 12, marginRight: 10 }} onPress={() => setFilterModal({ ...filterModal, show: false })}><Text style={{ color: '#6B7280', fontWeight: 'bold' }}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={{ backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 }} onPress={() => { filterModal.onSubmit(filterModal.value); setFilterModal({ ...filterModal, show: false }); }}><Text style={{ color: 'white', fontWeight: 'bold' }}>OK</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}

            <View style={styles.mainContainer}>
                {activeTab === 'home' && renderHome()}
                {activeTab === 'tables' && renderTables()}
                {activeTab === 'pos' && renderPOS()}
                {activeTab === 'reservations' && (
                    <View style={{ flex: 1 }}>
                        {renderReservations()}
                    </View>
                )}
                {activeTab === 'stats' && renderStatsTab()}
                {activeTab === 'reports' && renderReportsTab()}
                {activeTab === 'account' && (
                    <View style={{ flex: 1, padding: 20 }}>
                        <AccountSection />
                    </View>
                )}
            </View>
            {renderCartModal()}
            {renderSettlementModal()}
            {renderQRModal()}
            {renderPastOrdersModal()}
            {renderResDetailModal()}
            {renderFilterModal()}
            {renderEditItemsModal()}


            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => setActiveTab('home')} style={[styles.navItem, activeTab === 'home' && styles.activeNav]}>
                    <Text style={activeTab === 'home' ? styles.activeNavText : styles.navText}>🏠</Text>
                    <Text style={activeTab === 'home' ? styles.activeNavLabel : styles.navLabel}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('pos')} style={[styles.navItem, activeTab === 'pos' && styles.activeNav]}>
                    <Text style={activeTab === 'pos' ? styles.activeNavText : styles.navText}>🍽️</Text>
                    <Text style={activeTab === 'pos' ? styles.activeNavLabel : styles.navLabel}>Menu</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('tables')} style={[styles.navItem, activeTab === 'tables' && styles.activeNav]}>
                    <Text style={activeTab === 'tables' ? styles.activeNavText : styles.navText}>🪑</Text>
                    <Text style={activeTab === 'tables' ? styles.activeNavLabel : styles.navLabel}>Tables</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('reservations')} style={[styles.navItem, activeTab === 'reservations' && styles.activeNav]}>
                    <Text style={activeTab === 'reservations' ? styles.activeNavText : styles.navText}>📅</Text>
                    <Text style={activeTab === 'reservations' ? styles.activeNavLabel : styles.navLabel}>Reservations</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('reports')} style={[styles.navItem, activeTab === 'reports' && styles.activeNav]}>
                    <Text style={activeTab === 'reports' ? styles.activeNavText : styles.navText}>📊</Text>
                    <Text style={activeTab === 'reports' ? styles.activeNavLabel : styles.navLabel}>Reports</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('stats')} style={[styles.navItem, activeTab === 'stats' && styles.activeNav]}>
                    <Text style={activeTab === 'stats' ? styles.activeNavText : styles.navText}>📜</Text>
                    <Text style={activeTab === 'stats' ? styles.activeNavLabel : styles.navLabel}>Stats</Text>
                </TouchableOpacity>
            </View>

        </View>
    );

};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        paddingTop: 5,
        paddingBottom: 10,
        paddingHorizontal: 20,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 100,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerTextGroup: { marginLeft: 12 },
    headerIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    notifBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: 'white' },
    profileBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: '#DBEAFE' },
    activeProfileBox: { borderColor: '#3B82F6', borderWidth: 2 },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    profileInitial: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },
    greeting: { fontSize: 11, color: '#6B7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
    roleTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    headerActions: { flexDirection: 'row', gap: 15 },
    logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
    mainContainer: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { flex: 1, padding: 20 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statBox: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    statVal: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 12, color: '#4B5563', marginTop: 4 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    dutyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 20, borderLeftWidth: 6 },
    onDutyBg: { backgroundColor: '#D1FAE5', borderLeftColor: '#10B981' },
    offDutyBg: { backgroundColor: '#F3F4F6', borderLeftColor: '#9CA3AF' },
    dutyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    dutySub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    quickBox: { width: (width - 52) / 2, backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 2 },
    quickLabel: { marginTop: 10, fontWeight: 'bold', color: '#374151' },
    tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tableBox: {
        width: (width - 50) / 2,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2
    },
    tableBoxOccupied: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
    tableBoxReserved: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
    tableBoxCleaning: { backgroundColor: '#FEFCE8', borderColor: '#FEF08A', borderStyle: 'dashed' },
    tableBoxAvailable: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
    tableNum: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    tableCap: { fontSize: 12, color: '#6B7280' },
    tableStatus: { fontSize: 9, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
    areaSection: { marginBottom: 30 },
    areaHeader: { marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6', paddingLeft: 12 },
    areaTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    areaSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    lockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 10, marginTop: 100 },
    lockContent: { backgroundColor: 'white', padding: 30, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, width: width * 0.8 },
    lockIcon: { fontSize: 40, marginBottom: 15 },
    lockTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    lockSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 20 },
    lockBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    lockBtnText: { color: 'white', fontWeight: 'bold' },
    bottomNav: { height: 75, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', paddingBottom: 15 },
    navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navText: { fontSize: 22, opacity: 0.5 },
    navLabel: { fontSize: 10, color: '#6B7280', marginTop: 4 },
    activeNav: { borderTopWidth: 3, borderTopColor: '#3B82F6' },
    activeNavText: { fontSize: 26 },
    activeNavLabel: { fontWeight: 'bold', color: '#3B82F6' },
    searchInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, fontSize: 14 },
    catBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    activeCatBadge: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    catBadgeText: { fontSize: 12, color: '#6B7280', fontWeight: 'bold' },
    activeCatBadgeText: { color: 'white' },
    menuGridCard: { backgroundColor: 'white', borderRadius: 24, padding: 12, marginBottom: 15, width: '48%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#F3F4F6' },
    menuGridImg: { width: '100%', height: 120, borderRadius: 16, marginBottom: 10 },
    menuGridInfo: { flex: 1 },
    addGridBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
    floatingCart: { position: 'absolute', bottom: 20, left: 15, right: 15, backgroundColor: '#111827', borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
    cartBadgeStatic: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
    cartBadgeStaticText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    checkoutBtnPos: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    detailLabel: { color: '#6B7280', fontSize: 14 },
    detailVal: { fontWeight: 'bold', color: '#111827', fontSize: 14 },
    historyCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, elevation: 2 },
    typeSelectorRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    typeBtnSmall: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
    activeTypeBtnSmall: { backgroundColor: '#3B82F6' },
    typeBtnTextSmall: { fontSize: 10, fontWeight: 'bold', color: '#6B7280' },
    activeTypeBtnTextSmall: { color: 'white' },
    inputSection: { marginTop: 10 },
    inputLabel: { fontSize: 12, color: '#6B7280', fontWeight: 'bold', marginBottom: 5 },
    tableChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    activeTableChip: { backgroundColor: '#10B981', borderColor: '#10B981' },
    tableChipText: { fontSize: 12, fontWeight: 'bold' },
    activeTableChipText: { color: 'white' },
    modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 10 },
    removeBtn: { marginLeft: 10, padding: 5 },
    removeBtnText: { fontSize: 16 },
    selectedTableBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 10, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
    selectedTableText: { fontSize: 14, fontWeight: 'bold', color: '#1E40AF' },
    clearTableText: { color: '#3B82F6', fontSize: 12, fontWeight: 'bold' },
    cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    cartItemName: { fontWeight: 'bold', color: '#111827' },
    cartItemPrice: { fontSize: 12, color: '#6B7280' },
    qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    qtyText: { fontWeight: 'bold' },
    checkoutFooter: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    totalLabel: { fontSize: 16, color: '#6B7280' },
    totalAmount: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    confirmOrderBtn: { backgroundColor: '#10B981', padding: 18, borderRadius: 15, alignItems: 'center' },
    confirmOrderBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    resvCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 12, elevation: 2 },
    resvTimeBox: { width: 80, borderRightWidth: 1, borderRightColor: '#E5E7EB', marginRight: 15 },
    resvTime: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    resvDate: { fontSize: 10, color: '#6B7280' },
    resvInfo: { flex: 1 },
    resvCust: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
    resvTable: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    resvStatusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
    resvBadgeSmall: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    resvBadgeTextSmall: { color: '#065F46', fontSize: 10, fontWeight: 'bold' },
    historyCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, elevation: 2 },
    orderPending: { borderLeftColor: '#F59E0B' },
    orderCompleted: { borderLeftColor: '#10B981' },
    historyId: { fontWeight: 'bold', fontSize: 15, color: '#111827' },
    historyDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    historyStatus: { color: '#10B981', fontWeight: 'bold', marginTop: 4 },
    historyTotal: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    historyTable: { fontSize: 13, color: '#6B7280', marginTop: 5 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    billSummary: { backgroundColor: '#F3F4F6', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
    billTotalLabel: { fontSize: 14, color: '#4B5563' },
    billTotalVal: { fontSize: 32, fontWeight: 'bold', color: '#111827', marginTop: 5 },
    payMethodsRow: { flexDirection: 'row', gap: 10, marginVertical: 10 },
    payMethodBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    activePayMethod: { backgroundColor: '#111827', borderColor: '#111827' },
    payMethodText: { fontSize: 12, fontWeight: 'bold', color: '#4B5563' },
    activePayMethodText: { color: 'white' },
    actionRow: { marginTop: 15 },
    printBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#3B82F6' },
    printBtnText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 14 },
    tinyStatusBtn: { backgroundColor: 'white', borderColor: '#BFDBFE', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    tinyStatusText: { fontSize: 10, fontWeight: 'bold', color: '#1E40AF' },

    // Timer Styles
    timerBox: { padding: 12, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', minWidth: 80 },
    timerUrgent: { backgroundColor: '#FEF2F2' },
    timerLate: { backgroundColor: '#EF4444' },
    timerLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
    timerLabelUrgent: { color: '#EF4444' },
    timerText: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2 },
    timerTextUrgent: { color: '#EF4444' },

    // Ticket Styles (Kitchen Parity)
    orderCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 8, borderLeftWidth: 8 },
    newOrderBorder: { borderWidth: 2, borderColor: '#EF4444' },
    newBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
    newBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    largeTableBadge: { backgroundColor: '#0F172A', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12 },
    largeTableText: { color: 'white', fontSize: 22, fontWeight: '900' },
    orderIdText: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
    typePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    typePillText: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    cardSubInfoRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
    highlightPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
    highlightEmoji: { fontSize: 14 },
    highlightTitle: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5 },
    highlightVal: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
    customerNameRow: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 16, marginLeft: 4 },
    splitStatusContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 20, alignItems: 'center' },
    splitStatusItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    splitEmoji: { fontSize: 16, opacity: 0.5 },
    readyEmoji: { opacity: 1 },
    splitValue: { fontSize: 12, fontWeight: '800', color: '#64748B' },
    readyText: { color: '#10B981' },
    splitDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 10 },
    itemsBox: { backgroundColor: '#F8FAFC', borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    itemsLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginBottom: 16 },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: 'white', padding: 12, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1 },
    itemName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    itemCategory: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    qtyBadge: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    qtyText: { fontSize: 16, fontWeight: '900' },
    groupLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 },
    groupDot: { width: 10, height: 10, borderRadius: 5 },
    groupText: { fontSize: 12, fontWeight: '900', color: '#475569', letterSpacing: 1.5 },

    // Sub Tab Styles
    subTabRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 20 },
    subTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeSubTab: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    subTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    activeSubTabText: { color: '#0F172A' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
        width: '100%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827'
    },
    orderSearchContainer: { marginBottom: 20 },
    orderSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
    orderSearchInput: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500' },
    orderGridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    smallOrderCard: { 
        width: '100%', 
        backgroundColor: 'white', 
        borderRadius: 20, 
        marginBottom: 15, 
        shadowColor: '#6366F1', 
        shadowOpacity: 0.08, 
        shadowRadius: 15, 
        elevation: 4, 
        borderWidth: 1, 
        borderColor: '#F1F5F9', 
        flexDirection: 'row', 
        overflow: 'hidden' 
    },
    emptyCard: { padding: 50, alignItems: 'center', backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1' },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 5 },
    emptyText: { fontSize: 12, color: '#94A3B8' },
    compactCardSide: { width: 6, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
    compactCardMain: { flex: 1, padding: 12, justifyContent: 'center' },
    compactSteward: { fontSize: 15, fontWeight: '900', color: '#1E293B' },
    compactTable: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '700' },
    compactCardEnd: { padding: 12, alignItems: 'flex-end', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
    compactTotal: { fontSize: 13, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
    compactStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    compactStatusText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
    statusPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    activeStatusPill: { backgroundColor: '#111827', borderColor: '#111827' },
    statusPillText: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },
    activeStatusPillText: { color: 'white' },
    itemsBoxFlat: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#F1F5F9' },
    billItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    billItemQty: { width: 30, fontSize: 13, fontWeight: 'bold', color: '#3B82F6' },
    billItemName: { flex: 1, fontSize: 13, color: '#1E293B' },
    billItemPrice: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
    billTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    billTotalLabel: { fontSize: 14, fontWeight: '800', color: '#64748B' },
    billTotalValue: { fontSize: 16, fontWeight: '900', color: '#111827' },
    paymentMethodBtn: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#F1F5F9' },
    activePaymentMethod: { borderColor: '#111827', backgroundColor: '#F8FAFC' },
    paymentMethodText: { fontSize: 11, fontWeight: '800', color: '#64748B', marginTop: 4 },
    activePaymentMethodText: { color: '#111827' },
    successBox: { alignItems: 'center', padding: 30, backgroundColor: '#F0FDF4', borderRadius: 24, marginTop: 20 },
    successTitle: { fontSize: 20, fontWeight: 'bold', color: '#065F46', marginTop: 10 },
    successSub: { fontSize: 14, color: '#047857', marginTop: 5 },
    confirmSettleBtn: { backgroundColor: '#10B981', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 20 },
    confirmSettleBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});

export default CashierDashboard;
