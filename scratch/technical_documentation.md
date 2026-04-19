# Smart QR Restaurant Management System
## Complete Technical Documentation
### Software Development Project — Final Year Submission

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Frontend Details](#3-frontend-details)
4. [Backend Details](#4-backend-details)
5. [Database Design](#5-database-design)
6. [API Reference](#6-api-reference)
7. [Sound, Icons, and UI Enhancements](#7-sound-icons-and-ui-enhancements)
8. [Payment System](#8-payment-system)
9. [Security](#9-security)
10. [Deployment](#10-deployment)
11. [Complete System Flow](#11-complete-system-flow)
12. [Best Practices and Future Improvements](#12-best-practices-and-future-improvements)

---

## 1. Project Overview

### 1.1 Purpose

The **Smart QR Restaurant Management System** (branded as *Melissa's Food Court*) is a full-stack digital solution designed to modernise and automate the operational workflows of a multi-staff restaurant environment. It replaces manual paper-based processes with a cohesive suite of digital tools covering everything from customer ordering through QR codes to backend inventory procurement and financial reporting.

The system enables a seamless flow from the moment a customer scans a QR code and places an order, to kitchen preparation, cashier settlement, inventory deduction, and supplier replenishment — all coordinated in real-time.

### 1.2 Target Users

The system serves **nine distinct user roles**, each with a dedicated interface tailored to their responsibilities:

| Role | Interface | Primary Responsibility |
|------|-----------|----------------------|
| **Admin** | Mobile App (React Native) | System-wide management, staff control, analytics |
| **Manager** | Mobile App (React Native) | Operations oversight, order monitoring, reporting |
| **Cashier** | Mobile App (React Native) | Order settlement, payment processing, POS |
| **Steward** | Mobile App (React Native) | Table service, order taking, customer assistance |
| **Kitchen Staff** | Mobile App (React Native) | Food preparation ticket management |
| **Bar Staff** | Mobile App (React Native) | Beverage preparation ticket management |
| **Delivery Rider** | Mobile App (React Native) | Delivery order management and tracking |
| **Inventory Manager** | Mobile App (React Native) | Stock management, restock requests |
| **Supplier** | Mobile App (React Native) | Supply request fulfilment and order updates |
| **Customer** | Web Portal (React.js) | QR scanning, menu browsing, ordering, payment |

### 1.3 Key Features

**Customer-Facing:**
- QR code scanning per restaurant table for instant menu access
- Guest and registered customer ordering support
- Real-time order tracking with live status updates via WebSockets
- Multiple payment methods: Cash, Card, Online Bank Transfer, QR Payment
- Loyalty rewards points system
- Table reservations
- Post-meal feedback and rating system
- AI-powered menu assistant chatbot

**Staff Operations:**
- Role-specific dashboards with real-time data synchronisation via WebSockets
- Unified order lifecycle management across Dine-In, Takeaway, and Delivery
- Real-time sound and visual notifications for new orders and events
- Digital attendance tracking (check-in/check-out)
- Staff profile management with photo upload support
- Multi-table assignment for single orders

**Management and Administration:**
- Comprehensive analytics and financial reporting (BusinessIQ module)
- Inventory management with low-stock alerting
- Supplier procurement workflow with admin approval chain
- Role-Based Access Control (RBAC) with granular permissions
- Staff account activation and role management
- Audit logs for sensitive operations
- Cancellation request approval workflows
- Automated order closure after 6 hours (stale order maintenance)
- Daily menu item availability reset at midnight

### 1.4 System Goals and Benefits

- **Operational Efficiency:** Eliminates manual ticketing and verbal communication between front-of-house and kitchen.
- **Real-Time Visibility:** All stakeholders see live data — no delays or stale information.
- **Revenue Accuracy:** Every order, payment, and inventory change is logged and traceable.
- **Scalability:** Role-based architecture permits adding new staff roles or features without disrupting existing functionality.
- **Customer Experience:** Self-service QR ordering reduces wait times and gives customers autonomy.

---

## 2. System Architecture

### 2.1 Overall Architecture

The system follows a **Client-Server architecture** using a **RESTful API** pattern, augmented with **WebSocket-based real-time communication** using Socket.io. The application is split into four independently deployable sub-systems:

```
CLIENT LAYER
  [Staff Mobile App - React Native / Expo]   [Customer Web Portal - React.js / Vite]
  [Admin Web Portal - React.js / Vite]
            |                                         |
            |  HTTP REST + WebSocket (Socket.io)      |
            v                                         v
BACKEND LAYER
  [Node.js + Express.js + Socket.io — Port 5000]
  [Auth Module] [Order Module] [Inventory Module] [Report / Analytics Module]
            |
            |  SQL Queries via mysql2
            v
DATABASE LAYER
  [MySQL — smart_qr_restaurant — 52+ Tables — 3NF Normalised]
```

### 2.2 Sub-System Breakdown

| Directory | Technology | Purpose |
|-----------|-----------|---------|
| `backend/` | Node.js, Express.js, Socket.io | REST API server, business logic, database access |
| `frontend-app/` | React Native, Expo | Staff mobile application (all 9 staff roles) |
| `customer_qr_scan/` | React.js (Vite) | Customer-facing QR menu and ordering web portal |
| `frontend/` | React.js (Vite) | Admin/management supplementary web portal |
| `database/` | MySQL SQL scripts | Database schema and seed data |

### 2.3 Communication Flow

1. **REST API:** All CRUD operations (creating orders, updating statuses, managing staff) are performed via standard HTTP requests with JSON payloads. Every request includes a `Bearer` JWT token in the `Authorization` header.

2. **WebSocket (Socket.io):** All dashboards maintain a persistent WebSocket connection to the server. When any state change occurs in the backend (e.g., a new order arrives, a status changes, a payment is made), the backend emits a named socket event (`orderUpdate`, `tableUpdate`, `newOrder`) to all connected clients. This delivers **real-time synchronisation** across all staff dashboards simultaneously.

3. **Static File Serving:** Profile images, food photos, and payment slips are uploaded via `multipart/form-data` and served from the Express `public/` directory via `express.static()`.

---

## 3. Frontend Details

### 3.1 Staff Mobile Application (`frontend-app/`)

#### Technology Stack

| Technology | Purpose |
|-----------|---------|
| React Native | Cross-platform mobile UI framework |
| Expo SDK 51+ | Development, build tooling, and device API access |
| JavaScript (ES2022) | Application language |
| React Context API | Global authentication state management (`AuthContext`) |
| `expo-audio` | Notification sound playback |
| `expo-image-picker` | Profile photo and image upload from device gallery |
| `socket.io-client` | Real-time WebSocket connection to backend |
| `Vibration` (built-in RN) | Haptic feedback alongside audio alerts |

#### Screen Inventory

| Screen File | User Role | Description |
|-------------|-----------|-------------|
| `AdminDashboard.js` | Admin | 12-tab comprehensive management dashboard |
| `ManagerDashboard.js` | Manager | Operations overview with 12-tab parallel structure |
| `CashierDashboard.js` | Cashier | POS terminal, order settlement, history |
| `KitchenDashboard.js` | Kitchen Staff | Order preparation ticket queue |
| `BarDashboard.js` | Bar Staff | Beverage preparation ticket management |
| `steward/StewardDashboard.js` | Steward | Table service and order taking |
| `rider/` | Delivery Rider | Delivery assignment and status updates |
| `supplier/` | Supplier | Supply order fulfilment |
| `InventoryDashboard.js` | Inventory Manager | Stock management and restock requests |
| `Login.js` | All Staff | Unified staff login screen |
| `Register.js` | All Staff | Staff self-registration with role selection |
| `ForgotPassword.js`, `VerifyOTP.js`, `ResetPassword.js` | All | OTP-based password reset flow |

#### Navigation Model

Navigation in the Staff Mobile App is **state-based** (no React Navigation library). Each dashboard component uses an `activeTab` state variable and a `setActiveTab` function. Tab switches are rendered by calling a specific `render*()` function based on the active tab value. This avoids external routing dependencies while keeping all business logic within one file per role.

#### Role-Based Dashboard Features

Each dashboard is a self-contained React Native component that:
- Reads the JWT token from `AuthContext` and includes it in every API request header
- Connects to the Socket.io server on component mount and joins its role-specific socket room (e.g., `socket.emit('join', 'cashier_room')`)
- Polls the backend every 25 seconds via `setInterval` as a fallback alongside live socket events
- Renders role-appropriate tabs, order data, and action controls

**Admin Dashboard Tabs:** Overview | Tables | Users | Attendance | Menu | Orders | Suppliers | Activity | Inventory | Reports | Reservations | Notifications

**Cashier Dashboard Tabs:** Home (Active Orders) | Tables | POS | Reservations | Stats/History | Reports

#### Notification System (Mobile)

When a triggering event occurs (new order, payment request, reservation), the staff dashboard:
1. Receives a named socket event (e.g., `newOrder`, `paymentRequest`)
2. Calls `playNotificationSound()` — triggers `soundRef.current.play()` via `expo-audio`
3. Calls `Vibration.vibrate([0, 500, 200, 500])` for a double-pulse haptic pattern
4. Displays a native `Alert` dialog with the event summary
5. Calls `fetchData(true)` (silent refetch — no loading spinner) to refresh the on-screen list

---

### 3.2 Customer Web Portal (`customer_qr_scan/`)

#### Technology Stack

| Technology | Purpose |
|-----------|---------|
| React.js | UI component library |
| Vite | Build tool and dev server |
| Tailwind CSS | Utility-first styling |
| Lucide React | SVG icon library |
| React Context / Custom Hooks | `useOrder` hook for cart and order state management |

#### Page Inventory

| Page | Description |
|------|-------------|
| `WelcomePage` | Landing page shown after QR scan |
| `AuthSelectionPage` | Choose guest ordering or login/register |
| `LoginPage` / `RegisterPage` | Customer authentication |
| `TableSelectionPage` | Select table from restaurant floor layout |
| `StewardSelectionPage` | Choose assigned steward |
| `MenuPage` | Browse menu by category, add items to cart |
| `CartPage` | Review items, adjust quantities |
| `PaymentPage` | Select payment method, upload slip if needed |
| `OrderTrackingPage` | Live order status tracking via socket |
| `OrderHistoryPage` | Past orders for registered users |
| `RewardsPage` | Loyalty points balance and redemption |
| `FeedbackPage` | Post-meal rating and text comments |
| `DashboardPage` | Customer personal account dashboard |
| `SettingsPage` | Account settings and preferences |

#### QR Scanning Flow

A unique QR code is generated and printed per restaurant table. When a customer's phone camera scans it, the browser opens the Customer Web Portal URL with the table number embedded as a URL parameter. The portal auto-reads this parameter and pre-selects the correct table, guiding the customer seamlessly through the menu and ordering flow without any manual input.

---

### 3.3 Admin Web Portal (`frontend/`)

- **Framework:** React.js (Vite)
- **Styling:** Vanilla CSS
- **Purpose:** Supplementary management interface
- **Features:** Staff user management, input validation utilities (`validation.js`), configuration components

---

## 4. Backend Details

### 4.1 Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | JavaScript server runtime |
| Express.js | 4.x | HTTP server framework and REST API routing |
| Socket.io | 4.x | WebSocket server for real-time events |
| mysql2 | 3.x | MySQL database driver with connection pooling and promise support |
| jsonwebtoken | 9.x | JWT signing and verification |
| bcryptjs | 2.x | Password hashing |
| multer | 1.x | Multipart/form-data file upload handling |
| dotenv | 16.x | Environment variable loading from `.env` |
| cors | 2.x | Cross-Origin Resource Sharing header management |
| nodemon | dev | Auto-restart server on file changes during development |

### 4.2 Application Entry Points

**`server.js`** — The application entry point. It:
- Creates the HTTP server and attaches Socket.io
- Registers the `join`/`disconnect` socket event handlers
- Exposes `global.io` so all controllers can emit socket events
- Starts two background `setInterval` maintenance jobs

**`app.js`** — The Express application factory. It:
- Configures CORS, JSON parser, URL-encoded body parser
- Serves static files from `public/stewards`, `public/food`, `public/uploads`
- Mounts all 22 API route modules under their `/api/*` prefixes
- Registers the global error handler middleware

### 4.3 REST API Route Structure

The backend organises routes into 22 route files, each mounted on its own prefix:

```
/api/auth              Unified authentication (login, register, OTP, reset)
/api/staff             Staff authentication and work operations
/api/admin             Staff/customer management, orders, inventory (admin + shared)
/api/orders            Customer order placement (Dine-In, Takeaway, Delivery)
/api/cashier           Cashier POS operations and order settlement
/api/kitchen-bar       Kitchen and bar ticket management
/api/delivery-rider    Delivery assignment and status tracking
/api/supplier          Supplier order fulfilment
/api/inventory         Inventory CRUD, restock requests, analytics
/api/menu              Public and admin menu management
/api/reservations      Table reservation management
/api/reports           Financial and operational report generation
/api/steward-dashboard Steward-specific table and order data
/api/ai-assistant      AI chatbot for customer menu queries
/api/contact           Contact form submission
```

### 4.4 Authentication and Authorization

**JWT-Based Authentication:**
- On successful login, the server signs a JWT using `process.env.JWT_SECRET`
- The token payload contains: `userId`, `role`, `email`, `full_name`
- Token is returned in the login response body and stored on the client (AsyncStorage for mobile, localStorage/session for web)
- All protected API requests send the token as `Authorization: Bearer <token>`
- Token validity is checked on every request by the `protect` middleware

**`authMiddleware.js` — Four Exported Functions:**

| Function | Behaviour |
|---------|-----------|
| `protect` | Enforces authentication — rejects without valid JWT (HTTP 401) |
| `resolveUser` | Optional auth — decodes token if present, does not reject guest users (used for QR ordering) |
| `adminOnly` | Restricts to `ADMIN` or `MANAGER` role (HTTP 403 otherwise) |
| `isStaff` | Restricts to any of the 9 defined staff roles |

**`rbac.middleware.js` — Role-Based Access Control:**

| Function | Purpose |
|---------|---------|
| `requireActiveStaff` | Makes a live DB query to verify `staff_users.is_active = 1` |
| `requireAdmin` | Hard-checks role is exactly `ADMIN` |
| `requireStaffRole(...roles)` | Factory middleware that whitelists specific sub-roles |
| `preventSelfModification` | Blocks an admin from modifying their own account status |
| `logAccess(actionType)` | Logs sensitive operations to console (extensible to `audit_logs` table) |

### 4.5 Controller Architecture

26 controller files handle all business logic, each cleanly separated by domain:

| Controller | Responsibility |
|-----------|---------------|
| `admin.controller.js` | Staff/customer management, order oversight, table management, cancellation handling |
| `admin.management.controller.js` | Advanced staff operations, permissions, inventory, supplier management |
| `order.controller.js` | Full order lifecycle for all 3 order types, payment requests, item removal |
| `cashier.controller.js` | Cashier-specific order view, settlement (settle + close two-step flow) |
| `kitchen.bar.controller.js` | Kitchen/bar ticket queue, status progression |
| `delivery.rider.controller.js` | Delivery assignment, rider tracking, delivery status |
| `inventory.controller.js` | Inventory CRUD, restock requests, stock history |
| `inventory.analytics.controller.js` | Advanced analytics, AI insights, AI chatbot (`aiAssistantChat`) |
| `supplier.controller.js` | Supplier dashboard, supply request management |
| `report.controller.js` | Financial reports, food-wise analysis, PDF generation data |
| `staff.auth.controller.js` | Staff login, register, OTP flow |
| `unified.auth.controller.js` | Combined authentication for staff and customers |
| `reservation.controller.js` | Table reservation CRUD |
| `menu.controller.js` | Menu item and category management |

### 4.6 Real-Time WebSocket Events

The server (`server.js`) exposes `global.io`. Controllers call `global.io.emit(eventName, payload)` to push updates to all connected clients.

| Event | Triggered When | Receiving Dashboards |
|-------|---------------|----------------------|
| `orderUpdate` | Any order status changes | Admin, Manager, Cashier, Kitchen, Bar, Rider |
| `tableUpdate` | Table availability changes | Admin, Manager, Cashier, Steward |
| `newOrder` | A new order is placed | Cashier, Kitchen, Bar |
| `paymentRequest` | Customer requests payment | Cashier |
| `cancelRequest` | Cancellation request submitted | Admin, Manager |
| `menuUpdate` | Menu item availability toggled | Cashier, Steward, Customer Portal |
| `menuChange` | Menu item created or deleted | All dashboards |
| `newReservation` | A reservation is placed | Cashier |
| `removalStatusUpdate` | Item removal approved/rejected | Cashier |

### 4.7 Background Maintenance Jobs

Two `setInterval` tasks run continuously in `server.js`:

**1. Stale Order Auto-Closure** (interval: every 10 minutes)
- Finds all Dine-In orders older than 6 hours that are not COMPLETED or CANCELLED
- Updates their status to COMPLETED and resets associated table statuses to `available`
- Emits `orderUpdate` and `tableUpdate` socket events for each affected order
- Also auto-closes stale `takeaway_orders` and `delivery_orders`

**2. Daily Menu Availability Reset** (checked every 15 minutes, triggers at 00:00–00:15)
- Sets `is_available = 1` on all `menu_items`
- Emits a `menuUpdate` socket event so all dashboards reflect the reset immediately

---

## 5. Database Design

### 5.1 Database Technology

- **DBMS:** MySQL
- **Database Name:** `smart_qr_restaurant`
- **Normalisation:** Third Normal Form (3NF)
- **Driver:** `mysql2` with connection pooling (no ORM)

### 5.2 Schema Architecture — 3NF Decomposition Principle

All staff members register into the master `staff_users` table first. Based on their assigned role, a corresponding row is simultaneously created in the relevant role-specific sub-table (e.g., `cashiers`, `stewards`, `kitchen_staff`). This decomposition eliminates partial dependencies and ensures each table stores only attributes directly relevant to its entity.

### 5.3 Complete Table Reference

#### Lookup / Reference Tables

| Table | Stored Values |
|-------|--------------|
| `staff_roles` | admin, manager, cashier, steward, kitchen_staff, bar_staff, delivery_rider, inventory_manager, supplier |
| `order_types` | DINE-IN, TAKEAWAY, DELIVERY |
| `order_statuses` | PENDING, CONFIRMED, PREPARING, READY, SERVED, COMPLETED, CANCELLED |
| `payment_methods` | CASH, CARD, ONLINE |
| `payment_statuses` | PENDING, PAID, FAILED, REFUNDED, PAY_AT_COUNTER |
| `categories` | SRI_LANKAN, ITALIAN, INDIAN, APPETIZERS, DESSERTS, BEVERAGES |
| `restaurant_tables` | table_number, capacity, location (Indoor/Outdoor), status |

#### Core User Tables

| Table | Key Columns | Notes |
|-------|------------|-------|
| `staff_users` | `id`, `full_name`, `email`, `password`, `role_id`, `is_active`, `permissions` | `is_active = 0` by default until admin activates |
| `customers` | `id`, `name`, `email`, `password_hash`, `loyalty_points`, `profile_image` | Registered online customers |
| `online_customers` | Extended customer profile fields | Used in order resolution queries |

#### Role-Specific Tables (3NF Decomposition)

| Table | Role | Role-Specific Attributes |
|-------|------|--------------------------|
| `managers` | Manager | `department`, `hire_date` |
| `cashiers` | Cashier | `register_number`, `shift_type` |
| `stewards` | Steward | `is_available`, `image`, `assigned_section` |
| `kitchen_staff` | Kitchen | `station`, `specialization` |
| `bar_staff` | Bar | `bar_section` |
| `delivery_riders` | Rider | `vehicle_type`, `license_number`, `is_available` |
| `inventory_managers` | Inventory | `warehouse_section` |
| `supplier_staff` | Supplier | `company_name` |

#### Permissions Tables

| Table | Purpose |
|-------|---------|
| `staff_permissions` | Granular per-staff permission flags (`permission_key`, `allowed BOOLEAN`) |
| `customer_permissions` | Per-customer feature access flags |

#### Session and Authentication Tables

| Table | Purpose |
|-------|---------|
| `customer_sessions` | JWT token storage for customer sessions |
| `staff_otp_verifications` | OTP records with expiry for staff password reset |
| `customer_otp_verifications` | OTP records with expiry for customer password reset |

#### Menu and Inventory Tables

| Table | Key Columns | Description |
|-------|------------|-------------|
| `menu_items` | `id`, `category_id`, `name`, `description`, `price`, `image`, `is_active`, `is_available` | Full menu catalogue |
| `categories` | `id`, `name`, `description`, `image` | Menu categories |
| `suppliers` | `id`, `brand_name`, `contact_name`, `email`, `phone`, `status` | External supplier companies |
| `inventory` | `id`, `menu_item_id`, `quantity`, `min_level`, `unit` | Stock levels per menu item |
| `menu_item_suppliers` | `menu_item_id`, `supplier_id` | Many-to-many junction table |

#### Orders and Transactions

| Table | Key Columns | Description |
|-------|------------|-------------|
| `orders` | `id`, `customer_id`, `steward_id`, `order_type_id`, `status_id`, `payment_method_id`, `table_id`, `total_price` | Primary dine-in orders |
| `order_items` | `id`, `order_id`, `menu_item_id`, `quantity`, `price` | Line items for each order |
| `takeaway_orders` | `id`, `customer_name`, `phone`, `items` (JSON), `order_status`, `total_price` | Standalone takeaway orders |
| `delivery_orders` | `id`, `customer_name`, `phone`, `address`, `items` (JSON), `order_status`, `total_price` | Standalone delivery orders |
| `payments` | `id`, `order_id`, `amount`, `payment_method_id`, `status` | Payment transaction records |

> **Design Note:** Takeaway and Delivery orders are stored in separate flat tables because they do not require a customer account, table assignment, or steward linkage. The backend uses SQL `UNION ALL` queries to merge all three order types into a single unified result set for the Admin, Manager, and Cashier dashboards.

#### Reservations

| Table | Purpose |
|-------|---------|
| `reservations` | Table reservation records (customer, table, datetime, guest count, status) |
| `table_assignments` | Steward-to-table service assignments |

#### Feedback and Ratings

| Table | Purpose |
|-------|---------|
| `ratings` | 1–5 star ratings for stewards by customers |
| `feedback` | Post-order text reviews linked to orders |

#### Notifications and Audit

| Table | Purpose |
|-------|---------|
| `staff_notifications` | Persisted in-app notifications per staff member or role group |
| `audit_logs` | Immutable log of sensitive administrative actions (performer, target, action type, IP, timestamp) |

### 5.4 Key Relationships

| Relationship | Cardinality | Description |
|-------------|------------|-------------|
| `staff_users` to `staff_roles` | Many-to-One | Every staff member holds exactly one role |
| `staff_users` to role sub-tables | One-to-One | Each staff user has one role-specific profile row |
| `orders` to `customers` | Many-to-One | Multiple orders can belong to one customer |
| `orders` to `order_items` | One-to-Many | Each order contains one or more line items |
| `order_items` to `menu_items` | Many-to-One | Each item references the menu catalogue |
| `menu_items` to `categories` | Many-to-One | Each menu item belongs to one category |
| `menu_items` to `suppliers` | Many-to-Many | Via `menu_item_suppliers` junction table |
| `inventory` to `menu_items` | One-to-One | Each menu item has exactly one stock record |
| `reservations` to `restaurant_tables` | Many-to-One | Multiple reservations over time per table |
| `orders` to `restaurant_tables` | Many-to-One | Each dine-in order is associated with a table |
| `orders` to `stewards` | Many-to-One | Each order is serviced by one steward |

---

## 6. API Reference

### 6.1 API Conventions

All APIs follow the **REST** architectural style:
- `GET` — Retrieve resources
- `POST` — Create resources or trigger actions
- `PUT` — Full resource replacement (update)
- `PATCH` — Partial resource update
- `DELETE` — Remove a resource

All JSON endpoint bodies use `Content-Type: application/json`. File upload endpoints use `multipart/form-data`.

**Authentication Header for protected routes:**
```
Authorization: Bearer <JWT_TOKEN>
```

### 6.2 Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| POST | `/api/auth/login` | None | Unified login for staff and customers |
| POST | `/api/auth/register` | None | Customer self-registration |
| POST | `/api/staff/register` | None | Staff self-registration (pending admin activation) |
| GET | `/api/staff/roles` | None | Fetch available staff roles for registration dropdown |
| POST | `/api/auth/forgot-password` | None | Initiate OTP-based password reset |
| POST | `/api/auth/verify-otp` | None | Validate submitted OTP code |
| POST | `/api/auth/reset-password` | None | Set new password after verified OTP |
| GET | `/api/staff/profile` | Bearer | Get authenticated staff member profile |

### 6.3 Order Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders/dine-in` | Optional | Place a dine-in order (supports guest and registered customers) |
| POST | `/api/orders/takeaway` | Bearer | Place a takeaway order |
| POST | `/api/orders/delivery` | Bearer | Place a delivery order |
| GET | `/api/orders/customer` | Bearer | Retrieve all orders for the authenticated customer |
| GET | `/api/orders/active-table/:tableNumber` | None | Get active order for a specific table (used for live tracking) |
| PUT | `/api/orders/:orderId/close` | Bearer | Finalise and close a settled order |
| POST | `/api/orders/request-payment` | Optional | Submit payment request with optional slip image upload |
| POST | `/api/orders/dine-in/cancel-request/:id` | Optional | Request dine-in order cancellation |
| GET | `/api/admin/orders` | Staff | Fetch all orders — UNION of all order types (Admin/Manager view) |
| PUT | `/api/admin/orders/:id/status` | Staff | Update order status |
| GET | `/api/cashier/orders` | Staff | Fetch all orders for cashier settlement view (all statuses) |
| POST | `/api/cashier/orders/:id/settle` | Staff | Record payment and mark order as PAYMENT_COMPLETED |

### 6.4 Inventory Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/inventory` | Staff | List all inventory items with stock levels |
| POST | `/api/inventory` | Staff | Create a new inventory item |
| PUT | `/api/inventory/:id` | Staff | Update an inventory item |
| DELETE | `/api/inventory/:id` | Staff | Delete an inventory item |
| POST | `/api/inventory/adjust` | Staff | Adjust stock quantity (add or subtract) |
| POST | `/api/inventory/restock-request` | Staff | Submit a restock request for admin approval |
| GET | `/api/inventory/restock-requests` | Staff | View all restock requests and their statuses |
| PUT | `/api/inventory/restock-requests/:id/status` | Staff | Approve or reject a restock request |
| GET | `/api/inventory/history` | Staff | View full stock adjustment history |
| GET | `/api/inventory/report` | Staff | Generate an inventory summary report |
| GET | `/api/inventory/analytics/advanced` | Staff | Advanced inventory analytics with trend data |
| GET | `/api/inventory/analytics/ai-insights` | Staff | AI-generated inventory insights and recommendations |

### 6.5 Supplier Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/supplier/stats` | Staff | Supplier dashboard summary statistics |
| GET | `/api/supplier/items` | Staff | Items this supplier is responsible for providing |
| GET | `/api/supplier/admin-requests` | Staff | Approved restock requests awaiting fulfilment |
| POST | `/api/supplier/supply-request` | Staff | Supplier submits a supply delivery |
| GET | `/api/supplier/history` | Staff | Supplier's historical order and delivery records |
| PATCH | `/api/supplier/orders/:id/status` | Staff | Update supply order status (e.g., In Transit) |
| PATCH | `/api/supplier/orders/:id/delivered` | Staff | Mark a supply order as delivered |

### 6.6 Admin Management Endpoints (Selected)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin/Manager | System-wide statistics summary |
| GET | `/api/admin/staff` | Admin | List all staff members |
| PUT | `/api/admin/staff/:id/status` | Admin | Activate or deactivate a staff account |
| PUT | `/api/admin/staff/:id/role` | Admin | Change a staff member's assigned role |
| GET | `/api/admin/customers` | Admin | List all registered customers |
| GET | `/api/admin/audit-logs` | Admin | View the action audit log |
| GET | `/api/admin/suppliers` | Staff | List all registered supplier companies |
| GET | `/api/admin/tables` | Staff | List all restaurant tables with current status |
| PUT | `/api/admin/tables/:id/status` | Staff | Update a table's availability status |
| GET | `/api/admin/attendance` | Staff | View staff attendance records |

### 6.7 Report Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reports/generate` | Staff | Generate a financial report for a specified date range |
| GET | `/api/admin/reports` | Admin | Fetch all saved report records |

### 6.8 External and Third-Party Integrations

| Integration | Used In | Purpose |
|-------------|---------|---------|
| **QR Server API** (`api.qrserver.com`) | Customer `PaymentPage` | Generates a scannable QR code image for QR-based payment on the fly at no cost |
| **AI Language Model API** | `inventory.analytics.controller.js` | Powers the `aiAssistantChat` endpoint for customer menu queries and AI inventory insight generation |
| **Mixkit CDN** (`assets.mixkit.co`) | All Staff Dashboards | Streams doorbell/notification audio for new order alerts without requiring local audio files |

> **Payment Gateway Note:** No third-party payment gateway (Stripe, PayPal) is integrated. Payments are processed via physical methods (cash, POS card terminal) or bank transfer with manual slip verification by the cashier.

---

## 7. Sound, Icons, and UI Enhancements

### 7.1 Sound Integration

**Library:** `expo-audio` — specifically `createAudioPlayer()`

**Initialisation Pattern:**
- On dashboard component mount, `createAudioPlayer({ uri: 'https://...' })` is called and the player reference stored in `soundRef.current`
- The audio source is the Mixkit notification bell CDN URL — streamed on demand, no local bundle size cost

**`playNotificationSound()` Function:**
- Calls `soundRef.current.play()`
- Simultaneously calls `Vibration.vibrate([0, 500, 200, 500])` — two 500ms pulses with a 200ms gap

**Events That Trigger Sound:**

| Socket Event | Dashboards |
|-------------|-----------|
| `newOrder` | Cashier, Kitchen, Bar |
| `paymentRequest` | Cashier |
| `newReservation` | Cashier |
| `removalStatusUpdate` | Cashier |
| Staff notifications | Admin, Manager |

### 7.2 Icons

**Customer Web Portal (`customer_qr_scan/`):**
Uses `lucide-react` — a lightweight SVG icon library. Icons in use: `BanknoteIcon`, `CreditCardIcon`, `SmartphoneIcon`, `UploadIcon`, `CheckCircleIcon`, `QrCodeIcon`, `ClockIcon`. All are inline SVGs, fully styleable via Tailwind CSS classes.

**Staff Mobile App (`frontend-app/`):**
Uses Unicode emoji characters rendered inside React Native `<Text>` components as tab icons, status indicators, and role identifiers (e.g., `🍽️`, `🥡`, `🚚`, `📜`). This approach requires no external icon library and achieves cross-platform visual consistency.

### 7.3 UI Enhancements

**Order Timer Component:** Each active order card in kitchen and cashier dashboards embeds a live timer. It calculates elapsed time from `order.created_at` using `setInterval` (1-second tick). Orders approaching the 20-minute service target display in amber; overdue orders show in red with `OVERDUE` text to prompt urgency.

**Status Badges:** All order status labels are rendered as colour-coded pill badges:
- Green (`#D1FAE5`) — COMPLETED, DELIVERED
- Red (`#FEE2E2`) — CANCELLED, REJECTED
- Blue (`#DBEAFE`) — Preparation states
- Yellow (`#FEF3C7`) — PENDING, WAITING states

**Loading States:** `ActivityIndicator` spinners are shown during initial data loads. Subsequent background refreshes use `isSilent = true` to suppress the spinner and avoid UI flicker.

**Pull-to-Refresh:** All scrollable list views implement React Native's `RefreshControl` component for native pull-to-refresh gesture support.

**Customer Portal — Payment Verification Animation:** While awaiting cashier confirmation, the payment page displays an `animate-spin` rotating ring border and `animate-pulse` clock icon (Tailwind CSS animations). A live socket listener transitions the state to `success` automatically when the cashier closes the order.

---

## 8. Payment System

### 8.1 Payment Methods

| Method | Identifier | Mechanism |
|--------|-----------|-----------|
| Cash | `cash` | Customer signals intent via app; steward/cashier collects physical cash at table |
| Card | `card` | Customer signals intent; POS terminal brought to table for card tap/swipe |
| Online Bank Transfer | `online` | Customer transfers to restaurant bank account (Bank of Ceylon), uploads proof-of-payment image |
| QR Payment | `qr` | Customer scans displayed QR code using any mobile payment app, uploads success screenshot |

### 8.2 Online and QR Payment Slip Flow

1. Customer selects `online` or `qr` on `PaymentPage`
2. Bank account details (or a dynamically generated QR code image) are displayed
3. Customer makes the payment externally and uploads a screenshot via `<input type="file" accept="image/*" />`
4. On submit, a `FormData` POST is sent to `POST /api/orders/request-payment`
5. Backend stores the image in `public/uploads/slip-<timestamp>.<ext>` using `multer`
6. A `paymentRequest` socket event is emitted — Cashier dashboard triggers audio+vibration alert
7. Cashier reviews the slip image in the dashboard and manually verifies correctness
8. Cashier calls `POST /api/cashier/orders/:id/settle` — status becomes `PAYMENT_COMPLETED`
9. Cashier calls `PUT /api/orders/:orderId/close` — status becomes `COMPLETED`, table freed

### 8.3 Two-Step Settlement Design

The settle + close two-step process is intentional:
- **Settle:** Records the payment method and timestamp. Prevents any further customer changes.
- **Close:** Releases the restaurant table to `available` status. This separation allows a settling period (e.g., senior cashier review) before the table is made bookable again.

### 8.4 Guest Payment Restriction

Unauthenticated (guest) users see a blur overlay on the payment method selection area with a "Login to Pay" prompt. This prevents payment records from being created without a traceable customer identity, ensuring financial accountability.

### 8.5 Validation Rules

| Rule | Where Enforced |
|------|---------------|
| Payment method must be selected before submit | Client-side — button `disabled` state |
| Slip image required for `online` and `qr` methods | Client-side — checked before `handlePayment()` |
| Guest users blocked from all methods | Client-side — `isGuest` prop controls overlay visibility |
| File type: `image/*` only | HTML `accept` attribute + server `multer` filter |
| File size: up to 5MB | Displayed as guidance; enforced by `multer.limits` |

---

## 9. Security

### 9.1 Password Hashing

All passwords are hashed using **bcryptjs** before being stored in the database. bcrypt produces a computationally expensive one-way salted hash, making brute-force attacks and rainbow table lookups infeasible.

- Staff passwords: hashed in `staff.auth.controller.js` before INSERT
- Customer passwords: hashed and stored in `customers.password_hash`
- Password reset OTPs: generated as 6-digit random integers with an `expires_at` timestamp; expired OTPs are rejected server-side

### 9.2 JWT Authentication

- All JWT tokens are signed with `process.env.JWT_SECRET` — this value is loaded from the `.env` file and should never be committed to version control
- Token payload: `{ userId, role, email, full_name }`
- The `protect` middleware's `jwt.verify()` call throws on tampering, expiry, or wrong key — returning HTTP 401
- No token refresh flow is implemented; expired sessions require re-login
- Token is never stored in a cookie — it lives in `AsyncStorage` (mobile) or `localStorage` (web)

### 9.3 Role-Based Access Control (RBAC)

Access is enforced at the Express route level through chained middleware:

```
Route → protect (valid JWT?) → adminOnly (is ADMIN or MANAGER?) → controller
Route → protect → isStaff (is any staff role?) → controller
Route → resolveUser (optional JWT) → controller
```

The `requireActiveStaff` middleware makes a live database query on every sensitive request to confirm `is_active = 1`, ensuring that tokens issued before an account deactivation cannot be used.

`preventSelfModification` prevents an Admin from locking themselves out.

### 9.4 Input Validation

**Client-Side (`src/utils/validation.js`):**

| Validator | Rule |
|-----------|------|
| `validateEmail` | RFC-compliant regex |
| `validatePassword` | Minimum 6 characters |
| `validatePhone` | Sri Lankan format: `07XXXXXXXX` |
| `validateFullName` | Minimum 3 characters |
| `validateBankAccount` | 8–15 digit numeric string |
| `validateTimeFormat` | HH:MM 24-hour format |

**Server-Side:**
- All database queries use `mysql2` parameterised prepared statements — this prevents SQL injection by construction
- `multer` middleware validates file presence and extension on upload endpoints
- CORS policy limits allowed HTTP methods and headers to a defined whitelist

### 9.5 CORS Policy

The backend is configured with `origin: true` (allow all origins) during development to support:
- Expo Go on physical devices, which connects from dynamic LAN IP addresses
- The Customer Web Portal served from a different port on the same machine

**Production guidance:** Replace `origin: true` with an explicit array of allowed domains (e.g., the production frontend URL) to prevent cross-site API abuse.

### 9.6 "Not Secure" Browser Warning

During local/development deployment, the system runs over `http://` (no TLS). Modern browsers display a "Not Secure" warning in the address bar for all `http://` sites. This is expected and does not indicate a vulnerability in the code itself.

**Resolution for production:** Install an SSL certificate (via Let's Encrypt/Certbot) on the server and configure Nginx to serve all traffic over `https://`. This eliminates the browser warning and encrypts all data in transit.

### 9.7 Audit Logging

The `logAccess(actionType)` RBAC middleware logs sensitive operations (staff status changes, role changes) to the application console. The database `audit_logs` table stores: `action_type`, `target_user_id`, `performed_by`, `details`, `ip_address`, and `created_at`. This provides a complete administrative action trail for compliance and dispute resolution.

---

## 10. Deployment

### 10.1 Local Development Commands

| Sub-system | Command | Port |
|-----------|---------|------|
| Backend | `cd backend && npm run dev` | 5000 |
| Staff Mobile App | `cd frontend-app && npx expo start` | Expo Metro |
| Customer Web Portal | `cd customer_qr_scan && npm run dev` | 5173 |
| Admin Web Portal | `cd frontend && npm run dev` | 5174 |

**Network Setup for Physical Devices:** Update `LOCAL_IP` in `frontend-app/src/config/api.js` to match the development machine's WiFi IP address. All staff devices must be on the same network segment.

### 10.2 Production Deployment Recommendations

| Component | Recommended Platform | Key Configuration |
|-----------|--------------------|--------------------|
| Backend API | VPS with PM2 (DigitalOcean, AWS EC2, Railway) | `NODE_ENV=production`, environment variables via `.env` |
| MySQL Database | Managed MySQL (PlanetScale, Amazon RDS, DigitalOcean Managed DB) | Separate host from app server; use connection string in `.env` |
| Customer Web Portal | Vercel or Netlify | Set `VITE_API_URL` to production API domain |
| Admin Web Portal | Vercel or Netlify | Set API URL env var |
| Staff Mobile App | Expo EAS Build to APK (Android) / IPA (iOS) | Update `LOCAL_IP` to production API domain in `api.js` |

### 10.3 Domain and SSL Configuration

1. Register a domain (e.g., `melissafoodcourt.com`)
2. Point DNS `A` record to the VPS public IP
3. Install Nginx as a reverse proxy in front of Node.js
4. Obtain a free SSL certificate via Let's Encrypt: `sudo certbot --nginx -d api.melissafoodcourt.com`
5. Nginx proxies `https://api.melissafoodcourt.com` → `http://localhost:5000`
6. Customer portal at `https://order.melissafoodcourt.com`
7. Update CORS `origin` in `app.js` to allow only these production domains

---

## 11. Complete System Flow

### 11.1 Customer Dine-In Order Lifecycle

```
Step 1  Customer scans table QR code
        → Browser opens Customer Web Portal with table ID in URL

Step 2  Customer browses menu
        → GET /api/menu (categories + items)

Step 3  Customer builds cart and places order
        → POST /api/orders/dine-in
        → Backend: Creates order + order_items rows
        → Backend: Sets restaurant_tables.status = 'occupied'
        → Backend: Emits 'newOrder' socket event

Step 4  Kitchen/Bar dashboards receive 'newOrder'
        → Audio bell + vibration alert
        → Order ticket appears in preparation queue

Step 5  Kitchen marks food READY
        → PATCH /api/kitchen-bar/:id/status
        → 'orderUpdate' socket event → Cashier/Admin update

Step 6  Steward marks order SERVED

Step 7  Customer selects "Pay" on portal
        → Selects payment method
        → If Online/QR: uploads bank transfer slip image
        → POST /api/orders/request-payment (FormData with slip)
        → Backend: Stores slip in public/uploads/
        → Backend: Emits 'paymentRequest' socket event

Step 8  Cashier receives payment alert (sound + Alert dialog)
        → Reviews slip image in dashboard
        → POST /api/cashier/orders/:id/settle
        → Order status → PAYMENT_COMPLETED

Step 9  Cashier closes order
        → PUT /api/orders/:orderId/close
        → Order status → COMPLETED
        → Table status → 'available'
        → 'tableUpdate' socket event → all dashboards refresh

Step 10 Customer sees success screen → redirected to FeedbackPage
```

### 11.2 Supplier Procurement Lifecycle

```
Step 1  Inventory Manager detects low stock
        → POST /api/inventory/restock-request  (status: PENDING)

Step 2  Admin reviews and approves
        → PUT /api/inventory/restock-requests/:id/status { status: 'APPROVED' }

Step 3  Supplier logs in and views approved requests
        → GET /api/supplier/admin-requests

Step 4  Supplier processes and ships items
        → PATCH /api/supplier/orders/:id/status { status: 'IN_TRANSIT' }

Step 5  Supplier marks delivery complete
        → PATCH /api/supplier/orders/:id/delivered

Step 6  Inventory Manager receives goods and updates stock
        → POST /api/inventory/adjust { item_id, quantity }

Step 7  Stock level rises above min_level — low-stock alert clears
```

### 11.3 Staff Account Activation Flow

```
Step 1  New staff member downloads mobile app and registers
        → POST /api/staff/register (role, name, email, password)
        → staff_users.is_active = 0 (pending)

Step 2  Admin receives notification and opens Users tab in Admin Dashboard

Step 3  Admin reviews the new registration and activates the account
        → PUT /api/admin/staff/:id/status { is_active: 1 }
        → logAccess('STAFF_STATUS_CHANGE') middleware logs the action
        → audit_logs record created

Step 4  Staff member can now successfully log in
        → POST /api/auth/login returns JWT
        → Redirected to role-specific dashboard
```

### 11.4 Automated Stale Order Closure

```
Every 10 minutes — server.js setInterval:

1. SELECT orders WHERE status NOT IN (COMPLETED, CANCELLED)
   AND created_at < DATE_SUB(NOW(), INTERVAL 6 HOUR)

2. UPDATE orders SET status_id = COMPLETED (or FINISHED)

3. UPDATE restaurant_tables SET status = 'available'
   for all associated table IDs

4. Emit 'orderUpdate' for each affected order

5. Emit 'tableUpdate' for each released table

6. Repeat for takeaway_orders and delivery_orders
```

---

## 12. Best Practices and Future Improvements

### 12.1 Code Structure Observations

**Separation of Concerns:** The backend cleanly separates the HTTP routing layer (22 route files) from business logic (26 controller files) and access control (6 middleware files). Each file has a single, well-defined responsibility — changes to one domain do not require changes to another.

**UNION Query Pattern:** The admin and cashier order dashboard views build their unified order list using SQL `UNION ALL`, merging DINE-IN (`orders`), TAKEAWAY (`takeaway_orders`), and DELIVERY (`delivery_orders`) records into one response. This avoids the complexity of a single god-table while still presenting a consistent API surface.

**Context API for Auth:** The `AuthContext` provides `user`, `token`, and `logout` to all screens through React Context, without requiring a state management library like Redux. The token is persisted in `AsyncStorage` for session restoration across app restarts.

**Composite Key Deduplication:** The Admin Dashboard uses `${o.order_type}-${o.id}` as the Map deduplication key when building the unified order list. This correctly handles the case where DINE-IN, TAKEAWAY, and DELIVERY orders have independent auto-increment ID sequences that overlap.

**Silent Background Refresh:** All polling calls use `fetchData(true)` (isSilent = true), which bypasses the `setLoading(true)` call. This prevents the full-screen spinner from appearing during background refreshes, providing a smooth user experience.

### 12.2 Scalability Considerations

| Area | Current State | Recommendation for Scale |
|------|--------------|--------------------------|
| Socket.io | Single-instance in-memory | Add Redis adapter (`socket.io-redis`) for multi-instance |
| Image storage | Local filesystem `public/uploads/` | Migrate to AWS S3 or Cloudflare R2 |
| DB connection | `mysql2` connection pool (single DB host) | Add read replicas for reporting queries |
| Mobile API URL | Hardcoded `LOCAL_IP` | Use environment-based config with EAS build profiles |
| Session management | Stateless JWT only | Add refresh token rotation for long-lived sessions |

### 12.3 Performance Optimisation Opportunities

- **Database Indexing:** Add composite indexes on `(status_id, created_at)` for `orders`, and `(order_id)` for `order_items` to accelerate the dashboard UNION queries.
- **API Pagination:** Order and user lists are returned in full on every request. Implementing cursor-based pagination on dashboard list endpoints would reduce payload sizes as data grows.
- **WebSocket-Only Updates:** The current 25-second polling interval creates predictable database load. Eliminating polling in favour of pure socket-driven updates for post-mount data changes would reduce this significantly.
- **Image Compression Pipeline:** Profile images and menu photos are stored as uploaded. Passing uploads through `sharp` (Node.js image processing library) to resize and compress on receipt would reduce storage and bandwidth usage.

### 12.4 Future Enhancement Recommendations

| Enhancement | Business Benefit |
|-------------|----------------|
| **Expo Push Notifications (Firebase FCM)** | Notify staff of events even when the app is backgrounded or the device is locked — critical for delivery riders |
| **Direct Payment Gateway Integration** | Integrate PayHere or LankaPay to automate payment verification, eliminating manual slip review and reducing cashier workload |
| **Loyalty Points Redemption at Checkout** | Allow customers to redeem accumulated points for discounts, improving customer retention |
| **Dynamic QR Payment per Bill** | Generate a unique payment QR code per order amount, scoped to exact bill total, rather than a static restaurant QR |
| **Kitchen Display System (KDS) Mode** | A landscape, touch-optimised tablet layout for kitchen walls — replacing the phone-oriented kitchen dashboard |
| **Multi-Language Support (Sinhala / Tamil)** | i18n support for Sri Lankan local language customers, broadening accessibility |
| **Advanced Report Export** | CSV and Excel export of financial reports; scheduled email delivery of daily/weekly summaries |
| **AI Demand Forecasting** | Use historical order data to predict peak hours, popular items, and inventory requirements for each day |
| **Customer Web App for Remote Orders** | A public-facing ordering portal not limited to QR scanning — enabling pre-orders and delivery bookings from any location |

---

*Document prepared for: Smart QR Restaurant Management System*
*Branded Project: Melissa's Food Court*
*Repository: App-based-Smart-QR-Restaurant-Management-System*
*Academic Context: MIT Third Year — Semester 01, Software Development Project*
*Documentation Date: April 2026*
