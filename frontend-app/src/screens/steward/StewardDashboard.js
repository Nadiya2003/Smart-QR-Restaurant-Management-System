import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, SafeAreaView, Dimensions, Switch
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import apiConfig from '../../config/api';

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
    
    // Modal States
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [orderDetail, setOrderDetail] = useState(null);
    const [showAddItems, setShowAddItems] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            // Parallel fetches
            const [tableRes, orderRes, notifRes, menuRes, dutyRes, resvRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/tables`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/orders/steward/${user.id}`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/notifications`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/menu`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/duty/status`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/reservations`, { headers })
            ]);

            if (tableRes.ok) setTables((await tableRes.json()).tables || []);
            if (orderRes.ok) setOrders((await orderRes.json()).orders || []);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);
            if (menuRes.ok) setMenuItems((await menuRes.json()) || []);
            if (dutyRes.ok) setIsOnDuty((await dutyRes.json()).onDuty);
            if (resvRes.ok) setReservations((await resvRes.json()).reservations || []);

            // Fetch dining areas for grouping
            const areaRes = await fetch(`${apiConfig.API_BASE_URL}/api/admin/areas`, { headers });
            if (areaRes.ok) setDiningAreas((await areaRes.json()).areas || []);

            if (activeTab === 'history') {
                const histRes = await fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/orders/history/${user.id}`, { headers });
                if (histRes.ok) setHistory((await histRes.json()).orders || []);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, user.id, activeTab]);

    useEffect(() => {
        fetchData();
        // Set up polling (every 10 seconds) for real-time feel
        const interval = setInterval(() => {
            fetchData(true);
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

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

    const handleAddItem = async (menuItem) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/orders/${orderDetail.id}/add-item`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    menu_item_id: menuItem.id,
                    quantity: 1,
                    price: menuItem.price
                })
            });
            if (res.ok) {
                Alert.alert('Added', `${menuItem.name} added to order`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to add item');
        }
    };

    const startOrder = async (table) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/orders/dine-in`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    table_number: table.table_number,
                    steward_id: user.id,
                    items: [], 
                    total_price: 0
                })
            });
            if (res.ok) {
                Alert.alert('Success', `Order started for Table ${table.table_number}`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to start order');
        }
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
                <View style={styles.profileBox}>
                    {user?.steward_image ? (
                        <Image 
                            source={{ uri: user.steward_image.startsWith('http') ? user.steward_image : `${apiConfig.API_BASE_URL}${user.steward_image}` }} 
                            style={styles.profileImg}
                        />
                    ) : (
                        <Text style={styles.profileInitial}>{user?.name?.charAt(0)}</Text>
                    )}
                </View>
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.greeting}>Hello, {user?.name}</Text>
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
                <Text style={styles.statLabel}>My Orders</Text>
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
            
            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>🗺️ Restaurant Layout</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Tap a table to manage it</Text>
                </View>
                <TouchableOpacity onPress={() => fetchData(true)}>
                    <Text style={styles.linkText}>Refresh</Text>
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


    const renderTableItem = (table) => (
        <TouchableOpacity 
            key={table.id} 
            style={[
                styles.tableBox, 
                (table.status === 'not available' || table.status === 'occupied') ? styles.tableBoxOccupied : styles.tableBoxAvailable
            ]}
            onPress={() => {
                if (!isOnDuty) return Alert.alert('Attention', 'Please check-in to manage tables');
                setSelectedTable(table);
                if (table.current_order_id) {
                    const ord = orders.find(o => o.id === table.current_order_id);
                    if (ord) setOrderDetail(ord);
                    Alert.alert(
                        `Table ${table.table_number}`,
                        `Order #${table.current_order_id} is active (${table.order_status})\nStatus: NOT AVAILABLE\nAssigned to: ${table.steward_name || 'You'}`,
                        [
                            { text: 'Manage Order', onPress: () => setActiveTab('orders') },
                            { text: 'Mark Available', style: 'destructive', onPress: () => handleTableStatusUpdate(table.id, 'available') },
                            { text: 'Close', style: 'cancel' }
                        ]
                    );
                } else {
                    Alert.alert(
                        `Table ${table.table_number}`,
                        `Status: ${table.status.toUpperCase()}\nArea: ${table.area_name}\nCapacity: ${table.capacity || 4} seats\nToday's Booking: ${table.today_reservations}`,
                        [
                            { text: 'Start Order', onPress: () => startOrder(table) },
                            { text: 'Mark Not Available', onPress: () => handleTableStatusUpdate(table.id, 'not available') },
                            { text: 'Cancel', style: 'cancel' }
                        ]
                    );
                }
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.tableNum}>T-{table.table_number}</Text>
                <Text style={{ fontSize: 12 }}>{(table.status === 'not available' || table.status === 'occupied') ? '🔴' : '🟢'}</Text>
            </View>
            <Text style={styles.tableCap}>👥 {table.capacity || 4} Seats</Text>
            
            {table.steward_name && (
                <Text style={{ fontSize: 9, color: '#059669', marginTop: 4, fontWeight: '700' }}>👤 {table.steward_name}</Text>
            )}
            
            {table.today_reservations > 0 && (
                <View style={{ marginTop: 5, backgroundColor: '#FDE68A', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center', color: '#92400E' }}>📅 Reserved Today</Text>
                </View>
            )}
            
            {table.order_status && (
                <View style={{ marginTop: 4, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: '#DBEAFE', borderRadius: 4 }}>
                    <Text style={{ fontSize: 8, color: '#1E40AF', fontWeight: 'bold', textAlign: 'center' }}>{table.order_status}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

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
                        <Text style={styles.orderTable}>Table {order.table_number}</Text>
                        <View style={styles.orderItems}>
                            {order.items?.map((item, idx) => (
                                <Text key={idx} style={styles.itemText}>• {item.name} x{item.quantity}</Text>
                            ))}
                        </View>
                        
                        <View style={styles.actionRow}>
                            <TouchableOpacity 
                                style={styles.actionBtn} 
                                onPress={() => {
                                    setOrderDetail(order);
                                    setShowAddItems(true);
                                }}
                            >
                                <Text style={styles.actionBtnText}>Add Items</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} 
                                onPress={() => {
                                    const nextStatus = order.status === 'PENDING' ? 'CONFIRMED' : 
                                                      order.status === 'CONFIRMED' ? 'PREPARING' : 
                                                      order.status === 'PREPARING' ? 'READY' : 
                                                      order.status === 'READY' ? 'SERVED' : 'COMPLETED';
                                    handleUpdateStatus(order.id, nextStatus);
                                }}
                            >
                                <Text style={styles.actionBtnText}>Update</Text>
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

    const renderMenu = () => (
        <View style={styles.content}>
             <FlatList
                data={menuItems}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.menuCard}>
                        <Image 
                            source={{ uri: item.image ? (item.image.startsWith('http') ? item.image : `${apiConfig.API_BASE_URL}${item.image}`) : 'https://via.placeholder.com/100' }} 
                            style={styles.menuImg} 
                        />
                        <View style={styles.menuInfo}>
                            <Text style={styles.menuName}>{item.name}</Text>
                            <Text style={styles.menuPrice}>Rs. {item.price}</Text>
                        </View>
                        {orderDetail && (
                            <TouchableOpacity style={styles.addBtn} onPress={() => handleAddItem(item)}>
                                <Text style={styles.addBtnText}>+</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        </View>
    );

    const renderReservations = () => (
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.content}
        >
            <Text style={styles.sectionTitle}>Confirmed Reservations</Text>
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
                <View key={order.id} style={styles.historyCard}>
                    <Text style={styles.historyId}>#{order.id} - Table {order.table_number}</Text>
                    <Text style={styles.historyDate}>{new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}</Text>
                    <Text style={styles.historyStatus}>{order.status}</Text>
                    <Text style={styles.historyTotal}>Rs. {order.total_price}</Text>
                </View>
            ))}
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            
            <View style={styles.mainContainer}>
                {activeTab === 'home' && renderHome()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'menu' && renderMenu()}
                {activeTab === 'reservations' && renderReservations()}
                {activeTab === 'history' && renderHistory()}
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
            </View>

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

            {/* Add Items Modal */}
            <Modal visible={showAddItems} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '80%' }]}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Add to Order #{orderDetail?.id}</Text>
                          <TouchableOpacity onPress={() => setShowAddItems(false)}><Text style={{fontSize: 20}}>✕</Text></TouchableOpacity>
                        </View>
                        {renderMenu()}
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { padding: 15, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
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
    content: { flex: 1, padding: 20 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statBox: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    statVal: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 12, color: '#4B5563', marginTop: 4 },
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
    confirmBtn: { flex: 2, padding: 16, alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 12 }
});

export default StewardDashboard;
