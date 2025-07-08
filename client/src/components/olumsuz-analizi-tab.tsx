import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, AlertTriangle, Users, FileText } from "lucide-react";
import { useLeads } from "@/hooks/use-leads";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import InteractiveChart from "@/components/interactive-chart";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function OlumsuzAnaliziTab() {
  const { data: leads = [] } = useLeads();

  // Fetch comprehensive negative analysis data
  const { data: negativeAnalysis } = useQuery({
    queryKey: ['/api/negative-analysis'],
    queryFn: async () => {
      const response = await fetch('/api/negative-analysis');
      return response.json();
    }
  });

  const olumsuzAnalysis = useMemo(() => {
    const olumsuzLeads = leads.filter(lead => 
      lead.status === 'olumsuz' || 
      lead.responseResult === 'olumsuz' ||
      lead.negativeReason
    );

    const reasonCounts = olumsuzLeads.reduce((acc, lead) => {
      const reason = lead.negativeReason || 'Belirtilmemiş';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPersonnel = olumsuzLeads.reduce((acc, lead) => {
      acc[lead.assignedPersonnel] = (acc[lead.assignedPersonnel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byLeadType = olumsuzLeads.reduce((acc, lead) => {
      acc[lead.leadType] = (acc[lead.leadType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: olumsuzLeads.length,
      reasons: reasonCounts,
      byPersonnel,
      byLeadType,
      leads: olumsuzLeads
    };
  }, [leads]);

  // Transform API data for interactive charts
  const reasonChartData = negativeAnalysis?.reasonAnalysis?.map((item: any) => ({
    name: item.reason,
    value: item.count,
    percentage: item.percentage
  })) || [];

  const personnelChartData = negativeAnalysis?.personnelAnalysis?.map((item: any) => ({
    name: item.personnel,
    value: item.count,
    percentage: item.percentage
  })) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Olumsuz</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{negativeAnalysis?.totalNegative || olumsuzAnalysis.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Olumsuzluk Oranı</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{negativeAnalysis?.negativePercentage || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kiralama Olumsuz</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{olumsuzAnalysis.byLeadType.kiralama || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satış Olumsuz</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{olumsuzAnalysis.byLeadType.satis || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid gap-6">
        {/* Negative Reasons Distribution Chart */}
        <InteractiveChart
          title="🚫 Olumsuzluk Nedenleri Dağılımı (Dönüş Olumsuzluk Nedeni)"
          data={reasonChartData}
          height={350}
        />
        
        {/* Personnel Negative Distribution Chart */}
        <InteractiveChart
          title="👨‍💼 Personel Bazında Olumsuz Lead Dağılımı"
          data={personnelChartData}
          height={350}
        />
      </div>

      {/* Detailed Analysis Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Negative Reasons Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Olumsuzluk Nedenleri Detay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {negativeAnalysis?.reasonAnalysis?.map((item: any) => (
                <div key={item.reason} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.reason}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{item.count}</Badge>
                    <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Personnel */}
        <Card>
          <CardHeader>
            <CardTitle>Personel Bazında Olumsuz Dağılım</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {negativeAnalysis?.personnelAnalysis?.map((item: any) => (
                <div key={item.personnel} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.personnel}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={item.percentage} className="w-16 h-2" />
                    <Badge variant="outline">{item.count}</Badge>
                    <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Lead List */}
      <Card>
        <CardHeader>
          <CardTitle>Olumsuz Lead Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {olumsuzAnalysis.leads.map((lead) => (
              <div key={lead.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{lead.customerName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {lead.assignedPersonnel} • {lead.leadType === 'kiralama' ? 'Kiralama' : 'Satış'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tarih: {lead.requestDate}
                    </p>
                  </div>
                  <Badge variant="destructive">{lead.status}</Badge>
                </div>
                
                {lead.negativeReason && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-600">Olumsuzluk Nedeni:</p>
                    <p className="text-sm">{lead.negativeReason}</p>
                  </div>
                )}
                
                {lead.lastMeetingNote && (
                  <div className="mt-3">
                    <p className="text-sm font-medium">Son Görüşme Notu:</p>
                    <p className="text-sm text-muted-foreground">{lead.lastMeetingNote}</p>
                  </div>
                )}

                {lead.callNote && (
                  <div className="mt-3">
                    <p className="text-sm font-medium">Geri Dönüş Notu:</p>
                    <p className="text-sm text-muted-foreground">{lead.callNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}