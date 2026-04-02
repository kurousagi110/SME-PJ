# SME Frontend

Giao diện web cho hệ thống quản lý doanh nghiệp SME — Next.js 16 + React 19 + TypeScript.

## Tech Stack

| Công nghệ | Mục đích |
|---|---|
| Next.js 16 (App Router) | Framework, SSR, routing |
| React 19 + TypeScript | UI, type safety |
| Tailwind CSS v4 + Shadcn/UI | Styling, component library |
| TanStack Query v5 | Server state, cache, mutations |
| TanStack Table v8 | Data tables với server-side pagination |
| TanStack Form | Form state management |
| Zod | Schema validation |
| Axios | HTTP client |
| Recharts | Biểu đồ dashboard |

## Chạy với Docker (khuyến nghị)

```bash
# Từ thư mục gốc SME-PJ/
docker compose up -d
```

Truy cập: **http://localhost**

## Chạy development (không dùng Docker)

Yêu cầu: Node.js ≥ 18, backend API đang chạy.

```bash
cd FrontEndSME
npm install
npm run dev
```

Truy cập: http://localhost:3000

## NPM Scripts

| Script | Mô tả |
|---|---|
| `npm run dev` | Development server với hot reload |
| `npm run build` | Build production |
| `npm start` | Chạy production build |
| `npm run lint` | Kiểm tra ESLint |

## Biến môi trường

| Biến | Mô tả | Giá trị |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL của backend API | Xem bên dưới |

**Local dev** — tạo file `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Docker** — được set tự động trong `docker-compose.yml`:
```
NEXT_PUBLIC_API_URL=/api/v1   # browser gọi qua Nginx → api container
```

## Kiến trúc data fetching

```
Component (React)
  └── Hook  src/hooks/use-*.ts          ← TanStack Query (cache, loading, error)
        └── Server Action  src/app/actions/*.ts   ← chạy trên server, đọc cookie
              └── http.ts  (Axios)      ← Bearer token tự động
                    └── Backend API /api/v1
```

- **Server Actions** chạy trên Node.js server → đọc được cookie httpOnly chứa JWT
- **TanStack Query hooks** quản lý cache và state ở client, `staleTime: 5 phút`
- **Mutations** tự `invalidateQueries` cache liên quan sau khi thành công
- **DataTable** (`src/components/shared/DataTable.tsx`) — generic, server-paginated, dùng cho mọi màn hình danh sách

## Cấu trúc thư mục

```
FrontEndSME/src/
├── app/
│   ├── (auth)/             # Trang đăng nhập
│   ├── (modules)/          # Các module nghiệp vụ (layout bảo vệ bởi auth)
│   │   ├── dashboard/
│   │   ├── product/        # Sản phẩm & tồn kho
│   │   ├── material/       # Nguyên vật liệu
│   │   ├── order/          # Đơn hàng bán
│   │   ├── staff/          # Nhân viên
│   │   ├── bom/            # Bill of Materials
│   │   └── salary/         # Lương & chấm công
│   └── actions/            # Next.js Server Actions (gọi API backend)
├── components/
│   ├── shared/             # DataTable và các component dùng chung
│   └── ui/                 # Shadcn/UI base components
├── hooks/                  # TanStack Query hooks theo từng domain
├── lib/
│   ├── axios.ts            # Axios instance + interceptors (client-side)
│   └── http.ts             # HTTP client cho Server Actions (cookie-aware)
├── providers/
│   └── query-provider.tsx  # TanStack Query provider
└── types/                  # TypeScript type definitions
```
