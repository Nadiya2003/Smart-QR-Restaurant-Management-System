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
            profit: 0,
            totalCost: 0,
            totalPayments: 0,
            cashIn: 0,
            cashOut: 0,
            avgOrderValue: 0
        },
        visuals: {
            pie: { labels: [], datasets: [{ data: [], backgroundColor: ['#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB'] }] },
            bar: { labels: [], datasets: [{ label: 'Performance', data: [], backgroundColor: '#000000' }] },
            line: { labels: [], datasets: [{ label: 'Trend', data: [], borderColor: '#000000', fill: false }] },
            productBar: { labels: [], data: [] },
            hourTrend: { labels: [], data: [] }
        },
        table: { headers: [], rows: [] },
        breakdown: { status: {}, category: {}, payment: {} },
        insights: [],
        alerts: [],
        recommendations: []
    };

    switch (typeUpper) {
        case 'FINANCIAL':
        case 'REVENUE':
            // Aggregate for visuals
            const [hourlySales] = await pool.query(`
                SELECT HOUR(created_at) as hour, SUM(total_price) as revenue FROM order_analytics
                WHERE created_at >= ? AND created_at <= ?
                AND order_status != 'CANCELLED'
                GROUP BY HOUR(created_at)
            `, [start, end]);

            // Detailed Breakdown (Point by Point)
            const [pointByPoint] = await pool.query(`
                SELECT order_id as id, created_at, SUM(total_price) as total_price, payment_method, order_source,
                       SUM(unit_price * quantity) as gross,
                       SUM(discount_amount) as discounts
                FROM order_analytics
                WHERE created_at >= ? AND created_at <= ?
                AND order_status != 'CANCELLED'
                GROUP BY order_id, created_at, payment_method, order_source
                ORDER BY created_at DESC
            `, [start, end]);

            const salesInflow = pointByPoint.reduce((a, r) => a + Number(r.total_price), 0);
            
            // Peak Hours
            report.visuals.hourTrend.labels = hourlySales.map(r => `${r.hour}:00`);
            report.visuals.hourTrend.data = hourlySales.map(r => Number(r.revenue));

            // Source Breakdown
            const srcNames = [...new Set(pointByPoint.map(r => r.order_source))];
            report.visuals.pie.labels = srcNames;
            report.visuals.pie.datasets[0].data = srcNames.map(src => pointByPoint.filter(r => r.order_source === src).reduce((a, r) => a + Number(r.total_price), 0));

            // Costs
            const [suppCosts] = await pool.query(`
                SELECT SUM(total_amount) as total FROM supplier_orders 
                WHERE created_at >= ? AND created_at <= ? AND status NOT IN ('CANCELLED')
            `, [start, end]);
            const inventoryOutflow = Number(suppCosts[0].total || 0);

            report.summary.revenue = salesInflow;
            report.summary.totalCost = inventoryOutflow;
            report.summary.profit = salesInflow - inventoryOutflow;
            report.summary.cashIn = salesInflow;
            report.summary.cashOut = inventoryOutflow;
            report.summary.recordsCount = pointByPoint.length;

            report.table.headers = ['Time', 'Order#', 'Source', 'Gross', 'Discounts', 'Net Cash', 'Method'];
            report.table.rows = pointByPoint.map(r => [
                new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                `#${r.id}`,
                r.order_source,
                `Rs.${Number(r.gross || r.total_price).toLocaleString()}`,
                `Rs.${Number(r.discounts || 0).toLocaleString()}`,
                `Rs.${Number(r.total_price).toLocaleString()}`,
                r.payment_method || 'N/A'
            ]);

            report.insights.push(`Average Order Value: Rs. ${(salesInflow / (pointByPoint.length || 1)).toFixed(2)}`);
            report.insights.push(`Digital Payments: ${((pointByPoint.filter(r => r.payment_method !== 'cash').length / (pointByPoint.length || 1)) * 100).toFixed(1)}%`);
            break;

        case 'INVENTORY_COSTS':
            const [purchaseRows] = await pool.query(`
                SELECT so.*, s.name as supplier_name, i.item_name 
                FROM supplier_orders so
                LEFT JOIN suppliers s ON so.supplier_id = s.id
                LEFT JOIN inventory i ON so.inventory_id = i.id
                WHERE so.created_at >= ? AND so.created_at <= ?
                ORDER BY so.created_at DESC
            `, [start, end]);
            report.summary.totalValue = purchaseRows.reduce((a, r) => a + Number(r.total_amount), 0);
            report.table.headers = ['Date', 'Item', 'Supplier', 'Qty', 'Unit Cost', 'Total', 'Status'];
            report.table.rows = purchaseRows.map(r => [
                new Date(r.created_at).toLocaleDateString(),
                r.item_name,
                r.supplier_name,
                r.quantity,
                `Rs.${(r.total_amount / r.quantity).toFixed(2)}`,
                `Rs.${r.total_amount}`,
                r.status
            ]);
            break;

        case 'SUPPLIER_PAYMENTS':
            const [payRows] = await pool.query(`
                SELECT s.name as supplier_name, SUM(so.total_amount) as total_payable,
                       (SELECT SUM(amount) FROM supplier_payments sp JOIN supplier_orders so2 ON sp.supplier_order_id = so2.id WHERE so2.supplier_id = s.id) as total_paid
                FROM suppliers s
                JOIN supplier_orders so ON s.id = so.supplier_id
                GROUP BY s.id
            `);
            report.table.headers = ['Supplier', 'Payable', 'Paid', 'Outstanding Debt'];
            report.table.rows = payRows.map(r => {
                const pending = Number(r.total_payable) - Number(r.total_paid || 0);
                return [r.supplier_name, `Rs.${Number(r.total_payable).toLocaleString()}`, `Rs.${Number(r.total_paid || 0).toLocaleString()}`, `Rs.${Number(pending).toLocaleString()}`];
            });
            break;

        case 'FOOD_WISE':
            const [foodRows] = await pool.query(`
                SELECT item_name, category_name, SUM(quantity) as sold, SUM(total_price) as revenue, AVG(unit_price) as avg_price,
                       SUM(COALESCE(buying_price, 0) * quantity) as total_cost
                FROM order_analytics
                WHERE created_at >= ? AND created_at <= ? AND order_status != 'CANCELLED'
                GROUP BY item_name, category_name ORDER BY sold DESC
            `, [start, end]);

            report.summary.revenue = foodRows.reduce((a, r) => a + Number(r.revenue), 0);
            report.summary.totalCost = foodRows.reduce((a, r) => a + Number(r.total_cost || 0), 0);
            report.summary.profit = report.summary.revenue - report.summary.totalCost;

            report.visuals.bar.labels = foodRows.slice(0, 7).map(r => r.item_name);
            report.visuals.bar.datasets[0].data = foodRows.slice(0, 7).map(r => r.sold);

            report.table.headers = ['Item Name', 'Quantity Sold', 'Revenue', 'Total Cost', 'Net Profit'];
            report.table.rows = foodRows.map(r => [
                r.item_name, 
                r.sold, 
                `Rs.${Number(r.revenue).toLocaleString()}`, 
                `Rs.${Number(r.total_cost || 0).toLocaleString()}`,
                `Rs.${(Number(r.revenue) - Number(r.total_cost || 0)).toLocaleString()}`
            ]);
            break;

        case 'STAFF':
            const [staffPerf] = await pool.query(`
                SELECT su.full_name, sr.role_name, COUNT(DISTINCT a.id) as days, SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, IFNULL(a.check_out_time, NOW()))) as hours
                FROM staff_users su
                JOIN staff_roles sr ON su.role_id = sr.id
                LEFT JOIN staff_attendance a ON su.id = a.staff_id
                WHERE a.date >= ? AND a.date <= ?
                GROUP BY su.id
            `, [startDate, endDate]);
            report.table.headers = ['Name', 'Official Role', 'Attendance', 'Total Productive Hours'];
            report.table.rows = staffPerf.map(s => [s.full_name, s.role_name, `${s.days} days`, `${Number(s.hours).toFixed(1)}h`]);
            break;

        case 'CANCELLATIONS':
            const [cancels] = await pool.query(`
                SELECT order_source, item_name, total_price as lost, created_at, unit_price, quantity FROM order_analytics
                WHERE order_status = 'cancelled' AND created_at >= ? AND created_at <= ?
            `, [start, end]);
            report.summary.totalValue = cancels.reduce((a, r) => a + Number(r.lost), 0);
            report.table.headers = ['Item Description', 'Qty', 'Unit Price', 'Lost Revenue', 'Origin Source'];
            report.table.rows = cancels.map(r => [
                r.item_name,
                r.quantity,
                `Rs.${r.unit_price}`,
                `Rs.${r.lost}`,
                r.order_source
            ]);
            break;

        default:
            const [sumSales] = await pool.query("SELECT SUM(total_price) as revenue FROM order_analytics WHERE created_at >= ? AND created_at <= ? AND order_status != 'CANCELLED'", [start, end]);
            const [sumCosts] = await pool.query("SELECT SUM(total_amount) as costs FROM supplier_orders WHERE created_at >= ? AND created_at <= ? AND status != 'CANCELLED'", [start, end]);
            report.summary.revenue = Number(sumSales[0].revenue || 0);
            report.summary.totalCost = Number(sumCosts[0].costs || 0);
            report.summary.profit = report.summary.revenue - report.summary.totalCost;
            break;
    }

    return report;
}

