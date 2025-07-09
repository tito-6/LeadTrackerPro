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

// Status definitions with colors (using actual imported data statuses)
const statusConfig = {
  'Ulaşılamıyor - Cevap Vermiyor': { label: 'Ulaşılamıyor', color: '#ff9800', bgColor: 'bg-orange-100' },
  'Yeni': { label: 'Yeni Lead', color: '#2196f3', bgColor: 'bg-blue-100' },
  'Takipte': { label: 'Takipte', color: '#ffeb3b', bgColor: 'bg-yellow-100' },
  'Bilgi Verildi': { label: 'Bilgi Verildi', color: '#9c27b0', bgColor: 'bg-purple-100' },
  'Olumsuz': { label: 'Olumsuz', color: '#f44336', bgColor: 'bg-red-100' },
  'Toplantı/Birebir Görüşme': { label: 'Toplantı', color: '#3f51b5', bgColor: 'bg-indigo-100' },
  'Potansiyel Takipte': { label: 'Potansiyel', color: '#607d8b', bgColor: 'bg-slate-100' },
  'Satış': { label: 'Satış', color: '#4caf50', bgColor: 'bg-green-100' },
  'Tanımsız': { label: 'Tanımsız', color: '#795548', bgColor: 'bg-gray-100' },
  'Bilinmiyor': { label: 'Bilinmiyor', color: '#9e9e9e', bgColor: 'bg-gray-100' },
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

  // Calculate statistics using actual imported data statuses
  // Note: All leads are currently 'kiralama' type based on imported data
  const salesLeads = salespersonLeads.filter(lead => lead.leadType === 'satis');
  const rentalLeads = salespersonLeads.filter(lead => lead.leadType === 'kiralama');

  console.log('Salesperson Performance Debug:', {
    salespersonName: salesperson.name,
    totalLeads: salespersonLeads.length,
    salesLeads: salesLeads.length,
    rentalLeads: rentalLeads.length,
    sampleStatuses: salespersonLeads.slice(0, 3).map(l => l.status),
    uniqueStatuses: [...new Set(salespersonLeads.map(l => l.status))]
  });

  const salesStats = {
    total: salesLeads.length,
    'Ulaşılamıyor - Cevap Vermiyor': salesLeads.filter(l => l.status === 'Ulaşılamıyor - Cevap Vermiyor').length,
    'Takipte': salesLeads.filter(l => l.status === 'Takipte').length,
    'Bilgi Verildi': salesLeads.filter(l => l.status === 'Bilgi Verildi').length,
    'Olumsuz': salesLeads.filter(l => l.status === 'Olumsuz').length,
    'Toplantı/Birebir Görüşme': salesLeads.filter(l => l.status === 'Toplantı/Birebir Görüşme').length,
    'Potansiyel Takipte': salesLeads.filter(l => l.status === 'Potansiyel Takipte').length,
    'Satış': salesLeads.filter(l => l.status === 'Satış').length,
    'Yeni': salesLeads.filter(l => l.status === 'Yeni').length,
    'Tanımsız': salesLeads.filter(l => l.status === 'Tanımsız').length,
    'Bilinmiyor': salesLeads.filter(l => l.status === 'Bilinmiyor').length,
  };

  const rentalStats = {
    total: rentalLeads.length,
    'Ulaşılamıyor - Cevap Vermiyor': rentalLeads.filter(l => l.status === 'Ulaşılamıyor - Cevap Vermiyor').length,
    'Takipte': rentalLeads.filter(l => l.status === 'Takipte').length,
    'Bilgi Verildi': rentalLeads.filter(l => l.status === 'Bilgi Verildi').length,
    'Olumsuz': rentalLeads.filter(l => l.status === 'Olumsuz').length,
    'Toplantı/Birebir Görüşme': rentalLeads.filter(l => l.status === 'Toplantı/Birebir Görüşme').length,
    'Potansiyel Takipte': rentalLeads.filter(l => l.status === 'Potansiyel Takipte').length,
    'Satış': rentalLeads.filter(l => l.status === 'Satış').length,
    'Yeni': rentalLeads.filter(l => l.status === 'Yeni').length,
    'Tanımsız': rentalLeads.filter(l => l.status === 'Tanımsız').length,
    'Bilinmiyor': rentalLeads.filter(l => l.status === 'Bilinmiyor').length,
  };

  const salesTargetPercentage = salesperson.monthlyTarget > 0 ? 
    Math.round((salesStats['Satış'] / salesperson.monthlyTarget) * 100) : 0;

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
                
                {/* Performance Details Table */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">📊 Detaylı Performans Raporu</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Durum</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Satış Leads</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Kiralama Leads</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Toplam</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Yüzde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(statusConfig).map(([statusKey, config]) => {
                          const salesCount = salesStats[statusKey] || 0;
                          const rentalCount = rentalStats[statusKey] || 0;
                          const total = salesCount + rentalCount;
                          const percentage = salespersonLeads.length > 0 ? ((total / salespersonLeads.length) * 100).toFixed(1) : '0';
                          
                          if (total === 0) return null;
                          
                          return (
                            <tr key={statusKey}>
                              <td className="border border-gray-300 px-4 py-2">
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: config.color }}
                                  ></div>
                                  {config.label}
                                </div>
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{salesCount}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{rentalCount}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center font-semibold">{total}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{percentage}%</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-bold">
                          <td className="border border-gray-300 px-4 py-2">TOPLAM</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{salesStats.total}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{rentalStats.total}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{salespersonLeads.length}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
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
                
                {/* Sales Details Table */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">💼 Satış Lead Detayları</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Distribution Table */}
                    <div>
                      <h5 className="font-medium mb-2">Durum Dağılımı</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-blue-50">
                              <th className="border border-gray-300 px-3 py-2 text-left">Durum</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">Adet</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">Yüzde</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(salesStats).filter(([key]) => key !== 'total').map(([key, value]) => {
                              const percentage = salesStats.total > 0 ? ((value as number / salesStats.total) * 100).toFixed(1) : '0';
                              if (value === 0) return null;
                              return (
                                <tr key={key}>
                                  <td className="border border-gray-300 px-3 py-2">
                                    <div className="flex items-center">
                                      <div 
                                        className="w-2 h-2 rounded-full mr-2" 
                                        style={{ backgroundColor: statusConfig[key]?.color || '#gray' }}
                                      ></div>
                                      {statusConfig[key]?.label || key}
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">{value}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">{percentage}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Lead Source Analysis */}
                    <div>
                      <h5 className="font-medium mb-2">Kaynak Analizi</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-green-50">
                              <th className="border border-gray-300 px-3 py-2 text-left">Kaynak</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">Adet</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(new Set(salespersonLeads.filter(l => l.leadType === 'satis').map(l => l.firstCustomerSource || 'Bilinmiyor')))
                              .map(source => ({
                                source,
                                count: salespersonLeads.filter(l => l.leadType === 'satis' && (l.firstCustomerSource || 'Bilinmiyor') === source).length
                              }))
                              .sort((a, b) => b.count - a.count)
                              .map(({ source, count }) => (
                                <tr key={source}>
                                  <td className="border border-gray-300 px-3 py-2">{source}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">{count}</td>
                                </tr>
                              ))
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Recent Sales Activity */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">🕒 Son Satış Aktiviteleri</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-3 py-2 text-left">Müşteri</th>
                          <th className="border border-gray-300 px-3 py-2 text-center">Durum</th>
                          <th className="border border-gray-300 px-3 py-2 text-center">Tarih</th>
                          <th className="border border-gray-300 px-3 py-2 text-center">Kaynak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salespersonLeads.filter(l => l.leadType === 'satis').slice(0, 10).map((lead, index) => (
                          <tr key={lead.id || index}>
                            <td className="border border-gray-300 px-3 py-2">{lead.customerName}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              <span 
                                className="px-2 py-1 rounded text-xs text-white"
                                style={{ backgroundColor: statusConfig[lead.status]?.color || '#gray' }}
                              >
                                {statusConfig[lead.status]?.label || lead.status}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{lead.requestDate}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{lead.firstCustomerSource || 'Bilinmiyor'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                
                {/* Rental Details Table */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">🏠 Kiralama Lead Detayları</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Distribution Table */}
                    <div>
                      <h5 className="font-medium mb-2">Durum Dağılımı</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-orange-50">
                              <th className="border border-gray-300 px-3 py-2 text-left">Durum</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">Adet</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">Yüzde</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(rentalStats).filter(([key]) => key !== 'total').map(([key, value]) => {
                              const percentage = rentalStats.total > 0 ? ((value as number / rentalStats.total) * 100).toFixed(1) : '0';
                              if (value === 0) return null;
                              return (
                                <tr key={key}>
                                  <td className="border border-gray-300 px-3 py-2">
                                    <div className="flex items-center">
                                      <div 
                                        className="w-2 h-2 rounded-full mr-2" 
                                        style={{ backgroundColor: statusConfig[key]?.color || '#gray' }}
                                      ></div>
                                      {statusConfig[key]?.label || key}
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">{value}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">{percentage}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Lead Source Analysis */}
                    <div>
                      <h5 className="font-medium mb-2">Kaynak Analizi</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-purple-50">
                              <th className="border border-gray-300 px-3 py-2 text-left">Kaynak</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">Adet</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(new Set(salespersonLeads.filter(l => l.leadType === 'kiralama').map(l => l.firstCustomerSource || 'Bilinmiyor')))
                              .map(source => ({
                                source,
                                count: salespersonLeads.filter(l => l.leadType === 'kiralama' && (l.firstCustomerSource || 'Bilinmiyor') === source).length
                              }))
                              .sort((a, b) => b.count - a.count)
                              .map(({ source, count }) => (
                                <tr key={source}>
                                  <td className="border border-gray-300 px-3 py-2">{source}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">{count}</td>
                                </tr>
                              ))
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Recent Rental Activity */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">🕒 Son Kiralama Aktiviteleri</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-3 py-2 text-left">Müşteri</th>
                          <th className="border border-gray-300 px-3 py-2 text-center">Durum</th>
                          <th className="border border-gray-300 px-3 py-2 text-center">Tarih</th>
                          <th className="border border-gray-300 px-3 py-2 text-center">Kaynak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salespersonLeads.filter(l => l.leadType === 'kiralama').slice(0, 10).map((lead, index) => (
                          <tr key={lead.id || index}>
                            <td className="border border-gray-300 px-3 py-2">{lead.customerName}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              <span 
                                className="px-2 py-1 rounded text-xs text-white"
                                style={{ backgroundColor: statusConfig[lead.status]?.color || '#gray' }}
                              >
                                {statusConfig[lead.status]?.label || lead.status}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{lead.requestDate}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{lead.firstCustomerSource || 'Bilinmiyor'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
