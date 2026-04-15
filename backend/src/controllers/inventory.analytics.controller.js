import pool from '../config/db.js';

/**
 * GET /api/inventory/analytics/advanced
 * Comprehensive analytics with area, category, status, and time-based filtering
 */
export const getAdvancedInventoryReport = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        const {
            startDate = monthStart,
            endDate = today,
            area = 'All',          // Kitchen | Bar | General | All
            category = 'All',      // Dairy | Beverages | Raw Materials | Packaged Items | All
            status = 'All'         // Available | Low Stock | Out of Stock | All
        } = req.query;

        const startTS = `${startDate} 00:00:00`;
        const endTS   = `${endDate} 23:59:59`;

        // ── 1. Build dynamic WHERE clause ─────────────────────────────
        let baseWhere = 'WHERE 1=1';
        const baseParams = [];
        if (area !== 'All')     { baseWhere += ' AND i.category = ?';   baseParams.push(area); }
        if (status !== 'All')   { baseWhere += ' AND i.status = ?';      baseParams.push(status); }

        // ── 2. Full inventory list with supplier ───────────────────────
        const [inventoryList] = await pool.query(`
            SELECT i.*, s.name as supplier_name, s.phone as supplier_phone, s.email as supplier_email
            FROM inventory i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            ${baseWhere}
            ORDER BY i.category, i.item_name
        `, baseParams);

        // ── 3. Summary KPIs ────────────────────────────────────────────
        const [summaryRows] = await pool.query(`
            SELECT
                COUNT(*) as total_items,
                SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as healthy_count,
                SUM(CASE WHEN status = 'Low Stock' THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN status = 'Out of Stock' THEN 1 ELSE 0 END) as out_of_stock_count,
                SUM(quantity) as total_qty,
                SUM(CASE WHEN status = 'Low Stock' THEN quantity ELSE 0 END) as low_stock_qty,
                SUM(CASE WHEN status = 'Out of Stock' THEN quantity ELSE 0 END) as out_of_stock_qty
            FROM inventory i
            ${baseWhere}
        `, baseParams);
        const summary = summaryRows[0];

        // ── 4. Category distribution (pie chart) ─────────────────────
        const [categoryDistribution] = await pool.query(`
            SELECT i.category, COUNT(*) as item_count, SUM(quantity) as total_qty
            FROM inventory i
            ${baseWhere}
            GROUP BY i.category
            ORDER BY total_qty DESC
        `, baseParams);

        // ── 5. Status distribution (doughnut chart) ───────────────────
        const [statusDistribution] = await pool.query(`
            SELECT status, COUNT(*) as count, SUM(quantity) as total_qty
            FROM inventory i
            ${baseWhere}
            GROUP BY status
        `, baseParams);

        // ── 6. Item vs Quantity (bar chart) ───────────────────────────
        const [itemQuantityChart] = await pool.query(`
            SELECT i.item_name, i.quantity, i.unit, i.category, i.status
            FROM inventory i
            ${baseWhere}
            ORDER BY i.quantity DESC
            LIMIT 20
        `, baseParams);

        // ── 7. Kitchen vs Bar comparison (stacked bar) ────────────────
        const [areaComparison] = await pool.query(`
            SELECT
                i.category as area,
                COUNT(*) as item_count,
                SUM(i.quantity) as total_qty,
                SUM(CASE WHEN i.status = 'Available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN i.status = 'Low Stock' THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN i.status = 'Out of Stock' THEN 1 ELSE 0 END) as out_of_stock
            FROM inventory i
            GROUP BY i.category
        `);

        // ── 8. Usage trend (line chart) from stock history ────────────
        const [usageTrend] = await pool.query(`
            SELECT
                DATE(sh.created_at) as date,
                SUM(CASE WHEN sh.action_type = 'REDUCE' THEN sh.quantity ELSE 0 END) as consumed,
                SUM(CASE WHEN sh.action_type IN ('ADD','RESTOCK') THEN sh.quantity ELSE 0 END) as restocked
            FROM stock_history sh
            JOIN inventory i ON sh.inventory_id = i.id
            WHERE sh.created_at BETWEEN ? AND ?
            GROUP BY DATE(sh.created_at)
            ORDER BY date ASC
        `, [startTS, endTS]);

        // ── 9. Top consumed items ──────────────────────────────────────
        const [topConsumed] = await pool.query(`
            SELECT i.item_name, i.category, SUM(sh.quantity) as total_consumed, i.unit
            FROM stock_history sh
            JOIN inventory i ON sh.inventory_id = i.id
            WHERE sh.action_type = 'REDUCE'
              AND sh.created_at BETWEEN ? AND ?
            GROUP BY sh.inventory_id
            ORDER BY total_consumed DESC
            LIMIT 10
        `, [startTS, endTS]);

        // ── 10. Transaction history ────────────────────────────────────
        const [transactionSummary] = await pool.query(`
            SELECT
                sh.action_type,
                COUNT(*) as transaction_count,
                SUM(sh.quantity) as total_qty
            FROM stock_history sh
            JOIN inventory i ON sh.inventory_id = i.id
            WHERE sh.created_at BETWEEN ? AND ?
            GROUP BY sh.action_type
        `, [startTS, endTS]);

        // ── 11. Alerts Panel ──────────────────────────────────────────
        const [lowStockAlerts] = await pool.query(`
            SELECT i.item_name, i.category, i.quantity, i.min_level, i.unit, i.status,
                   s.name as supplier_name, s.phone as supplier_phone
            FROM inventory i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.status IN ('Low Stock', 'Out of Stock')
            ORDER BY i.quantity ASC
            LIMIT 20
        `);

        // ── 12. Area-wise breakdown ────────────────────────────────────
        const [areaBreakdown] = await pool.query(`
            SELECT i.category as area, i.item_name, i.quantity, i.unit, i.min_level, i.status,
                   s.name as supplier_name
            FROM inventory i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.category, i.item_name
        `);

        // ── 13. AI Insights Engine ─────────────────────────────────────
        const insights = [];
        const alerts = [];

        // Identify stocks about to run out (within 20% of min_level)
        inventoryList.forEach(item => {
            const ratio = item.quantity / (item.min_level || 1);
            if (item.status === 'Out of Stock') {
                alerts.push({
                    type: 'CRITICAL',
                    icon: '🚨',
                    message: `${item.item_name} is completely out of stock. Immediate restock required.`,
                    item_name: item.item_name,
                    area: item.category
                });
            } else if (item.status === 'Low Stock') {
                alerts.push({
                    type: 'WARNING',
                    icon: '⚠️',
                    message: `${item.item_name} is running low (${item.quantity} ${item.unit} remaining, min: ${item.min_level}).`,
                    item_name: item.item_name,
                    area: item.category
                });
            }
        });

        // Consumption insights
        if (topConsumed.length > 0) {
            const top = topConsumed[0];
            insights.push({
                type: 'INFO',
                icon: '📊',
                message: `"${top.item_name}" was the most consumed item this period (${top.total_consumed} ${top.unit}).`
            });
        }

        const reduceStats = transactionSummary.find(t => t.action_type === 'REDUCE');
        if (reduceStats && reduceStats.total_qty > 0) {
            const restockStats = transactionSummary.find(t => t.action_type === 'RESTOCK');
            const restock = restockStats ? restockStats.total_qty : 0;
            const wastageRatio = restock > 0 ? ((reduceStats.total_qty / restock) * 100).toFixed(1) : 0;
            insights.push({
                type: 'TIP',
                icon: '💡',
                message: `Consumption rate this period: ${reduceStats.total_qty} units consumed vs ${restock} units restocked.`
            });
        }

        // Predict low stock (items that consumed at high rate)
        if (topConsumed.length > 0) {
            topConsumed.forEach(item => {
                const invItem = inventoryList.find(i => i.item_name === item.item_name);
                if (invItem) {
                    const daysInPeriod = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
                    const dailyRate = item.total_consumed / daysInPeriod;
                    if (dailyRate > 0) {
                        const daysLeft = Math.floor(invItem.quantity / dailyRate);
                        if (daysLeft <= 3 && daysLeft >= 0) {
                            insights.push({
                                type: 'PREDICTION',
                                icon: '🔮',
                                message: `"${item.item_name}" may run out in ~${daysLeft} day(s) at current consumption rate of ${dailyRate.toFixed(1)} ${invItem.unit}/day.`,
                                item_name: item.item_name,
                                days_left: daysLeft
                            });
                        }
                    }
                }
            });
        }

        // Group area-wise breakdown
        const areaWise = {};
        areaBreakdown.forEach(item => {
            if (!areaWise[item.area]) areaWise[item.area] = [];
            areaWise[item.area].push(item);
        });

        res.json({
            metadata: {
                generated_at: new Date().toISOString(),
                period: { start: startDate, end: endDate },
                filters: { area, category, status }
            },
            summary: {
                total_items: summary.total_items || 0,
                healthy_count: summary.healthy_count || 0,
                low_stock_count: summary.low_stock_count || 0,
                out_of_stock_count: summary.out_of_stock_count || 0,
                total_qty: parseFloat(summary.total_qty) || 0
            },
            charts: {
                category_distribution: categoryDistribution,
                status_distribution: statusDistribution,
                item_quantity_bar: itemQuantityChart,
                area_comparison: areaComparison,
                usage_trend: usageTrend
            },
            top_consumed: topConsumed,
            transaction_summary: transactionSummary,
            area_wise: areaWise,
            alerts,
            insights,
            inventory_list: inventoryList,
            low_stock_alerts: lowStockAlerts
        });
    } catch (error) {
        console.error('Advanced inventory report error:', error);
        res.status(500).json({ message: 'Failed to generate advanced report', error: error.message });
    }
};

