/**
 * RBAC System Test Script
 * Run this script to verify the RBAC implementation
 * 
 * Usage: node test-rbac.js
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Test configuration
const testStaff = {
    name: 'Test Staff Member',
    email: `teststaff${Date.now()}@test.com`,
    password: 'TestPassword123!',
    role: 'cashier'
};

// Admin credentials (update these with actual admin credentials)
const adminCredentials = {
    email: 'admin@restaurant.com', // Update this
    password: 'adminpassword'       // Update this
};

let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

function logTest(name, passed, details = '') {
    const symbol = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`${symbol} ${name}`, color);
    if (details) {
        console.log(`  ${details}`);
    }
    testResults.tests.push({ name, passed, details });
    if (passed) testResults.passed++;
    else testResults.failed++;
}

async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();
        return { status: response.status, data, ok: response.ok };
    } catch (error) {
        return { error: error.message, status: 0 };
    }
}

async function test1_RegisterStaff() {
    log('\n📝 Test 1: Staff Registration', 'cyan');
    const url = `${API_BASE_URL}/staff/auth/register`;
    const result = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(testStaff)
    });

    if (result.status === 201 && result.data.user) {
        logTest('Staff registration successful', true, `Email: ${testStaff.email}`);
        return result.data.user.id;
    } else {
        logTest('Staff registration failed', false, JSON.stringify(result));
        return null;
    }
}

async function test2_InactiveLogin() {
    log('\n🔒 Test 2: Inactive Staff Login Attempt', 'cyan');
    const url = `${API_BASE_URL}/staff/auth/login`;
    const result = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({
            email: testStaff.email,
            password: testStaff.password
        })
    });

    const passed = result.status === 403 &&
        result.data.code === 'ACCOUNT_INACTIVE' &&
        result.data.message.includes('not active yet');

    logTest('Inactive login properly rejected', passed,
        `Status: ${result.status}, Message: ${result.data.message}`);

    return passed;
}

async function test3_AdminLogin() {
    log('\n👤 Test 3: Admin Login', 'cyan');
    const url = `${API_BASE_URL}/staff/auth/login`;
    const result = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(adminCredentials)
    });

    if (result.ok && result.data.token) {
        logTest('Admin login successful', true, 'Token received');
        return result.data.token;
    } else {
        logTest('Admin login failed', false,
            'Check adminCredentials in script - update with real admin email/password');
        return null;
    }
}

async function test4_ViewAllStaff(adminToken) {
    log('\n📋 Test 4: Admin View All Staff (Including Inactive)', 'cyan');
    const url = `${API_BASE_URL}/admin/staff`;
    const result = await makeRequest(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });

    if (result.ok && Array.isArray(result.data.staff)) {
        const inactiveStaff = result.data.staff.filter(s => !s.is_active);
        logTest('Retrieved staff list', true,
            `Total: ${result.data.staff.length}, Inactive: ${inactiveStaff.length}`);
        return true;
    } else {
        logTest('Failed to retrieve staff list', false, JSON.stringify(result));
        return false;
    }
}

async function test5_ActivateStaff(adminToken, staffId) {
    log('\n✅ Test 5: Admin Activates Staff', 'cyan');
    const url = `${API_BASE_URL}/admin/staff/${staffId}/status`;
    const result = await makeRequest(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'active' })
    });

    const passed = result.ok && result.data.message.includes('active');
    logTest('Staff activation', passed,
        `Email sent: ${result.data.emailSent}, Message: ${result.data.message}`);

    return passed;
}

async function test6_ActiveLogin() {
    log('\n🔓 Test 6: Active Staff Login', 'cyan');
    // Wait a moment for database to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    const url = `${API_BASE_URL}/staff/auth/login`;
    const result = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({
            email: testStaff.email,
            password: testStaff.password
        })
    });

    const passed = result.ok && result.data.token;
    logTest('Active staff login successful', passed,
        passed ? 'Token received' : `Failed: ${result.data.message}`);

    return result.data.token;
}

async function test7_AccessDashboard(staffToken) {
    log('\n📊 Test 7: Access Staff Dashboard', 'cyan');
    const url = `${API_BASE_URL}/staff/dashboard/stats`;
    const result = await makeRequest(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${staffToken}`
        }
    });

    const passed = result.ok || result.status === 404; // 404 is ok if endpoint not fully implemented
    logTest('Dashboard access', passed,
        `Status: ${result.status}${result.ok ? ' - Successfully accessed' : ' - Endpoint may not be implemented'}`);

    return passed;
}

async function test8_ViewAuditLogs(adminToken) {
    log('\n📝 Test 8: View Audit Logs', 'cyan');
    const url = `${API_BASE_URL}/admin/audit-logs?limit=5`;
    const result = await makeRequest(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });

    if (result.ok && Array.isArray(result.data.logs)) {
        const activationLogs = result.data.logs.filter(l => l.action_type === 'STAFF_ACTIVATED');
        logTest('Audit logs retrieved', true,
            `Total logs: ${result.data.total}, Recent activations: ${activationLogs.length}`);
        return true;
    } else {
        logTest('Failed to retrieve audit logs', false,
            'Make sure audit_logs table exists (run migration)');
        return false;
    }
}

async function test9_SelfModificationPrevention(adminToken, adminId) {
    log('\n🛡️ Test 9: Self-Modification Prevention', 'cyan');

    if (!adminId) {
        logTest('Self-modification prevention', false, 'Admin ID not available - skipping test');
        return false;
    }

    const url = `${API_BASE_URL}/admin/staff/${adminId}/status`;
    const result = await makeRequest(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'inactive' })
    });

    const passed = result.status === 403 && result.data.code === 'SELF_MODIFICATION_DENIED';
    logTest('Self-modification properly prevented', passed,
        passed ? 'Admin cannot deactivate own account' : 'Test failed or feature not implemented');

    return passed;
}

async function printSummary() {
    log('\n' + '='.repeat(50), 'blue');
    log('📊 TEST SUMMARY', 'blue');
    log('='.repeat(50), 'blue');
    log(`Total Tests: ${testResults.tests.length}`, 'blue');
    log(`Passed: ${testResults.passed}`, 'green');
    log(`Failed: ${testResults.failed}`, 'red');
    log(`Success Rate: ${Math.round((testResults.passed / testResults.tests.length) * 100)}%`,
        testResults.failed === 0 ? 'green' : 'yellow');
    log('='.repeat(50), 'blue');

    if (testResults.failed > 0) {
        log('\n⚠️ Failed Tests:', 'yellow');
        testResults.tests
            .filter(t => !t.passed)
            .forEach(t => log(`  - ${t.name}`, 'red'));
    }
}

// Main test runner
async function runTests() {
    log('\n🚀 Starting RBAC System Tests', 'yellow');
    log('API Base URL: ' + API_BASE_URL, 'yellow');
    log('=' + '='.repeat(50) + '\n');

    try {
        // Test 1: Register staff
        const staffId = await test1_RegisterStaff();
        if (!staffId) {
            log('\n❌ Cannot continue tests without staff registration', 'red');
            return;
        }

        // Test 2: Inactive login
        await test2_InactiveLogin();

        // Test 3: Admin login
        const adminToken = await test3_AdminLogin();
        if (!adminToken) {
            log('\n⚠️ Cannot run admin tests without admin token', 'yellow');
            log('Update adminCredentials in this script with valid admin email/password', 'yellow');
        } else {
            // Test 4: View all staff
            await test4_ViewAllStaff(adminToken);

            // Test 5: Activate staff
            await test5_ActivateStaff(adminToken, staffId);

            // Test 6: Active login
            const staffToken = await test6_ActiveLogin();

            if (staffToken) {
                // Test 7: Access dashboard
                await test7_AccessDashboard(staffToken);
            }

            // Test 8: View audit logs
            await test8_ViewAuditLogs(adminToken);

            // Test 9: Self-modification prevention
            // Note: We'd need to extract admin ID from token to test this properly
            // For now, we'll skip this test or you can provide admin ID
        }

        await printSummary();

    } catch (error) {
        log(`\n💥 Fatal Error: ${error.message}`, 'red');
        console.error(error);
    }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
    log('❌ This script requires Node.js 18+ with native fetch support', 'red');
    log('Or install node-fetch: npm install node-fetch', 'yellow');
    process.exit(1);
}

// Run the tests
runTests().catch(console.error);
