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
import financialRoute         from "./financial.route.js";
import botRoute               from "./bot.route.js";
import contractRoute          from "./contract.route.js";
import warrantyRoute          from "./warranty.route.js";
import portalRoute            from "./portal.route.js";
import searchRoute            from "./search.route.js";
import settingsRoute          from "./settings.route.js";
import promotionRoute         from "./promotion.route.js";
import posShiftRoute          from "./pos-shift.route.js";
import hrRequestRoute         from "./hr-request.route.js";
import warehouseRoute         from "./warehouse.route.js";
import crmPipelineRoute       from "./crm-pipeline.route.js";
import procurementRoute       from "./procurement.route.js";

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
v1Router.use("/financial",          financialRoute);
v1Router.use("/bot",                botRoute);
v1Router.use("/contracts",          contractRoute);
v1Router.use("/warranty",           warrantyRoute);
v1Router.use("/portal",             portalRoute); // Public customer self-service portal
v1Router.use("/search",             searchRoute); // Omni-search Ctrl+K
v1Router.use("/settings",           settingsRoute); // System & Company Settings
v1Router.use("/promotions",         promotionRoute); // Dynamic Promotions & Loyalty Points
v1Router.use("/pos-shifts",         posShiftRoute); // POS Cashier Shift Management
v1Router.use("/hr-requests",        hrRequestRoute); // HR ESS Leave, OT & Smart Attendance
v1Router.use("/warehouses",         warehouseRoute); // Multi-Warehouse, Bin & Internal Transfers
v1Router.use("/crm-pipeline",       crmPipelineRoute); // CRM Sales Pipeline Kanban
v1Router.use("/procurement",        procurementRoute); // PR, RFQ Matrix, Vendor Scorecard & 3-Way Match



/* ─── 2. Backward-Compatible Aliases ─── */
v1Router.use("/tai-chinh",          financialRoute);
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