/**
 * GET /api/inventory/analytics/ai-insights
 * AI-power smart suggestions & predictions for inventory management
 */
export const getAIInventoryInsights = async (req, res) => {
    try {
        // Get current inventory state
        const [inventory] = await pool.query(`
            SELECT i.*, s.name as supplier_name
            FROM inventory i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.status, i.quantity ASC
        `);

        // Get last 30 days consumption
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        const [consumption] = await pool.query(`
            SELECT sh.inventory_id, i.item_name, i.category, i.quantity as current_qty, i.unit, i.min_level,
                   SUM(sh.quantity) as consumed_30d, COUNT(*) as reduction_events
            FROM stock_history sh
            JOIN inventory i ON sh.inventory_id = i.id
            WHERE sh.action_type = 'REDUCE'
              AND sh.created_at >= ?
            GROUP BY sh.inventory_id
            ORDER BY consumed_30d DESC
        `, [thirtyDaysAgo]);

        const predictions = [];
        const restockSuggestions = [];
        const wasteWarnings = [];

        consumption.forEach(item => {
            const dailyRate = item.consumed_30d / 30;
            if (dailyRate > 0 && item.current_qty > 0) {
                const daysUntilEmpty = Math.floor(item.current_qty / dailyRate);

                if (daysUntilEmpty <= 7) {
                    predictions.push({
                        item_name: item.item_name,
                        area: item.category,
                        current_qty: item.current_qty,
                        unit: item.unit,
                        daily_consumption: dailyRate.toFixed(2),
                        days_until_empty: daysUntilEmpty,
                        urgency: daysUntilEmpty <= 2 ? 'CRITICAL' : daysUntilEmpty <= 4 ? 'HIGH' : 'MODERATE',
                        message: `"${item.item_name}" will run out in ~${daysUntilEmpty} day(s) based on 30-day avg usage.`
                    });
                }

                // Suggest optimal restock quantity (2 weeks supply)
                const suggestedQty = Math.ceil(dailyRate * 14 - item.current_qty);
                if (suggestedQty > 0 && item.current_qty < item.min_level * 2) {
                    restockSuggestions.push({
                        item_name: item.item_name,
                        area: item.category,
                        current_qty: item.current_qty,
                        unit: item.unit,
                        suggested_restock: suggestedQty,
                        message: `Restock "${item.item_name}" with ~${suggestedQty} ${item.unit} to cover 2 weeks of demand.`
                    });
                }
            }
        });

        // Category-level waste analysis
        const [categoryWaste] = await pool.query(`
            SELECT i.category,
                   SUM(CASE WHEN sh.action_type = 'REDUCE' THEN sh.quantity ELSE 0 END) as consumed,
                   SUM(CASE WHEN sh.action_type IN ('ADD','RESTOCK') THEN sh.quantity ELSE 0 END) as added
            FROM stock_history sh
            JOIN inventory i ON sh.inventory_id = i.id
            WHERE sh.created_at >= ?
            GROUP BY i.category
        `, [thirtyDaysAgo]);

        categoryWaste.forEach(cat => {
            if (cat.added > 0) {
                const wasteRate = ((cat.added - cat.consumed) / cat.added * 100).toFixed(1);
                if (parseFloat(wasteRate) > 20) {
                    wasteWarnings.push({
                        category: cat.category,
                        waste_rate: wasteRate,
                        added: cat.added,
                        consumed: cat.consumed,
                        message: `${cat.category} category shows ${wasteRate}% potential wastage - added ${cat.added} units but only consumed ${cat.consumed}.`
                    });
                }
            }
        });

        res.json({
            generated_at: new Date().toISOString(),
            predictions: predictions.sort((a, b) => a.days_until_empty - b.days_until_empty),
            restock_suggestions: restockSuggestions,
            waste_warnings: wasteWarnings,
            summary: {
                items_at_risk: predictions.length,
                critical_count: predictions.filter(p => p.urgency === 'CRITICAL').length,
                high_count: predictions.filter(p => p.urgency === 'HIGH').length,
                restock_needed: restockSuggestions.length,
                waste_categories: wasteWarnings.length
            }
        });
    } catch (error) {
        console.error('AI insights error:', error);
        res.status(500).json({ message: 'Failed to generate AI insights', error: error.message });
    }
};

