import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Phone, MessageSquare } from "lucide-react";
import { useLeads } from "@/hooks/use-leads";
import { useMemo } from "react";

export default function TakipteAnaliziTab() {
  const { data: leads = [] } = useLeads();

  const takipteAnalysis = useMemo(() => {
    const takipteLeads = leads.filter(lead => 
      lead.status === 'takipte' ||
      lead.responseResult === 'takipte' ||
      lead.lastMeetingResult === 'takipte'
    );

    const withAppointments = takipteLeads.filter(lead => lead.appointmentDate);
    const withoutAppointments = takipteLeads.filter(lead => !lead.appointmentDate);

    const byPersonnel = takipteLeads.reduce((acc, lead) => {
      acc[lead.assignedPersonnel] = (acc[lead.assignedPersonnel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const urgentFollowUps = takipteLeads.filter(lead => {
      if (!lead.appointmentDate) return false;
      const appointmentDate = new Date(lead.appointmentDate);
      const today = new Date();
      const daysDiff = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return daysDiff <= 7 && daysDiff >= 0;
    });

    return {
      total: takipteLeads.length,
      withAppointments: withAppointments.length,
      withoutAppointments: withoutAppointments.length,
      urgent: urgentFollowUps.length,
      byPersonnel,
      leads: takipteLeads,
      urgentLeads: urgentFollowUps
    };
  }, [leads]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getDaysUntilAppointment = (appointmentDate: string) => {
    if (!appointmentDate) return null;
    const appointment = new Date(appointmentDate);
    const today = new Date();
    const daysDiff = Math.ceil((appointment.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Takipte</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{takipteAnalysis.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Randevulu</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{takipteAnalysis.withAppointments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Randevusuz</CardTitle>
            <Phone className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{takipteAnalysis.withoutAppointments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acil Takip</CardTitle>
            <MessageSquare className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{takipteAnalysis.urgent}</div>
            <p className="text-xs text-muted-foreground">7 gün içinde</p>
          </CardContent>
        </Card>
      </div>

      {/* Personnel Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Personel Bazında Takip Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(takipteAnalysis.byPersonnel)
              .sort(([,a], [,b]) => b - a)
              .map(([personnel, count]) => (
                <div key={personnel} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{personnel}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Urgent Follow-ups */}
      {takipteAnalysis.urgentLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Acil Takip Gerektirenler (7 Gün İçinde)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {takipteAnalysis.urgentLeads.map((lead) => {
                const daysUntil = getDaysUntilAppointment(lead.appointmentDate!);
                return (
                  <div key={lead.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{lead.customerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {lead.assignedPersonnel} • {lead.leadType === 'kiralama' ? 'Kiralama' : 'Satış'}
                        </p>
                        <p className="text-sm text-red-600 font-medium">
                          Randevu: {formatDate(lead.appointmentDate!)} 
                          {daysUntil !== null && (
                            <span className="ml-2">
                              ({daysUntil === 0 ? 'Bugün' : daysUntil === 1 ? 'Yarın' : `${daysUntil} gün sonra`})
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge variant="destructive">Acil</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Follow-up Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Tüm Takip Gerektiren Leadler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {takipteAnalysis.leads.map((lead) => {
              const daysUntil = lead.appointmentDate ? getDaysUntilAppointment(lead.appointmentDate) : null;
              
              return (
                <div key={lead.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{lead.customerName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {lead.assignedPersonnel} • {lead.leadType === 'kiralama' ? 'Kiralama' : 'Satış'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        İlk Talep: {formatDate(lead.requestDate)}
                      </p>
                      
                      {lead.appointmentDate && (
                        <p className="text-sm font-medium text-blue-600 mt-1">
                          Randevu: {formatDate(lead.appointmentDate)}
                          {daysUntil !== null && (
                            <span className="ml-2 text-muted-foreground">
                              ({daysUntil === 0 ? 'Bugün' : daysUntil === 1 ? 'Yarın' : daysUntil > 0 ? `${daysUntil} gün sonra` : `${Math.abs(daysUntil)} gün geçti`})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <Badge variant={lead.appointmentDate ? "secondary" : "outline"}>
                        {lead.appointmentDate ? "Randevulu" : "Takipte"}
                      </Badge>
                    </div>
                  </div>
                  
                  {lead.callNote && (
                    <div className="mt-3 p-3 bg-blue-50 rounded">
                      <p className="text-sm font-medium text-blue-700">Geri Dönüş Notu:</p>
                      <p className="text-sm text-blue-600">{lead.callNote}</p>
                    </div>
                  )}
                  
                  {lead.lastMeetingNote && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium">Son Görüşme Notu:</p>
                      <p className="text-sm text-muted-foreground">{lead.lastMeetingNote}</p>
                    </div>
                  )}

                  {!lead.appointmentDate && (
                    <div className="mt-3 p-3 bg-orange-50 rounded border border-orange-200">
                      <p className="text-sm text-orange-700 font-medium">
                        ⚠️ Randevu tarihi belirlenmemiş - takip gerekli
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}