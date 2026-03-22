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
            if (orderRes.ok) setOrders((await orderRes.json()).orders || []);
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
            try {
                Vibration.vibrate([0, 500, 200, 500]);
            } catch (e) {
                console.warn('Vibration failed', e);
            }
            Alert.alert('New Order!', `New delivery order #${data?.orderId} from ${data?.customer_name || 'Guest'}`);
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
                Alert.alert('Error', errData.message || 'Failed to create order');
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
                <Text style={styles.sectionTitle}>📦 Active Deliveries</Text>
                <TouchableOpacity onPress={() => setActiveTab('orders')}>
                    <Text style={styles.linkText}>View All</Text>
                </TouchableOpacity>
            </View>

            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No active deliveries at the moment.</Text>
                </View>
            ) : (
                orders.filter(o => ['Pending', 'Ready', 'Out for Delivery'].includes(o.status)).map(order => renderOrderCard(order))
            )}
        </ScrollView>
    );

    const renderOrderCard = (order) => (
        <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderCardHeader}>
                <View>
                    <Text style={styles.orderIdText}>Order #{order.id}</Text>
                    <Text style={styles.orderTimeText}>{new Date(order.created_at).toLocaleTimeString()}</Text>
                </View>
                <View style={[styles.statusBadge, getStatusColor(order.status)]}>
                    <Text style={styles.statusBadgeText}>{order.status}</Text>
                </View>
            </View>

            <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{order?.customer_name || 'Guest'}</Text>
                <Text style={styles.customerPhone}>📞 {order.phone}</Text>
                <Text style={styles.customerAddress} numberOfLines={2}>📍 {order.address}</Text>
            </View>

            <View style={styles.orderActionRow}>
                <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={() => setSelectedOrder(order) || setShowOrderModal(true)}
                >
                    <Text style={styles.actionBtnText}>Details</Text>
                </TouchableOpacity>

                {order.status === 'Pending' && (
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                        onPress={() => setEditingOrder(order) || setIsEditing(true)}
                    >
                        <Text style={styles.actionBtnText}>+ Items</Text>
                    </TouchableOpacity>
                )}
                
                {order.status === 'Ready' && (
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleUpdateStatus(order.id, 'Out for Delivery')}
                    >
                        <Text style={styles.actionBtnText}>Pick Up</Text>
                    </TouchableOpacity>
                )}

                {order.status === 'Out for Delivery' && (
                    <>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                            onPress={() => openInMaps(order.latitude, order.longitude, order.address)}
                        >
                            <Text style={styles.actionBtnText}>📍 Map</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                            onPress={() => handleUpdateStatus(order.id, 'Delivered')}
                        >
                            <Text style={styles.actionBtnText}>Done</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );

    const getStatusColor = (status) => {
        switch(status) {
            case 'Pending': return { backgroundColor: '#F3F4F6' };
            case 'Preparing': return { backgroundColor: '#DBEAFE' };
            case 'Ready': return { backgroundColor: '#D1FAE5' };
            case 'Out for Delivery': return { backgroundColor: '#FEF3C7' };
            case 'Delivered': return { backgroundColor: '#DEF7EC' };
            default: return { backgroundColor: '#F3F4F6' };
        }
    };

    const renderOrdersTab = () => (
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.content}
        >
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📦 All Delivery Orders</Text>
                <Text style={styles.orderCount}>{orders.length} total</Text>
            </View>

            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No delivery orders found.</Text>
                </View>
            ) : (
                orders.map(order => renderOrderCard(order))
            )}
        </ScrollView>
    );

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
            <Text style={styles.sectionTitle}>📜 Delivery History</Text>
            {history.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No past deliveries found for today.</Text>
                </View>
            ) : (
                history.map(order => (
                    <View key={order.id} style={styles.historyCard}>
                        <View>
                            <Text style={styles.historyId}>#{order?.id} - {order?.customer_name || 'Guest'}</Text>
                            <Text style={styles.historyDate}>{new Date(order.created_at).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.historyTotal}>Rs. {order.total_price}</Text>
                    </View>
                ))
            )}
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
                                <Text style={styles.modalVal}>Status: {selectedOrder?.payment_status}</Text>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={[styles.footerBtn, { backgroundColor: '#EF4444' }]} 
                                onPress={() => setShowOrderModal(false) || setShowCancelModal(true)}
                            >
                                <Text style={styles.footerBtnText}>Req. Cancel</Text>
                            </TouchableOpacity>
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
        </>
    );

    // Final Return Update
    return (
        <View style={styles.container}>
            {renderHeader()}
            
            <View style={styles.mainContainer}>
                {activeTab === 'home' && renderHome()}
                {activeTab === 'orders' && renderOrdersTab()}
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
                <TouchableOpacity onPress={() => setActiveTab('orders')} style={[styles.navItem, activeTab === 'orders' && styles.activeNav]}>
                    <Text style={activeTab === 'orders' ? styles.activeNavText : styles.navText}>📦</Text>
                    <Text style={activeTab === 'orders' ? styles.activeNavLabel : styles.navLabel}>Orders</Text>
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
    activeNavLabel: { color: '#111827', fontWeight: 'bold' }
});

export default DeliveryRiderDashboard;
