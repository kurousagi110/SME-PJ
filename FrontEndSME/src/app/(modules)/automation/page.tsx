"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bot,
  Send,
  Clock,
  Save,
  Play,
  History,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";
import {
  fetchAutomationConfigAction,
  saveAutomationConfigAction,
  testBotChannelAction,
  runAutomationJobNowAction,
  type AutomationConfigPayload,
  type JobChannel,
  type ZaloMode,
} from "@/app/actions/automation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AutomationLogItem {
  _id?: string;
  job_key: string;
  trigger: string;
  title: string;
  summary: string;
  targets: string[];
  status: string;
  error?: string | null;
  created_at: string;
}

const DEFAULT_CONFIG: AutomationConfigPayload = {
  channels: {
    telegram: { enabled: false, bot_token: "", chat_id: "" },
    zalo: {
      enabled: false,
      mode: "oa_api",
      oa_access_token: "",
      recipient_id: "",
      template_id: "",
      webhook_url: "",
    },
  },
  jobs: {
    morning_briefing: { enabled: false, time: "07:30", channel: "both" },
    low_stock_fefo_alert: {
      enabled: false,
      interval_minutes: 120,
      fefo_days_threshold: 15,
      channel: "both",
    },
    overdue_debt_contract_alert: { enabled: false, time: "08:00", channel: "both" },
    production_bottleneck_alert: {
      enabled: false,
      interval_minutes: 180,
      threshold_hours: 48,
      channel: "both",
    },
    auto_reorder: { enabled: false, time: "08:30", channel: "both" },
  },
};

