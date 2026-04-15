import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';


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
        const { startDate, endDate } = req.query;
        const data = await getReportDataInternal('FOOD_WISE', startDate, endDate, req.user);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Food report error', error: err.message });
    }
};

export const getRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await getReportDataInternal('REVENUE', startDate, endDate, req.user);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Revenue report error', error: err.message });
    }
};

export const getOrdersReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await getReportDataInternal('ORDERS', startDate, endDate, req.user);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Orders report error', error: err.message });
    }
};

export const getCancellationsReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await getReportDataInternal('CANCELLATIONS', startDate, endDate, req.user);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Cancellations report error', error: err.message });
    }
};

export const getCustomersReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await getReportDataInternal('CUSTOMERS', startDate, endDate, req.user);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Customer report error', error: err.message });
    }
};

export const getStaffReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await getReportDataInternal('STAFF', startDate, endDate, req.user);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Staff report error', error: err.message });
    }
};

export const getSupplierReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await getReportDataInternal('INVENTORY', startDate, endDate, req.user);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Supplier report error', error: err.message });
    }
};

export const generateUnifiedReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        if (!type || !startDate || !endDate) {
            return res.status(400).json({ message: 'Missing required filters (type, startDate, endDate)' });
        }

        const report = await getReportDataInternal(type, startDate, endDate, req.user);
        res.json(report);
    } catch (err) {
        console.error('Unified report error:', err);
        res.status(500).json({ message: 'Report generation failed', error: err.message });
    }
};

/**
 * CORE LOGIC: Fetches and Structures Dashboard Data
 */
