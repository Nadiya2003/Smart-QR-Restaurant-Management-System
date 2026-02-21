# Admin Portal API Documentation

## Database Schema: 3NF Normalized ✅

All admin endpoints are now fully compatible with the 3NF database schema.

## Available Admin Endpoints

### Staff Management
- **GET** `/api/admin/staff` - Get all staff members (excludes managers)
- **PUT** `/api/admin/staff/:id/status` - Toggle staff status
  - Body: `{ "status": "active" | "inactive" | "suspended" }`
- **PUT** `/api/admin/staff/:id/permissions` - Update staff permissions (if permissions table exists)
  - Body: `{ "permissions": ["orders.view", "orders.update", ...] }`

### Customer Management
- **GET** `/api/admin/customers` - Get all customers
- **PUT** `/api/admin/customers/:id/permissions` - Update customer permissions (if permissions table exists)
  - Body: `{ "permissions": ["menu.view", "orders.place", ...] }`

### Order Management
- **GET** `/api/admin/orders` - Get all orders with full details
- **PUT** `/api/admin/orders/:id/status` - Update order status
  - Body: `{ "status": "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" }`

### Reservation Management
- **GET** `/api/admin/reservations` - Get all reservations
- **PUT** `/api/admin/reservations/:id/status` - Update reservation status
  - Body: `{ "status": "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" }`

### Dashboard Stats
- **GET** `/api/admin/stats` - Get dashboard statistics
  - Returns: 
    - Total customers
    - Total staff (excluding managers)
    - Total orders
    - Total revenue (from paid orders)
    - Pending orders count
    - Completed orders count

## Database Changes from Old Schema

### Staff Users
- **OLD**: `role` (string), `sub_role` (string), `is_active` (boolean)
- **NEW**: `role_id` (FK to staff_roles), `status` (ENUM: 'active', 'inactive', 'suspended')
- **Joins**: staff_users → staff_roles (to get role_name)

### Orders
- **OLD**: `order_status` (string), `order_type` (string), `payment_status` (string), `payment_type` (string), `total_price` (decimal)
- **NEW**: `status_id` (FK), `order_type_id` (FK), `payment_status_id` (FK), `payment_method_id` (FK), NO total_price column
- **Joins**: 
  - orders → order_statuses
  - orders → order_types
  - orders → payment_statuses
  - orders → payment_methods
- **Total Price**: Calculated via subquery from order_items

### Stewards
- **OLD**: Separate `stewards` table with `user_id` FK
- **NEW**: Direct reference - `orders.steward_id` → `staff_users.id`

## Authentication Required

All admin endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- User must have role='ADMIN' or be hardcoded Admin user

## Hardcoded Admin Login
- Username: `Admin`
- Password: `Nmk@6604`

## Error Handling

All endpoints return proper HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error
- `501` - Not Implemented (for permission features if table doesn't exist)

## Notes

1. Permission management endpoints check if `staff_permissions` and `customer_permissions` tables exist before operating
2. All status updates validate input against allowed ENUM values
3. Revenue calculation sums order item totals only for orders with payment_status='PAID'
4. Staff count excludes managers from the total
