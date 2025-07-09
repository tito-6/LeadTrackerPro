import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Target, AlertCircle, Calendar, PhoneCall, Clock, Star } from 'lucide-react';
import InteractiveChart from './interactive-chart';
import { DataTable } from "@/components/ui/data-table";

export default function EnhancedOverviewDashboardTab() {
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie');
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>('all');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');

  // Fetch enhanced stats that combine both data sources
  const { data: enhancedStats } = useQuery({
    queryKey: ['/api/enhanced-stats'],
    refetchInterval: 5000,
  });

  // Fetch takipte data
  const { data: takipteData = [] } = useQuery({
    queryKey: ['/api/takipte'],
  });

  // Fetch leads data for detailed analysis
  const { data: leadsData = [] } = useQuery({
    queryKey: ['/api/leads'],
  });

  const hasSecondaryData = enhancedStats?.takipte?.hasData || false;

  // Personnel status breakdown calculation
  const personnelStatusData = useMemo(() => {
    if (!leadsData.length || !enhancedStats) return [];
    
    const personnelStats = {};
    const { takipte } = enhancedStats;
    
    leadsData.forEach(lead => {
      const personnel = lead.assignedPersonnel || 'Atanmamış';
      const status = lead.status || 'Bilinmiyor';
      
      if (!personnelStats[personnel]) {
        personnelStats[personnel] = {
          name: personnel,
          totalLeads: 0,
          statusBreakdown: {},
          takipteCount: takipte.byPersonnel?.[personnel] || 0
        };
      }
      
      personnelStats[personnel].totalLeads++;
      if (!personnelStats[personnel].statusBreakdown[status]) {
        personnelStats[personnel].statusBreakdown[status] = 0;
      }
      personnelStats[personnel].statusBreakdown[status]++;
    });
    
    return Object.values(personnelStats);
  }, [leadsData, enhancedStats]);

  // Memoized calculations for performance
  const dashboardMetrics = useMemo(() => {
    if (!enhancedStats) return null;

    const { leads, takipte } = enhancedStats;

    // Core KPIs
    const totalLeads = leads.total;
    const totalTakipte = takipte.total;
    const dataCompletnessScore = totalTakipte > 0 ? Math.min(100, Math.round((totalTakipte / totalLeads) * 100)) : 0;

    // Status distribution for charts
    const statusData = Object.entries(leads.byStatus).map(([status, count]) => ({
      name: status,
      value: count as number,
      percentage: Math.round(((count as number) / totalLeads) * 100)
    }));

    // Simple personnel data for charts (backwards compatibility)
    const personnelData = Object.entries(leads.byPersonnel).map(([person, leadCount]) => {
      const takipteCount = takipte.byPersonnel?.[person] || 0;
      return {
        name: person,
        leadCount: leadCount as number,
        takipteCount,
        efficiency: takipteCount > 0 ? Math.round(((leadCount as number) / takipteCount) * 100) : 0
      };
    });

    // Lead type distribution
    const typeData = Object.entries(leads.byType).map(([type, count]) => ({
      name: type === 'kiralama' ? 'Kiralık' : 'Satış',
      value: count as number,
      percentage: Math.round(((count as number) / totalLeads) * 100)
    }));

    return {
      totalLeads,
      totalTakipte,
      dataCompletnessScore,
      statusData,
      personnelData,
      typeData
    };
  }, [enhancedStats]);

  // Advanced Takipte Analytics
  const takipteAnalytics = useMemo(() => {
    if (!hasSecondaryData || !enhancedStats?.takipte) return null;

    const { takipte } = enhancedStats;

    // Customer source analysis
    const sourceData = Object.entries(takipte.bySource).map(([source, count]) => ({
      name: source,
      value: count as number,
      percentage: Math.round(((count as number) / takipte.total) * 100)
    }));

    // Meeting type distribution
    const meetingTypeData = Object.entries(takipte.byMeetingType).map(([type, count]) => ({
      name: type,
      value: count as number,
      percentage: Math.round(((count as number) / takipte.total) * 100)
    }));

    // Office performance
    const officeData = Object.entries(takipte.byOffice).map(([office, count]) => ({
      name: office,
      value: count as number,
      percentage: Math.round(((count as number) / takipte.total) * 100)
    }));

    // Customer criteria (Satış vs Kira)
    const kriterData = Object.entries(takipte.byKriter).map(([kriter, count]) => ({
      name: kriter,
      value: count as number,
      percentage: Math.round(((count as number) / takipte.total) * 100)
    }));

    return {
      sourceData,
      meetingTypeData,
      officeData,
      kriterData
    };
  }, [enhancedStats, hasSecondaryData]);

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

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347'];

  return (
    <div className="space-y-6">
      {/* Header with Data Completeness Alert */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🧠 Akıllı Dashboard - Genel Görünüm</h2>
          <p className="text-gray-600 mt-1">AI-destekli lead performans analizi</p>
        </div>
        
        {!hasSecondaryData && (
          <Alert className="max-w-md border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>⚠️ Eksik Veri:</strong> Takip dosyası yüklenmemiş. Detaylı analiz için ikinci dosyayı yükleyin.
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
            <div className="text-2xl font-bold">{dashboardMetrics?.totalLeads || 0}</div>
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
            <div className="text-2xl font-bold">{dashboardMetrics?.totalTakipte || 0}</div>
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
            <div className="text-2xl font-bold">{dashboardMetrics?.dataCompletnessScore || 0}%</div>
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
              {hasSecondaryData ? '🤖 Active' : '⚠️ Limited'}
            </div>
            <p className="text-orange-100 text-xs">
              {hasSecondaryData ? 'Tam AI analiz aktif' : 'İkinci dosya gerekli'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex gap-2">
          <Select value={chartType} onValueChange={(value: 'pie' | 'bar' | 'line') => setChartType(value)}>
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
        
        <div className="flex gap-2 text-sm text-gray-600">
          <Badge variant="outline">📊 Real-time</Badge>
          <Badge variant="outline">🤖 AI-Power</Badge>
          <Badge variant="outline">🤖 AI-Powered</Badge>
          {hasSecondaryData && <Badge variant="outline">🔗 Dual-Source</Badge>}
        </div>
      </div>

      {/* Personnel Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            👥 Personel Atama ve Durum Özeti
          </CardTitle>
          <CardDescription>Her personelin lead dağılımı ve durum analizi</CardDescription>
        </CardHeader>
        <CardContent>
          {personnelStatusData && personnelStatusData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th className="text-left p-3 font-medium">Personel</th>
                    <th className="text-center p-3 font-medium">Toplam Lead</th>
                    <th className="text-center p-3 font-medium">Takip Kayıtları</th>
                    <th className="text-center p-3 font-medium">Tüm Durumlar</th>
                    <th className="text-center p-3 font-medium">Aktivite</th>
                  </tr>
                </thead>
                <tbody>
                  {personnelStatusData.map((person, index) => (
                    <tr key={person.name} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-3 font-medium">{person.name}</td>
                      <td className="text-center p-3">
                        <Badge variant="outline" className="font-bold">{person.totalLeads}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge variant={person.takipteCount > 0 ? "default" : "secondary"}>
                          {person.takipteCount}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {Object.entries(person.statusBreakdown).map(([status, count]) => (
                            <Badge 
                              key={status} 
                              variant="outline" 
                              className="text-xs"
                              title={`${status}: ${count} leads`}
                            >
                              {status}: {count}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="text-center p-3">
                        {person.takipteCount > 0 ? (
                          <Badge className="bg-green-100 text-green-800">✅ Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">⚠️ Takip Yok</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Status Legend */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Durum Açıklamaları:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                  {dashboardMetrics.statusData.map((status) => (
                    <div key={status.name} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="truncate">{status.name}: {status.value}</span>
                    </div>
                  ))}
                </div>
              </div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">Durum Analizi</TabsTrigger>
          <TabsTrigger value="personnel">Personel Performansı</TabsTrigger>
          <TabsTrigger value="sources" disabled={!hasSecondaryData}>Kaynak Analizi</TabsTrigger>
          <TabsTrigger value="advanced" disabled={!hasSecondaryData}>Gelişmiş Analiz</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Durum Dağılımı</CardTitle>
                <CardDescription>Mevcut lead durumlarının analizi</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardMetrics?.statusData && (
                  <>
                    <InteractiveChart
                      title="Durum Dağılımı"
                      data={dashboardMetrics.statusData}
                      chartType={chartType}
                      height={500}
                      colors={colors}
                    />
                    <DataTable
                      title="Lead Durum Dağılımı"
                      data={dashboardMetrics.statusData}
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
                    <InteractiveChart
                      title="Tip Dağılımı"
                      data={dashboardMetrics.typeData}
                      chartType={chartType}
                      height={500}
                      colors={['#10b981', '#f59e0b']}
                    />
                    <DataTable
                      title="Lead Tipi Dağılımı"
                      data={dashboardMetrics.typeData}
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
              <CardTitle>Personel Performans Karşılaştırması</CardTitle>
              <CardDescription>Lead sayıları ve takip verileri birleşimi</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardMetrics?.personnelData && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={dashboardMetrics.personnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leadCount" fill="#8884d8" name="Lead Sayısı" />
                    {hasSecondaryData && <Bar dataKey="takipteCount" fill="#82ca9d" name="Takip Sayısı" />}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          {hasSecondaryData && takipteAnalytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Müşteri Kaynağı Analizi</CardTitle>
                  <CardDescription>Lead kaynaklarının dağılımı</CardDescription>
                </CardHeader>
                <CardContent>
                  <InteractiveChart
                    title="Kaynak Dağılımı"
                    data={takipteAnalytics.sourceData}
                    chartType={chartType}
                    height={300}
                    colors={colors}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Görüşme Tipi Dağılımı</CardTitle>
                  <CardDescription>İletişim yöntemlerinin analizi</CardDescription>
                </CardHeader>
                <CardContent>
                  <InteractiveChart
                    title="Görüşme Tipleri"
                    data={takipteAnalytics.meetingTypeData}
                    chartType={chartType}
                    height={300}
                    colors={colors}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Kaynak analizi için takip dosyası gereklidir. Lütfen ikinci dosyayı yükleyin.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          {hasSecondaryData && takipteAnalytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Müşteri Kriterleri</CardTitle>
                  <CardDescription>Satış vs Kira müşteri analizi</CardDescription>
                </CardHeader>
                <CardContent>
                  <InteractiveChart
                    title="Kriter Dağılımı"
                    data={takipteAnalytics.kriterData}
                    chartType={chartType}
                    height={300}
                    colors={['#3b82f6', '#ef4444']}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ofis Performansı</CardTitle>
                  <CardDescription>Şube bazlı aktivite analizi</CardDescription>
                </CardHeader>
                <CardContent>
                  <InteractiveChart
                    title="Ofis Dağılımı"
                    data={takipteAnalytics.officeData}
                    chartType={chartType}
                    height={300}
                    colors={colors}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Gelişmiş analiz için takip dosyası gereklidir. Lütfen ikinci dosyayı yükleyin.
              </AlertDescription>
            </Alert>
          )}
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
                <span className="font-medium">{dashboardMetrics?.totalLeads || 0}</span> Ana Lead
              </div>
              <div>
                <span className="font-medium">{dashboardMetrics?.totalTakipte || 0}</span> Takip Kaydı
              </div>
              <div>
                <span className="font-medium">{dashboardMetrics?.dataCompletnessScore || 0}%</span> Veri Tamamlanması
              </div>
              <div>
                <span className="font-medium">{hasSecondaryData ? 'Aktif' : 'Pasif'}</span> AI Analiz
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}