import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertCircle,
  FileText,
  Filter,
  Users,
  X,
  TrendingDown,
  Calculator
} from "lucide-react";
import NegativeReasonsSummaryTable from "./negative-reasons-summary-table";

// Types and interfaces for our analytics dashboard
interface NegativeAnalysisData {
  totalNegative: number;
  totalLeads: number;
  totalRevenue: number;
  estimatedLostRevenue: number;
  negativePercentage: number;
  reasonAnalysis: Array<{
    reason: string;
    count: number;
    percentage: number;
    trend: number; // -1, 0, or 1 for down, flat, up
    estimatedLostRevenue: number;
    diffFromLastPeriod: number;
    recoverabilityScore: number; // 1-5
    impactScore: number; // 1-5
  }>;
  personnelAnalysis: Array<{
    personnel: string;
    count: number;
    percentage: number;
    topReasons: string[];
    trend: number;
  }>;
  stageAnalysis: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  channelAnalysis: Array<{
    channel: string;
    count: number;
    percentage: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    count: number;
    percentage: number;
  }>;
  funnelData: Array<{
    stage: string;
    count: number;
    dropoff: number;
  }>;
  textAnalysis: {
    wordCloud: Array<{
      text: string;
      value: number;
    }>;
    clusters: Array<{
      theme: string;
      keywords: string[];
      count: number;
    }>;
    examples: Record<string, string[]>;
  };
  alerts: Array<{
    id: string;
    message: string;
    severity: "low" | "medium" | "high";
    type: "threshold" | "trend" | "anomaly";
  }>;
  forecast: {
    nextMonth: number;
    trend: "up" | "down" | "flat";
    confidence: number;
  };
}

interface Lead {
  "Müşteri ID": string;
  "İletişim ID": string;
  "Müşteri Adı Soyadı": string;
  "İlk Müşteri Kaynağı": string;
  "Form Müşteri Kaynağı": string;
  "WebForm Notu": string;
  "Talep Geliş Tarihi": string;
  "İnfo Form Geliş Yeri": string;
  "İnfo Form Geliş Yeri 2": string;
  "İnfo Form Geliş Yeri 3": string;
  "İnfo Form Geliş Yeri 4": string;
  "Atanan Personel": string;
  "Hatıırlatma Personeli": string;
  "GERİ DÖNÜŞ YAPILDI MI?\n(Müşteri Arandı mı?)": string;
  "Web Form Havuz Oluşturma Tarihi": string;
  "Form Sistem Olusturma Tarihi": string;
  "Atama Saat Farkı": string;
  "Dönüş Saat Farkı": string;
  "Giden Arama Sistem Oluşturma Tarihi": string;
  "Müşteri Geri Dönüş Tarihi\n(Giden Arama)": string;
  "GERİ DÖNÜŞ YAPILDI MI?\n(Müşteriye Mail Gönderildi mi?)": string;
  "Müşteri Mail Geri Dönüş Tarihi": string;
  "Telefonla Ulaşılamayan Müşteriler": string;
  "Kaç Gündür Geri Dönüş Bekliyor": string;
  "Kaç Günde Geri Dönüş Yapılmış (Süre)": string;
  "GERİ DÖNÜŞ NOTU\n(Giden Arama Notu)": string;
  "GERİ DÖNÜŞ NOTU\n(Giden Mail Notu)": string;
  "Birebir Görüşme Yapıldı mı ?": string;
  "Birebir Görüşme Tarihi": string;
  "Dönüş Görüşme Sonucu": string;
  "Dönüş Olumsuzluk Nedeni": string;
  "Müşteriye Satış Yapıldı Mı ?": string;
  "Satış Adedi": string;
  "Randevu Tarihi": string;
  "SON GORUSME NOTU": string;
  "SON GORUSME SONUCU": string;
  
  // Legacy fields for compatibility with existing component
  id?: string;
  customerName?: string;
  assignedPersonnel?: string;
  status?: string;
  stage?: string;
  projectName?: string;
  leadType?: string;
  requestDate?: string;
  negativeReason?: string;
  lastMeetingNote?: string;
  responseResult?: string;
  firstCustomerSource?: string;
  channel?: string;
  estimatedValue?: number;
  responseTime?: number; // in hours
  lastActivity?: string;
  lastActivityDate?: string;
}

