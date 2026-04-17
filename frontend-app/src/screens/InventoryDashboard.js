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
import InventoryReports from './InventoryReports';

const { width } = Dimensions.get('window');

const InventoryDashboard = ({ onLogout }) => {
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
    const [modalMode, setModalMode] = useState('request'); // 'request' or 'direct'
    const [orderPrice, setOrderPrice] = useState('');

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
            { 
                text: 'Logout', 
                onPress: async () => {
                    await logout();
                    if (onLogout) onLogout();
                } 
            }
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

            // 1. Fetch Inventory & Core Data (Parallel with individual error handling)
            const [invRes, supRes, reqRes, histRes, notifRes, orderRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/inventory?${params}`, { headers }).catch(e => ({ ok: false })),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/suppliers`, { headers }).catch(e => ({ ok: false })),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/restock-requests`, { headers }).catch(e => ({ ok: false })),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/history`, { headers }).catch(e => ({ ok: false })),
                fetch(`${apiConfig.API_BASE_URL}/api/staff-notifications`, { headers }).catch(e => ({ ok: false })),
                fetch(`${apiConfig.API_BASE_URL}/api/inventory/supplier-orders`, { headers }).catch(e => ({ ok: false }))
            ]);

            if (invRes.ok) setInventory((await invRes.json()).inventory || []);
            if (supRes.ok) setSuppliers((await supRes.json()).suppliers || []);
            if (reqRes.ok) setRestockRequests((await reqRes.json()).requests || []);
            if (histRes.ok) setStockHistory((await histRes.json()).history || []);
            if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);
            if (orderRes.ok) setSupplierOrders((await orderRes.json()).orders || []);

            // 2. Fetch Reports Separately (Don't let it block core inventory if it fails)
            try {
                const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                const end = new Date().toISOString().split('T')[0];
                const repoRes = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/report?startDate=${start}&endDate=${end}`, { headers });
                if (repoRes.ok) setReportData(await repoRes.json());
            } catch (repoErr) {
                console.warn('Report fetch failed:', repoErr.message);
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

    const handleUpdateSupplierOrderStatus = async (id, status) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/supplier-orders/${id}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                Alert.alert('Success', `Order status updated to ${status}`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update order status');
        }
    };

    const handleCreateSupplierOrder = async () => {
        if (!selectedItem) return Alert.alert('Error', 'Please select an item');
        if (!requestQty || isNaN(requestQty)) return Alert.alert('Error', 'Please enter quantity');
        if (!selectedSupplierId) return Alert.alert('Error', 'Please select a supplier');

        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/supplier-orders`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    inventory_id: selectedItem.id,
                    supplier_id: selectedSupplierId,
                    quantity: parseFloat(requestQty),
                    total_amount: parseFloat(orderPrice) || 0,
                    notes: `Direct order from Inventory Portal`
                })
            });
            if (res.ok) {
                Alert.alert('Success', 'Supplier order placed successfully');
                setShowRequestModal(false);
                setRequestQty('');
                setOrderPrice('');
                setSelectedSupplierId('');
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create order');
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
                                setModalMode('direct');
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
                                setModalMode('request');
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
                            setModalMode('request');
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
                        setModalMode('direct');
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
                            <View style={[styles.reqBadge, { 
                                backgroundColor: order.status === 'DELIVERED' ? '#D1FAE5' : (order.status === 'COMPLETED' ? '#F3F4F6' : '#DBEAFE') 
                            }]}>
                                <Text style={[styles.reqBadgeText, { 
                                    color: order.status === 'DELIVERED' ? '#059669' : (order.status === 'COMPLETED' ? '#6B7280' : '#3B82F6') 
                                }]}>{order.status}</Text>
                            </View>
                        </View>
                        <Text style={styles.reqDetails}>Qty: {order.quantity}{order.unit} · Total: Rs. {Number(order.total_amount).toLocaleString()}</Text>
                        <Text style={styles.reqDetails}>Supplier: {order.supplier_name}</Text>
                        <Text style={styles.reqDate}>Ordered on {new Date(order.created_at).toLocaleDateString()}</Text>
                        
                        {order.status === 'DELIVERED' && (
                             <TouchableOpacity 
                                 style={[styles.smallBtn, { backgroundColor: '#10B981', marginTop: 15, alignItems: 'center', padding: 10, borderRadius: 8 }]}
                                 onPress={() => handleUpdateSupplierOrderStatus(order.id, 'COMPLETED')}
                             >
                                 <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Finalize & Complete</Text>
                             </TouchableOpacity>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );

    const renderReport = () => {
        // Derive quick stats from already-loaded inventory state
        const totalItems     = inventory.length;
        const availableItems = inventory.filter(i => i.status === 'Available').length;
        const lowStockItems  = inventory.filter(i => i.status === 'Low Stock').length;
        const outItems       = inventory.filter(i => i.status === 'Out of Stock').length;
        const criticalPct    = totalItems > 0 ? Math.round(((lowStockItems + outItems) / totalItems) * 100) : 0;

        const now   = new Date();
        const month = now.toLocaleString('default', { month: 'long', year: 'numeric' });

        const statCards = [
            { icon: '📦', label: 'Total Items',   value: totalItems,     color: '#3B82F6', bg: '#EFF6FF' },
            { icon: '✅', label: 'In Stock',       value: availableItems, color: '#10B981', bg: '#ECFDF5' },
            { icon: '⚠️', label: 'Low Stock',     value: lowStockItems,  color: '#F59E0B', bg: '#FFFBEB' },
            { icon: '🚨', label: 'Out of Stock',  value: outItems,       color: '#EF4444', bg: '#FEF2F2' },
        ];

        const quickActions = [
            { icon: '📊', label: 'Full Reports',      desc: 'Analytics & charts',  onPress: () => setActiveTab('fullreport'), isReport: true },
            { icon: '📋', label: 'All Items',          desc: 'Browse inventory',     onPress: () => setActiveTab('inventory') },
            { icon: '⚠️', label: 'Low Stock',         desc: `${lowStockItems} items`, onPress: () => setActiveTab('inventory'), warn: lowStockItems > 0 },
            { icon: '🚚', label: 'Restock Requests',  desc: 'Pending requests',     onPress: () => setActiveTab('requests') },
        ];

        const recentLow = inventory.filter(i => i.status !== 'Available').slice(0, 5);

        return (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Hero welcome banner ── */}
                <View style={statsS.hero}>
                    <View style={{ flex: 1 }}>
                        <Text style={statsS.heroGreeting}>Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'} 👋</Text>
                        <Text style={statsS.heroName}>{user?.name?.split(' ')[0] || 'Manager'}</Text>
                        <Text style={statsS.heroPeriod}>{month} · Inventory Overview</Text>
                    </View>
                    <View style={[statsS.healthBadge, { backgroundColor: criticalPct > 20 ? '#FEE2E2' : '#DCFCE7' }]}>
                        <Text style={{ fontSize: 20 }}>{criticalPct > 20 ? '⚠️' : '✅'}</Text>
                        <Text style={[statsS.healthPct, { color: criticalPct > 20 ? '#DC2626' : '#16A34A' }]}>{100 - criticalPct}%</Text>
                        <Text style={[statsS.healthLbl, { color: criticalPct > 20 ? '#DC2626' : '#16A34A' }]}>Healthy</Text>
                    </View>
                </View>

                {/* ── KPI Grid ── */}
                <Text style={statsS.sectionLbl}>📈 STOCK SNAPSHOT</Text>
                <View style={statsS.kpiGrid}>
                    {statCards.map((c, idx) => (
                        <View key={`kc-${idx}`} style={[statsS.kpiCard, { backgroundColor: c.bg, borderLeftColor: c.color }]}>
                            <Text style={statsS.kpiIcon}>{c.icon}</Text>
                            <Text style={[statsS.kpiVal, { color: c.color }]}>{c.value}</Text>
                            <Text style={statsS.kpiLbl}>{c.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Visual health bar ── */}
                <View style={statsS.healthBar}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={statsS.healthBarTitle}>Stock Health Overview</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>{totalItems} total items</Text>
                    </View>
                    <View style={statsS.barTrack}>
                        {availableItems > 0 && <View style={[statsS.barFill, { flex: availableItems, backgroundColor: '#10B981' }]} />}
                        {lowStockItems  > 0 && <View style={[statsS.barFill, { flex: lowStockItems,  backgroundColor: '#F59E0B' }]} />}
                        {outItems       > 0 && <View style={[statsS.barFill, { flex: outItems,       backgroundColor: '#EF4444' }]} />}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                            <Text style={{ fontSize: 10, color: '#64748B' }}>In Stock ({availableItems})</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                            <Text style={{ fontSize: 10, color: '#64748B' }}>Low ({lowStockItems})</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                            <Text style={{ fontSize: 10, color: '#64748B' }}>Out ({outItems})</Text>
                        </View>
                    </View>
                </View>

                {/* ── Quick Actions ── */}
                <Text style={statsS.sectionLbl}>⚡ QUICK ACTIONS</Text>
                <View style={statsS.qaGrid}>
                    {quickActions.map((q, idx) => (
                        <TouchableOpacity
                            key={`qa-${idx}`}
                            onPress={q.onPress}
                            activeOpacity={0.7}
                            style={[statsS.qaCard, q.isReport && statsS.qaCardReport, q.warn && statsS.qaCardWarn]}
                        >
                            <Text style={statsS.qaIcon}>{q.icon}</Text>
                            <Text style={[statsS.qaLabel, q.isReport && { color: '#FFF' }]}>{q.label}</Text>
                            <Text style={[statsS.qaDesc, q.isReport && { color: '#BFDBFE' }, q.warn && { color: '#DC2626' }]}>{q.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Launch Full Reports CTA ── */}
                <TouchableOpacity onPress={() => setActiveTab('fullreport')} activeOpacity={0.85} style={statsS.reportCTA}>
                    <View style={{ flex: 1 }}>
                        <Text style={statsS.ctaTitle}>📊 Advanced Inventory Reports</Text>
                        <Text style={statsS.ctaDesc}>Area-wise breakdowns · Usage trends · Export PDF</Text>
                    </View>
                    <Text style={{ fontSize: 22, color: '#BFDBFE' }}>→</Text>
                </TouchableOpacity>

                {/* ── Items needing attention ── */}
                {recentLow.length > 0 && (
                    <>
                        <Text style={statsS.sectionLbl}>🚨 NEEDS ATTENTION</Text>
                        {recentLow.map((item, idx) => {
                            const isOut = item.status === 'Out of Stock';
                            const color = isOut ? '#EF4444' : '#F59E0B';
                            const bg    = isOut ? '#FEF2F2' : '#FFFBEB';
                            return (
                                <View key={`att-${idx}`} style={[statsS.attRow, { borderLeftColor: color }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={statsS.attName}>{item.item_name}</Text>
                                        <Text style={statsS.attSub}>{item.category} · Min: {item.min_level} {item.unit}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[statsS.attQty, { color }]}>{item.quantity} {item.unit}</Text>
                                        <View style={[statsS.attBadge, { backgroundColor: bg }]}>
                                            <Text style={[statsS.attBadgeTxt, { color }]}>{isOut ? 'OUT' : 'LOW'}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}

                {/* ── Recent History ── */}
                {stockHistory.length > 0 && (
                    <>
                        <Text style={statsS.sectionLbl}>🕐 RECENT ACTIVITY</Text>
                        {stockHistory.slice(0, 4).map((h, idx) => {
                            const typeColor = h.action_type === 'ADD' ? '#10B981' : h.action_type === 'REDUCE' ? '#EF4444' : h.action_type === 'RESTOCK' ? '#3B82F6' : '#F59E0B';
                            const typeIcon  = h.action_type === 'ADD' ? '➕' : h.action_type === 'REDUCE' ? '➖' : h.action_type === 'RESTOCK' ? '📦' : '✏️';
                            return (
                                <View key={`hist-${idx}`} style={statsS.histRow}>
                                    <View style={[statsS.histDot, { backgroundColor: typeColor + '22' }]}>
                                        <Text style={{ fontSize: 13 }}>{typeIcon}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={statsS.histItem}>{h.item_name || 'Inventory Item'}</Text>
                                        <Text style={statsS.histReason}>{h.reason || h.action_type}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[statsS.histQty, { color: typeColor }]}>{h.action_type === 'REDUCE' ? '-' : '+'}{h.quantity}</Text>
                                        <Text style={statsS.histTime}>{new Date(h.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        );
    };

    /* Full-screen reports — renders without dashboard chrome (no header/footer) */
    if (activeTab === 'fullreport') {
        return (
            <InventoryReports
                token={token}
                onBack={() => setActiveTab('stats')}
            />
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={{ flex: 0, backgroundColor: 'white' }} />
            {renderHeader()}

            <View style={styles.mainContainer}>
                {activeTab === 'inventory' && renderInventory()}
                {activeTab === 'requests'  && renderRequests()}
                {activeTab === 'orders'    && renderOrders()}
                {activeTab === 'history'   && renderHistory()}
                {activeTab === 'stats'     && renderReport()}
                {activeTab === 'account'   && (
                    <View style={{ flex: 1, padding: 15 }}>
                        <AccountSection />
                    </View>
                )}
            </View>

            {/* Bottom Navigation */}
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'white' }}>
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
                    <TouchableOpacity onPress={() => setActiveTab('stats')} style={[styles.navItem, (activeTab === 'stats' || activeTab === 'fullreport') && styles.activeNav]}>
                        <Text style={styles.navIcon}>📊</Text>
                        <Text style={[styles.navLabel, (activeTab === 'stats' || activeTab === 'fullreport') && styles.activeNavLabel]}>Stats</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('account')} style={[styles.navItem, activeTab === 'account' && styles.activeNav]}>
                        <Text style={styles.navIcon}>👤</Text>
                        <Text style={[styles.navLabel, activeTab === 'account' && styles.activeNavLabel]}>Profile</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

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

                                <Text style={styles.label}>Default Supplier (Registered)</Text>
                                <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
                                    {suppliers.map(s => (
                                        <TouchableOpacity 
                                            key={s.id}
                                            style={[styles.supPill, inventoryForm.supplier_id == s.id && styles.activeSupPill, { borderWidth: 1, borderColor: '#E5E7EB' }]}
                                            onPress={() => setInventoryForm({...inventoryForm, supplier_id: s.id})}
                                        >
                                            <Text style={[styles.supPillText, inventoryForm.supplier_id == s.id && styles.activeSupPillText]}>{s.name} ({s.brand_name || 'Retail'})</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
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
                            <Text style={styles.modalTitle}>{modalMode === 'direct' ? 'New Supply Order' : 'Restock Request'}</Text>
                            <TouchableOpacity onPress={() => setShowRequestModal(false)}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
                        </View>
                        {selectedItem ? (
                            <Text style={styles.modalSub}>
                                {selectedItem.item_name} (Min Level: {selectedItem.min_level})
                                {selectedItem.supplier_name ? `\nSupplier: ${selectedItem.supplier_name}` : ''}
                            </Text>
                        ) : (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Select Item to Order</Text>
                                <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
                                    {inventory.map(i => (
                                        <TouchableOpacity 
                                            key={i.id} 
                                            style={[styles.supPill, selectedItem?.id === i.id && styles.activeSupPill, { borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' }]}
                                            onPress={() => {
                                                setSelectedItem(i);
                                                if (i.supplier_id) setSelectedSupplierId(i.supplier_id);
                                            }}
                                        >
                                            <Text style={[styles.supPillText, selectedItem?.id === i.id && styles.activeSupPillText]}>{i.item_name}</Text>
                                            {i.supplier_name && (
                                                <Text style={{ fontSize: 9, color: (selectedItem?.id === i.id ? '#111827' : '#9CA3AF'), fontWeight: (selectedItem?.id === i.id ? 'bold' : 'normal') }}>
                                                    {i.supplier_name}
                                                </Text>
                                            )}
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

                        {modalMode === 'direct' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Expected Price (Optional)</Text>
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Total amount in Rs."
                                    keyboardType="numeric"
                                    value={orderPrice}
                                    onChangeText={setOrderPrice}
                                />
                            </View>
                        )}

                        <TouchableOpacity 
                            style={styles.submitBtn} 
                            onPress={modalMode === 'direct' ? handleCreateSupplierOrder : handleCreateRequest}
                        >
                            <Text style={styles.btnTextWhite}>
                                {modalMode === 'direct' ? 'Place Direct Order' : 'Send Request to Admin'}
                            </Text>
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
    badgeREJECTED: { backgroundColor: '#FEE2E2' },
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

    // Analytics Styles
    analyticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    analyticsTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    analyticsDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    downloadBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    downloadBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
    statGrid: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    statKpiCard: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 16, alignItems: 'center', borderTopWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    statKpiVal: { fontSize: 24, fontWeight: '800' },
    statKpiLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '600' },
    chartWrapper: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 20, elevation: 2 },
    chartTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 15 },
    usageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 12 },
    usageName: { fontSize: 14, color: '#374151', marginBottom: 4, fontWeight: '500' },
    usageBarContainer: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
    usageBar: { height: '100%', borderRadius: 4 },
    usageVal: { fontSize: 13, fontWeight: '700', color: '#111827', width: 70, textAlign: 'right' },
    activitySummary: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 20 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    summaryBox: { flex: 1, minWidth: '45%', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, alignItems: 'center' },
    summaryVal: { fontSize: 18, fontWeight: '800', color: '#111827' },
    summaryLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    emptySmall: { padding: 20, alignItems: 'center' },
    emptySmallText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },

    // Bottom navigation bar
    bottomNav:      { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, paddingBottom: 4 },
    navItem:        { flex: 1, alignItems: 'center', paddingVertical: 4 },
    activeNav:      { borderTopWidth: 2, borderTopColor: '#111827', marginTop: -1 },
    navIcon:        { fontSize: 20, marginBottom: 2 },
    navLabel:       { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },
    activeNavLabel: { color: '#111827', fontWeight: '800' },
});

// ── Stats tab dedicated styles ────────────────────────────────
const statsS = StyleSheet.create({
    // Hero banner
    hero:         { backgroundColor: '#0F172A', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
    heroGreeting: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
    heroName:     { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 2 },
    heroPeriod:   { fontSize: 11, color: '#64748B' },
    healthBadge:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    healthPct:    { fontSize: 16, fontWeight: '800', lineHeight: 18 },
    healthLbl:    { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

    // Section label
    sectionLbl: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 10, marginTop: 4 },

    // KPI grid — 2×2
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard: { flex: 1, minWidth: '47%', borderRadius: 14, padding: 14, borderLeftWidth: 4 },
    kpiIcon: { fontSize: 20, marginBottom: 6 },
    kpiVal:  { fontSize: 28, fontWeight: '800', lineHeight: 30 },
    kpiLbl:  { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },

    // Health bar
    healthBar:      { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 1 },
    healthBarTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    barTrack:       { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: '#E2E8F0' },
    barFill:        { height: '100%' },

    // Quick actions — 2×2 grid
    qaGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    qaCard:       { flex: 1, minWidth: '47%', backgroundColor: '#FFF', borderRadius: 14, padding: 14, elevation: 1 },
    qaCardReport: { backgroundColor: '#1D4ED8' },
    qaCardWarn:   { borderWidth: 1.5, borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' },
    qaIcon:       { fontSize: 22, marginBottom: 6 },
    qaLabel:      { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    qaDesc:       { fontSize: 10, color: '#64748B' },

    // Reports CTA button
    reportCTA:  { backgroundColor: '#1E40AF', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    ctaTitle:   { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 3 },
    ctaDesc:    { fontSize: 11, color: '#93C5FD' },

    // Attention rows
    attRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4, elevation: 1 },
    attName:    { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    attSub:     { fontSize: 10, color: '#94A3B8', marginTop: 2 },
    attQty:     { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    attBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    attBadgeTxt:{ fontSize: 9, fontWeight: '800' },

    // Recent history rows
    histRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1 },
    histDot:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    histItem:   { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    histReason: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
    histQty:    { fontSize: 14, fontWeight: '800' },
    histTime:   { fontSize: 9, color: '#CBD5E1', marginTop: 2 },
});

export default InventoryDashboard;
