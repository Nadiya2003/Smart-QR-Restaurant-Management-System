import { Platform } from 'react-native';

// Backend API Configuration
// When running on a physical device via Expo Go, we need to use the computer's LAN IP
// When running on web or emulator, localhost works fine

// IMPORTANT: Change this to your computer's local IP address
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
const LOCAL_IP = '192.168.1.2'; // Your PC's LAN IP (from ipconfig)

const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://192.168.1.2:5000';
    }
    // For Android/iOS physical devices or emulators
    return `http://${LOCAL_IP}:5000`;
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
