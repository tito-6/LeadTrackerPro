import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLeads, useSalesReps } from "@/hooks/use-leads";
import { createChart } from "@/lib/chart-utils";

interface ReportFilters {
  startDate: string;
  endDate: string;
  salesRep: string;
  leadType: string;
}

export default function ReportsTab() {
  const { data: salesReps = [] } = useSalesReps();
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: "",
    endDate: "",
    salesRep: "",
    leadType: "",
  });

  const { data: filteredLeads = [] } = useQuery({
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

  const { data: stats } = useQuery({
    queryKey: ["/api/stats", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/stats?${params.toString()}`);
      return response.json();
    },
  });

  // Filter leads by type
  const rentalLeads = filteredLeads.filter((lead: any) => lead.leadType === "kiralama");
  const salesLeads = filteredLeads.filter((lead: any) => lead.leadType === "satis");

  // Calculate statistics
  const calculateStats = (leads: any[]) => {
    const total = leads.length;
    if (total === 0) return [];

    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status === "bilgi-verildi" ? "Bilgi Verildi" : 
              status === "olumsuz" ? "Olumsuz" : 
              status === "satis" ? "Satış" : "Yeni",
      count: count as number,
      percentage: Math.round(((count as number) / total) * 100),
    }));
  };

  const rentalStats = calculateStats(rentalLeads);
  const salesStats = calculateStats(salesLeads);

  // Calculate progress for each sales rep
  const calculateProgress = () => {
    return salesReps.map(rep => {
      const repLeads = filteredLeads.filter((lead: any) => 
        lead.salesRep === rep.name && lead.status === "satis"
      );
      const progress = (repLeads.length / rep.monthlyTarget) * 100;
      
      return {
        ...rep,
        current: repLeads.length,
        progress: Math.min(progress, 100),
      };
    });
  };

  const progressData = calculateProgress();

  useEffect(() => {
    // Initialize charts when data changes
    setTimeout(() => {
      createChart("rentalChart", rentalStats, "pie");
      createChart("salesChart", salesStats, "pie");
    }, 100);
  }, [rentalStats, salesStats]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    // Filters are automatically applied through React Query dependency
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Rapor Filtreleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Başlangıç Tarihi</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Bitiş Tarihi</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="salesRep">Satış Temsilcisi</Label>
              <Select value={filters.salesRep} onValueChange={(value) => handleFilterChange("salesRep", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tümü</SelectItem>
                  {salesReps.map((rep) => (
                    <SelectItem key={rep.id} value={rep.name}>
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="leadType">Lead Tipi</Label>
              <Select value={filters.leadType} onValueChange={(value) => handleFilterChange("leadType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tümü</SelectItem>
                  <SelectItem value="kiralama">Kiralama</SelectItem>
                  <SelectItem value="satis">Satış</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={applyFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kiralama Report */}
        <Card>
          <CardHeader>
            <CardTitle>Kiralama Lead Raporu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <canvas id="rentalChart" width="400" height="200"></canvas>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Durum</TableHead>
                  <TableHead>Adet</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentalStats.length > 0 ? (
                  rentalStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell>{stat.status}</TableCell>
                      <TableCell>{stat.count}</TableCell>
                      <TableCell>{stat.percentage}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      Veri bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Satış Report */}
        <Card>
          <CardHeader>
            <CardTitle>Satış Lead Raporu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <canvas id="salesChart" width="400" height="200"></canvas>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Durum</TableHead>
                  <TableHead>Adet</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesStats.length > 0 ? (
                  salesStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell>{stat.status}</TableCell>
                      <TableCell>{stat.count}</TableCell>
                      <TableCell>{stat.percentage}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      Veri bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Aylık Hedef Takibi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {progressData.map((rep) => (
              <div key={rep.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{rep.name}</h4>
                  <span className="text-sm text-gray-500">{rep.current}/{rep.monthlyTarget}</span>
                </div>
                <Progress value={rep.progress} className="mb-2" />
                <p className="text-xs text-gray-600">Hedef: {rep.monthlyTarget} satış</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
