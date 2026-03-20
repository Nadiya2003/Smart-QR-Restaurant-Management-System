import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, SafeAreaView, Dimensions, Switch, Vibration, Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import apiConfig from '../../config/api';
import AccountSection from '../AccountSection';

const { width } = Dimensions.get('window');

const SupplierDashboard = () => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Data States
    const [stats, setStats] = useState({ totalItems: 0, lowStockCount: 0, pendingRequests: 0 });
    const [items, setItems] = useState([]);
    const [adminRequests, setAdminRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [history, setHistory] = useState([]);
    
    // Form States
    const [showSupplyModal, setShowSupplyModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [supplyQty, setSupplyQty] = useState('');
    const [supplyMessage, setSupplyMessage] = useState('');
    const [isWholesale, setIsWholesale] = useState(false);
    const [supplyPrice, setSupplyPrice] = useState('');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [statsRes, itemsRes, requestsRes, historyRes, notifRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/supplier/stats`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/supplier/items`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/supplier/admin-requests`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/supplier/history`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/staff-notifications`, { headers }) 
            ]);

            if (statsRes.ok) setStats((await statsRes.json()).stats);
            if (itemsRes.ok) setItems((await itemsRes.json()).items);
            if (requestsRes.ok) setAdminRequests((await requestsRes.json()).requests);
            if (historyRes.ok) setHistory((await historyRes.json()).history);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications);

        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleSendSupplyRequest = async () => {
        if (!selectedItem || !supplyQty) return Alert.alert('Error', 'Please select an item and quantity');
        
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/supplier/supply-request`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    inventory_id: selectedItem.id,
                    quantity: parseFloat(supplyQty),
                    message: supplyMessage,
                    is_wholesale: isWholesale,
                    price: parseFloat(supplyPrice) || 0
                })
            });
            
            if (res.ok) {
                Alert.alert('Success', 'Supply request sent to admin');
                setShowSupplyModal(false);
                setSelectedItem(null);
                setSupplyQty('');
                setSupplyMessage('');
                setIsWholesale(false);
                setSupplyPrice('');
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to send request');
        }
    };

    const handleStatusUpdate = async (orderId, status) => {
        try {
            const endpoint = status === 'DELIVERED' ? 'delivered' : 'status';
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/supplier/orders/${orderId}/${endpoint}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                Alert.alert('Success', `Order marked as ${status}`);
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Action failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update order');
        }
    };

    // UI Renders
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                    onPress={() => setActiveTab('account')}
                    style={[styles.profileBox, activeTab === 'account' && { borderWidth: 2, borderColor: '#fff' }]}
                >
                    {user?.profile_image || user?.image ? (
                        <Image 
                            source={{ uri: (user.profile_image || user.image).startsWith('http') ? (user.profile_image || user.image) : `${apiConfig.API_BASE_URL}${user.profile_image || user.image}` }} 
                            style={{ width: '100%', height: '100%', borderRadius: 25 }}
                        />
                    ) : (
                        <Text style={styles.profileInitial}>{user?.name?.charAt(0)}</Text>
                    )}
                </TouchableOpacity>
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.greeting}>Hello, {user?.name}</Text>
                    <Text style={styles.roleTitle}>Supplier Dashboard</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity 
                    onPress={() => {
                        setSelectedItem(null);
                        setSupplyQty('');
                        setSupplyMessage('');
                        setShowSupplyModal(true);
                    }} 
                    style={[styles.smallBtn, { backgroundColor: '#3B82F6', marginRight: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }]}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Supply</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('notifications')} style={styles.notifBtn}>
                    <Text style={{ fontSize: 22 }}>🔔</Text>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                        <View style={styles.badge} />
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Text style={{ fontSize: 18 }}>🚪</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStats = () => (
        <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.statVal}>{stats.totalItems}</Text>
                <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.statVal, { color: '#EF4444' }]}>{stats.lowStockCount}</Text>
                <Text style={styles.statLabel}>Low Stock</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.statVal}>{stats.pendingRequests}</Text>
                <Text style={styles.statLabel}>Pending</Text>
            </View>
        </View>
    );

    const renderHome = () => (
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.content}
        >
            {renderStats()}
            
            <Text style={styles.sectionTitle}>⚠️ Urgent Alerts</Text>
            {items.filter(i => i.status !== 'Available').map(item => (
                <View key={item.id} style={[styles.alertCard, item.status === 'Out of Stock' ? styles.outOfStockBg : styles.lowStockBg]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>{item.item_name} is {item.status}!</Text>
                        <Text style={styles.alertSub}>Current: {item.quantity} {item.unit} · Min required: {item.min_level}</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.alertBtn} 
                        onPress={() => { setSelectedItem(item); setShowSupplyModal(true); }}
                    >
                        <Text style={styles.alertBtnText}>Restock</Text>
                    </TouchableOpacity>
                </View>
            ))}
            {items.filter(i => i.status !== 'Available').length === 0 && (
                <Text style={styles.emptyText}>No stock alerts at the moment.</Text>
            )}

            <Text style={styles.sectionTitle}>📦 My Items Summary</Text>
            <View style={styles.summaryList}>
                {items.slice(0, 5).map(item => (
                    <View key={item.id} style={styles.summaryItem}>
                        <Text style={styles.summaryName}>{item.item_name}</Text>
                        <Text style={[styles.summaryStatus, { color: item.status === 'Available' ? '#10B981' : '#EF4444' }]}>
                            {item.status}
                        </Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );

    const renderItems = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>My Supplied Items</Text>
            <FlatList 
                data={items}
                keyExtractor={item => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={({ item }) => (
                    <View style={styles.itemCard}>
                        <View style={styles.itemMain}>
                            <Text style={styles.itemName}>{item.item_name}</Text>
                            <View style={[styles.statusBadgeSmall, {
                                backgroundColor: item.status === 'Available' ? '#10B981' : (item.status === 'Low Stock' ? '#F59E0B' : '#EF4444')
                            }]}>
                                <Text style={styles.statusTextSmall}>{item.status}</Text>
                            </View>
                        </View>
                        <View style={styles.itemDetails}>
                            <Text style={styles.itemDetailText}>Stock: {item.quantity} {item.unit}</Text>
                            <Text style={styles.itemDetailText}>Min: {item.min_level}</Text>
                            <Text style={styles.itemDetailText}>Updated: {new Date(item.updated_at).toLocaleDateString()}</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.restockBtn}
                            onPress={() => { setSelectedItem(item); setShowSupplyModal(true); }}
                        >
                            <Text style={styles.restockBtnText}>Request Restock</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );

    const renderRequests = () => (
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.content}
        >
            <Text style={styles.sectionTitle}>Admin Orders</Text>
            {adminRequests.length === 0 ? (
                <Text style={styles.emptyText}>No active orders from Admin.</Text>
            ) : (
                adminRequests.map(req => (
                    <View key={req.id} style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                            <Text style={styles.orderId}>Order #{req.id}</Text>
                            <Text style={[styles.priorityText, { color: req.priority === 'Urgent' ? '#EF4444' : '#6B7280' }]}>
                                {req.priority}
                            </Text>
                        </View>
                        <Text style={styles.orderInfo}>Requested Amount: Rs. {req.total_amount}</Text>
                        <Text style={styles.orderNotes}>{req.notes}</Text>
                        
                        {req.status === 'PENDING' ? (
                            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleStatusUpdate(req.id, 'APPROVED')}>
                                <Text style={styles.acceptBtnText}>Accept Order</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: '#10B981' }]} onPress={() => handleStatusUpdate(req.id, 'DELIVERED')}>
                                <Text style={styles.acceptBtnText}>Mark as Delivered</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            
            <View style={styles.mainContainer}>
                {activeTab === 'home' && renderHome()}
                {activeTab === 'items' && renderItems()}
                {activeTab === 'requests' && renderRequests()}
                {activeTab === 'history' && (
                    <ScrollView style={styles.content}>
                        <Text style={styles.sectionTitle}>Supply History</Text>
                        {history.map(h => (
                            <View key={h.id} style={styles.historyCard}>
                                <Text style={styles.historyName}>{h.item_name}</Text>
                                <Text style={styles.historyQty}>Delivered: {h.quantity} {h.unit}</Text>
                                <Text style={styles.historyTime}>{new Date(h.delivered_at).toLocaleDateString()} {new Date(h.delivered_at).toLocaleTimeString()}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
                {activeTab === 'account' && (
                    <View style={{ flex: 1, padding: 15 }}>
                        <AccountSection />
                    </View>
                )}
                {activeTab === 'notifications' && (
                    <ScrollView style={styles.content}>
                        <Text style={styles.sectionTitle}>Notifications</Text>
                        {notifications.map(n => (
                            <View key={n.id} style={[styles.notifCard, !n.is_read && styles.unreadNotif]}>
                                <Text style={styles.notifTitle}>{n.title}</Text>
                                <Text style={styles.notifMsg}>{n.message}</Text>
                                <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleTimeString()}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => setActiveTab('home')} style={[styles.navItem, activeTab === 'home' && styles.activeNav]}>
                    <Text style={activeTab === 'home' ? styles.activeNavText : styles.navText}>🏠</Text>
                    <Text style={activeTab === 'home' ? styles.activeNavLabel : styles.navLabel}>Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('items')} style={[styles.navItem, activeTab === 'items' && styles.activeNav]}>
                    <Text style={activeTab === 'items' ? styles.activeNavText : styles.navText}>📦</Text>
                    <Text style={activeTab === 'items' ? styles.activeNavLabel : styles.navLabel}>Items</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('requests')} style={[styles.navItem, activeTab === 'requests' && styles.activeNav]}>
                    <Text style={activeTab === 'requests' ? styles.activeNavText : styles.navText}>📥</Text>
                    <Text style={activeTab === 'requests' ? styles.activeNavLabel : styles.navLabel}>Orders</Text>
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

            {/* Supply Request Modal */}
            <Modal visible={showSupplyModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Supply Request</Text>
                        {selectedItem ? (
                            <Text style={styles.modalSub}>Item: {selectedItem.item_name} ({selectedItem.quantity} currently in stock)</Text>
                        ) : (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.label}>Select Item to Supply</Text>
                                <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
                                    {items.map(item => (
                                        <TouchableOpacity 
                                            key={item.id} 
                                            style={[styles.supPill, selectedItem?.id === item.id && styles.activeSupPill, { borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 8 }]}
                                            onPress={() => setSelectedItem(item)}
                                        >
                                            <Text style={[styles.supPillText, selectedItem?.id === item.id && styles.activeSupPillText, { fontSize: 13, color: selectedItem?.id === item.id ? '#fff' : '#4B5563' }]}>
                                                {item.item_name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                {items.length === 0 && (
                                    <Text style={styles.emptyText}>No items found.</Text>
                                )}
                            </View>
                        )}
                        
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Quantity</Text>
                                <TextInput 
                                    placeholder="Qty..."
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={supplyQty}
                                    onChangeText={setSupplyQty}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Unit Price (Rs)</Text>
                                <TextInput 
                                    placeholder="Price..."
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={supplyPrice}
                                    onChangeText={setSupplyPrice}
                                />
                            </View>
                        </View>

                        <View style={styles.toggleRow}>
                            <Text style={styles.label}>Wholesale Order?</Text>
                            <Switch 
                                value={isWholesale} 
                                onValueChange={setIsWholesale}
                                trackColor={{ false: "#767577", true: "#3B82F6" }}
                                thumbColor={isWholesale ? "#fff" : "#f4f3f4"}
                            />
                        </View>

                        <Text style={styles.label}>Message / Notes</Text>
                        <TextInput 
                            placeholder="Optional message..."
                            style={[styles.input, { height: 60 }]}
                            multiline
                            value={supplyMessage}
                            onChangeText={setSupplyMessage}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setShowSupplyModal(false)} style={styles.cancelBtn}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSendSupplyRequest} style={styles.confirmBtn}>
                                <Text style={{ color: 'white' }}>Send Request</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
    profileBox: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
    profileInitial: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    greeting: { fontSize: 18, fontWeight: '700', color: '#111827' },
    roleTitle: { fontSize: 13, color: '#6B7280' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    notifBtn: { marginRight: 15, position: 'relative', padding: 5 },
    badge: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    logoutBtn: { padding: 5 },
    mainContainer: { flex: 1 },
    statsRow: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
    statBox: { width: (width - 60) / 3, padding: 15, borderRadius: 16, alignItems: 'center' },
    statVal: { fontSize: 24, fontWeight: '800', color: '#1E40AF' },
    statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    content: { flex: 1, padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#111827' },
    alertCard: { padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    lowStockBg: { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
    outOfStockBg: { backgroundColor: '#FEE2E2', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
    alertTitle: { fontWeight: '700', color: '#111827' },
    alertSub: { fontSize: 12, color: '#4B5563', marginTop: 2 },
    alertBtn: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
    alertBtnText: { fontSize: 12, fontWeight: '700', color: '#111827' },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginVertical: 20 },
    summaryList: { backgroundColor: '#fff', borderRadius: 16, padding: 15 },
    summaryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    summaryName: { fontWeight: '500', color: '#374151' },
    summaryStatus: { fontSize: 13, fontWeight: '600' },
    itemCard: { backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 12, borderLeftWidth: 4 },
    itemMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    itemName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusTextSmall: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    itemDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    itemDetailText: { fontSize: 12, color: '#6B7280' },
    restockBtn: { backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    restockBtnText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
    orderCard: { backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 12 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    orderId: { fontWeight: '700', color: '#111827' },
    priorityText: { fontSize: 12, fontWeight: 'bold' },
    orderInfo: { color: '#374151', marginBottom: 5 },
    orderNotes: { fontSize: 13, color: '#6B7280', marginBottom: 15 },
    acceptBtn: { backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    acceptBtnText: { color: '#fff', fontWeight: '700' },
    historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10 },
    historyName: { fontWeight: '700', color: '#111827' },
    historyQty: { fontSize: 13, color: '#4B5563', marginVertical: 4 },
    historyTime: { fontSize: 11, color: '#9CA3AF' },
    notifCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10 },
    unreadNotif: { borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
    notifTitle: { fontWeight: '700', color: '#111827' },
    notifMsg: { fontSize: 13, color: '#4B5563', marginTop: 4 },
    notifTime: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
    bottomNav: { height: 75, backgroundColor: '#fff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    activeNav: { borderTopWidth: 2, borderTopColor: '#3B82F6' },
    navText: { fontSize: 22, opacity: 0.5 },
    activeNavText: { fontSize: 22 },
    navLabel: { fontSize: 10, color: '#6B7280', marginTop: 4 },
    activeNavLabel: { fontSize: 10, color: '#3B82F6', fontWeight: '700', marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 25 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 10 },
    modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
    input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, marginBottom: 15 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 12 },
    cancelBtn: { padding: 15, flex: 1, alignItems: 'center' },
    confirmBtn: { backgroundColor: '#3B82F6', padding: 15, flex: 2, borderRadius: 12, alignItems: 'center' },
    activeSupPill: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 }
});

export default SupplierDashboard;
