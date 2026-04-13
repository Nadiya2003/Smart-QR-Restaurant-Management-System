import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

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
                UNION ALL
                SELECT order_id as id, order_status, SUM(total_price) as total_price, created_at FROM order_analytics WHERE order_source = 'DINE-IN' GROUP BY order_id, order_status, created_at
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
                UNION ALL
                SELECT 'DINE-IN GUEST' as customer_name, SUM(total_price) as total_price FROM order_analytics WHERE order_source = 'DINE-IN' GROUP BY order_id
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
                   AVG(TIMESTAMPDIFF(HOUR, check_in_time, IFNULL(check_out_time, NOW()))) as avg_hours
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
                    SELECT 
                        DATE(created_at) as date, 
                        SUM(CASE WHEN order_status != 'cancelled' THEN total_price ELSE 0 END) as revenue,
                        SUM(CASE WHEN order_status = 'cancelled' THEN total_price ELSE 0 END) as lost,
                        SUM(CASE WHEN order_status != 'cancelled' THEN profit ELSE 0 END) as profit,
                        COUNT(DISTINCT order_id) as orders
                    FROM order_analytics
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY DATE(created_at)
                `, [startDate, endDate + " 23:59:59"]);
                data = revTrend;
                summary.totalRevenue = revTrend.reduce((acc, curr) => acc + Number(curr.revenue), 0);
                summary.totalLost = revTrend.reduce((acc, curr) => acc + Number(curr.lost), 0);
                summary.totalProfit = revTrend.reduce((acc, curr) => acc + Number(curr.profit), 0);
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
                    SELECT status, COUNT(*) as count, SUM(total_price) as revenue
                    FROM (
                        SELECT order_status as status, total_price, created_at FROM delivery_orders
                        UNION ALL
                        SELECT order_status as status, total_price, created_at FROM takeaway_orders
                        UNION ALL
                        SELECT order_status as status, SUM(total_price) as total_price, created_at 
                        FROM order_analytics 
                        WHERE order_source = 'DINE-IN' 
                        GROUP BY order_id, order_status, created_at
                    ) as combined
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY status
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
                    SELECT name, email, phone, created_at as join_date, is_active as status
                    FROM online_customers
                    WHERE created_at >= ? AND created_at <= ?
                `, [startDate, endDate + " 23:59:59"]);
                data = customerData;
                summary.totalOrders = customerData.length;
                break;

            case 'staff':
                title = "Staff Performance Report";
                const [staffPerformance] = await pool.query(`
                    SELECT su.full_name, sr.role_name as role, COUNT(a.id) as attendance_days, 
                           SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, IFNULL(a.check_out_time, NOW()))) as total_hours
                    FROM staff_users su
                    LEFT JOIN staff_roles sr ON su.role_id = sr.id
                    LEFT JOIN staff_attendance a ON su.id = a.staff_id
                    WHERE su.created_at >= ? AND su.created_at <= ?
                    GROUP BY su.id, sr.role_name
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
        const { type, startDate, endDate } = req.query;
        
        // 1. Fetch data similar to generateUnifiedReport logic
        let data = [];
        let title = "Business Report";
        let summary = { totalRevenue: 0, totalOrders: 0 };

        // For simplicity, we reuse the query logic but tailored for PDF
        // Re-calculate or re-fetch (Ideally we'd have a helper)
        switch (type) {
            case 'revenue':
                title = "Revenue Analytics Report";
                const [revRows] = await pool.query(`
                    SELECT 
                        DATE(created_at) as date, 
                        SUM(CASE WHEN order_status != 'cancelled' THEN total_price ELSE 0 END) as revenue,
                        SUM(CASE WHEN order_status = 'cancelled' THEN total_price ELSE 0 END) as lost,
                        SUM(CASE WHEN order_status != 'cancelled' THEN profit ELSE 0 END) as profit,
                        COUNT(DISTINCT order_id) as orders
                    FROM order_analytics
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY DATE(created_at) ORDER BY date ASC
                `, [startDate, endDate + " 23:59:59"]);
                data = revRows;
                summary.totalRevenue = revRows.reduce((acc, curr) => acc + Number(curr.revenue), 0);
                summary.totalLost = revRows.reduce((acc, curr) => acc + Number(curr.lost), 0);
                summary.totalProfit = revRows.reduce((acc, curr) => acc + Number(curr.profit), 0);
                summary.totalOrders = revRows.reduce((acc, curr) => acc + Number(curr.orders), 0);
                break;

            case 'food':
            case 'food-wise':
                title = "Food Sales Report";
                const [foodRows] = await pool.query(`
                    SELECT item_name, category_name, SUM(quantity) as sold, SUM(total_price) as revenue
                    FROM order_analytics
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY item_name, category_name ORDER BY sold DESC
                `, [startDate, endDate + " 23:59:59"]);
                data = foodRows;
                summary.totalRevenue = foodRows.reduce((acc, curr) => acc + Number(curr.revenue), 0);
                summary.totalOrders = foodRows.reduce((acc, curr) => acc + Number(curr.sold), 0);
                break;

            case 'orders':
                title = "Order Summary Report";
                const [orderSummary] = await pool.query(`
                    SELECT status, COUNT(*) as count, SUM(total_price) as revenue
                    FROM (
                        SELECT order_status as status, total_price, created_at FROM delivery_orders
                        UNION ALL
                        SELECT order_status as status, total_price, created_at FROM takeaway_orders
                        UNION ALL
                        SELECT order_status as status, SUM(total_price) as total_price, created_at 
                        FROM order_analytics 
                        WHERE order_source = 'DINE-IN' 
                        GROUP BY order_id, order_status, created_at
                    ) as combined
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY status
                `, [startDate, endDate + " 23:59:59"]);
                data = orderSummary;
                summary.totalRevenue = orderSummary.reduce((acc, curr) => acc + Number(curr.revenue), 0);
                summary.totalOrders = orderSummary.reduce((acc, curr) => acc + Number(curr.count), 0);
                break;

            case 'customers':
                title = "Customer Activity Report";
                const [customerData] = await pool.query(`
                    SELECT name, email, phone, created_at as join_date, is_active as status
                    FROM online_customers
                    WHERE created_at >= ? AND created_at <= ?
                `, [startDate, endDate + " 23:59:59"]);
                data = customerData;
                summary.totalOrders = customerData.length;
                break;

            case 'staff':
                title = "Staff Performance Report";
                const [staffPerformance] = await pool.query(`
                    SELECT su.full_name, sr.role_name as role, COUNT(a.id) as attendance_days, 
                           SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, IFNULL(a.check_out_time, NOW()))) as total_hours
                    FROM staff_users su
                    LEFT JOIN staff_roles sr ON su.role_id = sr.id
                    LEFT JOIN staff_attendance a ON su.id = a.staff_id
                    WHERE su.created_at >= ? AND su.created_at <= ?
                    GROUP BY su.id, sr.role_name
                `, [startDate, endDate + " 23:59:59"]);
                data = staffPerformance;
                summary.totalOrders = staffPerformance.length;
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

            default:
                title = "Order History Report";
                const [defaultRows] = await pool.query(`
                    SELECT order_id, order_source, item_name, quantity, total_price, created_at
                    FROM order_analytics
                    WHERE created_at >= ? AND created_at <= ?
                    ORDER BY created_at DESC
                `, [startDate, endDate + " 23:59:59"]);
                data = defaultRows;
                summary.totalRevenue = defaultRows.reduce((acc, curr) => acc + Number(curr.total_price), 0);
                summary.totalOrders = defaultRows.length;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `Report_${type || 'business'}_${dateStr}.pdf`;

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        doc.pipe(res);

        // ── Invoice Style Header ──
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 60 });
        }

        doc.fillColor('#111827')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text("MELISSA'S FOOD COURT", 120, 45);
           
        doc.fillColor('#6B7280')
           .fontSize(10)
           .font('Helvetica')
           .text("145 Main Courtyard, Culinary District\nColombo, Sri Lanka\nTel: +94 112 345 678", 120, 70);

        doc.fillColor('#D4AF37')
           .fontSize(18)
           .font('Helvetica-Bold')
           .text("REPORT INVOICE", 50, 45, { align: 'right' });
           
        doc.fillColor('#4B5563')
           .fontSize(10)
           .font('Helvetica')
           .text(`Generated: ${dateStr}\nReport Type: ${title}\nPeriod: ${startDate} to ${endDate}`, 50, 65, { align: 'right' });

        // Header bottom borderline
        doc.strokeColor('#D4AF37').lineWidth(2).moveTo(50, 125).lineTo(560, 125).stroke();

        // Summary Cards
        doc.moveDown(2);
        const startY = doc.y;
        doc.rect(50, startY, 240, 60).fill('#f9f9f9').stroke('#eee');
        doc.rect(300, startY, 240, 60).fill('#f9f9f9').stroke('#eee');
        
        doc.fillColor('#666').fontSize(10).text("TOTAL REVENUE", 70, startY + 15);
        doc.fillColor('#000').fontSize(16).font('Helvetica-Bold').text(`Rs. ${summary.totalRevenue.toLocaleString()}`, 70, startY + 30);
        
        doc.fillColor('#666').fontSize(10).font('Helvetica').text("TOTAL ENTRIES", 320, startY + 15);
        doc.fillColor('#000').fontSize(16).font('Helvetica-Bold').text(`${summary.totalOrders}`, 320, startY + 30);

        // Table
        doc.moveDown(4);
        doc.fillColor('#D4AF37').fontSize(12).text("Detailed Data Table:", { underline: true });
        doc.moveDown();

        const tableTop = doc.y;
        const colWidths = [150, 100, 100, 100];
        const headers = data.length > 0 ? Object.keys(data[0]) : [];

        // Draw Headers
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
        let currentX = 50;
        headers.slice(0, 4).forEach((h, i) => {
            doc.text(h.toUpperCase().replace('_', ' '), currentX, tableTop);
            currentX += colWidths[i] || 100;
        });

        doc.strokeColor('#eee').lineWidth(1).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Draw Rows
        doc.font('Helvetica').fontSize(9);
        let rowY = tableTop + 25;
        data.slice(0, 50).forEach(row => { // Limit to 50 rows for PDF safety
            if (rowY > 700) { doc.addPage(); rowY = 50; }
            let itemX = 50;
            Object.values(row).slice(0, 4).forEach((val, i) => {
                let displayVal = val;
                if (val instanceof Date) displayVal = val.toLocaleDateString();
                doc.text(String(displayVal), itemX, rowY);
                itemX += colWidths[i] || 100;
            });
            rowY += 20;
        });

        // Footer
        doc.fontSize(8).fillColor('#999').text(
            `Generated on ${new Date().toLocaleString()} | melissasfoodcourt.com`,
            50, 750, { align: 'center' }
        );

        doc.end();
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
    }
};
