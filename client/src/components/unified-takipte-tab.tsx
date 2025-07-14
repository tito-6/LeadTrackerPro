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
import { useQuery } from "@tanstack/react-query";
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
  Phone,
  Clock,
  AlertCircle,
  Calendar,
  Star,
  TrendingUp,
  Users,
  Target,
} from "lucide-react";
import InteractiveChart from "./interactive-chart";
import { DataTable } from "@/components/ui/data-table";
import { MasterDataTable } from "@/components/ui/master-data-table";
import DateFilter from "./ui/date-filter";
import ThreeDPie from "./charts/ThreeDPie";
import { getItemColor } from "@/lib/color-store";
import { useColors } from "@/hooks/use-colors";

interface TakipteRecord {
  customerName: string;
  kriter: string;
  irtibatMusteriKaynagi: string;
  gorusmeTipi: string;
  ofisName: string;
  hatirlatmaVarMi: boolean;
  hatirlatmaTarihi?: string;
  hatirlatmaSonMu: boolean;
  konusmaSuresi: number;
  meslekAdi: string;
  sonSonuc: string;
  assignedPersonnel: string;
  lastUpdateDate: string;
}

export default function UnifiedTakipteTab() {
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>("all");
  const [selectedOffice, setSelectedOffice] = useState<string>("all");
  const [selectedKriter, setSelectedKriter] = useState<string>("all");
  const [chartType, setChartType] = useState<"pie" | "bar" | "line">("pie");
  const [dateFilters, setDateFilters] = useState({
    startDate: "",
    endDate: "",
    month: "",
    year: "",
  });

  // Use the color management system
  const { getColor } = useColors();

  // Helper function to remove color property from data for tables
  const removeColorFromData = (data: any[]) => {
    return data.map(({ color, ...item }) => item);
  };

  // Fetch takipte data with date filtering
  const { data: takipteData = [], isLoading: takipteLoading } = useQuery({
    queryKey: ["/api/takipte", dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/takipte?${params.toString()}`);
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Fetch enhanced stats with date filtering
  const { data: enhancedStats } = useQuery({
    queryKey: ["/api/enhanced-stats", dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/enhanced-stats?${params.toString()}`);
      return response.json();
    },
  });

  const hasData = takipteData.length > 0;

  console.log("Unified Takipte Tab - Data loaded:", {
    takipteDataLength: takipteData.length,
    hasData,
    sampleData: takipteData.slice(0, 2),
    allKeys: takipteData[0] ? Object.keys(takipteData[0]) : [],
  });

  // Comprehensive analytics calculations
  const analytics = useMemo(() => {
    if (!hasData) return null;

    // Filter data based on selections
    let filteredData = takipteData;

    if (selectedPersonnel !== "all") {
      filteredData = filteredData.filter(
        (item: any) =>
          item["Personel Adı(203)"] === selectedPersonnel ||
          item["Hatırlatma Personeli"] === selectedPersonnel
      );
    }

    if (selectedOffice !== "all") {
      filteredData = filteredData.filter(
        (item: any) => item["Ofis"] === selectedOffice
      );
    }

    if (selectedKriter !== "all") {
      filteredData = filteredData.filter(
        (item: any) =>
          item["Kriter"] === selectedKriter ||
          item["İrtibat Müşteri Kaynağı"] === selectedKriter
      );
    }

    // Calculate comprehensive metrics
    const totalRecords = filteredData.length;

    // Customer criteria analysis (using correct field names)
    const kriterCounts = filteredData.reduce((acc: any, item: any) => {
      const kriter = item.kriter || item["Kriter"] || "Belirtilmemiş";
      acc[kriter] = (acc[kriter] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Source analysis (using correct field names)
    const sourceCounts = filteredData.reduce((acc: any, item: any) => {
      const source =
        item.irtibatMusteriKaynagi ||
        item["İrtibat Müşteri Kaynağı"] ||
        "Bilinmiyor";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Meeting type analysis (using correct field names)
    const meetingTypeCounts = filteredData.reduce((acc: any, item: any) => {
      const meetingType =
        item.gorusmeTipi || item["Görüşme Tipi"] || "Belirtilmemiş";
      acc[meetingType] = (acc[meetingType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Office performance (using correct field names)
    const officeCounts = filteredData.reduce((acc: any, item: any) => {
      const office = item.ofisName || item["Ofis"] || "Ana Ofis";
      acc[office] = (acc[office] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Personnel analysis (using correct field names)
    const personnelCounts = filteredData.reduce((acc: any, item: any) => {
      const personnel =
        item.assignedPersonnel ||
        item["Müşteri Adı Soyadı(203)"] ||
        "Atanmamış";
      acc[personnel] = (acc[personnel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Profession analysis (using correct field names)
    const professionCounts = filteredData.reduce((acc: any, item: any) => {
      const profession =
        item.meslekAdi || item["Meslek Adı"] || "Belirtilmemiş";
      acc[profession] = (acc[profession] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Result analysis (using correct field names)
    const resultCounts = filteredData.reduce((acc: any, item: any) => {
      const result = item.sonSonuc || item["Son Sonuç"] || "Devam Ediyor";
      acc[result] = (acc[result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Reminder analysis
    let reminderCount = 0;
    let overdueCount = 0;
    let finalReminderCount = 0;

    filteredData.forEach((item: any) => {
      const hasReminder =
        item.hatirlatmaVarMi === true || item["Hatırlatma Var Mı"] === "TRUE";
      const reminderDate = item.hatirlatmaTarihi || item["Hatırlatma Tarihi"];
      const isFinal =
        item.hatirlatmaSonMu === true || item["Hatırlatma Son Mu ?"] === "TRUE";

      if (hasReminder) reminderCount++;
      if (isFinal) finalReminderCount++;
      if (reminderDate && new Date(reminderDate) < new Date()) overdueCount++;
    });

    // Average call duration analysis
    const totalDuration = filteredData.reduce((acc: number, item: any) => {
      // Use actual call duration field
      const duration =
        item.konusmaSuresi || parseInt(item["Konuşma Süresi"] || "0");
      return acc + (typeof duration === "number" ? duration : 0);
    }, 0);
    const averageResponseTime =
      totalRecords > 0 ? Math.round(totalDuration / totalRecords) : 0;

    // Convert to chart data format with smart color assignment
    const kriterCategories = Object.keys(kriterCounts);
    const sourceCategories = Object.keys(sourceCounts);
    const meetingTypeCategories = Object.keys(meetingTypeCounts);
    const officeCategories = Object.keys(officeCounts);
    const personnelCategories = Object.keys(personnelCounts);
    const professionCategories = Object.keys(professionCounts);
    const resultCategories = Object.keys(resultCounts);

    // Convert to chart data format using the new color system
    const kriterData = Object.entries(kriterCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((Number(value) / totalRecords) * 100),
      color: getColor("LEAD_TYPE", name),
    }));

    const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((Number(value) / totalRecords) * 100),
      color: getColor("CUSTOMER_SOURCE", name),
    }));

    const meetingTypeData = Object.entries(meetingTypeCounts).map(
      ([name, value]) => ({
        name,
        value,
        percentage: Math.round((Number(value) / totalRecords) * 100),
        color: getColor("MEETING_TYPE", name),
      })
    );

    const officeData = Object.entries(officeCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((Number(value) / totalRecords) * 100),
      color: getColor("OFFICE", name),
    }));

    const personnelData = Object.entries(personnelCounts).map(
      ([name, value]) => ({
        name,
        value,
        percentage: Math.round((Number(value) / totalRecords) * 100),
        color: getColor("PERSONNEL", name),
      })
    );

    const professionData = Object.entries(professionCounts).map(
      ([name, value]) => ({
        name,
        value,
        percentage: Math.round((Number(value) / totalRecords) * 100),
        color: getColor("PERSONNEL", name), // Using PERSONNEL for professions
      })
    );

    const resultData = Object.entries(resultCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((Number(value) / totalRecords) * 100),
      color: getColor("STATUS", name),
    }));

    return {
      totalRecords,
      averageResponseTime,
      reminderStats: {
        total: reminderCount,
        overdue: overdueCount,
        final: finalReminderCount,
        percentage: Math.round((reminderCount / totalRecords) * 100),
      },
      kriterData,
      sourceData,
      meetingTypeData,
      officeData,
      personnelData,
      professionData,
      resultData,
      // Get unique values for filters
      uniquePersonnel: Array.from(
        new Set(
          takipteData.map(
            (item: any) =>
              item["Personel Adı(203)"] ||
              item["Hatırlatma Personeli"] ||
              "Atanmamış"
          )
        )
      ),
      uniqueOffices: Array.from(
        new Set(takipteData.map((item: any) => item["Ofis"] || "Ana Ofis"))
      ),
      uniqueKritler: Array.from(
        new Set(
          takipteData.map(
            (item: any) =>
              item["Kriter"] ||
              item["İrtibat Müşteri Kaynağı"] ||
              "Belirtilmemiş"
          )
        )
      ),
    };
  }, [takipteData, selectedPersonnel, selectedOffice, selectedKriter, hasData]);

  // Add missing utility functions from the moved section
  const getStandardColor = (type: string, name: string) => {
    if (type === "OFFICE") {
      return getColor("OFFICE", name);
    }
    return getColor("STATUS", name);
  };

  if (takipteLoading) return <div>Yükleniyor...</div>;

  if (!hasData) {
    return (
      <div className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>⚠️ Takip Verisi Bulunamadı:</strong> Takipte analizi için
            ikinci dosyayı (Takip dosyası) yüklemeniz gerekiyor.
            <br />
            <span className="text-sm mt-2 block">
              Bu dosya Kriter, İrtibat Müşteri Kaynağı, Görüşme Tipi, Hatırlatma
              bilgileri, Konuşma Süresi ve Son Sonuç kolonlarını içermelidir.
            </span>
          </AlertDescription>
        </Alert>

        <Card className="text-center py-8">
          <CardContent>
            <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Takip Verisi Bekleniyor
            </h3>
            <p className="text-gray-600 mb-4">
              Detaylı takip analizi için ikinci dosyayı Akıllı Veri Girişi
              sekmesinden yükleyin.
            </p>
            <div className="text-sm text-gray-500">
              Desteklenen format: Excel (.xlsx), CSV (.csv), JSON (.json)
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Remove the old hardcoded colors - now using smart color assignment in data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            📞 Unified Takip Analizi
          </h2>
          <p className="text-gray-600 mt-1">
            Takipte analizi ve takip raporu birleşik görünümü
          </p>
        </div>

        <div className="flex gap-2">
          <Badge variant="outline">
            📊 {analytics?.totalRecords || 0} Kayıt
          </Badge>
          <Badge variant="outline">
            ⏱️ {analytics?.averageResponseTime || 0} dk ort.
          </Badge>
          <Badge variant="outline">
            🔔 {analytics?.reminderStats.percentage || 0}% Hatırlatmalı
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Phone className="mr-2 h-4 w-4" />
              Toplam Takip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalRecords || 0}
            </div>
            <p className="text-blue-100 text-xs">Aktif takip kaydı</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Ortalama Süre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageResponseTime || 0} gün
            </div>
            <p className="text-green-100 text-xs">Ortalama yanıt süresi</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Hatırlatmalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.reminderStats.total || 0}
            </div>
            <p className="text-orange-100 text-xs">
              {analytics?.reminderStats.overdue || 0} gecikmiş
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Star className="mr-2 h-4 w-4" />
              Son Hatırlatma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.reminderStats.final || 0}
            </div>
            <p className="text-purple-100 text-xs">Final aşamasında</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <DateFilter
            onFilterChange={setDateFilters}
            initialFilters={dateFilters}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg h-full">
            <div className="flex gap-2">
              <Select
                value={selectedPersonnel}
                onValueChange={setSelectedPersonnel}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Personel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Personel</SelectItem>
                  {analytics?.uniquePersonnel
                    .filter((person: any) => person && String(person).trim())
                    .map((person: any) => (
                      <SelectItem key={String(person)} value={String(person)}>
                        {String(person)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ofis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Ofisler</SelectItem>
                  {analytics?.uniqueOffices
                    .filter((office: any) => office && String(office).trim())
                    .map((office: any) => (
                      <SelectItem key={String(office)} value={String(office)}>
                        {String(office)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={selectedKriter} onValueChange={setSelectedKriter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Kriter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kriterler</SelectItem>
                  {analytics?.uniqueKritler
                    .filter((kriter: any) => kriter && String(kriter).trim())
                    .map((kriter: any) => (
                      <SelectItem key={String(kriter)} value={String(kriter)}>
                        {String(kriter)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select
                value={chartType}
                onValueChange={(value: "pie" | "bar" | "line") =>
                  setChartType(value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Grafik Tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">Pasta Grafik</SelectItem>
                  <SelectItem value="bar">Sütun Grafik</SelectItem>
                  <SelectItem value="line">Çizgi Grafik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="kriter" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="kriter">Müşteri Kriterleri</TabsTrigger>
          <TabsTrigger value="sources">Kaynak Analizi</TabsTrigger>
          <TabsTrigger value="meetings">Görüşme Analizi</TabsTrigger>
          <TabsTrigger value="advanced-charts">📋 Ana Veri Tablosu</TabsTrigger>
          <TabsTrigger value="personnel">Müşteri Analizi</TabsTrigger>
        </TabsList>

        <TabsContent value="kriter" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Müşteri Kriter Dağılımı</CardTitle>
                <CardDescription>Satış vs Kira müşteri analizi</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.kriterData && (
                  <>
                    <InteractiveChart
                      title="Kriter Dağılımı"
                      data={analytics.kriterData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      chartType={chartType}
                      height={300}
                      colors={analytics.kriterData.map((item) => item.color)}
                    />
                    <DataTable
                      title="Müşteri Kriter Dağılımı"
                      data={analytics.kriterData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      totalRecords={analytics.totalRecords}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ofis Performansı</CardTitle>
                <CardDescription>Şube bazlı aktivite dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.officeData && (
                  <>
                    <InteractiveChart
                      title="Ofis Dağılımı"
                      data={analytics.officeData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      chartType={chartType}
                      height={300}
                      colors={analytics.officeData.map((item) => item.color)}
                    />
                    <DataTable
                      title="Ofis Performansı"
                      data={analytics.officeData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      totalRecords={analytics.totalRecords}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>İrtibat Müşteri Kaynağı</CardTitle>
                <CardDescription>
                  Instagram, Facebook, Referans, vb.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.sourceData && (
                  <>
                    <InteractiveChart
                      title="Kaynak Dağılımı"
                      data={analytics.sourceData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      chartType={chartType}
                      height={300}
                      colors={analytics.sourceData.map((item) => item.color)}
                    />
                    <DataTable
                      title="İrtibat Müşteri Kaynağı"
                      data={analytics.sourceData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      totalRecords={analytics.totalRecords}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meslek Dağılımı</CardTitle>
                <CardDescription>Müşteri meslek analizi</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.professionData && (
                  <>
                    <InteractiveChart
                      title="Meslek Dağılımı"
                      data={analytics.professionData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      chartType={chartType}
                      height={300}
                      colors={analytics.professionData.map(
                        (item) => item.color
                      )}
                    />
                    <DataTable
                      title="Meslek Dağılımı"
                      data={analytics.professionData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      totalRecords={analytics.totalRecords}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Görüşme Tipi Dağılımı</CardTitle>
                <CardDescription>
                  Giden/Gelen arama, Kendisi geldi, vb.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.meetingTypeData && (
                  <>
                    <InteractiveChart
                      title="Görüşme Tipleri"
                      data={analytics.meetingTypeData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      chartType={chartType}
                      height={300}
                      colors={analytics.meetingTypeData.map(
                        (item) => item.color
                      )}
                    />
                    <DataTable
                      title="Görüşme Tipi Dağılımı"
                      data={analytics.meetingTypeData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      totalRecords={analytics.totalRecords}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Son Sonuç Analizi</CardTitle>
                <CardDescription>Takip sonuçlarının dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.resultData && (
                  <>
                    <InteractiveChart
                      title="Sonuç Dağılımı"
                      data={analytics.resultData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      chartType={chartType}
                      height={300}
                      colors={analytics.resultData.map((item) => item.color)}
                    />
                    <DataTable
                      title="Son Sonuç Analizi"
                      data={analytics.resultData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      totalRecords={analytics.totalRecords}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced-charts" className="space-y-4">
          {/* Advanced Takipte Records Analytics Chart */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                📋 Tüm Takipte Kayıtları - Ana Veri Tablosu
              </CardTitle>
              <CardDescription>
                Takipte verilerinin gelişmiş analizi ve görselleştirmesi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Chart Type Selector */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Select
                      value={chartType}
                      onValueChange={(value: "pie" | "bar" | "line") =>
                        setChartType(value)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pie">Pasta Grafik</SelectItem>
                        <SelectItem value="bar">Çubuk Grafik</SelectItem>
                        <SelectItem value="line">Çizgi Grafik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    {analytics?.totalRecords || 0} Takipte Kaydı
                  </Badge>
                </div>

                {/* Advanced Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer Source Analysis */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg">
                    {chartType === "pie" ? (
                      <ThreeDPie
                        title="📱 Müşteri Kaynak Analizi"
                        labels={
                          analytics?.sourceData.map((item) => item.name) || []
                        }
                        counts={
                          analytics?.sourceData.map((item) =>
                            Number(item.value)
                          ) || []
                        }
                        colors={
                          analytics?.sourceData.map((item) => item.color) || []
                        }
                        className="three-d-pie-container"
                      />
                    ) : (
                      <>
                        <h4 className="text-lg font-semibold mb-3 text-blue-800">
                          📱 Müşteri Kaynak Analizi
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics?.sourceData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3B82F6" />
                          </BarChart>
                        </ResponsiveContainer>
                        <DataTable
                          data={
                            analytics?.sourceData.map((item) => ({
                              Kaynak: item.name,
                              Adet: Number(item.value),
                              Yüzde: `%${item.percentage}`,
                            })) || []
                          }
                          title="Kaynak Detayları"
                          className="mt-4"
                        />
                      </>
                    )}
                  </div>

                  {/* Meeting Type Distribution */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4 rounded-lg">
                    {chartType === "pie" ? (
                      <ThreeDPie
                        title="🤝 Görüşme Tipi Dağılımı"
                        labels={
                          analytics?.meetingTypeData.map((item) => item.name) ||
                          []
                        }
                        counts={
                          analytics?.meetingTypeData.map((item) =>
                            Number(item.value)
                          ) || []
                        }
                        colors={[
                          "#8B5CF6", // Purple
                          "#EC4899", // Pink
                          "#06B6D4", // Cyan
                          "#10B981", // Emerald
                          "#F59E0B", // Amber
                          "#EF4444", // Red
                          "#6366F1", // Indigo
                          "#84CC16", // Lime
                        ]}
                        className="three-d-pie-container"
                      />
                    ) : (
                      <>
                        <h4 className="text-lg font-semibold mb-3 text-purple-800">
                          🤝 Görüşme Tipi Dağılımı
                        </h4>
                        <div className="mb-4">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics?.meetingTypeData || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#8B5CF6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <DataTable
                          data={
                            analytics?.meetingTypeData.map((item) => ({
                              "Görüşme Tipi": item.name,
                              Adet: Number(item.value),
                              Yüzde: `%${item.percentage}`,
                            })) || []
                          }
                          title="Görüşme Detayları"
                          className="mt-4"
                        />
                      </>
                    )}
                  </div>

                  {/* Office Performance */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3 text-green-800">
                      🏢 Ofis Performansı
                    </h4>
                    <div className="mb-4">
                      <ResponsiveContainer width="100%" height={300}>
                        {chartType === "pie" ? (
                          <PieChart>
                            <Pie
                              data={analytics?.officeData || []}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) =>
                                `${name}: %${percentage}`
                              }
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {(analytics?.officeData || []).map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={getStandardColor(
                                      "OFFICE",
                                      entry.name
                                    )}
                                  />
                                )
                              )}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        ) : (
                          <BarChart data={analytics?.officeData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#10B981" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    <DataTable
                      data={
                        analytics?.officeData.map((item) => ({
                          Ofis: item.name,
                          Adet: Number(item.value),
                          Yüzde: `%${item.percentage}`,
                        })) || []
                      }
                      title="Ofis Detayları"
                      className="mt-4"
                    />
                  </div>

                  {/* Customer Criteria Analysis */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-100 p-4 rounded-lg">
                    {chartType === "pie" ? (
                      <ThreeDPie
                        title="🎯 Müşteri Kriterleri (Satış vs Kira)"
                        labels={
                          analytics?.kriterData.map((item) => item.name) || []
                        }
                        counts={
                          analytics?.kriterData.map((item) =>
                            Number(item.value)
                          ) || []
                        }
                        colors={[
                          "#3b82f6", // Blue for Satış
                          "#ef4444", // Red for Kira
                          "#10b981", // Green
                          "#f59e0b", // Amber
                          "#8b5cf6", // Purple
                          "#ec4899", // Pink
                        ]}
                        className="three-d-pie-container"
                      />
                    ) : (
                      <>
                        <h4 className="text-lg font-semibold mb-3 text-orange-800">
                          🎯 Müşteri Kriterleri (Satış vs Kira)
                        </h4>
                        <div className="mb-4">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics?.kriterData || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#F59E0B" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <DataTable
                          data={
                            analytics?.kriterData.map((item) => ({
                              Kriter: item.name,
                              Adet: Number(item.value),
                              Yüzde: `%${item.percentage}`,
                            })) || []
                          }
                          title="Kriter Detayları"
                          className="mt-4"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Master Data Table for Takipte Records */}
                <MasterDataTable
                  title="📋 Ana Veri Tablosu - Tüm Takipte Kayıtları"
                  data={takipteData}
                  columns={[
                    {
                      key: "Müşteri Adı Soyadı(203)",
                      label: "Müşteri Adı",
                      type: "text",
                    },
                    { key: "Tarih", label: "Tarih", type: "date" },
                    {
                      key: "Personel Adı(203)",
                      label: "Personel",
                      type: "personnel",
                    },
                    { key: "Ofis", label: "Ofis", type: "badge" },
                    { key: "Kriter", label: "Kriter", type: "badge" },
                    {
                      key: "İrtibat Müşteri Kaynağı",
                      label: "Kaynak",
                      type: "text",
                    },
                    {
                      key: "Görüşme Tipi",
                      label: "Görüşme Tipi",
                      type: "text",
                    },
                    {
                      key: "Son Sonuç Adı",
                      label: "Son Sonuç",
                      type: "status",
                    },
                    {
                      key: "Hatırlatma Var Mı",
                      label: "Hatırlatma",
                      type: "badge",
                    },
                    {
                      key: "Hatırlatma Tarihi",
                      label: "Hatırlatma Tarihi",
                      type: "date",
                    },
                    { key: "Puan", label: "Puan", type: "number" },
                    { key: "Meslek Adı", label: "Meslek", type: "text" },
                    { key: "Cep Tel", label: "Telefon", type: "text" },
                    { key: "Email", label: "Email", type: "text" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Müşteri Takip Analizi Karşılaştırması</CardTitle>
                <CardDescription>
                  Müşteri segmentleri arasında takip aktivite analizi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.personnelData && (
                  <>
                    <InteractiveChart
                      title="Müşteri Performans Karşılaştırması"
                      data={analytics.personnelData.map((item) => ({
                        ...item,
                        value: Number(item.value),
                      }))}
                      chartType={chartType}
                      height={400}
                      colors={analytics.personnelData.map((item) => item.color)}
                    />
                    <div className="mt-4 space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700">
                        Müşteri Analiz Metrikleri:
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-medium">
                            En Aktif Kategori:
                          </span>{" "}
                          {analytics.personnelData[0]?.name || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Toplam Takip:</span>{" "}
                          {analytics.personnelData.reduce(
                            (sum, p) => sum + Number(p.value),
                            0
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detaylı Müşteri Analiz Tablosu</CardTitle>
                <CardDescription>
                  Müşteri bazlı takip sayıları ve yüzdeleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.personnelData && (
                  <DataTable
                    title="Müşteri Performans Detayları"
                    data={analytics.personnelData.map((item) => ({
                      ...item,
                      value: Number(item.value),
                    }))}
                    totalRecords={analytics.totalRecords}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Advanced Personnel Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Gelişmiş Müşteri Performans Analizi</CardTitle>
              <CardDescription>
                Müşteri bazlı takip kalitesi ve verimlilik analizi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Performance Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analytics?.personnelData.slice(0, 3).map((person, index) => (
                    <Card
                      key={person.name}
                      className={`relative ${
                        index === 0
                          ? "bg-gradient-to-r from-green-50 to-green-100"
                          : index === 1
                          ? "bg-gradient-to-r from-blue-50 to-blue-100"
                          : "bg-gradient-to-r from-orange-50 to-orange-100"
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">
                            {person.name}
                          </CardTitle>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              🥇 En Yüksek
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-gray-900">
                            {Number(person.value)}
                          </div>
                          <div className="text-xs text-gray-600">
                            Takip Sayısı
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Oran: </span>
                            <span className="text-lg font-bold">
                              {person.percentage}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Toplam Kategori
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics?.personnelData.length || 0}
                      </div>
                      <p className="text-purple-100 text-xs">
                        Aktif kategori sayısı
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Ortalama Takip
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics?.personnelData.length
                          ? Math.round(
                              analytics.personnelData.reduce(
                                (sum, p) => sum + Number(p.value),
                                0
                              ) / analytics.personnelData.length
                            )
                          : 0}
                      </div>
                      <p className="text-indigo-100 text-xs">Kategori başına</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        En Yüksek
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Number(analytics?.personnelData[0]?.value) || 0}
                      </div>
                      <p className="text-teal-100 text-xs">En aktif kategori</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Verimlilik
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics?.personnelData.length &&
                        analytics.personnelData[0]?.value
                          ? Math.round(
                              (Number(analytics.personnelData[0].value) /
                                analytics.totalRecords) *
                                100
                            )
                          : 0}
                        %
                      </div>
                      <p className="text-pink-100 text-xs">En yüksek oran</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Master Data Table */}
      {hasData && (
        <MasterDataTable
          title="Tüm Takipte Kayıtları - Ana Veri Tablosu"
          data={takipteData}
          columns={[
            {
              key: "Müşteri Adı Soyadı(203)",
              label: "Müşteri Adı",
              type: "text",
            },
            { key: "Tarih", label: "Tarih", type: "date" },
            { key: "Personel Adı(203)", label: "Personel", type: "personnel" },
            { key: "Ofis", label: "Ofis", type: "badge" },
            { key: "Kriter", label: "Kriter", type: "badge" },
            { key: "İrtibat Müşteri Kaynağı", label: "Kaynak", type: "text" },
            { key: "Görüşme Tipi", label: "Görüşme Tipi", type: "text" },
            { key: "Son Sonuç Adı", label: "Son Sonuç", type: "status" },
            { key: "Hatırlatma Var Mı", label: "Hatırlatma", type: "badge" },
            {
              key: "Hatırlatma Tarihi",
              label: "Hatırlatma Tarihi",
              type: "date",
            },
            { key: "Puan", label: "Puan", type: "number" },
            { key: "Meslek Adı", label: "Meslek", type: "text" },
            { key: "Cep Tel", label: "Telefon", type: "text" },
            { key: "Email", label: "Email", type: "text" },
          ]}
        />
      )}

      {/* Summary Footer */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📈 Takip Analizi Özeti
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">
                  {analytics?.totalRecords || 0}
                </span>
                <br />
                Toplam Kayıt
              </div>
              <div>
                <span className="font-medium">
                  {analytics?.averageResponseTime || 0} dk
                </span>
                <br />
                Ortalama Süre
              </div>
              <div>
                <span className="font-medium">
                  {analytics?.reminderStats.percentage || 0}%
                </span>
                <br />
                Hatırlatmalı
              </div>
              <div>
                <span className="font-medium">
                  {analytics?.reminderStats.overdue || 0}
                </span>
                <br />
                Gecikmiş
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