export const generatePdfReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        const ctx = await getReportDataInternal(type, startDate, endDate, req.user);
        
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const fileName = `BusinessIQ_Report_${type}_${startDate}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        doc.pipe(res);

        // --- THEME ---
        const colors = {
            primary: '#111827',
            secondary: '#374151',
            accent: '#10B981',
            muted: '#6B7280',
            danger: '#EF4444',
            bg: '#F9FAFB',
            white: '#FFFFFF'
        };

        // --- HEADER ---
        doc.rect(0, 0, 612, 100).fill(colors.primary);
        doc.fillColor(colors.white).fontSize(24).font('Helvetica-Bold').text("MELISSA'S FOOD COURT", 40, 30);
        doc.fontSize(10).font('Helvetica').text(`BUSINESS INTELLIGENCE: ${ctx.metadata.reportType}`, 40, 60);
        doc.text(`AUDIT PERIOD: ${ctx.metadata.dateRange}`, 40, 75);
        doc.text(`GENERATED: ${ctx.metadata.generatedAt}`, 400, 35, { align: 'right' });

        // --- KPI SUMMARY ---
        let topY = 130;
        const kpiWidth = 170;
        
        // Revenue Card
        doc.rect(40, topY, kpiWidth, 70).fill(colors.white).stroke(colors.secondary);
        doc.fillColor(colors.secondary).fontSize(8).font('Helvetica-Bold').text("GROSS REVENUE", 50, topY + 15);
        doc.fillColor(colors.primary).fontSize(16).text(`Rs. ${Number(ctx.summary.revenue || 0).toLocaleString()}`, 50, topY + 35);

        // Cost Card
        doc.rect(40 + kpiWidth + 10, topY, kpiWidth, 70).fill(colors.white).stroke(colors.secondary);
        doc.fillColor(colors.secondary).fontSize(8).font('Helvetica-Bold').text("TOTAL EXPENDITURE", 50 + kpiWidth + 10, topY + 15);
        doc.fillColor(colors.danger).fontSize(16).text(`Rs. ${Number(ctx.summary.totalCost || 0).toLocaleString()}`, 50 + kpiWidth + 10, topY + 35);

        // Profit Card
        const profit = ctx.summary.profit || 0;
        doc.rect(40 + (kpiWidth + 10) * 2, topY, kpiWidth, 70).fill(colors.white).stroke(colors.secondary);
        doc.fillColor(colors.secondary).fontSize(8).font('Helvetica-Bold').text("NET PROFITABILITY", 50 + (kpiWidth + 10) * 2, topY + 15);
        doc.fillColor(profit >= 0 ? colors.accent : colors.danger).fontSize(16).text(`Rs. ${Number(profit).toLocaleString()}`, 50 + (kpiWidth + 10) * 2, topY + 35);

        // --- VISUALIZATION SECTION ---
        topY += 100;
        doc.fillColor(colors.primary).fontSize(12).font('Helvetica-Bold').text("ANALYTICAL BREAKDOWN", 40, topY);
        doc.rect(40, topY + 15, 515, 2).fill(colors.primary);

        // Simple Bar Chart for Inflow vs Outflow
        const barY = topY + 40;
        const inVal = Number(ctx.summary.revenue || 0);
        const outVal = Number(ctx.summary.totalCost || 0);
        const maxVal = Math.max(inVal, outVal, 1);
        const barWidthMax = 300;

        doc.fillColor(colors.muted).fontSize(9).text("Cash Flow Balance", 40, barY);
        doc.rect(40, barY + 15, (inVal/maxVal) * barWidthMax, 20).fill(colors.primary);
        doc.fillColor(colors.primary).text(`Inflow: Rs. ${inVal.toLocaleString()}`, 40 + (inVal/maxVal) * barWidthMax + 10, barY + 22);

        doc.rect(40, barY + 45, (outVal/maxVal) * barWidthMax, 20).fill(colors.secondary);
        doc.fillColor(colors.secondary).text(`Outflow: Rs. ${outVal.toLocaleString()}`, 40 + (outVal/maxVal) * barWidthMax + 10, barY + 52);

        // --- TABLE ---
        topY += 130;
        doc.fillColor(colors.primary).fontSize(12).font('Helvetica-Bold').text("DETAILED AUDIT LOG", 40, topY);
        doc.moveDown(0.5);

        const tableTop = doc.y + 5;
        const head = ctx.table.headers;
        const cw = 515 / head.length;

        // Header Background
        doc.rect(40, tableTop, 515, 25).fill(colors.primary);
        doc.fillColor(colors.white).fontSize(8).font('Helvetica-Bold');
        head.forEach((h, i) => doc.text(h.toUpperCase(), 45 + (i * cw), tableTop + 8, { width: cw - 5, align: 'left' }));

        let curY = tableTop + 25;
        doc.fillColor(colors.primary).font('Helvetica');
        ctx.table.rows.forEach((row, rowIndex) => {
            if (curY > 750) { 
                doc.addPage(); 
                curY = 40; 
                doc.rect(40, curY, 515, 25).fill(colors.primary);
                doc.fillColor(colors.white).font('Helvetica-Bold');
                head.forEach((h, i) => doc.text(h.toUpperCase(), 45 + (i * cw), curY + 8));
                curY += 25;
                doc.fillColor(colors.primary).font('Helvetica');
            }
            
            // Alternate row shading
            if (rowIndex % 2 === 0) {
                doc.rect(40, curY, 515, 20).fill(colors.bg);
            }
            
            doc.fillColor(colors.primary).fontSize(7);
            row.forEach((cell, cellIndex) => {
                doc.text(String(cell), 45 + (cellIndex * cw), curY + 6, { width: cw - 5, truncate: true });
            });
            curY += 20;
        });

        // --- FOOTER ---
        const footerY = 800;
        doc.fontSize(8).fillColor(colors.muted).text("© MELISSA'S FOOD COURT - CONFIDENTIAL BUSINESS INTELLIGENCE", 40, footerY, { align: 'center' });

        doc.end();
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ message: 'Internal Server Error during PDF generation' });
    }
};;

