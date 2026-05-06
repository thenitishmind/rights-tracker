# Rights Tracker

A comprehensive rights and credit tracker application for managing loans, cases, and user profiles with real-time updates.

**Created by:** Nitish

---

## 📋 Features

- 🔐 **User Authentication** - Secure login with role-based access control
- 💳 **Credit Tracker** - Manage loan cases with detailed tracking
- 📊 **Dashboard** - Real-time analytics and case summaries
- 👥 **User Management** - Admin controls for user creation and permissions
- 📤 **Import/Export** - Excel file support with duplicate detection
- 🔄 **Real-time Updates** - Live data synchronization
- 🏢 **Multi-Branch Support** - Branch-based data segregation
- 📱 **Responsive UI** - Mobile-friendly interface

---

## 🛠 Tech Stack

| Category | Technologies |
|----------|---------------|
| **Frontend** | Next.js 16, React, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **File Processing** | XLSX (Excel) |
| **UI Components** | Lucide React Icons, React Hot Toast |
| **Build Tool** | Turbopack |

---

## 📊 Application Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     RIGHTS TRACKER FLOW                      │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  User Login  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────┐
    │  Authentication  │
    │  (Supabase Auth) │
    └────────┬─────────┘
             │
        ┌────┴────┐
        │          │
        ▼          ▼
    ┌────────┐  ┌────────┐
    │ Admin  │  │  User  │
    └───┬────┘  └───┬────┘
        │           │
        ▼           ▼
    ┌───────────────────────────┐
    │     Dashboard Page        │
    │  • MIS Reports            │
    │  • MIS Tracker            │
    │  • Last 6 Months          │
    │  • Credit Tracker         │
    │  • Admin Settings (Admin) │
    │  • User Management (Admin)│
    └─────────┬─────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌─────────────┐   ┌─────────────────┐
│   View      │   │   CRUD          │
│   Data      │   │   Operations    │
└──────┬──────┘   └────────┬────────┘
       │                   │
       └───────────┬───────┘
                   │
        ┌──────────┴─────────┐
        │                    │
        ▼                    ▼
    ┌────────────┐    ┌─────────────┐
    │Import/     │    │  Real-time  │
    │Export      │    │  Updates    │
    │(Excel)     │    │ (via        │
    │            │    │  Supabase   │
    └────────┬───┘    │ Realtime)   │
             │        └──────┬──────┘
             │               │
             └───────────┬───┘
                        │
                        ▼
                ┌──────────────────┐
                │   Supabase DB    │
                │  (PostgreSQL)    │
                └──────────────────┘
                  │        │       │
        ┌─────────┼────────┼───────┘
        │         │        │
        ▼         ▼        ▼
    ┌────────┐ ┌───────┐ ┌──────────┐
    │ Users  │ │Cases  │ │Branches  │
    └────────┘ └───────┘ └──────────┘
```

---

## 📁 Project Structure

```
rights-tracker/
├── app/
│   ├── api/                    # API Routes
│   │   ├── admin/             # Admin endpoints
│   │   └── profile/           # Profile endpoints
│   ├── (dashboard)/           # Dashboard layout group
│   │   ├── admin/             # Admin features
│   │   ├── credit-tracker/    # Credit management
│   │   ├── mis-reports/       # Reports
│   │   └── ...
│   ├── login/                 # Authentication page
│   ├── setup/                 # Setup page
│   └── layout.tsx
├── components/                # Reusable components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── ...
├── lib/
│   └── supabase/             # Database clients
│       ├── client.ts          # Client-side Supabase
│       └── server.ts          # Server-side Supabase
├── supabase/
│   └── schema.sql            # Database schema
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rights-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   Create a `.env.local` file in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Visit [http://localhost:3000](http://localhost:3000)

---

## 📦 Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint
```

---

## 🗄️ Database Schema

The application uses PostgreSQL (via Supabase) with the following main tables:
- **users** - User authentication
- **user_profiles** - User profile data and roles
- **branches** - Branch information
- **credit_tracker** - Credit case records
- **imports** - Import history and logs

See `supabase/schema.sql` for complete schema details.

---

## 🔐 Authentication & Authorization

- Role-based access control (Admin, Editor, Viewer)
- Supabase authentication
- Branch-level data segregation
- Permission-based feature access

---

## 📝 License

This project is private and confidential.

---

**Created by:** Nitish  
**Last Updated:** May 2026