export default function AutomationAdminPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testingChannel, setTestingChannel] = React.useState<"telegram" | "zalo" | null>(null);
  const [runningJob, setRunningJob] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<AutomationConfigPayload>(DEFAULT_CONFIG);
  const [logs, setLogs] = React.useState<AutomationLogItem[]>([]);
  const [tgTokenInput, setTgTokenInput] = React.useState("");
  const [zaloTokenInput, setZaloTokenInput] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAutomationConfigAction();
      if (res.success && res.data?.config) {
        setConfig(res.data.config);
        setLogs(res.data.logs || []);
        setTgTokenInput(res.data.config.channels?.telegram?.masked_token || "");
        setZaloTokenInput(res.data.config.channels?.zalo?.masked_token || "");
      } else if (res.error) {
        toast.error(res.error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: AutomationConfigPayload = {
        ...config,
        channels: {
          telegram: {
            ...config.channels.telegram,
            bot_token: tgTokenInput,
          },
          zalo: {
            ...config.channels.zalo,
            oa_access_token: zaloTokenInput,
          },
        },
      };
      const res = await saveAutomationConfigAction(payload);
      if (res.success) {
        toast.success(res.message || "Đã lưu cấu hình thành công");
        await loadData();
      } else {
        toast.error(res.error || "Lưu cấu hình thất bại");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestChannel = async (channel: "telegram" | "zalo") => {
    setTestingChannel(channel);
    try {
      const res = await testBotChannelAction(channel);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    } finally {
      setTestingChannel(null);
    }
  };

  const handleRunJobNow = async (jobKey: string) => {
    setRunningJob(jobKey);
    try {
      const res = await runAutomationJobNowAction(jobKey);
      if (res.success) {
        toast.success(res.data?.summary || res.message);
        await loadData();
      } else {
        toast.error(res.error);
      }
    } finally {
      setRunningJob(null);
    }
  };

  const renderChannelSelect = (
    value: JobChannel,
    onChange: (val: JobChannel) => void
  ) => (
    <Select value={value} onValueChange={(v) => onChange(v as JobChannel)}>
      <SelectTrigger className="w-[175px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="both">Telegram & Zalo</SelectItem>
        <SelectItem value="telegram">Chỉ Telegram</SelectItem>
        <SelectItem value="zalo">Chỉ Zalo</SelectItem>
        <SelectItem value="in_app">Chỉ trong App</SelectItem>
      </SelectContent>
    </Select>
  );

  if (loading) {
    return <div className="px-4 lg:px-6 py-8 text-sm text-muted-foreground">Đang tải cấu hình tự động hóa...</div>;
  }

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-600" />
            Tự Động Hóa Nền & Bot Cảnh Báo (Telegram / Zalo)
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản trị viên cấu hình kênh kết nối Telegram / Zalo và lịch chạy các tác vụ cảnh báo tự động theo thời gian thực.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "Đang lưu..." : "Lưu tất cả cấu hình"}
        </Button>
      </div>

      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Kết nối Telegram & Zalo
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Lịch chạy tự động (Cron)
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <History className="h-4 w-4" />
            Nhật ký gửi ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CHANNELS */}
        <TabsContent value="channels" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Telegram Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">Kênh Telegram Bot</CardTitle>
                <CardDescription>
                  Gửi báo cáo điều hành và cảnh báo khẩn cấp tới nhóm quản trị Telegram.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tg-enabled"
                  checked={config.channels.telegram.enabled}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      channels: {
                        ...prev.channels,
                        telegram: { ...prev.channels.telegram, enabled: Boolean(checked) },
                      },
                    }))
                  }
                />
                <Label htmlFor="tg-enabled" className="text-xs font-semibold cursor-pointer">
                  Kích hoạt
                </Label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tg-token">Bot Token (từ @BotFather)</Label>
                <Input
                  id="tg-token"
                  placeholder="VD: 123456789:ABCdefGHI..."
                  value={tgTokenInput}
                  onChange={(e) => setTgTokenInput(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tg-chat-id">Chat ID / Group ID</Label>
                <Input
                  id="tg-chat-id"
                  placeholder="VD: -1001234567890"
                  value={config.channels.telegram.chat_id}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      channels: {
                        ...prev.channels,
                        telegram: { ...prev.channels.telegram, chat_id: e.target.value },
                      },
                    }))
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={testingChannel === "telegram"}
                onClick={() => handleTestChannel("telegram")}
              >
                <Send className="h-3.5 w-3.5" />
                {testingChannel === "telegram" ? "Đang gửi..." : "Gửi tin nhắn Test Telegram"}
              </Button>
            </CardContent>
          </Card>

          {/* Zalo Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">Kênh Zalo (OA / ZNS / Webhook)</CardTitle>
                <CardDescription>
                  Hỗ trợ Zalo Official Account API, Zalo ZNS hoặc Webhook trung gian (n8n / Zalo Bot).
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="zalo-enabled"
                  checked={config.channels.zalo.enabled}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      channels: {
                        ...prev.channels,
                        zalo: { ...prev.channels.zalo, enabled: Boolean(checked) },
                      },
                    }))
                  }
                />
                <Label htmlFor="zalo-enabled" className="text-xs font-semibold cursor-pointer">
                  Kích hoạt
                </Label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Phương thức kết nối Zalo</Label>
                <Select
                  value={config.channels.zalo.mode}
                  onValueChange={(val) =>
                    setConfig((prev) => ({
                      ...prev,
                      channels: {
                        ...prev.channels,
                        zalo: { ...prev.channels.zalo, mode: val as ZaloMode },
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oa_api">Zalo OA API v3 (Tin nhắn chăm sóc)</SelectItem>
                    <SelectItem value="zns">Zalo ZNS (Gửi theo SĐT & Template)</SelectItem>
                    <SelectItem value="webhook">Zalo Webhook (n8n / Zapier / Bot riêng)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.channels.zalo.mode === "webhook" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="zalo-webhook">Webhook URL</Label>
                  <Input
                    id="zalo-webhook"
                    placeholder="https://hooks.example.com/zalo-alert"
                    value={config.channels.zalo.webhook_url}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        channels: {
                          ...prev.channels,
                          zalo: { ...prev.channels.zalo, webhook_url: e.target.value },
                        },
                      }))
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="zalo-token">Zalo OA Access Token</Label>
                    <Input
                      id="zalo-token"
                      placeholder="Nhập OA Access Token..."
                      value={zaloTokenInput}
                      onChange={(e) => setZaloTokenInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="zalo-recipient">
                      {config.channels.zalo.mode === "zns"
                        ? "Số điện thoại nhận ZNS (849...)"
                        : "Zalo User ID người nhận"}
                    </Label>
                    <Input
                      id="zalo-recipient"
                      placeholder={config.channels.zalo.mode === "zns" ? "84901234567" : "User ID Zalo OA..."}
                      value={config.channels.zalo.recipient_id}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          channels: {
                            ...prev.channels,
                            zalo: { ...prev.channels.zalo, recipient_id: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  {config.channels.zalo.mode === "zns" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="zalo-tpl">ZNS Template ID</Label>
                      <Input
                        id="zalo-tpl"
                        placeholder="VD: 204910"
                        value={config.channels.zalo.template_id}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              zalo: { ...prev.channels.zalo, template_id: e.target.value },
                            },
                          }))
                        }
                      />
                    </div>
                  )}
                </>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={testingChannel === "zalo"}
                onClick={() => handleTestChannel("zalo")}
              >
                <Send className="h-3.5 w-3.5" />
                {testingChannel === "zalo" ? "Đang gửi..." : "Gửi tin nhắn Test Zalo"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CRON JOBS */}
        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch Chạy Tự Động & Ngưỡng Cảnh Báo</CardTitle>
              <CardDescription>
                Bật/tắt từng tác vụ, chọn giờ chạy hoặc chu kỳ quét và chọn kênh nhận thông báo tương ứng. Nhấn &quot;Lưu tất cả cấu hình&quot; để áp dụng ngay.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Job 1: Morning Briefing */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={config.jobs.morning_briefing.enabled}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          morning_briefing: { ...prev.jobs.morning_briefing, enabled: Boolean(checked) },
                        },
                      }))
                    }
                  />
                  <div>
                    <div className="font-semibold text-sm">1. Báo cáo điều hành buổi sáng</div>
                    <div className="text-xs text-muted-foreground">
                      Tổng hợp doanh thu hôm qua, chứng từ chờ duyệt và số dư quỹ hàng ngày.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    className="w-28 h-8 text-xs"
                    value={config.jobs.morning_briefing.time}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          morning_briefing: { ...prev.jobs.morning_briefing, time: e.target.value },
                        },
                      }))
                    }
                  />
                  {renderChannelSelect(config.jobs.morning_briefing.channel, (val) =>
                    setConfig((prev) => ({
                      ...prev,
                      jobs: {
                        ...prev.jobs,
                        morning_briefing: { ...prev.jobs.morning_briefing, channel: val },
                      },
                    }))
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1 text-xs"
                    disabled={runningJob === "morning_briefing"}
                    onClick={() => handleRunJobNow("morning_briefing")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Chạy ngay
                  </Button>
                </div>
              </div>

              {/* Job 2: Low Stock & FEFO */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={config.jobs.low_stock_fefo_alert.enabled}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          low_stock_fefo_alert: {
                            ...prev.jobs.low_stock_fefo_alert,
                            enabled: Boolean(checked),
                          },
                        },
                      }))
                    }
                  />
                  <div>
                    <div className="font-semibold text-sm">2. Cảnh báo tồn kho tối thiểu & Lô FEFO sắp hết hạn</div>
                    <div className="text-xs text-muted-foreground">
                      Quét định kỳ vật tư/sản phẩm chạm ngưỡng an toàn và lô hàng cận hạn.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span>Quét mỗi</span>
                    <Input
                      type="number"
                      min={15}
                      className="w-20 h-8 text-xs"
                      value={config.jobs.low_stock_fefo_alert.interval_minutes}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          jobs: {
                            ...prev.jobs,
                            low_stock_fefo_alert: {
                              ...prev.jobs.low_stock_fefo_alert,
                              interval_minutes: Number(e.target.value) || 120,
                            },
                          },
                        }))
                      }
                    />
                    <span>phút</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span>FEFO ≤</span>
                    <Input
                      type="number"
                      min={1}
                      className="w-16 h-8 text-xs"
                      value={config.jobs.low_stock_fefo_alert.fefo_days_threshold}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          jobs: {
                            ...prev.jobs,
                            low_stock_fefo_alert: {
                              ...prev.jobs.low_stock_fefo_alert,
                              fefo_days_threshold: Number(e.target.value) || 15,
                            },
                          },
                        }))
                      }
                    />
                    <span>ngày</span>
                  </div>
                  {renderChannelSelect(config.jobs.low_stock_fefo_alert.channel, (val) =>
                    setConfig((prev) => ({
                      ...prev,
                      jobs: {
                        ...prev.jobs,
                        low_stock_fefo_alert: { ...prev.jobs.low_stock_fefo_alert, channel: val },
                      },
                    }))
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1 text-xs"
                    disabled={runningJob === "low_stock_fefo_alert"}
                    onClick={() => handleRunJobNow("low_stock_fefo_alert")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Chạy ngay
                  </Button>
                </div>
              </div>

              {/* Job 3: Overdue Debt & Contract */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={config.jobs.overdue_debt_contract_alert.enabled}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          overdue_debt_contract_alert: {
                            ...prev.jobs.overdue_debt_contract_alert,
                            enabled: Boolean(checked),
                          },
                        },
                      }))
                    }
                  />
                  <div>
                    <div className="font-semibold text-sm">3. Cảnh báo công nợ quá hạn & Hợp đồng B2B trễ đợt</div>
                    <div className="text-xs text-muted-foreground">
                      Nhắc nhở hàng ngày các hợp đồng trễ hạn thanh toán và hóa đơn chưa thu đủ.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    className="w-28 h-8 text-xs"
                    value={config.jobs.overdue_debt_contract_alert.time}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          overdue_debt_contract_alert: {
                            ...prev.jobs.overdue_debt_contract_alert,
                            time: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                  {renderChannelSelect(config.jobs.overdue_debt_contract_alert.channel, (val) =>
                    setConfig((prev) => ({
                      ...prev,
                      jobs: {
                        ...prev.jobs,
                        overdue_debt_contract_alert: {
                          ...prev.jobs.overdue_debt_contract_alert,
                          channel: val,
                        },
                      },
                    }))
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1 text-xs"
                    disabled={runningJob === "overdue_debt_contract_alert"}
                    onClick={() => handleRunJobNow("overdue_debt_contract_alert")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Chạy ngay
                  </Button>
                </div>
              </div>

              {/* Job 4: Production Bottleneck */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={config.jobs.production_bottleneck_alert.enabled}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          production_bottleneck_alert: {
                            ...prev.jobs.production_bottleneck_alert,
                            enabled: Boolean(checked),
                          },
                        },
                      }))
                    }
                  />
                  <div>
                    <div className="font-semibold text-sm">4. Cảnh báo nghẽn cổ chai xưởng sản xuất</div>
                    <div className="text-xs text-muted-foreground">
                      Phát hiện lệnh sản xuất bị kẹt trên bảng Kanban vượt quá số giờ cho phép.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span>Quét mỗi</span>
                    <Input
                      type="number"
                      min={15}
                      className="w-20 h-8 text-xs"
                      value={config.jobs.production_bottleneck_alert.interval_minutes}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          jobs: {
                            ...prev.jobs,
                            production_bottleneck_alert: {
                              ...prev.jobs.production_bottleneck_alert,
                              interval_minutes: Number(e.target.value) || 180,
                            },
                          },
                        }))
                      }
                    />
                    <span>phút</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span>Kẹt &gt;</span>
                    <Input
                      type="number"
                      min={1}
                      className="w-16 h-8 text-xs"
                      value={config.jobs.production_bottleneck_alert.threshold_hours}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          jobs: {
                            ...prev.jobs,
                            production_bottleneck_alert: {
                              ...prev.jobs.production_bottleneck_alert,
                              threshold_hours: Number(e.target.value) || 48,
                            },
                          },
                        }))
                      }
                    />
                    <span>giờ</span>
                  </div>
                  {renderChannelSelect(config.jobs.production_bottleneck_alert.channel, (val) =>
                    setConfig((prev) => ({
                      ...prev,
                      jobs: {
                        ...prev.jobs,
                        production_bottleneck_alert: {
                          ...prev.jobs.production_bottleneck_alert,
                          channel: val,
                        },
                      },
                    }))
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1 text-xs"
                    disabled={runningJob === "production_bottleneck_alert"}
                    onClick={() => handleRunJobNow("production_bottleneck_alert")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Chạy ngay
                  </Button>
                </div>
              </div>

              {/* Job 5: Auto-Reorder Draft PO */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-4 bg-muted/20">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={Boolean(config.jobs.auto_reorder?.enabled)}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          auto_reorder: {
                            time: prev.jobs.auto_reorder?.time || "08:30",
                            channel: prev.jobs.auto_reorder?.channel || "both",
                            enabled: Boolean(checked),
                          },
                        },
                      }))
                    }
                  />
                  <div>
                    <div className="font-semibold text-sm">
                      5. Tự động tạo đơn mua nháp khi chạm điểm đặt hàng (Auto-Reorder)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tự động quét vật tư có tồn ≤ tồn tối thiểu, tránh tạo trùng và tạo đơn nháp theo NCC gửi lên Hộp thư phê duyệt (/approvals).
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    className="w-28 h-8 text-xs"
                    value={config.jobs.auto_reorder?.time || "08:30"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          auto_reorder: {
                            enabled: Boolean(prev.jobs.auto_reorder?.enabled),
                            channel: prev.jobs.auto_reorder?.channel || "both",
                            time: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                  {renderChannelSelect(config.jobs.auto_reorder?.channel || "both", (val) =>
                    setConfig((prev) => ({
                      ...prev,
                      jobs: {
                        ...prev.jobs,
                        auto_reorder: {
                          enabled: Boolean(prev.jobs.auto_reorder?.enabled),
                          time: prev.jobs.auto_reorder?.time || "08:30",
                          channel: val,
                        },
                      },
                    }))
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1 text-xs"
                    disabled={runningJob === "auto_reorder"}
                    onClick={() => handleRunJobNow("auto_reorder")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Chạy ngay
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LOGS */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nhật Ký Thực Thi Tự Động & Gửi Tin Nhắn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Tác vụ</TableHead>
                      <TableHead>Nguồn</TableHead>
                      <TableHead>Kênh gửi</TableHead>
                      <TableHead>Tóm tắt</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Chưa có lịch sử chạy tác vụ tự động
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log, idx) => (
                        <TableRow key={log._id ?? idx}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{log.title}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline">{log.trigger === "cron" ? "Tự động" : "Thủ công"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.targets?.length ? log.targets.join(", ").toUpperCase() : "In-App"}
                          </TableCell>
                          <TableCell className="text-xs max-w-md">{log.summary}</TableCell>
                          <TableCell>
                            {log.status === "success" ? (
                              <Badge className="bg-emerald-600 text-white gap-1 text-[10px]">
                                <CheckCircle2 className="h-3 w-3" /> Thành công
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1 text-[10px]">
                                <XCircle className="h-3 w-3" /> Lỗi
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
