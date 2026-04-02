# FrontEndSME — Next.js Admin Portal

A modern, highly optimized admin portal for Small and Medium Enterprises (SME) to manage **Inventory**, **Sales & Purchase Orders**, **Bill of Materials (BOM)**, and **Payroll** — built on the Next.js App Router with a fully type-safe, server-paginated UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Component Library | Shadcn/UI |
| Data Fetching | TanStack Query v5 (React Query) |
| HTTP Client | Axios |
| Forms | React Hook Form |
| Containerization | Docker + Nginx |

---

## Feature-Based Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (modules)/                # Protected route group
│   │   ├── dashboard/            # Overview & KPIs
│   │   ├── product/
│   │   │   ├── catalog/          # Product catalog (CRUD + BOM)
│   │   │   └── orders/           # Production order management
│   │   ├── material/
│   │   │   ├── catalog/          # Raw material catalog (CRUD)
│   │   │   ├── orders/           # Purchase orders
│   │   │   └── receipt/          # Goods receipt
│   │   ├── warehouse/            # Stock overview (finished + raw)
│   │   ├── sales/                # Sales order lifecycle
│   │   ├── staff/                # Employee management
│   │   ├── department/           # Department & positions
│   │   └── check-in/             # Attendance tracking
│   ├── actions/                  # Next.js Server Actions (API bridge)
│   │   ├── product.ts
│   │   ├── material.ts
│   │   ├── bom.ts
│   │   └── ...
│   └── login/                    # Public auth page
│
├── components/
│   ├── shared/
│   │   └── DataTable.tsx         # Generic server-paginated table (TanStack Table v8)
│   └── ui/                       # Shadcn/UI primitives
│
├── hooks/                        # Centralized TanStack Query hooks
│   ├── use-product.ts
│   ├── use-material.ts
│   ├── use-bom.ts
│   ├── use-order-sale.ts
│   ├── use-production-orders.ts
│   ├── use-purchase-receipt.ts
│   ├── use-staff.ts
│   └── ...
│
├── lib/
│   ├── axios.ts                  # Axios instance + interceptors
│   └── http.ts                   # Server-side fetch client (Server Actions)
│
├── providers/
│   └── query-provider.tsx        # TanStack Query client provider
│
└── types/
    └── index.ts                  # Shared TypeScript interfaces
```

---

## Data Fetching Strategy

### TanStack Query (React Query v5)

All server state is managed through **centralized query hooks** in `src/hooks/`. This provides:

- **Automatic caching** — data is cached per query key (e.g., `["product-catalog", params]`) and shared across components
- **Background refetching** — stale data is refreshed silently without blocking the UI
- **Stale-time control** — catalog queries use a 5-minute stale time to reduce redundant network requests
- **Optimistic invalidation** — mutations (create/update/delete) automatically invalidate the relevant query cache on success

```ts
// Example: product catalog hook
export function useProductList(params: ProductListParams) {
  return useQuery({
    queryKey: ["product-catalog", params],
    queryFn: () => fetchProductList(params),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Axios Interceptor

The client-side Axios instance (`src/lib/axios.ts`) handles cross-cutting concerns globally:

| Concern | Behavior |
|---|---|
| Authentication | Attaches `Authorization: Bearer <token>` from cookie on every request |
| Response unwrapping | Unwraps the `{ success, data }` API envelope automatically |
| Error handling | Displays toast notifications for API errors via Sonner |
| 401 handling | Redirects to `/login` on unauthorized responses |

### Server Actions

Server Actions (`src/app/actions/`) act as a typed API bridge between the Next.js server and the backend. They use a cookie-aware HTTP client (`src/lib/http.ts`) with automatic token refresh logic — ensuring SSR-safe data access without exposing credentials to the browser.

---

## Getting Started (Local Development)

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A running backend API (see `BackEndSME/`)

### Environment Variables

Create a `.env.local` file in the `FrontEndSME/` directory:

```env
# Base URL of the backend REST API
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Install & Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Docker Deployment

The frontend is fully containerized using a **multi-stage Dockerfile** that produces a minimal production image, served behind an **Nginx reverse proxy**.

### Architecture

```
Client Request
     │
     ▼
┌─────────────┐
│    Nginx    │  ← Reverse proxy (port 80)
│  (port 80)  │     Static assets, gzip, proxy pass
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Next.js    │  ← App server (port 3000, internal)
│  (SSR/SSG)  │
└─────────────┘
```

### Dockerfile Stages

| Stage | Base Image | Purpose |
|---|---|---|
| `deps` | `node:18-alpine` | Install production dependencies |
| `builder` | `node:18-alpine` | Build the Next.js application |
| `runner` | `node:18-alpine` | Minimal runtime image |

### Running with Docker Compose

From the **project root** (the directory containing both `FrontEndSME/` and `BackEndSME/`):

```bash
# Build images and start all services in detached mode
docker compose up --build -d
```

```bash
# View running containers
docker compose ps

# Stream logs
docker compose logs -f frontend

# Stop all services
docker compose down
```

### Environment Variables (Docker)

Set the API URL in `docker-compose.yml` or via a `.env` file at the project root:

```env
NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
```

> **Note:** Inside Docker Compose, services communicate over the internal Docker network. Use the service name (e.g., `backend`) instead of `localhost` for `NEXT_PUBLIC_API_URL` in server-side calls.

---

## Role-Based Access

| Role | Department | Permissions |
|---|---|---|
| Admin | Phòng giám đốc | Full CRUD on all modules |
| Staff | All other departments | Read-only access |

Access control is enforced at the component level by checking the authenticated user's `phong_ban.ten` field retrieved via `useMyProfile()`.

---

## License

Internal use only — SME Management System.
