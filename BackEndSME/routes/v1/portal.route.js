import { Router } from "express";
import PortalController from "../../controllers/portalController.js";

const router = Router();

// Simple in-memory rate limiter for public lookup (30 requests / minute / IP)
const rateBuckets = new Map();
function portalRateLimit(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const windowMs = 60_000;
  const maxReqs = 30;
  const bucket = rateBuckets.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  if (bucket.count > maxReqs) {
    return res.status(429).json({
      success: false,
      message: "Bạn thao tác quá nhanh, vui lòng thử lại sau 1 phút",
    });
  }
  return next();
}

router.get("/lookup", portalRateLimit, PortalController.lookup);

export default router;
