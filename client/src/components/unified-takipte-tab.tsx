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
import { Phone, Clock, AlertCircle, Calendar, Star, TrendingUp, Users, Target } from 'lucide-react';
import InteractiveChart from './interactive-chart';

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
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>('all');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [selectedKriter, setSelectedKriter] = useState<string>('all');
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie');

  // Fetch takipte data
  const { data: takipteData = [] } = useQuery({
    queryKey: ['/api/takipte'],
    refetchInterval: 5000,
  });

  // Fetch enhanced stats
  const { data: enhancedStats } = useQuery({
    queryKey: ['/api/enhanced-stats'],
  });

  const hasData = takipteData.length > 0;

  // Comprehensive analytics calculations
  const analytics = useMemo(() => {
    if (!hasData) return null;

    // Filter data based on selections
    let filteredData = takipteData;
    
    if (selectedPersonnel !== 'all') {
      filteredData = filteredData.filter(item => 
        item['Atanan Personel'] === selectedPersonnel || item.assignedPersonnel === selectedPersonnel
      );
    }
    
    if (selectedOffice !== 'all') {
      filteredData = filteredData.filter(item => 
        item['Ofis'] === selectedOffice || item.ofis === selectedOffice
      );
    }
    
    if (selectedKriter !== 'all') {
      filteredData = filteredData.filter(item => 
        item['Kriter'] === selectedKriter || item.kriter === selectedKriter
      );
    }

    // Calculate comprehensive metrics
    const totalRecords = filteredData.length;
    
    // Customer criteria analysis (Satış vs Kira)
    const kriterCounts = filteredData.reduce((acc, item) => {
      const kriter = item['Kriter'] || item.kriter || 'Belirtilmemiş';
      acc[kriter] = (acc[kriter] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Source analysis (Instagram, Facebook, etc.)
    const sourceCounts = filteredData.reduce((acc, item) => {
      const source = item['İrtibat Müşteri Kaynağı'] || item['Müşteri Kaynağı'] || 'Bilinmiyor';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Meeting type analysis
    const meetingTypeCounts = filteredData.reduce((acc, item) => {
      const type = item['Görüşme Tipi'] || item.gorusmeTipi || 'Belirtilmemiş';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Office performance
    const officeCounts = filteredData.reduce((acc, item) => {
      const office = item['Ofis'] || item.ofis || 'Ana Ofis';
      acc[office] = (acc[office] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Personnel performance
    const personnelCounts = filteredData.reduce((acc, item) => {
      const personnel = item['Atanan Personel'] || item.assignedPersonnel || 'Atanmamış';
      acc[personnel] = (acc[personnel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Profession analysis
    const professionCounts = filteredData.reduce((acc, item) => {
      const profession = item['Meslek Adı'] || item.meslekAdi || 'Belirtilmemiş';
      acc[profession] = (acc[profession] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Result analysis
    const resultCounts = filteredData.reduce((acc, item) => {
      const result = item['Son Sonuç'] || item.sonSonuc || 'Devam Ediyor';
      acc[result] = (acc[result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Reminder analysis
    let reminderCount = 0;
    let overdueCount = 0;
    let finalReminderCount = 0;
    
    filteredData.forEach(item => {
      const hasReminder = item['Hatırlatma Var Mı'] || item.hatirlatmaVarMi;
      const reminderDate = item['Hatırlatma Tarihi'] || item.hatirlatmaTarihi;
      const isFinal = item['Hatırlatma Son Mu'] || item.hatirlatmaSonMu;
      
      if (hasReminder) reminderCount++;
      if (isFinal) finalReminderCount++;
      if (reminderDate && new Date(reminderDate) < new Date()) overdueCount++;
    });

    // Average call duration
    const totalDuration = filteredData.reduce((acc, item) => {
      const duration = parseFloat(item['Konuşma Süresi']) || parseFloat(item.konusmaSuresi) || 0;
      return acc + duration;
    }, 0);
    const averageDuration = totalRecords > 0 ? Math.round(totalDuration / totalRecords) : 0;

    // Convert to chart data format
    const kriterData = Object.entries(kriterCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalRecords) * 100)
    }));

    const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalRecords) * 100)
    }));

    const meetingTypeData = Object.entries(meetingTypeCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalRecords) * 100)
    }));

    const officeData = Object.entries(officeCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalRecords) * 100)
    }));

    const personnelData = Object.entries(personnelCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalRecords) * 100)
    }));

    const professionData = Object.entries(professionCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalRecords) * 100)
    }));

    const resultData = Object.entries(resultCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalRecords) * 100)
    }));

    return {
      totalRecords,
      averageDuration,
      reminderStats: {
        total: reminderCount,
        overdue: overdueCount,
        final: finalReminderCount,
        percentage: Math.round((reminderCount / totalRecords) * 100)
      },
      kriterData,
      sourceData,
      meetingTypeData,
      officeData,
      personnelData,
      professionData,
      resultData,
      // Get unique values for filters
      uniquePersonnel: [...new Set(filteredData.map(item => 
        item['Atanan Personel'] || item.assignedPersonnel || 'Atanmamış'
      ))],
      uniqueOffices: [...new Set(filteredData.map(item => 
        item['Ofis'] || item.ofis || 'Ana Ofis'
      ))],
      uniqueKritler: [...new Set(filteredData.map(item => 
        item['Kriter'] || item.kriter || 'Belirtilmemiş'
      ))]
    };
  }, [takipteData, selectedPersonnel, selectedOffice, selectedKriter, hasData]);

  if (!hasData) {
    return (
      <div className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>⚠️ Takip Verisi Bulunamadı:</strong> Takipte analizi için ikinci dosyayı (Takip dosyası) yüklemeniz gerekiyor.
            <br />
            <span className="text-sm mt-2 block">
              Bu dosya Kriter, İrtibat Müşteri Kaynağı, Görüşme Tipi, Hatırlatma bilgileri, Konuşma Süresi ve Son Sonuç kolonlarını içermelidir.
            </span>
          </AlertDescription>
        </Alert>
        
        <Card className="text-center py-8">
          <CardContent>
            <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Takip Verisi Bekleniyor</h3>
            <p className="text-gray-600 mb-4">
              Detaylı takip analizi için ikinci dosyayı Akıllı Veri Girişi sekmesinden yükleyin.
            </p>
            <div className="text-sm text-gray-500">
              Desteklenen format: Excel (.xlsx), CSV (.csv), JSON (.json)
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📞 Unified Takip Analizi</h2>
          <p className="text-gray-600 mt-1">Takipte analizi ve takip raporu birleşik görünümü</p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline">📊 {analytics?.totalRecords || 0} Kayıt</Badge>
          <Badge variant="outline">⏱️ {analytics?.averageDuration || 0} dk ort.</Badge>
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
            <div className="text-2xl font-bold">{analytics?.totalRecords || 0}</div>
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
            <div className="text-2xl font-bold">{analytics?.averageDuration || 0} dk</div>
            <p className="text-green-100 text-xs">Konuşma süresi</p>
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
            <div className="text-2xl font-bold">{analytics?.reminderStats.total || 0}</div>
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
            <div className="text-2xl font-bold">{analytics?.reminderStats.final || 0}</div>
            <p className="text-purple-100 text-xs">Final aşamasında</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex gap-2">
          <Select value={selectedPersonnel} onValueChange={setSelectedPersonnel}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Personel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Personel</SelectItem>
              {analytics?.uniquePersonnel.map(person => (
                <SelectItem key={person} value={person}>{person}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedOffice} onValueChange={setSelectedOffice}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ofis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Ofisler</SelectItem>
              {analytics?.uniqueOffices.map(office => (
                <SelectItem key={office} value={office}>{office}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedKriter} onValueChange={setSelectedKriter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Kriter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kriterler</SelectItem>
              {analytics?.uniqueKritler.map(kriter => (
                <SelectItem key={kriter} value={kriter}>{kriter}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="kriter" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="kriter">Müşteri Kriterleri</TabsTrigger>
          <TabsTrigger value="sources">Kaynak Analizi</TabsTrigger>
          <TabsTrigger value="meetings">Görüşme Analizi</TabsTrigger>
          <TabsTrigger value="personnel">Personel Analizi</TabsTrigger>
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
                  <InteractiveChart
                    title="Kriter Dağılımı"
                    data={analytics.kriterData}
                    chartType={chartType}
                    height={300}
                    colors={['#3b82f6', '#ef4444', '#10b981']}
                  />
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
                  <InteractiveChart
                    title="Ofis Dağılımı"
                    data={analytics.officeData}
                    chartType={chartType}
                    height={300}
                    colors={colors}
                  />
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
                <CardDescription>Instagram, Facebook, Referans, vb.</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.sourceData && (
                  <InteractiveChart
                    title="Kaynak Dağılımı"
                    data={analytics.sourceData}
                    chartType={chartType}
                    height={300}
                    colors={colors}
                  />
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
                  <InteractiveChart
                    title="Meslek Dağılımı"
                    data={analytics.professionData}
                    chartType={chartType}
                    height={300}
                    colors={colors}
                  />
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
                <CardDescription>Giden/Gelen arama, Kendisi geldi, vb.</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.meetingTypeData && (
                  <InteractiveChart
                    title="Görüşme Tipleri"
                    data={analytics.meetingTypeData}
                    chartType={chartType}
                    height={300}
                    colors={colors}
                  />
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
                  <InteractiveChart
                    title="Sonuç Dağılımı"
                    data={analytics.resultData}
                    chartType={chartType}
                    height={300}
                    colors={colors}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personel Takip Performansı</CardTitle>
              <CardDescription>Personel bazlı takip aktivite analizi</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.personnelData && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.personnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Takip Sayısı" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Footer */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📈 Takip Analizi Özeti
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">{analytics?.totalRecords || 0}</span>
                <br />Toplam Kayıt
              </div>
              <div>
                <span className="font-medium">{analytics?.averageDuration || 0} dk</span>
                <br />Ortalama Süre
              </div>
              <div>
                <span className="font-medium">{analytics?.reminderStats.percentage || 0}%</span>
                <br />Hatırlatmalı
              </div>
              <div>
                <span className="font-medium">{analytics?.reminderStats.overdue || 0}</span>
                <br />Gecikmiş
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}