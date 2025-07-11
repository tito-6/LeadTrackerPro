import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, TrendingUp, Target, Clock, Phone, FileText, Eye } from 'lucide-react';
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import UniversalFilter, { UniversalFilters } from "@/components/ui/universal-filter";
import { getStandardColor, getStatusColor, getPersonnelColor } from '@/lib/color-system';

interface SalespersonPageProps {
  salespersonName: string;
}

export default function SalespersonPage({ salespersonName }: SalespersonPageProps) {
  const [filters, setFilters] = useState<UniversalFilters>({
    startDate: '',
    endDate: '',
    month: '',
    year: '',
    leadType: '',
    projectName: '',
    salesRep: '',
    status: ''
  });

  // Fetch leads data
  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  // Get unique projects and statuses for filtering
  const availableProjects = useMemo(() => {
    const projects = allLeads
      .filter(lead => lead.projectName)
      .map(lead => lead.projectName)
      .filter(Boolean);
    return [...new Set(projects)];
  }, [allLeads]);

  const availableStatuses = useMemo(() => {
    const statuses = allLeads
      .map(lead => lead.status)
      .filter(Boolean);
    return [...new Set(statuses)];
  }, [allLeads]);

  // Filter leads for this salesperson
  const filteredLeads = useMemo(() => {
    let leads = allLeads.filter(lead => lead.assignedPersonnel === salespersonName);
    
    // Apply universal filters
    if (filters.startDate) {
      leads = leads.filter(lead => {
        const leadDate = new Date(lead.requestDate || lead.createdAt || '');
        return leadDate >= new Date(filters.startDate);
      });
    }
    
    if (filters.endDate) {
      leads = leads.filter(lead => {
        const leadDate = new Date(lead.requestDate || lead.createdAt || '');
        return leadDate <= new Date(filters.endDate);
      });
    }
    
    if (filters.month) {
      leads = leads.filter(lead => {
        const leadDate = new Date(lead.requestDate || lead.createdAt || '');
        return (leadDate.getMonth() + 1).toString().padStart(2, '0') === filters.month;
      });
    }
    
    if (filters.year) {
      leads = leads.filter(lead => {
        const leadDate = new Date(lead.requestDate || lead.createdAt || '');
        return leadDate.getFullYear().toString() === filters.year;
      });
    }
    
    if (filters.leadType) {
      leads = leads.filter(lead => lead.leadType === filters.leadType);
    }
    
    if (filters.projectName) {
      leads = leads.filter(lead => lead.projectName === filters.projectName);
    }
    
    if (filters.status) {
      leads = leads.filter(lead => lead.status === filters.status);
    }
    
    return leads;
  }, [allLeads, salespersonName, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const satisLeads = filteredLeads.filter(lead => lead.leadType === 'satis');
    const kiralamaLeads = filteredLeads.filter(lead => lead.leadType === 'kiralama');
    const olumsuzLeads = filteredLeads.filter(lead => lead.status?.includes('Olumsuz'));
    const takipteLeads = filteredLeads.filter(lead => lead.status?.includes('Takipte'));
    const satisYapilanLeads = filteredLeads.filter(lead => lead.soldStatus === 'Evet');
    
    return {
      total,
      satis: satisLeads.length,
      kiralama: kiralamaLeads.length,
      olumsuz: olumsuzLeads.length,
      takipte: takipteLeads.length,
      satisYapilan: satisYapilanLeads.length,
      conversion: total > 0 ? Math.round((satisYapilanLeads.length / total) * 100) : 0
    };
  }, [filteredLeads]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const statusCounts = filteredLeads.reduce((acc, lead) => {
      const status = lead.status || 'Belirtilmemiş';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: status,
        value: count,
        color: getStatusColor(status)
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Lead type distribution
  const leadTypeData = useMemo(() => {
    const typeData = [
      { name: 'Satılık', value: stats.satis, color: getStandardColor('SALES') },
      { name: 'Kiralık', value: stats.kiralama, color: getStandardColor('RENTAL') }
    ];
    return typeData.filter(item => item.value > 0);
  }, [stats]);

  // Project distribution
  const projectData = useMemo(() => {
    const projectCounts = filteredLeads.reduce((acc, lead) => {
      const project = lead.projectName || 'Belirtilmemiş';
      acc[project] = (acc[project] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(projectCounts)
      .map(([project, count]) => ({
        name: project.length > 20 ? project.substring(0, 20) + '...' : project,
        fullName: project,
        value: count,
        color: getStandardColor('PROJECT', project)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredLeads]);

  // Recent leads
  const recentLeads = useMemo(() => {
    return filteredLeads
      .sort((a, b) => new Date(b.requestDate || b.createdAt || '').getTime() - new Date(a.requestDate || a.createdAt || '').getTime())
      .slice(0, 10);
  }, [filteredLeads]);

  const handleFilterChange = (newFilters: UniversalFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            {salespersonName}
          </h1>
          <p className="text-sm text-gray-500">Personel Performans Raporu</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {stats.total} toplam lead
        </Badge>
      </div>

      {/* Universal Filters */}
      <UniversalFilter
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        availableProjects={availableProjects}
        availableStatuses={availableStatuses}
        showSalesRepFilter={false}
      />

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Lead</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Bu dönem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satılık Lead</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.satis}</div>
            <p className="text-xs text-muted-foreground">
              %{stats.total > 0 ? Math.round((stats.satis / stats.total) * 100) : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kiralık Lead</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.kiralama}</div>
            <p className="text-xs text-muted-foreground">
              %{stats.total > 0 ? Math.round((stats.kiralama / stats.total) * 100) : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Takipte</CardTitle>
            <Phone className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.takipte}</div>
            <p className="text-xs text-muted-foreground">Aktif takip</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Olumsuz</CardTitle>
            <FileText className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.olumsuz}</div>
            <p className="text-xs text-muted-foreground">Olumsuz sonuç</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satış Yapılan</CardTitle>
            <Target className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.satisYapilan}</div>
            <p className="text-xs text-muted-foreground">%{stats.conversion} dönüşüm</p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">📊 Genel Bakış</TabsTrigger>
          <TabsTrigger value="leads">📋 Lead Listesi</TabsTrigger>
          <TabsTrigger value="projects">🏢 Projeler</TabsTrigger>
          <TabsTrigger value="performance">📈 Performans</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Durum Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`status-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lead Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Tipi Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadTypeData.map((entry, index) => (
                        <Cell key={`type-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Son Lead'ler ({recentLeads.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={recentLeads}
                columns={[
                  { key: 'customerName', header: 'Müşteri' },
                  { key: 'leadType', header: 'Tip' },
                  { key: 'projectName', header: 'Proje' },
                  { key: 'status', header: 'Durum' },
                  { key: 'requestDate', header: 'Tarih' }
                ]}
                searchable
                sortable
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proje Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={projectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [value, 'Lead Sayısı']}
                    labelFormatter={(label) => {
                      const item = projectData.find(p => p.name === label);
                      return item ? item.fullName : label;
                    }}
                  />
                  <Bar dataKey="value" fill="#8884d8">
                    {projectData.map((entry, index) => (
                      <Cell key={`project-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dönüşüm Oranı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">%{stats.conversion}</div>
                <p className="text-sm text-gray-500">Satış başarı oranı</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Olumsuzluk Oranı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  %{stats.total > 0 ? Math.round((stats.olumsuz / stats.total) * 100) : 0}
                </div>
                <p className="text-sm text-gray-500">Olumsuz sonuç oranı</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Aktif Takip</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  %{stats.total > 0 ? Math.round((stats.takipte / stats.total) * 100) : 0}
                </div>
                <p className="text-sm text-gray-500">Takipte olan lead oranı</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}