import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import AiCopilotDAO from "../models/aiCopilotDAO.js";

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
}
