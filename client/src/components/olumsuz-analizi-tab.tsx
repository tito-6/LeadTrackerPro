import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, AlertTriangle, Users, FileText } from "lucide-react";
import { useLeads } from "@/hooks/use-leads";
import { useMemo } from "react";

export default function OlumsuzAnaliziTab() {
  const { data: leads = [] } = useLeads();

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
            <div className="text-2xl font-bold text-red-600">{olumsuzAnalysis.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farklı Nedenler</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(olumsuzAnalysis.reasons).length}</div>
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

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Negative Reasons Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Olumsuzluk Nedenleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(olumsuzAnalysis.reasons)
                .sort(([,a], [,b]) => b - a)
                .map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between">
                    <span className="text-sm">{reason}</span>
                    <Badge variant="destructive">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* By Personnel */}
        <Card>
          <CardHeader>
            <CardTitle>Personel Bazında Dağılım</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(olumsuzAnalysis.byPersonnel)
                .sort(([,a], [,b]) => b - a)
                .map(([personnel, count]) => (
                  <div key={personnel} className="flex items-center justify-between">
                    <span className="text-sm">{personnel}</span>
                    <Badge variant="outline">{count}</Badge>
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