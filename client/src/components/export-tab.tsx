import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, FileText, FileCode, Trash2, Calendar, Filter } from "lucide-react";
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
    startDate: '',
    endDate: '',
    month: '',
    year: '',
    salesRep: '',
    leadType: ''
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ['/api/sales-reps'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats', dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/stats?${params.toString()}`);
      return response.json();
    }
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
      startDate: '',
      endDate: '',
      month: '',
      year: '',
      salesRep: '',
      leadType: ''
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
      a.download = `lead-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;
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

  const handleExportPDF = async () => {
    // For now, we'll export as Excel since PDF generation requires additional setup
    toast({
      title: "Bilgi",
      description: "PDF dışa aktarma özelliği yakında eklenecek.",
    });
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
      a.download = `lead-raporu-${new Date().toISOString().split('T')[0]}.json`;
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

  const handleSettingChange = (key: keyof ExportSettings, value: string | boolean) => {
    setExportSettings(prev => ({ ...prev, [key]: value }));
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
                onChange={(e) => setDateFilters(prev => ({ ...prev, startDate: e.target.value, month: '', year: '' }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bitiş Tarihi</Label>
              <Input
                type="date"
                value={dateFilters.endDate}
                onChange={(e) => setDateFilters(prev => ({ ...prev, endDate: e.target.value, month: '', year: '' }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Ay Seçimi</Label>
              <Select value={dateFilters.month} onValueChange={(month) => setDateFilters(prev => ({ ...prev, month, year: prev.year || '2025', startDate: '', endDate: '' }))}>
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
              <Select value={dateFilters.salesRep} onValueChange={(salesRep) => setDateFilters(prev => ({ ...prev, salesRep }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {salesReps.map((rep: any) => (
                    <SelectItem key={rep.id} value={rep.name}>{rep.name}</SelectItem>
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
                <div className="text-2xl font-bold text-blue-600">{stats.totalLeads}</div>
                <div className="text-sm text-muted-foreground">Toplam Lead</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.byStatusWithPercentages?.find((s: any) => s.status.toLowerCase().includes('satış'))?.count || 0}</div>
                <div className="text-sm text-muted-foreground">Satışlar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.byStatusWithPercentages?.find((s: any) => s.status.toLowerCase().includes('takip'))?.count || 0}</div>
                <div className="text-sm text-muted-foreground">Takipte</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.byStatusWithPercentages?.find((s: any) => s.status.toLowerCase().includes('olumsuz'))?.count || 0}</div>
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
              <h3 className="text-md font-medium text-gray-900 mb-4">Dışa Aktarma Seçenekleri</h3>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">Excel Raporu</h4>
                        <p className="text-sm text-gray-600">Tüm veriler ve grafikler ile birlikte</p>
                      </div>
                    </div>
                    <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4 mr-2" />
                      İndir
                    </Button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-red-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">PDF Raporu</h4>
                        <p className="text-sm text-gray-600">Profesyonel format ve logo ile</p>
                      </div>
                    </div>
                    <Button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700">
                      <Download className="h-4 w-4 mr-2" />
                      İndir
                    </Button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileCode className="h-8 w-8 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">JSON Verisi</h4>
                        <p className="text-sm text-gray-600">Ham veri formatı</p>
                      </div>
                    </div>
                    <Button onClick={handleExportJSON} className="bg-blue-600 hover:bg-blue-700">
                      <Download className="h-4 w-4 mr-2" />
                      İndir
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Dışa Aktarma Ayarları</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportTitle">Rapor Başlığı</Label>
                  <Input
                    id="reportTitle"
                    value={exportSettings.title}
                    onChange={(e) => handleSettingChange("title", e.target.value)}
                    placeholder="Aylık Lead Raporu"
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Şirket Adı</Label>
                  <Input
                    id="companyName"
                    value={exportSettings.company}
                    onChange={(e) => handleSettingChange("company", e.target.value)}
                    placeholder="Şirket adını girin"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCharts"
                      checked={exportSettings.includeCharts}
                      onCheckedChange={(checked) => handleSettingChange("includeCharts", !!checked)}
                    />
                    <Label htmlFor="includeCharts">Grafikleri dahil et</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSummary"
                      checked={exportSettings.includeSummary}
                      onCheckedChange={(checked) => handleSettingChange("includeSummary", !!checked)}
                    />
                    <Label htmlFor="includeSummary">Özet bilgileri dahil et</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeDetails"
                      checked={exportSettings.includeDetails}
                      onCheckedChange={(checked) => handleSettingChange("includeDetails", !!checked)}
                    />
                    <Label htmlFor="includeDetails">Detaylı veri tabloları</Label>
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
