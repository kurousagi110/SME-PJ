import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import { omniSearch } from "../../controllers/searchController.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", omniSearch);

export default router;
