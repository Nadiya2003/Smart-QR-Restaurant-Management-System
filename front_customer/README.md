# Melissa's Food Court - Restaurant Portal UI

A luxury **BLACK + GOLD glassmorphism** restaurant management portal built with React, Vite, and Tailwind CSS.

## ✨ Features

### Customer Portal
- 🔐 **Authentication** - Single-page login/register with toggle
- 🍽️ **Menu** - Browse Sri Lankan & Italian cuisine with category filtering
- 📦 **Order Management** - Place orders, select stewards, track status
- ⭐ **Rating System** - Rate stewards after order completion
- 💳 **Payment History** - View invoices and payment status
- 📅 **Reservations** - Manage upcoming and past reservations
- ⚙️ **Settings** - Profile management and notification preferences
- 📊 **Dashboard** - View active orders, loyalty points, and statistics

### Staff Portal
- 🔓 **Login** - Secure staff authentication
- ✅ **Order Management** - View assigned orders and update status
- 🔄 **Status Updates** - Progress orders from kitchen → cooking → serving → finished
- 🎯 **Status Toggle** - Set your availability (Active/Busy/Inactive)

## 🎨 Design System

**Theme:** BLACK + GOLD Luxury Glassmorphism
- **Primary Gold:** #D4AF37
- **Background Gradient:** #060606 → #0b0b10 → #101018
- **Glassmorphism:** Semi-transparent white overlays with backdrop blur

## 📁 Project Structure

```
front_customer/
├── public/
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Sticky navigation header
│   │   ├── Sidebar.jsx          # Desktop sidebar navigation
│   │   ├── BottomNav.jsx        # Mobile bottom navigation
│   │   ├── GlassCard.jsx        # Reusable glass card component
│   │   ├── Button.jsx           # Reusable button with variants
│   │   ├── StewardCard.jsx      # Steward selection card
│   │   └── OrderStatus.jsx      # Order status visual component
│   ├── pages/
│   │   ├── RoleSelect.jsx       # Initial role selection
│   │   ├── CustomerAuth.jsx     # Login/Register page
│   │   ├── CustomerMenu.jsx     # Food menu & ordering
│   │   ├── CustomerDashboard.jsx # Order tracking & stats
│   │   ├── Payments.jsx         # Payment history
│   │   ├── Reservations.jsx     # Reservation management
│   │   ├── Settings.jsx         # Account settings
│   │   ├── StaffLogin.jsx       # Staff authentication
│   │   └── StaffDashboard.jsx   # Order management
│   ├── App.jsx                  # Main routing
│   ├── main.jsx                 # React entry point
│   └── index.css                # Global styles
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .gitignore
```

## 🚀 Getting Started

### Installation

```bash
# Navigate to project
cd front_customer

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Demo Credentials

**Customer:**
- No credentials needed - registration available

**Staff:**
```
kasun@melissa.lk         Any password works
nimal@melissa.lk
saman@melissa.lk
tharindu@melissa.lk
isuru@melissa.lk
```

## 🎯 Key Pages & Routes

| Route | Purpose | Description |
|-------|---------|-------------|
| `/` | Role Selection | Choose between Customer or Staff portal |
| `/customer/auth` | Authentication | Login/Register (single page toggle) |
| `/customer/menu` | Menu & Orders | Browse food, add to cart, select steward |
| `/customer/dashboard` | Order Tracking | View active/completed orders, statistics |
| `/customer/payments` | Payment History | View invoices, payment status |
| `/customer/reservations` | Reservations | Manage restaurant reservations |
| `/customer/settings` | Account Settings | Profile, password, notifications |
| `/staff/login` | Staff Login | Steward authentication |
| `/staff/dashboard` | Order Management | Track and update order status |

## 🎨 Design Highlights

### Responsive Design
- ✅ Mobile-first approach
- ✅ Desktop sidebar navigation
- ✅ Mobile bottom navigation bar
- ✅ Touch-friendly UI elements
- ✅ Fully responsive grids and layouts

### Glassmorphism
- Semi-transparent backgrounds: `bg-white/5`
- Backdrop blur: `backdrop-blur-xl`
- Subtle borders: `border-white/10`
- Deep shadows for depth

### Typography
- Gold (#D4AF37) for prices, active states, highlights
- White/gray for primary text
- Consistent font sizes and weights

## 💡 Component Features

### GlassCard
Reusable glass-styled container for consistent design
```jsx
<GlassCard className="p-6">
  Content here
</GlassCard>
```

### Button
Multi-variant button component
```jsx
<Button variant="primary" size="lg">
  Click me
</Button>
```
**Variants:** primary, secondary, danger, success
**Sizes:** sm, md, lg

### StewardCard
Display steward info with status and order count
- Status badges (Active/Busy/Inactive)
- Order count visualization
- Selection state styling

### OrderStatus
Visual order progress component
- Status badges with icons
- Progress bar animation
- Color-coded by status

## 🔄 User Flows

### Customer Flow
1. **Role Selection** → Select "Customer Portal"
2. **Auth** → Login or Register
3. **Menu** → Browse food, select items, choose steward, place order
4. **Dashboard** → Track orders, view stats, rate completed orders
5. **Payments** → View payment history
6. **Reservations** → Manage restaurant bookings
7. **Settings** → Update profile and preferences

### Staff Flow
1. **Role Selection** → Select "Staff Portal"
2. **Login** → Enter credentials
3. **Dashboard** → View assigned orders
4. **Update Status** → Progress orders through workflow
5. **Status Toggle** → Update availability (Active/Busy/Inactive)

## 🔒 Authentication

- **Mock Authentication** - UI-only, no backend
- **Customer Auth** - Single page with toggle between login/register
- **Staff Auth** - Simple login form with demo credentials
- **State Management** - React hooks for auth state

## 📝 Data

All data is **static dummy data** stored in component state:
- Sri Lankan names only (Kasun, Nimal, Saman, Dilani, Tharindu, Isuru)
- Realistic food items with descriptions and prices in Rs.
- Mock orders with timestamps and steward assignments
- Payment history with status badges
- Reservation details with confirmation status

## 🛠️ Technologies Used

- **React 18.2** - UI library
- **React Router DOM 6** - Routing
- **Vite 5** - Build tool & dev server
- **Tailwind CSS 3.4** - Styling
- **PostCSS** - CSS processing

## ✅ Code Quality

- ✅ Clean, readable code with comments
- ✅ Functional components only
- ✅ Production-quality UI
- ✅ Mobile-first responsive design
- ✅ Consistent naming conventions
- ✅ Error handling and validation
- ✅ No TypeScript (JavaScript only)
- ✅ No backend required

## 📱 Responsive Breakpoints

- **Mobile:** < 768px (bottom navigation)
- **Tablet:** 768px - 1024px (adjusted layouts)
- **Desktop:** > 1024px (sidebar navigation)

## 🎯 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📦 Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

## 🚀 Production Build

```bash
npm run build
```

Output in `dist/` folder - ready to deploy to any static hosting.

## 📄 License

This project is created for educational purposes.

---

**Restaurant:** Melissa's Food Court 🍽️
**Currency:** Sri Lankan Rupees (Rs.)
**Theme:** BLACK + GOLD Luxury Glassmorphism ✨
