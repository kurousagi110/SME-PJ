import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import AiCopilotDAO from "../models/aiCopilotDAO.js";
import AiConfigDAO from "../models/aiConfigDAO.js";

export default class AiCopilotController {
  static query = asyncHandler(async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
      throw ApiError.badRequest("Vui lòng nhập nội dung câu hỏi cho AI Copilot");
    }

    const result = await AiCopilotDAO.processQuery(query, req.user);
    return sendSuccess(res, result, "Phân tích câu hỏi thành công");
  });

  static getSuggestions = asyncHandler(async (req, res) => {
    const suggestions = await AiCopilotDAO.getSuggestions();
    return sendSuccess(res, suggestions, "Lấy danh sách gợi ý thành công");
  });

  static getConfig = asyncHandler(async (req, res) => {
    const config = await AiConfigDAO.getConfig();
    return sendSuccess(res, config, "Lấy cấu hình AI thành công");
  });

  static saveConfig = asyncHandler(async (req, res) => {
    const { provider, api_key, model, is_active } = req.body;
    const result = await AiConfigDAO.saveConfig({ provider, api_key, model, is_active });
    if (result.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.config, "Lưu cấu hình AI thành công");
  });

  static testConnection = asyncHandler(async (req, res) => {
    const { provider, api_key, model } = req.body;
    const result = await AiConfigDAO.testConnection({ provider, api_key, model });
    return sendSuccess(res, result, result.message);
  });
}

