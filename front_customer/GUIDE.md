# 📖 COMPREHENSIVE USER & DEVELOPER GUIDE

## 🎯 TABLE OF CONTENTS

1. [For End Users](#for-end-users)
2. [For Developers](#for-developers)
3. [Feature Walkthrough](#feature-walkthrough)
4. [Troubleshooting](#troubleshooting)
5. [API Reference](#api-reference)

---

## FOR END USERS

### GETTING STARTED

#### Step 1: Start the Application
```bash
cd front_customer
npm install          # First time only
npm run dev
```

#### Step 2: Open in Browser
```
http://localhost:3000
```

#### Step 3: Choose Your Role
- **👨‍💼 Customer Portal** - Browse menu, order food, track orders
- **👨‍🍳 Staff Portal** - Manage orders, update status

---

### CUSTOMER WALKTHROUGH

#### 1️⃣ Create Your Account (/customer/auth)
```
1. Click "Customer Portal"
2. Click "Register" link
3. Fill in your details:
   - Name: (Any name)
   - Phone: (Any phone number)
   - Email: (Any email)
   - Password: (Any password)
   - Confirm Password: (Same as above)
4. Click "Create Account"
✅ You're automatically logged in!
```

#### 2️⃣ Browse Menu (/customer/menu)
```
1. You arrive at the Menu page
2. Use filter buttons:
   - 🍽️ All Items
   - 🇱🇰 Sri Lankan
   - 🇮🇹 Italian
3. See food cards with:
   - Emoji image
   - Food name
   - Description
   - Price in gold (Rs.)
4. Click "+ Add" button on items
```

#### 3️⃣ Place Your Order (Menu Modal)
```
1. After adding items, modal appears
2. Review selected items
3. Remove items if needed
4. See total price in GOLD
5. IMPORTANT: Select a steward
   - Look for active ones first
   - Check current order count (X/5)
   - Busy stewards can accept but show ⚠️
6. Click "Confirm Order"
✅ Order placed successfully!
```

#### 4️⃣ Track Your Orders (/customer/dashboard)
```
1. Dashboard shows:
   - Active Orders count
   - Loyalty Points
   - Completed Orders count
   - Total Spent

2. Active Orders section:
   - Order ID
   - Items you ordered
   - Your steward
   - LIVE STATUS with progress:
     👨‍🍳 Kitchen (25%)
     🔥 Cooking (50%)
     🍽️ Serving (75%)
     ✅ Finished (100%)

3. Completed Orders:
   - ⭐ Click "Rate" button
   - Give 1-5 stars
   - Add optional feedback
   - Submit rating
```

#### 5️⃣ View Payment History (/customer/payments)
```
1. See payment summary:
   - Total Paid (green badge)
   - Pending Payments (yellow badge)
   - Total Transactions count

2. Invoice list shows:
   - Invoice ID
   - Date ordered
   - Items purchased
   - Amount in gold (Rs.)
   - Status badge (Paid/Pending)
   - 📥 Download button
```

#### 6️⃣ Manage Reservations (/customer/reservations)
```
1. Click "+ New Reservation" to create

2. Upcoming Reservations:
   - Reservation ID
   - Date & Time
   - Number of guests
   - Table assigned
   - Status (Confirmed)
   - Edit or Cancel buttons

3. Past Reservations:
   - Historical records
   - Previous reservations
   - Status (Completed/Cancelled)
```

#### 7️⃣ Account Settings (/customer/settings)
```
1. Profile Section:
   - See your avatar
   - Click ✏️ Edit Profile
   - Update name, email, phone
   - Click 💾 Save Changes

2. Security Section:
   - Change password
   - Enter current password
   - Enter new password
   - Confirm new password
   - Click "Update Password"

3. Notification Preferences:
   - Toggle switches for:
     ✓ Order Updates
     ✓ Promotions & Offers
     ✓ Reservation Reminders
     ✓ New Menu Items
   - Changes save automatically

4. Danger Zone:
   - Delete Account button
   - ⚠️ Cannot be undone
```

#### 8️⃣ Logout
```
1. Click profile icon (top right)
2. Dropdown menu appears
3. Click "Logout"
4. Redirected to role selection page
```

---

### STAFF WALKTHROUGH

#### 1️⃣ Login to Staff Portal (/staff/login)
```
Use these demo accounts:
- kasun@melissa.lk        password: anything
- nimal@melissa.lk        password: anything
- saman@melissa.lk        password: anything
- tharindu@melissa.lk     password: anything
- isuru@melissa.lk        password: anything
```

#### 2️⃣ Staff Dashboard (/staff/dashboard)
```
1. Update Your Status:
   - ✓ Active (default)
   - ⚡ Busy (can't take orders)
   - ✕ Inactive (off duty)

2. View Assigned Orders:
   - Order ID
   - Customer name
   - Items they ordered
   - Time they ordered
   - Total amount in gold

3. Update Order Status:
   - See current status badge
   - Watch animated progress bar
   - Click update button:
     👨‍🍳 Kitchen → "Start Cooking"
     🔥 Cooking → "Ready to Serve"
     🍽️ Serving → "Mark Finished"
     ✅ Finished → "Completed"

4. Progress Bar:
   - 25% when in Kitchen
   - 50% when Cooking
   - 75% when Serving
   - 100% when Finished
```

#### 3️⃣ Logout
```
1. Click "Logout" button (top right)
2. Redirected to role selection
```

---

## FOR DEVELOPERS

### PROJECT SETUP

#### Initial Installation
```bash
# Navigate to project
cd front_customer

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### PROJECT STRUCTURE

#### Core Files
```
src/
├── main.jsx           # React entry point
├── App.jsx            # Router setup & auth logic
└── index.css          # Global styles
```

#### Components (Reusable)
```
src/components/
├── Header.jsx         # Top navigation with profile
├── Sidebar.jsx        # Desktop left sidebar
├── BottomNav.jsx      # Mobile bottom nav
├── GlassCard.jsx      # Glassmorphism container
├── Button.jsx         # Multi-variant button
├── StewardCard.jsx    # Steward selection
└── OrderStatus.jsx    # Order progress
```

#### Pages (Routes)
```
src/pages/
├── RoleSelect.jsx          # / - Role selection
├── CustomerAuth.jsx        # /customer/auth - Auth
├── CustomerMenu.jsx        # /customer/menu - Menu
├── CustomerDashboard.jsx   # /customer/dashboard
├── Payments.jsx            # /customer/payments
├── Reservations.jsx        # /customer/reservations
├── Settings.jsx            # /customer/settings
├── StaffLogin.jsx          # /staff/login
└── StaffDashboard.jsx      # /staff/dashboard
```

---

### COMPONENT API

#### Header Component
```jsx
import Header from './components/Header'

<Header 
  user={{name, email, phone}}
  onLogout={() => {}}
  showMenu={true}
/>
```

**Props:**
- `user` (object) - User data
- `onLogout` (function) - Logout callback
- `showMenu` (boolean) - Show navigation menu

---

#### Sidebar Component
```jsx
import Sidebar from './components/Sidebar'

<Sidebar activeRoute="/customer/menu" />
```

**Props:**
- `activeRoute` (string) - Current route for highlighting

---

#### BottomNav Component
```jsx
import BottomNav from './components/BottomNav'

<BottomNav activeRoute="/customer/menu" />
```

**Props:**
- `activeRoute` (string) - Current route for highlighting

---

#### GlassCard Component
```jsx
import GlassCard from './components/GlassCard'

<GlassCard className="p-6" onClick={handleClick}>
  Content here
</GlassCard>
```

**Props:**
- `children` (React elements) - Card content
- `className` (string) - Additional Tailwind classes
- `onClick` (function) - Click handler

---

#### Button Component
```jsx
import Button from './components/Button'

<Button 
  variant="primary"
  size="lg"
  onClick={handleClick}
>
  Click Me
</Button>
```

**Props:**
- `variant` (string) - 'primary' | 'secondary' | 'danger' | 'success'
- `size` (string) - 'sm' | 'md' | 'lg'
- `className` (string) - Additional classes
- `...props` - All HTML button attributes

---

#### StewardCard Component
```jsx
import StewardCard from './components/StewardCard'

<StewardCard 
  steward={{id, name, status, currentOrders, maxOrders}}
  isSelected={true}
  onClick={() => {}}
/>
```

**Props:**
- `steward` (object) - Steward data
- `isSelected` (boolean) - Selection state
- `onClick` (function) - Selection callback

---

#### OrderStatus Component
```jsx
import OrderStatus from './components/OrderStatus'

<OrderStatus status="cooking" />
```

**Props:**
- `status` (string) - 'kitchen' | 'cooking' | 'serving' | 'finished'

---

### STATE MANAGEMENT

#### Global State (App.jsx)
```javascript
const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false)
const [isStaffLoggedIn, setIsStaffLoggedIn] = useState(false)
const [currentUser, setCurrentUser] = useState(null)
const [currentStaff, setCurrentStaff] = useState(null)
```

#### Local State (Pages)
```javascript
// Example in CustomerMenu.jsx
const [selectedCategory, setSelectedCategory] = useState('all')
const [selectedItems, setSelectedItems] = useState([])
const [selectedSteward, setSelectedSteward] = useState(null)
const [showOrderModal, setShowOrderModal] = useState(false)
```

---

### ROUTING

#### Protected Route Pattern
```javascript
<Route
  path="/customer/menu"
  element={
    isCustomerLoggedIn ? (
      <CustomerMenu user={currentUser} onLogout={() => setIsCustomerLoggedIn(false)} />
    ) : (
      <Navigate to="/customer/auth" />
    )
  }
/>
```

---

### DATA MODELS

#### User Model
```javascript
{
  name: string,      // Sri Lankan name
  email: string,
  phone: string
}
```

#### Steward Model
```javascript
{
  id: number,
  name: string,      // Sri Lankan name
  status: 'active' | 'busy' | 'inactive',
  currentOrders: number,
  maxOrders: number  // Usually 5
}
```

#### Food Model
```javascript
{
  id: number,
  name: string,
  category: 'sri-lankan' | 'italian',
  price: number,     // In Rs.
  description: string,
  image: string      // Emoji
}
```

#### Order Model
```javascript
{
  id: string,        // e.g., 'ORD-001'
  customer: string,
  items: string[],
  status: 'kitchen' | 'cooking' | 'serving' | 'finished',
  totalPrice: number,
  orderedTime: string
}
```

---

## FEATURE WALKTHROUGH

### Authentication Flow
```
User visits /
  ↓
Chooses role (Customer/Staff)
  ↓
CUSTOMER: Goes to /customer/auth
  ├─ Existing user → Login
  └─ New user → Register
STAFF: Goes to /staff/login
  ├─ Email validation
  └─ Password check
  ↓
If success → Set isLoggedIn = true
If failed → Show error (currently shows alert)
```

### Order Flow
```
1. User adds items to cart (CustomerMenu)
2. Modal opens with selected items
3. User selects steward
4. Total price calculated
5. User clicks "Confirm Order"
6. Mock alert confirms order placed
7. Order appears in dashboard
8. User can track status
9. When finished → Can rate steward
```

### Steward Status Flow
```
Staff member updates status:
Kitchen → Cooking → Serving → Finished

Each transition:
- Updates order status
- Moves progress bar 25%
- Disables button when finished
- Shows current step badge
```

---

## CUSTOMIZATION GUIDE

### Change Primary Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  gold: {
    400: '#E6C86E',
    500: '#D4AF37',  // ← Change this
    600: '#B8960A',
  },
}
```

### Add New Food Items
Edit `src/pages/CustomerMenu.jsx`:
```javascript
const foods = [
  {
    id: 9,
    name: 'Your Dish Name',
    category: 'sri-lankan',
    price: 450,
    description: 'Your description',
    image: '🍽️',
  },
  // ... existing items
]
```

### Modify Stewards
Edit any page that uses stewards:
```javascript
const stewards = [
  { id: 1, name: 'Your Name', status: 'active', currentOrders: 0, maxOrders: 5 },
  // ... more stewards
]
```

### Change Theme
Edit `src/index.css`:
```css
/* Change background gradient */
body {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, ...);
}
```

---

## TROUBLESHOOTING

### Issue: `npm install` fails
**Solution:** 
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Dev server won't start
**Solution:**
```bash
# Check if port 3000 is in use
# Kill process or change port in vite.config.js
```

### Issue: Styles not loading
**Solution:**
```bash
# Rebuild Tailwind CSS
npm run dev
# If still broken, rebuild node_modules
rm -rf node_modules package-lock.json
npm install
```

### Issue: Routes not working
**Solution:**
- Ensure all page imports are correct in App.jsx
- Check route paths match component props
- Verify protected route logic

### Issue: Authentication not working
**Solution:**
- Check auth state in browser DevTools (React tab)
- Verify onLoginSuccess callback is called
- Check if user state is passed correctly to pages

---

## PERFORMANCE TIPS

✅ **Development:**
- Use `npm run dev` for hot reload
- Check browser DevTools for console errors
- Use React DevTools extension for debugging

✅ **Production:**
```bash
npm run build          # Creates optimized dist/ folder
npm run preview        # Test production build locally
```

✅ **Optimization:**
- Tailwind CSS automatically purges unused styles
- Vite handles code splitting
- Components are lazy-loaded via routing

---

## BROWSER COMPATIBILITY

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+

---

## DEPLOYMENT CHECKLIST

- ✅ `npm install` completed
- ✅ `npm run build` runs without errors
- ✅ No console errors in production build
- ✅ All routes working correctly
- ✅ Responsive design tested on mobile
- ✅ All features tested
- ✅ Content reviewed for accuracy
- ✅ Production build size acceptable
- ✅ Ready to deploy `dist/` folder

---

## FILE SIZE INFORMATION

```
node_modules/           ~500 MB (dependencies)
src/                    ~100 KB (source code)
dist/ (after build)     ~150 KB (production)
package-lock.json       ~2 MB

Gzipped production:     ~40 KB (very small!)
```

---

## LEARNING RESOURCES

- **React:** https://react.dev
- **React Router:** https://reactrouter.com
- **Tailwind CSS:** https://tailwindcss.com
- **Vite:** https://vitejs.dev

---

This comprehensive guide covers everything you need to use and develop this project!
