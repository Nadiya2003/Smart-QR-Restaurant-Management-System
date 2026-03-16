/**
 * Automatic permissions mapping for different staff roles.
 * These reflect the sections each role can access in their dashboard.
 */
export const ROLE_PERMISSIONS = {
    'admin': [
        'dashboard', 'users', 'staff', 'attendance', 'menu', 'orders', 
        'activity', 'suppliers', 'inventory', 'reports', 'staff_permissions'
    ],
    'manager': [
        'dashboard', 'orders', 'staff', 'reports', 'inventory', 'menu'
    ],
    'steward': [
        'orders', 'table_management'
    ],
    'kitchen_staff': [
        'kitchen_orders', 'food_preparation'
    ],
    'cashier': [
        'orders', 'billing', 'payments'
    ],
    'delivery_rider': [
        'delivery_orders', 'delivery_status'
    ],
    'inventory_manager': [
        'inventory', 'suppliers', 'stock_updates'
    ],
    'supplier': [
        'supplier_orders', 'supply_requests'
    ],
    'bar_staff': [
        'drink_orders', 'drink_preparation'
    ]
};

/**
 * Get automatic permissions for a role
 * @param {string} role - Role name (lowercase)
 * @returns {string[]} Array of permission keys
 */
export const getPermissionsForRole = (role) => {
    return ROLE_PERMISSIONS[role.toLowerCase()] || [];
};
