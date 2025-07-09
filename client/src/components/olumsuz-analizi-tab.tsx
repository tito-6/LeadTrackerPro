import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Lead, SalesRep } from "@shared/schema";
import { TrendingDown, Users, AlertCircle, BarChart3, PieChart } from "lucide-react";
import InteractiveChart from "./interactive-chart";
import { DataTable } from "@/components/ui/data-table";
import SmartReasonsTable from "@/components/ui/smart-reasons-table";

export default function OlumsuzAnaliziTab() {
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });
  
  const { data: salesReps = [] } = useQuery<SalesRep[]>({
    queryKey: ['/api/sales-reps'],
  });

  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'reason' | 'personnel' | 'project'>('reason');

  // Filter for negative leads
  const negativeLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(lead => {
      const status = lead.status || '';
      const isNegative = status.toLowerCase().includes('olumsuz') || 
                        status.toLowerCase().includes('negative') ||
                        lead.negativeReason;
      
      // Apply filters
      let matchesSalesperson = !selectedSalesperson || selectedSalesperson === 'all' || lead.assignedPersonnel === selectedSalesperson;
      let matchesProject = !selectedProject || selectedProject === 'all' || (lead.projectName && lead.projectName.includes(selectedProject));
      
      return isNegative && matchesSalesperson && matchesProject;
    });
  }, [leads, selectedSalesperson, selectedProject]);

  // Group by negative reasons
  const reasonDistribution = useMemo(() => {
    if (!negativeLeads.length) return [];
    
    const reasonCounts = negativeLeads.reduce((acc, lead) => {
      const reason = lead.negativeReason || lead.callNote || lead.lastMeetingNote || 'Belirtilmemiş';
      
      // Standardize common negative reasons
      let standardizedReason = reason;
      const reasonText = reason.toLowerCase();
      
      if (reasonText.includes('gerekirse kendisi arayacak') || reasonText.includes('kendisi arayacak')) {
        standardizedReason = 'Gerekirse Kendisi Arayacak';
      } else if (reasonText.includes('yanlış numara') || reasonText.includes('yanliş numara')) {
        standardizedReason = 'Yanlış Numara';
      } else if (reasonText.includes('bütçe yetersiz') || reasonText.includes('butce yetersiz')) {
        standardizedReason = 'Bütçe Yetersiz';
      } else if (reasonText.includes('ilgilenmiyor') || reasonText.includes('ilgisiz')) {
        standardizedReason = 'İlgilenmiyor';
      } else if (reasonText.includes('başka yerde aldı') || reasonText.includes('baska yerde')) {
        standardizedReason = 'Başka Yerde Aldı';
      } else if (reasonText.includes('zamanı uygun değil') || reasonText.includes('zaman uygun degil')) {
        standardizedReason = 'Zamanı Uygun Değil';
      } else if (reasonText.includes('lokasyon uygun değil') || reasonText.includes('lokasyon uymuyor')) {
        standardizedReason = 'Lokasyon Uygun Değil';
      } else if (reasonText.includes('fiyat yüksek') || reasonText.includes('pahali')) {
        standardizedReason = 'Fiyat Yüksek';
      } else if (reasonText.includes('bilgi almak istedi') || reasonText.includes('sadece bilgi')) {
        standardizedReason = 'Sadece Bilgi Almak İstedi';
      } else if (!reason || reason.trim() === '') {
        standardizedReason = 'Belirtilmemiş';
      }
      
      acc[standardizedReason] = (acc[standardizedReason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = negativeLeads.length;
    
    return Object.entries(reasonCounts)
      .sort(([,a], [,b]) => b - a) // Sort by count descending
      .map(([reason, count], index) => ({
        name: reason,
        value: count,
        percentage: Math.round((count / total) * 100),
        color: `hsl(${index * 30}, 70%, 50%)`
      }));
  }, [negativeLeads]);

  // Group by personnel
  const personnelDistribution = useMemo(() => {
    if (!negativeLeads.length) return [];
    
    const personCounts = negativeLeads.reduce((acc, lead) => {
      const person = lead.assignedPersonnel || 'Atanmamış';
      acc[person] = (acc[person] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = negativeLeads.length;
    
    return Object.entries(personCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([person, count], index) => ({
        name: person,
        value: count,
        percentage: Math.round((count / total) * 100),
        color: `hsl(${index * 45}, 65%, 55%)`
      }));
  }, [negativeLeads]);

  // Group by project
  const projectDistribution = useMemo(() => {
    if (!negativeLeads.length) return [];
    
    const projectCounts = negativeLeads.reduce((acc, lead) => {
      const project = lead.projectName || 'Proje Belirtilmemiş';
      acc[project] = (acc[project] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = negativeLeads.length;
    
    return Object.entries(projectCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([project, count], index) => ({
        name: project,
        value: count,
        percentage: Math.round((count / total) * 100),
        color: `hsl(${index * 40}, 75%, 60%)`
      }));
  }, [negativeLeads]);

  // Get current chart data based on groupBy selection
  const currentChartData = useMemo(() => {
    switch (groupBy) {
      case 'personnel':
        return personnelDistribution;
      case 'project':
        return projectDistribution;
      default:
        return reasonDistribution;
    }
  }, [groupBy, reasonDistribution, personnelDistribution, projectDistribution]);

  // Get unique projects for filters
  const uniqueProjects = useMemo(() => {
    const projects = new Set(leads.map(lead => lead.projectName).filter(Boolean));
    return Array.from(projects);
  }, [leads]);

  const chartTypeOptions = [
    { value: 'pie' as const, label: 'Pasta Grafik', icon: '🥧' },
    { value: 'bar' as const, label: 'Sütun Grafik', icon: '📊' },
    { value: 'line' as const, label: 'Çizgi Grafik', icon: '📈' }
  ];

  const groupByOptions = [
    { value: 'reason' as const, label: 'Olumsuzluk Nedeni', icon: '📝' },
    { value: 'personnel' as const, label: 'Personel', icon: '👥' },
    { value: 'project' as const, label: 'Proje', icon: '🏗️' }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              📉 Olumsuz Analizi
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Olumsuz sonuçlanan leadlerin detaylı analizi ve nedenleri
            </p>
          </div>
          
          {/* Chart Type Selector */}
          <div className="flex space-x-2">
            {chartTypeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setChartType(option.value)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Filters and Grouping */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="groupby-selector">Gruplama</Label>
            <Select value={groupBy} onValueChange={(value: 'reason' | 'personnel' | 'project') => setGroupBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Gruplama Seçin" />
              </SelectTrigger>
              <SelectContent>
                {groupByOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="salesperson-filter">Personel Filtresi</Label>
            <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Personel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Personel</SelectItem>
                {salesReps.map(rep => (
                  <SelectItem key={rep.id} value={rep.name}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="project-filter">Proje Filtresi</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Projeler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Projeler</SelectItem>
                {uniqueProjects.map(project => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-red-500 rounded-lg">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Olumsuz</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{negativeLeads.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-orange-500 rounded-lg">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Farklı Neden</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{reasonDistribution.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Etkilenen Personel</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{personnelDistribution.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Olumsuzluk Oranı</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {leads.length > 0 ? Math.round((negativeLeads.length / leads.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="p-6 shadow-lg border-2 border-red-100 dark:border-red-800">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            📊 {groupByOptions.find(opt => opt.value === groupBy)?.label} Dağılımı
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Olumsuz leadlerin {groupByOptions.find(opt => opt.value === groupBy)?.label.toLowerCase()} bazında analizi
          </p>
        </div>
        <InteractiveChart 
          title=""
          data={currentChartData}
          height={400}
          chartType={chartType}
        />
        
        {/* Statistics table under the chart */}
        <div className="mt-6">
          <DataTable
            data={currentChartData.map(item => ({
              [groupByOptions.find(opt => opt.value === groupBy)?.label || 'Kategori']: item.name,
              'Adet': item.value,
              'Yüzde': `%${item.percentage}`
            }))}
            title={`${groupByOptions.find(opt => opt.value === groupBy)?.label} İstatistikleri`}
            className="border-t border-gray-200 dark:border-gray-700"
          />
        </div>
      </Card>

      {/* Smart Reasons Table for Pie Chart Mode */}
      {groupBy === 'reason' && reasonDistribution.length > 0 && chartType === 'pie' && reasonDistribution.length > 8 && (
        <SmartReasonsTable
          data={reasonDistribution}
          title="Olumsuzluk Nedenleri Detayları"
          className="mb-6"
        />
      )}

      {/* Detailed Breakdown */}
      {groupBy === 'reason' && reasonDistribution.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Reasons */}
          <Card className="shadow-lg border-2 border-orange-100 dark:border-orange-800">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
              <CardTitle className="flex items-center text-orange-700 dark:text-orange-300">
                🏆 En Sık Olumsuzluk Nedenleri
              </CardTitle>
              <CardDescription>
                En çok karşılaşılan olumsuz geri dönüş nedenleri
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3 p-6">
                {reasonDistribution.slice(0, 5).map((reason, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3" 
                        style={{ backgroundColor: reason.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {reason.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {reason.value}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {reason.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personnel Impact */}
          <Card className="shadow-lg border-2 border-purple-100 dark:border-purple-800">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <CardTitle className="flex items-center text-purple-700 dark:text-purple-300">
                👥 Personel Bazında Olumsuz Dağılım
              </CardTitle>
              <CardDescription>
                Personel performansında olumsuz etki analizi
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3 p-6">
                {personnelDistribution.slice(0, 5).map((person, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3" 
                        style={{ backgroundColor: person.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {person.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {person.value}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {person.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Table */}
      <Card className="shadow-lg border-2 border-gray-100 dark:border-gray-800">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-900/20">
          <CardTitle className="flex items-center text-gray-700 dark:text-gray-300">
            📋 Detaylı Olumsuz Lead Listesi
          </CardTitle>
          <CardDescription>
            Olumsuz sonuçlanan tüm leadlerin detayları
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Müşteri</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Personel</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Proje</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Durum</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Olumsuzluk Nedeni</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {negativeLeads.slice(0, 50).map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 ${
                      index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'
                    }`}
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{lead.customerName}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{lead.assignedPersonnel}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{lead.projectName || '-'}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-red-700 border-red-300">
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                      {lead.negativeReason || lead.callNote || lead.lastMeetingNote || 'Belirtilmemiş'}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {lead.requestDate ? new Date(lead.requestDate).toLocaleDateString('tr-TR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {negativeLeads.length > 50 && (
            <div className="p-4 text-center text-gray-600 dark:text-gray-400">
              İlk 50 kayıt gösteriliyor. Toplam {negativeLeads.length} olumsuz lead bulundu.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {negativeLeads.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <PieChart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Olumsuz Lead Bulunamadı
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Seçilen filtrelere göre olumsuz sonuçlanan lead bulunmuyor.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}