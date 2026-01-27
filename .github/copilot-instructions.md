# GearXpert AI Coding Instructions

GearXpert is a full-stack peer-to-peer equipment rental platform. This document guides AI agents through the architecture, conventions, and workflows.

## 🏗️ Architecture Overview

**Backend** (`gearxpertbe/`): Node.js/Express/MongoDB
- Entry: `server.js` with Socket.IO for real-time messaging
- Structure: Controllers → Routes → Models (Domain-driven)
- Auth: JWT tokens (access + refresh) with middleware validation
- Database: Mongoose with soft-delete plugin

**Frontend** (`gearxpertfe/`): React 19 + Redux + Tailwind CSS
- Entry: `Layout.js` (routing root via React Router v7)
- App State: Redux with redux-persist (localStorage)
- Styling: Tailwind CSS + Lucide/React Icons + Sonner/React-Toastify
- Animation: Framer Motion for scroll effects + AOS.js
- Layout system: Dashboard/Supplier/Auth-specific layouts with Outlets

## 🔐 Authentication & State Management

### JWT Flow
1. Backend: `JWTAction.js` creates access/refresh tokens with expiry
2. Frontend: `AxiosCustomize.js` auto-injects Bearer token in Authorization header
3. Interceptor: 401 + errorCode -999 → auto logout + redirect to `/signin`
4. Redux: `userAction.js` dispatches `Fetch_User_Success` with payload:
   ```javascript
   { id, access_token, email, role, username, phone, image, rank, walletBalance, rewardPoints, address }
   ```

### Redux Store Structure
```
user: {
  account: { id, access_token, email, role, phone, image, rank, walletBalance, rewardPoints, socketConnection, onlineUser },
  isAuthenticated: boolean
}
app: {
  isLoadingHome: boolean // Global loading overlay
}
```

**State Persistence**: Redux-persist auto-saves to `localStorage` under key `"root"`. Logout clears via `persistor.purge()`.

## 📁 Frontend Project Structure

```
src/
├── pages/                    # Route-level components (page = route)
│   ├── Device/             # Product detail + specs
│   ├── Rental/             # Checkout, review, cart pages
│   ├── Supplier/           # Supplier portal (devices, requests, maintenance, revenue)
│   ├── User/               # Wallet, profile pages
│   ├── Homepage/           # Landing page with sections
│   ├── Products/           # Browsing all products
│   ├── Favorites/          # Saved items
│   └── Voucher/            # Voucher listing
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.js    # Main app layout (Sidebar + TopNavbar + Outlet)
│   │   ├── SupplierLayout.jsx    # Supplier dashboard (left menu + content)
│   │   └── AdminLayout.jsx       # Admin dashboard (similar pattern)
│   ├── navigation/
│   │   ├── Sidebar.js      # Collapsible user sidebar with profile card
│   │   ├── TopNavbar.js    # Search, notifications, cart, user menu
│   │   └── Header.js       # Homepage header
│   ├── homepage/           # Homepage sections (Hero, Featured, AISuggested, Trending, NewArrivals)
│   ├── Auth/              # SignIn, OTP, VerifyAccount, AuthCallback, ResetPassword
│   ├── chatbot/           # AI chatbot component
│   └── common/            # ProductCard, ScrollAnimation, GlobalLoadingOverlay, RouteHandler
├── service/
│   ├── AxiosCustomize.js   # Axios instance + interceptors
│   ├── decodeJWT.js        # Token expiry check
│   └── ApiService/         # Modular API calls
│       ├── DeviceApi.js
│       ├── CartApi.js      # NORMAL vs INSTANT cart types
│       ├── RentalApi.js
│       ├── VoucherApi.js
│       ├── FavoriteApi.js
│       └── WalletApi.js
├── redux/
│   ├── store.js            # Redux setup + redux-persist config
│   ├── reducer/
│   │   ├── rootReducer.js  # Combines userReducer + appReducer
│   │   ├── userReducer.js  # Auth state
│   │   └── appReducer.js   # Global UI state
│   └── action/
│       ├── userAction.js   # Auth actions (doLogin, doLogout, setSocketConnection)
│       └── appAction.js    # UI actions (showHomeLoading, hideHomeLoading)
└── hooks/                   # Custom React hooks (if any)
```

## 🎨 Component Patterns & Conventions

