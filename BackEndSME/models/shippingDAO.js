// Standard English Export for ShippingDAO
import VanChuyenDAO, { TRANG_THAI_VAN_CHUYEN, DON_VI_VAN_CHUYEN } from "./vanChuyenDAO.js";

export const SHIPPING_STATUS = TRANG_THAI_VAN_CHUYEN;
export const CARRIERS = DON_VI_VAN_CHUYEN;
export { TRANG_THAI_VAN_CHUYEN, DON_VI_VAN_CHUYEN };
export const ShippingDAO = VanChuyenDAO;
export default VanChuyenDAO;
