/**
 * Utility to generate and download a professional E-Bill as an HTML file
 */

export const downloadEBill = (order) => {
    const restaurantInfo = {
        name: "MELISSA'S FOOD COURT",
        address: "123 Main Street, Colombo, Sri Lanka",
        phone: "011-2345678"
    };

    const date = new Date(order.created_at || order.timestamp).toLocaleDateString();
    const time = new Date(order.created_at || order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const customerName = order.customer_name || "Valued Customer";
    const tableNumber = order.table_number || order.tableNumber || "N/A";
    const orderType = order.type || "DINE-IN";
    
    const items = (order.items || []).map(item => ({
        name: item.menuItem?.name || item.name || "Unknown Item",
        quantity: item.quantity || 1,
        price: item.price || item.menuItem?.price || 0
    }));

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxRate = 0; 
    const taxAmount = (subtotal * taxRate) / 100;
    const serviceCharge = 0;
    const discount = 0;
    const grandTotal = subtotal + taxAmount + serviceCharge - discount;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>E-Bill - #${order.id}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            border: 1px solid #e0e0e0;
            padding: 40px;
            border-radius: 8px;
            background-color: #fff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px dashed #ccc;
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        .restaurant-name {
            font-size: 26px;
            font-weight: bold;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .restaurant-info {
            font-size: 14px;
            color: #555;
            margin: 4px 0;
            line-height: 1.5;
        }
        .order-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            font-size: 14px;
        }
        .order-col {
            width: 48%;
        }
        .order-col p {
            margin: 6px 0;
        }
        .table-items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .table-items th, .table-items td {
            text-align: left;
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        .table-items th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #444;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        .text-right {
            text-align: right !important;
        }
        .text-center {
            text-align: center !important;
        }
        .summary-container {
            width: 100%;
            display: flex;
            justify-content: flex-end;
            margin-bottom: 25px;
        }
        .summary-table {
            width: 50%;
            border-collapse: collapse;
            font-size: 14px;
        }
        .summary-table td {
            padding: 6px 10px;
        }
        .total-row {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
        }
        .total-row td {
            padding: 12px 10px;
        }
        .payment-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 30px;
            font-size: 14px;
            border: 1px solid #eee;
        }
        .payment-info p {
            margin: 5px 0;
            color: #444;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #777;
            border-top: 2px dashed #ccc;
            padding-top: 20px;
        }
        .footer p {
            margin: 4px 0;
        }
        .bold {
            font-weight: 600;
        }
        @media print {
            body { background-color: #fff; padding: 0; }
            .container { box-shadow: none; border: none; width: 100%; margin: 0; padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="restaurant-name">${restaurantInfo.name}</h1>
            <p class="restaurant-info">${restaurantInfo.address}</p>
            <p class="restaurant-info">Phone: ${restaurantInfo.phone}</p>
        </div>

        <div class="order-details">
            <div class="order-col">
                <p><span class="bold">Order ID:</span> #${order.id}</p>
                <p><span class="bold">Date:</span> ${date}</p>
                <p><span class="bold">Time:</span> ${time}</p>
            </div>
            <div class="order-col">
                <p><span class="bold">Customer:</span> ${customerName}</p>
                <p><span class="bold">Table No:</span> ${tableNumber}</p>
                <p><span class="bold">Order Type:</span> ${orderType}</p>
            </div>
        </div>

        <table class="table-items">
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(i => `
                <tr>
                    <td>${i.name}</td>
                    <td class="text-center">${i.quantity}</td>
                    <td class="text-right">LKR ${i.price.toLocaleString()}</td>
                    <td class="text-right">LKR ${(i.quantity * i.price).toLocaleString()}</td>
                </tr>`).join('')}
            </tbody>
        </table>

        <div class="summary-container">
            <table class="summary-table">
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">LKR ${subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Tax (${taxRate}%):</td>
                    <td class="text-right">LKR ${taxAmount.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Service Charge:</td>
                    <td class="text-right">LKR ${serviceCharge.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Discount:</td>
                    <td class="text-right">LKR ${discount.toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                    <td>Grand Total:</td>
                    <td class="text-right">LKR ${grandTotal.toLocaleString()}</td>
                </tr>
            </table>
        </div>

        <div class="payment-info">
            <p><span class="bold">Payment Method:</span> ${order.payment_method || 'N/A'}</p>
            <p><span class="bold">Payment Status:</span> ${order.payment_status || order.status || 'N/A'}</p>
        </div>

        <div class="footer">
            <p class="bold">Thank you for your order!</p>
            <p>This is a system-generated E-Bill from ${restaurantInfo.name}.</p>
            <p>Please keep this for your records.</p>
        </div>
    </div>
</body>
</html>
    `;

    const element = document.createElement("a");
    const file = new Blob([htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `MelissaFoodCourt_Bill_${order.id}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};