### Layout Wrapper Pattern
Each layout has: **Header/Sidebar** → **Topbar** → **Outlet** (for nested routes)

```javascript
// DashboardLayout.js structure:
<Sidebar onLogout={onLogout} />  // Left panel (collapsible)
<TopNavbar onNavigate={navigate} />  // Top bar with search/notifications
<main><Outlet /></main>  // Where nested routes render
```

### API Service Pattern (Modular)
```javascript
// src/service/ApiService/DeviceApi.js
export const getDevices = (params = {}) =>
  axios.get(`/devices`, { params });

export const getDeviceDetail = (id) =>
  axios.get(`/devices/${id}`);

// Usage in component:
import { getDevices } from "../../service/ApiService/DeviceApi";
const response = await getDevices({ category: 'CAMERA', limit: 20 });
```

### ProductCard Component
Reusable card with variants (`detailed` vs `simple`), favorite toggle, and click handlers:
```javascript
<ProductCard 
  device={device}
  variant="detailed"
  match={88}  // AI match %
  buttonText="Rent Gear"
  onFavoriteChange={callback}
/>
```

### ScrollAnimation Component (Framer Motion + AOS)
```javascript
<ScrollAnimation direction="up" delay={0.2} duration={0.8} viewportAmount={0.3}>
  <Component />
</ScrollAnimation>
// Directions: 'up', 'down', 'left', 'right', 'none'
// Effects: 'fade', 'scale', 'rotate', 'flip'
```

### Forms & Validation
Components collect data in local state (useState), validate before API calls, show Sonner toast notifications:
```javascript
const validateRental = () => {
  if (!startDate || !endDate) throw new Error("Dates required");
  // ...validation logic
};

try {
  await checkout(formData);
  toast.success("Checkout successful!");
} catch (error) {
  toast.error(error.message);
}
```

## 🛒 Key Features & Workflows

### Cart System
- **Two cart types**: `NORMAL` (persistent) vs `INSTANT` (single-item checkout)
- API: `addToCart(data)` / `addInstantToCart(data)` / `getCart(type)` / `removeCartItem(itemId)` / `clearCart(type)`
- Frontend flow: ProductDetailPage → AddToCart → CartPage → RentalCheckout

### Rental Checkout Flow
1. Fetch cart items via `getCart(CART_TYPE)`
2. Fill address, phone, delivery preferences
3. Optional insurance + voucher validation
4. Select payment method: `CARD`, `MOMO`, `BANK`
5. Call `checkout(data)` → backend creates Rental record
6. Navigate to review page → RentalReviewPage

### Voucher System
- `validateVoucher(code)` checks validity + discount amount
- Applied voucher reduces total price
- Stored in cart/rental data

### Favorites / Wishlist
- `toggleFavorite(deviceId)` and `checkIsFavorite(deviceId)` in ProductCard
- Optimistic UI updates with local state
- Requires authentication

### Supplier Portal
Routes under `/supplier/*`:
- `/supplier/devices` → SupplierDevicesList (inventory management)
- `/supplier/rental-requests` → SupplierRentalRequests (approve/reject)
- `/supplier/maintenance` → SupplierMaintenance (maintenance tasks)
- `/supplier/revenue` → SupplierRevenue (earnings dashboard)

## 🔌 Real-Time Features (Socket.IO)

### Integration Points
1. **Set socket connection**: After login, dispatch `setSocketConnection(socket)` in Redux
2. **User online status**: Listen to `getUsers` event → dispatch `setOnlineUser(list)`
3. **Messaging**: Emit `sendMessage` → listen `getMessage`
4. **Message seen**: Emit `seenMessage` → listen `messageSeen`

### Example (in component):
```javascript
const socketConnection = useSelector(state => state.user.account.socketConnection);

const handleMessage = (text) => {
  if (socketConnection) {
    socketConnection.emit('sendMessage', { senderId, receiverId, text, conversationId });
  }
};
```

## 📱 Responsive Design

- **Tailwind breakpoints**: `hidden lg:flex` (hide on mobile, show on desktop)
- **Mobile-first**: Desktop features hidden with `hidden` + shown with `lg:` prefix
- **Sidebar collapse**: Supplier/Admin layouts toggle width on small screens
- **Modal/Drawer pattern**: Mobile uses drawer, desktop uses full sidebar

## 🚀 Developer Workflows

