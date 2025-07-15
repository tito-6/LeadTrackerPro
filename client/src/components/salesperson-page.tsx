import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Users,
  TrendingUp,
  Target,
  Clock,
  Phone,
  FileText,
  Eye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import UniversalFilter, {
  UniversalFilters,
} from "@/components/ui/universal-filter";
import {
  getStandardColor,
  getStatusColor,
  getPersonnelColor,
} from "@/lib/color-system";
import { MeetingAnalyticsTab } from "./meeting-analytics-tab";

interface SalespersonPageProps {
  salespersonName: string;
}

export default function SalespersonPage({
  salespersonName,
}: SalespersonPageProps) {
  const [filters, setFilters] = useState<UniversalFilters>({
    startDate: "",
    endDate: "",
    month: "",
    year: "",
    leadType: "",
    projectName: "",
    salesRep: "",
    status: "",
  });

  // Fetch leads data
  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Get unique projects and statuses for filtering
  const availableProjects = useMemo(() => {
    const projects = allLeads
      .filter((lead) => lead.projectName)
      .map((lead) => lead.projectName)
      .filter(Boolean);
    return [...new Set(projects)];
  }, [allLeads]);

  const availableStatuses = useMemo(() => {
    const statuses = allLeads.map((lead) => lead.status).filter(Boolean);
    return [...new Set(statuses)];
  }, [allLeads]);

  // Filter leads for this salesperson
  const filteredLeads = useMemo(() => {
    let leads = allLeads.filter(
      (lead) => lead.assignedPersonnel === salespersonName
    );

    // Apply universal filters
    if (filters.startDate) {
      leads = leads.filter((lead) => {
        const leadDate = new Date(lead.requestDate || lead.createdAt || "");
        return leadDate >= new Date(filters.startDate);
      });
    }

    if (filters.endDate) {
      leads = leads.filter((lead) => {
        const leadDate = new Date(lead.requestDate || lead.createdAt || "");
        return leadDate <= new Date(filters.endDate);
      });
    }

    if (filters.month) {
      leads = leads.filter((lead) => {
        const leadDate = new Date(lead.requestDate || lead.createdAt || "");
        return (
          (leadDate.getMonth() + 1).toString().padStart(2, "0") ===
          filters.month
        );
      });
    }

    if (filters.year && filters.year !== "all-years") {
      leads = leads.filter((lead) => {
        const leadDate = new Date(lead.requestDate || lead.createdAt || "");
        return leadDate.getFullYear().toString() === filters.year;
      });
    }

    if (filters.leadType && filters.leadType !== "all-types") {
      leads = leads.filter((lead) => lead.leadType === filters.leadType);
    }

    if (filters.projectName && filters.projectName !== "all-projects") {
      leads = leads.filter((lead) => lead.projectName === filters.projectName);
    }

    if (filters.status && filters.status !== "all-statuses") {
      leads = leads.filter((lead) => lead.status === filters.status);
    }

    return leads;
  }, [allLeads, salespersonName, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const satisLeads = filteredLeads.filter(
      (lead) => lead.leadType === "satis"
    );
    const kiralamaLeads = filteredLeads.filter(
      (lead) => lead.leadType === "kiralama"
    );
    const olumsuzLeads = filteredLeads.filter((lead) =>
      lead.status?.includes("Olumsuz")
    );
    const takipteLeads = filteredLeads.filter((lead) =>
      lead.status?.includes("Takipte")
    );
    const satisYapilanLeads = filteredLeads.filter(
      (lead) => lead.wasSaleMade === "Evet"
    );

    return {
      total,
      satis: satisLeads.length,
      kiralama: kiralamaLeads.length,
      olumsuz: olumsuzLeads.length,
      takipte: takipteLeads.length,
      satisYapilan: satisYapilanLeads.length,
      conversion:
        total > 0 ? Math.round((satisYapilanLeads.length / total) * 100) : 0,
    };
  }, [filteredLeads]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const statusCounts = filteredLeads.reduce((acc, lead) => {
      const status = lead.status || "Belirtilmemiş";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: status,
        value: count,
        color: getStatusColor(status),
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Lead type distribution
  const leadTypeData = useMemo(() => {
    const typeData = [
      { name: "Satılık", value: stats.satis, color: getStandardColor("SALES") },
      {
        name: "Kiralık",
        value: stats.kiralama,
        color: getStandardColor("RENTAL"),
      },
    ];
    return typeData.filter((item) => item.value > 0);
  }, [stats]);

  // Project distribution
  const projectData = useMemo(() => {
    const projectCounts = filteredLeads.reduce((acc, lead) => {
      const project = lead.projectName || "Belirtilmemiş";
      acc[project] = (acc[project] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(projectCounts)
      .map(([project, count]) => ({
        name: project.length > 20 ? project.substring(0, 20) + "..." : project,
        fullName: project,
        value: count,
        color: getStandardColor("PROJECT", project),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredLeads]);

  // Recent leads
  const recentLeads = useMemo(() => {
    return filteredLeads
      .sort(
        (a, b) =>
          new Date(b.requestDate || b.createdAt || "").getTime() -
          new Date(a.requestDate || a.createdAt || "").getTime()
      )
      .slice(0, 10);
  }, [filteredLeads]);

  // Fetch expense data for cost analysis
  const { data: expenseStats } = useQuery({
    queryKey: ["/api/expense-stats", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/expense-stats?${params.toString()}`);
      return response.json();
    },
  });

  // Fetch exchange rate for USD conversions
  const { data: exchangeRate } = useQuery({
    queryKey: ["/api/exchange-rate/usd"],
    queryFn: async () => {
      const response = await fetch("/api/exchange-rate/usd");
      return response.json();
    },
  });

  // Calculate cost metrics for this salesperson
  const costMetrics = useMemo(() => {
    if (!expenseStats || !exchangeRate) return null;

    const totalLeads = expenseStats.leadCount;
    const salespersonLeads = filteredLeads.length;
    const totalExpensesTL = expenseStats.expenses.tl.totalExpenses;

    // Calculate salesperson's share of total costs based on lead ratio
    const leadRatio = totalLeads > 0 ? salespersonLeads / totalLeads : 0;
    const salespersonCostTL = totalExpensesTL * leadRatio;
    const salespersonCostUSD = salespersonCostTL / exchangeRate.rate;

    // Cost per lead for this salesperson
    const costPerLeadTL =
      salespersonLeads > 0 ? salespersonCostTL / salespersonLeads : 0;
    const costPerLeadUSD =
      salespersonLeads > 0 ? salespersonCostUSD / salespersonLeads : 0;

    // Agency fees and ads expenses breakdown
    const agencyFeesShare =
      expenseStats.expenses.tl.totalAgencyFees * leadRatio;
    const adsExpensesShare =
      expenseStats.expenses.tl.totalAdsExpenses * leadRatio;

    return {
      totalCostTL: salespersonCostTL,
      totalCostUSD: salespersonCostUSD,
      costPerLeadTL,
      costPerLeadUSD,
      agencyFeesShare,
      adsExpensesShare,
      leadRatio: leadRatio * 100,
    };
  }, [expenseStats, exchangeRate, filteredLeads.length]);

  const handleFilterChange = (newFilters: UniversalFilters) => {
    setFilters(newFilters);
  };

  // Sales status distribution for detailed analytics
  const salesStatusData = useMemo(() => {
    const salesData = [
      {
        name: "Satış Yapılan",
        value: stats.satisYapilan,
        color: getStandardColor("STATUS", "Satış Yapılan"),
      },
      {
        name: "Satış Yapılmayan",
        value: stats.total - stats.satisYapilan,
        color: getStandardColor("STATUS", "Aktif"),
      },
    ];
    return salesData.filter((item) => item.value > 0);
  }, [stats]);

  // Negative reasons analysis
  const negativeReasonsData = useMemo(() => {
    const negativeLeads = filteredLeads.filter((lead) =>
      lead.status?.includes("Olumsuz")
    );

    const reasonCounts = negativeLeads.reduce((acc, lead) => {
      const reason = lead.negativeReason || "Sebep Belirtilmemiş";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        name: reason.length > 30 ? reason.substring(0, 30) + "..." : reason,
        fullName: reason,
        value: count,
        color: getStandardColor("STATUS", reason),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredLeads]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            {salespersonName}
          </h1>
          <p className="text-sm text-gray-500">Personel Performans Raporu</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {stats.total} toplam lead
        </Badge>
      </div>

      {/* Universal Filters */}
      <UniversalFilter
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        availableProjects={availableProjects}
        availableStatuses={availableStatuses}
        showSalesRepFilter={false}
      />

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Lead</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">Bu dönem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satılık Lead</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.satis}
            </div>
            <p className="text-xs text-muted-foreground">
              %
              {stats.total > 0
                ? Math.round((stats.satis / stats.total) * 100)
                : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kiralık Lead</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.kiralama}
            </div>
            <p className="text-xs text-muted-foreground">
              %
              {stats.total > 0
                ? Math.round((stats.kiralama / stats.total) * 100)
                : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Takipte</CardTitle>
            <Phone className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.takipte}
            </div>
            <p className="text-xs text-muted-foreground">Aktif takip</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Olumsuz</CardTitle>
            <FileText className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.olumsuz}
            </div>
            <p className="text-xs text-muted-foreground">Olumsuz sonuç</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satış Yapılan</CardTitle>
            <Target className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats.satisYapilan}
            </div>
            <p className="text-xs text-muted-foreground">
              %{stats.conversion} dönüşüm
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dönüşüm</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              %{stats.conversion}
            </div>
            <p className="text-xs text-muted-foreground">Satış oranı</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis Section */}
      {costMetrics && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">💰 Maliyet Analizi</h2>
            <Badge variant="secondary">
              Lead oranı: %{costMetrics.leadRatio.toFixed(1)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Toplam Maliyet (TL)
                </CardTitle>
                <Target className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₺
                  {costMetrics.totalCostTL.toLocaleString("tr-TR", {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Bu personel payı
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Toplam Maliyet (USD)
                </CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  $
                  {costMetrics.totalCostUSD.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Dolar olarak</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lead Başına (TL)
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₺
                  {costMetrics.costPerLeadTL.toLocaleString("tr-TR", {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ortalama maliyet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lead Başına (USD)
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  $
                  {costMetrics.costPerLeadUSD.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Dolar olarak</p>
              </CardContent>
            </Card>
          </div>

          {/* Expense Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Gider Dağılımı (TL)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Ajans Ücretleri:</span>
                    <span className="font-medium">
                      ₺
                      {costMetrics.agencyFeesShare.toLocaleString("tr-TR", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Reklam Giderleri:</span>
                    <span className="font-medium">
                      ₺
                      {costMetrics.adsExpensesShare.toLocaleString("tr-TR", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-semibold">Toplam:</span>
                    <span className="font-bold">
                      ₺
                      {costMetrics.totalCostTL.toLocaleString("tr-TR", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Verimlilik Metrikleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">ROI (Satış/Maliyet):</span>
                    <span className="font-medium">
                      {stats.satisYapilan > 0
                        ? `%${(
                            (stats.satisYapilan / costMetrics.totalCostTL) *
                            100000
                          ).toFixed(1)}`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Satış Başına Maliyet:</span>
                    <span className="font-medium">
                      {stats.satisYapilan > 0
                        ? `₺${(
                            costMetrics.totalCostTL / stats.satisYapilan
                          ).toLocaleString("tr-TR", {
                            maximumFractionDigits: 0,
                          })}`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Lead Payı:</span>
                    <span className="font-medium">
                      %{costMetrics.leadRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Chart Tabs */}
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="status">Durum Analizi</TabsTrigger>
          <TabsTrigger value="sales">Satış Analizi</TabsTrigger>
          <TabsTrigger value="negative">Olumsuz Analizi</TabsTrigger>
          <TabsTrigger value="lead-type">Lead Tipi</TabsTrigger>
          <TabsTrigger value="projects">Proje Dağılımı</TabsTrigger>
          <TabsTrigger value="meetings">Toplantı Analizi</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Durum Analizi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`status-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Durum Detayları</h4>
                  {statusData.map((entry, index) => (
                    <div
                      key={`legend-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Satış Durumu Analizi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={salesStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {salesStatusData.map((entry, index) => (
                          <Cell key={`sales-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Satış Detayları</h4>
                  {salesStatusData.map((entry, index) => (
                    <div
                      key={`sales-legend-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium">Dönüşüm Oranı</div>
                    <div className="text-lg font-bold text-green-600">
                      %{stats.conversion}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="negative" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Olumsuz Analiz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={negativeReasonsData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {negativeReasonsData.map((entry, index) => (
                          <Cell key={`negative-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Sebep Detayları</h4>
                  {negativeReasonsData.map((entry, index) => (
                    <div
                      key={`negative-legend-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="negative" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Olumsuz Nedenleri Analizi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {negativeReasonsData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={negativeReasonsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = negativeReasonsData.find(
                                (item) => item.name === label
                              );
                              return (
                                <div className="bg-white p-3 border rounded shadow">
                                  <p className="font-medium">
                                    {data?.fullName}
                                  </p>
                                  <p className="text-blue-600">
                                    Sayı: {payload[0].value}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" fill="#8884d8">
                          {negativeReasonsData.map((entry, index) => (
                            <Cell
                              key={`negative-${index}`}
                              fill={entry.color}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Olumsuz Nedenleri</h4>
                    {negativeReasonsData.map((entry, index) => (
                      <div
                        key={`negative-legend-${index}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate" title={entry.fullName}>
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <div className="text-sm font-medium">Toplam Olumsuz</div>
                      <div className="text-lg font-bold text-red-600">
                        {stats.olumsuz}
                      </div>
                      <div className="text-xs text-gray-500">
                        %
                        {stats.total > 0
                          ? Math.round((stats.olumsuz / stats.total) * 100)
                          : 0}{" "}
                        olumsuz oran
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Bu personel için olumsuz lead bulunmuyor.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead-type" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Lead Tipi Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={leadTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {leadTypeData.map((entry, index) => (
                          <Cell key={`type-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Lead Tipi Detayları</h4>
                  {leadTypeData.map((entry, index) => (
                    <div
                      key={`type-legend-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Proje Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8">
                        {projectData.map((entry, index) => (
                          <Cell key={`project-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Proje Detayları</h4>
                  {projectData.map((entry, index) => (
                    <div
                      key={`project-legend-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Toplantı Analizi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MeetingAnalyticsTab
                filters={{
                  startDate: filters.startDate,
                  endDate: filters.endDate,
                  month: filters.month,
                  year: filters.year,
                  salesRep: salespersonName,
                  leadType: filters.leadType,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
