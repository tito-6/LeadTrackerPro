import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Lead, SalesRep } from '@shared/schema';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Calendar, Filter, User, TrendingUp, Users, Target, Star, PhoneCall } from 'lucide-react';
import InteractiveChart from './interactive-chart';

interface SalespersonPerformanceTabProps {
  salespersonId: number;
}

// Status definitions with colors
const statusConfig = {
  'ulasilamiyor': { label: 'Ulaşılmıyor', color: '#ff9800', bgColor: 'bg-orange-100' },
  'yeni': { label: 'Yeni Lead', color: '#2196f3', bgColor: 'bg-blue-100' },
  'takipte': { label: 'Takipte', color: '#ffeb3b', bgColor: 'bg-yellow-100' },
  'olumsuz': { label: 'Olumsuz', color: '#f44336', bgColor: 'bg-red-100' },
  'toplanti': { label: 'Toplantı', color: '#3f51b5', bgColor: 'bg-indigo-100' },
  'satildi': { label: 'Satış', color: '#4caf50', bgColor: 'bg-green-100' },
};

export default function SalespersonPerformanceTab({ salespersonId }: SalespersonPerformanceTabProps) {
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: '',
    month: '',
    year: ''
  });
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ['/api/leads', dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/leads?${params.toString()}`);
      return response.json();
    }
  });

  const { data: salesReps = [] } = useQuery<SalesRep[]>({
    queryKey: ['/api/sales-reps'],
  });

  const { data: uniqueStatuses = [] } = useQuery<string[]>({
    queryKey: ['/api/status-values'],
  });

  // Fetch enhanced stats for unified data
  const { data: enhancedStats } = useQuery({
    queryKey: ['/api/enhanced-stats'],
    refetchInterval: 5000,
  });

  // Fetch takipte data for complete analysis
  const { data: takipteData = [] } = useQuery({
    queryKey: ['/api/takipte'],
  });

  const salesperson = salesReps.find(rep => rep.id === salespersonId);
  const salespersonLeads = leads.filter(lead => lead.assignedPersonnel === salesperson?.name);
  const hasSecondaryData = takipteData.length > 0;

  if (!salesperson) {
    return <div>Personel bulunamadı</div>;
  }

  // Calculate statistics
  const salesLeads = salespersonLeads.filter(lead => lead.leadType === 'satis');
  const rentalLeads = salespersonLeads.filter(lead => lead.leadType === 'kiralama');

  const salesStats = {
    total: salesLeads.length,
    ulasilamiyor: salesLeads.filter(l => l.status === 'ulasilamiyor').length,
    yeni: salesLeads.filter(l => l.status === 'yeni').length,
    takipte: salesLeads.filter(l => l.status === 'takipte').length,
    olumsuz: salesLeads.filter(l => l.status === 'olumsuz').length,
    toplanti: salesLeads.filter(l => l.status === 'toplanti').length,
    satildi: salesLeads.filter(l => l.status === 'satildi').length,
  };

  const rentalStats = {
    total: rentalLeads.length,
    ulasilamiyor: rentalLeads.filter(l => l.status === 'ulasilamiyor').length,
    yeni: rentalLeads.filter(l => l.status === 'yeni').length,
    takipte: rentalLeads.filter(l => l.status === 'takipte').length,
    olumsuz: rentalLeads.filter(l => l.status === 'olumsuz').length,
    toplanti: rentalLeads.filter(l => l.status === 'toplanti').length,
    satildi: rentalLeads.filter(l => l.status === 'satildi').length,
  };

  const salesTargetPercentage = salesperson.monthlyTarget > 0 ? 
    Math.round((salesStats.satildi / salesperson.monthlyTarget) * 100) : 0;

  // Pie chart data for sales leads
  const salesPieData = Object.entries(statusConfig)
    .map(([key, config]) => ({
      name: config.label,
      value: salesStats[key as keyof typeof salesStats] || 0,
      color: config.color,
    }))
    .filter(item => item.value > 0);

  // Pie chart data for rental leads  
  const rentalPieData = Object.entries(statusConfig)
    .map(([key, config]) => ({
      name: config.label,
      value: rentalStats[key as keyof typeof rentalStats] || 0,
      color: config.color,
    }))
    .filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header with unified design */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 {salesperson.name} - Performans Raporu</h2>
          <p className="text-gray-600 mt-1">🤖 AI-destekli performans analizi ve satış raporları</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">📊 Real-time: {salespersonLeads.length}</Badge>
          <Badge variant="outline">🎯 Hedef: {salesTargetPercentage}%</Badge>
          {hasSecondaryData && <Badge variant="outline">🔗 Dual-Source</Badge>}
        </div>
      </div>

      {/* KPI Cards matching main dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="mr-2 h-4 w-4" />
              📊 Toplam Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salespersonLeads.length}</div>
            <p className="text-blue-100 text-xs">Atanmış lead sayısı</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="mr-2 h-4 w-4" />
              🎯 Hedef Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesTargetPercentage}%</div>
            <Progress value={salesTargetPercentage} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Star className="mr-2 h-4 w-4" />
              💼 Satış Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesStats.total}</div>
            <p className="text-purple-100 text-xs">Satış odaklı leads</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <PhoneCall className="mr-2 h-4 w-4" />
              🏠 Kiralama Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rentalStats.total}</div>
            <p className="text-orange-100 text-xs">Kiralama odaklı leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Type Selector */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex gap-2">
          <Select value={chartType} onValueChange={(value: 'pie' | 'bar' | 'line') => setChartType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pie">🥧 Pasta Grafik</SelectItem>
              <SelectItem value="bar">📊 Sütun Grafik</SelectItem>
              <SelectItem value="line">📈 Çizgi Grafik</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">📊 Real-time</Badge>
          <Badge variant="outline">🤖 AI-Power</Badge>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performans Analizi</TabsTrigger>
          <TabsTrigger value="sales">Satış Analizi</TabsTrigger>
          <TabsTrigger value="rental">Kiralama Analizi</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📈 Genel Performans Dağılımı</CardTitle>
                <CardDescription>Tüm leadlerin durum analizi</CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart
                  title="Genel Performance"
                  data={[
                    ...Object.entries(salesStats).filter(([key]) => key !== 'total').map(([key, value]) => ({
                      name: `Satış ${statusConfig[key]?.label || key}`,
                      value: value as number,
                      percentage: Math.round(((value as number) / salespersonLeads.length) * 100)
                    })),
                    ...Object.entries(rentalStats).filter(([key]) => key !== 'total').map(([key, value]) => ({
                      name: `Kiralama ${statusConfig[key]?.label || key}`,
                      value: value as number,
                      percentage: Math.round(((value as number) / salespersonLeads.length) * 100)
                    }))
                  ].filter(item => item.value > 0)}
                  chartType={chartType}
                  height={500}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>💼 Satış Lead Dağılımı</CardTitle>
                <CardDescription>Satış leadlerinin durum analizi</CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart
                  title="Satış Performance"
                  data={Object.entries(salesStats).filter(([key]) => key !== 'total').map(([key, value]) => ({
                    name: statusConfig[key]?.label || key,
                    value: value as number,
                    percentage: Math.round(((value as number) / salesStats.total) * 100)
                  })).filter(item => item.value > 0)}
                  chartType={chartType}
                  height={500}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rental" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🏠 Kiralama Lead Dağılımı</CardTitle>
                <CardDescription>Kiralama leadlerinin durum analizi</CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart
                  title="Kiralama Performance"
                  data={Object.entries(rentalStats).filter(([key]) => key !== 'total').map(([key, value]) => ({
                    name: statusConfig[key]?.label || key,
                    value: value as number,
                    percentage: Math.round(((value as number) / rentalStats.total) * 100)
                  })).filter(item => item.value > 0)}
                  chartType={chartType}
                  height={500}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
