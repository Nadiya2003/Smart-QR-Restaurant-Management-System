import { Platform } from 'react-native';

// ============================================================
// ⚠️  NETWORK CONFIG — READ IF YOU GET "Network error"
// ============================================================
// The LOCAL_IP must match the IP of the PC running the backend.
// To find your current IP:
//   Windows → open Command Prompt → run: ipconfig
//   Mac/Linux → open Terminal → run: ifconfig
//
// Look for "IPv4 Address" under your active Wi-Fi/Ethernet.
// Both your phone AND the PC must be on the SAME Wi-Fi network.
// ============================================================
const LOCAL_IP = '172.19.8.23'; // ← UPDATE THIS if you change networks
const PORT = 5000;               // Must match backend PORT (default 5000)

const getBaseUrl = () => {
    // Android emulator uses 10.0.2.2 to reach host machine
    if (Platform.OS === 'android' && __DEV__) {
        // Uncomment the line below ONLY if using an Android emulator, not a physical device
        // return `http://10.0.2.2:${PORT}`;
    }
    // Physical devices and iOS simulator need the LAN IP
    return `http://${LOCAL_IP}:${PORT}`;
};

export const API_BASE_URL = getBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

export default {
    API_BASE_URL,
    API_URL,
    // Auth endpoints
    AUTH: {
        LOGIN: `${API_URL}/auth/login`,
        REGISTER: `${API_URL}/auth/register`,
        PROFILE: `${API_URL}/auth/profile`,
        FORGOT_PASSWORD: `${API_URL}/auth/forgot-password`,
        VERIFY_OTP: `${API_URL}/auth/verify-otp`,
        RESET_PASSWORD: `${API_URL}/auth/reset-password`,
    },
    // Staff auth endpoints
    STAFF: {
        LOGIN: `${API_URL}/staff/login`,
        REGISTER: `${API_URL}/staff/register`,
        PROFILE: `${API_URL}/staff/profile`,
        LOGOUT: `${API_URL}/staff/logout`,
        ROLES: `${API_URL}/staff/roles`,

    },
    // Admin endpoints
    ADMIN: {
        STATS: `${API_URL}/admin/stats`,
        STAFF: `${API_URL}/admin/staff`,
        CUSTOMERS: `${API_URL}/admin/customers`,
        ORDERS: `${API_URL}/admin/orders`,
        RESERVATIONS: `${API_URL}/admin/reservations`,
        AUDIT_LOGS: `${API_URL}/admin/audit-logs`,
        ATTENDANCE: `${API_URL}/admin/attendance`,
        PERMISSIONS: `${API_URL}/admin/permissions`,
        INVENTORY: `${API_URL}/admin/inventory`,
        SUPPLIERS: `${API_URL}/admin/suppliers`,
        NOTIFICATIONS: `${API_URL}/admin/notifications`,
        STAFF_ACTIVITY: `${API_URL}/admin/staff-activity`,
        REPORTS: `${API_URL}/admin/reports`,
        REPORT_PDF: `${API_URL}/reports/pdf`,
        REPORT_GENERATE: `${API_URL}/reports/generate`,
    },

    // Menu endpoints
    MENU: {
        ALL: `${API_URL}/menu`,
        CATEGORIES: `${API_URL}/menu/categories/all`,
        ITEM: (id) => `${API_URL}/menu/${id}`,
        CREATE_ITEM: `${API_URL}/menu`,
        CREATE_CATEGORY: `${API_URL}/menu/categories`,
    },

    // Order endpoints
    ORDERS: {
        BASE: `${API_URL}/orders`,
    },
};
