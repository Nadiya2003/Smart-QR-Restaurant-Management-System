import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, Dimensions, Vibration, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';
import AccountSection from './AccountSection';

const { width } = Dimensions.get('window');

const InventoryDashboard = () => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('inventory');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Data States
    const [inventory, setInventory] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [restockRequests, setRestockRequests] = useState([]);
    const [stockHistory, setStockHistory] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [supplierOrders, setSupplierOrders] = useState([]);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');

    // Modal States
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    // Form States
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [requestQty, setRequestQty] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');

    const [inventoryForm, setInventoryForm] = useState({
        item_name: '',
        category: 'Kitchen',
        unit: 'kg',
        quantity: '0',
        min_level: '5',
        supplier_id: ''
    });

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', onPress: logout }
        ]);
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const params = new URLSearchParams({
                search: searchQuery,
                category: selectedCategory,
                status: selectedStatus
            }).toString();

            const [invRes, supRes, reqRes, histRes, notifRes, repoRes, orderRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/inventory?${params}`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/suppliers`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/restock-requests`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/history`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/notifications`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/report?startDate=${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`, { headers }),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/supplier-orders`, { headers })
            ]);

            if (invRes.ok) setInventory((await invRes.json()).inventory || []);
            if (supRes.ok) setSuppliers((await supRes.json()).suppliers || []);
            if (reqRes.ok) setRestockRequests((await reqRes.json()).requests || []);
            if (histRes.ok) setStockHistory((await histRes.json()).history || []);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);
            if (repoRes.ok) setReportData(await repoRes.json());
            if (orderRes.ok) setSupplierOrders((await orderRes.json()).orders || []);

            // Vibration for Low Stock Alerts (if any new ones)
            const lowStockCount = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;
            if (lowStockCount > 0 && isSilent) {
                // Subtle alert
            }

        } catch (error) {
            console.error('Inventory Fetch error:', error);
            if (!isSilent) Alert.alert('Error', 'Failed to fetch inventory data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, searchQuery, selectedCategory, selectedStatus]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Action Handlers
    const handleAdjustStock = async (type) => {
        if (!adjustQty || isNaN(adjustQty)) return Alert.alert('Error', 'Please enter a valid quantity');
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/adjust`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    inventory_id: selectedItem.id,
                    action_type: type,
                    quantity: parseFloat(adjustQty),
                    reason: adjustReason
                })
            });
            if (res.ok) {
                Alert.alert('Success', 'Stock adjusted successfully');
                setShowAdjustModal(false);
                setAdjustQty('');
                setAdjustReason('');
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to adjust stock');
        }
    };

    const handleCreateRequest = async () => {
        if (!selectedItem) return Alert.alert('Error', 'Please select an item to restock');
        if (!requestQty || isNaN(requestQty)) return Alert.alert('Error', 'Please enter quantity');
        if (!selectedSupplierId) return Alert.alert('Error', 'Please select a supplier');

        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/restock-request`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    inventory_id: selectedItem.id,
                    supplier_id: selectedSupplierId,
                    quantity: parseFloat(requestQty)
                })
            });
            if (res.ok) {
                Alert.alert('Success', 'Restock request sent to Admin');
                setShowRequestModal(false);
                setRequestQty('');
                setSelectedSupplierId('');
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create request');
        }
    };

    const handleSaveInventory = async () => {
        if (!inventoryForm.item_name || !inventoryForm.quantity || !inventoryForm.min_level) {
            return Alert.alert('Error', 'Please fill all required fields');
        }

        const method = editingItem ? 'PUT' : 'POST';
        const url = editingItem 
            ? `${apiConfig.API_BASE_URL}/api/inventory/${editingItem.id}` 
            : `${apiConfig.API_BASE_URL}/api/inventory`;

        try {
            setLoading(true);
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify({
                    ...inventoryForm,
                    quantity: parseFloat(inventoryForm.quantity),
                    min_level: parseFloat(inventoryForm.min_level),
                    supplier_id: inventoryForm.supplier_id || null
                })
            });

            if (res.ok) {
                Alert.alert('Success', `Item ${editingItem ? 'updated' : 'created'} successfully`);
                setShowInventoryModal(false);
                setEditingItem(null);
                setInventoryForm({ item_name: '', category: 'Kitchen', unit: 'kg', quantity: '0', min_level: '5', supplier_id: '' });
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to save item');
            }
        } catch (error) {
            Alert.alert('Error', 'Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInventory = (id) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to remove this item permanently?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/${id}`, {
                            method: 'DELETE',
                            headers
                        });
                        if (res.ok) {
                            Alert.alert('Deleted', 'Item removed from inventory');
                            fetchData();
                        }
                    } catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            }
        ]);
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
                    <Text style={styles.greeting}>Inventory Portal</Text>
                    <Text style={styles.roleTitle}>{user?.name} · Manager</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
                {(activeTab === 'inventory' || activeTab === 'orders') && (
                    <TouchableOpacity 
                        onPress={() => {
                            setSelectedItem(null);
                            setRequestQty('');
                            setSelectedSupplierId('');
                            setShowRequestModal(true);
                        }} 
                        style={[styles.headerActionBtn, { backgroundColor: '#3B82F6', marginRight: 10 }]}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Order</Text>
                    </TouchableOpacity>
                )}
                {activeTab === 'inventory' && (
                    <TouchableOpacity 
                        onPress={() => {
                            setEditingItem(null);
                            setInventoryForm({ item_name: '', category: 'Kitchen', unit: 'kg', quantity: '0', min_level: '5', supplier_id: '' });
                            setShowInventoryModal(true);
                        }} 
                        style={[styles.headerActionBtn, { backgroundColor: '#10B981', marginRight: 10 }]}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Item</Text>
                    </TouchableOpacity>
                )}
                {activeTab === 'requests' && (
                    <TouchableOpacity 
                        onPress={() => {
                            setSelectedItem(null);
                            setRequestQty('');
                            setSelectedSupplierId('');
                            setShowRequestModal(true);
                        }} 
                        style={[styles.headerActionBtn, { backgroundColor: '#3B82F6', marginRight: 10 }]}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Request</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={{ fontSize: 18 }}>🚪</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderInventoryItem = (item) => {
        const isLow = item.status === 'Low Stock';
        const isOut = item.status === 'Out of Stock';
        
        return (
            <View key={item.id} style={[styles.itemCard, isOut && styles.outCard]}>
                <View style={styles.itemHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.item_name}</Text>
                        <Text style={styles.itemCategory}>{item.category} · {item.unit}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TouchableOpacity 
                            onPress={() => {
                                setEditingItem(item);
                                setInventoryForm({
                                    item_name: item.item_name,
                                    category: item.category,
                                    unit: item.unit,
                                    quantity: item.quantity.toString(),
                                    min_level: item.min_level.toString(),
                                    supplier_id: item.supplier_id?.toString() || ''
                                });
                                setShowInventoryModal(true);
                            }}
                        >
                            <Text style={{ fontSize: 16 }}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteInventory(item.id)}>
                            <Text style={{ fontSize: 16 }}>🗑️</Text>
                        </TouchableOpacity>
                        <View style={[styles.statusBadge, 
                            isOut ? styles.statusBadgeOut : (isLow ? styles.statusBadgeLow : styles.statusBadgeOk)
                        ]}>
                            <Text style={[styles.statusText, 
                                isOut ? styles.statusTextOut : (isLow ? styles.statusTextLow : styles.statusTextOk)
                            ]}>{item.status}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.itemBody}>
                    <View style={styles.stockInfo}>
                        <Text style={styles.stockLabel}>Available</Text>
                        <Text style={[styles.stockValue, (isLow || isOut) && { color: '#EF4444' }]}>{item.quantity}</Text>
                    </View>
                    <View style={styles.stockInfo}>
                        <Text style={styles.stockLabel}>Limit</Text>
                        <Text style={styles.stockValue}>{item.min_level}</Text>
                    </View>
                    <View style={[styles.stockInfo, { borderRightWidth: 0 }]}>
                        <Text style={styles.stockLabel}>Supplier</Text>
                        <Text style={styles.stockValue} numberOfLines={1}>{item.supplier_name || 'N/A'}</Text>
                    </View>
                </View>

                <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                        Last Updated: {new Date(item.last_updated || item.updated_at).toLocaleString()}
                    </Text>
                </View>

                <View style={styles.itemActions}>
                    <TouchableOpacity 
                        style={[styles.itemActionBtn, { backgroundColor: '#F3F4F6' }]}
                        onPress={() => {
                            setSelectedItem(item);
                            setShowAdjustModal(true);
                        }}
                    >
                        <Text style={styles.itemActionText}>Adjust Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.itemActionBtn, { backgroundColor: '#111827' }]}
                        onPress={() => {
                            setSelectedItem(item);
                            setShowRequestModal(true);
                        }}
                    >
                        <Text style={[styles.itemActionText, { color: 'white' }]}>Restock Request</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderInventory = () => {
        const categories = ['Kitchen', 'Bar', 'General'];
        
        const groups = {};
        inventory.forEach(item => {
            const cat = categories.includes(item.category) ? item.category : 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        return (
            <View style={{ flex: 1 }}>
                <View style={styles.filterBar}>
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Search stock..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                        {['All', ...categories].map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.catPill, selectedCategory === cat && styles.activeCatPill]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[styles.catPillText, selectedCategory === cat && styles.activeCatPillText]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView 
                    style={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {inventory.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No items found matching your filters.</Text>
                        </View>
                    ) : (
                        selectedCategory === 'All' ? (
                            categories.map(cat => (
                                groups[cat] && groups[cat].length > 0 && (
                                    <View key={cat} style={{ marginBottom: 20 }}>
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>{cat} Stock</Text>
                                            <View style={styles.sectionLine} />
                                        </View>
                                        {groups[cat].map(item => renderInventoryItem(item))}
                                    </View>
                                )
                            ))
                        ) : (
                            inventory.map(item => renderInventoryItem(item))
                        )
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        );
    };

    const handleUpdateReqStatus = async (id, status, origin) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/restock-requests/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status, origin })
            });
            if (res.ok) {
                Alert.alert('Success', `Request marked as ${status}`);
                fetchData();
            }
        } catch (e) { Alert.alert('Error', 'Update failed'); }
    };

    const renderRequests = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Stock Requests & Offers</Text>
            {restockRequests.length === 0 ? (
                <View style={styles.emptyState}><Text style={styles.emptyText}>No active requests.</Text></View>
            ) : (
                restockRequests.map(req => (
                    <View key={`${req.origin}-${req.id}`} style={[styles.requestCard, req.origin === 'SUPPLIER' && { borderLeftColor: '#3B82F6' }]}>
                        <View style={styles.reqHeader}>
                            <View>
                                <Text style={styles.reqItem}>{req.item_name}</Text>
                                <Text style={{ fontSize: 10, color: req.origin === 'SUPPLIER' ? '#3B82F6' : '#6B7280', fontWeight: 'bold' }}>
                                    {req.origin === 'SUPPLIER' ? 'SUPPLIER OFFER' : 'INTERNAL REQUEST'}
                                </Text>
                            </View>
                            <View style={[styles.reqBadge, styles[`badge${req.status}`]]}>
                                <Text style={styles.reqBadgeText}>{req.status}</Text>
                            </View>
                        </View>
                        <Text style={styles.reqDetails}>Qty: {req.quantity}{req.unit} · Supplier: {req.supplier_name}</Text>
                        <Text style={styles.reqDate}>By {req.requester_name} on {new Date(req.created_at).toLocaleDateString()}</Text>
                        
                        {req.status === 'PENDING' && (
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                                <TouchableOpacity 
                                    style={[styles.smallBtn, { backgroundColor: '#10B981', flex: 1, alignItems: 'center', padding: 10, borderRadius: 8 }]}
                                    onPress={() => handleUpdateReqStatus(req.id, req.origin === 'SUPPLIER' ? 'APPROVED' : 'COMPLETED', req.origin)}
                                >
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                                        {req.origin === 'SUPPLIER' ? 'Approve Offer' : 'Mark Completed'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.smallBtn, { backgroundColor: '#F3F4F6', flex: 0.5, alignItems: 'center', padding: 10, borderRadius: 8 }]}
                                    onPress={() => handleUpdateReqStatus(req.id, 'REJECTED', req.origin)}
                                >
                                    <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 13 }}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {req.status === 'APPROVED' && req.origin === 'RETAILER' && (
                             <TouchableOpacity 
                                style={[styles.smallBtn, { backgroundColor: '#111827', marginTop: 15, alignItems: 'center', padding: 10, borderRadius: 8 }]}
                                onPress={() => handleUpdateReqStatus(req.id, 'COMPLETED', req.origin)}
                             >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Mark as Received</Text>
                             </TouchableOpacity>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );

    const renderHistory = () => (
        <ScrollView style={styles.content}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Action Logs</Text>
                <Text style={styles.historySub}>Last 100 updates</Text>
            </View>
            {stockHistory.map(log => (
                <View key={log.id} style={styles.historyRow}>
                    <View style={[styles.histType, styles[`histType${log.action_type}`]]}>
                        <Text style={styles.histTypeText}>{log.action_type}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.histItem}>{log.item_name}</Text>
                        <Text style={styles.histReason}>{log.reason || 'Manual Adjustment'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.histQty}>{log.action_type === 'REDUCE' ? '-' : '+'}{log.quantity}</Text>
                        <Text style={styles.histTime}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>
            ))}
        </ScrollView>
    );

    const renderOrders = () => (
        <ScrollView style={styles.content}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Supplier Orders Tracking</Text>
                <TouchableOpacity 
                    onPress={() => {
                        setSelectedItem(null);
                        setRequestQty('');
                        setSelectedSupplierId('');
                        setShowRequestModal(true);
                    }} 
                    style={[styles.headerActionBtn, { backgroundColor: '#3B82F6', marginRight: 0 }]}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>+ New Order</Text>
                </TouchableOpacity>
            </View>
            {supplierOrders.length === 0 ? (
                <View style={styles.emptyState}><Text style={styles.emptyText}>No active supplier orders.</Text></View>
            ) : (
                supplierOrders.map(order => (
                    <View key={order.id} style={styles.requestCard}>
                        <View style={styles.reqHeader}>
                            <View>
                                <Text style={styles.reqItem}>{order.item_name || 'Stock Order'}</Text>
                                <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: 'bold' }}>Order #{order.id}</Text>
                            </View>
                            <View style={[styles.reqBadge, { backgroundColor: order.status === 'DELIVERED' ? '#D1FAE5' : '#DBEAFE' }]}>
                                <Text style={[styles.reqBadgeText, { color: order.status === 'DELIVERED' ? '#059669' : '#3B82F6' }]}>{order.status}</Text>
                            </View>
                        </View>
                        <Text style={styles.reqDetails}>Qty: {order.quantity}{order.unit} · Total: Rs. {Number(order.total_amount).toLocaleString()}</Text>
                        <Text style={styles.reqDetails}>Supplier: {order.supplier_name}</Text>
                        <Text style={styles.reqDate}>Ordered on {new Date(order.created_at).toLocaleDateString()}</Text>
                    </View>
                ))
            )}
        </ScrollView>
    );

    const handleGenerateReport = () => {
        Alert.alert('Generating Report', 'Downloading PDF Report...', [{ text: 'OK' }]);
    };

    const renderReport = () => {
        if (!reportData) return (
            <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#111827" />
                <Text>Loading stats...</Text>
            </View>
        );
        return (
            <ScrollView style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Inventory Analytics</Text>
                    <TouchableOpacity onPress={handleGenerateReport} style={[styles.headerActionBtn, { backgroundColor: '#4F46E5' }]}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Download PDF</Text>
                    </TouchableOpacity>
                </View>

                {/* Status Stats */}
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Current Stock Status</Text>
                <View style={[styles.statsRow, { flexDirection: 'row', gap: 10 }]}>
                    {reportData.statusStats?.map(s => (
                        <View key={s.status} style={[styles.statBox, { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: s.status === 'Available' ? '#D1FAE5' : s.status === 'Low Stock' ? '#FEF3C7' : '#FEE2E2' }]}>
                            <Text style={[{ fontSize: 24, fontWeight: 'bold' }, { color: s.status === 'Available' ? '#065F46' : s.status === 'Low Stock' ? '#D97706' : '#DC2626' }]}>{s.count}</Text>
                            <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>{s.status}</Text>
                        </View>
                    ))}
                </View>

                {/* Most Used Items */}
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 20 }}>Most Used Items</Text>
                {reportData.usageStats?.length > 0 ? (
                    reportData.usageStats.map(u => (
                        <View key={u.item_name} style={[styles.itemCard, { padding: 12, marginBottom: 8 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.itemName}>{u.item_name}</Text>
                                <Text style={styles.statusTextOk}>{u.used_quantity} units used</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.subText}>No usage data available for this period.</Text>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <View style={styles.mainContainer}>
                {activeTab === 'inventory' && renderInventory()}
                {activeTab === 'requests' && renderRequests()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'history' && renderHistory()}
                {activeTab === 'report' && renderReport()}
                {activeTab === 'account' && (
                    <View style={{ flex: 1, padding: 15 }}>
                        <AccountSection />
                    </View>
                )}
            </View>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity onPress={() => setActiveTab('inventory')} style={[styles.navItem, activeTab === 'inventory' && styles.activeNav]}>
                    <Text style={styles.navIcon}>📦</Text>
                    <Text style={[styles.navLabel, activeTab === 'inventory' && styles.activeNavLabel]}>Stock</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('requests')} style={[styles.navItem, activeTab === 'requests' && styles.activeNav]}>
                    <Text style={styles.navIcon}>🚚</Text>
                    <Text style={[styles.navLabel, activeTab === 'requests' && styles.activeNavLabel]}>Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('orders')} style={[styles.navItem, activeTab === 'orders' && styles.activeNav]}>
                    <Text style={styles.navIcon}>📤</Text>
                    <Text style={[styles.navLabel, activeTab === 'orders' && styles.activeNavLabel]}>Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.navItem, activeTab === 'history' && styles.activeNav]}>
                    <Text style={styles.navIcon}>📜</Text>
                    <Text style={[styles.navLabel, activeTab === 'history' && styles.activeNavLabel]}>Logs</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('report')} style={[styles.navItem, activeTab === 'report' && styles.activeNav]}>
                    <Text style={styles.navIcon}>📊</Text>
                    <Text style={[styles.navLabel, activeTab === 'report' && styles.activeNavLabel]}>Stats</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('account')} style={[styles.navItem, activeTab === 'account' && styles.activeNav]}>
                    <Text style={styles.navIcon}>👤</Text>
                    <Text style={[styles.navLabel, activeTab === 'account' && styles.activeNavLabel]}>Profile</Text>
                </TouchableOpacity>
            </View>

            {/* Inventory CRUD Modal */}
            <Modal visible={showInventoryModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { flex: 1, maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
                            <TouchableOpacity onPress={() => setShowInventoryModal(false)}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Item Name *</Text>
                                <TextInput 
                                    style={styles.input}
                                    placeholder="e.g. Tomato Sauce"
                                    value={inventoryForm.item_name}
                                    onChangeText={t => setInventoryForm({...inventoryForm, item_name: t})}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Category</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 5 }}>
                                        {['Kitchen', 'Bar', 'General'].map(c => (
                                            <TouchableOpacity 
                                                key={c}
                                                style={[styles.smallPill, inventoryForm.category === c && styles.activePill]}
                                                onPress={() => setInventoryForm({...inventoryForm, category: c})}
                                            >
                                                <Text style={[styles.pillText, inventoryForm.category === c && styles.activePillText]}>{c}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Unit</Text>
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="kg, l, units..."
                                        value={inventoryForm.unit}
                                        onChangeText={t => setInventoryForm({...inventoryForm, unit: t})}
                                    />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Quantity *</Text>
                                    <TextInput 
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        value={inventoryForm.quantity?.toString()}
                                        onChangeText={t => setInventoryForm({...inventoryForm, quantity: t})}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Min Level *</Text>
                                    <TextInput 
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="5"
                                        value={inventoryForm.min_level?.toString()}
                                        onChangeText={t => setInventoryForm({...inventoryForm, min_level: t})}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Default Supplier</Text>
                                <ScrollView horizontal style={{ marginTop: 5 }}>
                                    {suppliers.map(s => (
                                        <TouchableOpacity 
                                            key={s.id}
                                            style={[styles.smallPill, inventoryForm.supplier_id == s.id && styles.activePill]}
                                            onPress={() => setInventoryForm({...inventoryForm, supplier_id: s.id})}
                                        >
                                            <Text style={[styles.pillText, inventoryForm.supplier_id == s.id && styles.activePillText]}>{s.brand_name || s.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveInventory}>
                            <Text style={styles.btnTextWhite}>{editingItem ? 'Save Changes' : 'Create Item'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Adjust Modal */}
            <Modal visible={showAdjustModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Adjust {selectedItem?.item_name}</Text>
                            <TouchableOpacity onPress={() => setShowAdjustModal(false)}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
                        </View>
                        <Text style={styles.modalSub}>Current: {selectedItem?.quantity} {selectedItem?.unit}</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Adjustment Quantity</Text>
                            <TextInput 
                                style={styles.input}
                                placeholder="e.g. 5"
                                keyboardType="numeric"
                                value={adjustQty}
                                onChangeText={setAdjustQty}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Reason / Note</Text>
                            <TextInput 
                                style={[styles.input, { height: 80 }]}
                                placeholder="Why are you adjusting this?"
                                multiline
                                value={adjustReason}
                                onChangeText={setAdjustReason}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalActionBtn, { backgroundColor: '#EF4444' }]} 
                                onPress={() => handleAdjustStock('REDUCE')}
                            >
                                <Text style={styles.btnTextWhite}>Subtract</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalActionBtn, { backgroundColor: '#10B981' }]} 
                                onPress={() => handleAdjustStock('ADD')}
                            >
                                <Text style={styles.btnTextWhite}>Add Only</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Request Modal */}
            <Modal visible={showRequestModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Supply Order</Text>
                            <TouchableOpacity onPress={() => setShowRequestModal(false)}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
                        </View>
                        {selectedItem ? (
                            <Text style={styles.modalSub}>{selectedItem.item_name} (Min Level: {selectedItem.min_level})</Text>
                        ) : (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Select Item to Order</Text>
                                <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
                                    {inventory.map(i => (
                                        <TouchableOpacity 
                                            key={i.id} 
                                            style={[styles.supPill, selectedItem?.id === i.id && styles.activeSupPill, { borderWidth: 1, borderColor: '#E5E7EB' }]}
                                            onPress={() => setSelectedItem(i)}
                                        >
                                            <Text style={[styles.supPillText, selectedItem?.id === i.id && styles.activeSupPillText]}>{i.item_name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                {inventory.length === 0 && (
                                    <Text style={styles.subText}>No inventory items found.</Text>
                                )}
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Required Quantity</Text>
                            <TextInput 
                                style={styles.input}
                                placeholder={`Amount in ${selectedItem?.unit}`}
                                keyboardType="numeric"
                                value={requestQty}
                                onChangeText={setRequestQty}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Supplier</Text>
                            <ScrollView horizontal style={{ marginTop: 8 }}>
                                {suppliers.map(s => (
                                    <TouchableOpacity 
                                        key={s.id} 
                                        style={[styles.supPill, selectedSupplierId === s.id && styles.activeSupPill]}
                                        onPress={() => setSelectedSupplierId(s.id)}
                                    >
                                        <Text style={[styles.supPillText, selectedSupplierId === s.id && styles.activeSupPillText]}>{s.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateRequest}>
                            <Text style={styles.btnTextWhite}>Send Request to Admin</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    profileBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    profileInitial: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    greeting: { fontSize: 12, color: '#6B7280' },
    roleTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    logoutBtn: { padding: 8 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerActionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    mainContainer: { flex: 1 },
    content: { flex: 1, padding: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginRight: 10 },
    sectionLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },

    // Pills
    smallPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    activePill: { backgroundColor: '#111827', borderColor: '#111827' },
    pillText: { fontSize: 12, color: '#4B5563' },
    activePillText: { color: 'white', fontWeight: 'bold' },
    
    // Inventory Items
    itemCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 2,
    },
    outCard: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    itemName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    itemCategory: { fontSize: 13, color: '#6B7280' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadgeOk: { backgroundColor: '#D1FAE5' },
    statusBadgeLow: { backgroundColor: '#FEF3C7' },
    statusBadgeOut: { backgroundColor: '#FEE2E2' },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    statusTextOk: { color: '#059669' },
    statusTextLow: { color: '#D97706' },
    statusTextOut: { color: '#DC2626' },
    
    itemBody: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingVertical: 12, marginBottom: 12 },
    stockInfo: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F3F4F6' },
    stockLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
    stockValue: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
    
    itemActions: { flexDirection: 'row', gap: 10 },
    itemActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    itemActionText: { fontSize: 13, fontWeight: 'bold' },

    // Filters
    filterBar: { backgroundColor: 'white', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
    searchIcon: { fontSize: 16, marginRight: 8 },
    searchInput: { flex: 1, height: 40, fontSize: 14 },
    catScroll: { flexDirection: 'row' },
    catPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    activeCatPill: { backgroundColor: '#111827' },
    catPillText: { fontSize: 13, color: '#4B5563' },
    activeCatPillText: { color: 'white', fontWeight: 'bold' },

    // Requests
    requestCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#111827' },
    reqHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    reqItem: { fontSize: 16, fontWeight: 'bold' },
    reqBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgePENDING: { backgroundColor: '#FEF3C7' },
    badgeAPPROVED: { backgroundColor: '#DBEAFE' },
    badgeCOMPLETED: { backgroundColor: '#D1FAE5' },
    reqBadgeText: { fontSize: 10, fontWeight: 'bold' },
    reqDetails: { fontSize: 13, color: '#4B5563' },
    reqDate: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

    // History
    historyRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
    histType: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, width: 65, alignItems: 'center' },
    histTypeADD: { backgroundColor: '#D1FAE5' },
    histTypeREDUCE: { backgroundColor: '#FEE2E2' },
    histTypeRESTOCK: { backgroundColor: '#DBEAFE' },
    histTypeADJUST: { backgroundColor: '#F3F4F6' },
    histTypeText: { fontSize: 10, fontWeight: 'bold' },
    histItem: { fontSize: 14, fontWeight: 'bold' },
    histReason: { fontSize: 11, color: '#9CA3AF' },
    histQty: { fontSize: 14, fontWeight: 'bold' },
    histTime: { fontSize: 10, color: '#9CA3AF' },

    // Tabs
    bottomNav: { flexDirection: 'row', height: 75, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: 15 },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    activeNav: { borderTopWidth: 2, borderTopColor: '#111827' },
    navIcon: { fontSize: 20, marginBottom: 2 },
    navLabel: { fontSize: 10, color: '#9CA3AF' },
    activeNavLabel: { color: '#111827', fontWeight: 'bold' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 400 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#F9FAFB' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
    modalActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    btnTextWhite: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    subText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    supPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    activeSupPill: { borderColor: '#111827', backgroundColor: '#F9FAFB' },
    supPillText: { fontSize: 13, color: '#4B5563' },
    activeSupPillText: { color: '#111827', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },

    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#9CA3AF', textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
});

export default InventoryDashboard;
