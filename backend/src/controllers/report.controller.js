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

            // Top Product Logic
            const [topProdRows] = await pool.query(`
                SELECT item_name, SUM(total_price) as revenue, SUM(quantity) as sold
                FROM order_analytics
                WHERE created_at >= ? AND created_at <= ? AND order_status != 'cancelled'
                GROUP BY item_name ORDER BY revenue DESC LIMIT 10
            `, [start, end]);

            report.summary.revenue = revRows.reduce((a, r) => a + Number(r.revenue), 0);
            report.summary.profit = revRows.reduce((a, r) => a + Number(r.profit), 0);
            report.summary.recordsCount = revRows.reduce((a, r) => a + Number(r.orders), 0);
            report.summary.successful = revRows.filter(r => r.order_status !== 'cancelled').reduce((a, r) => a + Number(r.orders), 0);
            report.summary.failed = revRows.filter(r => r.order_status === 'cancelled').reduce((a, r) => a + Number(r.orders), 0);
            
            if (topProdRows.length > 0) {
                report.summary.topProduct = {
                    name: topProdRows[0].item_name,
                    revenue: topProdRows[0].revenue
                };
            }

            // Build Line Chart (Daily Trend)
            const trendMap = {};
            revRows.forEach(r => {
                const d = r.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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

            // Product Bar Chart (Horizontal style)
            report.visuals.productBar = {
                labels: topProdRows.slice(0, 5).map(p => p.item_name),
                data: topProdRows.slice(0, 5).map(p => Number(p.revenue))
            };

            // Category Bar Chart
            const [catRows] = await pool.query(`
                SELECT category_name, SUM(total_price) as revenue
                FROM order_analytics
                WHERE created_at >= ? AND created_at <= ?
                GROUP BY category_name ORDER BY revenue DESC
            `, [start, end]);
            report.visuals.bar.labels = catRows.map(c => c.category_name);
            report.visuals.bar.datasets[0].data = catRows.map(c => Number(c.revenue));

            report.table.headers = ['Date', 'Product', 'Qty', 'Revenue', 'Method', 'Source'];
            const [detailedRows] = await pool.query(`
                SELECT created_at, item_name, quantity, total_price, payment_method, order_source
                FROM order_analytics
                WHERE created_at >= ? AND created_at <= ?
                ORDER BY created_at DESC LIMIT 100
            `, [start, end]);
            report.table.rows = detailedRows.map(r => [
                new Date(r.created_at).toLocaleDateString('en-GB'),
                r.item_name,
                r.quantity,
                `Rs.${r.total_price}`,
                r.payment_method,
                r.order_source
            ]);

            report.insights.push(`${topProdRows[0]?.item_name || 'N/A'} is your highest grossing product.`);
            report.insights.push(`${Object.keys(pmMap).sort((a,b) => pmMap[b]-pmMap[a])[0] || 'N/A'} is the preferred payment method.`);
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
        
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const fileName = `Report_${type}_${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        doc.pipe(res);

        // Colors
        const primaryColor = '#000000';
        const secondaryColor = '#4B5563';
        const accentColor = '#6B7280';
        const bgColor = '#FFFFFF';
        const cardBg = '#F9FAFB';

        // --- HEADER ---
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 30, 30, { width: 40 });
        }
        
        doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text(ctx.metadata.businessName, 80, 35);
        doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(`${ctx.metadata.reportType} REPORT AND TRACKER`, 80, 55);
        
        doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold').text(`${startDate} - ${endDate}`, 30, 90, { align: 'center' });
        doc.moveDown(1.5);

        // --- TOP KPIS (Row 1) ---
        let startY = 130;
        // Total Sale Card
        doc.rect(30, startY, 170, 80).fill(cardBg).stroke('#000');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text("TOTAL SALE", 40, startY + 15);
        doc.fontSize(22).text(`Rs. ${Number(ctx.summary.revenue || ctx.summary.totalValue || 0).toLocaleString()}`, 40, startY + 35);

        // Total Profit Card
        doc.rect(210, startY, 170, 80).fill(cardBg).stroke('#000');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text("TOTAL PROFIT", 220, startY + 15);
        doc.fontSize(22).text(`Rs. ${Number(ctx.summary.profit || 0).toLocaleString()}`, 220, startY + 35);

        // Highest Sale Product card
        doc.rect(390, startY, 175, 80).fill(cardBg).stroke('#000');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text("HIGHEST SALE FOR PERIOD", 400, startY + 15);
        doc.fontSize(14).text(ctx.summary.topProduct?.name || 'N/A', 400, startY + 35);
        doc.fontSize(12).font('Helvetica').text(`Rs. ${Number(ctx.summary.topProduct?.revenue || 0).toLocaleString()}`, 400, startY + 55);

        // --- CHARTS SECTION (Row 2) ---
        startY += 100;
        
        // Total Sale by Payment Method (Pie Chart representation)
        doc.rect(30, startY, 260, 150).fill(bgColor).stroke('#000');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text("Total Sale by Payment Method", 40, startY + 10);
        
        let pY = startY + 30;
        const pmLabels = ctx.visuals.pie.labels;
        const pmData = ctx.visuals.pie.datasets[0].data;
        const totalPM = pmData.reduce((a, b) => a + b, 0);

        pmLabels.forEach((label, i) => {
            const val = pmData[i];
            const pct = totalPM > 0 ? ((val / totalPM) * 100).toFixed(0) : 0;
            doc.rect(40, pY, 10, 10).fill('#333');
            doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(`${label}: Rs. ${Number(val).toLocaleString()} (${pct}%)`, 55, pY);
            pY += 18;
        });

        // Total Sales by Categories (Bar Chart representation)
        doc.rect(305, startY, 260, 150).fill(bgColor).stroke('#000');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text("Total Sales by Category", 315, startY + 10);
        
        let bX = 315;
        const catLabels = ctx.visuals.bar.labels.slice(0, 5);
        const catData = ctx.visuals.bar.datasets[0].data.slice(0, 5);
        const maxCat = Math.max(...catData, 1);

        catLabels.forEach((label, i) => {
            const h = (catData[i] / maxCat) * 80;
            doc.rect(bX + (i * 50), startY + 120 - h, 30, h).fill('#555');
            doc.fillColor(primaryColor).fontSize(7).text(label.substring(0, 8), bX + (i * 50), startY + 125, { width: 35, align: 'center' });
        });

        // --- TREND SECTION (Row 3) ---
        startY += 165;
        doc.rect(30, startY, 535, 120).fill(cardBg).stroke('#000');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text("Total Sale by Date (Daily Trend)", 40, startY + 10);
        
        // Simple Line/Bar Chart for trend
        let tX = 50;
        const trendLabels = ctx.visuals.line.labels.slice(-15);
        const trendValues = ctx.visuals.line.datasets[0].data.slice(-15);
        const maxTrend = Math.max(...trendValues, 1);
        const gap = 500 / trendLabels.length;

        trendLabels.forEach((label, i) => {
            const h = (trendValues[i] / maxTrend) * 70;
            doc.rect(tX + (i * gap), startY + 100 - h, gap - 5, h).fill('#000');
            if (i % 2 === 0) doc.fontSize(6).text(label, tX + (i * gap), startY + 105);
        });

        // --- PRODUCT TABLE (Row 4) ---
        startY += 145;
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text("Detailed Sales Records", 30, startY);
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const headers = ['Date', 'Product', 'Qty', 'Total Sale', 'Method'];
        const colWidths = [80, 160, 60, 100, 135];

        // Header Row
        doc.rect(30, tableTop, 535, 20).fill('#000');
        doc.fillColor('#FFF').fontSize(9).font('Helvetica-Bold');
        headers.forEach((h, i) => {
            let offset = 0;
            for(let j=0; j<i; j++) offset += colWidths[j];
            doc.text(h, 35 + offset, tableTop + 5);
        });

        // Data Rows
        let rowY = tableTop + 20;
        doc.fillColor('#000').font('Helvetica').fontSize(8);
        ctx.table.rows.slice(0, 30).forEach((row, i) => {
            if (rowY > 750) {
                doc.addPage();
                rowY = 50;
                // Re-draw header on new page
                doc.rect(30, rowY, 535, 20).fill('#000');
                doc.fillColor('#FFF').fontSize(9).font('Helvetica-Bold');
                headers.forEach((h, i) => {
                    let offset = 0;
                    for(let j=0; j<i; j++) offset += colWidths[j];
                    doc.text(h, 35 + offset, rowY + 5);
                });
                rowY += 20;
                doc.fillColor('#000').font('Helvetica').fontSize(8);
            }
            
            if (i % 2 === 0) doc.rect(30, rowY, 535, 18).fill('#F3F4F6');
            
            [row[0], row[1], row[2], row[3], row[4]].forEach((cell, idx) => {
                let offset = 0;
                for(let j=0; j<idx; j++) offset += colWidths[j];
                doc.text(String(cell), 35 + offset, rowY + 5, { width: colWidths[idx] - 10 });
            });
            rowY += 18;
        });

        // --- FOOTER ---
        doc.fontSize(8).fillColor(accentColor).text(
            `CONFIDENTIAL - ${ctx.metadata.businessName} PROPERTY | Generated on ${ctx.metadata.generatedAt} | Page 1 of 1`,
            0, 810, { align: 'center' }
        );

        doc.end();
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
    }
};

