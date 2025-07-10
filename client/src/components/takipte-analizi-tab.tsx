import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Lead, SalesRep } from "@shared/schema";
import { Calendar, Users, AlertTriangle, TrendingUp, Target } from "lucide-react";
import InteractiveChart from "./interactive-chart";
import DateFilter from "./ui/date-filter";

export default function TakipteAnaliziTab() {
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: '',
    month: '',
    year: ''
  });
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads', dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(dateFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/leads?${params.toString()}`);
      return response.json();
    },
  });
  
  const { data: salesReps = [] } = useQuery<SalesRep[]>({
    queryKey: ['/api/sales-reps'],
  });

  // Follow-up status mapping
  const followUpStatuses = [
    'Takipte', 'Potansiyel - Takipte', 'Randevulu', 'Randevusuz', 
    'Acil Takip', 'Bilgi Verildi - Tekrar Aranacak', 'Tekrar Aranacak'
  ];

  // Filter leads for follow-up analysis
  const followUpLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(lead => {
      const status = lead.status || '';
      const isFollowUp = followUpStatuses.some(fs => 
        status.toLowerCase().includes(fs.toLowerCase()) ||
        fs.toLowerCase().includes(status.toLowerCase())
      );
      
      // Apply filters
      let matchesSalesperson = !selectedSalesperson || selectedSalesperson === 'all' || lead.assignedPersonnel === selectedSalesperson;
      let matchesProject = !selectedProject || selectedProject === 'all' || (lead.projectName && lead.projectName.includes(selectedProject));
      
      return isFollowUp && matchesSalesperson && matchesProject;
    });
  }, [leads, selectedSalesperson, selectedProject]);

  // Group by status for chart
  const statusDistribution = useMemo(() => {
    if (!followUpLeads.length) return [];
    
    const statusCounts = followUpLeads.reduce((acc, lead) => {
      const status = lead.status || 'Tanımsız';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = followUpLeads.length;
    
    return Object.entries(statusCounts).map(([status, count], index) => ({
      name: status,
      value: count,
      percentage: Math.round((count / total) * 100),
      color: `hsl(${index * 45}, 70%, 50%)`
    }));
  }, [followUpLeads]);

  // Group by salesperson
  const salespersonDistribution = useMemo(() => {
    if (!followUpLeads.length) return [];
    
    const personCounts = followUpLeads.reduce((acc, lead) => {
      const person = lead.assignedPersonnel || 'Atanmamış';
      acc[person] = (acc[person] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = followUpLeads.length;
    
    return Object.entries(personCounts).map(([person, count], index) => ({
      name: person,
      value: count,
      percentage: Math.round((count / total) * 100),
      color: `hsl(${index * 60}, 65%, 55%)`
    }));
  }, [followUpLeads]);

  // Group by project
  const projectDistribution = useMemo(() => {
    if (!followUpLeads.length) return [];
    
    const projectCounts = followUpLeads.reduce((acc, lead) => {
      const project = lead.projectName || 'Proje Belirtilmemiş';
      acc[project] = (acc[project] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = followUpLeads.length;
    
    return Object.entries(projectCounts).map(([project, count], index) => ({
      name: project,
      value: count,
      percentage: Math.round((count / total) * 100),
      color: `hsl(${index * 40}, 75%, 60%)`
    }));
  }, [followUpLeads]);

  // Urgent follow-ups (older than 7 days)
  const urgentFollowUps = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return followUpLeads.filter(lead => {
      if (!lead.requestDate) return false;
      const requestDate = new Date(lead.requestDate);
      return requestDate < sevenDaysAgo;
    });
  }, [followUpLeads]);

  // Get unique projects and salespersons for filters
  const uniqueProjects = useMemo(() => {
    const projects = new Set(leads.map(lead => lead.projectName).filter(Boolean));
    return Array.from(projects);
  }, [leads]);

  const chartTypeOptions = [
    { value: 'pie' as const, label: 'Pasta Grafik', icon: '🥧' },
    { value: 'bar' as const, label: 'Sütun Grafik', icon: '📊' },
    { value: 'line' as const, label: 'Çizgi Grafik', icon: '📈' }
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
              📋 Takipte Analizi
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Takip edilmesi gereken leadlerin detaylı analizi
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
        
        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <DateFilter 
              onFilterChange={setDateFilters}
              initialFilters={dateFilters}
            />
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
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Takipte</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{followUpLeads.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Acil Takip</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{urgentFollowUps.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktif Personel</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{salespersonDistribution.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktif Proje</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{projectDistribution.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="p-6 shadow-lg border-2 border-blue-100 dark:border-blue-800">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              📊 Durum Dağılımı
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Takipte olan leadlerin durum analizi
            </p>
          </div>
          <InteractiveChart 
            title=""
            data={statusDistribution}
            height={300}
            chartType={chartType}
          />
        </Card>

        {/* Salesperson Distribution */}
        <Card className="p-6 shadow-lg border-2 border-green-100 dark:border-green-800">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              👥 Personel Dağılımı
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Takipte olan leadlerin personel bazında analizi
            </p>
          </div>
          <InteractiveChart 
            title=""
            data={salespersonDistribution}
            height={300}
            chartType={chartType}
          />
        </Card>
      </div>

      {/* Project Distribution */}
      {projectDistribution.length > 0 && (
        <Card className="p-6 shadow-lg border-2 border-purple-100 dark:border-purple-800">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              🏗️ Proje Dağılımı
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Takipte olan leadlerin proje bazında analizi
            </p>
          </div>
          <InteractiveChart 
            title=""
            data={projectDistribution}
            height={300}
            chartType={chartType}
          />
        </Card>
      )}

      {/* Urgent Follow-ups Table */}
      {urgentFollowUps.length > 0 && (
        <Card className="shadow-lg border-2 border-red-100 dark:border-red-800">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardTitle className="flex items-center text-red-700 dark:text-red-300">
              🚨 Acil Takip Gereken Leadler
            </CardTitle>
            <CardDescription>
              7 günden uzun süredir takipte olan leadler
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
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Talep Tarihi</th>
                    <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Gün Sayısı</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentFollowUps.map((lead, index) => {
                    const daysSinceRequest = lead.requestDate 
                      ? Math.floor((new Date().getTime() - new Date(lead.requestDate).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    
                    return (
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
                          <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {lead.requestDate ? new Date(lead.requestDate).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="p-3">
                          <span className={`font-bold ${
                            daysSinceRequest > 14 ? 'text-red-600 dark:text-red-400' :
                            daysSinceRequest > 7 ? 'text-orange-600 dark:text-orange-400' :
                            'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {daysSinceRequest} gün
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {followUpLeads.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Takipte Lead Bulunamadı
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Seçilen filtrelere göre takipte olan lead bulunmuyor.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}