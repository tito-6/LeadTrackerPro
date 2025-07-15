import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Lead, SalesRep } from "@shared/schema";
import {
  Calendar,
  Phone,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  FileSearch,
} from "lucide-react";
import InteractiveChart from "./interactive-chart";
import DateFilter from "@/components/ui/date-filter";

interface TakipData {
  leadId: number;
  customerName: string;
  sonuc: string;
  gorusme: string;
  gorusmeTarihi: string;
  assignedPersonnel: string;
  projectName?: string;
  status:
    | "Arandı - Geri Dönecek"
    | "Ulaşılamıyor"
    | "Takip Edilecek"
    | "Tamamlandı"
    | "İptal";
  priority: "Yüksek" | "Orta" | "Düşük";
  nextActionDate?: string;
}

export default function TakipRaporuTab() {
  const [dateFilters, setDateFilters] = useState({
    startDate: "",
    endDate: "",
    month: "",
    year: "",
  });

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads", dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/leads?${params.toString()}`);
      return response.json();
    },
  });

  const { data: salesReps = [] } = useQuery<SalesRep[]>({
    queryKey: ["/api/sales-reps"],
  });

  const [chartType, setChartType] = useState<"pie" | "bar" | "line">("pie");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "quarter">(
    "month"
  );

  // Simulate takip data (in real implementation, this would come from the secondary JSON file)
  const takipData = useMemo(() => {
    if (!leads.length) return [];

    return leads
      .filter((lead) => {
        // Simulate follow-up statuses from "SON GÖRÜŞME SONUCU" or call notes
        const status = lead.status || lead.lastMeetingResult || "";
        return (
          status.toLowerCase().includes("takip") ||
          status.toLowerCase().includes("aranacak") ||
          status.toLowerCase().includes("ulaşılamıyor") ||
          status.toLowerCase().includes("geri dönecek") ||
          lead.callNote?.toLowerCase().includes("takip") ||
          lead.callNote?.toLowerCase().includes("aranacak")
        );
      })
      .map((lead, index) => {
        const statuses: TakipData["status"][] = [
          "Arandı - Geri Dönecek",
          "Ulaşılamıyor",
          "Takip Edilecek",
          "Tamamlandı",
        ];

        const priorities: TakipData["priority"][] = ["Yüksek", "Orta", "Düşük"];

        // Determine status from lead data
        let detectedStatus: TakipData["status"] = "Takip Edilecek";
        const statusText = (
          lead.status ||
          lead.lastMeetingResult ||
          ""
        ).toLowerCase();

        if (
          statusText.includes("geri dönecek") ||
          statusText.includes("aranacak")
        ) {
          detectedStatus = "Arandı - Geri Dönecek";
        } else if (
          statusText.includes("ulaşılamıyor") ||
          statusText.includes("ulaşılamadı")
        ) {
          detectedStatus = "Ulaşılamıyor";
        } else if (
          statusText.includes("tamamlandı") ||
          statusText.includes("satış")
        ) {
          detectedStatus = "Tamamlandı";
        }

        // Priority based on lead age and status
        let priority: TakipData["priority"] = "Orta";
        if (lead.requestDate) {
          const daysSinceRequest = Math.floor(
            (Date.now() - new Date(lead.requestDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysSinceRequest > 14) priority = "Yüksek";
          else if (daysSinceRequest < 3) priority = "Düşük";
        }

        return {
          leadId: lead.id,
          customerName: lead.customerName,
          sonuc: lead.status || lead.lastMeetingResult || "Beklemede",
          gorusme: lead.callNote || lead.lastMeetingNote || "Görüşme notu yok",
          gorusmeTarihi:
            lead.customerResponseDate ||
            lead.requestDate ||
            new Date().toISOString(),
          assignedPersonnel: lead.assignedPersonnel || "Atanmamış",
          projectName: lead.projectName,
          status: detectedStatus,
          priority,
          nextActionDate: new Date(
            Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // Random date within next week
        } as TakipData;
      });
  }, [leads]);

  // Filter takip data based on selections
  const filteredTakipData = useMemo(() => {
    return takipData.filter((item) => {
      const matchesSalesperson =
        selectedSalesperson === "all" ||
        item.assignedPersonnel === selectedSalesperson;
      const matchesProject =
        selectedProject === "all" ||
        (item.projectName && item.projectName.includes(selectedProject));

      // Time filter
      const itemDate = new Date(item.gorusmeTarihi);
      const now = new Date();
      let matchesTime = true;

      if (timeFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTime = itemDate >= weekAgo;
      } else if (timeFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesTime = itemDate >= monthAgo;
      } else if (timeFilter === "quarter") {
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        matchesTime = itemDate >= quarterAgo;
      }

      return matchesSalesperson && matchesProject && matchesTime;
    });
  }, [takipData, selectedSalesperson, selectedProject, timeFilter]);

  // Chart data for status distribution
  const statusChartData = useMemo(() => {
    if (!filteredTakipData.length) return [];

    const statusCounts = filteredTakipData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = filteredTakipData.length;
    const colors = {
      "Arandı - Geri Dönecek": "#F59E0B",
      Ulaşılamıyor: "#EF4444",
      "Takip Edilecek": "#3B82F6",
      Tamamlandı: "#10B981",
      İptal: "#6B7280",
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      percentage: Math.round((count / total) * 100),
      color: colors[status as keyof typeof colors] || "#6B7280",
    }));
  }, [filteredTakipData]);

  // Personnel performance in follow-ups
  const personnelChartData = useMemo(() => {
    if (!filteredTakipData.length) return [];

    const personnelCounts = filteredTakipData.reduce((acc, item) => {
      acc[item.assignedPersonnel] = (acc[item.assignedPersonnel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = filteredTakipData.length;

    return Object.entries(personnelCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([personnel, count], index) => ({
        name: personnel,
        value: count,
        percentage: Math.round((count / total) * 100),
        color: `hsl(${index * 40}, 70%, 55%)`,
      }));
  }, [filteredTakipData]);

  // Get unique projects for filter
  const uniqueProjects = useMemo(() => {
    const projects = new Set(
      takipData.map((item) => item.projectName).filter(Boolean)
    );
    return Array.from(projects);
  }, [takipData]);

  // Priority statistics
  const priorityStats = useMemo(() => {
    const high = filteredTakipData.filter(
      (item) => item.priority === "Yüksek"
    ).length;
    const medium = filteredTakipData.filter(
      (item) => item.priority === "Orta"
    ).length;
    const low = filteredTakipData.filter(
      (item) => item.priority === "Düşük"
    ).length;

    return { high, medium, low, total: filteredTakipData.length };
  }, [filteredTakipData]);

  const chartTypeOptions = [
    { value: "pie" as const, label: "Pasta Grafik", icon: "🥧" },
    { value: "bar" as const, label: "Sütun Grafik", icon: "📊" },
    { value: "line" as const, label: "Çizgi Grafik", icon: "📈" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              📞 Takip Raporu
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              SONUÇ, GÖRÜŞME ve GÖRÜŞME TARİHİ kolonlarından takip analizi
            </p>
          </div>

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
        </div>

        {/* Date Filter */}
        <div className="mt-4">
          <DateFilter
            onFilterChange={setDateFilters}
            initialFilters={dateFilters}
          />
        </div>

        {/* Other Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="time-filter">Zaman Aralığı</Label>
            <Select
              value={timeFilter}
              onValueChange={(value: "week" | "month" | "quarter") =>
                setTimeFilter(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Zaman seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">📅 Son Hafta</SelectItem>
                <SelectItem value="month">📅 Son Ay</SelectItem>
                <SelectItem value="quarter">📅 Son 3 Ay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="salesperson-filter">Personel Filtresi</Label>
            <Select
              value={selectedSalesperson}
              onValueChange={setSelectedSalesperson}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tüm Personel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Personel</SelectItem>
                {salesReps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.name}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="project-filter">Proje Filtresi</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Projeler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Projeler</SelectItem>
                {uniqueProjects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" className="w-full">
              <FileSearch className="w-4 h-4 mr-2" />
              Takip Dosyası Yükle
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Takip
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {filteredTakipData.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Yüksek Öncelik
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {priorityStats.high}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Geri Dönecek
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {
                  filteredTakipData.filter(
                    (item) => item.status === "Arandı - Geri Dönecek"
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-green-500 rounded-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tamamlanan
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {
                  filteredTakipData.filter(
                    (item) => item.status === "Tamamlandı"
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <Card className="shadow-lg border-2 border-blue-100 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
              📊 Takip Durumu Dağılımı
            </CardTitle>
            <CardDescription>
              Takip edilecek leadlerin mevcut durumları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveChart
              title=""
              data={statusChartData}
              height={300}
              chartType={chartType}
            />
          </CardContent>
        </Card>

        {/* Personnel Performance Chart */}
        <Card className="shadow-lg border-2 border-green-100 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700 dark:text-green-300">
              👥 Personel Takip Performansı
            </CardTitle>
            <CardDescription>
              Personel bazında takip edilen lead sayıları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveChart
              title=""
              data={personnelChartData}
              height={300}
              chartType={chartType}
            />
          </CardContent>
        </Card>
      </div>

      {/* Priority Analysis */}
      <Card className="shadow-lg border-2 border-orange-100 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-700 dark:text-orange-300">
            🎯 Öncelik Analizi
          </CardTitle>
          <CardDescription>
            Takip leadlerinin öncelik dağılımı ve aksiyon gerektiren durumlar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-700">
                  Yüksek Öncelik
                </span>
                <span className="text-lg font-bold text-red-600">
                  {priorityStats.high}
                </span>
              </div>
              <Progress
                value={
                  priorityStats.total > 0
                    ? (priorityStats.high / priorityStats.total) * 100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-gray-600">
                Acil aksiyon gerektiren leadler
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-700">
                  Orta Öncelik
                </span>
                <span className="text-lg font-bold text-orange-600">
                  {priorityStats.medium}
                </span>
              </div>
              <Progress
                value={
                  priorityStats.total > 0
                    ? (priorityStats.medium / priorityStats.total) * 100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-gray-600">Normal takip süreci</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-700">
                  Düşük Öncelik
                </span>
                <span className="text-lg font-bold text-green-600">
                  {priorityStats.low}
                </span>
              </div>
              <Progress
                value={
                  priorityStats.total > 0
                    ? (priorityStats.low / priorityStats.total) * 100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-gray-600">Rutin takip yeterli</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Follow-up Table */}
      <Card className="shadow-lg border-2 border-gray-100 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-700 dark:text-gray-300">
            📋 Detaylı Takip Listesi
          </CardTitle>
          <CardDescription>
            Tüm takip leadleri ve son görüşme bilgileri
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                    Müşteri
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                    Personel
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                    Durum
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                    Öncelik
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                    Son Görüşme
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                    Sonuç
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                    Proje
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTakipData.slice(0, 50).map((item, index) => (
                  <tr
                    key={item.leadId}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                      index % 2 === 0
                        ? "bg-gray-50 dark:bg-gray-800/50"
                        : "bg-white dark:bg-gray-900"
                    }`}
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                      {item.customerName}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {item.assignedPersonnel}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          item.status === "Tamamlandı"
                            ? "text-green-700 border-green-300"
                            : item.status === "Ulaşılamıyor"
                            ? "text-red-700 border-red-300"
                            : item.status === "Arandı - Geri Dönecek"
                            ? "text-orange-700 border-orange-300"
                            : "text-blue-700 border-blue-300"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          item.priority === "Yüksek"
                            ? "destructive"
                            : item.priority === "Orta"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {item.priority}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300 text-sm">
                      {new Date(item.gorusmeTarihi).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300 max-w-xs truncate text-sm">
                      {item.sonuc}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300 text-sm">
                      {item.projectName || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTakipData.length > 50 && (
            <div className="p-4 text-center text-gray-600 dark:text-gray-400">
              İlk 50 kayıt gösteriliyor. Toplam {filteredTakipData.length} takip
              kaydı bulundu.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredTakipData.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Phone className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Takip Kaydı Bulunamadı
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Seçilen filtrelere göre takip edilecek lead bulunmuyor.
            </p>
            <Button variant="outline">
              <FileSearch className="w-4 h-4 mr-2" />
              Takip Dosyası Yükle
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
