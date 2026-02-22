# 🍔 preorder.food

A modern campus food pre-ordering platform that connects students with canteen vendors, enabling seamless food ordering, real-time order tracking, and hassle-free pickups.

![preorder.food](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)

## 📖 Overview

**preorder.food** is a full-stack web application designed to streamline the food ordering experience in educational institutions. Students can browse menus, place orders, and track their order status in real-time, while vendors can manage their menu items, process orders, and control their canteen operations efficiently.

### Live Demo
🔗 [https://uni-food-link.lovable.app](https://uni-food-link.lovable.app)

---

## ✨ Features

### For Students
- 🏪 **Browse Canteens** - View all available canteens with real-time open/closed status
- 📋 **Menu Browsing** - Explore categorized menu items with images, descriptions, and prices
- 🛒 **Smart Cart** - Add items from multiple canteens with separate cart management
- 💳 **Secure Payments** - Integrated Cashfree payment gateway for seamless transactions
- 📱 **Order Tracking** - Real-time order status updates (Pending → Ready → Completed)
- 🎫 **Pickup Codes** - Unique pickup codes for easy order collection
- 👑 **Crown Rewards** - Loyalty program earning crowns on every order
- 🎟️ **Coupon System** - Apply discount coupons at checkout

### For Vendors
- 📊 **Dashboard** - Overview of orders, revenue, and canteen status
- 🍽️ **Menu Management** - Add, edit, and manage menu items with categories
- 📦 **Order Management** - View incoming orders and update status in real-time
- ⏸️ **Order Control** - Set order limits and pause accepting orders when busy
- 🎫 **Coupon Management** - Create and manage promotional coupons
- 📧 **Email Notifications** - Automatic email alerts for new orders

### Platform Features
- 🔐 **Authentication** - Secure email-based authentication with role management
- 📱 **Responsive Design** - Fully optimized for mobile, tablet, and desktop
- 🔔 **Real-time Updates** - Live order status changes via WebSocket connections
- 🌙 **Theme Support** - Light and dark mode support
- 🛡️ **Error Handling** - Global error boundaries with automatic retry logic
- 📞 **Customer Support** - WhatsApp integration for instant support

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI library with hooks and concurrent features |
| **TypeScript** | Type-safe JavaScript development |
| **Vite** | Fast build tool and dev server |
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui** | Accessible component library |
| **Framer Motion** | Animation library for smooth transitions |
| **React Router** | Client-side routing |
| **TanStack Query** | Server state management and caching |
| **React Hook Form** | Form handling with Zod validation |
| **Recharts** | Data visualization charts |

### Backend (Lovable Cloud)
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary database |
| **Supabase Auth** | User authentication and session management |
| **Supabase Realtime** | WebSocket-based real-time subscriptions |
| **Edge Functions** | Serverless backend logic (Deno runtime) |
| **Row Level Security** | Fine-grained data access control |

### Integrations
| Service | Purpose |
|---------|---------|
| **Cashfree** | Payment processing |
| **Brevo** | Transactional emails |
| **WhatsApp** | Customer support |

---

## 📁 Project Structure

```
preorder.food/
├── public/                    # Static assets
│   ├── images/               # Public images
│   ├── videos/               # Background videos
│   └── favicon.ico           # Site favicon
│
├── src/
│   ├── assets/               # Imported assets (processed by Vite)
│   │
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── Header.tsx       # Navigation header
│   │   ├── Footer.tsx       # Site footer
│   │   ├── MenuItemCard.tsx # Menu item display
│   │   ├── OrderCard.tsx    # Order display for students
│   │   ├── VendorOrderCard.tsx # Order display for vendors
│   │   └── ...
│   │
│   ├── context/              # React context providers
│   │   ├── AuthContext.tsx  # Authentication state
│   │   └── CartContext.tsx  # Shopping cart state
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── use-mobile.tsx   # Mobile detection
│   │   ├── use-toast.ts     # Toast notifications
│   │   ├── useCanteenOrderStatus.ts
│   │   ├── useNotificationSound.ts
│   │   └── useSupabaseConnection.ts
│   │
│   ├── integrations/         # External service integrations
│   │   └── supabase/
│   │       ├── client.ts    # Supabase client (auto-generated)
│   │       └── types.ts     # Database types (auto-generated)
│   │
│   ├── lib/                  # Utility functions
│   │   ├── utils.ts         # General utilities
│   │   ├── types.ts         # TypeScript type definitions
│   │   └── retry.ts         # Retry logic for API calls
│   │
│   ├── pages/                # Route components
│   │   ├── Auth.tsx         # Authentication page
│   │   ├── Landing.tsx      # Homepage
│   │   ├── NotFound.tsx     # 404 page
│   │   │
│   │   ├── student/         # Student-facing pages
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── CanteenMenu.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── StudentOrders.tsx
│   │   │   └── PaymentResult.tsx
│   │   │
│   │   ├── vendor/          # Vendor-facing pages
│   │   │   ├── VendorDashboard.tsx
│   │   │   ├── MenuManagement.tsx
│   │   │   ├── CouponManagement.tsx
│   │   │   └── VendorRegister.tsx
│   │   │
│   │   └── policies/        # Legal pages
│   │       ├── PrivacyPolicy.tsx
│   │       ├── TermsConditions.tsx
│   │       ├── RefundPolicy.tsx
│   │       └── ContactSupport.tsx
│   │
│   ├── App.tsx              # Root component with routes
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles and CSS variables
│
├── supabase/
│   ├── config.toml          # Supabase configuration
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge functions
│       ├── create-cashfree-order/
│       ├── verify-cashfree-payment/
│       ├── send-brevo-email/
│       ├── send-vendor-order-email/
│       └── process-notification-queue/
│
├── tailwind.config.ts       # Tailwind CSS configuration
├── vite.config.ts           # Vite build configuration
└── package.json             # Dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun runtime
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/preorder-food.git
   cd preorder-food
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

### Environment Variables

The project uses Lovable Cloud, which automatically manages environment variables. For local development or self-hosting, you'll need:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

---

## 📊 Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with role (student/vendor) |
| `canteens` | Canteen information and settings |
| `categories` | Menu categories per canteen |
| `menu_items` | Food items with prices and availability |
| `orders` | Customer orders with status tracking |
| `order_items` | Individual items within orders |
| `coupons` | Discount coupons per canteen |
| `crown_balances` | User loyalty points |
| `crown_transactions` | Crown earning/spending history |

### Key Relationships
- Users → Profiles (1:1)
- Vendors → Canteens (1:1)
- Canteens → Categories → Menu Items (hierarchical)
- Users → Orders → Order Items (order flow)

---

## 🔒 Security

- **Row Level Security (RLS)** - All database tables have RLS policies
- **Authentication** - Secure email-based auth with session management
- **Payment Security** - Server-side payment verification via Edge Functions
- **Input Validation** - Zod schemas for form validation
- **HTTPS** - All traffic encrypted in production

---

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

- **Email**: preorderfood2026@gmail.com
- **WhatsApp**: [Contact Support](https://wa.me/917065909150)
- **Support Hours**: Monday - Friday, 10:00 AM - 4:00 PM IST

---

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons by [Lucide](https://lucide.dev)

---

<p align="center">
  Made with ❤️ for campus communities
</p>