### Frontend Setup
```bash
cd gearxpertfe
npm install
npm start  # Starts dev server on localhost:3000
# .env.local (optional):
REACT_APP_API_URL=http://localhost:1357
```

### Adding a New Page
1. **Create page file**: `src/pages/Domain/DomainPage.js`
2. **Add route in Layout.js**: `<Route path="/domain" element={<DomainPage />} />`
3. **Create API service**: `src/service/ApiService/DomainApi.js`
4. **Use in component**: Import API + useState + useEffect for data fetching

### Adding a Feature to Existing Page
1. **Identify layout**: Which layout wraps the page? (DashboardLayout, SupplierLayout, etc.)
2. **Fetch data**: Import API service, call in useEffect
3. **Update Redux if needed**: Dispatch action in userAction.js if multi-page data needed
4. **Add UI**: Components + Tailwind styling + toast notifications
5. **Test**: Browser dev tools → Redux tab to verify state

### Debugging Tips
- **Redux DevTools**: `store.js` line 13 enables Redux DevTools browser extension
- **Network requests**: Check browser Network tab; Authorization header auto-injected by AxiosCustomize
- **Token expiry**: Use `isTokenExpired()` from `decodeJWT.js` to validate token
- **Loading states**: Use Redux `isLoadingHome` or local useState for component-level loading
- **Toast notifications**: Sonner (Homepage) vs React-Toastify (Checkout) — use appropriate one per component

## 📐 Styling Conventions

- **Tailwind classes**: Prefer utility-first; use `bg-slate-50`, `text-slate-900`, etc.
- **Color palette**: Primary indigo-600, secondary slate grays, accents yellow/red
- **Spacing**: Consistent use of `gap-3`, `p-4`, `px-6`, `py-3` patterns
- **Shadows**: Light shadows `shadow-sm`, heavier `shadow-xl shadow-indigo-100`
- **Borders**: `rounded-2xl` for modern look, `border border-slate-200` for subtle dividers
- **Icons**: Lucide React for UI (Search, ShoppingCart, Bell, etc.); React Icons (Feather `Fi*`) in Admin layouts
- **Animations**: Framer Motion for page transitions, Tailwind animations for simple effects

## 🔗 Critical File References

- **Frontend routing**: [Layout.js](src/Layout.js)
- **Redux setup**: [store.js](src/redux/store.js)
- **Auth actions**: [userAction.js](src/redux/action/userAction.js)
- **Axios config**: [AxiosCustomize.js](src/service/AxiosCustomize.js)
- **Main layouts**: [DashboardLayout.js](src/components/layout/DashboardLayout.js), [SupplierLayout.jsx](src/components/layout/SupplierLayout.jsx)
- **Homepage**: [Homepage.js](src/pages/Homepage/Homepage.js)
- **Checkout**: [RentalCheckout.js](src/pages/Rental/RentalCheckout.js) (complex workflow with map, voucher, payment)
- **Product detail**: [ProductDetailPage.js](src/pages/Device/ProductDetailPage.js)

## ⚠️ Common Pitfalls & Solutions

| Issue | Solution |
|-------|----------|
| Token not in Authorization header | Check Redux state; `AxiosCustomize.js` line 12 extracts from `state.user.account.access_token` |
| Page redirects to /signin randomly | Check token expiry; errorCode -999 triggers logout. Use `isTokenExpired()` to validate before API call |
| Favorite toggle not working | Ensure user is authenticated (`isAuthenticated: true`); API requires Bearer token |
| Cart type confusion | Use `getCart("NORMAL")` for persistent cart, `getCart("INSTANT")` for quick checkout |
| Sidebar not collapsing on mobile | Check `collapsed` state binding in Sidebar.js; Tailwind `hidden lg:block` on sidebar for desktop-only |
| Sonner vs React-Toastify conflict | Homepage uses Sonner, Checkout uses React-Toastify; don't mix in same component |

## 📦 Key Dependencies

- **React Router**: v7.9.6 (navigation)
- **Redux**: Redux Toolkit + redux-persist (state)
- **UI Components**: Lucide React, React Icons (icons); Sonner, React-Toastify (notifications)
- **Forms/Maps**: React Leaflet v5 (mapping), Leaflet (GIS)
- **Animation**: Framer Motion, AOS.js
- **HTTP**: Axios with custom interceptors
- **Build**: React Scripts 5.0.1
