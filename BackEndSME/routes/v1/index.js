// Refactored: 2026-04-02 | Issues fixed: R1 | Phase 2 – Routes v1
// Phase 4 update: added /health route
// Aggregates all v1 routes. Imported by server.js and mounted at /api/v1

import { Router } from "express";

import usersRoute         from "./users.route.js";
import sanPhamRoute       from "./san-pham.route.js";
import nguyenLieuRoute    from "./nguyen-lieu.route.js";
import bomRoute           from "./bom.route.js";
import donHangRoute       from "./don-hang.route.js";
import luongRoute         from "./luong.route.js";
import dashboardRoute     from "./dashboard.route.js";
import phongBanRoute      from "./phongban-chucvu.route.js";
import healthRoute        from "./health.route.js";
import dieuChinhKhoRoute  from "./dieu-chinh-kho.route.js";
import auditLogRoute      from "./audit-log.route.js";

const v1Router = Router();

v1Router.use("/health",            healthRoute);   // GET /api/v1/health — public, no auth
v1Router.use("/users",             usersRoute);
v1Router.use("/san-pham",          sanPhamRoute);
v1Router.use("/nguyen-lieu",       nguyenLieuRoute);
v1Router.use("/bom",               bomRoute);
v1Router.use("/don-hang",          donHangRoute);
v1Router.use("/luong",             luongRoute);
v1Router.use("/dashboard",         dashboardRoute);
v1Router.use("/phongban-chucvu",   phongBanRoute);
v1Router.use("/dieu-chinh-kho",    dieuChinhKhoRoute);
v1Router.use("/audit-log",         auditLogRoute);

export default v1Router;
