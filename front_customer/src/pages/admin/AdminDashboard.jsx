
import { useState, useEffect } from 'react';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';

// Helper: Permissions List
const ALL_STAFF_PERMS = [
    'orders.view', 'orders.update', 'orders.status', 'payments.view',
    'notifications.receive', 'menu.manage', 'tables.manage'
];

const ALL_CUSTOMER_PERMS = [
    'menu.view', 'orders.place', 'payments.make',
    'orders.view_status', 'stewards.rate', 'account.manage'
];

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [menus, setMenus] = useState([]);
    const [categories, setCategories] = useState([]);
    const [areaList, setAreaList] = useState([]);
    const [allTables, setAllTables] = useState([]);

    const [view, setView] = useState('overview'); // overview, staff, customers, orders, reservations, audit-logs
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [permModalOpen, setPermModalOpen] = useState(false);
    const [userPerms, setUserPerms] = useState([]);

    // Menu/Category Modal State
    const [menuModalOpen, setMenuModalOpen] = useState(false);
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [newMenu, setNewMenu] = useState({ name: '', description: '', price: '', category_id: '', image: '' });
    const [newCategory, setNewCategory] = useState({ name: '', description: '', image: '' });

    // Role Modal State
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');

    const STAFF_ROLES = [
        'admin', 'manager', 'cashier', 'steward', 'kitchen_staff', 
        'bar_staff', 'delivery_rider', 'inventory_manager', 'supplier'
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.error('No admin token found');
            setLoading(false);
            return;
        }
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const results = await Promise.allSettled([
                fetch('http://localhost:5000/api/admin/stats', { headers }),
                fetch('http://localhost:5000/api/admin/staff', { headers }),
                fetch('http://localhost:5000/api/admin/customers', { headers }),
                fetch('http://localhost:5000/api/admin/orders', { headers }),
                fetch('http://localhost:5000/api/admin/reservations', { headers }),
                fetch('http://localhost:5000/api/admin/audit-logs', { headers }),
                fetch('http://localhost:5000/api/menu', { headers }),
                fetch('http://localhost:5000/api/menu/categories/all', { headers }),
                fetch('http://localhost:5000/api/admin/areas', { headers }),
                fetch('http://localhost:5000/api/admin/tables', { headers })
            ]);

            const [statsRes, staffRes, custRes, ordRes, resRes, auditRes, menuRes, catRes, areasRes, tablesRes] = results.map(r => r.status === 'fulfilled' ? r.value : null);

            if (statsRes && statsRes.ok) {
                const s = await statsRes.json();
                setStats(s.stats);
            }

            if (staffRes && staffRes.ok) {
                const st = await staffRes.json();
                setStaffList(st.staff || []);
            }

            if (custRes && custRes.ok) {
                const c = await custRes.json();
                setCustomers(c.customers || []);
            }

            if (ordRes && ordRes.ok) {
                const o = await ordRes.json();
                setOrders(o.orders || []);
            }

            if (resRes && resRes.ok) {
                const r = await resRes.json();
                setReservations(r.reservations || []);
            }

            if (auditRes && auditRes.ok) {
                const a = await auditRes.json();
                setAuditLogs(a.logs || []);
            }

            if (menuRes && menuRes.ok) {
                const m = await menuRes.json();
                setMenus(m || []); // menu.controller returns array directly
            }

            if (catRes && catRes.ok) {
                const c = await catRes.json();
                setCategories(c || []); // returns array directly
            }

            if (areasRes && areasRes.ok) {
                const a = await areasRes.json();
                setAreaList(a.areas || []);
            }

            if (tablesRes && tablesRes.ok) {
                const t = await tablesRes.json();
                setAllTables(t.tables || []);
            }
        } catch (err) {
            console.error('Failed to load admin data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id, currentIsActive, type = 'staff') => {
        const token = localStorage.getItem('adminToken');
        const newStatus = currentIsActive ? 'inactive' : 'active';
        const endpoint = type === 'staff' 
            ? `http://localhost:5000/api/admin/staff/${id}/status`
            : `http://localhost:5000/api/admin/customers/${id}/status`;

        try {
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
                return;
            }

            // Successfully updated
            fetchData();
        } catch (err) {
            console.error('Toggle status error:', err);
            alert('Failed to connect to server');
        }
    };

    const handleUpdateRole = async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`http://192.168.1.3:5000/api/admin/staff/${selectedUser.id}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role_name: selectedRole })
            });
            if (res.ok) {
                alert('Role Updated!');
                setRoleModalOpen(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to update role');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openRoleModal = (user) => {
        setSelectedUser(user);
        setSelectedRole(user.role);
        setRoleModalOpen(true);
    };

    const openPermModal = (user, type) => {
        setSelectedUser({ ...user, type });
        setUserPerms(user.permissions || []);
        setPermModalOpen(true);
    };

    const togglePerm = (perm) => {
        if (userPerms.includes(perm)) {
            setUserPerms(userPerms.filter(p => p !== perm));
        } else {
            setUserPerms([...userPerms, perm]);
        }
    };

    const savePermissions = async () => {
        const token = localStorage.getItem('adminToken');
        const endpoint = selectedUser.type === 'STAFF'
            ? `http://192.168.1.3:5000/api/admin/staff/${selectedUser.id}/permissions`
            : `http://192.168.1.3:5000/api/admin/customers/${selectedUser.id}/permissions`; // Check route

        try {
            await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ permissions: userPerms })
            });
            setPermModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch('http://192.168.1.3:5000/api/menu/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newCategory)
            });
            if (res.ok) {
                alert('Category Added!');
                setCatModalOpen(false);
                setNewCategory({ name: '', description: '', image: '' });
                fetchData();
            } else {
                alert('Failed to add category');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddMenu = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch('http://192.168.1.3:5000/api/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newMenu)
            });
            if (res.ok) {
                alert('Menu Item Added!');
                setMenuModalOpen(false);
                setNewMenu({ name: '', description: '', price: '', category_id: '', image: '' });
                fetchData();
            } else {
                alert('Failed to add menu item');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateTableStatus = async (tableId, newStatus) => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`http://localhost:5000/api/admin/tables/${tableId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="text-white p-8">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans">
            {/* Sidebar / Nav */}
            <div className="flex h-screen">
                <div className="w-64 bg-[#101010] border-r border-gold-500/20 p-6 flex flex-col">
                    <h1 className="text-2xl font-bold text-gold-500 mb-8 tracking-wider">OVERSEER</h1>
                    <nav className="space-y-2 flex-1">
                        {['overview', 'Menus', 'staff', 'customers', 'orders', 'reservations', 'Tables', 'audit-logs'].map(item => (
                            <button
                                key={item}
                                onClick={() => setView(item)}
                                className={`w-full text-left px-4 py-3 rounded transition-all capitalize ${view === item ? 'bg-gold-500 text-black font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                {item.replace('-', ' ')}
                            </button>
                        ))}
                    </nav>
                    <div className="text-xs text-gray-600 border-t border-gray-800 pt-4">
                        System Admin v1.0
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-[url('/noise.png')]">
                    <h2 className="text-3xl font-bold mb-6 capitalize text-white">{view}</h2>

                    {view === 'overview' && stats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
                            <GlassCard className="text-center bg-gradient-to-br from-gold-500/10 to-transparent">
                                <p className="text-gray-400 text-sm">Revenue</p>
                                <p className="text-3xl text-gold-500 font-bold">Rs. {stats.revenue || 0}</p>
                            </GlassCard>
                            <GlassCard className="text-center">
                                <p className="text-gray-400 text-sm">Total Orders</p>
                                <p className="text-3xl text-white font-bold">{stats.orders}</p>
                            </GlassCard>
                            <GlassCard className="text-center">
                                <p className="text-gray-400 text-sm">Pending Orders</p>
                                <p className="text-3xl text-yellow-500 font-bold">{stats.pendingOrders}</p>
                            </GlassCard>
                            <GlassCard className="text-center">
                                <p className="text-gray-400 text-sm">Completed Orders</p>
                                <p className="text-3xl text-green-500 font-bold">{stats.completedOrders}</p>
                            </GlassCard>
                            <GlassCard className="text-center">
                                <p className="text-gray-400 text-sm">Staff</p>
                                <p className="text-3xl text-white font-bold">{stats.staff}</p>
                            </GlassCard>
                            <GlassCard className="text-center">
                                <p className="text-gray-400 text-sm">Customers</p>
                                <p className="text-3xl text-white font-bold">{stats.customers}</p>
                            </GlassCard>
                        </div>
                    )}

                    {view === 'staff' && (
                        <div className="space-y-4">
                            {staffList.length === 0 ? (
                                <GlassCard className="text-center p-12">
                                    <div className="text-6xl mb-4">👥</div>
                                    <h3 className="text-xl font-bold mb-2 text-white">No Staff Members Found</h3>
                                    <p className="text-gray-400">
                                        Staff members will appear here once they register.
                                        You can activate or deactivate their accounts from this panel.
                                    </p>
                                </GlassCard>
                            ) : (
                                staffList.map(staff => (
                                    <GlassCard key={staff.id} className="flex items-center justify-between border-l-4 border-gold-500">
                                        <div>
                                            <p className="font-bold text-lg">{staff.name}</p>
                                            <p className="text-sm text-gold-500 font-mono uppercase text-[10px] tracking-widest">{staff.role || 'STAFF'}</p>
                                            <p className="text-sm text-gray-400">{staff.email}</p>
                                            {staff.permissions && staff.permissions.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    {staff.permissions.map(p => (
                                                        <span key={p} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">{p}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${staff.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                                {staff.status || 'INACTIVE'}
                                            </div>
                                            <Button
                                                onClick={() => handleToggleStatus(staff.id, staff.status)}
                                                className="text-xs"
                                                variant={staff.status === 'active' ? 'secondary' : 'primary'}
                                            >
                                                {staff.status === 'active' ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button onClick={() => openPermModal(staff, 'STAFF')} className="text-xs">
                                                 Permissions
                                             </Button>
                                             <Button onClick={() => openRoleModal(staff)} className="text-xs" variant="secondary">
                                                 Role
                                             </Button>
                                         </div>
                                     </GlassCard>
                                 ))
                            )}
                        </div>
                    )}

                    {view === 'customers' && (
                        <div className="space-y-4">
                            {customers.map(cust => (
                                <GlassCard key={cust.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold">{cust.name}</p>
                                        <p className="text-sm text-gray-400">{cust.email}</p>
                                        <p className="text-xs text-gold-500">Points: {cust.loyalty_points || 0}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${cust.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                            {cust.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </div>
                                        <Button
                                            onClick={() => handleToggleStatus(cust.id, cust.is_active, 'customer')}
                                            className="text-xs"
                                            variant={cust.is_active ? 'secondary' : 'primary'}
                                        >
                                            {cust.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button onClick={() => openPermModal(cust, 'CUSTOMER')} className="text-xs">
                                            Manage Access
                                        </Button>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}

                    {view === 'reservations' && (
                        <div className="space-y-4">
                            {reservations.length === 0 ? <p className="text-gray-500 text-center py-8">No reservations found.</p> : (
                                reservations.map(res => (
                                    <GlassCard key={res.id} className="border-l-4 border-blue-500">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-lg">{res.customer_name}</p>
                                                <p className="text-sm text-gray-400">{res.customer_email} | {res.customer_phone}</p>
                                                <div className="mt-3 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase">Date & Time</p>
                                                        <p className="text-sm text-white">{new Date(res.reservation_time).toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase">Table & Guests</p>
                                                        <p className="text-sm text-white">Table #{res.table_number} | {res.guest_count} Guests</p>
                                                    </div>
                                                </div>
                                                {res.comments && (
                                                    <div className="mt-3 bg-white/5 p-2 rounded">
                                                        <p className="text-[10px] text-gray-500 uppercase">Special Request</p>
                                                        <p className="text-sm text-gray-300 italic">"{res.comments}"</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                    res.status === 'CONFIRMED' ? 'bg-green-900 text-green-300' : 
                                                    res.status === 'PENDING' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
                                                }`}>
                                                    {res.status}
                                                </span>
                                            </div>
                                        </div>
                                    </GlassCard>
                                ))
                            )}
                        </div>
                    )}

                    {view === 'audit-logs' && (
                        <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#101010] text-[#D4AF37] uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="p-4">Time</th>
                                        <th className="p-4">Action</th>
                                        <th className="p-4">Performer</th>
                                        <th className="p-4">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {auditLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                                            <td className="p-4 font-bold">{log.action_type.replace(/_/g, ' ')}</td>
                                            <td className="p-4">{log.performed_by_name || 'System'}</td>
                                            <td className="p-4 text-xs text-gray-500">{log.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {view === 'Tables' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-lg border border-gold-500/20">
                                <h3 className="text-xl font-bold text-white">Table & Area Management</h3>
                                <div className="space-x-4">
                                    <Button variant="secondary" onClick={() => alert('Add Area Feature coming soon')}>+ Add Area</Button>
                                    <Button variant="primary" onClick={() => alert('Add Table Feature coming soon')}>+ Add Table</Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {areaList.map(area => (
                                    <GlassCard key={area.id} className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                            <h4 className="text-lg font-bold text-gold-500">{area.area_name}</h4>
                                            <span className="text-xs text-gray-500">{allTables.filter(t => t.area_id === area.id).length} Tables</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {allTables.filter(t => t.area_id === area.id).map(table => (
                                                <div key={table.id} className={`p-3 rounded border ${table.status === 'occupied' ? 'border-yellow-500/50 bg-yellow-500/5' : table.status === 'reserved' ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-bold">#{table.table_number}</span>
                                                        <span className={`w-2 h-2 rounded-full ${table.status === 'available' ? 'bg-green-500' : table.status === 'occupied' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mb-2">{table.capacity} Seats</p>
                                                    <select 
                                                        value={table.status}
                                                        onChange={(e) => handleUpdateTableStatus(table.id, e.target.value)}
                                                        className="w-full bg-black text-[10px] border border-gray-800 rounded p-1 outline-none text-gray-300"
                                                    >
                                                        <option value="available">Available</option>
                                                        <option value="occupied">Occupied</option>
                                                        <option value="reserved">Reserved</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'Menus' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-lg border border-gold-500/20">
                                <h3 className="text-xl font-bold text-white">Menu Management</h3>
                                <div className="space-x-4">
                                    <Button onClick={() => setCatModalOpen(true)} variant="secondary">
                                        + Add Category
                                    </Button>
                                    <Button onClick={() => setMenuModalOpen(true)} variant="primary">
                                        + Add Menu Item
                                    </Button>
                                </div>
                            </div>

                            {/* Categories Section */}
                            <div>
                                <h4 className="text-lg font-bold text-gold-500 mb-4">Categories</h4>
                                {categories.length === 0 ? <p className="text-gray-500">No categories found.</p> : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {categories.map(cat => (
                                            <GlassCard key={cat.id} className="text-center relative group min-h-[150px] flex flex-col justify-center items-center">
                                                <div className="text-4xl mb-2">🍽️</div>
                                                <h5 className="font-bold text-white">{cat.name}</h5>
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cat.description}</p>
                                            </GlassCard>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Menu Items Section */}
                            <div>
                                <h4 className="text-lg font-bold text-gold-500 mb-4">Menu Items ({menus.length})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {menus.map(item => (
                                        <div key={item.id} className="flex justify-between items-center bg-zinc-800/50 p-3 rounded border-l-2 border-gold-500 hover:bg-zinc-800 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {/* Placeholder for image if needed */}
                                                <div>
                                                    <p className="font-bold text-white text-md">{item.name}</p>
                                                    <p className="text-xs text-gold-500 uppercase tracking-wider">{item.category}</p>
                                                    <p className="text-xs text-gray-400 mt-1">Rs. {Number(item.price).toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <div className={`text-xs px-2 py-1 rounded font-bold uppercase ${item.is_active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Role Modal */}
            {roleModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#151515] border border-gold-500/30 rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-4 text-white">Update Job Role for {selectedUser?.name}</h3>
                        <div className="space-y-3 mb-6">
                            {STAFF_ROLES.map(role => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    className={`w-full text-left px-4 py-2 rounded border uppercase text-sm font-bold tracking-widest ${selectedRole === role ? 'bg-gold-500 text-black border-gold-500' : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    {role.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setRoleModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdateRole}>Save Role</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permission Modal */}
            {permModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#151515] border border-gold-500/30 rounded-lg p-6 max-w-lg w-full">
                        <h3 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">
                            Manage Permissions for {selectedUser?.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {(selectedUser.type === 'STAFF' ? ALL_STAFF_PERMS : ALL_CUSTOMER_PERMS).map(perm => (
                                <label key={perm} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded">
                                    <input
                                        type="checkbox"
                                        checked={userPerms.includes(perm)}
                                        onChange={() => togglePerm(perm)}
                                        className="accent-gold-500 w-5 h-5"
                                    />
                                    <span className="text-sm text-gray-300">{perm.replace('.', ' ').toUpperCase()}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setPermModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={savePermissions}>Save Changes</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Category Modal */}
            {
                catModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#151515] border border-gold-500/30 rounded-lg p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold mb-4 text-gold-500">Add New Category</h3>
                            <form onSubmit={handleAddCategory} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Name</label>
                                    <input
                                        required
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-gold-500 outline-none"
                                        value={newCategory.name}
                                        onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                                    <textarea
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-gold-500 outline-none"
                                        value={newCategory.description}
                                        onChange={e => setNewCategory({ ...newCategory, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Image URL (Optional)</label>
                                    <input
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-gold-500 outline-none"
                                        value={newCategory.image}
                                        onChange={e => setNewCategory({ ...newCategory, image: e.target.value })}
                                        placeholder="e.g. pizza.png"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button type="button" variant="secondary" onClick={() => setCatModalOpen(false)}>Cancel</Button>
                                    <Button type="submit" variant="primary">Create Category</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Add Menu Item Modal */}
            {
                menuModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#151515] border border-gold-500/30 rounded-lg p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold mb-4 text-gold-500">Add New Menu Item</h3>
                            <form onSubmit={handleAddMenu} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Name</label>
                                    <input
                                        required
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-gold-500 outline-none"
                                        value={newMenu.name}
                                        onChange={e => setNewMenu({ ...newMenu, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Category</label>
                                    <select
                                        required
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-gold-500 outline-none"
                                        value={newMenu.category_id}
                                        onChange={e => setNewMenu({ ...newMenu, category_id: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Price</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-gold-500 outline-none"
                                        value={newMenu.price}
                                        onChange={e => setNewMenu({ ...newMenu, price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                                    <textarea
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-gold-500 outline-none"
                                        value={newMenu.description}
                                        onChange={e => setNewMenu({ ...newMenu, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Image URL (Optional)</label>
                                    <input
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-gold-500 outline-none"
                                        value={newMenu.image}
                                        onChange={e => setNewMenu({ ...newMenu, image: e.target.value })}
                                        placeholder="e.g. burger.png"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button type="button" variant="secondary" onClick={() => setMenuModalOpen(false)}>Cancel</Button>
                                    <Button type="submit" variant="primary">Create Item</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminDashboard;
