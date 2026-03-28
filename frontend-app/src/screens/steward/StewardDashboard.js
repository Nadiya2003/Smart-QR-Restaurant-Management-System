import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, Dimensions, Switch, Vibration, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useAuth } from '../../context/AuthContext';
import apiConfig from '../../config/api';
import AccountSection from '../AccountSection';
import { io } from 'socket.io-client';

const { width } = Dimensions.get('window');

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
    // Real-time order notification modal
    const [newOrderNotif, setNewOrderNotif] = useState(null);
    const [cancelNotif, setCancelNotif] = useState(null);

    // Reservation Filters
    const [filterResDate, setFilterResDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTableDate, setFilterTableDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTableTime, setFilterTableTime] = useState('19:00');

    const playNotificationSound = async () => {
        try {
            // Short notification buzzer
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
                { shouldPlay: true }
            );
            await sound.playAsync();
            // Automatically unload from memory after playing to prevent memory leaks
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) sound.unloadAsync();
            });
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

            if (tableRes.ok) setTables((await tableRes.json()).tables || []);
            if (orderRes.ok) setOrders((await orderRes.json()).orders || []);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);
            const menuData = await menuRes.json();
            setMenuItems(menuData || []);
            
            // Set default category if not set
            if (menuData.length > 0 && !selectedMenuCategory) {
               const cats = [...new Set(menuData.map(item => item.category))];
               if (cats.length > 0) setSelectedMenuCategory(cats[0]);
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
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, user.id, activeTab, filterResDate, filterTableDate, filterTableTime]);

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
            if (data.staffId === user.id && data.status !== 'SESSION_ENDED') {
                Vibration && Vibration.vibrate([100, 200, 100, 200]);
                playNotificationSound(); // <-- NEW PIANO/BUZZER SOUND
                setNewOrderNotif(data); // Trigger rich modal
                fetchData(true); 
            }
        });

        socket.on('cancelRequest', (data) => {
            if (data.staffId === user.id) {
                Vibration && Vibration.vibrate([300, 150, 300]);
                if (data.playSound || true) playNotificationSound(); // <-- MANDATORY SOUND FOR CANCEL
                setCancelNotif(data);
                fetchData(true);
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
                Alert.alert('Success', `Order status updated to ${status}`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
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
                Alert.alert('Success', 'Cancellation request sent to admin');
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
                Alert.alert('Success', 'Order updated and sent to Kitchen/Bar');
                setCart([]);
                setShowCart(false);
                setActiveOrderContext(null);
                setActiveTab('orders');
                fetchData();
            } else {
                const errorData = await res.json();
                Alert.alert('Order Failed', errorData.message || 'Server error');
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
                <View style={[styles.areaSection, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 2 }]}>
                    <View style={styles.areaHeader}>
                        <Text style={[styles.areaTitle, { color: '#166534' }]}>📋 My Orders</Text>
                        <Text style={styles.areaSub}>You have {orders.length} active orders to attend</Text>
                    </View>
                    <View style={styles.tableGrid}>
                        {orders.map(order => {
                            const isOccupied = order.status !== 'COMPLETED';
                            return (
                                <TouchableOpacity 
                                    key={`order-${order.id}`} 
                                    style={[styles.tableBox, isOccupied ? styles.tableBoxOccupied : styles.tableBoxAvailable]}
                                    onPress={() => setActiveTab('orders')}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.tableNum}>T-{order.table_number}</Text>
                                        <Text style={{ fontSize: 12 }}>{isOccupied ? '🔴' : '🟢'}</Text>
                                    </View>
                                    <View style={{ marginTop: 5, backgroundColor: '#FEF3C7', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text style={{ fontSize: 9, fontWeight: 'bold', textAlign: 'center', color: '#92400E' }} numberOfLines={1}>
                                            👤 {order.customer_name || 'Guest'}
                                        </Text>
                                    </View>
                                    <View style={{ marginTop: 4, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: '#DBEAFE', borderRadius: 4 }}>
                                        <Text style={{ fontSize: 8, color: '#1E40AF', fontWeight: 'bold', textAlign: 'center' }}>{order.status}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
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
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15, paddingHorizontal: 5 }}>
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: 'white', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
                    onPress={() => setFilterModal({
                        show: true,
                        title: 'Check Date',
                        placeholder: 'Format: YYYY-MM-DD',
                        value: filterTableDate,
                        onSubmit: (val) => {
                            if(val.match(/^\d{4}-\d{2}-\d{2}$/)) setFilterTableDate(val);
                            else Alert.alert('Invalid Format', 'Please use YYYY-MM-DD');
                        }
                    })}
                >
                    <Text style={{ fontSize: 11, textAlign: 'center' }}>📅 {filterTableDate}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: 'white', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
                    onPress={() => setFilterModal({
                        show: true,
                        title: 'Check Time',
                        placeholder: 'Format: HH:MM',
                        value: filterTableTime,
                        onSubmit: (val) => {
                            if(val.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) setFilterTableTime(val);
                            else Alert.alert('Invalid Format', 'Please use HH:MM (24h)');
                        }
                    })}
                >
                    <Text style={{ fontSize: 11, textAlign: 'center' }}>🕒 {filterTableTime}</Text>
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
        const isReserved = table.current_status === 'reserved';
        const isOccupied = table.status === 'not available' || table.status === 'occupied';

        return (
            <TouchableOpacity 
                key={table.id} 
                style={[
                    styles.tableBox, 
                    (isReserved || isOccupied) ? styles.tableBoxOccupied : styles.tableBoxAvailable
                ]}
                onPress={() => {
                    if (isReserved) {
                        const res = table.reservation_details;
                        Alert.alert(
                            `Table ${table.table_number} - RESERVED`,
                            `Customer: ${res?.customer_name || 'Guest'}\nTime: ${res?.time || '--:--'}\nGuests: ${res?.guests || 0}`,
                            [{ text: 'Close' }]
                        );
                        return;
                    }
                    if (!isOnDuty) return Alert.alert('Attention', 'Please check-in to manage tables');
                    setSelectedTable(table);
                    
                    if (table.current_order_id) {
                        Alert.alert(
                            `Table ${table.table_number}`,
                            `Existing Order #${table.current_order_id} active.`,
                            [
                                { 
                                    text: 'Add Items (Existing)', 
                                    onPress: () => {
                                        setActiveOrderContext({ type: 'update', table, orderId: table.current_order_id });
                                        setActiveTab('menu');
                                    }
                                },
                                { text: 'Mark Available (Clear)', style: 'destructive', onPress: () => handleTableStatusUpdate(table.id, 'available') },
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
                                { text: 'Mark Not Available', onPress: () => handleTableStatusUpdate(table.id, 'not available') },
                                { text: 'Cancel', style: 'cancel' }
                            ]
                        );
                    }
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.tableNum}>T-{table.table_number}</Text>
                    <Text style={{ fontSize: 12 }}>{(isReserved || isOccupied) ? '🔴' : '🟢'}</Text>
                </View>
                <Text style={styles.tableCap}>👥 {table.capacity || 4} Seats</Text>
                
                {isReserved ? (
                    <View style={{ marginTop: 5, backgroundColor: '#FEE2E2', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center', color: '#B91C1C' }}>📅 {table.reservation_details?.customer_name || 'Guest'}</Text>
                    </View>
                ) : (
                    <>
                    {table.steward_name && (
                        <Text style={{ fontSize: 9, color: '#059669', marginTop: 4, fontWeight: '700' }}>👤 {table.steward_name}</Text>
                    )}
                    
                    {table.order_status && (
                        <View style={{ marginTop: 4, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: '#DBEAFE', borderRadius: 4 }}>
                            <Text style={{ fontSize: 8, color: '#1E40AF', fontWeight: 'bold', textAlign: 'center' }}>{table.order_status}</Text>
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
            <Text style={styles.sectionTitle}>Active Orders</Text>
            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No active orders assigned to you.</Text>
                </View>
            ) : (
                orders.map(order => (
                    <View key={order.id} style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                            <Text style={styles.orderId}>Order #{order.id}</Text>
                            <View style={[styles.statusBadge, { 
                                backgroundColor: order.status === 'READY' ? '#10B981' : '#F59E0B' 
                            }]}>
                                <Text style={styles.statusText}>{order.status}</Text>
                            </View>
                        </View>

                        {/* Table + Customer Info Row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={styles.orderTable}>Table {order.table_number}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                        </View>

                        <View style={styles.orderItems}>
                            {order.items?.map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={styles.itemText}>• {item.name} x{item.quantity}</Text>
                                    {(order.status !== 'COMPLETED' && order.status !== 'CANCELLED') && (
                                        <TouchableOpacity onPress={() => handleRemovePlacedItem(order.id, item.id, item.name)}>
                                            <Text style={{ fontSize: 16, color: '#EF4444', paddingHorizontal: 5 }}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
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
                ))
            )}
        </ScrollView>
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

                {filteredItems.length === 0 ? (
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
                                    <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cart.reduce((s,i)=>s+i.quantity, 0)}</Text></View>
                                    <Text style={styles.cartLabel}>View Order Cart</Text>
                                </View>
                                <Text style={styles.cartTotal}>Rs. {cart.reduce((s,i)=>s+(i.price*i.quantity), 0)}</Text>
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
                            if(val.match(/^\d{4}-\d{2}-\d{2}$/)) setFilterResDate(val);
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
                        </View>
                        <View style={styles.resvBadgeSmall}>
                            <Text style={styles.resvBadgeTextSmall}>Confirmed</Text>
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
            {/* Header with its own background to cover status bar */}
            <View style={{ backgroundColor: 'white' }}>
                <SafeAreaView edges={['top', 'left', 'right']}>
                    {renderHeader()}
                </SafeAreaView>
            </View>
            
        <View style={styles.mainContainer}>
            {/* ============ RICH ORDER NOTIFICATION MODAL ============ */}
            <Modal
                visible={!!newOrderNotif}
                transparent
                animationType="fade"
                onRequestClose={() => setNewOrderNotif(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20 }}>
                        {/* Icon */}
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: newOrderNotif?.isUpdate ? '#FEF3C7' : '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 36 }}>{newOrderNotif?.isUpdate ? '🔄' : '🛎️'}</Text>
                        </View>

                        {/* Title */}
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 4, textAlign: 'center' }}>
                            {newOrderNotif?.isUpdate ? 'Order Updated!' : 'New Order!'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
                            {newOrderNotif?.isUpdate
                                ? 'A customer has added more items to their existing order.'
                                : 'A new order has been placed and assigned to you.'}
                        </Text>

                        {/* Highlighted Details */}
                        <View style={{ width: '100%', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 10, marginBottom: 20 }}>
                            {/* Order ID */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Order</Text>
                                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                                    <Text style={{ fontWeight: '900', color: '#4F46E5', fontSize: 14 }}>#{newOrderNotif?.orderId}</Text>
                                </View>
                            </View>

                            {/* Table */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Table</Text>
                                <View style={{ backgroundColor: newOrderNotif?.isUpdate ? '#FEF3C7' : '#DCFCE7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                                    <Text style={{ fontWeight: '900', color: newOrderNotif?.isUpdate ? '#92400E' : '#166534', fontSize: 14 }}>
                                        🪑 Table {newOrderNotif?.tableNumber || 'N/A'}
                                    </Text>
                                </View>
                            </View>

                            {/* Customer */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Customer</Text>
                                <View style={{ backgroundColor: newOrderNotif?.customerType === 'registered' ? '#EEF2FF' : '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                                    <Text style={{ fontWeight: '900', color: newOrderNotif?.customerType === 'registered' ? '#4F46E5' : '#92400E', fontSize: 14 }}>
                                        {newOrderNotif?.customerType === 'registered' ? '👤' : '🙋'} {newOrderNotif?.customerName || 'Guest'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* CTA Button */}
                        <TouchableOpacity
                            style={{ width: '100%', backgroundColor: newOrderNotif?.isUpdate ? '#F59E0B' : '#10B981', paddingVertical: 14, borderRadius: 20, alignItems: 'center' }}
                            onPress={() => { setNewOrderNotif(null); setActiveTab('orders'); }}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>
                                {newOrderNotif?.isUpdate ? '🔄  View Updated Order' : '✅  Got it! View Orders'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setNewOrderNotif(null)} style={{ marginTop: 12 }}>
                            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ============ RICH CANCELLATION REQUEST MODAL ============ */}
            <Modal
                visible={!!cancelNotif}
                transparent
                animationType="fade"
                onRequestClose={() => setCancelNotif(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20 }}>
                        {/* Icon */}
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 36 }}>🚫</Text>
                        </View>

                        {/* Title */}
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 4, textAlign: 'center' }}>
                            Cancel Request!
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
                            A customer wants to cancel their order.
                        </Text>

                        {/* Highlighted Details */}
                        <View style={{ width: '100%', backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, gap: 10, marginBottom: 20 }}>
                            {/* Partial Indicator */}
                            {cancelNotif?.isPartial && (
                                <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ fontWeight: '900', color: 'white', fontSize: 11, letterSpacing: 0.5 }}>⚠️ PARTIAL CANCELLATION</Text>
                                </View>
                            )}

                            {/* Order ID */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, color: '#991B1B', fontWeight: '600' }}>Order</Text>
                                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                                    <Text style={{ fontWeight: '900', color: '#B91C1C', fontSize: 14 }}>#{cancelNotif?.orderId}</Text>
                                </View>
                            </View>

                            {/* Table */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, color: '#991B1B', fontWeight: '600' }}>Table</Text>
                                <View style={{ backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#FEE2E2' }}>
                                    <Text style={{ fontWeight: '900', color: '#B91C1C', fontSize: 14 }}>
                                        🪑 Table {cancelNotif?.tableNumber || 'N/A'}
                                    </Text>
                                </View>
                            </View>

                            {/* Reason */}
                            <View style={{ marginTop: 5, borderTopWidth: 1, borderTopColor: '#FECACA', pt: 8 }}>
                                <Text style={{ fontSize: 11, color: '#991B1B', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Reason:</Text>
                                <Text style={{ fontStyle: 'italic', color: '#4B5563', fontSize: 13 }}>"{cancelNotif?.reason || 'No reason provided'}"</Text>
                            </View>
                        </View>

                        {/* Action Btn */}
                        <TouchableOpacity
                            style={{ width: '100%', backgroundColor: '#DC2626', paddingVertical: 14, borderRadius: 20, alignItems: 'center' }}
                            onPress={() => { setCancelNotif(null); setActiveTab('orders'); }}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>
                                👁️ View & Approve
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setCancelNotif(null)} style={{ marginTop: 12 }}>
                            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
                             <View key={n.id} style={[styles.notifCard, n.status === 'unread' && styles.unreadNotif]}>
                                 <Text style={styles.notifTitle}>{n.title}</Text>
                                 <Text style={styles.notifMsg}>{n.message}</Text>
                                 <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleTimeString()}</Text>
                             </View>
                         ))}
                    </ScrollView>
                )}
            </View>

            {/* Duty Lock Overlay */}
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

            {/* Use SafeAreaView only for the bottom nav */}
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'white' }}>
                {/* Bottom Nav */}
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

            {/* Cancel Modal */}
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

            {/* Cart Modal */}
            <Modal visible={showCart} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Table T-{activeOrderContext?.table.table_number}</Text>
                                <Text style={styles.modalSub}>Confirm items to place order</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowCart(false)}>
                                <Text style={{fontSize: 24, padding: 5}}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.cartList}>
                            {cart.map(item => (
                                <View key={item.id} style={styles.cartItem}>
                                    <View style={{flex: 1}}>
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
                                        <Text style={{fontSize: 18}}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.cartFooter}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Amount</Text>
                                <Text style={styles.totalValue}>Rs. {cart.reduce((s,i)=>s+(i.price*i.quantity), 0)}</Text>
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

            {/* Status Update Modal */}
            <Modal visible={showStatusModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Status</Text>
                            <TouchableOpacity onPress={() => setShowStatusModal(false)}><Text style={{fontSize: 20}}>✕</Text></TouchableOpacity>
                        </View>
                        <Text style={{ marginBottom: 20, color: '#6B7280' }}>Order #{selectedStatusOrder?.id} - Table {selectedStatusOrder?.table_number}</Text>
                        
                        <View style={{ gap: 10 }}>
                            {['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'].map((status) => (
                                <TouchableOpacity 
                                    key={status} 
                                    style={[
                                        styles.statusOption, 
                                        selectedStatusOrder?.status === status && { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' }
                                    ]}
                                    onPress={() => {
                                        handleUpdateStatus(selectedStatusOrder.id, status);
                                        setShowStatusModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.statusOptionText,
                                        selectedStatusOrder?.status === status && { color: '#1E40AF', fontWeight: 'bold' }
                                    ]}>{status}</Text>
                                    {selectedStatusOrder?.status === status && <Text>✅</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Filter Modal */}
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

            {/* History Detail Modal */}
            <Modal visible={showHistoryModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Order Details</Text>
                                <Text style={styles.modalSub}>Viewing #{selectedHistoryOrder?.id}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                                <Text style={{fontSize: 24, padding: 5}}>✕</Text>
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
        paddingHorizontal: 15,
        paddingBottom: 15,
        paddingTop: 0,
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
    mainContainer: { flex: 1 },
    content: { flex: 1, padding: 15, paddingTop: 5 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, paddingHorizontal: 5 },
    statBox: { 
        width: (width - 60) / 2, // 2 per row
        padding: 15, 
        borderRadius: 12, 
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statVal: { fontSize: 22, fontWeight: 'bold' },
    statLabel: { fontSize: 11, color: '#4B5563', marginTop: 4 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    linkText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
    dutyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 20, borderLeftWidth: 6 },
    onDutyBg: { backgroundColor: '#D1FAE5', borderLeftColor: '#10B981' },
    offDutyBg: { backgroundColor: '#F3F4F6', borderLeftColor: '#9CA3AF' },
    dutyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    dutySub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
    areaHeader: { marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6', paddingLeft: 12 },
    areaTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    areaSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
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
    tableBoxOccupied: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    tableBoxAvailable: {
        backgroundColor: '#F0FDF4',
        borderColor: '#86EFAC',
    },
    tableNum: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
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
    historyCard: { backgroundColor: 'white', paddingColor: 15, borderRadius: 12, marginBottom: 10, padding: 15, borderLeftWidth: 4, borderLeftColor: '#10B981' },
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
});

export default StewardDashboard;
