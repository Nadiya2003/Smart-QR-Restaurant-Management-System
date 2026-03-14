import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';
import config from '../../config';

// Helper: Permissions List
const ALL_STAFF_PERMS = [
    'View Orders', 'Manage Orders', 'View Inventory', 'Update Inventory', 'View Reports', 'Manage Menu'
];

const AdminDashboard = () => {
    const navigate = useNavigate();
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
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
    const [suppliers, setSuppliers] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [reports, setReports] = useState([]);
    const [revenueData, setRevenueData] = useState(null);

    const [view, setView] = useState('overview'); 
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

    // Supplier/Inventory Modal
    const [supModalOpen, setSupModalOpen] = useState(false);
    const [invModalOpen, setInvModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: '', contact_number: '', email: '', address: '', products_supplied: '' });
    const [newInv, setNewInv] = useState({ item_name: '', quantity: '', unit: 'kg', supplier_id: '' });

    // Stats Modals
    const [revModalOpen, setRevModalOpen] = useState(false);
    const [ordModalOpen, setOrdModalOpen] = useState(false);
    const [activeStaffModalOpen, setActiveStaffModalOpen] = useState(false);
    const [custModalOpen, setCustModalOpen] = useState(false);

    const openPermModal = (user) => {
        setSelectedUser(user);
        try {
            const perms = typeof user.permissions === 'string' 
                ? JSON.parse(user.permissions || '[]') 
                : (user.permissions || []);
            setUserPerms(perms);
        } catch (e) {
            setUserPerms([]);
        }
        setPermModalOpen(true);
    };

    const openRoleModal = (user) => {
        setSelectedUser(user);
        setSelectedRole(user.role);
        setRoleModalOpen(true);
    };

    // Report generation states
    const [reportFilters, setReportFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '00:00',
        endTime: '23:59',
        type: 'revenue'
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReport, setGeneratedReport] = useState(null);

    // Role Modal State
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');

    const STAFF_ROLES = [
        'steward', 'manager', 'cashier', 'kitchen_staff', 
        'bar_staff', 'delivery_rider', 'inventory_manager', 'supplier'
    ];

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        const token = localStorage.getItem('adminToken');
        try {
            const queryParams = new URLSearchParams(reportFilters).toString();
            const response = await fetch(`${config.API_BASE_URL}/api/reports/generate?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setGeneratedReport(data);
                fetchData(); // Refresh historical reports list
            } else {
                alert('Failed to generate report');
            }
        } catch (err) {
            console.error('Report error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
            return;
        }
        fetchData();
        const interval = setInterval(fetchStatsAndOrders, 10000);
        return () => clearInterval(interval);
    }, [navigate]);

    const fetchStatsAndOrders = async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            const [sRes, oRes] = await Promise.all([
                fetch(`${config.API_BASE_URL}/api/admin/stats`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/orders`, { headers })
            ]);
            if (sRes.ok) {
                const s = await sRes.json();
                setStats(s.stats);
            }
            if (oRes.ok) {
                const o = await oRes.json();
                setOrders(o.orders || []);
            }
        } catch (e) {}
    };

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
                fetch(`${config.API_BASE_URL}/api/admin/stats`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/staff`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/customers`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/orders`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/reservations`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/audit-logs`, { headers }),
                fetch(`${config.API_BASE_URL}/api/menu`, { headers }),
                fetch(`${config.API_BASE_URL}/api/menu/categories/all`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/areas`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/tables`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/suppliers`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/inventory`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/reports`, { headers }),
                fetch(`${config.API_BASE_URL}/api/admin/revenue-analytics`, { headers })
            ]);

            const [statsRes, staffRes, custRes, ordRes, resRes, auditRes, menuRes, catRes, areasRes, tablesRes, supRes, invRes, repRes, revRes] = results.map(r => r.status === 'fulfilled' ? r.value : null);

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
                setMenus(m || []);
            }

            if (catRes && catRes.ok) {
                const c = await catRes.json();
                setCategories(c || []);
            }

            if (areasRes && areasRes.ok) {
                const a = await areasRes.json();
                setAreaList(a.areas || []);
            }

            if (tablesRes && tablesRes.ok) {
                const t = await tablesRes.json();
                setAllTables(t.tables || []);
            }

            if (supRes && supRes.ok) {
                const s = await supRes.json();
                setSuppliers(s.suppliers || []);
            }

            if (invRes && invRes.ok) {
                const i = await invRes.json();
                setInventory(i.inventory || []);
            }

            if (repRes && repRes.ok) {
                const r = await repRes.json();
                setReports(r.reports || []);
            }

            if (revRes && revRes.ok) {
                const r = await revRes.json();
                setRevenueData(r);
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
            ? `${config.API_BASE_URL}/api/admin/staff/${id}/status`
            : `${config.API_BASE_URL}/api/admin/customers/${id}/status`;

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

            fetchData();
        } catch (err) {
            console.error('Toggle status error:', err);
            alert('Failed to connect to server');
        }
    };

    const handleUpdateRole = async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`${config.API_BASE_URL}/api/admin/staff/${selectedUser.id}/role`, {
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

    const savePermissions = async () => {
        const token = localStorage.getItem('adminToken');
        const endpoint = `${config.API_BASE_URL}/api/admin/staff/${selectedUser.id}/permissions`;

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

    const handleAddSupplier = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        try {
            await fetch(`${config.API_BASE_URL}/api/admin/suppliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newSupplier)
            });
            setSupModalOpen(false);
            setNewSupplier({ name: '', contact_number: '', email: '', address: '', products_supplied: '' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        try {
            await fetch(`${config.API_BASE_URL}/api/menu/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newCategory)
            });
            setCatModalOpen(false);
            setNewCategory({ name: '', description: '', image: '' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleAddMenu = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        try {
            await fetch(`${config.API_BASE_URL}/api/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newMenu)
            });
            setMenuModalOpen(false);
            setNewMenu({ name: '', description: '', price: '', category_id: '', image: '' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleAddInventory = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        try {
            await fetch(`${config.API_BASE_URL}/api/admin/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newInv)
            });
            setInvModalOpen(false);
            setNewInv({ item_name: '', quantity: '', unit: 'kg', supplier_id: '' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleUpdateTableStatus = async (id, status) => {
        const token = localStorage.getItem('adminToken');
        try {
            await fetch(`${config.API_BASE_URL}/api/admin/tables/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const generateReports = async () => {
        const token = localStorage.getItem('adminToken');
        try {
            await fetch(`${config.API_BASE_URL}/api/admin/reports/seed`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
            alert('Sample reports generated!');
        } catch (err) { console.error(err); }
    };

    const exportReport = (report) => {
        // Simple mock of PNG export
        // In a real app we'd use a server-side route or canvas to draw this
        const reportContent = `
            MELISSA'S FOOD COURT
            Address: 123 Food Street, Colombo, Sri Lanka
            ---------------------------
            REPORT: ${report.title}
            Type: ${report.report_type}
            Date: ${new Date(report.generated_at).toLocaleString()}
            
            SUMMARY:
            Total Orders: ${JSON.parse(report.summary_data).totalOrders}
            Total Revenue: Rs. ${JSON.parse(report.summary_data).totalRevenue}
             Most Ordered: ${JSON.parse(report.summary_data).mostOrderedItems.join(', ')}
        `;
        
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 600, 400);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText("MELISSA'S FOOD COURT", 50, 50);
        ctx.font = '14px Arial';
        ctx.fillText("Address: 123 Food Street, Colombo, Sri Lanka", 50, 80);
        ctx.fillText("--------------------------------------------------", 50, 100);
        
        const lines = reportContent.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line.trim(), 50, 130 + (i * 20));
        });

        const link = document.createElement('a');
        link.download = `report_${report.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    if (loading) return <div className="text-white p-8">Loading Dashboard...</div>;

    const renderRoleBadge = (role) => {
        const colors = {
            'manager': 'bg-blue-600',
            'cashier': 'bg-green-600',
            'steward': 'bg-purple-600',
            'kitchen_staff': 'bg-red-600',
            'admin': 'bg-gold-600'
        };
        return (
            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold text-white ${colors[role] || 'bg-gray-600'}`}>
                {role.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans flex flex-col">
            {/* Top Navigation Header */}
            <header className="h-20 bg-[#101010] border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Melissa's Logo" className="h-12 w-auto object-contain" />
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tighter">MELISSA'S FOOD COURT</h1>
                        <p className="text-[10px] text-gold-500 uppercase tracking-widest font-bold">Admin Dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white">{adminUser.name || 'Administrator'}</p>
                        <p className="text-xs text-gray-500">{adminUser.role || 'System Overseer'}</p>
                    </div>
                    <button 
                        onClick={() => {
                            localStorage.removeItem('adminToken');
                            localStorage.removeItem('adminUser');
                            navigate('/admin/login');
                        }}
                        className="h-10 w-10 rounded-full bg-gold-500/20 flex items-center justify-center border border-gold-500/40 hover:bg-gold-500/40 transition-colors"
                        title="Logout"
                    >
                        {adminUser.name?.charAt(0) || '👸'}
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-[#101010] border-r border-white/5 p-6 flex flex-col gap-8">
                    <nav className="space-y-1">
                        {[
                            { id: 'overview', label: 'Dashboard', icon: '📊' },
                            { id: 'Menus', label: 'Menu Items', icon: '🍽️' },
                            { id: 'orders', label: 'Orders', icon: '📋' },
                            { id: 'staff', label: 'Staff members', icon: '👥' },
                            { id: 'customers', label: 'Customers', icon: '👤' },
                            { id: 'Suppliers', label: 'Suppliers', icon: '🚚' },
                            { id: 'Inventory', label: 'Inventory', icon: '📦' },
                            { id: 'reservations', label: 'Reservations', icon: '📅' },
                            { id: 'Reports', label: 'Business Reports', icon: '📈' },
                            { id: 'audit-logs', label: 'Audit Logs', icon: '🔐' },
                            { id: 'Tables', label: 'Tables', icon: '🪑' }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setView(item.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${view === item.id ? 'bg-gold-500 text-black font-bold shadow-lg shadow-gold-500/20' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <span>{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-8 bg-[#0a0a0a]">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-3xl font-black text-white capitalize tracking-tight">{view}</h2>
                                <p className="text-gray-500 text-sm">Managing Melissa's Food Court operations</p>
                            </div>
                            <div className="text-xs text-gray-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                Last sync: {new Date().toLocaleTimeString()}
                            </div>
                        </div>

                        {view === 'overview' && stats && (
                            <div className="space-y-8">
                                {/* Enhanced Statistics Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <button onClick={() => setRevModalOpen(true)} className="group text-left transition-transform active:scale-95">
                                        <GlassCard className="h-full border-t-4 border-gold-500 bg-gradient-to-br from-gold-500/10 to-transparent group-hover:border-white transition-colors">
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Today Revenue</p>
                                            <p className="text-3xl text-white font-black mb-1">Rs. {stats.todayRevenue || 0}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase mt-4">
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                Real-time Update
                                            </div>
                                            <p className="text-[9px] text-gold-500/50 mt-2 font-bold uppercase tracking-tighter">Click to see analytics →</p>
                                        </GlassCard>
                                    </button>

                                    <button onClick={() => setOrdModalOpen(true)} className="group text-left transition-transform active:scale-95">
                                        <GlassCard className="h-full border-t-4 border-blue-500 bg-gradient-to-br from-blue-500/10 to-transparent group-hover:border-white transition-colors">
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Orders</p>
                                            <p className="text-3xl text-white font-black mb-1">{stats.totalOrders || 0}</p>
                                            <div className="mt-4 flex gap-1">
                                                {[1,2,3,4,5].map(i => <div key={i} className="h-1 flex-1 bg-blue-500/20 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${Math.random()*100}%`}}></div></div>)}
                                            </div>
                                            <p className="text-[9px] text-blue-500/50 mt-4 font-bold uppercase tracking-tighter">View order history →</p>
                                        </GlassCard>
                                    </button>

                                    <button onClick={() => setActiveStaffModalOpen(true)} className="group text-left transition-transform active:scale-95">
                                        <GlassCard className="h-full border-t-4 border-orange-500 bg-gradient-to-br from-orange-500/10 to-transparent group-hover:border-white transition-colors">
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Active Staff</p>
                                            <p className="text-3xl text-white font-black mb-1">{stats.activeStaff || 0}</p>
                                            <div className="flex -space-x-2 mt-4 overflow-hidden">
                                                {[1,2,3].map(i => <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-black bg-zinc-800 flex items-center justify-center text-[10px]">👤</div>)}
                                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-black bg-zinc-700 flex items-center justify-center text-[8px] font-bold">+{Math.max(0, (stats.activeStaff || 0) - 3)}</div>
                                            </div>
                                            <p className="text-[9px] text-orange-500/50 mt-2 font-bold uppercase tracking-tighter">Manage attendance →</p>
                                        </GlassCard>
                                    </button>

                                    <button onClick={() => setCustModalOpen(true)} className="group text-left transition-transform active:scale-95">
                                        <GlassCard className="h-full border-t-4 border-purple-500 bg-gradient-to-br from-purple-500/10 to-transparent group-hover:border-white transition-colors">
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Customers</p>
                                            <p className="text-3xl text-white font-black mb-1">{stats.totalCustomers || 0}</p>
                                            <div className="mt-4 text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded w-fit border border-purple-500/20">
                                                +{stats.details?.newCustomersWeek || 0} this week
                                            </div>
                                            <p className="text-[9px] text-purple-500/50 mt-2 font-bold uppercase tracking-tighter">View directory →</p>
                                        </GlassCard>
                                    </button>
                                </div>

                                {/* Secondary Stats Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <GlassCard className="bg-zinc-950/50">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Today's Category Sales</h3>
                                        <div className="space-y-4">
                                            {(stats.details?.todayCategories || []).length > 0 ? stats.details.todayCategories.map((c, i) => (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-white">{c.category_name}</span>
                                                        <span className="text-gold-500">Rs. {c.revenue}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gold-500/50" style={{width: `${(c.revenue / Math.max(...stats.details.todayCategories.map(x => x.revenue))) * 100}%`}}></div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-center text-[10px] text-gray-600 italic py-4">No sales recorded today yet.</p>
                                            )}
                                        </div>
                                    </GlassCard>

                                    <GlassCard className="bg-zinc-950/50">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Operational Status</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Pending Orders</p>
                                                <p className="text-2xl font-black text-white">{orders.filter(o => o.order_status === 'pending').length}</p>
                                            </div>
                                            <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Today's Orders</p>
                                                <p className="text-2xl font-black text-white">{stats.details?.todayOrders || 0}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            <p className="text-[10px] text-green-500 font-bold uppercase">All Systems Operational</p>
                                        </div>
                                    </GlassCard>

                                    <GlassCard className="bg-zinc-950/50">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Quick Links</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button onClick={() => setView('orders')} variant="secondary" className="text-[9px] h-10 font-bold uppercase">Manage Orders</Button>
                                            <Button onClick={() => setView('Reports')} variant="secondary" className="text-[9px] h-10 font-bold uppercase">View Reports</Button>
                                            <Button onClick={() => setView('Inventory')} variant="secondary" className="text-[9px] h-10 font-bold uppercase">Stock Setup</Button>
                                            <Button onClick={() => setView('Menus')} variant="secondary" className="text-[9px] h-10 font-bold uppercase">Update Menu</Button>
                                        </div>
                                    </GlassCard>
                                </div>
                            </div>
                        )}

                        {view === 'RevenueDetail' && revenueData && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <Button onClick={() => setView('overview')} variant="secondary" className="mb-4">← Back to Overview</Button>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <GlassCard className="bg-zinc-900/50">
                                            <h3 className="text-xl font-bold mb-6">Revenue by Day (Past 10 Days)</h3>
                                            <div className="h-64 flex items-end gap-2 px-4">
                                                {revenueData.daily.map((d, i) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center group">
                                                        <div 
                                                            className="w-full bg-gold-500/40 rounded-t group-hover:bg-gold-500 transition-all cursor-help relative" 
                                                            style={{ height: `${(d.revenue / Math.max(...revenueData.daily.map(x => x.revenue))) * 100}%` }}
                                                        >
                                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                Rs.{d.revenue}
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                                            {new Date(d.date).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </GlassCard>

                                        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-black text-gold-500 text-[10px] uppercase font-bold tracking-widest">
                                                    <tr>
                                                        <th className="p-4">Date</th>
                                                        <th className="p-4">Orders</th>
                                                        <th className="p-4 text-right">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {revenueData.daily.map((d, i) => (
                                                        <tr key={i} className="hover:bg-white/5">
                                                            <td className="p-4">{new Date(d.date).toDateString()}</td>
                                                            <td className="p-4 font-bold">{d.orders}</td>
                                                            <td className="p-4 text-right font-black text-white">Rs. {d.revenue}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <GlassCard>
                                            <h4 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest border-b border-white/5 pb-2">Order type breakdown</h4>
                                            <div className="space-y-6">
                                                {revenueData.breakdown.map((b, i) => (
                                                    <div key={i} className="space-y-2">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-white font-bold">{b.type}</span>
                                                            <span className="text-sm text-gray-400">Rs. {b.revenue}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-gold-500" style={{ width: `${(b.revenue / stats.revenue) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </GlassCard>
                                        
                                        <GlassCard className="bg-gradient-to-br from-green-500/20 to-transparent">
                                            <p className="text-xs text-green-400 font-bold uppercase mb-2">System Health</p>
                                            <p className="text-white text-sm font-bold">Order processing stable</p>
                                            <p className="text-[10px] text-gray-500 mt-1">Average response time: 240ms</p>
                                        </GlassCard>
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === 'staff' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white">All Staff Members</h3>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Search staff..." className="bg-black border border-white/10 rounded-lg px-4 py-2 text-xs focus:border-gold-500 outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {staffList.map(staff => (
                                        <GlassCard key={staff.id} className={`border-l-4 ${staff.status === 'active' ? 'border-green-500' : 'border-red-500'} flex flex-col gap-4`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-3 items-center">
                                                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                                                        {staff.role === 'admin' ? '💂' : staff.role === 'manager' ? '🎩' : staff.role === 'cashier' ? '💰' : '👨‍🍳'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white leading-tight">{staff.name}</h4>
                                                        <div className="flex gap-1 mt-1">
                                                            {renderRoleBadge(staff.role)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${staff.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    {staff.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                                                </div>
                                            </div>
                                            
                                            <div className="text-xs text-gray-400 font-medium">
                                                <p>✉️ {staff.email}</p>
                                                <p>📞 {staff.phone || 'No phone'}</p>
                                            </div>

                                            <div className="flex gap-2 mt-2 pt-4 border-t border-white/5">
                                                <Button onClick={() => openPermModal(staff)} className="text-[10px] px-3 flex-1 h-8">
                                                     Permissions
                                                 </Button>
                                                 <Button onClick={() => openRoleModal(staff)} className="text-[10px] px-3 flex-1 h-8" variant="secondary">
                                                     Change Role
                                                 </Button>
                                                 <Button
                                                    onClick={() => handleToggleStatus(staff.id, staff.status === 'active')}
                                                    className="text-[10px] px-3 h-8"
                                                    variant={staff.status === 'active' ? 'secondary' : 'primary'}
                                                >
                                                    {staff.status === 'active' ? 'OFF' : 'ON'}
                                                </Button>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>
                        )}

                        {view === 'Menus' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-gold-500/20 shadow-2xl">
                                    <div>
                                        <h3 className="text-xl font-black text-white">Menu Management</h3>
                                        <p className="text-xs text-gray-500 mt-1">Admin CRUD for categories and items</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <Button onClick={() => setCatModalOpen(true)} variant="secondary" className="px-6">+ New Category</Button>
                                        <Button onClick={() => setMenuModalOpen(true)} variant="primary" className="px-6">+ New Menu Item</Button>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Categories */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-0.5 w-8 bg-gold-500" />
                                            <h4 className="text-lg font-bold text-white uppercase tracking-widest text-sm">Categories</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            {categories.map(cat => {
                                                const itemCount = menus.filter(m => m.category === cat.name || m.category_id === cat.id).length;
                                                return (
                                                    <GlassCard key={cat.id} className={`text-center group transition-all border ${itemCount < 6 ? 'border-red-500/30' : 'border-transparent hover:border-gold-500/30'}`}>
                                                        <div className="h-16 w-16 mx-auto rounded-full bg-zinc-800 flex items-center justify-center text-2xl mb-3 overflow-hidden">
                                                            {cat.image ? <img src={cat.image.startsWith('http') ? cat.image : `${config.API_BASE_URL}/public/food/${cat.image}`} /> : '🍽️'}
                                                        </div>
                                                        <h5 className="font-bold text-white text-sm group-hover:text-gold-500">{cat.name}</h5>
                                                        <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-tight">{itemCount} Items</p>
                                                        {itemCount < 6 && (
                                                            <div className="mt-2 text-[8px] text-red-500 font-bold bg-red-500/10 py-1 rounded">⚠️ Needs {6 - itemCount} more</div>
                                                        )}
                                                    </GlassCard>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-0.5 w-8 bg-gold-500" />
                                            <h4 className="text-lg font-bold text-white uppercase tracking-widest text-sm">Menu Items ({menus.length})</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {menus.map(item => (
                                                <div key={item.id} className="bg-[#151515] rounded-xl overflow-hidden border border-white/5 hover:border-gold-500/40 transition-all group">
                                                    <div className="h-40 bg-zinc-800 relative">
                                                        <img 
                                                            src={item.image ? (item.image.startsWith('http') ? item.image : `${config.API_BASE_URL}/public/food/${item.image}`) : '/placeholder-food.jpg'} 
                                                            alt={item.name}
                                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                        />
                                                        <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] font-bold text-gold-500">
                                                            {item.category}
                                                        </div>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-bold text-white">{item.name}</h5>
                                                            <span className="text-gold-500 font-black text-sm">Rs. {Number(item.price).toFixed(0)}</span>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 line-clamp-2 h-8 leading-relaxed font-medium">{item.description}</p>
                                                        <div className="flex gap-2 pt-2">
                                                            <button className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold py-2 rounded-lg transition-colors border border-white/5">Edit</button>
                                                            <button className="bg-red-900/20 hover:bg-red-900/40 text-red-500 text-[10px] font-bold px-3 py-2 rounded-lg transition-colors border border-red-500/20">Delete</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === 'orders' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    {orders.map(order => (
                                        <GlassCard key={order.id} className="space-y-4 border-l-4 border-white">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[10px] text-gold-500 font-bold uppercase tracking-widest">Order ID: #{order.id}</p>
                                                    <h4 className="text-lg font-bold text-white mt-1">{order.customer_name || 'Walk-in Customer'}</h4>
                                                    <p className="text-xs text-gray-400">{order.order_type} | {new Date(order.created_at).toLocaleTimeString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                                                        order.status === 'READY_TO_SERVE' ? 'bg-blue-600 text-white' : 
                                                        order.status === 'SERVING' ? 'bg-orange-600 text-white' : 
                                                        order.status === 'FINISHED' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-gray-400'
                                                    }`}>
                                                        {order.status || 'COOKING'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl space-y-2">
                                                <div className="flex border-b border-white/5 pb-2 text-[10px] text-gray-600 font-bold uppercase">
                                                    <div className="flex-1">Items</div>
                                                    <div>Total</div>
                                                </div>
                                                <div className="text-sm font-bold text-white">
                                                    {/* In a real app we'd parse JSON items */}
                                                    {order.table_number ? `Dine-in Order @ Table ${order.table_number}` : 'External Order'}
                                                </div>
                                                <div className="flex justify-between items-end mt-4">
                                                    <p className="text-xs text-gray-500 font-bold">Total Amount</p>
                                                    <p className="text-xl font-black text-white">Rs. {order.total_amount || order.total_price}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button className="text-xs h-8 flex-1" variant="primary">Update Status</Button>
                                                <Button className="text-xs h-8" variant="secondary">Details</Button>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>
                        )}

                        {view === 'customers' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-gold-500/20">
                                    <div>
                                        <h3 className="text-xl font-black text-white">Customer Management</h3>
                                        <p className="text-xs text-gray-500 mt-1">Review your user base and their activity</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <input type="text" placeholder="Search customers..." className="bg-black border border-white/10 rounded-lg px-4 py-2 text-xs focus:border-gold-500 outline-none text-white" />
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-[#101010] text-gold-500 text-[10px] uppercase font-bold tracking-widest">
                                            <tr>
                                                <th className="p-4">Customer Name</th>
                                                <th className="p-4">Contact Info</th>
                                                <th className="p-4">Join Date</th>
                                                <th className="p-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {customers.map(cust => (
                                                <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">👤</div>
                                                            <span className="font-bold text-white">{cust.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-xs">
                                                        <p className="text-gray-400">{cust.email}</p>
                                                        <p className="text-gray-600 font-mono">{cust.phone || 'N/A'}</p>
                                                    </td>
                                                    <td className="p-4 text-gray-500 text-xs">{new Date(cust.created_at).toLocaleDateString()}</td>
                                                    <td className="p-4 text-right">
                                                        <Button 
                                                            onClick={() => handleToggleStatus(cust.id, cust.status === 'active', 'customer')}
                                                            variant={cust.status === 'active' ? 'primary' : 'secondary'}
                                                            className="text-[10px] h-7 px-4"
                                                        >
                                                            {cust.status === 'active' ? 'ACTIVE' : 'BLOCKED'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {view === 'Suppliers' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-gold-500/20">
                                    <div>
                                        <h3 className="text-xl font-black text-white">Supplier Directory</h3>
                                        <p className="text-xs text-gray-500 mt-1">Manage food & beverage supply partners</p>
                                    </div>
                                    <Button onClick={() => setSupModalOpen(true)} variant="primary">+ Add Supplier</Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {suppliers.map(sup => (
                                        <GlassCard key={sup.id} className="space-y-4">
                                            <div className="flex justify-between">
                                                <h4 className="text-lg font-bold text-white">{sup.name}</h4>
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold ${sup.status === 'Approved' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'}`}>
                                                    {sup.status || 'PENDING'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-400">
                                                <div>
                                                    <p className="text-[10px] text-gold-500 uppercase font-black tracking-widest mb-1">Contact</p>
                                                    <p>{sup.contact_number}</p>
                                                    <p>{sup.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gold-500 uppercase font-black tracking-widest mb-1">Products</p>
                                                    <p className="line-clamp-2">{sup.products_supplied}</p>
                                                </div>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded text-[10px] text-gray-500">
                                                📍 {sup.address}
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button className="flex-1 h-8 text-[10px]" variant="secondary">Edit</Button>
                                                <Button className="h-8 text-[10px] bg-red-900/20 border-red-900 text-red-500">Remove</Button>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>
                        )}

                        {view === 'Inventory' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-gold-500/20">
                                    <div>
                                        <h3 className="text-xl font-black text-white">Stock Management</h3>
                                        <p className="text-xs text-gray-500 mt-1">Monitor ingredient levels and inventory</p>
                                    </div>
                                    <Button onClick={() => setInvModalOpen(true)} variant="primary">+ Add Item</Button>
                                </div>

                                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-[#101010] text-gold-500 text-[10px] uppercase font-bold tracking-widest">
                                            <tr>
                                                <th className="p-4">Item Name</th>
                                                <th className="p-4">Quantity</th>
                                                <th className="p-4">Supplier</th>
                                                <th className="p-4">Last Updated</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {inventory.map(item => (
                                                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-bold text-white">{item.item_name}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.quantity < 10 ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-white'}`}>
                                                            {item.quantity} {item.unit}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-500 text-xs">{item.supplier_name || 'N/A'}</td>
                                                    <td className="p-4 text-gray-500 text-xs">{new Date(item.last_updated).toLocaleDateString()}</td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button className="text-[10px] bg-white/5 px-3 py-1.5 rounded-lg font-bold border border-white/10 hover:bg-white/10 transition-colors">Update</button>
                                                        <button className="text-[10px] bg-red-900/20 px-3 py-1.5 rounded-lg font-bold border border-red-500/20 text-red-500 hover:bg-red-900/40 transition-colors">Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {view === 'Reports' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {/* Report Generation Panel */}
                                <GlassCard className="border border-gold-500/20">
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        <div className="lg:w-1/3">
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Generate Reports</h3>
                                            <p className="text-xs text-gray-500">Filter and generate detailed business documents.</p>
                                        </div>
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-600">Start Date</label>
                                                <input type="date" value={reportFilters.startDate} onChange={e => setReportFilters({...reportFilters, startDate: e.target.value})} className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-600">End Date</label>
                                                <input type="date" value={reportFilters.endDate} onChange={e => setReportFilters({...reportFilters, endDate: e.target.value})} className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-600">Report Type</label>
                                                <select value={reportFilters.type} onChange={e => setReportFilters({...reportFilters, type: e.target.value})} className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white">
                                                    <option value="revenue">Revenue Analytics</option>
                                                    <option value="food">Food-wise Sales</option>
                                                    <option value="orders">Orders Summary</option>
                                                    <option value="cancellations">Cancellations Report</option>
                                                    <option value="customers">Customer Activity</option>
                                                    <option value="staff">Staff Performance</option>
                                                    <option value="supplier">Supplier Purchase</option>
                                                </select>
                                            </div>
                                            <div className="flex items-end">
                                                <Button onClick={handleGenerateReport} disabled={isGenerating} className="w-full h-[38px] text-[10px] font-black uppercase" variant="primary">
                                                    {isGenerating ? 'Generating...' : 'Run Report'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* Results View */}
                                {generatedReport ? (
                                    <GlassCard className="bg-zinc-950 border-gold-500/30 min-h-[400px]">
                                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                                            <div>
                                                <h3 className="text-2xl font-black text-white uppercase">{generatedReport.title}</h3>
                                                <p className="text-xs text-gray-500">Period: {reportFilters.startDate} to {reportFilters.endDate}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => window.print()} variant="secondary" className="text-[10px] h-8 font-black uppercase">Print</Button>
                                                <Button onClick={() => setGeneratedReport(null)} variant="secondary" className="text-[10px] h-8 font-black uppercase">Close</Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Total Revenue</p>
                                                <p className="text-3xl font-black text-white">Rs. {generatedReport.summary?.totalRevenue || 0}</p>
                                            </div>
                                            <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Total Orders</p>
                                                <p className="text-3xl font-black text-white">{generatedReport.summary?.totalOrders || 0}</p>
                                            </div>
                                            <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Average Value</p>
                                                <p className="text-3xl font-black text-white">Rs. {Math.round(generatedReport.summary?.totalRevenue / (generatedReport.summary?.totalOrders || 1))}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-[#101010] text-gold-500 text-[10px] uppercase font-bold tracking-widest">
                                                    <tr>
                                                        {Object.keys(generatedReport.data[0] || {}).map(k => (
                                                            <th key={k} className="p-4">{k.replace('_', ' ')}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {generatedReport.data.map((row, i) => (
                                                        <tr key={i} className="hover:bg-white/5 text-gray-300">
                                                            {Object.values(row).map((v, j) => (
                                                                <td key={j} className="p-4 text-xs">{v}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </GlassCard>
                                ) : (
                                    /* Historical Reports List */
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest px-2">Recent Report History</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {reports.length > 0 ? reports.map(report => {
                                                const s = JSON.parse(report.summary_data || '{}');
                                                return (
                                                    <GlassCard key={report.id} className="hover:border-gold-500 transition-colors group">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="h-10 w-10 flex items-center justify-center bg-gold-500/10 rounded-xl text-xl">📈</div>
                                                            <span className="bg-white/5 text-[9px] font-black tracking-widest px-2 py-1 rounded text-gray-400 uppercase">{report.report_type}</span>
                                                        </div>
                                                        <h4 className="font-bold text-white mb-1 leading-tight">{report.title}</h4>
                                                        <p className="text-[10px] text-gray-500 font-bold mb-4">{new Date(report.generated_at).toLocaleString()}</p>
                                                        
                                                        <div className="grid grid-cols-2 gap-2 mb-6">
                                                            <div className="bg-black/40 p-2 rounded border border-white/5">
                                                                <p className="text-[8px] text-gray-500 uppercase">Rev</p>
                                                                <p className="text-xs font-bold text-white">Rs. {s.totalRevenue || 0}</p>
                                                            </div>
                                                            <div className="bg-black/40 p-2 rounded border border-white/5">
                                                                <p className="text-[8px] text-gray-500 uppercase">Orders</p>
                                                                <p className="text-xs font-bold text-white">{s.totalOrders || 0}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <Button onClick={() => {
                                                                setGeneratedReport({
                                                                    title: report.title,
                                                                    data: JSON.parse(report.data_json || '[]'),
                                                                    summary: s
                                                                });
                                                            }} variant="secondary" className="flex-1 text-[10px] h-9 font-black uppercase tracking-widest">
                                                                View
                                                            </Button>
                                                            <Button onClick={() => exportReport(report)} variant="secondary" className="text-[10px] h-9 w-10 p-0 hover:bg-gold-500 hover:text-black">
                                                                ⬇️
                                                            </Button>
                                                        </div>
                                                    </GlassCard>
                                                );
                                            }) : (
                                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                                    <p className="text-gray-500 text-sm">No historical reports found. Run a new one to see it here.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {view === 'audit-logs' && (
                            <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                <div className="bg-[#151515] p-4 font-black text-xs tracking-widest text-gold-500 border-b border-white/5">SECURITY AUDIT TRAIL</div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#0a0a0a] text-gray-600 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="p-4">Timestamp</th>
                                            <th className="p-4">Operation</th>
                                            <th className="p-4">User</th>
                                            <th className="p-4">Log Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-xs font-medium">
                                        {auditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4 text-gray-500 font-mono">{new Date(log.created_at).toLocaleString([], { hour12: true, month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="p-4"><span className="text-white group-hover:text-gold-500 transition-colors uppercase font-black">{log.action_type.replace(/_/g, ' ')}</span></td>
                                                <td className="p-4 text-gray-400">{log.performed_by_name || 'System'}</td>
                                                <td className="p-4 text-gray-600 italic">"{log.details}"</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {view === 'Tables' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-gold-500/20">
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase">Venue Layout</h3>
                                    <div className="space-x-4">
                                        <Button variant="secondary" className="px-6">+ Add Area</Button>
                                        <Button variant="primary" className="px-6">+ Add Table</Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {areaList.map(area => (
                                        <GlassCard key={area.id} className="space-y-6 border-t border-white/5">
                                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-gold-500/20 flex items-center justify-center text-gold-500 font-black">A</div>
                                                    <h4 className="text-lg font-bold text-white uppercase tracking-tighter">{area.area_name}</h4>
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-black uppercase bg-white/5 px-2 py-0.5 rounded tracking-widest">{allTables.filter(t => t.area_id === area.id).length} Stations</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {allTables.filter(t => t.area_id === area.id).map(table => (
                                                    <div key={table.id} className={`p-4 rounded-xl border transition-all ${table.status === 'occupied' ? 'border-yellow-500/50 bg-yellow-500/5 shadow-lg shadow-yellow-500/5' : table.status === 'reserved' ? 'border-red-500/50 bg-red-500/5' : 'border-white/5 bg-white/5 opacity-80'}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className="font-black text-white">#{table.table_number}</span>
                                                            <div className={`w-3 h-3 rounded-full shadow-sm ${table.status === 'available' ? 'bg-green-500' : table.status === 'occupied' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-4 tracking-tighter">{table.capacity} Seats Available</p>
                                                        <select 
                                                            value={table.status}
                                                            onChange={(e) => handleUpdateTableStatus(table.id, e.target.value)}
                                                            className="w-full bg-black text-[10px] border border-white/5 rounded-lg p-2 outline-none text-white font-black cursor-pointer uppercase tracking-widest hover:border-gold-500 transition-colors"
                                                        >
                                                            <option value="available">✓ Clear</option>
                                                            <option value="occupied">⏳ Busy</option>
                                                            <option value="reserved">🔒 Hold</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modals remain mostly same but updated with better styling */}
            {roleModalOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#151515] border border-gold-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                        <h3 className="text-xl font-black mb-6 text-white uppercase tracking-tight border-b border-white/5 pb-4">Job classification</h3>
                        <div className="grid grid-cols-1 gap-2 mb-8 h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {STAFF_ROLES.map(role => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border-2 uppercase text-[10px] font-black tracking-widest transition-all ${selectedRole === role ? 'bg-gold-500 text-black border-gold-500 shadow-lg shadow-gold-500/40' : 'bg-transparent border-white/5 text-gray-500 hover:border-white/20 hover:text-white'}`}
                                >
                                    {role.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <Button className="flex-1" variant="secondary" onClick={() => setRoleModalOpen(false)}>Discard</Button>
                            <Button className="flex-1" variant="primary" onClick={handleUpdateRole}>Assign Role</Button>
                        </div>
                    </div>
                </div>
            )}

            {permModalOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#151515] border border-gold-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-black mb-6 text-white uppercase tracking-tight border-b border-white/5 pb-4">Access control list</h3>
                        <div className="grid grid-cols-1 gap-3 mb-8">
                            {ALL_STAFF_PERMS.map(perm => (
                                <label key={perm} className="flex items-center justify-between cursor-pointer p-4 bg-white/5 rounded-xl border border-transparent hover:border-gold-500/30 transition-all">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{perm}</span>
                                    <input
                                        type="checkbox"
                                        checked={userPerms.includes(perm)}
                                        onChange={() => {
                                            if (userPerms.includes(perm)) setUserPerms(userPerms.filter(p => p !== perm));
                                            else setUserPerms([...userPerms, perm]);
                                        }}
                                        className="w-5 h-5 accent-gold-500 cursor-pointer"
                                    />
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <Button className="flex-1" variant="secondary" onClick={() => setPermModalOpen(false)}>Discard</Button>
                            <Button className="flex-1" variant="primary" onClick={savePermissions}>Apply Access</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* STATS DETAIL MODALS */}
            {revModalOpen && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#101010] border border-gold-500/40 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Revenue Analytics</h3>
                                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Real-time financial performance</p>
                            </div>
                            <button onClick={() => setRevModalOpen(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-gold-500 font-bold uppercase mb-2">Today</p>
                                <p className="text-3xl font-black text-white">Rs. {stats.todayRevenue}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">This Week</p>
                                <p className="text-3xl font-black text-white">Rs. {stats.weekRevenue}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Total Life</p>
                                <p className="text-3xl font-black text-white">Rs. {stats.revenue}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Sales by Category (Today)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(stats.details?.todayCategories || []).map((c, i) => (
                                    <div key={i} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                        <span className="text-gray-300 font-bold uppercase text-[11px]">{c.category_name}</span>
                                        <span className="text-gold-500 font-black">Rs. {c.revenue}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex gap-4">
                            <Button className="flex-1" variant="primary" onClick={() => { setRevModalOpen(false); setView('Reports'); }}>Detailed Financial Report</Button>
                            <Button className="flex-1" variant="secondary" onClick={() => setRevModalOpen(false)}>Close View</Button>
                        </div>
                    </div>
                </div>
            )}

            {ordModalOpen && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#101010] border border-blue-500/40 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Order Insights</h3>
                                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Operational throughput data</p>
                            </div>
                            <button onClick={() => setOrdModalOpen(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[9px] text-blue-400 font-bold uppercase mb-1">Today</p>
                                <p className="text-2xl font-black text-white">{stats.details?.todayOrders || 0}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Total</p>
                                <p className="text-2xl font-black text-white">{stats.totalOrders || 0}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Pending</p>
                                <p className="text-2xl font-black text-white">{orders.filter(o => o.order_status === 'pending').length}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Completed</p>
                                <p className="text-2xl font-black text-white">{orders.filter(o => o.order_status === 'completed').length}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">Live Order Stream</h4>
                            <div className="space-y-2">
                                {orders.slice(0, 5).map(o => (
                                    <div key={o.id} className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-white">#MFC-{o.id}</span>
                                            <span className="text-[9px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-black uppercase">{o.type}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] text-gray-500">{new Date(o.created_at).toLocaleTimeString()}</span>
                                            <span className="text-xs font-bold text-gold-500">Rs. {o.total_price}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex gap-4">
                            <Button className="flex-1" variant="primary" onClick={() => { setOrdModalOpen(false); setView('orders'); }}>Go to Order Manager</Button>
                            <Button className="flex-1" variant="secondary" onClick={() => setOrdModalOpen(false)}>Dismiss</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeStaffModalOpen && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#101010] border border-orange-500/40 rounded-3xl p-8 max-w-2xl w-full">
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="text-2xl font-black text-white uppercase">Staff On Duty</h3>
                            <button onClick={() => setActiveStaffModalOpen(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl text-center mb-8">
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-2">Currently Clocked In</p>
                            <p className="text-6xl font-black text-white">{stats.activeStaff || 0}</p>
                            <p className="text-xs text-orange-500 font-bold mt-4 uppercase">Total registered staff: {stats.staff}</p>
                        </div>
                        <div className="flex gap-4">
                            <Button className="flex-1" variant="primary" onClick={() => { setActiveStaffModalOpen(false); setView('staff'); }}>Staff Directory</Button>
                            <Button className="flex-1" variant="secondary" onClick={() => setActiveStaffModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {custModalOpen && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#101010] border border-purple-500/40 rounded-3xl p-8 max-w-2xl w-full">
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="text-2xl font-black text-white uppercase">Customer Base</h3>
                            <button onClick={() => setCustModalOpen(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 text-center">
                                <p className="text-gray-500 font-bold uppercase text-[9px] mb-2">Total Retention</p>
                                <p className="text-4xl font-black text-white">{stats.totalCustomers || 0}</p>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-2xl text-center">
                                <p className="text-purple-400 font-bold uppercase text-[9px] mb-2">New (7 Days)</p>
                                <p className="text-4xl font-black text-white">+{stats.details?.newCustomersWeek || 0}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button className="flex-1" variant="primary" onClick={() => { setCustModalOpen(false); setView('customers'); }}>Customer Management</Button>
                            <Button className="flex-1" variant="secondary" onClick={() => setCustModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {menuModalOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleAddMenu} className="bg-[#151515] border border-gold-500/30 rounded-2xl p-8 max-w-md w-full space-y-4">
                        <h3 className="text-xl font-black text-white uppercase">New Menu Item</h3>
                        <input name="name" placeholder="Item Name" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewMenu({...newMenu, name: e.target.value})} />
                        <textarea name="description" placeholder="Description" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewMenu({...newMenu, description: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="price" type="number" placeholder="Price" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewMenu({...newMenu, price: e.target.value})} />
                            <select name="category_id" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewMenu({...newMenu, category_id: e.target.value})}>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <input name="image" placeholder="Image URL or filename" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewMenu({...newMenu, image: e.target.value})} />
                        <div className="flex gap-4 pt-4">
                            <Button className="flex-1" variant="secondary" onClick={() => setMenuModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1" type="submit">Add Item</Button>
                        </div>
                    </form>
                </div>
            )}

            {supModalOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleAddSupplier} className="bg-[#151515] border border-gold-500/30 rounded-2xl p-8 max-w-md w-full space-y-4">
                        <h3 className="text-xl font-black text-white uppercase">Add Supplier</h3>
                        <input placeholder="Supplier Name" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                        <input placeholder="Contact Number" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewSupplier({...newSupplier, contact_number: e.target.value})} />
                        <input placeholder="Email" type="email" className="w-full bg-black border border-white/10 p-3 rounded text-white" onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} />
                        <textarea placeholder="Address" className="w-full bg-black border border-white/10 p-3 rounded text-white" onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} />
                        <input placeholder="Products Supplied" className="w-full bg-black border border-white/10 p-3 rounded text-white" onChange={e => setNewSupplier({...newSupplier, products_supplied: e.target.value})} />
                        <div className="flex gap-4 pt-4">
                            <Button className="flex-1" variant="secondary" onClick={() => setSupModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1" type="submit">Add</Button>
                        </div>
                    </form>
                </div>
            )}

            {invModalOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleAddInventory} className="bg-[#151515] border border-gold-500/30 rounded-2xl p-8 max-w-sm w-full space-y-4">
                        <h3 className="text-xl font-black text-white uppercase">Add Inventory</h3>
                        <input placeholder="Item Name" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewInv({...newInv, item_name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" placeholder="Quantity" className="w-full bg-black border border-white/10 p-3 rounded text-white" required onChange={e => setNewInv({...newInv, quantity: e.target.value})} />
                             <input placeholder="Unit (kg/l/pcs)" className="w-full bg-black border border-white/10 p-3 rounded text-white" onChange={e => setNewInv({...newInv, unit: e.target.value})} />
                        </div>
                        <select className="w-full bg-black border border-white/10 p-3 rounded text-white" onChange={e => setNewInv({...newInv, supplier_id: e.target.value})}>
                            <option value="">Select Supplier</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <div className="flex gap-4 pt-4">
                            <Button className="flex-1" variant="secondary" onClick={() => setInvModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1" type="submit">Add</Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};


export default AdminDashboard;
