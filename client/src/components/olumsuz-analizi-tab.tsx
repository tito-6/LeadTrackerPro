import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingDown, Users, Target, FileText, Calendar, Phone } from 'lucide-react';
import { MasterDataTable } from "@/components/ui/master-data-table";
import { DataTable } from "@/components/ui/data-table";
import DateFilter from './ui/date-filter';
import { getStandardColor, getPersonnelColor, getStatusColor } from '@/lib/color-system';

interface NegativeAnalysisData {
  totalNegative: number;
  totalLeads: number;
  negativePercentage: number;
  reasonAnalysis: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  personnelAnalysis: Array<{
    personnel: string;
    count: number;
    percentage: number;
  }>;
}

export default function OlumsuzAnaliziTab() {
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>('all');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('bar');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: '',
    month: '',
    year: ''
  });

  // Fetch negative analysis data
  const { data: negativeAnalysis, isLoading } = useQuery<NegativeAnalysisData>({
    queryKey: ['/api/negative-analysis', dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/negative-analysis?${params.toString()}`);
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Fetch detailed leads data for advanced table
  const { data: leadsData = [] } = useQuery({
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

  // Filter negative leads based on selections
  const filteredNegativeLeads = useMemo(() => {
    return leadsData.filter(lead => {
      const hasNegativeReason = lead.negativeReason && lead.negativeReason.trim() !== '';
      const matchesPersonnel = selectedPersonnel === 'all' || lead.assignedPersonnel === selectedPersonnel;
      const matchesReason = selectedReason === 'all' || lead.negativeReason === selectedReason;
      
      return hasNegativeReason && matchesPersonnel && matchesReason;
    });
  }, [leadsData, selectedPersonnel, selectedReason]);

  // Get unique personnel and reasons for filtering
  const uniquePersonnel = useMemo(() => {
    const personnel = leadsData
      .filter(lead => lead.negativeReason && lead.negativeReason.trim() !== '')
      .map(lead => lead.assignedPersonnel)
      .filter(Boolean);
    return [...new Set(personnel)];
  }, [leadsData]);

  const uniqueReasons = useMemo(() => {
    const reasons = leadsData
      .filter(lead => lead.negativeReason && lead.negativeReason.trim() !== '')
      .map(lead => lead.negativeReason)
      .filter(Boolean);
    return [...new Set(reasons)];
  }, [leadsData]);

  // Optimize reason display for "all" view - limit to top 10 reasons
  const optimizedReasonData = useMemo(() => {
    if (!negativeAnalysis?.reasonAnalysis) return [];
    
    if (selectedPersonnel === 'all') {
      // Show only top 10 reasons when all personnel selected
      return negativeAnalysis.reasonAnalysis
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => ({
          ...item,
          name: item.reason.length > 25 ? item.reason.substring(0, 25) + '...' : item.reason,
          fullReason: item.reason
        }));
    }
    
    // Show all reasons when specific personnel selected
    return negativeAnalysis.reasonAnalysis.map(item => ({
      ...item,
      name: item.reason,
      fullReason: item.reason
    }));
  }, [negativeAnalysis, selectedPersonnel]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Olumsuz analiz verileri yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                ❌ Olumsuzluk Nedenleri Analizi
              </CardTitle>
              <CardDescription>
                Olumsuz lead'lerin detaylı analizi ve nedenlerin incelenmesi
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Özet</SelectItem>
                  <SelectItem value="detailed">Detaylı</SelectItem>
                </SelectContent>
              </Select>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <DateFilter
              startDate={dateFilters.startDate}
              endDate={dateFilters.endDate}
              month={dateFilters.month}
              year={dateFilters.year}
              onFiltersChange={setDateFilters}
            />
            <Select value={selectedPersonnel} onValueChange={setSelectedPersonnel}>
              <SelectTrigger>
                <SelectValue placeholder="Personel Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Personel</SelectItem>
                {uniquePersonnel.map(personnel => (
                  <SelectItem key={personnel} value={personnel}>{personnel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Neden Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Nedenler</SelectItem>
                {uniqueReasons.map(reason => (
                  <SelectItem key={reason} value={reason}>
                    {reason.length > 30 ? reason.substring(0, 30) + '...' : reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {negativeAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Olumsuz Lead</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{filteredNegativeLeads.length}</div>
              <p className="text-xs text-muted-foreground">
                Tüm lead'lerin %{Math.round((filteredNegativeLeads.length / (negativeAnalysis.totalLeads || 1)) * 100)}'i
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Farklı Neden Sayısı</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{uniqueReasons.length}</div>
              <p className="text-xs text-muted-foreground">
                Benzersiz olumsuzluk nedeni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Etkilenen Personel</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{uniquePersonnel.length}</div>
              <p className="text-xs text-muted-foreground">
                Olumsuz lead'e sahip personel
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Çok Görülen</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-purple-600">
                {negativeAnalysis.reasonAnalysis[0]?.reason.substring(0, 20) + (negativeAnalysis.reasonAnalysis[0]?.reason.length > 20 ? '...' : '') || 'Veri yok'}
              </div>
              <p className="text-xs text-muted-foreground">
                {negativeAnalysis.reasonAnalysis[0]?.count || 0} lead (%{negativeAnalysis.reasonAnalysis[0]?.percentage || 0})
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Tabs */}
      <Tabs defaultValue="reasons" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reasons">Olumsuzluk Nedenleri</TabsTrigger>
          <TabsTrigger value="personnel">Personel Analizi</TabsTrigger>
          <TabsTrigger value="detailed">Detaylı Liste</TabsTrigger>
        </TabsList>

        <TabsContent value="reasons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Olumsuzluk Nedenleri Dağılımı
                {selectedPersonnel === 'all' && (
                  <Badge variant="secondary">İlk 10 neden gösteriliyor</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedPersonnel === 'all' 
                  ? 'Tüm personel için en sık görülen olumsuzluk nedenleri (optimize edilmiş görünüm)'
                  : `${selectedPersonnel} için olumsuzluk nedenleri`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizedReasonData.length > 0 ? (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={400}>
                      {chartType === 'pie' ? (
                        <PieChart>
                          <Pie
                            data={optimizedReasonData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `%${percentage}`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {optimizedReasonData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getStandardColor('NEGATIVE', entry.fullReason)} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => [
                              `${value} lead`,
                              props.payload.fullReason
                            ]}
                          />
                        </PieChart>
                      ) : (
                        <BarChart data={optimizedReasonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100}
                            interval={0}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name, props) => [
                              `${value} lead`,
                              props.payload.fullReason
                            ]}
                          />
                          <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  
                  <DataTable
                    title="Olumsuzluk Nedenleri Detayları"
                    data={optimizedReasonData.map(item => ({
                      'Neden': item.fullReason,
                      'Adet': item.count,
                      'Yüzde': `%${item.percentage}`
                    }))}
                  />
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Seçilen kriterlere uygun olumsuz lead bulunamadı</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>👥 Personel Bazında Olumsuz Lead Analizi</CardTitle>
              <CardDescription>
                Personel performansı ve olumsuz lead dağılımı
              </CardDescription>
            </CardHeader>
            <CardContent>
              {negativeAnalysis?.personnelAnalysis && negativeAnalysis.personnelAnalysis.length > 0 ? (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={negativeAnalysis.personnelAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="personnel" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]}>
                          {negativeAnalysis.personnelAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getPersonnelColor(entry.personnel)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <DataTable
                    title="Personel Olumsuz Lead Detayları"
                    data={negativeAnalysis.personnelAnalysis.map(item => ({
                      'Personel': item.personnel,
                      'Olumsuz Lead': item.count,
                      'Yüzde': `%${item.percentage}`
                    }))}
                  />
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Personel analizi için veri bulunamadı</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📋 Olumsuz Lead'ler - Detaylı Liste</CardTitle>
              <CardDescription>
                Tüm olumsuz lead'lerin filtrelenebilir ve aranabilir listesi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredNegativeLeads.length > 0 ? (
                <MasterDataTable
                  title="Olumsuz Lead Detayları"
                  data={filteredNegativeLeads}
                  columns={[
                    { key: 'customerName', label: 'Müşteri Adı', type: 'text' },
                    { key: 'negativeReason', label: 'Olumsuzluk Nedeni', type: 'badge' },
                    { key: 'assignedPersonnel', label: 'Atanan Personel', type: 'badge' },
                    { key: 'projectName', label: 'Proje', type: 'text' },
                    { key: 'leadType', label: 'Lead Tipi', type: 'badge' },
                    { key: 'requestDate', label: 'Talep Tarihi', type: 'date' },
                    { key: 'status', label: 'Durum', type: 'badge' },
                    { key: 'lastMeetingNote', label: 'Son Görüşme Notu', type: 'text' },
                    { key: 'responseResult', label: 'Dönüş Sonucu', type: 'text' },
                    { key: 'firstCustomerSource', label: 'İlk Müşteri Kaynağı', type: 'text' },
                    { key: 'formCustomerSource', label: 'Form Müşteri Kaynağı', type: 'text' }
                  ]}
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Seçilen kriterlere uygun olumsuz lead bulunamadı</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedPersonnel === 'all' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Optimize Edilmiş Görünüm:</strong> Tüm personel seçildiğinde performans için sadece en sık görülen 10 olumsuzluk nedeni gösterilmektedir. 
            Belirli bir personel seçerek o personele ait tüm olumsuzluk nedenlerini görebilirsiniz.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}