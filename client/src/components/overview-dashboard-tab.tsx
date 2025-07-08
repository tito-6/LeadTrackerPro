import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { Lead, SalesRep } from '@shared/schema';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Status definitions with colors matching the screenshot
const statusConfig = {
  'ulasilamiyor': { label: 'Ulaşılmıyor - Cevap Yok', color: '#ff9800', bgColor: 'bg-orange-100' },
  'yeni': { label: 'Aranmayan Lead', color: '#2196f3', bgColor: 'bg-blue-100' },
  'bilgi_hatali': { label: 'Ulaşılmıyor - Bilgi Hatalı', color: '#9c27b0', bgColor: 'bg-purple-100' },
  'takipte': { label: 'Potansiyel Takipte', color: '#ffeb3b', bgColor: 'bg-yellow-100' },
  'olumsuz': { label: 'Olumsuz', color: '#f44336', bgColor: 'bg-red-100' },
  'toplanti': { label: 'Toplantı - Birebir Görüşme', color: '#3f51b5', bgColor: 'bg-indigo-100' },
  'satildi': { label: 'Satış', color: '#4caf50', bgColor: 'bg-green-100' },
};

interface SalesPersonStats {
  personel: string;
  toplamLead: number;
  ulasilmiyorCevapYok: number;
  aranmayanLead: number;
  ulasilmiyorBilgiHatali: number;
  bilgiVerildiTekrarAranacak: number;
  olumsuz: number;
  toplantiBirebirGorusme: number;
  potansiyelTakipte: number;
  satis: number;
  target: number;
  percentage: number;
}

