import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
    FlatList, Image, SafeAreaView, Dimensions, Switch
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiConfig from '../config/api';

const { width } = Dimensions.get('window');

const CashierDashboard = () => {
    const { user, token, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home'); // home, tables, pos, reservations, bookings, stats
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Core States
    const [tables, setTables] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [diningAreas, setDiningAreas] = useState([]);
    const [isOnDuty, setIsOnDuty] = useState(false);
    const [stewards, setStewards] = useState([]);

    // POS Cart State
    const [cart, setCart] = useState([]);
    const [posType, setPosType] = useState('DINE_IN');
    const [selectedPosTable, setSelectedPosTable] = useState(null);
    const [selectedStewardId, setSelectedStewardId] = useState(null);
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [settlementData, setSettlementData] = useState({ payment_method_id: null, email: '' });

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const localNow = new Date();
            const todayStr = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
            
            const [tableRes, menuRes, catRes, attendRes, orderRes, resRes, bookRes, areaRes, payRes, stewardRes] = await Promise.all([
                fetch(`${apiConfig.API_BASE_URL}/api/steward-dashboard/tables`, { headers }),
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
            
            if (attendRes.ok) {
                const attData = await attendRes.json();
                const myAttendance = attData.attendance.find(a => {
                    const itemDate = new Date(a.date);
                    const itemDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
                    return a.staff_id === user.id && itemDateStr === todayStr && !a.check_out_time;
                });
                setIsOnDuty(!!myAttendance);
            }
        } catch (error) {
            console.error('Cashier Fetch Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, user.id]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 15000);
        return () => clearInterval(interval);
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
        if (cart.length === 0) return Alert.alert('Error', 'Cart is empty');
        if (posType === 'DINE_IN' && !selectedPosTable) return Alert.alert('Error', 'Please select a table');
        if ((posType === 'TAKE_AWAY' || posType === 'DELIVERY') && (!customerInfo.name || !customerInfo.phone)) {
            return Alert.alert('Error', 'Please enter customer name and phone');
        }

        try {
            setLoading(true);
            const body = {
                order_type: posType,
                table_id: selectedPosTable?.id,
                customer_name: customerInfo.name,
                phone: customerInfo.phone,
                address: customerInfo.address,
                items: cart,
                total_price: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                steward_id: selectedStewardId
            };

            const res = await fetch(`${apiConfig.API_BASE_URL}/api/cashier/orders`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                Alert.alert('Success', 'Order placed successfully');
                setCart([]);
                setCustomerInfo({ name: '', phone: '', address: '' });
                setSelectedPosTable(null);
                setSelectedStewardId(null);
                setShowCartModal(false);
                fetchData(true); // Refetch immediately to show occupied tables
                setActiveTab('tables'); // Switch to tables to see the status
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
                body: JSON.stringify(settlementData)
            });

            if (res.ok) {
                Alert.alert('Success', 'Order settled and bill generated');
                setShowSettlementModal(false);
                setSelectedOrder(null);
                setSettlementData({ payment_method_id: null, email: '' });
                fetchData();
            } else {
                const err = await res.json();
                Alert.alert('Error', err.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Settlement failed');
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERERS ---

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.profileBox}>
                    <Text style={styles.profileInitial}>{user?.name?.charAt(0)}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.greeting}>Hello, {user?.name}</Text>
                    <Text style={styles.roleTitle}>Cashier Dashboard</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
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

    const renderStats = () => (
        <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.statVal}>{tables.filter(t => t.status === 'available').length}</Text>
                <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.statVal}>{reservations.length}</Text>
                <Text style={styles.statLabel}>Reservations</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.statVal}>{orders.length}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
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
                    <Text style={styles.sectionTitle}>🗺️ Quick Actions</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Frequently used functionalities</Text>
                </View>
            </View>

            <View style={styles.quickGrid}>
                {[
                    { title: 'Create Order', icon: '🛒', tab: 'pos' },
                    { title: 'Table Views', icon: '🪑', tab: 'tables' },
                    { title: 'Bookings', icon: '📅', tab: 'bookings' },
                    { title: 'Reservations', icon: '🏷️', tab: 'reservations' },
                ].map(item => (
                    <TouchableOpacity key={item.tab} style={styles.quickBox} onPress={() => setActiveTab(item.tab)}>
                        <Text style={{ fontSize: 32 }}>{item.icon}</Text>
                        <Text style={styles.quickLabel}>{item.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    const renderTableItem = (table) => (
        <TouchableOpacity 
            key={table.id} 
            style={[
                styles.tableBox, 
                table.status === 'available' ? styles.tableBoxAvailable : styles.tableBoxOccupied
            ]}
            onPress={() => {
                if (!isOnDuty) return Alert.alert('Attention', 'Please check-in to manage tables');
                setSelectedPosTable(table);
                setPosType('DINE_IN');
                setActiveTab('pos');
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.tableNum}>T-{table.table_number}</Text>
                <Text style={{ fontSize: 12 }}>{table.status === 'available' ? '🟢' : '🔴'}</Text>
            </View>
            <Text style={styles.tableCap}>👥 {table.capacity} Seats</Text>
            <Text style={[styles.tableStatus, { color: table.status === 'available' ? '#10B911' : '#EF4444' }]}>
                {table.status === 'occupied' ? 'SEATED' : table.status.toUpperCase()}
            </Text>
        </TouchableOpacity>
    );

    const renderTables = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Restaurant Layout</Text>
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

    const renderPOS = () => (
        <View style={styles.content}>
            <View style={{ marginBottom: 15 }}>
                <TextInput 
                    placeholder="🔍 Search dishes, drinks..." 
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {categories.map(cat => (
                        <TouchableOpacity 
                            key={cat.id} 
                            style={[styles.catBadge, selectedCategory === cat.id && styles.activeCatBadge]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={[styles.catBadgeText, selectedCategory === cat.id && styles.activeCatBadgeText]}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {posType === 'DINE_IN' && selectedPosTable && (
                <View style={styles.selectedTableBar}>
                    <Text style={styles.selectedTableText}>📍 Ordering for Table T-{selectedPosTable.table_number}</Text>
                    <TouchableOpacity onPress={() => setSelectedPosTable(null)}>
                        <Text style={styles.clearTableText}>Change</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList 
                data={menuItems.filter(item => 
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
                    (!selectedCategory || item.category_id === selectedCategory)
                )}
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
                            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{item.category}</Text>
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                            <Text style={styles.addBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />

            {cart.length > 0 && (
                <TouchableOpacity style={styles.cartFloatingBtn} onPress={() => setShowCartModal(true)}>
                    <View style={styles.cartFloatingContent}>
                        <Text style={styles.cartFloatingText}>🛒 {cart.length} Items · Rs. {cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</Text>
                        <Text style={styles.cartFloatingAction}>View Cart →</Text>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );

    const [showCartModal, setShowCartModal] = useState(false);

    const renderCartModal = () => (
        <Modal visible={showCartModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Complete Order</Text>
                        <TouchableOpacity onPress={() => setShowCartModal(false)}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
                    </View>

                    <ScrollView>
                        <View style={styles.typeSelectorRow}>
                            {['DINE_IN', 'TAKEAWAY', 'DELIVERY'].map(t => (
                                <TouchableOpacity 
                                    key={t} 
                                    style={[styles.typeBtnSmall, posType === t && styles.activeTypeBtnSmall]}
                                    onPress={() => setPosType(t)}
                                >
                                    <Text style={[styles.typeBtnTextSmall, posType === t && styles.activeTypeBtnTextSmall]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {posType === 'DINE_IN' ? (
                            <>
                                <View style={styles.inputSection}>
                                    <Text style={styles.inputLabel}>Select Table</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                        {tables.filter(t => t.status === 'available').map(t => (
                                            <TouchableOpacity 
                                                key={t.id} 
                                                style={[styles.tableChip, selectedPosTable?.id === t.id && styles.activeTableChip]}
                                                onPress={() => setSelectedPosTable(t)}
                                            >
                                                <Text style={[styles.tableChipText, selectedPosTable?.id === t.id && styles.activeTableChipText]}>T-{t.table_number}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={styles.inputSection}>
                                    <Text style={styles.inputLabel}>Select Steward (Who Served)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                        {stewards.map(s => (
                                            <TouchableOpacity 
                                                key={s.id} 
                                                style={[styles.tableChip, selectedStewardId === s.id && styles.activeTableChip, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                                                onPress={() => setSelectedStewardId(s.id)}
                                            >
                                                <Text style={[styles.tableChipText, selectedStewardId === s.id && { color: '#1E40AF', fontWeight: 'bold' }]}>{s.name || s.full_name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </>
                        ) : (
                            <View style={styles.inputSection}>
                                <TextInput 
                                    placeholder="Customer Name" 
                                    style={styles.modalInput}
                                    value={customerInfo.name}
                                    onChangeText={v => setCustomerInfo({ ...customerInfo, name: v })}
                                />
                                <TextInput 
                                    placeholder="Mobile Number" 
                                    style={styles.modalInput}
                                    keyboardType="phone-pad"
                                    value={customerInfo.phone}
                                    onChangeText={v => setCustomerInfo({ ...customerInfo, phone: v })}
                                />
                                {posType === 'DELIVERY' && (
                                    <TextInput 
                                        placeholder="Delivery Address" 
                                        style={[styles.modalInput, { height: 80 }]}
                                        multiline
                                        value={customerInfo.address}
                                        onChangeText={v => setCustomerInfo({ ...customerInfo, address: v })}
                                    />
                                )}
                            </View>
                        )}

                        <Text style={[styles.modalTitle, { fontSize: 16, marginTop: 20 }]}>Order Summary</Text>
                        {cart.map(item => (
                            <View key={item.id} style={styles.cartItemRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cartItemName}>{item.name}</Text>
                                    <Text style={styles.cartItemPrice}>Rs. {item.price} each</Text>
                                </View>
                                <View style={styles.qtyContainer}>
                                    <TouchableOpacity onPress={() => updateCartQty(item.id, -1)} style={styles.qtyBtn}><Text style={{ fontWeight: 'bold' }}>-</Text></TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.quantity}</Text>
                                    <TouchableOpacity onPress={() => updateCartQty(item.id, 1)} style={styles.qtyBtn}><Text style={{ fontWeight: 'bold' }}>+</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
                                        <Text style={styles.removeBtnText}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.checkoutFooter}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalAmount}>Rs. {cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</Text>
                        </View>
                        <TouchableOpacity style={styles.confirmOrderBtn} onPress={handlePlaceOrder}>
                            <Text style={styles.confirmOrderBtnText}>SUBMIT ORDER</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderReservations = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Confirmed Reservations</Text>
            {reservations.map(res => (
                <View key={res.id} style={styles.resvCard}>
                    <View style={styles.resvTimeBox}>
                        <Text style={styles.resvTime}>{res.reservation_time}</Text>
                        <Text style={styles.resvDate}>{new Date(res.reservation_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.resvInfo}>
                        <Text style={styles.resvCust}>{res.customer_name}</Text>
                        <Text style={styles.resvTable}>Table {res.table_number || 'N/A'} • {res.guest_count} Guests</Text>
                    </View>
                    <View style={styles.resvBadgeSmall}>
                        <Text style={styles.resvBadgeTextSmall}>{res.reservation_status}</Text>
                    </View>
                </View>
            ))}
        </ScrollView>
    );

    const renderBookings = () => (
        <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Event Bookings</Text>
            {bookings.map(b => (
                <View key={b.id} style={styles.resvCard}>
                    <View style={styles.resvTimeBox}>
                        <Text style={styles.resvTime}>{b.time}</Text>
                        <Text style={styles.resvDate}>{new Date(b.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.resvInfo}>
                        <Text style={styles.resvCust}>{b.customer_name}</Text>
                        <Text style={styles.resvTable}>{b.guests} Guests</Text>
                    </View>
                    <View style={[styles.resvBadgeSmall, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={styles.resvBadgeTextSmall}>{b.status}</Text>
                    </View>
                </View>
            ))}
        </ScrollView>
    );

    const renderStatsTab = () => (
        <ScrollView style={styles.content}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Order Management</Text>
            </View>
            {orders.map(order => (
                <TouchableOpacity 
                    key={order.id} 
                    style={[styles.historyCard, order.status_name === 'COMPLETED' ? styles.orderCompleted : styles.orderPending]}
                    onPress={() => {
                        setSelectedOrder(order);
                        setSettlementData({ ...settlementData, email: order.phone ? '' : '' });
                        setShowSettlementModal(true);
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                            <Text style={styles.historyId}>#{order.id} - {order.type_name}</Text>
                            <Text style={styles.historyDate}>{new Date(order.created_at).toLocaleString()}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: order.status_name === 'COMPLETED' ? '#D1FAE5' : '#FEF3C7' }]}>
                            <Text style={[styles.statusText, { color: order.status_name === 'COMPLETED' ? '#065F46' : '#92400E' }]}>
                                {order.status_name}
                            </Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'flex-end' }}>
                        <View>
                            <Text style={styles.historyTable}>{order.table_number ? `Table ${order.table_number}` : (order.customer_name || 'Walk-in')}</Text>
                        </View>
                        <Text style={styles.historyTotal}>Rs. {order.total_price}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderSettlementModal = () => (
        <Modal visible={showSettlementModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Order Settlement #{selectedOrder?.id}</Text>
                        <TouchableOpacity onPress={() => setShowSettlementModal(false)}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
                    </View>

                    {selectedOrder && (
                        <ScrollView>
                            <View style={styles.billSummary}>
                                <Text style={styles.billTotalLabel}>Amount to Pay</Text>
                                <Text style={styles.billTotalVal}>Rs. {selectedOrder.total_price}</Text>
                            </View>

                            <Text style={styles.inputLabel}>Select Payment Method</Text>
                            <View style={styles.payMethodsRow}>
                                {paymentMethods.map(m => (
                                    <TouchableOpacity 
                                        key={m.id} 
                                        style={[styles.payMethodBtn, settlementData.payment_method_id === m.id && styles.activePayMethod]}
                                        onPress={() => setSettlementData({ ...settlementData, payment_method_id: m.id })}
                                    >
                                        <Text style={[styles.payMethodText, settlementData.payment_method_id === m.id && styles.activePayMethodText]}>{m.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Send Digital Receipt (Email)</Text>
                                <TextInput 
                                    placeholder="customer@email.com (optional)" 
                                    style={styles.modalInput}
                                    value={settlementData.email}
                                    onChangeText={v => setSettlementData({ ...settlementData, email: v })}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.printBtn} onPress={() => Alert.alert('Print', 'Printing thermal receipt...')}>
                                    <Text style={styles.printBtnText}>🖨️ Print Receipt</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}

                    <View style={styles.checkoutFooter}>
                        <TouchableOpacity 
                            style={[styles.confirmOrderBtn, selectedOrder?.status_name === 'COMPLETED' && { backgroundColor: '#9CA3AF' }]} 
                            onPress={handleSettleOrder}
                            disabled={selectedOrder?.status_name === 'COMPLETED'}
                        >
                            <Text style={styles.confirmOrderBtnText}>
                                {selectedOrder?.status_name === 'COMPLETED' ? 'ORDER ALREADY SETTLED' : 'COMPLETE SETTLEMENT'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            
            <View style={styles.mainContainer}>
                {activeTab === 'home' && renderHome()}
                {activeTab === 'tables' && renderTables()}
                {activeTab === 'pos' && renderPOS()}
                {activeTab === 'reservations' && renderReservations()}
                {activeTab === 'bookings' && renderBookings()}
                {activeTab === 'stats' && renderStatsTab()}
            </View>
            {renderCartModal()}
            {renderSettlementModal()}

            {/* Duty Lock Overlay */}
            {!isOnDuty && activeTab === 'home' && (
                <View style={styles.lockOverlay}>
                    <View style={styles.lockContent}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.lockTitle}>Off Duty</Text>
                        <Text style={styles.lockSub}>Check-in at the top to manage orders and tables</Text>
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
                <TouchableOpacity onPress={() => setActiveTab('pos')} style={[styles.navItem, activeTab === 'pos' && styles.activeNav]}>
                    <Text style={activeTab === 'pos' ? styles.activeNavText : styles.navText}>🛒</Text>
                    <Text style={activeTab === 'pos' ? styles.activeNavLabel : styles.navLabel}>POS</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('tables')} style={[styles.navItem, activeTab === 'tables' && styles.activeNav]}>
                    <Text style={activeTab === 'tables' ? styles.activeNavText : styles.navText}>🪑</Text>
                    <Text style={activeTab === 'tables' ? styles.activeNavLabel : styles.navLabel}>Tables</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('reservations')} style={[styles.navItem, activeTab === 'reservations' && styles.activeNav]}>
                    <Text style={activeTab === 'reservations' ? styles.activeNavText : styles.navText}>📅</Text>
                    <Text style={activeTab === 'reservations' ? styles.activeNavLabel : styles.navLabel}>Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('stats')} style={[styles.navItem, activeTab === 'stats' && styles.activeNav]}>
                    <Text style={activeTab === 'stats' ? styles.activeNavText : styles.navText}>📜</Text>
                    <Text style={activeTab === 'stats' ? styles.activeNavLabel : styles.navLabel}>Stats</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { padding: 15, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    profileBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    profileInitial: { fontSize: 18, fontWeight: 'bold', color: '#1D4ED8' },
    greeting: { fontSize: 12, color: '#6B7280' },
    roleTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    headerActions: { flexDirection: 'row', gap: 15 },
    logoutBtn: { padding: 5 },
    mainContainer: { flex: 1 },
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
    menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    menuImg: { width: 60, height: 60, borderRadius: 10, marginRight: 15 },
    menuInfo: { flex: 1 },
    menuName: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
    menuPrice: { color: '#3B82F6', fontWeight: 'bold', marginTop: 4 },
    addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
    addBtnText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    cartFloatingBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#111827', borderRadius: 16, padding: 15, elevation: 5 },
    cartFloatingContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cartFloatingText: { color: 'white', fontWeight: 'bold' },
    cartFloatingAction: { color: '#3B82F6', fontSize: 12, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
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
    modalInput: { backgroundColor: '#F9FAFB', borderWeight: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 10 },
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
    printBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, borderWeight: 1, borderColor: '#3B82F6', borderWidth: 1 },
    printBtnText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 14 }
});

export default CashierDashboard;
