"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconSparkles,
  IconSend,
  IconX,
  IconRotateClockwise,
  IconArrowRight,
  IconRobot,
  IconUser,
  IconAdjustments,
  IconKey,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  askAiCopilotAction,
  fetchAiSuggestionsAction,
  fetchAiConfigAction,
  saveAiConfigAction,
  testAiConnectionAction,
  AiQueryResult,
  AiConfig,
} from "@/app/actions/ai-copilot";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  action?: { title: string; url: string };
  time: string;
}

export function AiCopilotWidget() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [inputQuery, setInputQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Array<{ text: string; category: string }>>([
    { text: "📊 Doanh thu và lợi nhuận bán hàng?", category: "finance" },
    { text: "⚠️ Hàng nào tồn kho sắp hết cần nhập?", category: "inventory" },
    { text: "💰 Khách hàng nào nợ nhiều nhất?", category: "debt" },
    { text: "🛒 Bán Shopee hay TikTok Shop lời hơn?", category: "ecommerce" },
  ]);

  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "👋 **Xin chào! Tôi là Trợ Lý AI SME Copilot.**\n\nTôi được kết nối trực tiếp với CSDL hệ thống để phân tích doanh thu, cảnh báo tồn kho, công nợ và kế hoạch bán hàng. Bạn muốn tra cứu thông tin gì hôm nay?",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // AI Configuration State
  const [aiConfig, setAiConfig] = React.useState<AiConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [cfgProvider, setCfgProvider] = React.useState<"gemini" | "openai">("gemini");
  const [cfgKey, setCfgKey] = React.useState("");
  const [cfgModel, setCfgModel] = React.useState("gemini-1.5-flash");
  const [cfgActive, setCfgActive] = React.useState(true);
  const [showKey, setShowKey] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const loadAiConfig = React.useCallback(async () => {
    const config = await fetchAiConfigAction();
    if (config) {
      setAiConfig(config);
      setCfgProvider(config.provider || "gemini");
      setCfgModel(config.model || (config.provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash"));
      setCfgActive(config.is_active);
    }
  }, []);

  React.useEffect(() => {
    loadAiConfig();
  }, [loadAiConfig]);

  const handleTestConnection = async () => {
    if (!cfgKey && !aiConfig?.has_key) {
      setTestResult({ success: false, message: "Vui lòng nhập API Key để kiểm tra kết nối." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnectionAction({
        provider: cfgProvider,
        api_key: cfgKey || undefined,
        model: cfgModel,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Lỗi kiểm tra" });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await saveAiConfigAction({
        provider: cfgProvider,
        api_key: cfgKey || undefined,
        model: cfgModel,
        is_active: cfgActive,
      });
      if (res.success && res.data) {
        setAiConfig(res.data);
        setCfgKey("");
        setSaveMessage("Đã lưu cấu hình AI thành công!");
        setTimeout(() => setSaveMessage(null), 3500);
      } else {
        setSaveMessage("Lỗi lưu: " + (res.message || "Không xác định"));
      }
    } catch (err: any) {
      setSaveMessage("Lỗi lưu: " + err?.message);
    } finally {
      setSaving(false);
    }
  };

  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      fetchAiSuggestionsAction().then((sugs) => {
        if (sugs && sugs.length > 0) setSuggestions(sugs);
      });
      loadAiConfig();
    }
  }, [open, messages, loadAiConfig]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: "user-" + Date.now(),
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const res = await askAiCopilotAction(query);
      const aiMsg: Message = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: res?.answer || "Tôi đã nhận được câu hỏi nhưng không tìm thấy dữ liệu phù hợp.",
        action: res?.action,
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (res?.suggestions && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "ai-err-" + Date.now(),
          sender: "ai",
          text: "Xin lỗi, đã có lỗi kết nối tới dịch vụ AI. Vui lòng thử lại sau.",
          time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        sender: "ai",
        text: "👋 Đã làm mới phiên hội thoại. Bạn có thể chọn câu hỏi gợi ý bên dưới hoặc nhập câu hỏi mới nhé!",
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Helper format markdown inline
  const renderMarkdown = (content: string) => {
    return content.split("\n").map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="font-bold text-sm text-foreground mt-2 mb-1">{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("- ")) {
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-2 my-0.5 text-xs text-foreground/90">
            <span className="text-primary mt-0.5">•</span>
            <span>{parseInline(line.replace("- ", ""))}</span>
          </div>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-1" />;
      }
      return <p key={idx} className="my-0.5 text-xs leading-relaxed">{parseInline(line)}</p>;
    });
  };

  const parseInline = (text: string) => {
    // Bold replacement
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const title = part.slice(1, part.indexOf("]("));
        const url = part.slice(part.indexOf("](") + 2, -1);
        return (
          <button
            key={i}
            onClick={() => {
              setOpen(false);
              router.push(url);
            }}
            className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
          >
            {title} <IconArrowRight className="h-3 w-3 inline" />
          </button>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* 1. Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setOpen((prev) => !prev)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-primary hover:opacity-95 transition-all duration-300 hover:scale-105 border-2 border-white/20"
          title="Mở Trợ Lý AI SME Copilot"
        >
          {open ? (
            <IconX className="h-6 w-6 text-white" />
          ) : (
            <div className="relative flex items-center justify-center">
              <IconSparkles className="h-6 w-6 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </Button>
      </div>

      {/* 2. Floating Chat Dialog */}
      {open && (
        <Card className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[440px] h-[580px] max-h-[82vh] shadow-2xl flex flex-col border-primary/20 bg-background/95 backdrop-blur-md overflow-hidden rounded-2xl animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-3.5 border-b bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <IconRobot className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">
                  SME AI Copilot
                  {aiConfig?.is_active && aiConfig?.has_key ? (
                    <span className="text-3xs font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-300/40">
                      {aiConfig.provider === "openai" ? "GPT-4o" : "Gemini Pro"}
                    </span>
                  ) : (
                    <span className="text-3xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-300/40">
                      DB Engine
                    </span>
                  )}
                </div>
                <div className="text-3xs text-muted-foreground">
                  {aiConfig?.is_active && aiConfig?.has_key
                    ? `Hybrid RAG (${aiConfig.provider === "openai" ? "OpenAI" : "Gemini"})`
                    : "Trợ lý phân tích CSDL nội bộ"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setSettingsOpen(true)}
                title="Cấu hình mô hình AI ngoài (Gemini / OpenAI)"
              >
                <IconAdjustments className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleResetChat}
                title="Làm mới hội thoại"
              >
                <IconRotateClockwise className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="h-7 w-7 rounded-full bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <IconRobot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
                      : "bg-muted/70 text-foreground border border-border/50 rounded-tl-none"
                  }`}
                >
                  <div className="text-xs">
                    {msg.sender === "user" ? msg.text : renderMarkdown(msg.text)}
                  </div>

                  {msg.action && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-2xs gap-1 w-full justify-between font-medium"
                        onClick={() => {
                          setOpen(false);
                          router.push(msg.action!.url);
                        }}
                      >
                        <span>{msg.action.title}</span>
                        <IconArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div
                    className={`text-4xs mt-1 text-right ${
                      msg.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>

                {msg.sender === "user" && (
                  <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <IconUser className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-muted-foreground">
                <div className="h-7 w-7 rounded-full bg-indigo-600/15 text-indigo-600 flex items-center justify-center shrink-0">
                  <IconSparkles className="h-4 w-4 animate-spin" />
                </div>
                <div className="bg-muted/50 px-3 py-2 rounded-2xl rounded-tl-none flex items-center gap-1.5 border border-border/40">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-bounce"></span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-2xs">AI đang tra cứu CSDL...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions chips */}
          <div className="px-3 py-1.5 border-t bg-muted/20 overflow-x-auto whitespace-nowrap flex gap-1.5 no-scrollbar">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sug.text)}
                className="text-3xs px-2.5 py-1 rounded-full bg-background hover:bg-muted border border-border/70 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {sug.text}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 border-t bg-background flex items-center gap-2"
          >
            <Input
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Hỏi bất kỳ điều gì về doanh thu, kho, nợ..."
              className="text-xs h-9"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={loading || !inputQuery.trim()}
            >
              <IconSend className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}

      {/* 3. Settings Dialog for External AI API Key */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <IconAdjustments className="h-5 w-5 text-primary" />
              Cấu hình Mô hình AI Ngoại vi (LLM)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Tích hợp <strong>Google Gemini</strong> hoặc <strong>OpenAI ChatGPT</strong> kết hợp cùng dữ liệu doanh nghiệp thời gian thực (Hybrid RAG) để mở rộng kiến thức, tư vấn chiến lược TMĐT, tạo content bán hàng và giải đáp mọi câu hỏi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Provider Selection */}
            <div>
              <label className="font-semibold block mb-1.5 text-foreground">1. Chọn Nhà cung cấp AI (Provider)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCfgProvider("gemini");
                    setCfgModel("gemini-1.5-flash");
                    setTestResult(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    cfgProvider === "gemini"
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                      : "border-border hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    Google Gemini
                    <span className="text-3xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-normal">Khuyên dùng</span>
                  </div>
                  <div className="text-3xs text-muted-foreground mt-0.5">Miễn phí, phản hồi nhanh</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCfgProvider("openai");
                    setCfgModel("gpt-4o-mini");
                    setTestResult(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    cfgProvider === "openai"
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                      : "border-border hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    OpenAI
                    <span className="text-3xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-normal">ChatGPT</span>
                  </div>
                  <div className="text-3xs text-muted-foreground mt-0.5">GPT-4o mini, GPT-4o</div>
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <IconKey className="h-3.5 w-3.5 text-primary" />
                  2. API Key ({cfgProvider === "gemini" ? "Google AI Studio" : "OpenAI"})
                </label>
                <a
                  href={
                    cfgProvider === "gemini"
                      ? "https://aistudio.google.com/app/apikey"
                      : "https://platform.openai.com/api-keys"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-3xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Lấy key miễn phí <IconExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={cfgKey}
                  onChange={(e) => setCfgKey(e.target.value)}
                  placeholder={
                    aiConfig?.has_key && aiConfig?.provider === cfgProvider
                      ? `Đang lưu: ${aiConfig.masked_key} (nhập mới nếu đổi)`
                      : cfgProvider === "gemini"
                      ? "Dán API Key dạng AIzaSy..."
                      : "Dán API Key dạng sk-proj-..."
                  }
                  className="pr-9 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                </button>
              </div>
              {aiConfig?.has_key && !cfgKey && (
                <div className="text-3xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <IconCheck className="h-3 w-3" /> Đã lưu API key cho {aiConfig.provider}: {aiConfig.masked_key}
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div>
              <label className="font-semibold block mb-1.5 text-foreground">3. Phiên bản Mô hình (Model)</label>
              <select
                value={cfgModel}
                onChange={(e) => setCfgModel(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {cfgProvider === "gemini" ? (
                  <>
                    <option value="gemini-1.5-flash">gemini-1.5-flash (Khuyên dùng - Nhanh, tối ưu quota)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (Mô hình suy luận chuyên sâu)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Thế hệ mới nhất)</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-4o-mini">gpt-4o-mini (Khuyên dùng - Nhanh, chi phí rẻ)</option>
                    <option value="gpt-4o">gpt-4o (Mạnh nhất của OpenAI)</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo (Kinh điển)</option>
                  </>
                )}
              </select>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div>
                <div className="font-semibold text-xs text-foreground">Kích hoạt chế độ AI ngoài</div>
                <div className="text-3xs text-muted-foreground">Tự động chuyển sang DB Engine nếu tắt hoặc lỗi</div>
              </div>
              <input
                type="checkbox"
                checked={cfgActive}
                onChange={(e) => setCfgActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Test Connection Button & Result */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full text-xs h-8"
              >
                {testing ? (
                  <span className="flex items-center gap-1.5">
                    <IconSparkles className="h-3.5 w-3.5 animate-spin" /> Đang kiểm tra kết nối API...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <IconSparkles className="h-3.5 w-3.5" /> Kiểm tra kết nối {cfgProvider === "gemini" ? "Google Gemini" : "OpenAI"}
                  </span>
                )}
              </Button>

              {testResult && (
                <div
                  className={`mt-2 p-2 rounded-lg text-3xs flex items-start gap-1.5 ${
                    testResult.success
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {testResult.success ? (
                    <IconCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <IconAlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {saveMessage && (
                <div className="mt-2 p-2 rounded-lg text-3xs bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  <IconCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span>{saveMessage}</span>
                </div>
              )}
            </div>

            {/* Fallback & Security note */}
            <div className="p-2.5 rounded-lg bg-muted/40 text-4xs text-muted-foreground leading-relaxed border border-border/40">
              🛡️ <strong>Bảo mật & Fallback:</strong> Khóa API được lưu trữ an toàn và ẩn trên giao diện. Hệ thống áp dụng <strong>Hybrid RAG</strong>: tự động thu thập số liệu doanh nghiệp truyền vào ngữ cảnh an toàn cho LLM để giải đáp. Nếu bạn không nhập API Key, AI Copilot vẫn vận hành bình thường nhờ bộ máy SQL/MongoDB nội bộ.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
