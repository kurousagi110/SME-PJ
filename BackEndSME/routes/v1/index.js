// Refactored: 2026-04-02 | Issues fixed: R1 | Phase 2 – Routes v1
// Aggregates all v1 routes. Imported by server.js and mounted at /api/v1

import { Router } from "express";

import usersRoute      from "./users.route.js";
import sanPhamRoute    from "./san-pham.route.js";
import nguyenLieuRoute from "./nguyen-lieu.route.js";
import bomRoute        from "./bom.route.js";
import donHangRoute    from "./don-hang.route.js";
import luongRoute      from "./luong.route.js";
import dashboardRoute  from "./dashboard.route.js";
import phongBanRoute   from "./phongban-chucvu.route.js";

const v1Router = Router();

v1Router.use("/users",           usersRoute);
v1Router.use("/san-pham",        sanPhamRoute);
v1Router.use("/nguyen-lieu",     nguyenLieuRoute);
v1Router.use("/bom",             bomRoute);
v1Router.use("/don-hang",        donHangRoute);
v1Router.use("/luong",           luongRoute);
v1Router.use("/dashboard",       dashboardRoute);
v1Router.use("/phongban-chucvu", phongBanRoute);

export default v1Router;