export default function OverviewDashboardTab() {
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  const { data: salesReps = [] } = useQuery<SalesRep[]>({
    queryKey: ['/api/sales-reps'],
  });

  // Calculate statistics per salesperson
  const salesPersonStats: SalesPersonStats[] = salesReps.map(rep => {
    const repLeads = leads.filter(lead => lead.assignedPersonnel === rep.name);
    
    const stats = {
      personel: rep.name,
      toplamLead: repLeads.length,
      ulasilmiyorCevapYok: repLeads.filter(l => l.status === 'ulasilamiyor').length,
      aranmayanLead: repLeads.filter(l => l.status === 'yeni').length,
      ulasilmiyorBilgiHatali: repLeads.filter(l => l.status === 'bilgi_hatali').length,
      bilgiVerildiTekrarAranacak: repLeads.filter(l => l.status === 'takipte' && l.callNote?.includes('tekrar')).length,
      olumsuz: repLeads.filter(l => l.status === 'olumsuz').length,
      toplantiBirebirGorusme: repLeads.filter(l => l.status === 'toplanti').length,
      potansiyelTakipte: repLeads.filter(l => l.status === 'takipte').length,
      satis: repLeads.filter(l => l.status === 'satildi').length,
      target: rep.monthlyTarget || 10,
      percentage: 0,
    };
    
    stats.percentage = stats.target > 0 ? Math.round((stats.satis / stats.target) * 100) : 0;
    
    return stats;
  });

  // Calculate totals
  const totals = {
    personel: 'TOPLAM',
    toplamLead: salesPersonStats.reduce((sum, s) => sum + s.toplamLead, 0),
    ulasilmiyorCevapYok: salesPersonStats.reduce((sum, s) => sum + s.ulasilmiyorCevapYok, 0),
    aranmayanLead: salesPersonStats.reduce((sum, s) => sum + s.aranmayanLead, 0),
    ulasilmiyorBilgiHatali: salesPersonStats.reduce((sum, s) => sum + s.ulasilmiyorBilgiHatali, 0),
    bilgiVerildiTekrarAranacak: salesPersonStats.reduce((sum, s) => sum + s.bilgiVerildiTekrarAranacak, 0),
    olumsuz: salesPersonStats.reduce((sum, s) => sum + s.olumsuz, 0),
    toplantiBirebirGorusme: salesPersonStats.reduce((sum, s) => sum + s.toplantiBirebirGorusme, 0),
    potansiyelTakipte: salesPersonStats.reduce((sum, s) => sum + s.potansiyelTakipte, 0),
    satis: salesPersonStats.reduce((sum, s) => sum + s.satis, 0),
    target: salesPersonStats.reduce((sum, s) => sum + s.target, 0),
    percentage: 0,
  };
  
  totals.percentage = totals.target > 0 ? Math.round((totals.satis / totals.target) * 100) : 0;

  // Pie chart data for lead status distribution
  const pieChartData = [
    { name: 'Olumsuz', value: totals.olumsuz, color: statusConfig.olumsuz.color },
    { name: 'Takipte', value: totals.potansiyelTakipte, color: statusConfig.takipte.color },
    { name: 'Satış', value: totals.satis, color: statusConfig.satildi.color },
    { name: 'Toplantı', value: totals.toplantiBirebirGorusme, color: statusConfig.toplanti.color },
    { name: 'Ulaşılamıyor', value: totals.ulasilmiyorCevapYok, color: statusConfig.ulasilamiyor.color },
    { name: 'Yeni', value: totals.aranmayanLead, color: statusConfig.yeni.color },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{totals.toplamLead}</div>
            <div className="text-sm text-muted-foreground">Toplam Lead</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{totals.olumsuz}</div>
            <div className="text-sm text-muted-foreground">Olumsuz</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{totals.potansiyelTakipte}</div>
            <div className="text-sm text-muted-foreground">Takipte</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{totals.satis}</div>
            <div className="text-sm text-muted-foreground">Satış</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Personel Performans Tablosu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Personel</th>
                    <th className="text-center p-2 bg-gray-100">Toplam</th>
                    <th className="text-center p-2 bg-orange-100">Cevap Yok</th>
                    <th className="text-center p-2 bg-blue-100">Aranmayan</th>
                    <th className="text-center p-2 bg-red-100">Olumsuz</th>
                    <th className="text-center p-2 bg-yellow-100">Takipte</th>
                    <th className="text-center p-2 bg-green-100">Satış</th>
                    <th className="text-center p-2">Hedef %</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPersonStats.map((stats, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{stats.personel}</td>
                      <td className="text-center p-2 bg-gray-50">{stats.toplamLead}</td>
                      <td className="text-center p-2 bg-orange-50">{stats.ulasilmiyorCevapYok}</td>
                      <td className="text-center p-2 bg-blue-50">{stats.aranmayanLead}</td>
                      <td className="text-center p-2 bg-red-50">{stats.olumsuz}</td>
                      <td className="text-center p-2 bg-yellow-50">{stats.potansiyelTakipte}</td>
                      <td className="text-center p-2 bg-green-50">{stats.satis}</td>
                      <td className="text-center p-2">
                        <div className="flex items-center gap-2">
                          <Progress value={stats.percentage} className="w-16 h-2" />
                          <span className="text-xs">{stats.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b-2 border-gray-300 bg-gray-100 font-bold">
                    <td className="p-2">{totals.personel}</td>
                    <td className="text-center p-2">{totals.toplamLead}</td>
                    <td className="text-center p-2">{totals.ulasilmiyorCevapYok}</td>
                    <td className="text-center p-2">{totals.aranmayanLead}</td>
                    <td className="text-center p-2">{totals.olumsuz}</td>
                    <td className="text-center p-2">{totals.potansiyelTakipte}</td>
                    <td className="text-center p-2">{totals.satis}</td>
                    <td className="text-center p-2">
                      <div className="flex items-center gap-2">
                        <Progress value={totals.percentage} className="w-16 h-2" />
                        <span className="text-xs">{totals.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Toplam Lead - Durum Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Target Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Satış Hedefi İlerlemesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {salesPersonStats.map((stats, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="font-medium mb-2">{stats.personel}</div>
                <div className="text-2xl font-bold mb-1">
                  {stats.satis} / {stats.target}
                </div>
                <Progress value={stats.percentage} className="mb-2" />
                <div className="text-sm text-muted-foreground">
                  {stats.percentage}% Tamamlandı
                </div>
                <Badge 
                  variant={stats.percentage >= 100 ? "default" : stats.percentage >= 75 ? "secondary" : "outline"}
                  className="mt-2"
                >
                  {stats.percentage >= 100 ? "Hedef Aşıldı" : stats.percentage >= 75 ? "Hedefe Yakın" : "Devam Ediyor"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}