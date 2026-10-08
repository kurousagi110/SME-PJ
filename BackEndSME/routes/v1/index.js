// Aggregates all v1 routes. Imported by server.js and mounted at /api/v1

import { Router } from "express";

import healthRoute             from "./health.route.js";
import usersRoute              from "./users.route.js";
import productRoute            from "./product.route.js";
import materialRoute           from "./material.route.js";
import bomRoute                from "./bom.route.js";
import productionRoute         from "./production.route.js";
import orderRoute              from "./order.route.js";
import payrollRoute            from "./payroll.route.js";
import dashboardRoute          from "./dashboard.route.js";
import departmentPositionRoute from "./department-position.route.js";
import stockAdjustmentRoute    from "./stock-adjustment.route.js";
import auditLogRoute           from "./audit-log.route.js";
import cashbookRoute           from "./cashbook.route.js";
import partnerRoute            from "./partner.route.js";
import importRoute             from "./import.route.js";
import planningRoute           from "./planning.route.js";
import aiCopilotRoute          from "./ai-copilot.route.js";
import shippingRoute           from "./shipping.route.js";
import notificationRoute       from "./notification.route.js";
import approvalRoute           from "./approval.route.js";
import returnOrderRoute        from "./return-order.route.js";
import stockLedgerRoute       from "./stock-ledger.route.js";
import quotationRoute         from "./quotation.route.js";
import paymentRoute           from "./payment.route.js";
import batchRoute             from "./batch.route.js";

const v1Router = Router();

/* ─── 1. Primary English API Endpoints ─── */
v1Router.use("/health",             healthRoute); // GET /api/v1/health — public
v1Router.use("/users",              usersRoute);
v1Router.use("/products",           productRoute);
v1Router.use("/materials",          materialRoute);
v1Router.use("/bom",                bomRoute);
v1Router.use("/production",         productionRoute);
v1Router.use("/orders",             orderRoute);
v1Router.use("/payroll",            payrollRoute);
v1Router.use("/dashboard",          dashboardRoute);
v1Router.use("/departments",        departmentPositionRoute);
v1Router.use("/stock-adjustments",  stockAdjustmentRoute);
v1Router.use("/audit-log",          auditLogRoute);
v1Router.use("/cashbook",           cashbookRoute);
v1Router.use("/partners",           partnerRoute);
v1Router.use("/import",             importRoute);
v1Router.use("/planning",           planningRoute);
v1Router.use("/ai-copilot",         aiCopilotRoute);
v1Router.use("/shipping",           shippingRoute);
v1Router.use("/notifications",      notificationRoute);
v1Router.use("/approvals",          approvalRoute);
v1Router.use("/returns",            returnOrderRoute);
v1Router.use("/stock-ledger",       stockLedgerRoute);
v1Router.use("/quotations",         quotationRoute);
v1Router.use("/payments",           paymentRoute);
v1Router.use("/batches",            batchRoute);

/* ─── 2. Backward-Compatible Aliases ─── */
v1Router.use("/the-kho",            stockLedgerRoute);
v1Router.use("/bao-gia",            quotationRoute);
v1Router.use("/thanh-toan",         paymentRoute);
v1Router.use("/lo-hang",            batchRoute);
v1Router.use("/san-pham",           productRoute);
v1Router.use("/nguyen-lieu",        materialRoute);
v1Router.use("/san-xuat",           productionRoute);
v1Router.use("/don-hang",           orderRoute);
v1Router.use("/luong",              payrollRoute);
v1Router.use("/phongban-chucvu",    departmentPositionRoute);
v1Router.use("/dieu-chinh-kho",     stockAdjustmentRoute);
v1Router.use("/so-quy",             cashbookRoute);
v1Router.use("/doi-tac",            partnerRoute);
v1Router.use("/van-chuyen",         shippingRoute);
v1Router.use("/thong-bao",          notificationRoute);
v1Router.use("/doi-tra",            returnOrderRoute);

export default v1Router;
