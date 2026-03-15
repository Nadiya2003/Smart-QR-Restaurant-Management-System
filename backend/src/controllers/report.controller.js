import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import path from 'path';

/**
 * Common filter builder for reports
 */
const buildFilterQuery = (startDate, endDate, hourStart, hourEnd) => {
    let where = " WHERE 1=1 ";
    const params = [];

    if (startDate) {
        where += " AND created_at >= ? ";
        params.push(startDate);
    }
    if (endDate) {
        where += " AND created_at <= ? ";
        params.push(endDate + " 23:59:59");
    }
    if (hourStart !== undefined && hourEnd !== undefined) {
        where += " AND HOUR(created_at) BETWEEN ? AND ? ";
        params.push(hourStart, hourEnd);
    }

    return { where, params };
};

const logReport = async (type, filters, userId) => {
    try {
        await pool.query(
            "INSERT INTO report_logs (report_type, filters_used, generated_by) VALUES (?, ?, ?)",
            [type, JSON.stringify(filters), userId]
        );
    } catch (e) {
        console.error("Log report error:", e.message);
    }
};

export const getFoodReport = async (req, res) => {
    try {
        const { startDate, endDate, hourStart, hourEnd, category } = req.query;
        await logReport('Food Wise', req.query, req.user?.userId);
        let { where, params } = buildFilterQuery(startDate, endDate, hourStart, hourEnd);

        if (category && category !== 'All') {
            where += " AND category_name = ? ";
            params.push(category);
        }

        const [items] = await pool.query(`
            SELECT item_name, category_name, SUM(quantity) as total_sold, SUM(total_price) as revenue
            FROM order_analytics
            ${where}
            GROUP BY item_name, category_name
            ORDER BY total_sold DESC
        `, params);

        const [categories] = await pool.query(`
            SELECT category_name, SUM(quantity) as count, SUM(total_price) as revenue
            FROM order_analytics
            ${where}
            GROUP BY category_name
        `, params);

        res.json({ items, categories });
    } catch (err) {
        res.status(500).json({ message: 'Food report error', error: err.message });
    }
};

