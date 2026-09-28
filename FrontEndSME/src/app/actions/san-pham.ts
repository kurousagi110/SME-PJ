"use server";

// Bridge for backward-compatibility
export * from "./product";
export {
  fetchSanPhamList,
  fetchSanPhamById,
  fetchProductListWithBOM,
  fetchProductByIdWithBOM,
} from "./product";