interface FilterState {
  startDate: string;
  endDate: string;
  month: string;
  year: string;
  projectName: string;
  leadType: string;
  salesRep: string;
  channel: string;
  stage: string;
  reason: string;
  timeRange: string;
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Helper for formatting numbers
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('tr-TR').format(value);
};

// Helper for unique filter values
const getUniqueValues = (items: any[], key: string): any[] => {
  const values = items.map((item) => item[key]).filter(Boolean);
  return Array.from(new Set(values));
};

export default function OlumsuzAnaliziTab() {
  // Force refresh counter to clear all cached data
  const [refreshCounter, setRefreshCounter] = useState<number>(Date.now());
  
  // Function to clear cache and force refresh
  const clearCacheAndRefresh = useCallback(() => {
    setRefreshCounter(Date.now());
  }, []);
  
  // Call clearCacheAndRefresh on component mount to ensure fresh data
  useEffect(() => {
    clearCacheAndRefresh();
  }, [clearCacheAndRefresh]);

  // State for filters
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    month: "",
    year: "",
    projectName: "all-projects",
    leadType: "all-types",
    salesRep: "all",
    channel: "all",
    stage: "all",
    reason: "all",
    timeRange: "30d",
  });
  
  // Additional states needed for the component
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>("all");
  const [selectedReason, setSelectedReason] = useState<string>("all");
  
  // Helper function to calculate response time in hours
  const calculateResponseTime = useCallback((requestDateStr: string | undefined, responseDateStr: string | undefined): number => {
    if (!requestDateStr || !responseDateStr) return 0;
    
    try {
      const requestDate = new Date(requestDateStr);
      const responseDate = new Date(responseDateStr);
      const diffTime = Math.abs(responseDate.getTime() - requestDate.getTime());
      return Math.round(diffTime / (1000 * 60 * 60)); // Convert to hours
    } catch (error) {
      console.error("Error calculating response time:", error);
      return 0;
    }
  }, []);

  // Helper function to determine lead stage from available data
  const getLeadStage = useCallback((lead: Lead): string => {
    if (lead["Birebir Görüşme Yapıldı mı ?"] === "Evet") return "Görüşme Yapıldı";
    if (lead["GERİ DÖNÜŞ YAPILDI MI?\n(Müşteri Arandı mı?)"] === "Evet") return "Arandı";
    if (lead["GERİ DÖNÜŞ YAPILDI MI?\n(Müşteriye Mail Gönderildi mi?)"] === "Evet") return "Mail Gönderildi";
    return "Yeni Lead";
  }, []);
  
  // Function to map the API response data to the legacy format expected by the component
  const mapRealDataToLegacyFormat = useCallback((lead: Lead): Lead => {
    if (!lead) return {} as Lead;
    
    // Clear cache on each mapping to avoid stale data
    return {
      ...lead,
      // Map new fields to legacy fields
      id: lead["Müşteri ID"] || "",
      customerName: lead["Müşteri Adı Soyadı"] || "",
      assignedPersonnel: lead["Atanan Personel"] || "",
      status: lead["SON GORUSME SONUCU"] || lead["Dönüş Görüşme Sonucu"] || "",
      negativeReason: lead["Dönüş Olumsuzluk Nedeni"] || "",
      projectName: lead["İnfo Form Geliş Yeri"] || "", // Using this as project name
      leadType: lead["İnfo Form Geliş Yeri 2"] || "", // Using this as lead type
      requestDate: lead["Talep Geliş Tarihi"] || "",
      lastMeetingNote: lead["SON GORUSME NOTU"] || "",
      responseResult: lead["Dönüş Görüşme Sonucu"] || "",
      firstCustomerSource: lead["İlk Müşteri Kaynağı"] || "",
      channel: lead["Form Müşteri Kaynağı"] || "", // Using this as channel
      estimatedValue: 0, // Default value as it might not be in the API data
      responseTime: calculateResponseTime(lead["Talep Geliş Tarihi"], lead["Müşteri Geri Dönüş Tarihi\n(Giden Arama)"]),
      lastActivity: lead["SON GORUSME NOTU"],
      lastActivityDate: lead["Birebir Görüşme Tarihi"] || lead["Müşteri Geri Dönüş Tarihi\n(Giden Arama)"],
      stage: getLeadStage(lead)
    };
  }, [calculateResponseTime, getLeadStage]);
  
  // Fetch all leads data from the API with cache clearing
  const { data: leadsData = [] as Lead[], isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads", filters, refreshCounter.toString()], // Use refresh counter to prevent caching
    queryFn: async () => {
      const startTime = performance.now();
      console.log(`[${new Date().toLocaleTimeString()}] Fetching leads data from API...`);
      
      // Convert filters to the format expected by the server
      const apiFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        month: filters.month,
        year: filters.year,
        salesRep: filters.salesRep !== "all" ? filters.salesRep : undefined,
        leadType: filters.leadType !== "all-types" ? filters.leadType : undefined,
        status: filters.reason !== "all" ? filters.reason : undefined,
        project: filters.projectName !== "all-projects" ? filters.projectName : undefined,
      };
      
      try {
        const response = await fetch(`/api/leads?${new URLSearchParams(apiFilters as any).toString()}&_=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch leads data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const endTime = performance.now();
        const timeElapsed = (endTime - startTime).toFixed(2);
        
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Received ${data.length} leads from API in ${timeElapsed}ms`);
        return data;
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ API Error:`, error);
        throw error;
      }
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 0, // Consider data stale immediately
  });
  
  // Generate negative analysis data from the leads
  const negativeAnalysis = useMemo(() => {
    if (!leadsData?.length) return null;
    
    const startTime = performance.now();
    console.log(`[${new Date().toLocaleTimeString()}] Generating negative analysis from leads data`);
    
    // First map all leads to legacy format
    const mappedLeads = (leadsData as Lead[]).map(mapRealDataToLegacyFormat);
    
    // Filter for negative leads
    const negativeLeads = mappedLeads.filter(
      (lead: Lead) => lead.status?.toLowerCase?.()?.includes("olumsuz") || false
    );
    
    const endTime = performance.now();
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Found ${negativeLeads.length} negative leads out of ${mappedLeads.length} total leads (${((negativeLeads.length/mappedLeads.length)*100).toFixed(1)}%) in ${(endTime - startTime).toFixed(2)}ms`);
    
    if (negativeLeads.length === 0) return null;
    
    // Group negative leads by reason
    const reasonGroups: Record<string, Lead[]> = {};
    negativeLeads.forEach((lead: Lead) => {
      const reason = lead.negativeReason || lead.status || "Belirtilmemiş";
      if (!reasonGroups[reason]) {
        reasonGroups[reason] = [];
      }
      reasonGroups[reason].push(lead);
    });
    
    // Generate reason analysis
    const reasonAnalysis = Object.entries(reasonGroups).map(([reason, leads]) => ({
      reason,
      count: leads.length,
      percentage: Math.round((leads.length / negativeLeads.length) * 100),
      trend: 0, // Neutral trend
      estimatedLostRevenue: 0, // No revenue data
      diffFromLastPeriod: 0, // No historical data
      recoverabilityScore: 3, // Default score
      impactScore: 3, // Default score
    })).sort((a, b) => b.count - a.count);
    
    // Group by stage
    const stageGroups: Record<string, Lead[]> = {};
    negativeLeads.forEach((lead: Lead) => {
      const stage = lead.stage || "Belirsiz";
      if (!stageGroups[stage]) {
        stageGroups[stage] = [];
      }
      stageGroups[stage].push(lead);
    });
    
    // Generate stage analysis
    const stageAnalysis = Object.entries(stageGroups).map(([stage, leads]) => ({
      stage,
      count: leads.length,
      percentage: Math.round((leads.length / negativeLeads.length) * 100),
    })).sort((a, b) => b.count - a.count);
    
    // Group by personnel
    const personnelGroups: Record<string, Lead[]> = {};
    negativeLeads.forEach((lead: Lead) => {
      const personnel = lead.assignedPersonnel || "Atanmamış";
      if (!personnelGroups[personnel]) {
        personnelGroups[personnel] = [];
      }
      personnelGroups[personnel].push(lead);
    });
    
    // Generate personnel analysis
    const personnelAnalysis = Object.entries(personnelGroups).map(([personnel, leads]) => {
      // Get top reasons for this personnel
      const reasons: Record<string, number> = {};
      leads.forEach((lead: Lead) => {
        const reason = lead.negativeReason || lead.status || "Belirtilmemiş";
        reasons[reason] = (reasons[reason] || 0) + 1;
      });
      
      const topReasons = Object.entries(reasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason]) => reason);
        
      return {
        personnel,
        count: leads.length,
        percentage: Math.round((leads.length / negativeLeads.length) * 100),
        topReasons,
        trend: 0, // Neutral trend
      };
    }).sort((a, b) => b.count - a.count);
    
    // Generate channel analysis
    const channelGroups: Record<string, Lead[]> = {};
    negativeLeads.forEach((lead: Lead) => {
      const channel = lead.channel || lead.firstCustomerSource || "Bilinmiyor";
      if (!channelGroups[channel]) {
        channelGroups[channel] = [];
      }
      channelGroups[channel].push(lead);
    });
    
    const channelAnalysis = Object.entries(channelGroups).map(([channel, leads]) => ({
      channel,
      count: leads.length,
      percentage: Math.round((leads.length / negativeLeads.length) * 100),
    })).sort((a, b) => b.count - a.count);
    
    // Generate the full analysis data
    return {
      totalNegative: negativeLeads.length,
      totalLeads: mappedLeads.length,
      totalRevenue: 0, // No revenue data available
      estimatedLostRevenue: 0, // No revenue data available
      negativePercentage: Math.round((negativeLeads.length / mappedLeads.length) * 100),
      reasonAnalysis,
      personnelAnalysis,
      stageAnalysis,
      channelAnalysis,
      timeSeriesData: [], // No time series data
      funnelData: [], // No funnel data
      textAnalysis: {
        wordCloud: [],
        clusters: [],
        examples: {}
      },
      alerts: [],
      forecast: {
        nextMonth: 0,
        trend: "flat" as const,
        confidence: 0
      }
    } as NegativeAnalysisData;
  }, [leadsData, mapRealDataToLegacyFormat]);
  
  // Loading state
  const isLoadingAnalysis = false; // We're generating analysis client-side

  // Filter negative leads based on current filters
  const filteredNegativeLeads = useMemo(() => {
    if (!leadsData?.length) return [];
    
    // Use the already-mapped leads if possible to avoid re-mapping
    const mappedLeads = (leadsData as Lead[]).map(mapRealDataToLegacyFormat);
    
    // First filter just for negative leads before applying other filters
    // for better performance with large datasets
    const negativeLeads = mappedLeads.filter((lead: Lead) => 
      lead.status?.toLowerCase?.()?.includes("olumsuz") || false
    );
    
    // No negative leads or no filters applied? Return all negative leads
    if (negativeLeads.length === 0 || 
        (filters.salesRep === "all" && 
         filters.reason === "all" &&
         filters.projectName === "all-projects" &&
         filters.leadType === "all-types" &&
         filters.channel === "all" &&
         filters.stage === "all" &&
         !filters.startDate && 
         !filters.endDate)) {
      return negativeLeads;
    }
    
    // Apply additional filters
    return negativeLeads.filter((lead: Lead) => {
      // Check if it matches personnel filter
      if (filters.salesRep !== "all" && 
          lead.assignedPersonnel !== filters.salesRep) {
        return false;
      }
      
      // Get the most appropriate reason to check against
      const reasonToCheck =
        lead.negativeReason && lead.negativeReason.trim() !== ""
          ? lead.negativeReason.trim()
          : lead.status || "Belirtilmemiş";
          
      // Check if it matches reason filter
      if (filters.reason !== "all" && reasonToCheck !== filters.reason) {
        return false;
      }
      
      // Check project filter
      if (filters.projectName !== "all-projects" &&
          lead.projectName !== filters.projectName) {
        return false;
      }
      
      // Check lead type filter
      if (filters.leadType !== "all-types" &&
          lead.leadType !== filters.leadType) {
        return false;
      }
      
      // Check channel filter
      if (filters.channel !== "all" &&
          lead.channel !== filters.channel) {
        return false;
      }
      
      // Check stage filter
      if (filters.stage !== "all" &&
          lead.stage !== filters.stage) {
        return false;
      }
      
      // Check date filter
      if (filters.startDate && lead.requestDate &&
          lead.requestDate < filters.startDate) {
        return false;
      }
      
      if (filters.endDate && lead.requestDate &&
          lead.requestDate > filters.endDate) {
        return false;
      }
      
      // If we got here, all filters match
      return true;
    });
  }, [leadsData, filters, mapRealDataToLegacyFormat]);
  
  // Extract available filter options from the data
  const filterOptions = useMemo(() => {
    // Map all leads to legacy format first
    const mappedLeads = (leadsData as Lead[]).map(mapRealDataToLegacyFormat);
    
    // Filter only negative leads
    const negativeLeads = mappedLeads.filter(
      (lead: Lead) => lead.status?.toLowerCase?.()?.includes("olumsuz") || false
    );
    
    // Get unique values for each filter
    return {
      personnel: getUniqueValues(negativeLeads, 'assignedPersonnel')
        .filter((item): item is string => typeof item === 'string'),
      reasons: getUniqueValues(negativeLeads, 'negativeReason')
        .filter((item): item is string => typeof item === 'string')
        .concat(
          // Include status as reason if no explicit reason
          negativeLeads
            .filter((lead: Lead) => !lead.negativeReason)
            .map((lead: Lead) => lead.status || "")
            .filter((item): item is string => !!item)
        ),
      projects: getUniqueValues(negativeLeads, 'projectName')
        .filter((item): item is string => typeof item === 'string'),
      leadTypes: getUniqueValues(negativeLeads, 'leadType')
        .filter((item): item is string => typeof item === 'string'),
      channels: getUniqueValues(negativeLeads, 'channel')
        .filter((item): item is string => typeof item === 'string'),
      stages: getUniqueValues(negativeLeads, 'stage')
        .filter((item): item is string => typeof item === 'string'),
    };
  }, [leadsData, mapRealDataToLegacyFormat]);
  
  // Personnel and reason data - derived from filteredNegativeLeads
  const uniquePersonnel = useMemo(() => 
    Array.from(new Set(filteredNegativeLeads.map((lead: Lead) => lead.assignedPersonnel || "").filter(Boolean)))
  , [filteredNegativeLeads]);
  
  const uniqueReasons = useMemo(() => 
    Array.from(new Set(filteredNegativeLeads
      .map((lead: Lead) => lead.negativeReason || lead.status || "")
      .filter(Boolean)))
  , [filteredNegativeLeads]);
  
  // Loading state
  const isLoading = isLoadingLeads;
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">
              Lead verileri yükleniyor...
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // No data state
  if (!leadsData || leadsData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-lg">
              Henüz Lead Verisi Bulunamadı
            </p>
            <p className="text-gray-500 mt-2">
              Sistemde hiç lead verisi bulunmamaktadır. Lütfen önce veri girişi yapın.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Dashboard Title and Controls */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <TrendingDown className="h-6 w-6 text-red-600" />
                <span>Olumsuz Lead Analiz Dashboardu</span>
                <Badge variant="outline" className="ml-2 font-normal text-xs">v2.0</Badge>
              </CardTitle>
              <CardDescription className="text-sm md:text-base mt-1">
                İş odaklı lead kaybı analizi ve aksiyon önerileri
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearCacheAndRefresh} 
            className="ml-auto"
          >
            <X className="h-4 w-4 mr-1" />
            Önbelleği Temizle
          </Button>
        </CardHeader>
      </Card>
      
      {/* Filters */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              Filtreleme
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-3">
            {/* Project Filter */}
            <div>
              <Select
                value={filters.projectName}
                onValueChange={(value) => setFilters({...filters, projectName: value})}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Proje Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-projects">Tüm Projeler</SelectItem>
                  {filterOptions.projects.map((project) => (
                    <SelectItem key={project} value={project}>{project}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Personnel Filter */}
            <div>
              <Select
                value={filters.salesRep}
                onValueChange={(value) => setFilters({...filters, salesRep: value})}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Personel Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Personel</SelectItem>
                  {filterOptions.personnel.map((personnel) => (
                    <SelectItem key={personnel} value={personnel}>{personnel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Reason Filter */}
            <div>
              <Select
                value={filters.reason}
                onValueChange={(value) => setFilters({...filters, reason: value})}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Neden Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Nedenler</SelectItem>
                  {filterOptions.reasons
                    .filter((reason): reason is string => reason !== undefined) 
                    .map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason.length > 25 ? reason.substring(0, 25) + "..." : reason}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center mt-1">
            <Badge variant="outline" className="bg-gray-50 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              {filteredNegativeLeads.length} olumsuz lead / {(leadsData as Lead[]).length} toplam lead
            </Badge>
            <Badge variant="secondary" className="bg-gray-100 text-xs">
              API veri durumu: {leadsData && (leadsData as Lead[]).length > 0 ? 'Başarılı' : 'Veri Yok'}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs ml-auto"
              onClick={() => setFilters({
                startDate: "",
                endDate: "",
                month: "",
                year: "",
                projectName: "all-projects",
                leadType: "all-types",
                salesRep: "all",
                channel: "all",
                stage: "all",
                reason: "all",
                timeRange: "30d",
              })}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Tüm filtreleri temizle
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Toplam Olumsuz Lead
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredNegativeLeads.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Tüm lead'lerin %
              {Math.round(
                (filteredNegativeLeads.length /
                  ((leadsData as Lead[]).length || 1)) *
                  100
              )}
              'i
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Farklı Neden Sayısı
            </CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {uniqueReasons.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Benzersiz olumsuzluk nedeni
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Etkilenen Personel
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {uniquePersonnel.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Olumsuz lead'e sahip personel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Kaybedilen Gelir
            </CardTitle>
            <Calculator className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-purple-600">
              {formatCurrency(negativeAnalysis?.estimatedLostRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tahmini kaybedilen gelir
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs - Simplified */}
      <Tabs defaultValue="reasons" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reasons">Olumsuzluk Nedenleri</TabsTrigger>
          <TabsTrigger value="detailed">Detaylı Liste</TabsTrigger>
        </TabsList>

        <TabsContent value="reasons" className="space-y-4">
          {/* Comprehensive Negative Reasons Summary Table */}
          <NegativeReasonsSummaryTable
            leads={leadsData as Lead[]}
            selectedPersonnel={selectedPersonnel}
          />
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {/* Detailed lead list will be shown here */}
          <Card>
            <CardHeader>
              <CardTitle>Olumsuz Leadler Listesi</CardTitle>
              <CardDescription>Seçilen filtrelere göre olumsuz lead listesi</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredNegativeLeads.length > 0 ? (
                <div className="text-center py-8">
                  <p>API'den gelen verilere göre lead listesi burada gösterilecek</p>
                  <p className="text-gray-500 mt-2">({filteredNegativeLeads.length} lead bulundu)</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Seçilen kriterlere uygun olumsuz lead bulunamadı
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Help text for performance */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Optimize Edilmiş Görünüm:</strong> Tüm personel seçildiğinde
          performans için sadece en sık görülen olumsuzluk nedenleri
          gösterilmektedir. Belirli bir personel seçerek o personele ait tüm
          olumsuzluk nedenlerini görebilirsiniz.
        </AlertDescription>
      </Alert>
      
      {/* Debug panel - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed border-gray-300 bg-gray-50">
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium text-gray-700">Debug Panel</CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-xs">
            <div className="space-y-1">
              <p>
                <span className="font-mono font-medium">Total leads:</span>{" "}
                <span className="text-blue-600 font-medium">{(leadsData as Lead[])?.length || 0}</span>
              </p>
              <p>
                <span className="font-mono font-medium">Negative leads:</span>{" "}
                <span className="text-red-600 font-medium">{filteredNegativeLeads?.length || 0}</span>
              </p>
              <p>
                <span className="font-mono font-medium">Analysis generated:</span>{" "}
                <span className={`font-medium ${negativeAnalysis ? 'text-green-600' : 'text-red-600'}`}>
                  {negativeAnalysis ? 'Yes' : 'No'}
                </span>
              </p>
              <p>
                <span className="font-mono font-medium">Data source:</span>{" "}
                <span className="text-green-600 font-medium">API (/api/leads)</span>
              </p>
              <p>
                <span className="font-mono font-medium">Cache key:</span>{" "}
                <span className="font-mono text-gray-500">{refreshCounter}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
