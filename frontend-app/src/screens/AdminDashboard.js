import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';

const screenWidth = Dimensions.get('window').width;

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
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#111827" />
            </SafeAreaView>
        );
    }

    if (!hasAccess) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
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
            </SafeAreaView>
        );
    }


    const [stats, setStats] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [orderList, setOrderList] = useState([]);
    const [reservationList, setReservationList] = useState([]);
    const [attendanceList, setAttendanceList] = useState([]);
    const [permissionList, setPermissionList] = useState([]);
    const [menuList, setMenuList] = useState([]);
    const [supplierList, setSupplierList] = useState([]);
    const [activityList, setActivityList] = useState([]);
    const [notificationList, setNotificationList] = useState([]);
    const [inventoryList, setInventoryList] = useState([]);
    const [categories, setCategories] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [userSubTab, setUserSubTab] = useState('customers');
    const [orderSubTab, setOrderSubTab] = useState('DINE-IN');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [staffPermissions, setStaffPermissions] = useState({});

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
    const [reportLoading, setReportLoading] = useState(false);

    // Form States
    const [menuForm, setMenuForm] = useState({ name: '', price: '', category: '', description: '', image: '', is_active: true });
    const [supplierForm, setSupplierForm] = useState({ name: '', contact_number: '', email: '', address: '', products_supplied: '' });
    const [inventoryForm, setInventoryForm] = useState({ item_name: '', quantity: '', unit: '', supplier_id: '' });

    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);



    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async () => {
        try {
            // Only set major loading on first fetch
            if (!stats) setLoading(true);

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
                if (staffData) setStaffList(staffData.staff || []);
                
                const custData = await safeFetch(apiConfig.ADMIN.CUSTOMERS, { headers: reqHeaders });
                if (custData) setCustomerList(custData.customers || []);
            }

            if (activeTab === 'attendance') {
                const attData = await safeFetch(`${apiConfig.ADMIN.ATTENDANCE}?date=${attendanceDate}`, { headers: reqHeaders });
                if (attData) setAttendanceList(attData.attendance || []);
            }

            if (activeTab === 'menu') {
                const menuData = await safeFetch(apiConfig.MENU.ALL, { headers: reqHeaders });
                if (menuData) setMenuList(menuData.items || menuData || []);

                const catData = await safeFetch(apiConfig.MENU.CATEGORIES, { headers: reqHeaders });
                if (catData) setCategories(catData.categories || catData || []);
            }

            if (activeTab === 'suppliers') {
                const supData = await safeFetch(apiConfig.ADMIN.SUPPLIERS, { headers: reqHeaders });
                if (supData) setSupplierList(supData.suppliers || []);
            }

            if (activeTab === 'inventory') {
                const invData = await safeFetch(apiConfig.ADMIN.INVENTORY, { headers: reqHeaders });
                if (invData) setInventoryList(invData.inventory || []);
            }

            if (activeTab === 'orders' || activeTab === 'reports') {
                const orderData = await safeFetch(apiConfig.ADMIN.ORDERS, { headers: reqHeaders });
                if (orderData) setOrderList(orderData.orders || []);
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

        } catch (error) {
            console.error('FetchData overall error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, token, attendanceDate, stats]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            // Silently poll for stats and orders 
            fetchData();
        }, 15000); // 15s polling
        return () => clearInterval(interval);
    }, [fetchData]);

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

    const savePermissions = async () => {
        try {
            // Convert object { "perm": true } to array ["perm"] for backend
            const permsArray = Object.keys(staffPermissions).filter(k => staffPermissions[k]);
            
            const res = await fetch(`${apiConfig.ADMIN.STAFF}/${selectedStaff.id}/permissions`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ permissions: permsArray })
            });
            if (res.ok) {
                Alert.alert('Success', 'Permissions updated');
                setShowPermissionsModal(false);
                fetchData();
            } else {
                const errData = await res.json();
                Alert.alert('Error', errData.message || 'Failed to update permissions');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update permissions');
        }
    };


    const togglePermission = (permKey) => {
        setStaffPermissions(prev => ({
            ...prev,
            [permKey]: !prev[permKey]
        }));
    };

    const toggleStatus = async (id, currentStatus, type = 'staff') => {
        const action = currentStatus === 1 || currentStatus === true ? 'deactivate' : 'activate';
        const baseUrl = type === 'staff' ? apiConfig.ADMIN.STAFF : apiConfig.ADMIN.CUSTOMERS;
        
        try {
            // For customers, we use the status endpoint as per web
            const endpoint = type === 'staff' 
                ? `${baseUrl}/${id}/${action}` 
                : `${baseUrl}/${id}/status`;
            
            const method = type === 'staff' ? 'POST' : 'PUT';
            const body = type === 'customer' ? JSON.stringify({ status: action === 'activate' ? 'active' : 'inactive' }) : null;

            const res = await fetch(endpoint, {
                method,
                headers,
                body
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
    };    const tabs = [
        { key: 'overview', label: 'Dashboard', icon: '📊' },
        { key: 'users', label: 'Users', icon: '👥' },
        { key: 'attendance', label: 'Attendance', icon: '🕒' },
        { key: 'menu', label: 'Menu', icon: '🍽️' },
        { key: 'orders', label: 'Orders', icon: '🛍️' },
        { key: 'activity', label: 'Activity', icon: '⚡' },
        { key: 'suppliers', label: 'Suppliers', icon: '🚚' },
        { key: 'inventory', label: 'Inventory', icon: '📦' },
        { key: 'reports', label: 'Reports', icon: '📈' },
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
            </>
        );
    };


    // ===== USERS TAB =====
    const renderUsers = () => (
        <>
            <View style={styles.subTabRow}>
                {['customers', 'staff'].map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        style={[styles.subTab, userSubTab === tab.toLowerCase() && styles.activeSubTab]}
                        onPress={() => setUserSubTab(tab.toLowerCase())}
                    >
                        <Text style={[styles.subTabText, userSubTab === tab.toLowerCase() && styles.activeSubTabText]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {userSubTab === 'customers' ? renderCustomers() : renderStaff()}
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
                            <View style={[styles.avatarCircle, { backgroundColor: '#DBEAFE' }]}>
                                <Text style={styles.avatarText}>{staff.name?.charAt(0) || 'S'}</Text>
                            </View>

                            <View style={styles.listCardInfo}>
                                <Text style={styles.listCardName}>{staff.name}</Text>
                                <Text style={styles.listCardSub}>{staff.role} • {staff.email}</Text>
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
                                        style={styles.permBtn} 
                                        onPress={() => {
                                            setSelectedStaff(staff);
                                            // staff.permissions is an array from backend, convert to object for UI
                                            const permsObj = {};
                                            if (Array.isArray(staff.permissions)) {
                                                staff.permissions.forEach(p => {
                                                    permsObj[p] = true;
                                                });
                                            } else if (typeof staff.permissions === 'string') {
                                                try {
                                                    const parsed = JSON.parse(staff.permissions);
                                                    if (Array.isArray(parsed)) {
                                                        parsed.forEach(p => permsObj[p] = true);
                                                    } else {
                                                        Object.assign(permsObj, parsed);
                                                    }
                                                } catch(e) {}
                                            }
                                            setStaffPermissions(permsObj);
                                            setShowPermissionsModal(true);
                                        }}
                                    >
                                        <Text style={styles.permBtnText}>🔐 Permissions</Text>
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
    const renderOrders = () => (
        <>
            <View style={styles.subTabRow}>
                {['DINE-IN', 'TAKEAWAY', 'DELIVERY'].map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        style={[styles.subTab, orderSubTab === tab && styles.activeSubTab]}
                        onPress={() => setOrderSubTab(tab)}
                    >
                        <Text style={[styles.subTabText, orderSubTab === tab && styles.activeSubTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{orderSubTab} Orders</Text>
            </View>

            {orderList.filter(o => o.order_type === orderSubTab).length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🛍️</Text>
                    <Text style={styles.emptyText}>No {orderSubTab} orders found</Text>
                </View>
            ) : (
                orderList.filter(o => o.order_type === orderSubTab).map((order) => {
                    const isOngoing = ['PENDING', 'ORDER PLACED', 'PREPARING', 'READY', 'OUT FOR DELIVERY'].includes((order.status || '').toUpperCase());
                    return (
                        <View key={`${order.order_type}-${order.id}`} style={[styles.listCard, isOngoing && styles.ongoingCard]}>
                            <View style={styles.listCardHeader}>
                                <View style={[styles.avatarCircle, { backgroundColor: isOngoing ? '#FEF3C7' : '#E5E7EB' }]}>
                                    <Text style={styles.avatarText}>#{order.id}</Text>
                                </View>
                                <View style={styles.listCardInfo}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.listCardName}>Order #{order.id}</Text>
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>{order.order_type}</Text>
                                    </View>
                                    <Text style={styles.listCardSub}>Customer: {order.customer_name || 'Guest'}</Text>
                                    <Text style={styles.listCardSub}>Items: {order.items_summary || 'Check Details'}</Text>
                                    <Text style={styles.listCardSub}>Total: Rs. {Number(order.total_price || 0).toLocaleString()}</Text>
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
                                </View>
                            </View>
                        </View>
                    );
                })
            )}
        </>
    );


    // ===== PERMISSIONS TAB =====
    const renderPermissions = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Role Permissions</Text>
                <Text style={styles.headerSubtitle}>Manage access tokens for each staff role</Text>
            </View>
            {permissionList.map((perm) => (
                <View key={perm.id} style={styles.listCard}>
                    <Text style={styles.listCardName}>{perm.name}</Text>
                    <Text style={styles.listCardSub}>{perm.description}</Text>
                </View>
            ))}
        </>
    );

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
                        Alert.prompt('Select Date', 'Format: YYYY-MM-DD', [
                            { text: 'Cancel' },
                            { 
                                text: 'OK', 
                                onPress: (val) => {
                                    if(val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                        setAttendanceDate(val);
                                        fetchData();
                                    } else {
                                        Alert.alert('Invalid Format', 'Please use YYYY-MM-DD');
                                    }
                                }
                            }
                        ], 'plain-text', attendanceDate);
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
                            <View style={[styles.badge, { backgroundColor: att.logout_time ? '#E5E7EB' : '#10B981' }]}>
                                <Text style={[styles.badgeText, { color: att.logout_time ? '#6B7280' : 'white' }]}>
                                    {att.logout_time ? 'Checked Out' : 'Active'}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.listCardSub}>{att.role}</Text>
                        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 }}>
                            <Text style={styles.timeText}>🕒 Check In: {new Date(att.login_time).toLocaleTimeString()}</Text>
                            <Text style={styles.timeText}>🕒 Check Out: {att.logout_time ? new Date(att.logout_time).toLocaleTimeString() : '---'}</Text>
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
                <TouchableOpacity style={styles.addButtonSmall} onPress={() => Alert.alert('Add Item', 'Open Item form')}>
                    <Text style={styles.addButtonTextSmall}>+ Item</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                <TouchableOpacity 
                    style={[styles.catPill, selectedCategory === 'All' && styles.activeCatPill]}
                    onPress={() => setSelectedCategory('All')}
                >
                    <Text style={[styles.catPillText, selectedCategory === 'All' && styles.activeCatPillText]}>All Items</Text>
                </TouchableOpacity>
                {categories.map(cat => {
                    const itemCount = menuList.filter(item => item.category === cat.name).length;
                    const isLow = itemCount < 6;
                    return (
                        <TouchableOpacity 
                            key={cat.id} 
                            style={[styles.catPill, selectedCategory === cat.name && styles.activeCatPill, isLow && { borderColor: '#F59E0B' }]}
                            onPress={() => setSelectedCategory(cat.name)}
                        >
                            <Text style={[styles.catPillText, selectedCategory === cat.name && styles.activeCatPillText]}>
                                {cat.name} ({itemCount}) {isLow && '⚠️'}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                <TouchableOpacity style={styles.catPill_add} onPress={() => Alert.alert('Add Category', 'Open Category form')}>
                    <Text style={styles.catPillText_add}>+ New</Text>
                </TouchableOpacity>
            </ScrollView>

            {menuList.filter(item => selectedCategory === 'All' || item.category === selectedCategory).map((item) => (
                <View key={item.id} style={styles.listCard}>
                    <View style={styles.listCardHeader}>
                        <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.itemImage} />
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
                                <View style={[styles.badge, { backgroundColor: item.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                                    <Text style={[styles.badgeText, { color: item.is_active ? '#059669' : '#DC2626' }]}>
                                        {item.is_active ? 'Available' : 'Sold Out'}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                <TouchableOpacity style={styles.editBtn}>
                                    <Text style={styles.editBtnText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn}>
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

    const PermissionsModal = () => (
        <Modal visible={showPermissionsModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Manage Permissions</Text>
                        <TouchableOpacity onPress={() => setShowPermissionsModal(false)}>
                            <Text style={{ fontSize: 24 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.modalSub}>{selectedStaff?.name || selectedStaff?.full_name} ({selectedStaff?.role})</Text>
                    
                    <ScrollView style={styles.permList}>
                        {[
                            { key: 'orders.view', label: 'View Orders' },
                            { key: 'orders.manage', label: 'Manage Orders' },
                            { key: 'menu.manage', label: 'Manage Menu' },
                            { key: 'inventory.manage', label: 'Manage Inventory' },
                            { key: 'reports.view', label: 'View Reports' },
                            { key: 'staff.manage', label: 'Manage Staff' },
                            { key: 'suppliers.manage', label: 'Manage Suppliers' }
                        ].map(perm => (
                            <TouchableOpacity key={perm.key} style={styles.permItem} onPress={() => togglePermission(perm.key)}>
                                <Text style={styles.permItemText}>{perm.label}</Text>
                                <View style={[styles.toggle, staffPermissions[perm.key] && styles.toggleActive]}>
                                    <View style={[styles.toggleCircle, staffPermissions[perm.key] && styles.toggleCircleActive]} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPermissionsModal(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={savePermissions}>
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );


    // ===== INVENTORY TAB =====
    const renderInventory = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Inventory</Text>
                <Text style={styles.headerSubtitle}>Stock levels and suppliers</Text>
            </View>
            {inventoryList.map((item) => {
                const isLow = Number(item.quantity) <= 5; // Default threshold for now
                return (
                    <TouchableOpacity 
                        key={item.id} 
                        style={styles.listCard}
                        onPress={() => {
                            if (Platform.OS === 'ios') {
                                Alert.prompt(
                                    'Update Stock',
                                    `Enter new quantity for ${item.item_name} (${item.unit || 'pcs'})`,
                                    [
                                        { text: 'Cancel' },
                                        { text: 'Update', onPress: (val) => updateInventoryStock(item.id, val) }
                                    ],
                                    'plain-text',
                                    item.quantity.toString()
                                );
                            } else {
                                Alert.alert('Update Stock', 'Quantity updates via prompt are iOS only. Please use the Edit form.');
                            }
                        }}
                    >
                        <View style={styles.badgeRow}>
                            <Text style={styles.listCardName}>{item.item_name}</Text>
                            {isLow && <View style={styles.lowStockBadge}><Text style={styles.lowStockText}>Low Stock</Text></View>}
                        </View>
                        <Text style={styles.listCardSub}>Supplier: {item.supplier_name || 'N/A'}</Text>
                        <Text style={[styles.statValue, { fontSize: 18, color: isLow ? '#DC2626' : '#10B981' }]}>
                            {item.quantity} {item.unit || 'pcs'}
                        </Text>
                        <Text style={styles.updateStockHint}>Tap to update stock</Text>
                    </TouchableOpacity>
                );
            })}
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
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update stock');
        }
    };
    const generateReport = async () => {
        setReportLoading(true);
        try {
            let endpoint = '';
            switch (reportType) {
                case 'Food Wise': endpoint = '/api/reports/food'; break;
                case 'Revenue': endpoint = '/api/reports/revenue'; break;
                case 'Orders': endpoint = '/api/reports/orders'; break;
                case 'Cancellations': endpoint = '/api/reports/cancellations'; break;
                case 'Customers': endpoint = '/api/reports/customers'; break;
                case 'Staff': endpoint = '/api/reports/staff'; break;
                default: endpoint = '/api/reports/revenue';
            }

            const query = new URLSearchParams(reportFilters).toString();
            const res = await fetch(`${apiConfig.BASE_URL}${endpoint}?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setGeneratedReport(data);
            } else {
                Alert.alert('Error', data.message || 'Failed to generate report');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error while generating report');
        } finally {
            setReportLoading(false);
        }
    };

    // ===== REPORTS TAB =====
    const renderReports = () => {
        const reportCategories = ['Food Wise', 'Revenue', 'Orders', 'Cancellations', 'Customers', 'Staff'];

        return (
            <>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Full Reports Center</Text>
                    <Text style={styles.headerSubtitle}>Generate, visualize and export business data</Text>
                </View>

                {/* Filter Panel */}
                <View style={styles.listCard}>
                    <Text style={[styles.listCardName, { marginBottom: 15 }]}>Report Parameters</Text>
                    
                    <Text style={styles.filterLabel}>Select Report Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                        {reportCategories.map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.catPill, reportType === cat && styles.activeCatPill]}
                                onPress={() => setReportType(cat)}
                            >
                                <Text style={[styles.catPillText, reportType === cat && styles.activeCatPillText]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>Start Date</Text>
                            <TouchableOpacity style={styles.filterRow} onPress={() => {/* Show Date Picker */}}>
                                <Text style={styles.timeText}>{reportFilters.startDate}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>End Date</Text>
                            <TouchableOpacity style={styles.filterRow} onPress={() => {/* Show Date Picker */}}>
                                <Text style={styles.timeText}>{reportFilters.endDate}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={[styles.filterLabel, { marginTop: 10 }]}>Hour Filter ({reportFilters.hourStart}:00 - {reportFilters.hourEnd}:00)</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 15 }}>
                        <TouchableOpacity style={[styles.filterBtn, { flex: 1 }]} onPress={() => setReportFilters(f => ({ ...f, hourStart: Math.max(0, f.hourStart - 1) }))}>
                            <Text style={styles.filterBtnText}>Earlier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterBtn, { flex: 1 }]} onPress={() => setReportFilters(f => ({ ...f, hourEnd: Math.min(23, f.hourEnd + 1) }))}>
                            <Text style={styles.filterBtnText}>Later</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveBtn, { backgroundColor: '#10B981' }]} 
                        onPress={generateReport}
                        disabled={reportLoading}
                    >
                        {reportLoading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>📊 Generate Visual Report</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Report Result View */}
                {generatedReport && (
                    <View style={styles.chartCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.chartTitle}>{reportType} Report - Summary</Text>
                            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date().toLocaleDateString()}</Text>
                        </View>

                        {reportType === 'Food Wise' && generatedReport.items && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={styles.summaryLabel}>Top Selling Items</Text>
                                {generatedReport.items.slice(0, 5).map((item, idx) => (
                                    <View key={idx} style={styles.permItem}>
                                        <Text style={styles.permItemText}>{item.item_name}</Text>
                                        <Text style={styles.summaryValue}>{item.total_sold} units</Text>
                                    </View>
                                ))}
                                <View style={styles.barChartContainer}>
                                    {generatedReport.items.slice(0, 6).map((item, idx) => (
                                        <View key={idx} style={styles.barColumn}>
                                            <View style={[styles.bar, { height: (item.total_sold / generatedReport.items[0].total_sold) * 80 + 5, backgroundColor: '#10B981' }]} />
                                            <Text style={styles.barLabel}>{item.item_name.substring(0, 4)}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {reportType === 'Revenue' && generatedReport.trend && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={styles.summaryLabel}>Revenue Trend</Text>
                                <View style={styles.barChartContainer}>
                                    {generatedReport.trend.map((day, idx) => (
                                        <View key={idx} style={styles.barColumn}>
                                            <View style={[styles.bar, { height: Math.min(80, (day.revenue / 10000) * 80), backgroundColor: '#3B82F6' }]} />
                                            <Text style={styles.barLabel}>{new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {reportType === 'Cancellations' && (
                            <View style={{ marginTop: 10 }}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Delivery Cancellations</Text>
                                    <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{generatedReport.deliveryCancels?.length || 0}</Text>
                                </View>
                                <View style={[styles.summaryRow, { marginTop: 10 }]}>
                                    <Text style={styles.summaryLabel}>Takeaway Cancellations</Text>
                                    <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{generatedReport.takeawayCancels?.length || 0}</Text>
                                </View>
                            </View>
                        )}

                        <View style={[styles.modalActions, { marginTop: 25 }]}>
                            <TouchableOpacity style={[styles.exportBtn, { flex: 1 }]} onPress={() => Alert.alert('Success', 'PDF Report saving to device...')}>
                                <Text style={styles.exportBtnText}>📄 PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.exportBtn, { flex: 1, backgroundColor: '#3B82F6' }]} onPress={() => Alert.alert('Success', 'PNG Report captured!')}>
                                <Text style={styles.exportBtnText}>🖼️ PNG</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.exportBtn, { flex: 1, backgroundColor: '#6B7280' }]} onPress={() => Alert.alert('Print', 'Sending to wireless printer...')}>
                                <Text style={styles.exportBtnText}>🖨️ Print</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </>
        );
    };

    // ===== RESERVATIONS TAB =====
    const renderReservations = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Reservations</Text>
                <Text style={styles.headerSubtitle}>{reservationList.length} scheduled bookings</Text>
            </View>
            {reservationList.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📅</Text>
                    <Text style={styles.emptyText}>No reservations found</Text>
                </View>
            ) : (
                reservationList.map((res) => (
                    <View key={res.id} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <View style={[styles.avatarCircle, { backgroundColor: '#EDE9FE' }]}>
                                <Text style={styles.avatarText}>📅</Text>
                            </View>
                            <View style={styles.listCardInfo}>
                                <Text style={styles.listCardName}>{res.customer_name}</Text>
                                <Text style={styles.listCardSub}>Table #{res.table_number} • {res.guest_count} guests</Text>
                                <Text style={styles.listCardSub}>{new Date(res.reservation_time).toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </>
    );

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
            case 'users': return renderUsers();
            case 'attendance': return renderAttendance();
            case 'menu': return renderMenuManagement();
            case 'orders': return renderOrders();
            case 'suppliers': return renderSuppliers();
            case 'activity': return renderActivity();
            case 'inventory': return renderInventory();
            case 'reports': return renderReports();
            case 'notifications': return renderNotifications();
            default: return renderOverview();
        }
    };
    const renderTopBar = () => (
        <View style={styles.topBar}>
            <View style={styles.brandContainer}>
                <Text style={styles.logoEmoji}>🍴</Text>
                <View>
                    <Text style={styles.brandName}>Melissa's</Text>
                    <Text style={styles.brandTagline}>Food Court</Text>
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
                    <View style={styles.adminAvatar_small}>
                        <Text style={styles.avatarLetter_small}>{user?.name?.charAt(0).toUpperCase() || 'A'}</Text>
                    </View>
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


    const AnalyticsModal = () => (
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

    const TodayRevenueModal = () => (
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

    const TotalOrdersModal = () => (
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
                                <Text style={styles.summaryLabel}>This Week</Text>
                                <Text style={styles.summaryValue}>{stats?.details?.weeklyOrders || 0}</Text>
                            </View>
                            <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                <Text style={styles.summaryLabel}>This Month</Text>
                                <Text style={styles.summaryValue}>{stats?.details?.monthlyOrders || 0}</Text>
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

    const ActiveStaffModal = () => (
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

    const TotalCustomersModal = () => (
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
                            <Text style={[styles.statValue, { color: '#10B981', marginTop: 10 }]}>+{stats?.details?.newCustomersWeek || 0} New Signups</Text>
                        </View>
                    </ScrollView>
                    
                    <TouchableOpacity style={styles.saveBtn} onPress={() => setShowTotalCustomersModal(false)}>
                        <Text style={styles.saveBtnText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
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
            <PermissionsModal />
            <AnalyticsModal />
            <TodayRevenueModal />
            <TotalOrdersModal />
            <ActiveStaffModal />
            <TotalCustomersModal />
        </SafeAreaView>

    );

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
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
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
