import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Users,
  Target,
  AlertCircle,
  Calendar,
  PhoneCall,
  Clock,
  Star,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StandardChart from "@/components/charts/StandardChart";

import { DataTable } from "@/components/ui/data-table";
import { MasterDataTable } from "@/components/ui/master-data-table";
import { useSettings } from "@/hooks/use-settings";
import ThreeDPie from "@/components/charts/ThreeDPie";
import DateFilter from "@/components/ui/date-filter";
import LeadDataExplorer from "@/components/lead-data-explorer";
import { useColors } from "@/hooks/use-colors";
import { getSourceColor } from "@/lib/color-system";
import ProjectFilter from "./project-filter";
import {
  filterLeadsByProject,
  detectProjectFromWebFormNotu,
} from "@/lib/project-detector";

// Add type for enhancedStats
interface EnhancedStats {
  leads: {
    byPersonnel: Record<string, number>;
    [key: string]: any;
  };
  takipte: {
    byPersonnel: Record<string, number>;
    [key: string]: any;
  };
  [key: string]: any;
}

export default function EnhancedOverviewDashboardTab() {
  const { getColor } = useColors();

  const [chartType, setChartType] = useState<"pie" | "bar" | "line">("pie");
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>("all");
  const [selectedOffice, setSelectedOffice] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [dateFilters, setDateFilters] = useState({
    startDate: "",
    endDate: "",
    month: "",
    year: "",
  });

  // Chart type options matching the takipte-analizi design
  const chartTypeOptions = [
    { value: "pie" as const, label: "Pasta Grafik", icon: "🥧" },
    { value: "bar" as const, label: "Sütun Grafik", icon: "📊" },
    { value: "line" as const, label: "Çizgi Grafik", icon: "📈" },
  ];

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get 3D settings from chart settings
  const { data: settings } = useSettings();
  const enable3D = settings?.find((s) => s.key === "chart_settings")?.value
    ? JSON.parse(
        settings.find((s) => s.key === "chart_settings")?.value || "{}"
      )?.enable3D
    : true;

  // Add selectedProject to dateFilters for all queries
  const filters = { ...dateFilters, project: selectedProject };

  // Fetch enhanced stats that combine both data sources
  const { data: enhancedStats } = useQuery<EnhancedStats>({
    queryKey: ["/api/enhanced-stats", filters],
    refetchInterval: 5000,
  });

  // Fetch takipte data
  const { data: takipteData = [] } = useQuery<any[]>({
    queryKey: ["/api/takipte", filters],
  });

  // Fetch leads data for detailed analysis with date filtering
  const { data: leadsData = [] } = useQuery({
    queryKey: ["/api/leads", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/leads?${params.toString()}`);
      return response.json();
    },
  });

  // Apply robust project filtering to leadsData
  const filteredLeads = useMemo(() => {
    return filterLeadsByProject(leadsData, selectedProject);
  }, [leadsData, selectedProject]);

  const hasSecondaryData = enhancedStats?.takipte?.hasData || false;

  // Cache clear mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/cache/clear", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to clear cache");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      toast({
        title: "Önbellek Temizlendi",
        description: "Tüm veriler başarıyla temizlendi. Sayfa yenileniyor...",
      });
      // Refresh page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Önbellek temizlenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Error clearing cache:", error);
    },
  });

  // Define the exact status columns from the screenshot with mapping
  const statusColumns = useMemo(() => {
    const columns = [
      { key: "Toplam Lead", label: "Toplam Lead", type: "total" },
      {
        key: "Ulaşılmıyor - Cevap Yok",
        label: "Ulaşılmıyor - Cevap Yok",
        type: "status",
      },
      { key: "Aranmayan Lead", label: "Aranmayan Lead", type: "status" },
      {
        key: "Ulaşılmıyor - Bilgi Hatalı",
        label: "Ulaşılmıyor - Bilgi Hatalı",
        type: "status",
      },
      {
        key: "Bilgi Verildi - Tekrar Aranacak",
        label: "Bilgi Verildi - Tekrar Aranacak",
        type: "status",
      },
      { key: "Olumsuz", label: "Olumsuz", type: "status" },
      {
        key: "Toplantı - Birebir Görüşme",
        label: "Toplantı - Birebir Görüşme",
        type: "status",
      },
      {
        key: "Potansiyel Takipte",
        label: "Potansiyel Takipte",
        type: "status",
      },
      { key: "Satış", label: "Satış", type: "status" },
    ];
    return columns;
  }, []);

  // Status mapping for data normalization
  const normalizeStatus = (status: string): string => {
    const statusLower = status.toLowerCase().trim();

    // Map variations to standard names
    if (
      statusLower.includes("bilgi verildi") ||
      statusLower.includes("bılgı verıldı")
    ) {
      return "Bilgi Verildi - Tekrar Aranacak";
    }
    if (statusLower.includes("potansiyel") && statusLower.includes("takip")) {
      return "Potansiyel Takipte";
    }
    if (statusLower.includes("takipte") || statusLower.includes("takip")) {
      return "Potansiyel Takipte";
    }
    if (statusLower.includes("olumsuz")) {
      return "Olumsuz";
    }
    if (statusLower.includes("satış") || statusLower.includes("satis")) {
      return "Satış";
    }
    if (statusLower.includes("ulaşılmıyor") && statusLower.includes("cevap")) {
      return "Ulaşılmıyor - Cevap Yok";
    }
    if (statusLower.includes("ulaşılmıyor") && statusLower.includes("bilgi")) {
      return "Ulaşılmıyor - Bilgi Hatalı";
    }
    if (statusLower.includes("aranmayan")) {
      return "Aranmayan Lead";
    }
    if (statusLower.includes("toplantı") || statusLower.includes("görüşme")) {
      return "Toplantı - Birebir Görüşme";
    }

    return status; // Return original if no mapping found
  };

  // Column visibility state
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    new Set()
  );

  // Personnel status matrix calculation with normalized statuses
  const personnelStatusMatrix = useMemo(() => {
    if (!filteredLeads.length || !enhancedStats) return [];

    const { takipte, leads } = enhancedStats;
    const personnelStats: { [key: string]: any } = {};

    // Initialize all personnel with all statuses set to 0
    const allPersonnel = Object.keys(leads.byPersonnel || {});
    if (allPersonnel.length === 0) return [];

    allPersonnel.forEach((personnel) => {
      personnelStats[personnel] = {
        name: personnel,
        totalLeads: 0,
        takipteCount: takipte.byPersonnel?.[personnel] || 0,
        // Add a dedicated counter for Birebir Görüşme
        birebirGorusmeCount: 0,
      };

      // Initialize all status columns to 0
      statusColumns.forEach((col) => {
        if (col.type === "status") {
          personnelStats[personnel][col.key] = 0;
        }
      });
    });

    // Count actual lead statuses with normalization
    filteredLeads.forEach((lead) => {
      const personnel = lead.assignedPersonnel || "Atanmamış";
      const originalStatus = lead.status || "Bilinmiyor";
      const normalizedStatus = normalizeStatus(originalStatus);

      if (!personnelStats[personnel]) {
        personnelStats[personnel] = {
          name: personnel,
          totalLeads: 0,
          takipteCount: takipte.byPersonnel?.[personnel] || 0,
          birebirGorusmeCount: 0,
        };

        // Initialize all status columns to 0 for new personnel
        statusColumns.forEach((col) => {
          if (col.type === "status") {
            personnelStats[personnel][col.key] = 0;
          }
        });
      }

      personnelStats[personnel].totalLeads++;

      // Increment the normalized status count
      if (personnelStats[personnel][normalizedStatus] !== undefined) {
        personnelStats[personnel][normalizedStatus]++;
      }

      // Increment Birebir Görüşme count if oneOnOneMeeting === 'Evet'
      if (lead.oneOnOneMeeting && lead.oneOnOneMeeting.trim().toLowerCase() === "evet") {
        personnelStats[personnel].birebirGorusmeCount++;
      }
    });

    // Debug logging for personnel name matching
    console.log(
      "Debug - Leads personnel:",
      Object.keys(leads.byPersonnel || {})
    );
    console.log(
      "Debug - Takipte personnel:",
      Object.keys(takipte.byPersonnel || {})
    );

    return Object.values(personnelStats);
  }, [filteredLeads, enhancedStats, statusColumns, normalizeStatus]);

  // Toggle column visibility
  const toggleColumn = (columnKey: string) => {
    setCollapsedColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  // Memoized calculations for performance - NOW USING FILTERED DATA
  const dashboardMetrics = useMemo(() => {
    if (!filteredLeads || filteredLeads.length === 0) return null;

    // Apply date filtering to ALL calculations
    const filteredLeadsForDate = filteredLeads;
    const filteredTakipte = takipteData.filter((t: any) => {
      if (
        !dateFilters.startDate &&
        !dateFilters.endDate &&
        !dateFilters.month &&
        !dateFilters.year
      )
        return true;

      const itemDate = new Date(t.Tarih || t.date || "");
      if (isNaN(itemDate.getTime())) return true;

      if (
        dateFilters.year &&
        itemDate.getFullYear().toString() !== dateFilters.year
      )
        return false;
      if (
        dateFilters.month &&
        (itemDate.getMonth() + 1).toString().padStart(2, "0") !==
          dateFilters.month
      )
        return false;
      if (dateFilters.startDate && itemDate < new Date(dateFilters.startDate))
        return false;
      if (dateFilters.endDate && itemDate > new Date(dateFilters.endDate))
        return false;

      return true;
    });

    // Core KPIs from filtered data
    const totalLeads = filteredLeadsForDate.length;
    const totalTakipte = filteredTakipte.length;
    const dataCompletnessScore =
      totalTakipte > 0
        ? Math.min(100, Math.round((totalTakipte / totalLeads) * 100))
        : 0;

    // Status distribution for charts from filtered leads
    const statusCounts = filteredLeadsForDate.reduce((acc: any, lead) => {
      const status = lead.status || "Tanımsız";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count as number,
      percentage: Math.round(((count as number) / totalLeads) * 100),
    }));

    // Personnel data for charts from filtered data
    const personnelCounts = filteredLeadsForDate.reduce((acc: any, lead) => {
      const personnel = lead.assignedPersonnel || "Atanmamış";
      acc[personnel] = (acc[personnel] || 0) + 1;
      return acc;
    }, {});

    const personnelData = Object.entries(personnelCounts).map(
      ([person, leadCount]) => {
        const takipteCount = filteredTakipte.filter(
          (t: any) => (t["Personel Adı(203)"] || t.assignedPersonnel) === person
        ).length;
        return {
          name: person,
          leadCount: leadCount as number,
          takipteCount,
          efficiency:
            takipteCount > 0
              ? Math.round(((leadCount as number) / takipteCount) * 100)
              : 0,
        };
      }
    );

    // Lead type distribution from filtered data
    const typeCounts = filteredLeadsForDate.reduce((acc: any, lead) => {
      const type = lead.leadType || "Bilinmiyor";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const typeData = Object.entries(typeCounts).map(([type, count]) => ({
      name: type === "kiralama" ? "Kiralık" : type === "satis" ? "Satış" : type,
      value: count as number,
      percentage: Math.round(((count as number) / totalLeads) * 100),
    }));

    return {
      totalLeads,
      totalTakipte,
      dataCompletnessScore,
      statusData,
      personnelData,
      typeData,
      leads: filteredLeadsForDate,
    };
  }, [filteredLeads, takipteData, dateFilters]);

  // Advanced Takipte Analytics - NOW USING FILTERED DATA
  const takipteAnalytics = useMemo(() => {
    if (!hasSecondaryData || takipteData.length === 0) return null;

    // Apply date filtering to takipte data
    let filteredTakipte = takipteData.filter((t: any) => {
      if (
        !dateFilters.startDate &&
        !dateFilters.endDate &&
        !dateFilters.month &&
        !dateFilters.year
      )
        return true;

      const itemDate = new Date(t.Tarih || t.date || "");
      if (isNaN(itemDate.getTime())) return true;

      if (
        dateFilters.year &&
        itemDate.getFullYear().toString() !== dateFilters.year
      )
        return false;
      if (
        dateFilters.month &&
        (itemDate.getMonth() + 1).toString().padStart(2, "0") !==
          dateFilters.month
      )
        return false;
      if (dateFilters.startDate && itemDate < new Date(dateFilters.startDate))
        return false;
      if (dateFilters.endDate && itemDate > new Date(dateFilters.endDate))
        return false;

      return true;
    });

    // Apply project filter to takipte data (robust logic)
    if (selectedProject && selectedProject !== "all") {
      filteredTakipte = filteredTakipte.filter((t: any) => {
        const projectField = t.projectName || t["Proje"] || "";
        const webFormNotu = t.webFormNote || t["WebForm Notu"] || "";
        const detectedProject = detectProjectFromWebFormNotu(webFormNotu);
        return (
          projectField === selectedProject ||
          detectedProject === selectedProject
        );
      });
    }

    const total = filteredTakipte.length;
    if (total === 0) return null;

    // Customer source analysis from filtered data
    const sourceCounts = filteredTakipte.reduce((acc: any, t: any) => {
      const source = t["İrtibat Müşteri Kaynağı"] || t.source || "Bilinmiyor";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const sourceData = Object.entries(sourceCounts).map(([source, count]) => ({
      name: source,
      value: count as number,
      percentage: Math.round(((count as number) / total) * 100),
    }));

    // Meeting type distribution from filtered data
    const meetingCounts = filteredTakipte.reduce((acc: any, t: any) => {
      const type = t["Görüşme Tipi"] || t.meetingType || "Bilinmiyor";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const meetingTypeData = Object.entries(meetingCounts).map(
      ([type, count]) => ({
        name: type,
        value: count as number,
        percentage: Math.round(((count as number) / total) * 100),
      })
    );

    // Office performance from filtered data
    const officeCounts = filteredTakipte.reduce((acc: any, t: any) => {
      const office = t.Ofis || t.office || "Bilinmiyor";
      acc[office] = (acc[office] || 0) + 1;
      return acc;
    }, {});

    const officeData = Object.entries(officeCounts).map(([office, count]) => ({
      name: office,
      value: count as number,
      percentage: Math.round(((count as number) / total) * 100),
    }));

    // Customer criteria (Satış vs Kira) from filtered data
    const kriterCounts = filteredTakipte.reduce((acc: any, t: any) => {
      const kriter = t.Kriter || t.criteria || "Bilinmiyor";
      acc[kriter] = (acc[kriter] || 0) + 1;
      return acc;
    }, {});

    const kriterData = Object.entries(kriterCounts).map(([kriter, count]) => ({
      name: kriter,
      value: count as number,
      percentage: Math.round(((count as number) / total) * 100),
    }));

    return {
      sourceData,
      meetingTypeData,
      officeData,
      kriterData,
    };
  }, [takipteData, hasSecondaryData, dateFilters, selectedProject]);

  if (!enhancedStats) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Use standardized colors instead of random colors
  const getColorsForData = (
    data: any[],
    colorType: "personnel" | "status" | "source" = "status"
  ) => {
    return data.map((item) => {
      switch (colorType) {
        case "personnel":
          return getColor("PERSONNEL", item.name);
        case "status":
          return getColor("STATUS", item.name);
        case "source":
          return getSourceColor(item.name);
        default:
          return getColor("STATUS", item.name);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Project Filter at the top */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <ProjectFilter value={selectedProject} onChange={setSelectedProject} />
      </div>
      {/* Header with Data Completeness Alert */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            🧠 Akıllı Dashboard - Genel Görünüm
          </h2>
          <p className="text-gray-600 mt-1">
            AI-destekli lead performans analizi
          </p>
        </div>

        {!hasSecondaryData && (
          <Alert className="max-w-md border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>⚠️ Eksik Veri:</strong> Takip dosyası yüklenmemiş. Detaylı
              analiz için ikinci dosyayı yükleyin.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="mr-2 h-4 w-4" />
              📊 Real-time Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardMetrics?.totalLeads || 0}
            </div>
            <p className="text-blue-100 text-xs">Anlık lead takibi</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <PhoneCall className="mr-2 h-4 w-4" />
              Takip Kayıtları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardMetrics?.totalTakipte || 0}
            </div>
            <p className="text-green-100 text-xs">İkincil veri kaynağı</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Veri Tamamlanması
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardMetrics?.dataCompletnessScore || 0}%
            </div>
            <Progress
              value={dashboardMetrics?.dataCompletnessScore || 0}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Star className="mr-2 h-4 w-4" />
              🤖 AI-Power Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {hasSecondaryData ? "🤖 Active" : "⚠️ Limited"}
            </div>
            <p className="text-orange-100 text-xs">
              {hasSecondaryData
                ? "Tam AI analiz aktif"
                : "İkinci dosya gerekli"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter and Chart Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <DateFilter
            onFilterChange={setDateFilters}
            initialFilters={dateFilters}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg h-full">
            {/* Chart Type Selector */}
            <div className="flex space-x-2">
              {chartTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setChartType(option.value)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    chartType === option.value
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {option.icon} {option.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCacheMutation.mutate()}
                disabled={clearCacheMutation.isPending}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
              >
                {clearCacheMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {clearCacheMutation.isPending
                  ? "Temizleniyor..."
                  : "Önbellek Temizle"}
              </Button>

              <div className="flex gap-2 text-sm text-gray-600">
                <Badge variant="outline">📊 Real-time</Badge>
                <Badge variant="outline">🤖 AI-Power</Badge>
                {hasSecondaryData && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    ✅ Tam Veri
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personnel Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            👥 Personel Atama ve Durum Özeti
          </CardTitle>
          <CardDescription>
            Her personelin lead dağılımı ve durum analizi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {personnelStatusMatrix && personnelStatusMatrix.length > 0 ? (
            <div className="space-y-4">
              {/* Column Controls */}
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 mr-2">
                  Sütun Görünürlüğü:
                </span>
                {statusColumns
                  .filter((col) => col.type === "status")
                  .map((column) => (
                    <button
                      key={column.key}
                      onClick={() => toggleColumn(column.key)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        collapsedColumns.has(column.key)
                          ? "bg-gray-200 text-gray-500 border-gray-300"
                          : "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                      }`}
                    >
                      {collapsedColumns.has(column.key) ? "👁️‍🗨️" : "👁️"}{" "}
                      {column.label}
                    </button>
                  ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="text-left p-2 font-medium border-r sticky left-0 bg-gray-100">
                        Personel
                      </th>
                      <th className="text-center p-2 font-medium border-r bg-blue-50">
                        Toplam Lead
                      </th>
                      {statusColumns
                        .filter(
                          (col) =>
                            col.type === "status" &&
                            !collapsedColumns.has(col.key)
                        )
                        .map((column) => (
                          <th
                            key={column.key}
                            className="text-center p-2 font-medium border-r min-w-[100px] relative"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs">{column.label}</span>
                              <button
                                onClick={() => toggleColumn(column.key)}
                                className="text-gray-400 hover:text-red-500 ml-1"
                                title="Sütunu gizle"
                              >
                                ×
                              </button>
                            </div>
                          </th>
                        ))}
                      <th className="text-center p-2 font-medium bg-green-50">
                        Takip Kayıtları
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {personnelStatusMatrix.map((person, index) => (
                      <tr
                        key={person.name}
                        className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                      >
                        <td className="p-2 font-medium border-r sticky left-0 bg-inherit">
                          {person.name}
                        </td>
                        <td className="text-center p-2 border-r font-bold bg-blue-50">
                          {person.totalLeads}
                        </td>
                        {statusColumns
                          .filter(
                            (col) =>
                              col.type === "status" &&
                              !collapsedColumns.has(col.key)
                          )
                          .map((column) => (
                            <td
                              key={column.key}
                              className="text-center p-2 border-r"
                            >
                              <span
                                className={
                                  // If this is the 'Toplantı - Birebir Görüşme' column, use the new count
                                  column.key === "Toplantı - Birebir Görüşme"
                                    ? person.birebirGorusmeCount > 0
                                      ? "font-semibold text-blue-600"
                                      : "text-gray-400"
                                    : person[column.key] > 0
                                    ? "font-semibold text-blue-600"
                                    : "text-gray-400"
                                }
                              >
                                {column.key === "Toplantı - Birebir Görüşme"
                                  ? person.birebirGorusmeCount || 0
                                  : person[column.key] || 0}
                              </span>
                            </td>
                          ))}
                        <td className="text-center p-2 bg-green-50">
                          <Badge
                            variant={
                              person.takipteCount > 0 ? "default" : "secondary"
                            }
                          >
                            {person.takipteCount}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot>
                    <tr className="border-t-2 bg-gray-200 font-bold">
                      <td className="p-2 border-r sticky left-0 bg-gray-200">
                        Toplam:
                      </td>
                      <td className="text-center p-2 border-r bg-blue-100">
                        {personnelStatusMatrix.reduce(
                          (sum, person) => sum + person.totalLeads,
                          0
                        )}
                      </td>
                      {statusColumns
                        .filter(
                          (col) =>
                            col.type === "status" &&
                            !collapsedColumns.has(col.key)
                        )
                        .map((column) => (
                          <td
                            key={column.key}
                            className="text-center p-2 border-r"
                          >
                            {column.key === "Toplantı - Birebir Görüşme"
                              ? personnelStatusMatrix.reduce(
                                  (sum, person) =>
                                    sum + (person.birebirGorusmeCount || 0),
                                  0
                                )
                              : personnelStatusMatrix.reduce(
                                  (sum, person) =>
                                    sum + (person[column.key] || 0),
                                  0
                                )}
                          </td>
                        ))}
                      <td className="text-center p-2 bg-green-100">
                        {personnelStatusMatrix.reduce(
                          (sum, person) => sum + person.takipteCount,
                          0
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Show collapsed columns count */}
              {collapsedColumns.size > 0 && (
                <div className="text-sm text-gray-500 text-center">
                  {collapsedColumns.size} sütun gizlendi. Yukarıdaki düğmelerle
                  tekrar gösterebilirsiniz.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Henüz personel verisi bulunmuyor</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="status">Durum Analizi</TabsTrigger>
          <TabsTrigger value="personnel">Personel Performansı</TabsTrigger>
          <TabsTrigger value="sources">🎯 Kaynak Analizi</TabsTrigger>
          <TabsTrigger value="data-explorer">📊 Lead Verileri</TabsTrigger>
          <TabsTrigger value="advanced">🧠 Gelişmiş Analiz</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Durum Dağılımı</CardTitle>
                <CardDescription>
                  Mevcut lead durumlarının analizi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardMetrics?.statusData && (
                  <>
                    <StandardChart
                      title=""
                      data={dashboardMetrics.statusData}
                      height={400}
                      chartType={chartType}
                    />
                    <DataTable
                      title="Lead Durum Dağılımı"
                      data={dashboardMetrics.statusData.map((item) => ({
                        Durum: item.name,
                        Adet: item.value,
                        Yüzde: `${item.value} (%${item.percentage})`,
                      }))}
                      totalRecords={dashboardMetrics.totalLeads}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Tipi Dağılımı</CardTitle>
                <CardDescription>Kiralık vs Satış analizi</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardMetrics?.typeData && (
                  <>
                    <StandardChart
                      title=""
                      data={dashboardMetrics.typeData}
                      height={400}
                      chartType={chartType}
                    />
                    <DataTable
                      title="Lead Tipi Dağılımı"
                      data={dashboardMetrics.typeData.map((item) => ({
                        Tip: item.name,
                        Adet: item.value,
                        Yüzde: `${item.value} (%${item.percentage})`,
                      }))}
                      totalRecords={dashboardMetrics.totalLeads}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>👥 Personel Performans Karşılaştırması</CardTitle>
              <CardDescription>
                Lead sayıları ve takip verileri birleşimi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardMetrics?.personnelData && (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dashboardMetrics.personnelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="leadCount"
                        fill="#8884d8"
                        name="Lead Sayısı"
                        radius={[4, 4, 0, 0]}
                      />
                      {hasSecondaryData && (
                        <Bar
                          dataKey="takipteCount"
                          fill="#82ca9d"
                          name="Takip Sayısı"
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>

                  <DataTable
                    title="Personel Performans Detayları"
                    data={dashboardMetrics.personnelData.map((item) => ({
                      Personel: item.name,
                      "Lead Sayısı": item.leadCount,
                      Yüzde: `%${Math.round(
                        (item.leadCount / dashboardMetrics.totalLeads) * 100
                      )}`,
                      "Takip Kayıtları": item.takipteCount,
                      Verimlilik: `%${item.efficiency}`,
                    }))}
                    className="mt-6"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          {hasSecondaryData && takipteAnalytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Source Analysis */}
                <StandardChart
                  title="Müşteri Kaynak Analizi"
                  data={
                    takipteAnalytics.sourceData?.map((item, index) => ({
                      name: item.name,
                      value: Number(item.value),
                      percentage: item.percentage,
                      color: `hsl(${index * 45}, 70%, 60%)`,
                    })) || []
                  }
                  showDataTable={true}
                  showBadge={false}
                  gradientColors={["from-blue-50", "to-indigo-100"]}
                  borderColor="border-blue-100 dark:border-blue-800"
                  height={300}
                  chartType={chartType}
                  allowTypeChange={false}
                  description="Lead kaynaklarının dağılımı"
                  icon="📱"
                  tableTitle="Kaynak Detayları"
                />

                {/* Meeting Type Distribution */}
                <StandardChart
                  title="Görüşme Tipi Dağılımı"
                  data={
                    takipteAnalytics.meetingTypeData?.map((item, index) => ({
                      name: item.name,
                      value: Number(item.value),
                      percentage: item.percentage,
                      color: `hsl(${index * 60}, 65%, 55%)`,
                    })) || []
                  }
                  showDataTable={true}
                  showBadge={false}
                  gradientColors={["from-green-50", "to-emerald-100"]}
                  borderColor="border-green-100 dark:border-green-800"
                  height={300}
                  chartType={chartType}
                  allowTypeChange={false}
                  description="İletişim yöntemlerinin analizi"
                  icon="🤝"
                  tableTitle="Görüşme Detayları"
                />
              </div>

              {/* Lead Source from Main Data */}
              {dashboardMetrics?.leads && (
                <Card className="p-6 shadow-lg border-2 border-purple-100 dark:border-purple-800">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      📈 Ana Lead Kaynak Analizi
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Asıl lead dosyasından kaynak verileri
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={Array.from(
                        new Set(
                          dashboardMetrics.leads.map(
                            (l) => l.firstCustomerSource || "Bilinmiyor"
                          )
                        )
                      )
                        .map((source) => ({
                          name: source,
                          value: dashboardMetrics.leads.filter(
                            (l) =>
                              (l.firstCustomerSource || "Bilinmiyor") === source
                          ).length,
                          percentage: Math.round(
                            (dashboardMetrics.leads.filter(
                              (l) =>
                                (l.firstCustomerSource || "Bilinmiyor") ===
                                source
                            ).length /
                              dashboardMetrics.leads.length) *
                              100
                          ),
                        }))
                        .sort((a, b) => b.value - a.value)}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={120}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" name="Lead Sayısı" />
                    </BarChart>
                  </ResponsiveContainer>
                  <DataTable
                    data={Array.from(
                      new Set(
                        dashboardMetrics.leads.map(
                          (l) => l.firstCustomerSource || "Bilinmiyor"
                        )
                      )
                    )
                      .map((source) => ({
                        Kaynak: source,
                        Adet: dashboardMetrics.leads.filter(
                          (l) =>
                            (l.firstCustomerSource || "Bilinmiyor") === source
                        ).length,
                        Yüzde: `%${Math.round(
                          (dashboardMetrics.leads.filter(
                            (l) =>
                              (l.firstCustomerSource || "Bilinmiyor") === source
                          ).length /
                            dashboardMetrics.leads.length) *
                            100
                        )}`,
                      }))
                      .sort((a, b) => b["Adet"] - a["Adet"])}
                    title="Ana Lead Kaynak Detayları"
                    className="mt-4"
                  />
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Show basic source analysis from main leads data even without secondary file */}
              {dashboardMetrics?.leads && (
                <Card className="p-6 shadow-lg border-2 border-blue-100 dark:border-blue-800">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      📈 Lead Kaynak Analizi
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ana lead dosyasından kaynak verileri
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={Array.from(
                        new Set(
                          dashboardMetrics.leads.map(
                            (l) => l.firstCustomerSource || "Bilinmiyor"
                          )
                        )
                      )
                        .map((source) => ({
                          name: source,
                          value: dashboardMetrics.leads.filter(
                            (l) =>
                              (l.firstCustomerSource || "Bilinmiyor") === source
                          ).length,
                          percentage: Math.round(
                            (dashboardMetrics.leads.filter(
                              (l) =>
                                (l.firstCustomerSource || "Bilinmiyor") ===
                                source
                            ).length /
                              dashboardMetrics.leads.length) *
                              100
                          ),
                        }))
                        .sort((a, b) => b.value - a.value)}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={120}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" name="Lead Sayısı" />
                    </BarChart>
                  </ResponsiveContainer>
                  <DataTable
                    data={Array.from(
                      new Set(
                        dashboardMetrics.leads.map(
                          (l) => l.firstCustomerSource || "Bilinmiyor"
                        )
                      )
                    )
                      .map((source) => ({
                        Kaynak: source,
                        Adet: dashboardMetrics.leads.filter(
                          (l) =>
                            (l.firstCustomerSource || "Bilinmiyor") === source
                        ).length,
                        Yüzde: `%${Math.round(
                          (dashboardMetrics.leads.filter(
                            (l) =>
                              (l.firstCustomerSource || "Bilinmiyor") === source
                          ).length /
                            dashboardMetrics.leads.length) *
                            100
                        )}`,
                      }))
                      .sort((a, b) => b["Adet"] - a["Adet"])}
                    title="Lead Kaynak Detayları"
                    className="mt-4"
                  />
                </Card>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Daha detaylı kaynak analizi için takip dosyası yükleyin. Şu
                  anda ana lead verilerinden temel analiz gösteriliyor.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          {hasSecondaryData && takipteAnalytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Criteria Analysis */}
                <Card className="p-6 shadow-lg border-2 border-orange-100 dark:border-orange-800">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      🎯 Müşteri Kriterleri
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Satış vs Kira müşteri analizi
                    </p>
                  </div>
                  <StandardChart
                    title=""
                    data={takipteAnalytics.kriterData}
                    height={300}
                    chartType={chartType}
                  />
                  <DataTable
                    data={takipteAnalytics.kriterData.map((item) => ({
                      Kriter: item.name,
                      Adet: item.value,
                      Yüzde: `${item.value} (%${item.percentage})`,
                    }))}
                    title="Kriter Detayları"
                    className="mt-4"
                  />
                </Card>

                {/* Office Performance */}
                <Card className="p-6 shadow-lg border-2 border-teal-100 dark:border-teal-800">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      🏢 Ofis Performansı
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Şube bazlı aktivite analizi
                    </p>
                  </div>
                  <StandardChart
                    title=""
                    data={takipteAnalytics.officeData}
                    height={300}
                    chartType={chartType}
                  />
                  <DataTable
                    data={takipteAnalytics.officeData.map((item) => ({
                      Ofis: item.name,
                      Adet: item.value,
                      Yüzde: `${item.value} (%${item.percentage})`,
                    }))}
                    title="Ofis Detayları"
                    className="mt-4"
                  />
                </Card>
              </div>

              {/* Advanced Status Analysis from Main Data */}
              {dashboardMetrics?.leads && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 shadow-lg border-2 border-indigo-100 dark:border-indigo-800">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        📊 Gelişmiş Durum Analizi
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Lead durumlarının detaylı incelemesi
                      </p>
                    </div>
                    <div className="flex flex-row">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(
                              dashboardMetrics.leads.reduce(
                                (acc: any, lead) => {
                                  const status = lead.status || "Tanımsız";
                                  acc[status] = (acc[status] || 0) + 1;
                                  return acc;
                                },
                                {}
                              )
                            ).map(([status, count]) => ({
                              name: status,
                              value: count,
                              percentage: Math.round(
                                ((count as number) /
                                  dashboardMetrics.leads.length) *
                                  100
                              ),
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.entries(
                              dashboardMetrics.leads.reduce(
                                (acc: any, lead) => {
                                  const status = lead.status || "Tanımsız";
                                  acc[status] = (acc[status] || 0) + 1;
                                  return acc;
                                },
                                {}
                              )
                            ).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={getColor("STATUS", entry[0])}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="ml-6 flex flex-col justify-center">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Durum Dağılımı
                        </h4>
                        <div className="flex flex-col gap-2">
                          {Object.entries(
                            dashboardMetrics.leads.reduce((acc: any, lead) => {
                              const status = lead.status || "Tanımsız";
                              acc[status] = (acc[status] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([status, count]) => (
                            <div key={status} className="flex items-center">
                              <div
                                className="w-4 h-4 rounded-full mr-2"
                                style={{
                                  backgroundColor: getColor("STATUS", status),
                                }}
                              ></div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {status}: {count as number} (
                                {Math.round(
                                  ((count as number) /
                                    dashboardMetrics.leads.length) *
                                    100
                                )}
                                %)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 shadow-lg border-2 border-emerald-100 dark:border-emerald-800">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        🏠 Proje Analizi
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        En popüler projeler
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Array.from(
                          new Set(
                            dashboardMetrics.leads.map(
                              (l) => l.projectName || "Bilinmiyor"
                            )
                          )
                        )
                          .map((project) => ({
                            name:
                              project.length > 15
                                ? project.substring(0, 15) + "..."
                                : project,
                            value: dashboardMetrics.leads.filter(
                              (l) => (l.projectName || "Bilinmiyor") === project
                            ).length,
                          }))
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 10)}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Show basic advanced analysis from main data even without secondary file */}
              {dashboardMetrics?.leads && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 shadow-lg border-2 border-indigo-100 dark:border-indigo-800">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        📊 Gelişmiş Durum Analizi
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Lead durumlarının detaylı incelemesi
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(
                            dashboardMetrics.leads.reduce((acc: any, lead) => {
                              const status = lead.status || "Tanımsız";
                              acc[status] = (acc[status] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([status, count]) => ({
                            name: status,
                            value: count,
                            percentage: Math.round(
                              ((count as number) /
                                dashboardMetrics.leads.length) *
                                100
                            ),
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) =>
                            `${name}: %${percentage}`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(
                            dashboardMetrics.leads.reduce((acc: any, lead) => {
                              const status = lead.status || "Tanımsız";
                              acc[status] = (acc[status] || 0) + 1;
                              return acc;
                            }, {})
                          ).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={getColor("STATUS", entry[0])}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <DataTable
                      data={Object.entries(
                        dashboardMetrics.leads.reduce((acc: any, lead) => {
                          const status = lead.status || "Tanımsız";
                          acc[status] = (acc[status] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([status, count]) => ({
                        Durum: status,
                        Adet: count,
                        Yüzde: `%${Math.round(
                          ((count as number) / dashboardMetrics.leads.length) *
                            100
                        )}`,
                      }))}
                      title="Durum Detay Analizi"
                      className="mt-4"
                    />
                  </Card>

                  <Card className="p-6 shadow-lg border-2 border-emerald-100 dark:border-emerald-800">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        🏠 Proje Analizi
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        En popüler projeler
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Array.from(
                          new Set(
                            dashboardMetrics.leads.map(
                              (l) => l.projectName || "Bilinmiyor"
                            )
                          )
                        )
                          .map((project) => ({
                            name:
                              project.length > 15
                                ? project.substring(0, 15) + "..."
                                : project,
                            value: dashboardMetrics.leads.filter(
                              (l) => (l.projectName || "Bilinmiyor") === project
                            ).length,
                          }))
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 10)}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                    <DataTable
                      data={Array.from(
                        new Set(
                          dashboardMetrics.leads.map(
                            (l) => l.projectName || "Bilinmiyor"
                          )
                        )
                      )
                        .map((project) => ({
                          Proje: project,
                          Adet: dashboardMetrics.leads.filter(
                            (l) => (l.projectName || "Bilinmiyor") === project
                          ).length,
                          Yüzde: `%${Math.round(
                            (dashboardMetrics.leads.filter(
                              (l) => (l.projectName || "Bilinmiyor") === project
                            ).length /
                              dashboardMetrics.leads.length) *
                            100
                          )}`,
                        }))
                        .sort((a, b) => b["Adet"] - a["Adet"])
                        .slice(0, 10)}
                      title="Proje Detayları"
                      className="mt-4"
                    />
                  </Card>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tam gelişmiş analiz için takip dosyası yükleyin. Şu anda ana
                  lead verilerinden temel gelişmiş analiz gösteriliyor.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </TabsContent>

        <TabsContent value="data-explorer" className="space-y-4">
          <LeadDataExplorer leads={filteredLeads || []} isLoading={false} />

          {/* Enhanced Data Tables Section */}
          <div className="space-y-6 mt-8">
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                📊 Tüm Veri Tabloları
              </h3>

              {/* Olumsuzluk Nedenleri Advanced Table */}
              {dashboardMetrics?.leads && (
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium flex items-center gap-2">
                        ❌ Olumsuzluk Nedenleri - Detaylı Analiz
                        <Badge variant="outline">
                          {
                            dashboardMetrics.leads.filter(
                              (l) =>
                                l.negativeReason &&
                                l.negativeReason.trim() !== ""
                            ).length
                          }{" "}
                          olumsuz lead
                        </Badge>
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const negativeLeads = dashboardMetrics.leads.filter(
                              (l) =>
                                l.negativeReason &&
                                l.negativeReason.trim() !== ""
                            );
                            const csvContent = [
                              "Müşteri Adı,Olumsuzluk Nedeni,Atanan Personel,Proje,Lead Tipi,Tarih",
                              ...negativeLeads.map(
                                (lead) =>
                                  `"${lead.customerName || ""}","${
                                    lead.negativeReason || ""
                                  }","${lead.assignedPersonnel || ""}","${
                                    lead.projectName || ""
                                  }","${lead.leadType || ""}","${
                                    lead.requestDate || ""
                                  }"`
                              ),
                            ].join("\n");
                            const blob = new Blob([csvContent], {
                              type: "text/csv",
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `olumsuzluk_nedenleri_detay_${new Date()
                              .toISOString()
                              .slice(0, 10)}.csv`;
                            a.click();
                          }}
                          className="flex items-center gap-1"
                        >
                          CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const negativeLeads = dashboardMetrics.leads.filter(
                              (l) =>
                                l.negativeReason &&
                                l.negativeReason.trim() !== ""
                            );
                            const headers =
                              "Müşteri Adı\tOlumsuzluk Nedeni\tAtanan Personel\tProje\tLead Tipi\tTarih\n";
                            const content = negativeLeads
                              .map(
                                (lead) =>
                                  `${lead.customerName || ""}\t${
                                    lead.negativeReason || ""
                                  }\t${lead.assignedPersonnel || ""}\t${
                                    lead.projectName || ""
                                  }\t${lead.leadType || ""}\t${
                                    lead.requestDate || ""
                                  }`
                              )
                              .join("\n");
                            const blob = new Blob([headers + content], {
                              type: "application/vnd.ms-excel",
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `olumsuzluk_nedenleri_detay_${new Date()
                              .toISOString()
                              .slice(0, 10)}.xls`;
                            a.click();
                          }}
                          className="flex items-center gap-1"
                        >
                          Excel
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <MasterDataTable
                      title="Olumsuzluk Nedenleri - Detaylı Liste"
                      data={dashboardMetrics.leads
                        .filter(
                          (l) =>
                            l.negativeReason && l.negativeReason.trim() !== ""
                        )
                        .map((lead) => ({
                          customerName: lead.customerName || "Bilinmiyor",
                          negativeReason: lead.negativeReason || "",
                          assignedPersonnel:
                            lead.assignedPersonnel || "Atanmamış",
                          projectName: lead.projectName || "Belirtilmemiş",
                          leadType: lead.leadType || "Bilinmiyor",
                          requestDate: lead.requestDate || "",
                          status: lead.status || "Bilinmiyor",
                          lastMeetingNote: lead.lastMeetingNote || "",
                          responseResult: lead.responseResult || "",
                        }))}
                      columns={[
                        {
                          key: "customerName",
                          label: "Müşteri Adı",
                          type: "text",
                        },
                        {
                          key: "negativeReason",
                          label: "Olumsuzluk Nedeni",
                          type: "badge",
                        },
                        {
                          key: "assignedPersonnel",
                          label: "Atanan Personel",
                          type: "badge",
                        },
                        { key: "projectName", label: "Proje", type: "text" },
                        { key: "leadType", label: "Lead Tipi", type: "badge" },
                        {
                          key: "requestDate",
                          label: "Talep Tarihi",
                          type: "date",
                        },
                        { key: "status", label: "Durum", type: "badge" },
                        {
                          key: "lastMeetingNote",
                          label: "Son Görüşme Notu",
                          type: "text",
                        },
                        {
                          key: "responseResult",
                          label: "Dönüş Sonucu",
                          type: "text",
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Status Distribution Table */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      📊 Durum Dağılımı - Detaylı Tablo
                      <Badge variant="outline">
                        {dashboardMetrics?.statusData?.length || 0} durum
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const csvContent = [
                            "Durum,Adet,Yüzde",
                            ...(dashboardMetrics?.statusData || []).map(
                              (item) =>
                                `"${item.name}",${item.value},${item.percentage}%`
                            ),
                          ].join("\n");
                          const blob = new Blob([csvContent], {
                            type: "text/csv",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `durum_dagilimi_${new Date()
                            .toISOString()
                            .slice(0, 10)}.csv`;
                          a.click();
                        }}
                        className="flex items-center gap-1"
                      >
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const headers = "Durum\tAdet\tYüzde\n";
                          const content = (dashboardMetrics?.statusData || [])
                            .map(
                              (item) =>
                                `${item.name}\t${item.value}\t${item.percentage}%`
                            )
                            .join("\n");
                          const blob = new Blob([headers + content], {
                            type: "application/vnd.ms-excel",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `durum_dagilimi_${new Date()
                            .toISOString()
                            .slice(0, 10)}.xls`;
                          a.click();
                        }}
                        className="flex items-center gap-1"
                      >
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                            Durum
                          </th>
                          <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                            Adet
                          </th>
                          <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                            Yüzde
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardMetrics?.statusData?.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2">
                              {item.name}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center font-medium">
                              {item.value}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              {item.percentage}%
                            </td>
                          </tr>
                        )) || (
                          <tr>
                            <td
                              colSpan={3}
                              className="border border-gray-200 px-4 py-8 text-center text-gray-500"
                            >
                              Veri bulunamadı
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Personnel Performance Table */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      👥 Personel Performansı - Detaylı Tablo
                      <Badge variant="outline">
                        {dashboardMetrics?.personnelData?.length || 0} personel
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const csvContent = [
                            "Personel,Lead Sayısı,Takip Sayısı,Verimlilik %",
                            ...(dashboardMetrics?.personnelData || []).map(
                              (item) =>
                                `"${item.name}",${item.leadCount},${item.takipteCount},${item.efficiency}%`
                            ),
                          ].join("\n");
                          const blob = new Blob([csvContent], {
                            type: "text/csv",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `personel_performansi_${new Date()
                            .toISOString()
                            .slice(0, 10)}.csv`;
                          a.click();
                        }}
                        className="flex items-center gap-1"
                      >
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const headers =
                            "Personel\tLead Sayısı\tTakip Sayısı\tVerimlilik %\n";
                          const content = (
                            dashboardMetrics?.personnelData || []
                          )
                            .map(
                              (item) =>
                                `${item.name}\t${item.leadCount}\t${item.takipteCount}\t${item.efficiency}%`
                            )
                            .join("\n");
                          const blob = new Blob([headers + content], {
                            type: "application/vnd.ms-excel",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `personel_performansi_${new Date()
                            .toISOString()
                            .slice(0, 10)}.xls`;
                          a.click();
                        }}
                        className="flex items-center gap-1"
                      >
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                            Personel
                          </th>
                          <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                            Lead Sayısı
                          </th>
                          <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                            Takip Sayısı
                          </th>
                          <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                            Verimlilik %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardMetrics?.personnelData?.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2 font-medium">
                              {item.name}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              {item.leadCount}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              {item.takipteCount}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              <Badge
                                variant={
                                  item.efficiency > 70
                                    ? "default"
                                    : item.efficiency > 40
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {item.efficiency}%
                              </Badge>
                            </td>
                          </tr>
                        )) || (
                          <tr>
                            <td
                              colSpan={4}
                              className="border border-gray-200 px-4 py-8 text-center text-gray-500"
                            >
                              Veri bulunamadı
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Summary */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📊 Dashboard Özeti
            </h3>
            <div className="flex justify-center space-x-8 text-sm text-gray-600">
              <div>
                <span className="font-medium">
                  {dashboardMetrics?.totalLeads || 0}
                </span>{" "}
                Ana Lead
              </div>
              <div>
                <span className="font-medium">
                  {dashboardMetrics?.totalTakipte || 0}
                </span>{" "}
                Takip Kaydı
              </div>
              <div>
                <span className="font-medium">
                  {dashboardMetrics?.dataCompletnessScore || 0}%
                </span>{" "}
                Veri Tamamlanması
              </div>
              <div>
                <span className="font-medium">
                  {hasSecondaryData ? "Aktif" : "Pasif"}
                </span>{" "}
                AI Analiz
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