/**
 * POST /api/ai-assistant/chat
 * AI assistant for customer + inventory queries 
 */
export const aiAssistantChat = async (req, res) => {
    try {
        const { message, context = {} } = req.body;
        if (!message) return res.status(400).json({ message: 'Message required' });

        const text = message.toLowerCase();

        // -- Intent Classification --
        let intent = 'general';
        if (/table|seat|available|reservation|book|reserve|capacity|free table/.test(text)) intent = 'table';
        else if (/order status|track|my order|where.*order|preparing|ready|deliver/.test(text)) intent = 'order_status';
        else if (/menu|food|dish|eat|special|recommend|best|today/.test(text)) intent = 'menu';
        else if (/pay|payment|qr|bill|how to pay|method/.test(text)) intent = 'payment';
        else if (/cancel|modify|change|edit/.test(text)) intent = 'modify';
        else if (/help|how|guide|info|what can/.test(text)) intent = 'help';
        else if (/inventory|stock|low|restock|supply/.test(text)) intent = 'inventory';

        let response = { text: '', suggestions: [], data: null };

        switch (intent) {
            case 'table': {
                const today = new Date();
                const date = today.toISOString().split('T')[0];
                const time = today.toTimeString().substring(0, 5);
                try {
                    const [tables] = await pool.query(
                        `SELECT rt.id, rt.table_number, rt.capacity, rt.status,
                                da.area_name
                         FROM restaurant_tables rt
                         LEFT JOIN dining_areas da ON rt.area_id = da.id
                         WHERE rt.status = 'available'
                         ORDER BY rt.capacity`
                    );
                    if (tables.length > 0) {
                        response.text = `Great news! We currently have **${tables.length} tables available** 🪑\n\nAvailable options:\n${tables.slice(0, 5).map(t => `• Table ${t.table_number} (${t.area_name || 'Main Hall'}) — seats ${t.capacity}`).join('\n')}\n\nWould you like me to help you reserve one?`;
                        response.data = { available_tables: tables };
                        response.suggestions = ['Reserve a table', 'Table for 4 people', 'What areas do you have?'];
                    } else {
                        response.text = `All our tables are currently occupied or reserved. 😔\n\nI can help you make a reservation for a specific date & time! When would you like to visit?`;
                        response.suggestions = ['Reserve for tonight', 'Reserve for tomorrow', 'Check weekend availability'];
                    }
                } catch {
                    response.text = `Our dining areas are usually open from 10 AM to 11 PM. We have multiple seating areas! Would you like to make a reservation?`;
                    response.suggestions = ['Book a table', 'Call us directly'];
                }
                break;
            }

            case 'menu': {
                try {
                    const [menuItems] = await pool.query(
                        `SELECT mi.name, mi.price, mi.tags, c.name as category
                         FROM menu_items mi
                         JOIN categories c ON mi.category_id = c.id
                         WHERE mi.is_active = 1
                         ORDER BY RAND()
                         LIMIT 6`
                    );
                    if (menuItems.length > 0) {
                        response.text = `Here are some of our dishes today 🍽️\n\n${menuItems.map(m => `• **${m.name}** (${m.category}) — Rs. ${m.price}`).join('\n')}\n\nVisit our Menu page for the full selection with images!`;
                        response.data = { featured_items: menuItems };
                        response.suggestions = ['What are today\'s specials?', 'Vegetarian options', 'Best sellers'];
                    } else {
                        response.text = `Our menu is updated daily with fresh selections. Check our Menu page for the full list! 🍔🍕🥘`;
                        response.suggestions = ['View full menu'];
                    }
                } catch {
                    response.text = `We have a wide variety of dishes – from appetizers to main courses and desserts! Check our Menu page for the full selection. 🍽️`;
                    response.suggestions = ['View full menu'];
                }
                break;
            }

            case 'payment': {
                response.text = `We support multiple payment methods at Melissa's Food Court 💳\n\n• **QR Payment**: Scan the QR code at your table or in the app\n• **Cash**: Pay at the counter\n• **Card**: Debit/Credit cards accepted\n\n**How to pay by QR:**\n1. Open your camera app\n2. Scan the QR on your table\n3. Confirm the amount\n4. Payment is instant!\n\nNeed help with a specific payment?`;
                response.suggestions = ['How to scan QR?', 'Is card payment available?', 'Can I pay online?'];
                break;
            }

            case 'order_status': {
                response.text = `To track your order status, I need your order details 📦\n\nYou can:\n• **Log in** to your account and check "My Orders"\n• Ask me with your **Order ID** (e.g., "Track order #123")\n• Check the status in real-time on your account page\n\nAre you a logged-in customer?`;
                response.suggestions = ['I have an order ID', 'Login to account', 'How long does delivery take?'];
                break;
            }

            case 'modify': {
                response.text = `To modify or cancel an order 🔄\n\n• Orders can only be cancelled when **still Pending**\n• Go to Profile → My Orders → Select order → Cancel\n• For delivery orders, contact us immediately\n\n⚠️ Once an order moves to "Preparing" status, cancellation is not possible.\n\nNeed anything else?`;
                response.suggestions = ['Cancel my order', 'Change my table', 'Edit reservation'];
                break;
            }

            case 'inventory': {
                try {
                    const [lowStock] = await pool.query(
                        `SELECT item_name, quantity, unit, status FROM inventory WHERE status != 'Available' LIMIT 5`
                    );
                    if (lowStock.length > 0) {
                        response.text = `📊 Current Inventory Status:\n\n${lowStock.map(i => `• ${i.item_name}: ${i.quantity} ${i.unit} (${i.status})`).join('\n')}\n\nThere are ${lowStock.length} items needing attention. Would you like to see the full report?`;
                    } else {
                        response.text = `✅ Great news! All inventory items are at healthy levels right now.`;
                    }
                } catch {
                    response.text = `Inventory information requires manager access. If you're staff, please check the Inventory Dashboard.`;
                }
                response.suggestions = ['Show low stock items', 'View full inventory', 'When is next restock?'];
                break;
            }

            case 'help': {
                response.text = `Hi! I'm **Melissa**, your smart assistant at Melissa's Food Court! 🤖✨\n\nHere's what I can help you with:\n\n🪑 **Tables** — Check availability, make reservations\n🍽️ **Menu** — Browse dishes, specials, recommendations\n📦 **Orders** — Track status, modify, cancel\n💳 **Payments** — QR codes, payment methods\n📅 **Reservations** — Book, edit, cancel\n\nJust ask me naturally! Example: *"Is there a table for 4?"*`;
                response.suggestions = ['Check tables', 'Today\'s menu', 'Track my order', 'How to pay?'];
                break;
            }

            default: {
                response.text = `I'm not quite sure what you're asking, but I'm here to help! 😊\n\nI can assist with:\n• Table availability & reservations\n• Menu & food recommendations\n• Order tracking\n• Payment options\n\nWhat can I help you with?`;
                response.suggestions = ['Check tables', 'View menu', 'Track order', 'Payment help'];
            }
        }

        res.json({
            intent,
            response: response.text,
            suggestions: response.suggestions,
            data: response.data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('AI assistant error:', error);
        res.status(500).json({ message: 'AI assistant error', error: error.message });
    }
};
