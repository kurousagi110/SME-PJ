import logger from "../utils/logger.js";

let aiSettingsCol = null;

export default class AiConfigDAO {
  static async injectDB(conn) {
    if (aiSettingsCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    aiSettingsCol = db.collection("ai_settings");
    logger.info("AiConfigDAO initialized");
  }

  static maskApiKey(key) {
    if (!key || typeof key !== "string") return "";
    if (key.length <= 8) return "******";
    return key.slice(0, 6) + "..." + key.slice(-4);
  }

  static async getConfig() {
    try {
      let doc = null;
      if (aiSettingsCol) {
        doc = await aiSettingsCol.findOne({ _id: "global_ai_config" });
      }

      const envGemini = process.env.GEMINI_API_KEY || "";
      const envOpenAI = process.env.OPENAI_API_KEY || "";

      let provider = doc?.provider || (envGemini ? "gemini" : envOpenAI ? "openai" : "gemini");
      let rawKey = doc?.api_key || (provider === "openai" ? envOpenAI : envGemini);
      let model = doc?.model || (provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash");
      let isActive = Boolean(doc?.is_active !== undefined ? doc.is_active : rawKey);

      return {
        provider,
        model,
        has_key: Boolean(rawKey),
        masked_key: this.maskApiKey(rawKey),
        is_active: isActive && Boolean(rawKey),
        updated_at: doc?.updated_at || null,
      };
    } catch (err) {
      logger.error("AiConfigDAO.getConfig error", { error: err.message });
      return {
        provider: "gemini",
        model: "gemini-1.5-flash",
        has_key: false,
        masked_key: "",
        is_active: false,
      };
    }
  }

  static async getActiveConfig() {
    try {
      let doc = null;
      if (aiSettingsCol) {
        doc = await aiSettingsCol.findOne({ _id: "global_ai_config" });
      }

      const envGemini = process.env.GEMINI_API_KEY || "";
      const envOpenAI = process.env.OPENAI_API_KEY || "";

      let provider = doc?.provider || (envGemini ? "gemini" : envOpenAI ? "openai" : "gemini");
      let apiKey = doc?.api_key || (provider === "openai" ? envOpenAI : envGemini);
      let model = doc?.model || (provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash");
      let isActive = doc?.is_active !== undefined ? doc.is_active : Boolean(apiKey);

      if (!isActive || !apiKey) return null;

      return {
        provider,
        apiKey: apiKey.trim(),
        model: model || (provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash"),
      };
    } catch (err) {
      return null;
    }
  }

  static async saveConfig({ provider = "gemini", api_key, model, is_active = true }) {
    try {
      if (!aiSettingsCol) return { error: new Error("Database not connected") };

      let existing = await aiSettingsCol.findOne({ _id: "global_ai_config" });
      const finalKey = api_key !== undefined && api_key !== "" ? api_key.trim() : existing?.api_key || "";

      const updateDoc = {
        _id: "global_ai_config",
        provider: provider === "openai" ? "openai" : "gemini",
        api_key: finalKey,
        model: model || (provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash"),
        is_active: Boolean(is_active),
        updated_at: new Date(),
      };

      await aiSettingsCol.updateOne(
        { _id: "global_ai_config" },
        { $set: updateDoc },
        { upsert: true }
      );

      return {
        success: true,
        config: {
          provider: updateDoc.provider,
          model: updateDoc.model,
          has_key: Boolean(updateDoc.api_key),
          masked_key: this.maskApiKey(updateDoc.api_key),
          is_active: updateDoc.is_active,
        },
      };
    } catch (err) {
      logger.error("AiConfigDAO.saveConfig error", { error: err.message });
      return { error: err };
    }
  }

  static async testConnection({ provider = "gemini", api_key, model }) {
    try {
      const key = api_key?.trim();
      if (!key) return { success: false, message: "Vui lòng nhập API Key" };

      if (provider === "gemini") {
        const m = model || "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello, reply with OK" }] }],
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            message: `Lỗi kết nối Gemini (${res.status}): ${errData?.error?.message || res.statusText}`,
          };
        }
        return { success: true, message: `Kết nối thành công Google Gemini (${m})!` };
      } else {
        const m = model || "gpt-4o-mini";
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: "user", content: "Hello, reply with OK" }],
            max_tokens: 5,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            message: `Lỗi kết nối OpenAI (${res.status}): ${errData?.error?.message || res.statusText}`,
          };
        }
        return { success: true, message: `Kết nối thành công OpenAI (${m})!` };
      }
    } catch (err) {
      return { success: false, message: "Lỗi kiểm tra mạng: " + err.message };
    }
  }
}