async function getReportDataInternal(type, startDate, endDate, user) {
    await logReport(type, { startDate, endDate }, user?.userId);
    const typeUpper = type.toUpperCase().replace('-', '_');
    const start = startDate;
    const end = endDate + " 23:59:59";
    
    let report = {
        metadata: {
            businessName: "MELISSA'S FOOD COURT",
            reportType: typeUpper,
            generatedBy: user?.role || 'Admin',
            dateRange: `${startDate} to ${endDate}`,
            generatedAt: new Date().toLocaleString()
        },
        summary: {
            recordsCount: 0,
            successful: 0,
            pending: 0,
            failed: 0,
            totalValue: 0,
            revenue: 0,
            profit: 0
        },
        visuals: {
            pie: { labels: [], datasets: [{ data: [], backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'] }] },
            bar: { labels: [], datasets: [{ label: 'Performance', data: [], backgroundColor: '#3B82F6' }] },
            line: { labels: [], datasets: [{ label: 'Trend', data: [], borderColor: '#10B981', fill: false }] },
            doughnut: { labels: [], datasets: [{ data: [], backgroundColor: ['#10B981', '#E5E7EB'] }] }
        },
        table: { headers: [], rows: [] },
        breakdown: { status: {}, category: {}, payment: {} },
        insights: [],
        alerts: [],
        recommendations: []
    };

    switch (typeUpper) {
        case 'REVENUE':
        case 'SALES':
            const [revRows] = await pool.query(`
                SELECT DATE(created_at) as date, SUM(total_price) as revenue, SUM(profit) as profit, 
                       COUNT(DISTINCT order_id) as orders, payment_method, order_source, order_status
                FROM order_analytics
                WHERE created_at >= ? AND created_at <= ?
                GROUP BY DATE(created_at), payment_method, order_source, order_status
            `, [start, end]);

            report.summary.revenue = revRows.reduce((a, r) => a + Number(r.revenue), 0);
            report.summary.profit = revRows.reduce((a, r) => a + Number(r.profit), 0);
            report.summary.recordsCount = revRows.reduce((a, r) => a + Number(r.orders), 0);
            report.summary.successful = revRows.filter(r => r.order_status !== 'cancelled').reduce((a, r) => a + Number(r.orders), 0);
            report.summary.failed = revRows.filter(r => r.order_status === 'cancelled').reduce((a, r) => a + Number(r.orders), 0);
            
            // Build Line Chart (Trend)
            const trendMap = {};
            revRows.forEach(r => {
                const d = r.date.toLocaleDateString();
                trendMap[d] = (trendMap[d] || 0) + Number(r.revenue);
            });
            report.visuals.line.labels = Object.keys(trendMap);
            report.visuals.line.datasets[0].data = Object.values(trendMap);

            // Breakdown & Pie (Payment Methods)
            const pmMap = {};
            revRows.forEach(r => { pmMap[r.payment_method] = (pmMap[r.payment_method] || 0) + Number(r.revenue); });
            report.visuals.pie.labels = Object.keys(pmMap);
            report.visuals.pie.datasets[0].data = Object.values(pmMap);
            report.breakdown.payment = pmMap;

            report.table.headers = ['Date', 'Method', 'Source', 'Orders', 'Revenue', 'Profit'];
            report.table.rows = revRows.slice(0, 50).map(r => [r.date.toLocaleDateString(), r.payment_method, r.order_source, r.orders, `Rs.${r.revenue}`, `Rs.${r.profit}`]);

            report.insights.push(`${Object.keys(pmMap).sort((a,b) => pmMap[b]-pmMap[a])[0] || 'N/A'} is your top payment method.`);
            if (report.summary.failed > 5) report.alerts.push("High number of cancelled orders detected! Review floor operations.");
            report.recommendations.push("Consider promotional offers for low-revenue days identified in the trend.");
            break;

        case 'ORDERS':
            const [orderRows] = await pool.query(`
                SELECT order_status, COUNT(*) as count, SUM(total_price) as revenue FROM (
                    SELECT order_status, total_price, created_at FROM delivery_orders
                    UNION ALL
                    SELECT order_status, total_price, created_at FROM takeaway_orders
                    UNION ALL
                    SELECT order_status, SUM(total_price) as total_price, created_at FROM order_analytics WHERE order_source = 'DINE-IN' GROUP BY order_id, order_status, created_at
                ) as combined
                WHERE created_at >= ? AND created_at <= ?
                GROUP BY order_status
            `, [start, end]);
            report.summary.recordsCount = orderRows.reduce((a, r) => a + r.count, 0);
            report.summary.successful = orderRows.filter(r => !['cancelled', 'failed'].includes(r.order_status)).reduce((a, r) => a + r.count, 0);
            report.summary.failed = orderRows.filter(r => ['cancelled', 'failed'].includes(r.order_status)).reduce((a, r) => a + r.count, 0);
            report.summary.revenue = orderRows.reduce((a, r) => a + Number(r.revenue), 0);

            report.visuals.pie.labels = orderRows.map(r => r.order_status.toUpperCase());
            report.visuals.pie.datasets[0].data = orderRows.map(r => r.count);

            report.table.headers = ['Status', 'Total Orders', 'Revenue'];
            report.table.rows = orderRows.map(r => [r.order_status, r.count, `Rs.${r.revenue}`]);
            break;

        case 'CANCELLATIONS':
            const [cancelRows] = await pool.query(`
                SELECT order_source, item_name, total_price as lost_revenue, created_at FROM order_analytics
                WHERE order_status = 'cancelled' AND created_at >= ? AND created_at <= ?
            `, [start, end]);
            report.summary.recordsCount = cancelRows.length;
            report.summary.totalValue = cancelRows.reduce((a, r) => a + Number(r.lost_revenue), 0);
            
            const srcCancelMap = {};
            cancelRows.forEach(r => { srcCancelMap[r.order_source] = (srcCancelMap[r.order_source] || 0) + 1; });
            report.visuals.bar.labels = Object.keys(srcCancelMap);
            report.visuals.bar.datasets[0].data = Object.values(srcCancelMap);

            report.table.headers = ['Item', 'Source', 'Lost Revenue', 'Date'];
            report.table.rows = cancelRows.map(r => [r.item_name, r.order_source, `Rs.${r.lost_revenue}`, r.created_at.toLocaleDateString()]);
            
            report.alerts.push(`Rs.${report.summary.totalValue} lost due to cancellations.`);
            report.recommendations.push("Identify recurring cancellation reasons and resolve internal bottlenecks.");
            break;

        case 'CUSTOMERS':
            const [custRows] = await pool.query(`
                SELECT name, email, phone, created_at, status FROM online_customers
                WHERE created_at >= ? AND created_at <= ?
            `, [start, end]);
            report.summary.recordsCount = custRows.length;
            report.summary.successful = custRows.filter(c => c.status === 'active').length;
            
            report.visuals.line.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            report.visuals.line.datasets[0].data = [10, 25, 15, 30]; // Placeholder for demographic trend

            report.table.headers = ['Name', 'Email', 'Phone', 'Join Date'];
            report.table.rows = custRows.map(c => [c.name, c.email, c.phone, c.created_at.toLocaleDateString()]);
            break;

        case 'RESERVATIONS':
            const [resRows] = await pool.query(`
                SELECT reservation_date, status, COUNT(*) as count 
                FROM reservations 
                WHERE reservation_date >= ? AND reservation_date <= ?
                GROUP BY reservation_date, status
            `, [startDate, endDate]);
            report.summary.recordsCount = resRows.reduce((a, r) => a + r.count, 0);
            report.summary.successful = resRows.filter(r => r.status === 'confirmed').reduce((a, r) => a + r.count, 0);
            
            report.visuals.bar.labels = [...new Set(resRows.map(r => new Date(r.reservation_date).toLocaleDateString()))].slice(0, 10);
            report.visuals.bar.datasets[0].data = report.visuals.bar.labels.map(l => 
                resRows.filter(r => new Date(r.reservation_date).toLocaleDateString() === l).reduce((a, r) => a + r.count, 0)
            );

            report.table.headers = ['Date', 'Status', 'Bookings'];
            report.table.rows = resRows.map(r => [new Date(r.reservation_date).toLocaleDateString(), r.status, r.count]);
            break;

        case 'FOOD_WISE':
        case 'FOOD':
            const [foodRows] = await pool.query(`
                SELECT item_name, category_name, SUM(quantity) as sold, SUM(total_price) as revenue
                FROM order_analytics
                WHERE created_at >= ? AND created_at <= ?
                GROUP BY item_name, category_name ORDER BY sold DESC
            `, [start, end]);

            report.summary.totalValue = foodRows.reduce((a, r) => a + Number(r.revenue), 0);
            report.summary.recordsCount = foodRows.length;
            report.summary.successful = foodRows.reduce((a, r) => a + Number(r.sold), 0);

            report.visuals.bar.labels = foodRows.slice(0, 7).map(r => r.item_name);
            report.visuals.bar.datasets[0].data = foodRows.slice(0, 7).map(r => r.sold);

            const catMap = {};
            foodRows.forEach(r => { catMap[r.category_name] = (catMap[r.category_name] || 0) + Number(r.sold); });
            report.visuals.doughnut.labels = Object.keys(catMap);
            report.visuals.doughnut.datasets[0].data = Object.values(catMap);
            report.breakdown.category = catMap;

            report.table.headers = ['Item Name', 'Category', 'Qty Sold', 'Revenue'];
            report.table.rows = foodRows.map(r => [r.item_name, r.category_name, r.sold, `Rs.${r.revenue}`]);

            report.insights.push(`${foodRows[0]?.item_name || 'N/A'} is the star performer this period.`);
            report.recommendations.push("Boost sales of low-performing categories by bundling them with top sellers.");
            break;

        case 'INVENTORY':
            const [invRows] = await pool.query(`
                SELECT i.*, s.name as supplier_name FROM inventory i 
                LEFT JOIN suppliers s ON i.supplier_id = s.id 
                ORDER BY i.quantity ASC
            `);
            report.summary.recordsCount = invRows.length;
            report.summary.failed = invRows.filter(i => i.quantity === 0).length;
            report.summary.pending = invRows.filter(i => i.quantity > 0 && i.quantity <= i.min_level).length;
            report.summary.successful = invRows.length - report.summary.failed - report.summary.pending;

            report.visuals.pie.labels = ['Critical (Out)', 'Low Stock', 'Healthy'];
            report.visuals.pie.datasets[0].data = [report.summary.failed, report.summary.pending, report.summary.successful];

            report.table.headers = ['Item', 'Category', 'Stock', 'Unit', 'Status', 'Supplier'];
            report.table.rows = invRows.map(i => [i.item_name, i.category, i.quantity, i.unit, i.status, i.supplier_name]);

            if (report.summary.failed > 0) report.alerts.push(`${report.summary.failed} items are completely out of stock!`);
            report.recommendations.push("Set up automated restock requests for items frequently hitting 'Low Stock'.");
            break;

        case 'STAFF':
            const [staffRows] = await pool.query(`
                SELECT su.full_name, sr.role_name as role, COUNT(a.id) as attendance,
                       AVG(TIMESTAMPDIFF(HOUR, a.check_in_time, IFNULL(a.check_out_time, NOW()))) as avg_hours
                FROM staff_users su
                LEFT JOIN staff_roles sr ON su.role_id = sr.id
                LEFT JOIN staff_attendance a ON su.id = a.staff_id
                WHERE a.date >= ? AND a.date <= ?
                GROUP BY su.id
            `, [startDate, endDate]);
            report.summary.recordsCount = staffRows.length;
            report.visuals.bar.labels = staffRows.map(s => s.full_name);
            report.visuals.bar.datasets[0].data = staffRows.map(s => s.avg_hours);

            report.table.headers = ['Name', 'Role', 'Attendance', 'Avg Hours'];
            report.table.rows = staffRows.map(s => [s.full_name, s.role, s.attendance, Number(s.avg_hours).toFixed(1)]);
            break;

        default:
            // Generic Orders Report as fallback
            const [genRows] = await pool.query(`
                SELECT order_id, order_source, order_status, SUM(total_price) as total, created_at, payment_method
                FROM order_analytics
                WHERE created_at >= ? AND created_at <= ?
                GROUP BY order_id, order_source, order_status, created_at, payment_method
                ORDER BY created_at DESC
            `, [start, end]);
            report.summary.recordsCount = genRows.length;
            report.summary.revenue = genRows.reduce((a,r) => a+Number(r.total), 0);
            report.table.headers = ['Order ID', 'Source', 'Status', 'Total', 'Payment', 'Date'];
            report.table.rows = genRows.slice(0, 50).map(r => [r.order_id, r.order_source, r.order_status, `Rs.${r.total}`, r.payment_method, r.created_at.toLocaleDateString()]);
    }

    return report;
}

export const generatePdfReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        const ctx = await getReportDataInternal(type, startDate, endDate, req.user);
        
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const fileName = `Report_${type}_${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        doc.pipe(res);

        // --- DASHBOARD STYLE HEADER ---
        doc.rect(0, 0, 612, 100).fill('#111827');
        doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold').text(ctx.metadata.businessName, 40, 30);
        doc.fontSize(10).font('Helvetica').text(`${ctx.metadata.reportType} DASHBOARD`, 40, 60);
        doc.text(`Generated: ${ctx.metadata.generatedAt} | Period: ${ctx.metadata.dateRange}`, 40, 75);
        doc.text(`Generated By: ${ctx.metadata.generatedBy}`, 450, 75, { align: 'right' });

        // --- SECTION 1: REPORT SUMMARY (Cards) ---
        let cardX = 40;
        let cardY = 120;
        const cards = [
            { label: 'TOTAL COUNT', value: ctx.summary.recordsCount, color: '#3B82F6' },
            { label: 'REVENUE / VALUE', value: `Rs.${Number(ctx.summary.revenue || ctx.summary.totalValue || 0).toLocaleString()}`, color: '#10B981' },
            { label: 'SUCCESSFUL', value: ctx.summary.successful, color: '#10B981' },
            { label: 'FAILED / OUT', value: ctx.summary.failed, color: '#EF4444' }
        ];

        cards.forEach(card => {
            doc.rect(cardX, cardY, 120, 60).fill('#F9FAFB').stroke('#E5E7EB');
            doc.fillColor('#6B7280').fontSize(8).font('Helvetica-Bold').text(card.label, cardX + 10, cardY + 15);
            doc.fillColor(card.color).fontSize(14).text(String(card.value), cardX + 10, cardY + 30);
            cardX += 135;
        });

        // --- SECTION 2: INSIGHTS & ALERTS ---
        doc.moveDown(6);
        let sectionY = doc.y + 20;
        
        doc.rect(40, sectionY, 260, 100).fill('#EFF6FF');
        doc.fillColor('#1E40AF').fontSize(10).font('Helvetica-Bold').text("💡 PERFORMANCE INSIGHTS", 50, sectionY + 10);
        doc.fillColor('#1E40AF').fontSize(9).font('Helvetica').text(ctx.insights.join('\n• ') || 'No insights available for this period.', 50, sectionY + 25, { width: 240 });

        doc.rect(315, sectionY, 240, 100).fill('#FEF2F2');
        doc.fillColor('#991B1B').fontSize(10).font('Helvetica-Bold').text("⚠️ ALERTS & EXCEPTIONS", 325, sectionY + 10);
        doc.fillColor('#991B1B').fontSize(9).font('Helvetica').text(ctx.alerts.join('\n• ') || 'All systems normal. No critical alerts.', 325, sectionY + 25, { width: 220 });

        // --- SECTION 3: DETAILED TABLE ---
        doc.moveDown(10);
        doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text("DETAILED DATA TABLE", 40, doc.y);
        doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).stroke();
        
        doc.moveDown(1);
        const tableTop = doc.y;
        const colWidth = 515 / ctx.table.headers.length;

        // Headers
        doc.rect(40, tableTop, 515, 20).fill('#F3F4F6');
        doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
        ctx.table.headers.forEach((h, i) => {
            doc.text(h.toUpperCase(), 45 + (i * colWidth), tableTop + 7);
        });

        // Rows
        let rowY = tableTop + 20;
        doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
        ctx.table.rows.slice(0, 40).forEach((row, rowIndex) => {
            if (rowY > 750) { doc.addPage(); rowY = 50; }
            if (rowIndex % 2 === 0) doc.rect(40, rowY, 515, 15).fill('#FFFFFF');
            row.forEach((cell, i) => {
                doc.text(String(cell), 45 + (i * colWidth), rowY + 4);
            });
            rowY += 15;
        });

        // --- FOOTER ---
        doc.fontSize(8).fillColor('#9CA3AF').text(
            `CONFIDENTIAL - ${ctx.metadata.businessName} | Generated by ${ctx.metadata.generatedBy} on ${ctx.metadata.generatedAt}`,
            0, 800, { align: 'center' }
        );

        doc.end();
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
    }
};