export const getRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate, hourStart, hourEnd, paymentMethod, orderType } = req.query;
        await logReport('Revenue', req.query, req.user?.userId);
        let { where, params } = buildFilterQuery(startDate, endDate, hourStart, hourEnd);

        if (paymentMethod && paymentMethod !== 'All') {
            // This is simplified as order_analytics doesn't have paymentMethod yet
            // In a real system we'd join with orders/delivery_orders
        }

        const [trend] = await pool.query(`
            SELECT DATE(created_at) as date, SUM(total_price) as revenue, COUNT(DISTINCT order_id) as orders
            FROM order_analytics
            ${where}
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, params);

        const [bySource] = await pool.query(`
            SELECT order_source as type, SUM(total_price) as revenue, COUNT(DISTINCT order_id) as count
            FROM order_analytics
            ${where}
            GROUP BY order_source
        `, params);

        res.json({ trend, bySource });
    } catch (err) {
        res.status(500).json({ message: 'Revenue report error', error: err.message });
    }
};

export const getOrdersReport = async (req, res) => {
    try {
        const { startDate, endDate, hourStart, hourEnd } = req.query;
        await logReport('Orders', req.query, req.user?.userId);
        let { where, params } = buildFilterQuery(startDate, endDate, hourStart, hourEnd);

        const [byStatus] = await pool.query(`
            SELECT order_status as status, COUNT(*) as count, SUM(total_price) as revenue
            FROM (
                SELECT id, order_status, total_price, created_at FROM delivery_orders
                UNION ALL
                SELECT id, order_status, total_price, created_at FROM takeaway_orders
            ) as combined
            ${where}
            GROUP BY order_status
        `, params);

        res.json({ byStatus });
    } catch (err) {
        res.status(500).json({ message: 'Orders report error', error: err.message });
    }
};

export const getCancellationsReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        await logReport('Cancellations', req.query, req.user?.userId);
        let where = " WHERE 1=1 ";
        const params = [];
        if (startDate) { where += " AND created_at >= ? "; params.push(startDate); }
        if (endDate) { where += " AND created_at <= ? "; params.push(endDate + " 23:59:59"); }

        const [deliveryCancels] = await pool.query(`
            SELECT cancellation_reason, COUNT(*) as count FROM cancel_deliveries ${where} GROUP BY cancellation_reason
        `, params);

        const [takeawayCancels] = await pool.query(`
            SELECT cancellation_reason, COUNT(*) as count FROM cancel_takeaways ${where} GROUP BY cancellation_reason
        `, params);

        res.json({ deliveryCancels, takeawayCancels });
    } catch (err) {
        res.status(500).json({ message: 'Cancellations report error', error: err.message });
    }
};

export const getCustomersReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        await logReport('Customers', req.query, req.user?.userId);
        
        const [total] = await pool.query("SELECT COUNT(*) as count FROM online_customers");
        const [newThisWeek] = await pool.query("SELECT COUNT(*) as count FROM online_customers WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        
        const [loyal] = await pool.query(`
            SELECT customer_name as name, COUNT(*) as order_count, SUM(total_price) as total_spent
            FROM (
                SELECT customer_name, total_price FROM delivery_orders
                UNION ALL
                SELECT customer_name, total_price FROM takeaway_orders
            ) as combined
            GROUP BY customer_name
            ORDER BY order_count DESC
            LIMIT 10
        `);

        res.json({ summary: { total: total[0].count, newThisWeek: newThisWeek[0].count }, loyal });
    } catch (err) {
        res.status(500).json({ message: 'Customer report error', error: err.message });
    }
};

export const getStaffReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let where = " WHERE 1=1 ";
        const params = [];
        if (startDate) { where += " AND date >= ? "; params.push(startDate); }
        if (endDate) { where += " AND date <= ? "; params.push(endDate); }

        const [attendance] = await pool.query(`
            SELECT su.full_name, COUNT(*) as days_present, 
                   AVG(TIMESTAMPDIFF(HOUR, login_time, IFNULL(logout_time, NOW()))) as avg_hours
            FROM staff_attendance a
            JOIN staff_users su ON a.staff_id = su.id
            ${where}
            GROUP BY su.id
        `, params);

        res.json({ attendance });
    } catch (err) {
        res.status(500).json({ message: 'Staff report error', error: err.message });
    }
};

export const getSupplierReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        await logReport('Supplier Purchase', req.query, req.user?.userId);
        
        const [purchases] = await pool.query(`
            SELECT s.name as supplier_name, i.item_name, i.quantity, i.unit, i.last_updated
            FROM inventory i
            JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.last_updated >= ? AND i.last_updated <= ?
        `, [startDate || '2000-01-01', (endDate || '2100-01-01') + " 23:59:59"]);

        res.json({ purchases });
    } catch (err) {
        res.status(500).json({ message: 'Supplier report error', error: err.message });
    }
};

export const generateUnifiedReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        let data = [];
        let summary = { totalRevenue: 0, totalOrders: 0, mostOrderedItems: [] };
        let title = "Business Report";

        switch (type) {
            case 'revenue':
                title = "Revenue Analytics Report";
                const [revTrend] = await pool.query(`
                    SELECT DATE(created_at) as date, SUM(total_price) as revenue, COUNT(DISTINCT order_id) as orders
                    FROM order_analytics
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY DATE(created_at)
                `, [startDate, endDate + " 23:59:59"]);
                data = revTrend;
                summary.totalRevenue = revTrend.reduce((acc, curr) => acc + Number(curr.revenue), 0);
                summary.totalOrders = revTrend.reduce((acc, curr) => acc + Number(curr.orders), 0);
                break;

            case 'food':
                title = "Food Sales Report";
                const [foodSales] = await pool.query(`
                    SELECT item_name, category_name, SUM(quantity) as total_sold, SUM(total_price) as revenue
                    FROM order_analytics
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY item_name, category_name
                    ORDER BY total_sold DESC
                `, [startDate, endDate + " 23:59:59"]);
                data = foodSales;
                summary.totalRevenue = foodSales.reduce((acc, curr) => acc + Number(curr.revenue), 0);
                summary.totalOrders = foodSales.reduce((acc, curr) => acc + Number(curr.total_sold), 0);
                summary.mostOrderedItems = foodSales.slice(0, 3).map(i => i.item_name);
                break;

            case 'orders':
                title = "Order Summary Report";
                const [orderSummary] = await pool.query(`
                    SELECT order_status as status, COUNT(*) as count, SUM(total_price) as revenue
                    FROM (
                        SELECT id, order_status, total_price, created_at FROM delivery_orders
                        UNION ALL
                        SELECT id, order_status, total_price, created_at FROM takeaway_orders
                    ) as combined
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY order_status
                `, [startDate, endDate + " 23:59:59"]);
                data = orderSummary;
                summary.totalRevenue = orderSummary.reduce((acc, curr) => acc + Number(curr.revenue), 0);
                summary.totalOrders = orderSummary.reduce((acc, curr) => acc + Number(curr.count), 0);
                break;

            case 'supplier':
                title = "Supplier Purchase Report";
                const [supplierData] = await pool.query(`
                    SELECT s.name as supplier, i.item_name, i.quantity, i.unit, i.last_updated as date
                    FROM inventory i
                    JOIN suppliers s ON i.supplier_id = s.id
                    WHERE i.last_updated >= ? AND i.last_updated <= ?
                `, [startDate, endDate + " 23:59:59"]);
                data = supplierData;
                summary.totalOrders = supplierData.length;
                break;

            case 'cancellations':
                title = "Order Cancellations Report";
                const [cancellations] = await pool.query(`
                    SELECT order_id, item_name, total_price as lost_revenue, created_at as date
                    FROM order_analytics
                    WHERE order_status = 'cancelled' AND created_at >= ? AND created_at <= ?
                `, [startDate, endDate + " 23:59:59"]);
                data = cancellations;
                summary.totalRevenue = cancellations.reduce((acc, curr) => acc + Number(curr.lost_revenue), 0);
                summary.totalOrders = cancellations.length;
                break;

            case 'customers':
                title = "Customer Activity Report";
                const [customerData] = await pool.query(`
                    SELECT name, email, phone, created_at as join_date, status
                    FROM users
                    WHERE role = 'CUSTOMER' AND created_at >= ? AND created_at <= ?
                `, [startDate, endDate + " 23:59:59"]);
                data = customerData;
                summary.totalOrders = customerData.length;
                break;

            case 'staff':
                title = "Staff Performance Report";
                const [staffPerformance] = await pool.query(`
                    SELECT su.full_name, su.role, COUNT(a.id) as attendance_days, 
                           SUM(TIMESTAMPDIFF(HOUR, a.login_time, IFNULL(a.logout_time, NOW()))) as total_hours
                    FROM staff_users su
                    LEFT JOIN staff_attendance a ON su.id = a.staff_id
                    WHERE su.created_at >= ? AND su.created_at <= ?
                    GROUP BY su.id
                `, [startDate, endDate + " 23:59:59"]);
                data = staffPerformance;
                summary.totalOrders = staffPerformance.length;
                break;

            default:
                return res.status(400).json({ message: 'Invalid report type' });
        }

        // Save report to history
        const [result] = await pool.query(
            "INSERT INTO reports (title, report_type, summary_data, data_json, generated_by) VALUES (?, ?, ?, ?, ?)",
            [title, type, JSON.stringify(summary), JSON.stringify(data), req.user?.userId]
        );

        res.json({ id: result.insertId, title, data, summary });
    } catch (err) {
        console.error('Unified report error:', err);
        res.status(500).json({ message: 'Report generation failed', error: err.message });
    }
};

export const generatePdfReport = async (req, res) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        const fileName = `report_${Date.now()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        doc.pipe(res);

        // Header
        const logoPath = path.resolve('public/logo.png');
        try {
            doc.image(logoPath, 50, 45, { width: 50 });
        } catch (e) {
            console.warn('Logo not found for PDF');
        }

        doc.fillColor('#D4AF37')
           .fontSize(20)
           .text("Melissa's Food Court Sales Report", 110, 57);

        doc.moveDown();
        doc.strokeColor('#333').lineWidth(1).moveTo(50, 100).lineTo(550, 100).stroke();

        // Sample Data
        const sampleData = [
            { date: 'Day 1', orders: 25, revenue: 18000, cancelled: 2 },
            { date: 'Day 2', orders: 32, revenue: 22500, cancelled: 1 },
            { date: 'Day 3', orders: 28, revenue: 20000, cancelled: 3 },
            { date: 'Day 4', orders: 40, revenue: 31000, cancelled: 2 },
            { date: 'Day 5', orders: 30, revenue: 24500, cancelled: 1 },
            { date: 'Day 6', orders: 35, revenue: 27000, cancelled: 0 },
            { date: 'Day 7', orders: 45, revenue: 36000, cancelled: 4 },
            { date: 'Day 8', orders: 38, revenue: 29000, cancelled: 2 },
            { date: 'Day 9', orders: 41, revenue: 33500, cancelled: 1 },
            { date: 'Day 10', orders: 50, revenue: 42000, cancelled: 3 },
        ];

        const totalOrders = sampleData.reduce((sum, d) => sum + d.orders, 0);
        const totalRevenue = sampleData.reduce((sum, d) => sum + d.revenue, 0);
        const totalCancelled = sampleData.reduce((sum, d) => sum + d.cancelled, 0);

        // Summary
        doc.moveDown(2);
        doc.fontSize(14).fillColor('#000').text("Report Summary:", { underline: true });
        doc.fontSize(12).moveDown(0.5);
        doc.text(`Total Orders: ${totalOrders}`);
        doc.text(`Total Revenue: Rs. ${totalRevenue.toLocaleString()}`);
        doc.text(`Total Cancelled Orders: ${totalCancelled}`);

        // Table Header
        doc.moveDown(2);
        const tableTop = 270;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Date', 50, tableTop);
        doc.text('Orders', 150, tableTop);
        doc.text('Revenue', 250, tableTop);
        doc.text('Cancelled Orders', 400, tableTop);

        doc.strokeColor('#eee').lineWidth(1).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table Content
        doc.font('Helvetica').fontSize(10);
        let rowTop = tableTop + 30;
        sampleData.forEach(item => {
            doc.text(item.date, 50, rowTop);
            doc.text(item.orders.toString(), 150, rowTop);
            doc.text(`Rs. ${item.revenue.toLocaleString()}`, 250, rowTop);
            doc.text(item.cancelled.toString(), 400, rowTop);
            rowTop += 25;
        });

        // Footer
        doc.fontSize(10).fillColor('#888').text(
            `Generated by Melissa's Food Court Admin Dashboard`,
            50, rowTop + 50, { align: 'center' }
        );
        doc.text(
            `Generated Date & Time: ${new Date().toLocaleString()}`,
            50, rowTop + 65, { align: 'center' }
        );

        doc.end();
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
    }
};
