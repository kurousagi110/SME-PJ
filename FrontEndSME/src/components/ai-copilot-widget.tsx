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
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { askAiCopilotAction, fetchAiSuggestionsAction, AiQueryResult } from "@/app/actions/ai-copilot";

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

  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      fetchAiSuggestionsAction().then((sugs) => {
        if (sugs && sugs.length > 0) setSuggestions(sugs);
      });
    }
  }, [open, messages]);

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
                  <span className="text-3xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-300/40">
                    Online
                  </span>
                </div>
                <div className="text-3xs text-muted-foreground">
                  Trợ lý phân tích CSDL thời gian thực
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
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
    </>
  );
}
