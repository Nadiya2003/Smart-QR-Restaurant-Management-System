import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, Image, Platform, Linking, TextInput, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';
import AccountSection from './AccountSection';

const screenWidth = Dimensions.get('window').width;

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

const AdminDashboard = () => {
    const { token, user, logout, loading: authLoading } = useAuth();

    const [activeTab, setActiveTab] = useState('overview');
    const [showReports, setShowReports] = useState(false);


    // Permission Check Logic
    const isStaff = user?.role?.toLowerCase() !== 'admin';
    const permissions = user?.permissions || [];
    const hasAccess = !isStaff || permissions.length > 0;

    if (authLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#111827" />
            </View>
        );
    }

    if (!hasAccess) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <View style={styles.emptyState}>
                    <Text style={{ fontSize: 40, marginBottom: 20 }}>🔐</Text>
                    <Text style={[styles.headerTitle, { textAlign: 'center' }]}>Waiting for Admin Permission</Text>
                    <Text style={[styles.headerSubtitle, { textAlign: 'center', marginTop: 10 }]}>
                        You do not have access to the dashboard yet. Please contact your administrator.
                    </Text>
                    <TouchableOpacity style={[styles.saveBtn, { marginTop: 30, paddingHorizontal: 40 }]} onPress={logout}>
                        <Text style={styles.saveBtnText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }


    const [stats, setStats] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [orderList, setOrderList] = useState([]);
    const [reservationList, setReservationList] = useState([]);
    const [resSubTab, setResSubTab] = useState('CONFIRMED');
    const [attendanceList, setAttendanceList] = useState([]);
    const [permissionList, setPermissionList] = useState([]);
    const [menuList, setMenuList] = useState([]);
    const [supplierList, setSupplierList] = useState([]);
    const [activityList, setActivityList] = useState([]);
    const [notificationList, setNotificationList] = useState([]);
    const [inventoryList, setInventoryList] = useState([]);
    const [restockRequestList, setRestockRequestList] = useState([]);
    const [reportList, setReportList] = useState([]);
    const [cancelRequestList, setCancelRequestList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tables, setTables] = useState([]);
    const [diningAreas, setDiningAreas] = useState([]);
    const [itemRemovalRequests, setItemRemovalRequests] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [userSubTab, setUserSubTab] = useState('staff');
    const [orderSubTab, setOrderSubTab] = useState('DINE-IN');
    const [inventorySubTab, setInventorySubTab] = useState('ITEMS');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStaff, setSelectedStaff] = useState(null);

    // New CRUD modals
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [showTodayRevenueModal, setShowTodayRevenueModal] = useState(false);
    const [showTotalOrdersModal, setShowTotalOrdersModal] = useState(false);
    const [showActiveStaffModal, setShowActiveStaffModal] = useState(false);
    const [showTotalCustomersModal, setShowTotalCustomersModal] = useState(false);
    
    // Reports Form States
    const [reportType, setReportType] = useState('Food Wise');
    const [reportFilters, setReportFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        hourStart: 8,
        hourEnd: 22,
        category: 'All'
    });
    const [generatedReport, setGeneratedReport] = useState(null);
    const [inventoryHistory, setInventoryHistory] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);
    
    // Cross-platform Filter Modal
    const [filterModal, setFilterModal] = useState({ show: false, title: '', placeholder: '', value: '', type: '', onSubmit: null });

    // Reservation Filters
    const [filterResDate, setFilterResDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTableDate, setFilterTableDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTableTime, setFilterTableTime] = useState('19:00'); // Default check time
    const [showResDetailModal, setShowResDetailModal] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);

    // Form States
    const [menuForm, setMenuForm] = useState({ name: '', price: '', buying_price: '', category_id: '', description: '', image: '', is_active: true, item_type: 'Food' });
    const [supplierForm, setSupplierForm] = useState({ name: '', contact_number: '', email: '', address: '', products_supplied: '' });
    const [inventoryForm, setInventoryForm] = useState({ item_name: '', quantity: '', unit: '', supplier_id: '', category: 'General', min_level: '5' });

    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Category CRUD
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', image: '' });
    
    // Real-time states
    const [socketConnected, setSocketConnected] = useState(false);
    const soundRef = useRef(null);
    const socketRef = useRef(null);
    const prevOrderIds = useRef(new Set());



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
                console.log('Failed to load admin sound:', err);
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
        } catch (err) {}
    };

    const [showOrderModal, setShowOrderModal] = useState(false);
    const [newOrder, setNewOrder] = useState({ order_type: 'DINE-IN', customer_name: '', phone: '', items: [], table_id: '', address: '', notes: '', status: 'COOKING', payment_status: 'PAID' });
    const [orderItem, setOrderItem] = useState({ id: '', name: '', quantity: 1, price: 0 });

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const STAFF_ROLES = ['steward', 'manager', 'cashier', 'kitchen_staff', 'bar_staff', 'delivery_rider', 'inventory_manager', 'supplier'];

    const fetchData = useCallback(async (isSilent = false) => {
        try {
            // Only set major loading on first fetch
            if (!stats && !isSilent) setLoading(true);

            // Helper to handle individual fetches safely
            const reqHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            const safeFetch = async (url, options) => {
                try {
                    const res = await fetch(url, options);
                    if (!res.ok) return null;
                    return await res.json();
                } catch (e) { return null; }
            };

            // Fetch stats (always needed for overview)
            const statsData = await safeFetch(apiConfig.ADMIN.STATS, { headers: reqHeaders });
            if (statsData) setStats(statsData.stats);

            // Fetch based on active tab
            if (activeTab === 'overview' || activeTab === 'users' || activeTab === 'activity') {
                const staffData = await safeFetch(apiConfig.ADMIN.STAFF, { headers: reqHeaders });
                if (staffData) {
                    const uniqueStaff = Array.from(new Map((staffData.staff || []).map(s => [s.id, s])).values());
                    setStaffList(uniqueStaff);
                }
                
                const custData = await safeFetch(apiConfig.ADMIN.CUSTOMERS, { headers: reqHeaders });
                if (custData) {
                    const uniqueCust = Array.from(new Map((custData.customers || []).map(c => [c.id, c])).values());
                    setCustomerList(uniqueCust);
                }
            }

            if (activeTab === 'tables' || activeTab === 'reservations') {
                const tableData = await safeFetch(`${apiConfig.API_BASE_URL}/api/admin/tables?date=${filterTableDate}&time=${filterTableTime}`, { headers: reqHeaders });
                const areaData = await safeFetch(`${apiConfig.API_BASE_URL}/api/admin/areas`, { headers: reqHeaders });
                if (tableData) setTables(tableData.tables || []);
                if (areaData) setDiningAreas(areaData.areas || []);
            }

            if (activeTab === 'attendance') {
                const attData = await safeFetch(`${apiConfig.ADMIN.ATTENDANCE}?date=${attendanceDate}`, { headers: reqHeaders });
                if (attData) setAttendanceList(attData.attendance || []);
            }

            if (activeTab === 'menu') {
                const menuData = await safeFetch(`${apiConfig.MENU.ALL}?admin=true`, { headers: reqHeaders });
                if (menuData) setMenuList(menuData.items || menuData || []);

                const catData = await safeFetch(apiConfig.MENU.CATEGORIES, { headers: reqHeaders });
                const fetchedCats = catData?.categories || catData || [];
                setCategories(fetchedCats);
                if (fetchedCats.length > 0 && !selectedCategory) {
                    setSelectedCategory(fetchedCats[0].name);
                }
            }

            if (activeTab === 'suppliers') {
                const supData = await safeFetch(apiConfig.ADMIN.SUPPLIERS, { headers: reqHeaders });
                if (supData) setSupplierList(supData.suppliers || []);
            }

            if (activeTab === 'inventory') {
                const supData = await safeFetch(apiConfig.ADMIN.SUPPLIERS, { headers: reqHeaders });
                if (supData) setSupplierList(supData.suppliers || []);

                const invData = await safeFetch(apiConfig.ADMIN.INVENTORY, { headers: reqHeaders });
                if (invData) setInventoryList(invData.inventory || []);
                
                const restockData = await safeFetch(`${apiConfig.API_BASE_URL}/api/inventory/restock-requests`, { headers: reqHeaders });
                if (restockData) setRestockRequestList(restockData.requests || []);

                const historyData = await safeFetch(`${apiConfig.API_BASE_URL}/api/inventory/history`, { headers: reqHeaders });
                if (historyData) setInventoryHistory(historyData.history || []);
            }

            if (activeTab === 'orders' || activeTab === 'overview' || activeTab === 'reports') {
                const orderData = await safeFetch(apiConfig.ADMIN.ORDERS, { headers: reqHeaders });
                if (orderData) {
                    const uniqueOrders = Array.from(new Map((orderData.orders || []).map(o => [o.id, o])).values());
                    setOrderList(uniqueOrders);
                }
                
                const cancelData = await safeFetch(`${apiConfig.API_BASE_URL}/api/admin/orders/cancellation-requests`, { headers: reqHeaders });
                if (cancelData) setCancelRequestList(cancelData.requests || []);

                const removalData = await safeFetch(`${apiConfig.API_BASE_URL}/api/orders/removal-requests`, { headers: reqHeaders });
                if (removalData) setItemRemovalRequests(removalData.requests || []);
            }

            if (activeTab === 'activity') {
                const actData = await safeFetch(apiConfig.ADMIN.STAFF_ACTIVITY, { headers: reqHeaders });
                if (actData) setActivityList(actData.activity || []);
            }

            if (activeTab === 'notifications') {
                const noteData = await safeFetch(apiConfig.ADMIN.NOTIFICATIONS, { headers: reqHeaders });
                if (noteData) setNotificationList(noteData.notifications || []);
            }
            
            if (activeTab === 'reports') {
                const reportData = await safeFetch(apiConfig.ADMIN.REPORTS, { headers: reqHeaders });
                if (reportData) setReportList(reportData.reports || []);
            }

            if (activeTab === 'reservations') {
                const resData = await safeFetch(`${apiConfig.ADMIN.RESERVATIONS}`, { headers: reqHeaders });
                if (resData) {
                    const uniqueRes = Array.from(new Map((resData.reservations || []).map(r => [r.id, r])).values());
                    setReservationList(uniqueRes);
                }
            }

        } catch (error) {
            console.error('FetchData overall error:', error);
        } finally {
            if (!isSilent) setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, token, attendanceDate, filterResDate, filterTableDate, filterTableTime]); // Added dependencies
    useEffect(() => {
        fetchData();
    }, [activeTab, fetchData]);

    useEffect(() => {
        fetchData();
        
        const socketIO = require('socket.io-client');
        const socket = socketIO(apiConfig.API_BASE_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketConnected(true);
            socket.emit('join', 'admin_room');
        });

        socket.on('newOrder', () => {
             playNotificationSound();
             Alert.alert('New Order!', 'New Order Started - Begin Preparation');
             fetchData(true);
        });

        socket.on('orderUpdate', () => fetchData(true));
        socket.on('cancelRequest', () => {
            playNotificationSound();
            Alert.alert('Cancellation!', 'Order cancellation request received');
            fetchData(true);
        });

        socket.on('newReservation', () => {
            playNotificationSound();
            Alert.alert('New Reservation!', 'A new table reservation has been placed.');
            fetchData(true);
        });

        socket.on('itemRemovalRequest', () => {
            playNotificationSound();
            Alert.alert('Removal Request!', 'A request to remove a prepared item has been received.');
            fetchData(true);
        });

        socket.on('paymentRequest', (data) => {
            playNotificationSound();
            Alert.alert('Payment Requested! 💰', `Order #${data.orderId} (Table ${data.tableNumber || '?'}) is ready to settle via ${data.method}. Amount: Rs. ${data.total}`);
            fetchData(true);
        });

        const interval = setInterval(async () => {
            try {
                const reqHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
                const statsData = await fetch(apiConfig.ADMIN.STATS, { headers: reqHeaders });
                if (statsData.ok) {
                    const s = await statsData.json();
                    setStats(s.stats);
                }

                // If on orders tab or overview, poll for new orders specifically
                if (activeTab === 'orders' || activeTab === 'overview') {
                    const orderRes = await fetch(apiConfig.ADMIN.ORDERS, { headers: reqHeaders });
                    if (orderRes.ok) {
                        const o = await orderRes.json();
                        setOrderList(o.orders || []);
                    }
                    
                    const cancelRes = await fetch(`${apiConfig.API_BASE_URL}/api/admin/orders/cancellation-requests`, { headers: reqHeaders });
                    if (cancelRes.ok) {
                        const c = await cancelRes.json();
                        setCancelRequestList(c.requests || []);
                    }

                    const removalRes = await fetch(`${apiConfig.API_BASE_URL}/api/orders/removal-requests`, { headers: reqHeaders });
                    if (removalRes.ok) {
                        const r = await removalRes.json();
                        setItemRemovalRequests(r.requests || []);
                    }
                }

                // If on inventory tab, poll for latest stock
                if (activeTab === 'inventory') {
                    const invRes = await fetch(apiConfig.ADMIN.INVENTORY, { headers: reqHeaders });
                    if (invRes.ok) {
                        const i = await invRes.json();
                        setInventoryList(i.inventory || []);
                    }

                    const reqRes = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/restock-requests`, { headers: reqHeaders });
                    if (reqRes.ok) {
                        const r = await reqRes.json();
                        setRestockRequestList(r.requests || []);
                    }
                }
                // If on reservations tab, poll for latest reservations
                if (activeTab === 'reservations') {
                    const resRes = await fetch(`${apiConfig.ADMIN.RESERVATIONS}`, { headers: reqHeaders });
                    if (resRes.ok) {
                        const r = await resRes.json();
                        setReservationList(r.reservations || []);
                    }
                }
            } catch (e) { /* silent */ }
        }, 120000); // Polling reduced as we have Socket.io
        return () => {
            clearInterval(interval);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [token, activeTab, filterResDate, fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleLogout = () => {

        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };


    const updateSupplier = async (id, status) => {
        try {
            const res = await fetch(`${apiConfig.ADMIN.SUPPLIERS}/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                Alert.alert('Success', `Supplier ${status.toLowerCase()}`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update supplier');
        }
    };


    const toggleStatus = async (id, currentStatus, type = 'staff') => {
        const action = currentStatus === 1 || currentStatus === true ? 'deactivate' : 'activate';
        const baseUrl = type === 'staff' ? apiConfig.ADMIN.STAFF : apiConfig.ADMIN.CUSTOMERS;
        
        try {
            const endpoint = `${baseUrl}/${id}/status`;
            const statusValue = action === 'activate' ? 'active' : (type === 'staff' ? 'disabled' : 'inactive');
            
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: statusValue })
            });

            if (res.ok) {
                Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} ${action}d successfully`);
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to update status');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error');
        }
    };

    const handleUpdateRole = async () => {
        if (!selectedStaff || !selectedRole) return;
        try {
            const res = await fetch(`${apiConfig.ADMIN.STAFF}/${selectedStaff.id}/role`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ role_name: selectedRole })
            });
            if (res.ok) {
                Alert.alert('Success', 'Role updated with default permissions');
                setShowRoleModal(false);
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to update role');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error');
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                setMenuForm({ ...menuForm, image: result.assets[0].uri });
            }
        } catch (error) {
            console.error("Image pick error", error);
        }
    };

    const handleSaveMenu = async () => {
        if (!menuForm.name || !menuForm.price || !menuForm.category_id) {
            Alert.alert('Error', 'Please fill all required fields (Name, Price, Category)');
            return;
        }

        // Image is required for new items
        if (!editingItem && !menuForm.image) {
            Alert.alert('Error', 'Please upload or paste a URL for the food image');
            return;
        }

        const formData = new FormData();
        formData.append('name', menuForm.name);
        formData.append('price', Number(menuForm.price));
        formData.append('buying_price', Number(menuForm.buying_price || 0));
        formData.append('category_id', menuForm.category_id);
        formData.append('description', menuForm.description || '');
        formData.append('is_active', menuForm.is_active ? 1 : 0);
        formData.append('is_available', menuForm.is_active ? 1 : 0);
        formData.append('item_type', menuForm.item_type || 'Food');
        
        if (menuForm.image && !menuForm.image.startsWith('http') && !menuForm.image.startsWith('/upload')) {
            // Local URI from image picker — append as file
            const filename = menuForm.image.split('/').pop() || 'image.jpg';
            const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            if (Platform.OS === 'web') {
                const response = await fetch(menuForm.image);
                const blob = await response.blob();
                formData.append('image', blob, filename);
            } else {
                formData.append('image', { uri: menuForm.image, name: filename, type });
            }
        } else if (menuForm.image) {
            // URL or existing path — pass as text field so backend can store it
            formData.append('image', menuForm.image);
        }

        const url = editingItem ? `${apiConfig.MENU.ALL}/${editingItem.id}` : apiConfig.MENU.ALL;
        const method = editingItem ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: formData
            });

            if (res.ok) {
                Alert.alert('Success', `Menu item ${editingItem ? 'updated' : 'created'}`);
                setShowMenuModal(false);
                setMenuForm({ name: '', price: '', buying_price: '', category_id: '', description: '', image: '', is_active: true, item_type: 'Food' });
                setEditingItem(null);
                fetchData(true);
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to save menu item');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error');
        }
    };

    const handleDeleteMenu = async (id) => {
        Alert.alert('Delete', 'Are you sure you want to delete this menu item?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(`${apiConfig.MENU.ALL}/${id}`, {
                            method: 'DELETE',
                            headers
                        });
                        if (res.ok) {
                            Alert.alert('Success', 'Menu item deleted');
                            fetchData();
                        } else {
                            Alert.alert('Error', 'Failed to delete item');
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Network error');
                    }
                }
            }
        ]);
    };

    const handleSaveCategory = async () => {
        if (!categoryForm.name) {
            Alert.alert('Error', 'Category name is required');
            return;
        }

        const formData = new FormData();
        formData.append('name', categoryForm.name);
        
        if (categoryForm.image && !categoryForm.image.startsWith('http') && !categoryForm.image.startsWith('/upload')) {
            const filename = categoryForm.image.split('/').pop() || 'cat.jpg';
            const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;
            formData.append('image', { uri: categoryForm.image, name: filename, type });
        }

        const url = editingCategory ? `${apiConfig.API_BASE_URL}/api/menu/categories/${editingCategory.id}` : `${apiConfig.API_BASE_URL}/api/menu/categories`;
        const method = editingCategory ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                Alert.alert('Success', `Category ${editingCategory ? 'updated' : 'created'}`);
                setShowCategoryModal(false);
                setCategoryForm({ name: '', image: '' });
                setEditingCategory(null);
                fetchData(true);
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to save category');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error');
        }
    };

    const handleDeleteCategory = (cat) => {
        Alert.alert('Delete Category', `Delete "${cat.name}"? This will fail if items exist in this category.`, [
            { text: 'Cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    const res = await fetch(`${apiConfig.API_BASE_URL}/api/menu/categories/${cat.id}`, {
                        method: 'DELETE',
                        headers
                    });
                    if (res.ok) {
                        fetchData(true);
                    } else {
                        const data = await res.json();
                        Alert.alert('Error', data.message || 'Failed to delete');
                    }
                } catch (e) { Alert.alert('Error', 'Network error'); }
            }}
        ]);
    };

    const handleCloseOrder = async (orderId) => {
        try {
            setLoading(true);
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/delivery-rider/orders/${orderId}/close`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                Alert.alert('✅ Success', 'Order has been finalized and closed.');
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

    const tabs = [
        { key: 'overview', label: 'Dashboard', icon: '📊' },
        { key: 'tables', label: 'Tables', icon: '🪑' },
        { key: 'users', label: 'Users', icon: '👥' },
        { key: 'attendance', label: 'Attendance', icon: '🕒' },
        { key: 'menu', label: 'Menu', icon: '🍽️' },
        { key: 'orders', label: 'Orders', icon: '🛍️' },
        { key: 'reservations', label: 'Reservations', icon: '📅' },
        { key: 'activity', label: 'Activity', icon: '⚡' },
        { key: 'suppliers', label: 'Suppliers', icon: '🚚' },
        { key: 'inventory', label: 'Inventory', icon: '📦' },
        { key: 'reports', label: 'Reports', icon: '📈' },
        { key: 'account', label: 'My Account', icon: '👤' },
    ];



    // ===== OVERVIEW TAB =====
    const renderOverview = () => {
           const statCards = [
            { title: "Today Revenue", value: stats ? `Rs. ${Number(stats.todayRevenue || 0).toLocaleString()}` : '0', icon: "💰", color: '#D1FAE5', onPress: () => setShowTodayRevenueModal(true) },
            { title: "Total Orders", value: stats ? stats.totalOrders : '0', icon: "🛒", color: '#DBEAFE', onPress: () => setShowTotalOrdersModal(true) },
            { title: "Active Staff", value: stats ? stats.activeStaff : '0', icon: "👥", color: '#EDE9FE', onPress: () => setShowActiveStaffModal(true) },
            { title: "Total Customers", value: stats ? stats.totalCustomers : '0', icon: "👤", color: '#FEF3C7', onPress: () => setShowTotalCustomersModal(true) },
        ];
 
        return (
            <>
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>Admin Dashboard</Text>
                    <Text style={styles.pageSubtitle}>Melissa's Food Court - System Active</Text>
                </View>
 
                <View style={[styles.statsGrid, { flexWrap: 'wrap', flexDirection: 'row' }]}>
                    {statCards.map((stat, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={[styles.statCard, { width: (screenWidth - 48) / 2 }]}
                            onPress={stat.onPress}
                        >
                            <View style={styles.statHeader}>
                                <View style={[styles.iconBox, { backgroundColor: stat.color }]}>
                                    <Text style={styles.icon}>{stat.icon}</Text>
                                </View>
                                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Details ↗</Text>
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statTitle}>{stat.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
 
                {/* Secondary Stats */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Business Metrics</Text>
                    <View style={styles.quickStatsRow}>
                        <View style={styles.quickStat}>
                            <Text style={styles.quickStatValue}>{stats?.customerCount || 0}</Text>
                            <Text style={styles.quickStatLabel}>Customers</Text>
                        </View>
                        <View style={styles.quickStat}>
                            <Text style={[styles.quickStatValue, { color: '#10B981' }]}>{stats?.staffCount || 0}</Text>
                            <Text style={styles.quickStatLabel}>Staff</Text>
                        </View>
                        <View style={styles.quickStat}>
                            <Text style={[styles.quickStatValue, { color: '#3B82F6' }]}>{orderList.length}</Text>
                            <Text style={styles.quickStatLabel}>Total Orders</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 20 }} />
            </>
        );
    };


    // ===== USERS TAB =====
    const renderUsers = () => (
        <>
            <View style={styles.subTabRow}>
                {['staff', 'customers'].map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        style={[styles.subTab, userSubTab === tab && styles.activeSubTab]}
                        onPress={() => setUserSubTab(tab)}
                    >
                        <Text style={[styles.subTabText, userSubTab === tab && styles.activeSubTabText]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {userSubTab === 'staff' ? renderStaff() : renderCustomers()}
        </>
    );

    const renderStaff = () => (
        <>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Staff Members</Text>
            </View>
            {staffList.length === 0 ? (
                <View style={styles.emptyState}><Text style={styles.emptyText}>No staff found</Text></View>
            ) : (
                staffList.map((staff) => (
                    <View key={staff.id} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <View style={[styles.avatarCircle, { backgroundColor: '#DBEAFE', overflow: 'hidden' }]}>
                                {staff.steward_image ? (
                                    <Image 
                                        source={{ uri: staff.steward_image.startsWith('http') ? staff.steward_image : `${apiConfig.API_BASE_URL}${staff.steward_image}` }} 
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                ) : (
                                    <Text style={styles.avatarText}>{staff.name?.charAt(0) || 'S'}</Text>
                                )}
                            </View>

                            <View style={styles.listCardInfo}>
                                <Text style={styles.listCardName}>{staff.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.listCardSub}>{staff.role} • {staff.email}</Text>
                                    <View style={[styles.statusDot, { backgroundColor: staff.is_available ? '#10B981' : '#9CA3AF' }]} />
                                    <Text style={[styles.listCardSub, { color: staff.is_available ? '#10B981' : '#6B7280', fontSize: 10 }]}>
                                        {staff.is_available ? ' On Duty' : ' Off Duty'}
                                    </Text>
                                </View>
                                <Text style={styles.listCardSub}>📞 {staff.phone || 'No Phone'}</Text>

                                <View style={styles.badgeRow}>
                                    <TouchableOpacity 
                                        onPress={() => toggleStatus(staff.id, staff.is_active, 'staff')}
                                        style={[styles.badge, { backgroundColor: staff.is_active ? '#D1FAE5' : '#FEE2E2' }]}
                                    >
                                        <Text style={[styles.badgeText, { color: staff.is_active ? '#059669' : '#DC2626' }]}>
                                            {staff.is_active ? 'Active' : 'Deactivated'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.permBtn, { marginLeft: 0, backgroundColor: '#FEF3C7' }]} 
                                        onPress={() => {
                                            setSelectedStaff(staff);
                                            setSelectedRole(staff.role.toLowerCase());
                                            setShowRoleModal(true);
                                        }}
                                    >
                                        <Text style={[styles.permBtnText, { color: '#D97706' }]}>🛠️ Role</Text>
                                    </TouchableOpacity>


                                </View>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </>
    );

    const renderCustomers = () => (
        <>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Registered Customers</Text>
            </View>
            {customerList.length === 0 ? (
                <View style={styles.emptyState}><Text style={styles.emptyText}>No customers found</Text></View>
            ) : (
                customerList.map((customer) => (
                    <View key={customer.id} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <View style={[styles.avatarCircle, { backgroundColor: '#EDE9FE' }]}>
                                <Text style={styles.avatarText}>{customer.name?.charAt(0)}</Text>
                            </View>
                            <View style={styles.listCardInfo}>
                                <Text style={styles.listCardName}>{customer.name}</Text>
                                <Text style={styles.listCardSub}>{customer.email} • {customer.phone || 'N/A'}</Text>
                                <Text style={styles.listCardSub}>Joined: {new Date(customer.created_at).toLocaleDateString()}</Text>
                                <View style={styles.badgeRow}>
                                    <TouchableOpacity 
                                        onPress={() => toggleStatus(customer.id, customer.is_active, 'customer')}
                                        style={[styles.badge, { backgroundColor: customer.is_active ? '#D1FAE5' : '#FEE2E2' }]}
                                    >
                                        <Text style={[styles.badgeText, { color: customer.is_active ? '#059669' : '#DC2626' }]}>
                                            {customer.is_active ? 'Active' : 'Deactivated'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </>
    );


    // ===== ENHANCED ORDERS TAB =====
    const renderOrders = () => {
        // Prepare filtered lists beforehand for cleaner rendering
        const historyList = orderList.filter(o => ['COMPLETED', 'CANCELLED', 'REJECTED', 'FINISHED'].includes((o.status || '').toUpperCase()));
        const getActiveOrders = (type) => orderList.filter(o => o.order_type === type && !['COMPLETED', 'CANCELLED', 'REJECTED', 'FINISHED'].includes((o.status || '').toUpperCase()));
        
        const tabsData = [
            { key: 'DINE-IN', icon: '🍽️', label: 'Dine-In', count: getActiveOrders('DINE-IN').length },
            { key: 'TAKEAWAY', icon: '🥡', label: 'Takeaway', count: getActiveOrders('TAKEAWAY').length },
            { key: 'DELIVERY', icon: '🚚', label: 'Delivery', count: getActiveOrders('DELIVERY').length },
            { key: 'CANCELLATIONS', icon: '🚨', label: 'Cancellations', count: cancelRequestList.length },
            { key: 'HISTORY', icon: '📜', label: 'History', count: historyList.length }
        ];

        let displayList = [];
        if (orderSubTab === 'HISTORY') {
            displayList = historyList;
        } else if (orderSubTab === 'DINE-IN' || orderSubTab === 'TAKEAWAY' || orderSubTab === 'DELIVERY') {
            displayList = getActiveOrders(orderSubTab);
        }

        return (
        <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 15 }}>
                <View style={[styles.subTabRow, { paddingRight: 40 }]}>
                    {tabsData.map(tab => (
                        <TouchableOpacity 
                            key={tab.key} 
                            style={[
                                styles.subTab, 
                                orderSubTab === tab.key && styles.activeSubTab, 
                                { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 }
                            ]}
                            onPress={() => setOrderSubTab(tab.key)}
                        >
                            <Text style={[
                                styles.subTabText, 
                                orderSubTab === tab.key && styles.activeSubTabText,
                                { fontSize: 13, fontWeight: orderSubTab === tab.key ? 'bold' : '600' }
                            ]}>
                                {tab.icon} {tab.label} ({tab.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.sectionHeader, { marginTop: 0 }]}>
                <View>
                    <Text style={styles.sectionTitle}>
                        {tabsData.find(t => t.key === orderSubTab)?.label || orderSubTab} Orders
                    </Text>
                    <Text style={styles.sectionSubtitle}>Manage transactions</Text>
                </View>
                <TouchableOpacity style={styles.addButtonSmall} onPress={() => setShowOrderModal(true)}>
                    <Text style={styles.addButtonTextSmall}>+ Add Order</Text>
                </TouchableOpacity>
            </View>

            {orderSubTab === 'CANCELLATIONS' ? (
                cancelRequestList.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🤝</Text>
                        <Text style={styles.emptyText}>No pending cancellation requests</Text>
                    </View>
                ) : (
                    cancelRequestList.map((req) => (
                        <View key={req.id} style={[styles.listCard, { borderColor: '#FCA5A5', borderWidth: 1 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.listCardName}>Order #{req.order_id} (Table {req.table_number})</Text>
                                <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={[styles.badgeText, { color: '#B91C1C' }]}>PENDING APPROVAL</Text>
                                </View>
                            </View>
                            <Text style={styles.listCardSub}>Requested by: {req.steward_name}</Text>
                            <Text style={[styles.listCardSub, { marginTop: 5, color: '#374151', fontStyle: 'italic' }]}>
                                Reason: "{req.reason}"
                            </Text>
                            
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                                <TouchableOpacity 
                                    style={[styles.editBtn, { backgroundColor: '#10B981', flex: 1 }]} 
                                    onPress={() => handleCancellationAction(req.id, 'approve')}
                                >
                                    <Text style={[styles.editBtnText, { color: 'white' }]}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.deleteBtn, { backgroundColor: '#EF4444', flex: 1 }]} 
                                    onPress={() => handleCancellationAction(req.id, 'reject')}
                                >
                                    <Text style={[styles.deleteBtnText, { color: 'white' }]}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )
            ) : orderSubTab === 'ITEM REMOVALS' ? (
                itemRemovalRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🗑️</Text>
                        <Text style={styles.emptyText}>No pending item removal requests</Text>
                    </View>
                ) : (
                    itemRemovalRequests.filter(r => r.status === 'PENDING').map((req) => (
                        <View key={req.id} style={[styles.listCard, { borderColor: '#F59E0B', borderWidth: 1 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.listCardName}>Order #{req.order_id} Item Removal</Text>
                                <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                                    <Text style={[styles.badgeText, { color: '#B45309' }]}>REMOVAL REQUEST</Text>
                                </View>
                            </View>
                            <Text style={[styles.listCardSub, { fontWeight: 'bold', color: '#111827', marginTop: 5 }]}>Item: {req.item_name}</Text>
                            <Text style={styles.listCardSub}>Requested by: {req.staff_name || 'Staff'}</Text>
                            <Text style={[styles.listCardSub, { marginTop: 5, color: '#374151', fontStyle: 'italic' }]}>
                                Reason: "{req.reason}"
                            </Text>
                            
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                                <TouchableOpacity 
                                    style={[styles.editBtn, { backgroundColor: '#10B981', flex: 1 }]} 
                                    onPress={() => handleItemRemovalAction(req.id, 'approve')}
                                >
                                    <Text style={[styles.editBtnText, { color: 'white' }]}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.deleteBtn, { backgroundColor: '#EF4444', flex: 1 }]} 
                                    onPress={() => handleItemRemovalAction(req.id, 'reject')}
                                >
                                    <Text style={[styles.deleteBtnText, { color: 'white' }]}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )
            ) : displayList.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>{orderSubTab === 'HISTORY' ? '📜' : '🛍️'}</Text>
                    <Text style={styles.emptyText}>No {tabsData.find(t => t.key === orderSubTab)?.label || 'matching'} orders found</Text>
                </View>
            ) : (
                displayList.map((order) => {
                    const isOngoing = ['PENDING', 'ORDER PLACED', 'PREPARING', 'READY', 'OUT FOR DELIVERY'].includes((order.status || '').toUpperCase());
                    return (
                        <TouchableOpacity 
                            key={`${order.order_type}-${order.id}`} 
                            style={[styles.listCard, isOngoing && styles.ongoingCard]}
                            onPress={() => {
                                setSelectedReviewOrder(order);
                                setShowReviewModal(true);
                            }}
                        >
                            <View style={styles.listCardHeader}>
                                <View style={[styles.avatarCircle, { backgroundColor: isOngoing ? '#FEF3C7' : '#E5E7EB' }]}>
                                    <Text style={styles.avatarText}>#{order.id}</Text>
                                </View>
                                <View style={styles.listCardInfo}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.listCardName}>Order #{order.id}</Text>
                                        <OrderTimer createdAt={order.created_at} />
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>{order.order_type}</Text>
                                    </View>
                                    <Text style={styles.listCardSub}>Customer: {order.customer_name || 'Guest'}</Text>
                                    {order.phone ? <Text style={styles.listCardSub}>📞 {order.phone}</Text> : null}
                                    {order.order_type === 'DELIVERY' && order.address ? (
                                        <Text style={styles.listCardSub}>📍 {order.address}</Text>
                                    ) : null}
                                    <Text style={styles.listCardSub}>Items: {order.items_summary || (order.items && Array.isArray(order.items) ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ') : 'Check Details')}</Text>
                                    <Text style={styles.listCardSub}>Total: Rs. {Number(order.total_price || 0).toLocaleString()} ({order.payment_method || (order.payment_status === 'paid' ? 'Paid Online' : 'Unpaid')})</Text>
                                    <Text style={styles.listCardSub}>Time: {new Date(order.created_at).toLocaleTimeString()}</Text>
                                    
                                    <View style={styles.badgeRow}>
                                        <View style={[styles.badge, { backgroundColor: order.status === 'COMPLETED' ? '#D1FAE5' : order.status === 'CANCELLED' ? '#FEE2E2' : '#DBEAFE' }]}>
                                            <Text style={[styles.badgeText, { color: order.status === 'COMPLETED' ? '#059669' : order.status === 'CANCELLED' ? '#DC2626' : '#3B82F6' }]}>
                                                {order.status}
                                            </Text>
                                        </View>
                                    </View>

                                    {isOngoing && (
                                        <View style={styles.orderActionsRow}>
                                            <TouchableOpacity onPress={() => updateStatus(order.id, 'PREPARING', order.order_type)} style={styles.statusBtn_prep}>
                                                <Text style={styles.statusBtnText}>Cook</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => updateStatus(order.id, 'READY', order.order_type)} style={styles.statusBtn_ready}>
                                                <Text style={styles.statusBtnText}>Ready</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => updateStatus(order.id, 'COMPLETED', order.order_type)} style={styles.statusBtn_done}>
                                                <Text style={styles.statusBtnText}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {order.status === 'Pending Final Closure' && (
                                        <TouchableOpacity 
                                            onPress={() => handleCloseOrder(order.id)} 
                                            style={[styles.statusBtn_done, { marginTop: 10, backgroundColor: '#10B981', width: '100%' }]}
                                        >
                                            <Text style={styles.statusBtnText}>✅ Close & Finalize Order</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })
            )}
        </>
    );
};


    // ===== ATTENDANCE TAB =====
    const renderAttendance = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Staff Attendance</Text>
                <Text style={styles.headerSubtitle}>Real-time login/logout tracking</Text>
            </View>

            <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Viewing Date: {attendanceDate}</Text>
                <TouchableOpacity 
                    style={styles.filterBtn} 
                    onPress={() => {
                        setFilterModal({
                            show: true,
                            title: 'Select Date',
                            placeholder: 'Format: YYYY-MM-DD',
                            value: attendanceDate,
                            onSubmit: (val) => {
                                if(val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    setAttendanceDate(val);
                                    fetchData();
                                } else {
                                    Alert.alert('Invalid Format', 'Please use YYYY-MM-DD');
                                }
                            }
                        });
                    }}
                >
                    <Text style={styles.filterBtnText}>Change Date</Text>
                </TouchableOpacity>
            </View>

            {attendanceList.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🕒</Text>
                    <Text style={styles.emptyText}>No attendance records for {attendanceDate}</Text>
                </View>
            ) : (
                attendanceList.map((att) => (
                    <View key={att.id} style={styles.listCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.listCardName}>{att.staff_name}</Text>
                            <View style={[styles.badge, { backgroundColor: att.check_out_time ? '#E5E7EB' : '#10B981' }]}>
                                <Text style={[styles.badgeText, { color: att.check_out_time ? '#6B7280' : 'white' }]}>
                                    {att.check_out_time ? 'Checked Out' : 'Active'}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.listCardSub}>{att.role}</Text>
                        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 }}>
                            <Text style={styles.timeText}>🕒 Check In: {new Date(att.check_in_time).toLocaleTimeString()}</Text>
                            <Text style={styles.timeText}>🕒 Check Out: {att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString() : '---'}</Text>
                        </View>
                    </View>
                ))
            )}
        </>
    );


    // ===== MENU MANAGEMENT TAB =====
    const renderMenuManagement = () => (
        <>
            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>Menu & Categories</Text>
                    <Text style={styles.sectionSubtitle}>{menuList.length} items available</Text>
                </View>
                <TouchableOpacity style={styles.addButtonSmall} onPress={() => {
                    setEditingItem(null);
                    setMenuForm({ name: '', price: '', buying_price: '', category_id: '', description: '', image: '', is_active: true, item_type: 'Food' });
                    setShowMenuModal(true);
                }}>
                    <Text style={styles.addButtonTextSmall}>+ Item</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map(cat => {
                    const itemCount = menuList.filter(item => item.category === cat.name).length;
                    const isLow = itemCount === 0;
                    const catEmoji = 
                        cat.name === 'Sri Lankan' ? '🍛' :
                        cat.name === 'Indian' ? '🧆' :
                        cat.name === 'Italian' ? '🍝' :
                        cat.name === 'Beverages' ? '🥤' :
                        cat.name === 'Desserts' ? '🍰' : '🍽️';
                    return (
                        <TouchableOpacity 
                            key={cat.id} 
                            style={[styles.catPill, selectedCategory === cat.name && styles.activeCatPill, isLow && { borderColor: '#F59E0B' }]}
                            onPress={() => setSelectedCategory(cat.name)}
                        >
                            <Text style={[styles.catPillText, selectedCategory === cat.name && styles.activeCatPillText]}>
                                {catEmoji} {cat.name} ({itemCount}) {isLow && '⚠️'}
                            </Text>
                            {selectedCategory === cat.name && (
                                <View style={{ flexDirection: 'row', marginLeft: 8, gap: 5 }}>
                                    <TouchableOpacity onPress={() => {
                                        setEditingCategory(cat);
                                        setCategoryForm({ name: cat.name, image: cat.image });
                                        setShowCategoryModal(true);
                                    }}>
                                        <Text style={{ fontSize: 10 }}>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteCategory(cat)}>
                                        <Text style={{ fontSize: 10 }}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
                <TouchableOpacity style={styles.catPill_add} onPress={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: '', image: '' });
                    setShowCategoryModal(true);
                }}>
                    <Text style={styles.catPillText_add}>+ Category</Text>
                </TouchableOpacity>
            </ScrollView>

            {menuList.filter(item => item.category === selectedCategory).map((item) => (
                <View key={item.id} style={styles.listCard}>
                    <View style={styles.listCardHeader}>
                        <Image source={{ uri: item.image ? (item.image.startsWith('http') ? item.image : (item.image.startsWith('/') ? `${apiConfig.API_BASE_URL}${item.image}` : `${apiConfig.API_BASE_URL}/food/${item.image}`)) : 'https://via.placeholder.com/150' }} style={styles.itemImage} />
                        <View style={styles.listCardInfo}>
                            <Text style={styles.listCardName}>{item.name}</Text>
                            <Text style={styles.listCardSub}>{item.category} • Rs. {item.price}</Text>
                            <View style={styles.badgeRow}>
                                {(() => {
                                    let tagArray = [];
                                    if (item.tags) {
                                        try {
                                            tagArray = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags;
                                        } catch (e) {
                                            tagArray = [];
                                        }
                                    }
                                    return Array.isArray(tagArray) ? tagArray.map((tag, idx) => (
                                        <View key={idx} style={styles.tagBadge}><Text style={styles.tagText}>{tag}</Text></View>
                                    )) : null;
                                })()}
                                <View style={[styles.badge, { backgroundColor: item.status === 1 || item.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                                    <Text style={[styles.badgeText, { color: item.status === 1 || item.is_active ? '#059669' : '#DC2626' }]}>
                                        {item.status === 1 || item.is_active ? 'Available' : 'Sold Out'}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                <TouchableOpacity 
                                    style={styles.editBtn} 
                                    onPress={() => {
                                        setEditingItem(item);
                                        const cat = categories.find(c => c.name === item.category);
                                        setMenuForm({
                                            name: item.name,
                                            price: item.price.toString(),
                                            buying_price: item.buying_price ? item.buying_price.toString() : '',
                                            category_id: cat ? cat.id : '',
                                            description: item.description || '',
                                            is_active: item.status === 1 || !!item.is_active,
                                            item_type: item.item_type || 'Food'
                                        });
                                        setShowMenuModal(true);
                                    }}
                                >
                                    <Text style={styles.editBtnText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteMenu(item.id)}>
                                    <Text style={styles.deleteBtnText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            ))}
        </>
    );


    // ===== SUPPLIERS TAB =====
    const renderSuppliers = () => (
        <>
            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>Suppliers</Text>
                    <Text style={styles.sectionSubtitle}>Manage partners & approval</Text>
                </View>
                <TouchableOpacity style={styles.addButtonSmall} onPress={() => Alert.alert('Notice', 'Use Web Dashboard to add Suppliers')}>
                    <Text style={styles.addButtonTextSmall}>+ Supplier</Text>
                </TouchableOpacity>
            </View>
            {supplierList.map((sup) => (
                <View key={sup.id} style={styles.listCard}>
                    <Text style={styles.listCardName}>{sup.name}</Text>
                    <Text style={styles.listCardSub}>{sup.email || 'No Email'}</Text>
                    <Text style={styles.listCardSub}>Products: {sup.products_supplied || 'N/A'}</Text>
                    <Text style={styles.listCardSub}>📞 {sup.contact_number || sup.phone || 'N/A'}</Text>
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { 
                            backgroundColor: sup.status === 'Approved' ? '#D1FAE5' : sup.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7' 
                        }]}>
                            <Text style={[styles.badgeText, { 
                                color: sup.status === 'Approved' ? '#059669' : sup.status === 'Rejected' ? '#DC2626' : '#D97706' 
                            }]}>{sup.status}</Text>
                        </View>
                        {sup.status === 'Pending' && (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity onPress={() => updateSupplier(sup.id, 'Approved')} style={styles.approveBtn}>
                                    <Text style={styles.approveBtnText}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => updateSupplier(sup.id, 'Rejected')} style={styles.rejectBtn}>
                                    <Text style={styles.rejectBtnText}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            ))}
        </>
    );



    // ===== ACTIVITY TAB =====
    const renderActivity = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Staff Activity</Text>
                <Text style={styles.headerSubtitle}>Live tracking of staff on duty</Text>
            </View>
            {activityList.map((act) => (
                <View key={act.id} style={styles.listCard}>
                    <Text style={styles.listCardName}>{act.full_name}</Text>
                    <Text style={styles.listCardSub}>{act.role} • Active since {new Date(act.login_time).toLocaleTimeString()}</Text>
                    <View style={[styles.badge, { backgroundColor: '#D1FAE5', marginTop: 5 }]}>
                        <Text style={[styles.badgeText, { color: '#059669' }]}>Performance: {act.performance_points} pts</Text>
                    </View>
                </View>
            ))}
        </>
    );

    // ===== NOTIFICATIONS TAB =====
    const renderNotifications = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notification Center</Text>
                <Text style={styles.headerSubtitle}>Send or View broadcasts</Text>
            </View>
            <TouchableOpacity style={styles.createNotifBtn} onPress={() => Alert.alert('New Notification', 'Feature coming soon to mobile')}>
                <Text style={styles.createNotifBtnText}>+ Send Alert</Text>
            </TouchableOpacity>
            {notificationList.map((note) => (
                <View key={note.id} style={[styles.listCard, !note.is_read && styles.unreadNote]}>
                    <Text style={styles.listCardName}>{note.title}</Text>
                    <Text style={styles.listCardSub}>{note.message}</Text>
                    <Text style={styles.noteAudience}>To: {note.target_audience}</Text>
                </View>
            ))}
        </>
    );


    const renderRoleModal = () => (
        <Modal visible={showRoleModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Assign Work Role</Text>
                        <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                            <Text style={{ fontSize: 24 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.modalSub}>{selectedStaff?.name || selectedStaff?.full_name}</Text>
                    
                    <View style={{ gap: 10, marginVertical: 20 }}>
                        {STAFF_ROLES.map(role => (
                            <TouchableOpacity 
                                key={role} 
                                style={[styles.permItem, selectedRole === role && { backgroundColor: '#FEF3C7', borderColor: '#D97706' }]}
                                onPress={() => setSelectedRole(role)}
                            >
                                <Text style={[styles.permItemText, { textTransform: 'uppercase' }]}>{role.replace('_', ' ')}</Text>
                                {selectedRole === role && <Text>✅</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRoleModal(false)}>
                            <Text style={styles.cancelBtnText}>Discard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#F59E0B' }]} onPress={handleUpdateRole}>
                            <Text style={styles.saveBtnText}>Assign Role</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );


    // ===== INVENTORY TAB =====
    const renderInventory = () => (
        <>
            <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View>
                    <Text style={styles.headerTitle}>Inventory Management</Text>
                    <Text style={styles.headerSubtitle}>
                        {inventorySubTab === 'ITEMS' ? 'Manage current stock and storage levels' : 
                         inventorySubTab === 'HISTORY' ? 'Review all incoming and outgoing stock logs' : 
                         'Approve stock orders and supplier offers'}
                    </Text>
                </View>
                {inventorySubTab === 'ITEMS' && (
                    <TouchableOpacity 
                        style={styles.addButtonSmall} 
                        onPress={() => {
                            setEditingInventory(null);
                            setInventoryForm({ item_name: '', quantity: '', unit: '', supplier_id: '', category: 'General', min_level: '5' });
                            setShowInventoryModal(true);
                        }}
                    >
                        <Text style={styles.addButtonTextSmall}>+ Add Stock Item</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ marginTop: 10, paddingHorizontal: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                    <TouchableOpacity 
                        onPress={() => setInventorySubTab('ITEMS')} 
                        style={[styles.catPill, inventorySubTab === 'ITEMS' && styles.activeCatPill, { marginRight: 20 }]}
                    >
                        <Text style={[styles.catPillText, inventorySubTab === 'ITEMS' && styles.activeCatPillText]}>Stock Items</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setInventorySubTab('REQUESTS')} 
                        style={[styles.catPill, inventorySubTab === 'REQUESTS' && styles.activeCatPill, { marginRight: 20 }]}
                    >
                        <Text style={[styles.catPillText, inventorySubTab === 'REQUESTS' && styles.activeCatPillText]}>
                            Approvals & Requests {restockRequestList.filter(r => r.status === 'PENDING').length > 0 && `(${restockRequestList.filter(r => r.status === 'PENDING').length})`}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setInventorySubTab('HISTORY')} 
                        style={[styles.catPill, inventorySubTab === 'HISTORY' && styles.activeCatPill, { marginRight: 20 }]}
                    >
                        <Text style={[styles.catPillText, inventorySubTab === 'HISTORY' && styles.activeCatPillText]}>Transaction Logs</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {inventorySubTab === 'ITEMS' ? (
                (() => {
                    const allMainCats = ['Kitchen', 'Bar', 'General'];
                    const groups = {};
                    inventoryList.forEach(item => {
                        const cat = allMainCats.includes(item.category) ? item.category : 'General';
                        if (!groups[cat]) groups[cat] = [];
                        groups[cat].push(item);
                    });

                    return allMainCats.map(cat => {
                        const filteredItems = groups[cat] || [];
                        if (filteredItems.length === 0) return null;
                    
                    return (
                        <View key={cat} style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingHorizontal: 10 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151', marginRight: 10 }}>{cat} Stock</Text>
                                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                            </View>
                            {filteredItems.map((item) => {
                                const isLow = Number(item.quantity) <= (item.min_level || 5);
                                return (
                                    <View key={item.id} style={styles.listCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1 }}>
                                                <View style={styles.badgeRow}>
                                                    <Text style={styles.listCardName}>{item.item_name}</Text>
                                                    {isLow && <View style={styles.lowStockBadge}><Text style={styles.lowStockText}>Low Stock</Text></View>}
                                                </View>
                                                <Text style={styles.listCardSub}>
                                                    Supplier: {item.supplier_name || 'N/A'} · Unit: {item.unit}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                                                    Last Updated: {new Date(item.last_updated || item.updated_at).toLocaleString()}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        setEditingInventory(item);
                                                        setInventoryForm({
                                                            item_name: item.item_name,
                                                            category: item.category || 'General',
                                                            unit: item.unit,
                                                            quantity: item.quantity.toString(),
                                                            min_level: (item.min_level || 5).toString(),
                                                            supplier_id: item.supplier_id
                                                        });
                                                        setShowInventoryModal(true);
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 18 }}>✏️</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => deleteInventoryItem(item.id)}>
                                                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <Text style={[styles.statValue, { fontSize: 18, color: isLow ? '#DC2626' : '#10B981', marginTop: 5 }]}>
                                            {item.quantity} {item.unit || 'pcs'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    );
                });
            })()
            ) : inventorySubTab === 'REQUESTS' ? (
                restockRequestList.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🚚</Text>
                        <Text style={styles.emptyText}>No pending restock requests</Text>
                    </View>
                ) : (
                    restockRequestList.map((req) => (
                        <View key={`${req.origin || 'RETAILER'}-${req.id}`} style={[styles.listCard, req.status === 'PENDING' && { borderColor: req.origin === 'SUPPLIER' ? '#3B82F6' : '#F59E0B', borderLeftWidth: 4 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={styles.listCardName}>{req.item_name}</Text>
                                    <Text style={{ fontSize: 10, color: req.origin === 'SUPPLIER' ? '#3B82F6' : '#6B7280', fontWeight: 'bold' }}>
                                        {req.origin === 'SUPPLIER' ? 'SUPPLIER OFFER' : 'INTERNAL REQUEST'}
                                    </Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: req.status === 'COMPLETED' ? '#D1FAE5' : req.status === 'APPROVED' ? '#DBEAFE' : '#FEF3C7' }]}>
                                    <Text style={[styles.badgeText, { color: req.status === 'COMPLETED' ? '#059669' : req.status === 'APPROVED' ? '#3B82F6' : '#D97706' }]}>{req.status}</Text>
                                </View>
                            </View>
                            <Text style={styles.listCardSub}>Requested Qty: {req.quantity} {req.unit}</Text>
                            <Text style={styles.listCardSub}>Supplier: {req.supplier_name}</Text>
                            <Text style={styles.listCardSub}>Requested By: {req.requester_name} on {new Date(req.created_at).toLocaleDateString()}</Text>
                            
                            {req.status === 'PENDING' && (
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                                    <TouchableOpacity 
                                        style={[styles.editBtn, { backgroundColor: '#10B981', flex: 1 }]} 
                                        onPress={() => handleRestockAction(req.id, 'APPROVED', req.origin)}
                                    >
                                        <Text style={[styles.editBtnText, { color: 'white' }]}>
                                            {req.origin === 'SUPPLIER' ? 'Approve Offer' : 'Approve Request'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.deleteBtn, { backgroundColor: '#EF4444', flex: 1 }]} 
                                        onPress={() => handleRestockAction(req.id, 'REJECTED', req.origin)}
                                    >
                                        <Text style={[styles.deleteBtnText, { color: 'white' }]}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {req.status === 'APPROVED' && req.origin === 'RETAILER' && (
                                <TouchableOpacity 
                                    style={[styles.saveBtn, { backgroundColor: '#3B82F6', marginTop: 15 }]} 
                                    onPress={() => handleRestockAction(req.id, 'COMPLETED', req.origin)}
                                >
                                    <Text style={styles.saveBtnText}>Mark as Received & Update Stock</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )
            ) : (
                <View style={{ padding: 10 }}>
                    {inventoryHistory.length === 0 ? (
                        <View style={styles.emptyState}><Text style={styles.emptyText}>No history logs found.</Text></View>
                    ) : (
                        inventoryHistory.map(log => (
                            <View key={log.id} style={styles.listCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{log.item_name}</Text>
                                        <Text style={{ color: '#6B7280', fontSize: 12 }}>{log.reason || 'Manual Update'} · By {log.staff_name || 'System'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: log.action_type === 'REDUCE' ? '#EF4444' : '#10B981' }}>
                                            {log.action_type === 'REDUCE' ? '-' : '+'}{log.quantity}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date(log.created_at).toLocaleString()}</Text>
                                    </View>
                                </View>
                                <View style={{ marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#F3F4F6', alignSelf: 'flex-start', borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{log.action_type}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}
        </>
    );

    const updateInventoryStock = async (id, quantity) => {
        if (isNaN(quantity)) return Alert.alert('Error', 'Please enter a valid number');
        try {
            const res = await fetch(`${apiConfig.ADMIN.INVENTORY}/${id}/stock`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ quantity: Number(quantity) })
            });
            if (res.ok) {
                Alert.alert('Success', 'Stock updated');
                fetchData(true);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update stock');
        }
    };

    const handleSaveInventory = async () => {
        if (!inventoryForm.item_name || !inventoryForm.quantity || !inventoryForm.unit) {
            return Alert.alert('Error', 'Please fill all required fields');
        }
        
        const method = editingInventory ? 'PUT' : 'POST';
        const url = editingInventory 
            ? `${apiConfig.ADMIN.INVENTORY}/${editingInventory.id}` 
            : apiConfig.ADMIN.INVENTORY;

        try {
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify({
                    ...inventoryForm,
                    quantity: Number(inventoryForm.quantity),
                    min_level: Number(inventoryForm.min_level || 5)
                })
            });

            if (res.ok) {
                Alert.alert('Success', `Inventory item ${editingInventory ? 'updated' : 'added'}`);
                setShowInventoryModal(false);
                setEditingInventory(null);
                fetchData(true);
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to save item');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error');
        }
    };

    const deleteInventoryItem = async (id) => {
        Alert.alert('Delete', 'Delete this item?', [
            { text: 'Cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(`${apiConfig.ADMIN.INVENTORY}/${id}`, {
                            method: 'DELETE',
                            headers
                        });
                        if (res.ok) {
                            Alert.alert('Success', 'Item deleted');
                            fetchData(true);
                        }
                    } catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            }
        ]);
    };

    const handleRestockAction = async (id, status, origin = 'RETAILER') => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/restock-requests/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status, origin })
            });
            if (res.ok) {
                Alert.alert('Success', `Request marked as ${status}`);
                fetchData(true);
            } else {
                const err = await res.json();
                Alert.alert('Error', err.message || 'Action failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error');
        }
    };
    const reportCategories = [
        { key: 'FINANCIAL', label: 'Financial Hub', icon: '💰' },
        { key: 'REVENUE', label: 'Revenue Hub', icon: '📈' },
        { key: 'FOOD_WISE', label: 'Item Performance', icon: '🍲' },
        { key: 'INVENTORY_COSTS', label: 'Inventory Audit', icon: '📦' },
        { key: 'CUSTOMERS', label: 'Customer Insights', icon: '👥' },
        { key: 'STAFF', label: 'Workforce Audit', icon: '👤' },
        { key: 'CANCELLATIONS', label: 'Loss Analysis', icon: '🚫' },
    ];

    const generateReport = async () => {
        if (!reportFilters.startDate || !reportFilters.endDate) {
            Alert.alert('Error', 'Please select a date range');
            return;
        }
        setReportLoading(true);
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
            const res = await fetch(`${apiConfig.API_BASE_URL}/api${endpoint}${query}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setGeneratedReport(data);
            } else {
                const err = await res.json();
                Alert.alert('Report Error', err.message || 'Failed to fetch analytics.');
            }
        } catch (error) {
            Alert.alert('Connection Failed', 'The intelligence server is unreachable.');
        } finally {
            setReportLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const params = new URLSearchParams({
                token,
                type: reportType,
                startDate: reportFilters.startDate,
                endDate: reportFilters.endDate
            }).toString();
            const url = `${apiConfig.API_BASE_URL}/api/reports/pdf?${params}`;
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Direct download not supported on this device.');
            }
        } catch (error) {
            Alert.alert('Export Failed', 'Technical error during PDF generation.');
        }
    };

    const renderReports = () => {
        const setQuickRange = (range) => {
            const now = new Date();
            let start = new Date();
            if (range === 'today') start = now;
            else if (range === 'weekly') start.setDate(now.getDate() - 7);
            else if (range === 'monthly') start.setMonth(now.getMonth() - 1);

            setReportFilters(f => ({
                ...f,
                startDate: start.toISOString().split('T')[0],
                endDate: now.toISOString().split('T')[0]
            }));
        };

        return (
            <>
                <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View>
                        <Text style={styles.headerTitle}>📊 BusinessIQ Analytics</Text>
                        <Text style={styles.headerSubtitle}>Corporate level financial auditing & insights</Text>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {reportCategories.map(({ key, label, icon }) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.catPill, reportType === key && styles.activeCatPill, { paddingHorizontal: 14, paddingVertical: 10 }]}
                            onPress={() => { setReportType(key); setGeneratedReport(null); }}
                        >
                            <Text style={{ fontSize: 16, marginBottom: 2 }}>{icon}</Text>
                            <Text style={[styles.catPillText, reportType === key && styles.activeCatPillText]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.listCard}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 1, marginBottom: 15 }}>AUDIT PARAMETERS</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                        <TouchableOpacity style={[styles.filterBtn, { flex: 1, paddingVertical: 12, alignItems: 'center' }]} onPress={() => setFilterModal({ show: true, title: 'Start Date', placeholder: 'YYYY-MM-DD', value: reportFilters.startDate, onSubmit: (v) => setReportFilters(f => ({ ...f, startDate: v })) })}>
                            <Text style={styles.filterBtnText}>📅 {reportFilters.startDate}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterBtn, { flex: 1, paddingVertical: 12, alignItems: 'center' }]} onPress={() => setFilterModal({ show: true, title: 'End Date', placeholder: 'YYYY-MM-DD', value: reportFilters.endDate, onSubmit: (v) => setReportFilters(f => ({ ...f, endDate: v })) })}>
                            <Text style={styles.filterBtnText}>📅 {reportFilters.endDate}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                        {['today', 'weekly', 'monthly'].map(r => (
                            <TouchableOpacity key={r} onPress={() => setQuickRange(r)} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8 }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#111827' }]} onPress={generateReport} disabled={reportLoading}>
                        {reportLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>🎯 SYNC ANALYTICS</Text>}
                    </TouchableOpacity>
                </View>

                {generatedReport && (
                    <View style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#111827' }}>
                                <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748B' }}>GROSS INFLOW</Text>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>Rs.{(Number(generatedReport.summary?.revenue || 0)).toLocaleString()}</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#EF4444' }}>
                                <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748B' }}>GROSS OUTFLOW</Text>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#EF4444' }}>Rs.{(Number(generatedReport.summary?.totalCost || 0)).toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={{ backgroundColor: '#111827', padding: 20, borderRadius: 20, marginBottom: 20 }}>
                            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>ESTIMATED BUSINESS SURPLUS</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 5 }}>
                                <Text style={{ color: '#10B981', fontSize: 28, fontWeight: 'bold' }}>Rs. {(Number(generatedReport.summary?.profit || 0)).toLocaleString()}</Text>
                                <View style={{ backgroundColor: '#374151', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{((generatedReport.summary?.profit / generatedReport.summary?.revenue) * 100 || 0).toFixed(1)}%</Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.listCard, { padding: 0, overflow: 'hidden' }]}>
                            <View style={{ padding: 15, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                                <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>AUDIT TRAIL LOG</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View>
                                    <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 12 }}>
                                        {generatedReport.table.headers.map((h, i) => (
                                            <Text key={i} style={{ width: 110, fontSize: 9, fontWeight: '900', color: '#64748B' }}>{h.toUpperCase()}</Text>
                                        ))}
                                    </View>
                                    {generatedReport.table.rows.slice(0, 20).map((row, idx) => (
                                        <View key={idx} style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                                            {row.map((cell, i) => (
                                                <Text key={i} style={{ width: 110, fontSize: 10, color: '#1E293B' }} numberOfLines={1}>{cell}</Text>
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                            <TouchableOpacity style={{ margin: 15, backgroundColor: '#DC2626', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }} onPress={handleDownloadPDF}>
                                <Text style={{ fontSize: 18 }}>📄</Text>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>DOWNLOAD AUDIT PDF</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </>
        );
    };

    // ===== RESERVATIONS TAB =====
    const renderReservations = () => {
        const now = new Date();
        
        const confirmed = [];
        const history = [];

        reservationList.forEach(res => {
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

        confirmed.sort((a, b) => {
            const dateA = new Date(`${new Date(a.reservation_date || a.date).toISOString().split('T')[0]}T${a.reservation_time || a.time}`);
            const dateB = new Date(`${new Date(b.reservation_date || b.date).toISOString().split('T')[0]}T${b.reservation_time || b.time}`);
            return dateA - dateB;
        });

        history.sort((a, b) => {
            const dateA = new Date(`${new Date(a.reservation_date || a.date).toISOString().split('T')[0]}T${a.reservation_time || a.time}`);
            const dateB = new Date(`${new Date(b.reservation_date || b.date).toISOString().split('T')[0]}T${b.reservation_time || b.time}`);
            return dateB - dateA;
        });

        return (
            <>
                <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View>
                        <Text style={styles.headerTitle}>Reservations</Text>
                        <Text style={styles.headerSubtitle}>{confirmed.length + history.length} total bookings</Text>
                    </View>
                </View>

                {/* 2-Column Tab Toggles */}
                <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4 }}>
                    <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6, backgroundColor: resSubTab === 'CONFIRMED' ? 'white' : 'transparent', shadowColor: resSubTab === 'CONFIRMED' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: resSubTab === 'CONFIRMED' ? 2 : 0 }}
                        onPress={() => setResSubTab('CONFIRMED')}
                    >
                        <Text style={{ fontSize: 14, fontWeight: resSubTab === 'CONFIRMED' ? 'bold' : 'normal', color: resSubTab === 'CONFIRMED' ? '#059669' : '#6B7280' }}>
                            ✅ Confirmed ({confirmed.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6, backgroundColor: resSubTab === 'HISTORY' ? 'white' : 'transparent', shadowColor: resSubTab === 'HISTORY' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: resSubTab === 'HISTORY' ? 2 : 0 }}
                        onPress={() => setResSubTab('HISTORY')}
                    >
                        <Text style={{ fontSize: 14, fontWeight: resSubTab === 'HISTORY' ? 'bold' : 'normal', color: resSubTab === 'HISTORY' ? '#4F46E5' : '#6B7280' }}>
                            📜 History ({history.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {resSubTab === 'CONFIRMED' && (
                    <View style={{ marginBottom: 20 }}>
                        {confirmed.length === 0 ? (
                            <View style={[styles.emptyState, { paddingVertical: 20 }]}>
                                <Text style={styles.emptyText}>No upcoming reservations found</Text>
                            </View>
                        ) : (
                            confirmed.map((res) => renderReservationCard(res))
                        )}
                    </View>
                )}

                {resSubTab === 'HISTORY' && (
                    <View style={{ marginBottom: 20 }}>
                        {history.length === 0 ? (
                            <View style={[styles.emptyState, { paddingVertical: 20 }]}>
                                <Text style={styles.emptyText}>No history records</Text>
                            </View>
                        ) : (
                            history.map((res) => renderReservationCard(res))
                        )}
                    </View>
                )}
            </>
        );
    };

    const renderReservationCard = (res) => {
        const status = (res.reservation_status || res.status || 'PENDING').toUpperCase();
        return (
            <TouchableOpacity 
                key={res.id} 
                style={styles.listCard}
                onPress={() => {
                    setSelectedReservation(res);
                    setShowResDetailModal(true);
                }}
            >
                <View style={styles.listCardHeader}>
                    <View style={[styles.avatarCircle, { backgroundColor: '#EDE9FE' }]}>
                        <Text style={styles.avatarText}>👤</Text>
                    </View>
                    <View style={styles.listCardInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text style={styles.listCardName}>{res.customer_name || res.guest_name || 'Guest'}</Text>
                            <View style={[styles.badge, { 
                                backgroundColor: status === 'CONFIRMED' ? '#D1FAE5' : status === 'CANCELLED' ? '#FEE2E2' : status === 'COMPLETED' ? '#DBEAFE' : '#FEF3C7',
                                paddingHorizontal: 8,
                                paddingVertical: 2
                            }]}>
                                <Text style={[styles.badgeText, { 
                                    color: status === 'CONFIRMED' ? '#059669' : status === 'CANCELLED' ? '#DC2626' : status === 'COMPLETED' ? '#3B82F6' : '#D97706',
                                    fontSize: 10
                                }]}>
                                    {status}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.listCardSub}>{res.guest_count || res.party_size || 1} Guests • {res.mobile_number || 'N/A'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3B82F6' }}>📅 {res.reservation_date ? (res.reservation_date.includes('T') ? res.reservation_date.split('T')[0] : res.reservation_date) : 'N/A'}</Text>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3B82F6', marginLeft: 10 }}>🕒 {res.reservation_time || res.time}</Text>
                        </View>
                        <Text style={[styles.listCardSub, { marginTop: 4, fontStyle: 'italic' }]}>
                            {res.area_name || 'General'} Area • {res.table_number ? `Table #${res.table_number}` : 'Unassigned'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const updateResStatus = async (id, status) => {
        try {
            const res = await fetch(`${apiConfig.ADMIN.RESERVATIONS}/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                Alert.alert('Success', `Reservation ${status.toLowerCase()}`);
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Failed to update reservation');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error');
        }
    };

    const renderTables = () => {
        const areas = diningAreas; 

        return (
            <>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Restaurant Layout</Text>
                    <Text style={styles.headerSubtitle}>Monitor and manage table statuses in real-time</Text>
                </View>

                <View style={[styles.filterRow, { marginBottom: 15 }]}>
                    <TouchableOpacity 
                        style={[styles.filterBtn, { flex: 1, marginRight: 5 }]} 
                        onPress={() => setFilterModal({
                            show: true,
                            title: 'Check Date',
                            placeholder: 'Format: YYYY-MM-DD',
                            type: 'DATE',
                            value: filterTableDate,
                            onSubmit: (val) => {
                                if(val.match(/^\d{4}-\d{2}-\d{2}$/)) setFilterTableDate(val);
                                else Alert.alert('Invalid Format', 'Please use YYYY-MM-DD');
                            }
                        })}
                    >
                        <Text style={styles.filterBtnText}>📅 {filterTableDate}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterBtn, { flex: 1, marginLeft: 5 }]} 
                        onPress={() => setFilterModal({
                            show: true,
                            title: 'Check Time',
                            placeholder: 'Format: HH:MM',
                            type: 'TIME',
                            value: filterTableTime,
                            onSubmit: (val) => {
                                if(val.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) setFilterTableTime(val);
                                else Alert.alert('Invalid Format', 'Please use HH:MM (24h)');
                            }
                        })}
                    >
                        <Text style={styles.filterBtnText}>🕒 {filterTableTime}</Text>
                    </TouchableOpacity>
                </View>

                {areas.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🪑</Text>
                        <Text style={styles.emptyText}>No dining areas configured</Text>
                    </View>
                ) : (
                    areas.map(area => (
                        <View key={area.id} style={{ marginBottom: 25 }}>
                            <View style={styles.areaHeader}>
                                <Text style={styles.areaTitle}>{area.area_name}</Text>
                                <Text style={styles.areaSub}>{area.description || 'General Seating Area'}</Text>
                            </View>
                            <View style={styles.tableGrid}>
                                {tables.filter(t => t.area_id === area.id).map(table => {
                                    const isReserved = table.status === 'Reserved' || table.is_reserved;
                                    const isOccupied = table.status === 'Occupied' || table.is_occupied;
                                    const isCleaning = table.status === 'Cleaning';

                                    return (
                                        <TouchableOpacity 
                                            key={table.id} 
                                            style={[
                                                styles.tableBox,
                                                isOccupied ? styles.tableBoxOccupied : (isReserved ? styles.tableBoxReserved : (isCleaning ? styles.tableBoxCleaning : styles.tableBoxAvailable))
                                            ]}
                                            onPress={() => {
                                                if (isReserved) {
                                                    const res = table.reservation_details;
                                                    Alert.alert(
                                                        `Table ${table.table_number} - RESERVED`,
                                                        `Customer: ${res?.customer_name || 'Guest'}\nTime: ${res?.time || '--:--'}\nGuests: ${res?.guests || 0}`,
                                                        [{ text: 'Close' }]
                                                    );
                                                } else if (isCleaning) {
                                                    Alert.alert(
                                                        `Table ${table.table_number}`,
                                                        'Table is currently under cleaning.',
                                                        [
                                                            { text: 'Cancel', style: 'cancel' },
                                                            { text: 'Force Available', onPress: () => updateTableStatus(table.id, 'available') }
                                                        ]
                                                    );
                                                } else {
                                                    Alert.alert(
                                                        `Table ${table.table_number}`,
                                                        `Capacity: ${table.capacity} | Status: ${table.status.toUpperCase()}`,
                                                        [
                                                            { text: 'Close' },
                                                            { 
                                                                text: (table.status === 'Available') ? 'Mark Not Available' : 'Mark Available',
                                                                onPress: () => updateTableStatus(table.id, (table.status === 'Available') ? 'not available' : 'available')
                                                            }
                                                        ]
                                                    );
                                                }
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={styles.tableNum}>T-{table.table_number}</Text>
                                                <Text style={{ fontSize: 12 }}>{(isReserved || isOccupied) ? '🔴' : '🟢'}</Text>
                                            </View>
                                            <Text style={styles.tableCap}>👥 {table.capacity} Seats</Text>
                                            {isReserved ? (
                                                <View style={{ marginTop: 5, backgroundColor: '#FEE2E2', padding: 2, borderRadius: 4 }}>
                                                    <Text style={{ fontSize: 8, color: '#DC2626', fontWeight: 'bold', textAlign: 'center' }}>📅 {table.reservation_details?.customer_name || 'Guest'}</Text>
                                                </View>
                                            ) : table.steward_name ? (
                                                <Text style={{ fontSize: 10, color: '#059669', marginTop: 4, fontWeight: '700' }}>👤 {table.steward_name}</Text>
                                            ) : null}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))
                )}
            </>
        );
    };

    const updateTableStatus = async (id, status) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/admin/tables/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update table');
        }
    };

    const updateStatus = async (id, status, type) => {
        try {
            const res = await fetch(`${apiConfig.ADMIN.ORDERS}/${id}/status`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, type })
            });
            if (res.ok) {
                Alert.alert('Success', `Order status updated to ${status}`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update order status');
        }
    };

    const handleItemRemovalAction = async (id, action) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/orders/removal-requests/${id}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Processed via Mobile' })
            });
            if (res.ok) {
                Alert.alert('Success', `Removal request ${action === 'approve' ? 'approved' : 'rejected'}`);
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Action failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Connection failed');
        }
    };

    const handleCancellationAction = async (id, action) => {
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/admin/orders/cancellation-requests/${id}/action`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, admin_notes: 'Processed via Mobile' })
            });
            if (res.ok) {
                Alert.alert('Success', `Cancellation request ${action}ed`);
                fetchData();
            } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Action failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Connection failed');
        }
    };

    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            );
        }
 
        switch (activeTab) {
            case 'overview': return renderOverview();
            case 'tables': return renderTables();
            case 'users': return renderUsers();
            case 'attendance': return renderAttendance();
            case 'menu': return renderMenuManagement();
            case 'orders': return renderOrders();
            case 'suppliers': return renderSuppliers();
            case 'activity': return renderActivity();
            case 'inventory': return renderInventory();
            case 'reports': return renderReports();
            case 'reservations': return renderReservations();
            case 'notifications': return renderNotifications();
            case 'account': return <AccountSection />;
            default: return renderOverview();
        }
    };
    const renderTopBar = () => (
        <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {activeTab !== 'overview' && (
                    <TouchableOpacity onPress={() => setActiveTab('overview')} style={{ marginRight: 15, padding: 5 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>←</Text>
                    </TouchableOpacity>
                )}
                <View style={[styles.brandContainer, { flexDirection: 'row', alignItems: 'center' }]}>
                    {/* Logo inside a black circle */}
                    <View style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        backgroundColor: '#111827',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                    }}>
                        <Image source={require('../../assets/logo.png')} style={{ width: 30, height: 30, resizeMode: 'contain' }} />
                    </View>
                    {/* Restaurant name in bold black */}
                    <View style={{ justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>Melissa's Food Court</Text>
                        <Text style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 }}>Admin Panel</Text>
                    </View>
                </View>
            </View>

            <View style={styles.topBarRight}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => setActiveTab('notifications')}>
                    <Text style={{ fontSize: 18 }}>🔔</Text>
                    {notificationList.filter(n => !n.is_read).length > 0 && (
                        <View style={styles.notifBadgeSmall}>
                            <Text style={styles.notifBadgeText}>{notificationList.filter(n => !n.is_read).length}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.adminInfo_compact}>
                    <TouchableOpacity onPress={() => setActiveTab('account')} style={[styles.adminAvatar_small, { overflow: 'hidden' }]}>
                        {user?.profile_image ? (
                            <Image 
                                source={{ uri: user.profile_image.startsWith('http') ? user.profile_image : `${apiConfig.API_BASE_URL}${user.profile_image}` }} 
                                style={{ width: '100%', height: '100%', resizeMode: 'cover' }} 
                            />
                        ) : (
                            <Text style={styles.avatarLetter_small}>{user?.name?.charAt(0).toUpperCase() || 'A'}</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout}>
                        <Text style={styles.logoutLink}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );


    const renderHeaderTabs = () => (
        <View style={styles.headerTabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.headerTabsScroll}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.headerTabButton, activeTab === tab.key && styles.activeHeaderTabButton]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={[styles.headerTabLabel, activeTab === tab.key && styles.activeHeaderTabLabel]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );


    return (
        <View style={styles.container}>
            {renderTopBar()}
            {renderHeaderTabs()}
            <ScrollView 
                style={styles.scrollContent} 
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {renderContent()}
                <View style={{ height: 40 }} />
            </ScrollView>
            {renderAnalyticsModal()}
            {renderTodayRevenueModal()}
            {renderTotalOrdersModal()}
            {renderActiveStaffModal()}
            {renderTotalCustomersModal()}
            {renderMenuModal()}
            {renderCategoryModal()}
            {renderOrderModal()}
            {renderRoleModal()}
            {renderInventoryModal()}
            {renderReviewModal()}
            {renderFilterModal()}
            {renderReservationDetailModal()}
        </View>
    );


    function renderFilterModal() {
        return (
            <Modal visible={filterModal.show} transparent={true} animationType="fade">
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
        );
    }

    function renderReviewModal() {
        if (!selectedReviewOrder) return null;
        
        return (
            <Modal visible={showReviewModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Order Full Review</Text>
                                <Text style={styles.modalSub}>ID: #{selectedReviewOrder.id} ({selectedReviewOrder.order_type})</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                                <Text style={{ fontSize: 24, padding: 5 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ marginBottom: 20 }}>
                            <View style={{ backgroundColor: '#F3F4F6', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                                <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 4 }}>Customer: <Text style={{ fontWeight: 'bold' }}>{selectedReviewOrder.customer_name || 'Guest'}</Text></Text>
                                <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 4 }}>Date: {new Date(selectedReviewOrder.created_at).toLocaleString()}</Text>
                                <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 4 }}>Status: {selectedReviewOrder.status}</Text>
                                {selectedReviewOrder.table_number && <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 4 }}>Table: {selectedReviewOrder.table_number}</Text>}
                                {selectedReviewOrder.steward_name && <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 4 }}>Steward: {selectedReviewOrder.steward_name}</Text>}
                            </View>

                            <Text style={{ fontWeight: 'bold', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 5 }}>Bill Details</Text>
                            {(typeof selectedReviewOrder.items === 'string' ? JSON.parse(selectedReviewOrder.items) : selectedReviewOrder.items || []).map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '500' }}>{item.name}</Text>
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>Rs. {item.price} x {item.quantity}</Text>
                                    </View>
                                    <Text style={{ fontWeight: '600' }}>Rs. {item.price * item.quantity}</Text>
                                </View>
                            ))}

                            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 15, paddingTop: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Total Amount</Text>
                                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#111827' }}>Rs. {Number(selectedReviewOrder.total_price || 0).toLocaleString()}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity 
                            style={[styles.saveBtn, { width: '100%' }]} 
                            onPress={() => setShowReviewModal(false)}
                        >
                            <Text style={styles.saveBtnText}>Close Review</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderAnalyticsModal() {
        return (
            <Modal visible={showAnalyticsModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Revenue Analytics</Text>
                            <TouchableOpacity onPress={() => setShowAnalyticsModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSub}>Detailed breakdown for Melissa's Food Court</Text>
                        
                        <ScrollView>
                            <View style={styles.analyticsSection}>
                                <Text style={styles.chartTitle}>Revenue by Type</Text>
                                <View style={styles.barChartContainer}>
                                    <View style={styles.barColumn}>
                                        <View style={[styles.bar, { height: 80, backgroundColor: '#3B82F6' }]} />
                                        <Text style={styles.barLabel}>Dine</Text>
                                    </View>
                                    <View style={styles.barColumn}>
                                        <View style={[styles.bar, { height: 60, backgroundColor: '#10B981' }]} />
                                        <Text style={styles.barLabel}>Take</Text>
                                    </View>
                                    <View style={styles.barColumn}>
                                        <View style={[styles.bar, { height: 40, backgroundColor: '#F59E0B' }]} />
                                        <Text style={styles.barLabel}>Del</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.listCard, { marginTop: 20 }]}>
                                <Text style={styles.listCardName}>Order Breakdown</Text>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Completed</Text>
                                    <Text style={styles.summaryValue}>85%</Text>
                                </View>
                                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                    <Text style={styles.summaryLabel}>Cancelled</Text>
                                    <Text style={styles.summaryValue}>15%</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={() => setShowAnalyticsModal(false)}>
                            <Text style={styles.saveBtnText}>Close Analysis</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderTodayRevenueModal() {
        return (
            <Modal visible={showTodayRevenueModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Today's Revenue</Text>
                            <TouchableOpacity onPress={() => setShowTodayRevenueModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.statValue, { fontSize: 28, textAlign: 'center', marginVertical: 20 }]}>Rs. {Number(stats?.todayRevenue || 0).toLocaleString()}</Text>
                        
                        <ScrollView>
                            <View style={styles.listCard}>
                                <Text style={styles.listCardName}>Order Breakdown</Text>
                                <View style={[styles.summaryRow, { marginTop: 10 }]}>
                                    <Text style={styles.summaryLabel}>Dine-In</Text>
                                    <Text style={styles.summaryValue}>{stats?.details?.dineInOrders || 0}</Text>
                                </View>
                                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                    <Text style={styles.summaryLabel}>Takeaway</Text>
                                    <Text style={styles.summaryValue}>{stats?.details?.takeawayOrders || 0}</Text>
                                </View>
                                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                    <Text style={styles.summaryLabel}>Delivery</Text>
                                    <Text style={styles.summaryValue}>{stats?.details?.deliveryOrders || 0}</Text>
                                </View>
                            </View>
                        </ScrollView>
                        
                        <TouchableOpacity style={styles.saveBtn} onPress={() => setShowTodayRevenueModal(false)}>
                            <Text style={styles.saveBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderTotalOrdersModal() {
        return (
            <Modal visible={showTotalOrdersModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Order History</Text>
                            <TouchableOpacity onPress={() => setShowTotalOrdersModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.statValue, { fontSize: 28, textAlign: 'center', marginVertical: 20 }]}>{stats?.totalOrders || 0} Total Orders</Text>
                        
                        <ScrollView>
                            <View style={styles.listCard}>
                                <Text style={styles.listCardName}>Trend Analysis</Text>
                                <View style={[styles.summaryRow, { marginTop: 10 }]}>
                                    <Text style={styles.summaryLabel}>Today's Orders</Text>
                                    <Text style={styles.summaryValue}>{stats?.details?.todayOrders || 0}</Text>
                                </View>
                                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                    <Text style={styles.summaryLabel}>Total (All Time)</Text>
                                    <Text style={styles.summaryValue}>{stats?.totalOrders || 0}</Text>
                                </View>
                            </View>
                        </ScrollView>
                        
                        <TouchableOpacity style={styles.saveBtn} onPress={() => setShowTotalOrdersModal(false)}>
                            <Text style={styles.saveBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderActiveStaffModal() {
        return (
            <Modal visible={showActiveStaffModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Active Staff</Text>
                            <TouchableOpacity onPress={() => setShowActiveStaffModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.statValue, { fontSize: 28, textAlign: 'center', marginVertical: 20 }]}>{stats?.activeStaff || 0} On Duty</Text>
                        
                        <ScrollView>
                            {staffList.filter(s => s.status === 'active' || s.is_active).map(staff => (
                                <View key={staff.id} style={styles.permItem}>
                                    <Text style={styles.permItemText}>{staff.name || staff.full_name}</Text>
                                    <Text style={[styles.badgeText, { color: '#3B82F6' }]}>{staff.role}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        
                        <TouchableOpacity style={styles.saveBtn} onPress={() => setShowActiveStaffModal(false)}>
                            <Text style={styles.saveBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderTotalCustomersModal() {
        return (
            <Modal visible={showTotalCustomersModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Customer Base</Text>
                            <TouchableOpacity onPress={() => setShowTotalCustomersModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.statValue, { fontSize: 28, textAlign: 'center', marginVertical: 20 }]}>{stats?.totalCustomers || 0} Registered</Text>
                        
                        <ScrollView>
                            <View style={styles.listCard}>
                                <Text style={styles.listCardName}>Growth this week</Text>
                                <Text style={[styles.statValue, { color: '#10B981', marginTop: 10 }]}>+{stats?.details?.newCustomersWeek?.count ?? stats?.details?.newCustomersWeek ?? 0} New Signups</Text>
                            </View>
                        </ScrollView>
                        
                        <TouchableOpacity style={styles.saveBtn} onPress={() => setShowTotalCustomersModal(false)}>
                            <Text style={styles.saveBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderReservationDetailModal() {
        if (!selectedReservation) return null;
        const res = selectedReservation;
        const status = (res.reservation_status || res.status || 'PENDING').toUpperCase();

        return (
            <Modal visible={showResDetailModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reservation Details</Text>
                            <TouchableOpacity onPress={() => setShowResDetailModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ marginTop: 20 }}>
                            <View style={styles.listCard}>
                                <Text style={styles.listCardName}>Customer Information</Text>
                                <View style={{ marginTop: 10 }}>
                                    <Text style={styles.summaryLabel}>Name</Text>
                                    <Text style={styles.summaryValue}>{res.customer_name || 'Guest'}</Text>
                                    
                                    <Text style={[styles.summaryLabel, { marginTop: 10 }]}>Mobile</Text>
                                    <Text style={styles.summaryValue}>{res.mobile_number || 'N/A'}</Text>
                                    
                                    <Text style={[styles.summaryLabel, { marginTop: 10 }]}>Email</Text>
                                    <Text style={styles.summaryValue}>{res.customer_email || res.email || 'N/A'}</Text>
                                </View>
                            </View>

                            <View style={styles.listCard}>
                                <Text style={styles.listCardName}>Booking Schedule</Text>
                                <View style={{ marginTop: 10 }}>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Date</Text>
                                        <Text style={styles.summaryValue}>{res.reservation_date ? (res.reservation_date.includes('T') ? res.reservation_date.split('T')[0] : res.reservation_date) : 'N/A'}</Text>
                                    </View>
                                    <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                        <Text style={styles.summaryLabel}>Time</Text>
                                        <Text style={styles.summaryValue}>{res.reservation_time || 'N/A'}</Text>
                                    </View>
                                    <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                        <Text style={styles.summaryLabel}>Guests</Text>
                                        <Text style={styles.summaryValue}>{res.guest_count} Person(s)</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.listCard}>
                                <Text style={styles.listCardName}>Table Allocation</Text>
                                <View style={{ marginTop: 10 }}>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Area</Text>
                                        <Text style={styles.summaryValue}>{res.area_name || 'General'}</Text>
                                    </View>
                                    <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                        <Text style={styles.summaryLabel}>Table Number</Text>
                                        <Text style={styles.summaryValue}>#{res.table_number || 'N/A'}</Text>
                                    </View>
                                </View>
                            </View>

                            {res.special_requests && (
                                <View style={styles.listCard}>
                                    <Text style={styles.listCardName}>Special Requests</Text>
                                    <Text style={[styles.listCardSub, { marginTop: 8 }]}>{res.special_requests}</Text>
                                </View>
                            )}

                            <View style={[styles.badge, { 
                                alignSelf: 'center', 
                                marginTop: 10,
                                backgroundColor: status === 'CONFIRMED' ? '#D1FAE5' : status === 'CANCELLED' ? '#FEE2E2' : '#FEF3C7',
                                paddingHorizontal: 20,
                                paddingVertical: 8
                            }]}>
                                <Text style={[styles.badgeText, { color: status === 'CONFIRMED' ? '#059669' : status === 'CANCELLED' ? '#DC2626' : '#D97706', fontSize: 14 }]}>
                                    Status: {status}
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={{ marginTop: 20 }}>
                            <Text style={[styles.label, { marginBottom: 10 }]}>Quick Status Update</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {['CONFIRMED', 'ARRIVED', 'COMPLETED', 'NOSHOW', 'CANCELLED'].map(s => (
                                    <TouchableOpacity 
                                        key={s}
                                        style={[
                                            styles.catPill, 
                                            status === s && styles.activeCatPill,
                                            { paddingHorizontal: 10, paddingVertical: 6 }
                                        ]}
                                        onPress={() => {
                                            updateResStatus(res.id, s);
                                            setShowResDetailModal(false);
                                        }}
                                    >
                                        <Text style={[styles.catPillText, status === s && styles.activeCatPillText, { fontSize: 11 }]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                            <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => setShowResDetailModal(false)}>
                                <Text style={styles.cancelBtnText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderMenuModal() {
        return (
            <Modal visible={showMenuModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { flex: 1, maxHeight: '90%' }]}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingItem ? '✏️ Edit Item' : '➕ New Menu Item'}</Text>
                            <TouchableOpacity onPress={() => {
                                setShowMenuModal(false);
                                setEditingItem(null);
                                setMenuForm({ name: '', price: '', category_id: '', description: '', image: '', is_active: true, item_type: 'Food' });
                            }}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable Form */}
                        <ScrollView style={{ flex: 1, marginTop: 15 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Item Type *</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                {['Food', 'Drink'].map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.catPill, menuForm.item_type === type && styles.activeCatPill, { flex: 1, alignItems: 'center' }]}
                                        onPress={() => setMenuForm({ ...menuForm, item_type: type })}
                                    >
                                        <Text style={[styles.catPillText, menuForm.item_type === type && styles.activeCatPillText]}>
                                            {type === 'Food' ? '🍳 ' : '🍹 '}{type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Item Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Chicken Burger"
                                value={menuForm.name}
                                onChangeText={(val) => setMenuForm({ ...menuForm, name: val })}
                            />

                            <Text style={styles.label}>Selling Price (Rs.) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 1200"
                                keyboardType="numeric"
                                value={menuForm.price.toString()}
                                onChangeText={(val) => setMenuForm({ ...menuForm, price: val })}
                            />

                            <Text style={styles.label}>Buying Cost / Recipe Cost (Rs.)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 800"
                                keyboardType="numeric"
                                value={menuForm.buying_price ? menuForm.buying_price.toString() : ''}
                                onChangeText={(val) => setMenuForm({ ...menuForm, buying_price: val })}
                            />

                            <Text style={styles.label}>Category *</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.catPill, menuForm.category_id === cat.id && styles.activeCatPill]}
                                        onPress={() => setMenuForm({ ...menuForm, category_id: cat.id })}
                                    >
                                        <Text style={[styles.catPillText, menuForm.category_id === cat.id && styles.activeCatPillText]}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                placeholder="Brief description of the dish..."
                                multiline
                                value={menuForm.description}
                                onChangeText={(val) => setMenuForm({ ...menuForm, description: val })}
                            />

                            <Text style={styles.label}>Food Image</Text>
                            <TouchableOpacity
                                style={[styles.input, { borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', height: 44 }]}
                                onPress={handlePickImage}
                            >
                                <Text style={{ color: '#6B7280', fontSize: 13 }}>📁 Pick image from gallery</Text>
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.input, { marginTop: 8 }]}
                                placeholder="Or paste image URL here..."
                                value={menuForm.image}
                                onChangeText={(val) => setMenuForm({ ...menuForm, image: val })}
                            />
                            {menuForm.image ? (
                                <Image source={{ uri: menuForm.image.startsWith('http') ? menuForm.image : `${apiConfig.API_BASE_URL}${menuForm.image}` }} style={{ width: '100%', height: 140, borderRadius: 10, marginBottom: 12 }} resizeMode="cover" />
                            ) : null}

                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30, paddingVertical: 8 }}
                                onPress={() => setMenuForm({ ...menuForm, is_active: !menuForm.is_active })}
                            >
                                <View style={[styles.toggle, menuForm.is_active && styles.toggleActive]}>
                                    <View style={[styles.toggleHandle, menuForm.is_active && styles.toggleHandleActive]} />
                                </View>
                                <Text style={{ marginLeft: 10, fontSize: 14, color: '#374151', fontWeight: '600' }}>
                                    {menuForm.is_active ? '✅ Item is Available' : '❌ Mark as Unavailable'}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Save Button — always visible outside ScrollView */}
                        <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                            <TouchableOpacity
                                style={{ backgroundColor: '#111827', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                                onPress={handleSaveMenu}
                            >
                                <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5 }}>
                                    {editingItem ? '💾 Save Changes' : '✅ Add Menu Item'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderCategoryModal() {
        const handlePickCatImage = async () => {
            try {
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                });
                if (!result.canceled) {
                    setCategoryForm({ ...categoryForm, image: result.assets[0].uri });
                }
            } catch (error) { console.error(error); }
        };

        return (
            <Modal visible={showCategoryModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingCategory ? '✏️ Edit Category' : '➕ New Category'}</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Category Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Desserts"
                            value={categoryForm.name}
                            onChangeText={(val) => setCategoryForm({ ...categoryForm, name: val })}
                        />

                        <Text style={styles.label}>Category Icon/Image</Text>
                        <TouchableOpacity 
                            style={[styles.input, { borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', height: 100 }]}
                            onPress={handlePickCatImage}
                        >
                            {categoryForm.image ? (
                                <Image source={{ uri: categoryForm.image.startsWith('http') ? categoryForm.image : (categoryForm.image.startsWith('/') ? `${apiConfig.API_BASE_URL}${categoryForm.image}` : categoryForm.image) }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                            ) : (
                                <Text style={{ color: '#6B7280' }}>📁 Pick Icon</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCategoryModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCategory}>
                                <Text style={styles.saveBtnText}>{editingCategory ? 'Update' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderOrderModal() {
        const addItemToOrder = () => {
            if (!orderItem.id) return Alert.alert('Select Item', 'Please select a menu item first.');
            // Check if item already in order — if so, increase quantity
            const existingIdx = newOrder.items.findIndex(i => i.id === orderItem.id);
            if (existingIdx >= 0) {
                const updated = [...newOrder.items];
                updated[existingIdx].quantity += orderItem.quantity;
                setNewOrder({ ...newOrder, items: updated });
            } else {
                setNewOrder({ ...newOrder, items: [...newOrder.items, { ...orderItem }] });
            }
            setOrderItem({ id: '', name: '', quantity: 1, price: 0 });
        };

        const removeItem = (idx) => {
            const updated = newOrder.items.filter((_, i) => i !== idx);
            setNewOrder({ ...newOrder, items: updated });
        };

        const totalPrice = newOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const handleAddOrderLocal = async () => {
            if (!newOrder.customer_name.trim()) return Alert.alert('Missing Info', 'Enter customer name.');
            if (newOrder.items.length === 0) return Alert.alert('Empty Order', 'Add at least one item.');
            if (newOrder.order_type === 'DELIVERY' && !newOrder.address.trim()) return Alert.alert('Missing Info', 'Enter delivery address.');
            try {
                const res = await fetch(`${apiConfig.API_BASE_URL}/api/admin/orders`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ ...newOrder, total_price: totalPrice })
                });
                const data = await res.json();
                if (res.ok) {
                    Alert.alert('✅ Order Created', `Order #${data.orderId || ''} placed for ${newOrder.customer_name}`);
                    setShowOrderModal(false);
                    setNewOrder({ order_type: 'DINE-IN', customer_name: '', phone: '', items: [], table_id: '', address: '', notes: '', status: 'PENDING', payment_status: 'PAID' });
                    setOrderItem({ id: '', name: '', quantity: 1, price: 0 });
                    fetchData(true);
                } else {
                    Alert.alert('Error', data.message || 'Failed to create order');
                }
            } catch (e) {
                Alert.alert('Network Error', 'Check your connection and try again.');
            }
        };

        return (
            <Modal visible={showOrderModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { flex: 1, maxHeight: '92%' }]}>

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🛍️ New Order</Text>
                            <TouchableOpacity onPress={() => {
                                setShowOrderModal(false);
                                setOrderItem({ id: '', name: '', quantity: 1, price: 0 });
                            }}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, marginTop: 12 }} showsVerticalScrollIndicator={false}>

                            {/* Order Type */}
                            <Text style={styles.label}>Order Type</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                {[{ t: 'DINE-IN', icon: '🍽️' }, { t: 'TAKEAWAY', icon: '🛍️' }, { t: 'DELIVERY', icon: '🛵' }].map(({ t, icon }) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.catPill, newOrder.order_type === t && styles.activeCatPill, { flex: 1, alignItems: 'center' }]}
                                        onPress={() => setNewOrder({ ...newOrder, order_type: t })}
                                    >
                                        <Text style={[styles.catPillText, newOrder.order_type === t && styles.activeCatPillText]}>{icon} {t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Customer Info */}
                            <Text style={styles.label}>Customer Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. John Perera"
                                value={newOrder.customer_name}
                                onChangeText={t => setNewOrder({ ...newOrder, customer_name: t })}
                            />

                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="071 XXXXXXX"
                                keyboardType="phone-pad"
                                value={newOrder.phone}
                                onChangeText={t => setNewOrder({ ...newOrder, phone: t })}
                            />

                            {/* Conditional fields */}
                            {newOrder.order_type === 'DINE-IN' && (
                                <>
                                    <Text style={styles.label}>Table Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. T5"
                                        value={newOrder.table_id}
                                        keyboardType="numeric"
                                        onChangeText={t => setNewOrder({ ...newOrder, table_id: t })}
                                    />
                                </>
                            )}
                            {newOrder.order_type === 'DELIVERY' && (
                                <>
                                    <Text style={styles.label}>Delivery Address *</Text>
                                    <TextInput
                                        style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                                        placeholder="Full address..."
                                        multiline
                                        value={newOrder.address}
                                        onChangeText={t => setNewOrder({ ...newOrder, address: t })}
                                    />
                                </>
                            )}

                            {/* Payment Status */}
                            <Text style={styles.label}>Payment</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                {['PAID', 'PENDING', 'CASH'].map(p => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[styles.catPill, newOrder.payment_status === p && styles.activeCatPill]}
                                        onPress={() => setNewOrder({ ...newOrder, payment_status: p })}
                                    >
                                        <Text style={[styles.catPillText, newOrder.payment_status === p && styles.activeCatPillText]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Menu Item Picker */}
                            <Text style={styles.label}>🍽️ Select Items</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                {menuList.filter(m => m.is_active || m.status === 1).map(m => (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[styles.catPill, orderItem.id === m.id && styles.activeCatPill, { marginBottom: 4 }]}
                                        onPress={() => setOrderItem({ id: m.id, name: m.name, price: Number(m.price), quantity: 1, category: m.category })}
                                    >
                                        <Text style={[styles.catPillText, orderItem.id === m.id && styles.activeCatPillText]}>{m.name}</Text>
                                        <Text style={{ fontSize: 9, color: orderItem.id === m.id ? '#D4AF37' : '#9CA3AF' }}>Rs.{m.price}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Selected item qty control */}
                            {orderItem.id ? (
                                <View style={{ backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '700', fontSize: 14 }}>{orderItem.name}</Text>
                                        <Text style={{ color: '#6B7280', fontSize: 12 }}>Rs. {orderItem.price} each</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TouchableOpacity
                                            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
                                            onPress={() => setOrderItem({ ...orderItem, quantity: Math.max(1, orderItem.quantity - 1) })}
                                        >
                                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>−</Text>
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', minWidth: 24, textAlign: 'center' }}>{orderItem.quantity}</Text>
                                        <TouchableOpacity
                                            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
                                            onPress={() => setOrderItem({ ...orderItem, quantity: orderItem.quantity + 1 })}
                                        >
                                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>+</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                                            onPress={addItemToOrder}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>+ Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 12 }}>👆 Tap an item above to select</Text>
                            )}

                            {/* Order Items List */}
                            {newOrder.items.length > 0 && (
                                <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                                    <Text style={{ fontWeight: '700', marginBottom: 8, fontSize: 13 }}>📋 Order Items</Text>
                                    {newOrder.items.map((item, i) => (
                                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < newOrder.items.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                                            <Text style={{ flex: 1, fontSize: 13 }}>{item.quantity}x {item.name}</Text>
                                            <Text style={{ fontSize: 13, fontWeight: '600', marginRight: 10 }}>Rs. {(item.price * item.quantity).toLocaleString()}</Text>
                                            <TouchableOpacity onPress={() => removeItem(i)}>
                                                <Text style={{ color: '#DC2626', fontSize: 16 }}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Notes */}
                            <Text style={styles.label}>Notes (optional)</Text>
                            <TextInput
                                style={[styles.input, { height: 60, textAlignVertical: 'top', marginBottom: 20 }]}
                                placeholder="Special instructions..."
                                multiline
                                value={newOrder.notes}
                                onChangeText={t => setNewOrder({ ...newOrder, notes: t })}
                            />
                        </ScrollView>

                        {/* Footer with total and submit */}
                        <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 }}>
                            {newOrder.items.length > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <Text style={{ fontWeight: '700', fontSize: 15 }}>Total</Text>
                                    <Text style={{ fontWeight: '700', fontSize: 15, color: '#10B981' }}>Rs. {totalPrice.toLocaleString()}</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={{ backgroundColor: newOrder.items.length === 0 ? '#9CA3AF' : '#111827', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                                onPress={handleAddOrderLocal}
                                disabled={newOrder.items.length === 0}
                            >
                                <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>✅ Place Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderInventoryModal() {
        return (
            <Modal visible={showInventoryModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { flex: 1, maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingInventory ? '✏️ Edit Stock Item' : '📦 New Stock Item'}</Text>
                            <TouchableOpacity onPress={() => {
                                setShowInventoryModal(false);
                                setEditingInventory(null);
                                setInventoryForm({ item_name: '', quantity: '', unit: '', supplier_id: '', category: 'General', min_level: '5' });
                            }}>
                                <Text style={{ fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, marginTop: 15 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Item Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Basmati Rice"
                                value={inventoryForm.item_name}
                                onChangeText={(val) => setInventoryForm({ ...inventoryForm, item_name: val })}
                            />

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Quantity *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={inventoryForm.quantity.toString()}
                                        onChangeText={(val) => setInventoryForm({ ...inventoryForm, quantity: val })}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Unit *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="kg, Liters, Pcs"
                                        value={inventoryForm.unit}
                                        onChangeText={(val) => setInventoryForm({ ...inventoryForm, unit: val })}
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>Category *</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
                                {['Kitchen', 'Bar', 'General'].map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.catPill, inventoryForm.category === cat && styles.activeCatPill]}
                                        onPress={() => setInventoryForm({ ...inventoryForm, category: cat })}
                                    >
                                        <Text style={[styles.catPillText, inventoryForm.category === cat && styles.activeCatPillText]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Minimum Level (Alert Threshold) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="5"
                                keyboardType="numeric"
                                value={inventoryForm.min_level.toString()}
                                onChangeText={(val) => setInventoryForm({ ...inventoryForm, min_level: val })}
                            />

                            <Text style={styles.label}>Supplier (Optional)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                {supplierList.map(sup => (
                                    <TouchableOpacity
                                        key={sup.id}
                                        style={[styles.catPill, inventoryForm.supplier_id == sup.id && styles.activeCatPill]}
                                        onPress={() => setInventoryForm({ ...inventoryForm, supplier_id: sup.id })}
                                    >
                                        <Text style={[styles.catPillText, inventoryForm.supplier_id == sup.id && styles.activeCatPillText]}>
                                            {sup.brand_name || sup.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </ScrollView>

                        <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                            <TouchableOpacity
                                style={{ backgroundColor: '#111827', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                                onPress={handleSaveInventory}
                            >
                                <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>
                                    {editingInventory ? '💾 Save Changes' : '✅ Add Stock Item'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoEmoji: {
        fontSize: 24,
        marginRight: 10,
    },
    brandName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    brandTagline: {
        fontSize: 10,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        position: 'relative',
    },
    notifBadgeSmall: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#DC2626',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    notifBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    adminInfo_compact: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 4,
        paddingRight: 10,
        borderRadius: 20,
    },
    adminAvatar_small: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    avatarLetter_small: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    logoutLink: {
        fontSize: 11,
        color: '#DC2626',
        fontWeight: 'bold',
    },
    headerTabsContainer: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTabsScroll: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    headerTabButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    activeHeaderTabButton: {
        backgroundColor: '#111827',
    },
    headerTabLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    activeHeaderTabLabel: {
        color: 'white',
    },
    scrollContent: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 14,
    },
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    pageHeader: {
        marginBottom: 20,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    pageSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    statsGrid: {
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: 'black',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 20,
    },
    statTitle: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 4,
    },
    chartCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: 'black',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    quickStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    quickStat: {
        alignItems: 'center',
    },
    quickStatValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F59E0B',
    },
    quickStatLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 4,
    },
    subTabRow: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    subTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeSubTab: {
        backgroundColor: 'white',
        elevation: 1,
    },
    subTabText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    activeSubTabText: {
        color: '#111827',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    listCard: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: 'black',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        elevation: 1,
    },
    listCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    listCardInfo: {
        flex: 1,
    },
    listCardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    listCardSub: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    permBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
        marginRight: 2,
    },
    areaHeader: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    areaTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    areaSub: {
        fontSize: 11,
        color: '#6B7280',
    },
    tableGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    tableBox: {
        width: (screenWidth - 42) / 2,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tableBoxOccupied: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    tableBoxReserved: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    tableBoxCleaning: {
        backgroundColor: '#FEFCE8',
        borderColor: '#FEF08A',
        borderStyle: 'dashed',
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
    permBtnText: {
        fontSize: 10,
        color: '#4B5563',
    },
    orderActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    statusBtn_prep: {
        flex: 1,
        backgroundColor: '#DBEAFE',
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: 'center',
    },
    statusBtn_ready: {
        flex: 1,
        backgroundColor: '#FEF3C7',
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: 'center',
    },
    statusBtn_done: {
        flex: 1,
        backgroundColor: '#D1FAE5',
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: 'center',
    },
    statusBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    editBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    editBtnText: {
        fontSize: 11,
        color: '#4B5563',
    },
    deleteBtn: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    deleteBtnText: {
        fontSize: 11,
        color: '#DC2626',
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    tagBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 9,
        color: '#6B7280',
    },
    approveBtn: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    approveBtnText: {
        fontSize: 11,
        color: '#059669',
        fontWeight: 'bold',
    },
    rejectBtn: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    rejectBtnText: {
        fontSize: 11,
        color: '#DC2626',
        fontWeight: 'bold',
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        marginBottom: 15,
    },
    filterLabel: {
        fontSize: 13,
        color: '#1F2937',
    },
    filterBtn: {
        backgroundColor: '#111827',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    filterBtnText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    timeText: {
        fontSize: 12,
        color: '#6B7280',
    },
    catPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: 'white',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeCatPill: {
        backgroundColor: '#111827',
        borderColor: '#111827',
    },
    catPillText: {
        fontSize: 12,
        color: '#6B7280',
    },
    activeCatPillText: {
        color: 'white',
    },
    catPill_add: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: 'white',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
    },
    catPillText_add: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    catScroll: {
        marginBottom: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalSub: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 20,
    },
    barChartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 120,
        marginTop: 10,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
    },
    bar: {
        width: 14,
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 9,
        color: '#9CA3AF',
        marginTop: 4,
    },
    exportBtn: {
        backgroundColor: '#10B981',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    exportBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    addButtonSmall: {
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonTextSmall: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    permList: {
        marginBottom: 20,
    },
    permItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    permItemText: {
        fontSize: 14,
    },
    toggle: {
        width: 40,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E5E7EB',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: '#10B981',
    },
    toggleCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'white',
    },
    toggleCircleActive: {
        alignSelf: 'flex-end',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#6B7280',
    },
    saveBtn: {
        flex: 1,
        backgroundColor: '#111827',
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        marginBottom: 15,
    },
    filterLabel: {
        fontSize: 13,
        color: '#1F2937',
    },
    filterBtn: {
        backgroundColor: '#111827',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    filterBtnText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    timeText: {
        fontSize: 12,
        color: '#6B7280',
    },
    catPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: 'white',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeCatPill: {
        backgroundColor: '#111827',
        borderColor: '#111827',
    },
    catPillText: {
        fontSize: 12,
        color: '#6B7280',
    },
    activeCatPillText: {
        color: 'white',
    },
    catPill_add: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: 'white',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
    },
    catPillText_add: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    catScroll: {
        marginBottom: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalSub: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 20,
    },
    barChartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 120,
        marginTop: 10,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
    },
    bar: {
        width: 14,
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 9,
        color: '#9CA3AF',
        marginTop: 4,
    },
    exportBtn: {
        backgroundColor: '#10B981',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    exportBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    addButtonSmall: {
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonTextSmall: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    permList: {
        marginBottom: 20,
    },
    permItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    permItemText: {
        fontSize: 14,
    },
    toggle: {
        width: 40,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E5E7EB',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: '#10B981',
    },
    toggleHandle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'white',
    },
    toggleHandleActive: {
        alignSelf: 'flex-end',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#6B7280',
    },
    saveBtn: {
        flex: 1,
        backgroundColor: '#111827',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
        marginTop: 5,
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        marginBottom: 15,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    emptyText: {
        color: '#9CA3AF',
    },
    ongoingCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    analyticsSection: {
        marginTop: 10,
    }
});

export default AdminDashboard;
