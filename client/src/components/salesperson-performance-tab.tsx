import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { Lead, SalesRep } from '@shared/schema';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  const { data: salesReps = [] } = useQuery<SalesRep[]>({
    queryKey: ['/api/sales-reps'],
  });

  const salesperson = salesReps.find(rep => rep.id === salespersonId);
  const salespersonLeads = leads.filter(lead => lead.assignedPersonnel === salesperson?.name);

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
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{salesperson.name} - Performans Detayları</span>
            <Badge variant={salesTargetPercentage >= 100 ? "default" : "secondary"}>
              Hedef: {salesTargetPercentage}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{salespersonLeads.length}</div>
              <div className="text-sm text-muted-foreground">Toplam Lead</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{salesStats.satildi + rentalStats.satildi}</div>
              <div className="text-sm text-muted-foreground">Toplam Satış</div>
            </div>
            <div className="text-center">
              <Progress value={salesTargetPercentage} className="mb-2" />
              <div className="text-sm text-muted-foreground">Hedef İlerlemesi</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Leads Section */}
        <Card>
          <CardHeader>
            <CardTitle>Satış Lead Raporu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sales Stats Table */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Toplam:</span>
                    <span className="font-medium">{salesStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yeni:</span>
                    <span className="font-medium text-blue-600">{salesStats.yeni}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Takipte:</span>
                    <span className="font-medium text-yellow-600">{salesStats.takipte}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Olumsuz:</span>
                    <span className="font-medium text-red-600">{salesStats.olumsuz}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Toplantı:</span>
                    <span className="font-medium text-indigo-600">{salesStats.toplanti}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Satış:</span>
                    <span className="font-medium text-green-600">{salesStats.satildi}</span>
                  </div>
                </div>
              </div>

              {/* Sales Pie Chart */}
              {salesPieData.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={salesPieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, value }) => `${value}`}
                      >
                        {salesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rental Leads Section */}
        <Card>
          <CardHeader>
            <CardTitle>Kiralama Lead Raporu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Rental Stats Table */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Toplam:</span>
                    <span className="font-medium">{rentalStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yeni:</span>
                    <span className="font-medium text-blue-600">{rentalStats.yeni}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Takipte:</span>
                    <span className="font-medium text-yellow-600">{rentalStats.takipte}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Olumsuz:</span>
                    <span className="font-medium text-red-600">{rentalStats.olumsuz}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Toplantı:</span>
                    <span className="font-medium text-indigo-600">{rentalStats.toplanti}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Satış:</span>
                    <span className="font-medium text-green-600">{rentalStats.satildi}</span>
                  </div>
                </div>
              </div>

              {/* Rental Pie Chart */}
              {rentalPieData.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rentalPieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, value }) => `${value}`}
                      >
                        {rentalPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Son Aktiviteler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {salespersonLeads.slice(0, 5).map((lead, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{lead.customerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {lead.leadType === 'satis' ? 'Satış' : 'Kiralama'} - {lead.requestDate}
                  </div>
                </div>
                <Badge variant={
                  lead.status === 'satildi' ? 'default' :
                  lead.status === 'olumsuz' ? 'destructive' :
                  lead.status === 'takipte' ? 'secondary' : 'outline'
                }>
                  {statusConfig[lead.status as keyof typeof statusConfig]?.label || lead.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}