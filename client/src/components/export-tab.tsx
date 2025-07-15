import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Trash2,
  Calendar,
  Filter,
  Settings,
  BarChart3,
  PieChart,
  Users,
  Building,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface ExportSettings {
  title: string;
  company: string;
  includeCharts: boolean;
  includeSummary: boolean;
  includeDetails: boolean;
}

export default function ExportTab() {
  const { toast } = useToast();
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    title: "Aylık Lead Raporu",
    company: "",
    includeCharts: true,
    includeSummary: true,
    includeDetails: true,
  });

  const [dateFilters, setDateFilters] = useState({
    startDate: "",
    endDate: "",
    month: "",
    year: "",
    salesRep: "",
    leadType: "",
  });

  const [advancedExportSettings, setAdvancedExportSettings] = useState({
    reportType: "comprehensive", // 'comprehensive', 'leads-only', 'analytics-only', 'custom'
    dataScope: "all", // 'all', 'filtered', 'selected'
    includeCharts: true,
    includeAnalytics: true,
    includeRawData: true,
    personnelFilter: "all", // 'all', 'specific', 'multiple'
    selectedPersonnel: [] as string[],
    projectFilter: "all", // 'all', 'specific', 'multiple'
    selectedProjects: [] as string[],
    leadTypeFilter: "all", // 'all', 'satilik', 'kiralik'
    statusFilter: "all", // 'all', 'active', 'completed', 'custom'
    selectedStatuses: [] as string[],
    chartTypes: ["pie", "bar", "line"] as string[],
    customTitle: "",
    includeCompanyBranding: true,
    format: "excel" as "excel" | "pdf" | "json",
    // Section selection for comprehensive reports
    includedSections: {
      overviewDashboard: true, // 👥 Personel Atama ve Durum Özeti
      statusDistribution: true, // Lead Durum Dağılımı
      leadTypeDistribution: true, // Lead Tipi Dağılımı
      statusAnalysis: true, // Durum Analizi
      personnelPerformance: true, // Personel Performansı
      sourceAnalysis: true, // 🎯 Kaynak Analizi
      advancedAnalysis: true, // 🧠 Gelişmiş Analiz
      negativeAnalysis: true, // Olumsuz Analizi
      followUpAnalysis: true, // Unified Takip Analizi
      duplicateAnalysis: true, // Duplicate Analizi
    },
  });

  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false);

  const { data: salesReps = [] } = useQuery({
    queryKey: ["/api/sales-reps"],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
  });

  // Extract unique projects and statuses from leads
  const uniqueProjects = [
    ...new Set(leads.map((lead: any) => lead.projectName).filter(Boolean)),
  ];
  const uniqueStatuses = [
    ...new Set(leads.map((lead: any) => lead.status).filter(Boolean)),
  ];

  const { data: stats } = useQuery({
    queryKey: ["/api/stats", dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/stats?${params.toString()}`);
      return response.json();
    },
  });

  const [recentExports] = useState([
    {
      id: 1,
      filename: "Kasım_2024_Lead_Raporu.xlsx",
      format: "Excel",
      date: "15.11.2024 14:30",
      size: "2.4 MB",
    },
    {
      id: 2,
      filename: "Ekim_2024_Lead_Raporu.pdf",
      format: "PDF",
      date: "01.11.2024 09:15",
      size: "1.8 MB",
    },
  ]);

  const clearFilters = () => {
    setDateFilters({
      startDate: "",
      endDate: "",
      month: "",
      year: "",
      salesRep: "",
      leadType: "",
    });
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/export/excel?${params.toString()}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lead-raporu-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Başarılı",
        description: "Excel raporu başarıyla indirildi.",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Excel raporu indirilemedi.",
        variant: "destructive",
      });
    }
  };

  const handleAdvancedExport = async () => {
    try {
      // Build comprehensive filter parameters
      const params = new URLSearchParams();

      // Add date filters
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      // Add advanced filters
      if (advancedExportSettings.personnelFilter !== "all") {
        if (advancedExportSettings.selectedPersonnel.length > 0) {
          params.append(
            "salesRep",
            advancedExportSettings.selectedPersonnel.join(",")
          );
        }
      }

      if (advancedExportSettings.leadTypeFilter !== "all") {
        params.append("leadType", advancedExportSettings.leadTypeFilter);
      }

      if (
        advancedExportSettings.selectedProjects.length > 0 &&
        advancedExportSettings.projectFilter !== "all"
      ) {
        params.append(
          "projects",
          advancedExportSettings.selectedProjects.join(",")
        );
      }

      if (
        advancedExportSettings.selectedStatuses.length > 0 &&
        advancedExportSettings.statusFilter !== "all"
      ) {
        params.append(
          "statuses",
          advancedExportSettings.selectedStatuses.join(",")
        );
      }

      // Add report configuration
      params.append("reportType", advancedExportSettings.reportType);
      params.append(
        "includeCharts",
        advancedExportSettings.includeCharts.toString()
      );
      params.append(
        "includeAnalytics",
        advancedExportSettings.includeAnalytics.toString()
      );
      params.append(
        "includeRawData",
        advancedExportSettings.includeRawData.toString()
      );
      params.append(
        "customTitle",
        advancedExportSettings.customTitle || "İNNO Gayrimenkul Lead Raporu"
      );

      if (advancedExportSettings.format === "excel") {
        const response = await fetch(`/api/export/excel?${params.toString()}`);
        if (!response.ok) throw new Error("Excel export failed");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `İNNO_Kapsamlı_Lead_Raporu_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (advancedExportSettings.format === "pdf") {
        await handleAdvancedPDFExport(params);
      } else if (advancedExportSettings.format === "json") {
        const response = await fetch(`/api/export/json?${params.toString()}`);
        if (!response.ok) throw new Error("JSON export failed");

        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `İNNO_Kapsamlı_Lead_Raporu_${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      setShowAdvancedDialog(false);
      toast({
        title: "Başarılı",
        description: `Kapsamlı ${advancedExportSettings.format.toUpperCase()} raporu başarıyla indirildi.`,
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Rapor oluşturulamadı: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const captureChartsFromAllTabs = async () => {
    const capturedCharts: Array<{
      title: string;
      image: string;
      section: string;
    }> = [];
    const sections = advancedExportSettings.includedSections;

    // Helper function to capture chart from canvas with enhanced detection
    const captureChart = (
      canvas: HTMLCanvasElement,
      sectionName: string,
      chartTitle?: string
    ) => {
      try {
        if (
          canvas.width > 0 &&
          canvas.height > 0 &&
          canvas.offsetParent !== null
        ) {
          const imageData = canvas.toDataURL("image/png", 1.0);
          const title =
            chartTitle || getChartTitle(canvas) || `${sectionName} Chart`;
          capturedCharts.push({
            title,
            image: imageData,
            section: sectionName,
          });
          return true;
        }
      } catch (error) {
        console.warn(`Failed to capture chart from ${sectionName}:`, error);
      }
      return false;
    };

    // Helper to get chart title from various container patterns
    const getChartTitle = (canvas: HTMLCanvasElement): string => {
      const container =
        canvas.closest(
          ".card, .chart-container, [data-chart], .recharts-wrapper"
        ) || canvas.parentElement;
      const titleElement = container?.querySelector(
        "h1, h2, h3, h4, h5, h6, .chart-title, .card-title"
      );
      return titleElement?.textContent?.trim() || "";
    };

    // Capture charts from each section if included
    if (sections.overviewDashboard) {
      document
        .querySelectorAll(
          '[data-tab="overview"] canvas, [data-testid="overview"] canvas'
        )
        .forEach((canvas) => {
          captureChart(
            canvas as HTMLCanvasElement,
            "Personel Atama ve Durum Özeti"
          );
        });
    }

    if (sections.statusDistribution) {
      document
        .querySelectorAll('[data-chart="status"] canvas, .status-chart canvas')
        .forEach((canvas) => {
          captureChart(canvas as HTMLCanvasElement, "Lead Durum Dağılımı");
        });
    }

    if (sections.leadTypeDistribution) {
      document
        .querySelectorAll(
          '[data-chart="leadtype"] canvas, .leadtype-chart canvas'
        )
        .forEach((canvas) => {
          captureChart(canvas as HTMLCanvasElement, "Lead Tipi Dağılımı");
        });
    }

    if (sections.statusAnalysis) {
      document
        .querySelectorAll('[data-tab="status-analysis"] canvas')
        .forEach((canvas) => {
          captureChart(canvas as HTMLCanvasElement, "Durum Analizi");
        });
    }

    if (sections.personnelPerformance) {
      document
        .querySelectorAll('[data-tab="personnel"] canvas')
        .forEach((canvas) => {
          captureChart(canvas as HTMLCanvasElement, "Personel Performansı");
        });
    }

    if (sections.sourceAnalysis) {
      document
        .querySelectorAll('[data-tab="source"] canvas')
        .forEach((canvas) => {
          captureChart(canvas as HTMLCanvasElement, "Kaynak Analizi");
        });
    }

    if (sections.negativeAnalysis) {
      document
        .querySelectorAll('[data-tab="negative"] canvas')
        .forEach((canvas) => {
          captureChart(canvas as HTMLCanvasElement, "Olumsuz Analizi");
        });
    }

    if (sections.followUpAnalysis) {
      document
        .querySelectorAll('[data-tab="followup"] canvas')
        .forEach((canvas) => {
          captureChart(canvas as HTMLCanvasElement, "Unified Takip Analizi");
        });
    }

    if (sections.duplicateAnalysis) {
      document
        .querySelectorAll('[data-tab="duplicate"] canvas')
        .forEach((canvas) => {
          captureChart(canvas as HTMLCanvasElement, "Duplicate Analizi");
        });
    }

    // Fallback: capture any visible charts if none found in specific sections
    if (capturedCharts.length === 0) {
      document.querySelectorAll("canvas").forEach((canvas) => {
        if (
          canvas.offsetParent !== null &&
          canvas.width > 0 &&
          canvas.height > 0
        ) {
          captureChart(canvas as HTMLCanvasElement, "General Charts");
        }
      });
    }

    return capturedCharts;
  };

  const handleAdvancedPDFExport = async (params: URLSearchParams) => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    // Get filtered data from JSON endpoint
    const response = await fetch(`/api/export/json?${params.toString()}`);
    if (!response.ok) throw new Error("PDF data fetch failed");

    const data = await response.json();

    // Capture all charts from selected sections
    const capturedCharts = advancedExportSettings.includeCharts
      ? await captureChartsFromAllTabs()
      : [];

    // Create PDF document with landscape orientation for better chart display
    const doc = new jsPDF("landscape", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Enhanced header with company branding
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("İNNO Gayrimenkul Yatırım A.Ş.", pageWidth / 2, 20, {
      align: "center",
    });

    doc.setFontSize(16);
    doc.text(
      advancedExportSettings.customTitle || "Kapsamlı Lead Raporu",
      pageWidth / 2,
      30,
      { align: "center" }
    );

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Export Date: ${new Date().toLocaleDateString("tr-TR")}`,
      pageWidth / 2,
      40,
      { align: "center" }
    );
    doc.text(
      `Total Leads: ${data.totalLeads || data.leads?.length || 0}`,
      pageWidth / 2,
      50,
      { align: "center" }
    );

    if (capturedCharts.length > 0) {
      doc.text(`Charts Included: ${capturedCharts.length}`, pageWidth / 2, 60, {
        align: "center",
      });
    }

    let yPosition = 80;

    // Add captured charts organized by section
    if (capturedCharts.length > 0) {
      const sections = [
        ...new Set(capturedCharts.map((chart) => chart.section)),
      ];

      for (const section of sections) {
        const sectionCharts = capturedCharts.filter(
          (chart) => chart.section === section
        );

        // Add section header
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(section, 20, yPosition);
        yPosition += 15;

        // Add charts for this section
        for (const chart of sectionCharts) {
          if (yPosition > pageHeight - 120) {
            doc.addPage();
            yPosition = 20;
          }

          // Add chart title
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(chart.title, 20, yPosition);
          yPosition += 10;

          // Calculate chart dimensions maintaining aspect ratio
          const maxWidth = pageWidth - 40;
          const maxHeight = 100;

          // Add chart image
          doc.addImage(
            chart.image,
            "PNG",
            20,
            yPosition,
            maxWidth * 0.6,
            maxHeight * 0.8
          );
          yPosition += maxHeight + 10;
        }

        yPosition += 10; // Extra space between sections
      }
    }

    // Add analytics summary
    if (advancedExportSettings.includeAnalytics && data.analytics) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Analytics Summary", 20, yPosition);
      yPosition += 15;

      // Status breakdown table
      if (data.analytics.statusBreakdown) {
        const statusData = Object.entries(data.analytics.statusBreakdown).map(
          ([status, count]) => [
            status,
            count.toString(),
            `${(((count as number) / data.totalLeads) * 100).toFixed(1)}%`,
          ]
        );

        autoTable(doc, {
          head: [["Status", "Count", "Percentage"]],
          body: statusData,
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [52, 73, 94] },
          margin: { left: 20, right: 20 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }
    }

    // Add lead data table if requested
    if (
      advancedExportSettings.includeRawData &&
      data.leads &&
      data.leads.length > 0
    ) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Lead Data", 20, yPosition);
      yPosition += 10;

      // Show up to 100 leads to avoid excessive pages
      const tableData = data.leads
        .slice(0, 100)
        .map((lead: any) => [
          lead.customerName || "",
          lead.assignedPersonnel || "",
          lead.status || "",
          lead.leadType === "kiralik" ? "Kiralık" : "Satış",
          lead.projectName || "",
          lead.requestDate || "",
        ]);

      autoTable(doc, {
        head: [["Müşteri Adı", "Personel", "Durum", "Tip", "Proje", "Tarih"]],
        body: tableData,
        startY: yPosition,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 40 },
          5: { cellWidth: 30 },
        },
      });
    }

    // Save PDF with proper filename
    const fileName = `İNNO_Kapsamlı_Lead_Raporu_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);
  };

  const handleExportPDF = async () => {
    try {
      // Import jsPDF and autoTable dynamically
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      // Get data for PDF
      const response = await fetch(`/api/export/pdf?${params.toString()}`);
      if (!response.ok) throw new Error("PDF data fetch failed");

      const data = await response.json();
      const leads = data.data.leads;

      // Create PDF document
      const doc = new jsPDF();

      // Add company header
      doc.setFontSize(20);
      doc.text("İNNO Gayrimenkul Yatırım A.Ş.", 20, 20);
      doc.setFontSize(16);
      doc.text("Lead Raporu", 20, 30);
      doc.setFontSize(12);
      doc.text(
        `Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}`,
        20,
        40
      );
      doc.text(`Toplam Lead Sayısı: ${leads.length}`, 20, 50);

      // Create table data
      const tableData = leads.map((lead: any) => [
        lead.customerName || "",
        lead.assignedPersonnel || "",
        lead.status || "",
        lead.leadType || "",
        lead.projectName || "",
        lead.requestDate || "",
      ]);

      // Add table using autoTable
      autoTable(doc, {
        head: [["Müşteri Adı", "Personel", "Durum", "Tip", "Proje", "Tarih"]],
        body: tableData,
        startY: 60,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
        },
      });

      // Save PDF
      doc.save(
        `İNNO_Lead_Raporu_${new Date().toISOString().split("T")[0]}.pdf`
      );

      toast({
        title: "Başarılı",
        description: "PDF raporu başarıyla indirildi.",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "PDF raporu oluşturulamadı: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleExportJSON = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/export/json?${params.toString()}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lead-raporu-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Başarılı",
        description: "Kapsamlı JSON raporu başarıyla indirildi.",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "JSON verisi indirilemedi.",
        variant: "destructive",
      });
    }
  };

  const handleSettingChange = (
    key: keyof ExportSettings,
    value: string | boolean
  ) => {
    setExportSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Date Filtering and Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Rapor Filtreleme ve Dışa Aktarma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
            <div className="space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={dateFilters.startDate}
                onChange={(e) =>
                  setDateFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                    month: "",
                    year: "",
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Bitiş Tarihi</Label>
              <Input
                type="date"
                value={dateFilters.endDate}
                onChange={(e) =>
                  setDateFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                    month: "",
                    year: "",
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Ay Seçimi</Label>
              <Select
                value={dateFilters.month}
                onValueChange={(month) =>
                  setDateFilters((prev) => ({
                    ...prev,
                    month,
                    year: prev.year || "2025",
                    startDate: "",
                    endDate: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ay seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ocak</SelectItem>
                  <SelectItem value="2">Şubat</SelectItem>
                  <SelectItem value="3">Mart</SelectItem>
                  <SelectItem value="4">Nisan</SelectItem>
                  <SelectItem value="5">Mayıs</SelectItem>
                  <SelectItem value="6">Haziran</SelectItem>
                  <SelectItem value="7">Temmuz</SelectItem>
                  <SelectItem value="8">Ağustos</SelectItem>
                  <SelectItem value="9">Eylül</SelectItem>
                  <SelectItem value="10">Ekim</SelectItem>
                  <SelectItem value="11">Kasım</SelectItem>
                  <SelectItem value="12">Aralık</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Personel</Label>
              <Select
                value={dateFilters.salesRep}
                onValueChange={(salesRep) =>
                  setDateFilters((prev) => ({ ...prev, salesRep }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {salesReps.map((rep: any) => (
                    <SelectItem key={rep.id} value={rep.name}>
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={clearFilters} variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Temizle
              </Button>
            </div>
          </div>

          {/* Export Statistics Summary */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalLeads}
                </div>
                <div className="text-sm text-muted-foreground">Toplam Lead</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.byStatusWithPercentages?.find((s: any) =>
                    s.status.toLowerCase().includes("satış")
                  )?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Satışlar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.byStatusWithPercentages?.find((s: any) =>
                    s.status.toLowerCase().includes("takip")
                  )?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Takipte</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.byStatusWithPercentages?.find((s: any) =>
                    s.status.toLowerCase().includes("olumsuz")
                  )?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Olumsuz</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dışa Aktarma Seçenekleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export Options */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">
                Dışa Aktarma Seçenekleri
              </h3>
              <div className="space-y-4">
                {/* Advanced Export Dialog */}
                <div className="border border-purple-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-8 w-8 text-purple-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">
                          🎯 Kapsamlı Rapor İndirme
                        </h4>
                        <p className="text-sm text-gray-600">
                          Personel, proje ve duruma göre özelleştirilebilir
                          rapor
                        </p>
                      </div>
                    </div>
                    <Dialog
                      open={showAdvancedDialog}
                      onOpenChange={setShowAdvancedDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          <Settings className="h-4 w-4 mr-2" />
                          Kapsamlı İndir
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            🎯 Kapsamlı Rapor İndirme Seçenekleri
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                          {/* Report Type Selection */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium">
                              Rapor Türü
                            </Label>
                            <RadioGroup
                              value={advancedExportSettings.reportType}
                              onValueChange={(value) =>
                                setAdvancedExportSettings((prev) => ({
                                  ...prev,
                                  reportType: value,
                                }))
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="comprehensive"
                                  id="comprehensive"
                                />
                                <Label htmlFor="comprehensive">
                                  📊 Kapsamlı Rapor (Veriler + Grafikler +
                                  Analizler)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="leads-only"
                                  id="leads-only"
                                />
                                <Label htmlFor="leads-only">
                                  📋 Sadece Lead Verileri
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="analytics-only"
                                  id="analytics-only"
                                />
                                <Label htmlFor="analytics-only">
                                  📈 Sadece Analitik Rapor
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <Separator />

                          {/* Personnel Filter */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Personel Seçimi
                            </Label>
                            <Select
                              value={advancedExportSettings.personnelFilter}
                              onValueChange={(value) =>
                                setAdvancedExportSettings((prev) => ({
                                  ...prev,
                                  personnelFilter: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Personel seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  👥 Tüm Personel
                                </SelectItem>
                                <SelectItem value="multiple">
                                  👤 Seçili Personel
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {advancedExportSettings.personnelFilter ===
                              "multiple" && (
                              <div className="mt-3 space-y-2">
                                <Label className="text-sm">
                                  Personel Seçin:
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {salesReps.map((rep: any) => (
                                    <div
                                      key={rep.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <Checkbox
                                        id={`personnel-${rep.id}`}
                                        checked={advancedExportSettings.selectedPersonnel.includes(
                                          rep.name
                                        )}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setAdvancedExportSettings(
                                              (prev) => ({
                                                ...prev,
                                                selectedPersonnel: [
                                                  ...prev.selectedPersonnel,
                                                  rep.name,
                                                ],
                                              })
                                            );
                                          } else {
                                            setAdvancedExportSettings(
                                              (prev) => ({
                                                ...prev,
                                                selectedPersonnel:
                                                  prev.selectedPersonnel.filter(
                                                    (p) => p !== rep.name
                                                  ),
                                              })
                                            );
                                          }
                                        }}
                                      />
                                      <Label
                                        htmlFor={`personnel-${rep.id}`}
                                        className="text-sm"
                                      >
                                        {rep.name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Project Filter */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Proje Seçimi
                            </Label>
                            <Select
                              value={advancedExportSettings.projectFilter}
                              onValueChange={(value) =>
                                setAdvancedExportSettings((prev) => ({
                                  ...prev,
                                  projectFilter: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Proje seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  🏢 Tüm Projeler
                                </SelectItem>
                                <SelectItem value="multiple">
                                  🎯 Seçili Projeler
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {advancedExportSettings.projectFilter ===
                              "multiple" && (
                              <div className="mt-3 space-y-2">
                                <Label className="text-sm">Proje Seçin:</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                  {uniqueProjects.map((project: string) => (
                                    <div
                                      key={project}
                                      className="flex items-center space-x-2"
                                    >
                                      <Checkbox
                                        id={`project-${project}`}
                                        checked={advancedExportSettings.selectedProjects.includes(
                                          project
                                        )}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setAdvancedExportSettings(
                                              (prev) => ({
                                                ...prev,
                                                selectedProjects: [
                                                  ...prev.selectedProjects,
                                                  project,
                                                ],
                                              })
                                            );
                                          } else {
                                            setAdvancedExportSettings(
                                              (prev) => ({
                                                ...prev,
                                                selectedProjects:
                                                  prev.selectedProjects.filter(
                                                    (p) => p !== project
                                                  ),
                                              })
                                            );
                                          }
                                        }}
                                      />
                                      <Label
                                        htmlFor={`project-${project}`}
                                        className="text-sm"
                                      >
                                        {project}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Lead Type Filter */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Lead Tipi
                            </Label>
                            <Select
                              value={advancedExportSettings.leadTypeFilter}
                              onValueChange={(value) =>
                                setAdvancedExportSettings((prev) => ({
                                  ...prev,
                                  leadTypeFilter: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Lead tipi seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">🔄 Tümü</SelectItem>
                                <SelectItem value="satis">
                                  🏷️ Sadece Satış
                                </SelectItem>
                                <SelectItem value="kiralik">
                                  🏠 Sadece Kiralık
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Separator />

                          {/* Status Filter */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Durum Seçimi
                            </Label>
                            <Select
                              value={advancedExportSettings.statusFilter}
                              onValueChange={(value) =>
                                setAdvancedExportSettings((prev) => ({
                                  ...prev,
                                  statusFilter: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Durum seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  📊 Tüm Durumlar
                                </SelectItem>
                                <SelectItem value="custom">
                                  🎯 Özel Seçim
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {advancedExportSettings.statusFilter ===
                              "custom" && (
                              <div className="mt-3 space-y-2">
                                <Label className="text-sm">Durum Seçin:</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                  {uniqueStatuses.map((status: string) => (
                                    <div
                                      key={status}
                                      className="flex items-center space-x-2"
                                    >
                                      <Checkbox
                                        id={`status-${status}`}
                                        checked={advancedExportSettings.selectedStatuses.includes(
                                          status
                                        )}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setAdvancedExportSettings(
                                              (prev) => ({
                                                ...prev,
                                                selectedStatuses: [
                                                  ...prev.selectedStatuses,
                                                  status,
                                                ],
                                              })
                                            );
                                          } else {
                                            setAdvancedExportSettings(
                                              (prev) => ({
                                                ...prev,
                                                selectedStatuses:
                                                  prev.selectedStatuses.filter(
                                                    (s) => s !== status
                                                  ),
                                              })
                                            );
                                          }
                                        }}
                                      />
                                      <Label
                                        htmlFor={`status-${status}`}
                                        className="text-sm"
                                      >
                                        {status}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Section Selection */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Rapor Bölümleri Seçimi
                            </Label>
                            <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="overviewDashboard"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .overviewDashboard
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        overviewDashboard: checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="overviewDashboard"
                                  className="text-sm"
                                >
                                  👥 Personel Atama ve Durum Özeti
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="statusDistribution"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .statusDistribution
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        statusDistribution: checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="statusDistribution"
                                  className="text-sm"
                                >
                                  📊 Lead Durum Dağılımı
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="leadTypeDistribution"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .leadTypeDistribution
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        leadTypeDistribution:
                                          checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="leadTypeDistribution"
                                  className="text-sm"
                                >
                                  🏠 Lead Tipi Dağılımı
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="statusAnalysis"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .statusAnalysis
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        statusAnalysis: checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="statusAnalysis"
                                  className="text-sm"
                                >
                                  📈 Durum Analizi
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="personnelPerformance"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .personnelPerformance
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        personnelPerformance:
                                          checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="personnelPerformance"
                                  className="text-sm"
                                >
                                  ⭐ Personel Performansı
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="sourceAnalysis"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .sourceAnalysis
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        sourceAnalysis: checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="sourceAnalysis"
                                  className="text-sm"
                                >
                                  🎯 Kaynak Analizi
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="advancedAnalysis"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .advancedAnalysis
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        advancedAnalysis: checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="advancedAnalysis"
                                  className="text-sm"
                                >
                                  🧠 Gelişmiş Analiz
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="negativeAnalysis"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .negativeAnalysis
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        negativeAnalysis: checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="negativeAnalysis"
                                  className="text-sm"
                                >
                                  ❌ Olumsuz Analizi
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="followUpAnalysis"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .followUpAnalysis
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        followUpAnalysis: checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="followUpAnalysis"
                                  className="text-sm"
                                >
                                  Unified Takip Analizi
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="duplicateAnalysis"
                                  checked={
                                    advancedExportSettings.includedSections
                                      .duplicateAnalysis
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includedSections: {
                                        ...prev.includedSections,
                                        duplicateAnalysis: checked as boolean,
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor="duplicateAnalysis"
                                  className="text-sm"
                                >
                                  🔍 Duplicate Analizi
                                </Label>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setAdvancedExportSettings((prev) => ({
                                    ...prev,
                                    includedSections: Object.keys(
                                      prev.includedSections
                                    ).reduce(
                                      (acc, key) => ({
                                        ...acc,
                                        [key]: true,
                                      }),
                                      {} as typeof prev.includedSections
                                    ),
                                  }))
                                }
                              >
                                Tümünü Seç
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setAdvancedExportSettings((prev) => ({
                                    ...prev,
                                    includedSections: Object.keys(
                                      prev.includedSections
                                    ).reduce(
                                      (acc, key) => ({
                                        ...acc,
                                        [key]: false,
                                      }),
                                      {} as typeof prev.includedSections
                                    ),
                                  }))
                                }
                              >
                                Hiçbirini Seçme
                              </Button>
                            </div>
                          </div>

                          <Separator />

                          {/* Report Options */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium">
                              Rapor İçeriği
                            </Label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="includeCharts"
                                  checked={advancedExportSettings.includeCharts}
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includeCharts: checked as boolean,
                                    }))
                                  }
                                />
                                <Label htmlFor="includeCharts">
                                  📊 Grafikler Dahil
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="includeAnalytics"
                                  checked={
                                    advancedExportSettings.includeAnalytics
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includeAnalytics: checked as boolean,
                                    }))
                                  }
                                />
                                <Label htmlFor="includeAnalytics">
                                  📈 Analitik Dahil
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="includeRawData"
                                  checked={
                                    advancedExportSettings.includeRawData
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includeRawData: checked as boolean,
                                    }))
                                  }
                                />
                                <Label htmlFor="includeRawData">
                                  📋 Ham Veriler Dahil
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="includeCompanyBranding"
                                  checked={
                                    advancedExportSettings.includeCompanyBranding
                                  }
                                  onCheckedChange={(checked) =>
                                    setAdvancedExportSettings((prev) => ({
                                      ...prev,
                                      includeCompanyBranding:
                                        checked as boolean,
                                    }))
                                  }
                                />
                                <Label htmlFor="includeCompanyBranding">
                                  🏢 Şirket Logosu
                                </Label>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Custom Title */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium">
                              Özel Rapor Başlığı
                            </Label>
                            <Input
                              placeholder="Örn: Aralık 2024 Kapsamlı Lead Raporu"
                              value={advancedExportSettings.customTitle}
                              onChange={(e) =>
                                setAdvancedExportSettings((prev) => ({
                                  ...prev,
                                  customTitle: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <Separator />

                          {/* Export Format */}
                          <div className="space-y-3">
                            <Label className="text-base font-medium">
                              Dosya Formatı
                            </Label>
                            <RadioGroup
                              value={advancedExportSettings.format}
                              onValueChange={(value) =>
                                setAdvancedExportSettings((prev) => ({
                                  ...prev,
                                  format: value as "excel" | "pdf" | "json",
                                }))
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="excel" id="excel" />
                                <Label htmlFor="excel">📊 Excel (.xlsx)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pdf" id="pdf" />
                                <Label htmlFor="pdf">📄 PDF (.pdf)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="json" id="json" />
                                <Label htmlFor="json">💾 JSON (.json)</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Summary */}
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-2">
                              Rapor Özeti
                            </h4>
                            <div className="text-sm text-blue-800 space-y-1">
                              <p>
                                • Rapor Türü:{" "}
                                {advancedExportSettings.reportType ===
                                "comprehensive"
                                  ? "Kapsamlı"
                                  : advancedExportSettings.reportType ===
                                    "leads-only"
                                  ? "Sadece Lead"
                                  : "Sadece Analitik"}
                              </p>
                              <p>
                                • Dahil Edilen Bölümler:{" "}
                                {
                                  Object.values(
                                    advancedExportSettings.includedSections
                                  ).filter(Boolean).length
                                }{" "}
                                /{" "}
                                {
                                  Object.keys(
                                    advancedExportSettings.includedSections
                                  ).length
                                }
                              </p>
                              <p>
                                • Personel:{" "}
                                {advancedExportSettings.personnelFilter ===
                                "all"
                                  ? "Tümü"
                                  : `${advancedExportSettings.selectedPersonnel.length} seçili`}
                              </p>
                              <p>
                                • Proje:{" "}
                                {advancedExportSettings.projectFilter === "all"
                                  ? "Tümü"
                                  : `${advancedExportSettings.selectedProjects.length} seçili`}
                              </p>
                              <p>
                                • Lead Tipi:{" "}
                                {advancedExportSettings.leadTypeFilter === "all"
                                  ? "Tümü"
                                  : advancedExportSettings.leadTypeFilter}
                              </p>
                              <p>
                                • Format:{" "}
                                {advancedExportSettings.format.toUpperCase()}
                              </p>
                              <p>
                                • Grafik Dahil:{" "}
                                {advancedExportSettings.includeCharts
                                  ? "Evet"
                                  : "Hayır"}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-3">
                            <Button
                              variant="outline"
                              onClick={() => setShowAdvancedDialog(false)}
                            >
                              İptal
                            </Button>
                            <Button
                              onClick={handleAdvancedExport}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Kapsamlı Raporu İndir
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Separator />

                {/* Quick Export Options */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Hızlı İndirme Seçenekleri
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-8 w-8 text-green-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">Excel</h4>
                            <p className="text-sm text-gray-600">
                              Basit Excel raporu
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleExportExcel}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-8 w-8 text-red-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">PDF</h4>
                            <p className="text-sm text-gray-600">
                              Basit PDF raporu
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleExportPDF}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileCode className="h-8 w-8 text-blue-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">JSON</h4>
                            <p className="text-sm text-gray-600">Ham veri</p>
                          </div>
                        </div>
                        <Button
                          onClick={handleExportJSON}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">
                Dışa Aktarma Ayarları
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportTitle">Rapor Başlığı</Label>
                  <Input
                    id="reportTitle"
                    value={exportSettings.title}
                    onChange={(e) =>
                      handleSettingChange("title", e.target.value)
                    }
                    placeholder="Aylık Lead Raporu"
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Şirket Adı</Label>
                  <Input
                    id="companyName"
                    value={exportSettings.company}
                    onChange={(e) =>
                      handleSettingChange("company", e.target.value)
                    }
                    placeholder="Şirket adını girin"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCharts"
                      checked={exportSettings.includeCharts}
                      onCheckedChange={(checked) =>
                        handleSettingChange("includeCharts", !!checked)
                      }
                    />
                    <Label htmlFor="includeCharts">Grafikleri dahil et</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSummary"
                      checked={exportSettings.includeSummary}
                      onCheckedChange={(checked) =>
                        handleSettingChange("includeSummary", !!checked)
                      }
                    />
                    <Label htmlFor="includeSummary">
                      Özet bilgileri dahil et
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeDetails"
                      checked={exportSettings.includeDetails}
                      onCheckedChange={(checked) =>
                        handleSettingChange("includeDetails", !!checked)
                      }
                    />
                    <Label htmlFor="includeDetails">
                      Detaylı veri tabloları
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle>Son Dışa Aktarılanlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dosya Adı</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Boyut</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentExports.length > 0 ? (
                recentExports.map((exportItem) => (
                  <TableRow key={exportItem.id}>
                    <TableCell>{exportItem.filename}</TableCell>
                    <TableCell>{exportItem.format}</TableCell>
                    <TableCell>{exportItem.date}</TableCell>
                    <TableCell>{exportItem.size}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    Henüz dışa aktarılmış dosya yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
