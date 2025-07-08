import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Copy, Search, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function DuplicateDetectionTab() {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch duplicate analysis data
  const { data: duplicateData } = useQuery({
    queryKey: ['/api/duplicates'],
    queryFn: async () => {
      const response = await fetch('/api/duplicates');
      return response.json();
    }
  });

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const duplicateGroups = Object.entries(duplicateData?.duplicates || {});

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Lead</CardTitle>
            <Search className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{duplicateData?.stats?.totalLeads || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Grupları</CardTitle>
            <Copy className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{duplicateData?.stats?.duplicateGroups || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Sayısı</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{duplicateData?.stats?.duplicateCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Oranı</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{duplicateData?.stats?.duplicatePercentage || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Groups Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Lead Grupları
          </CardTitle>
        </CardHeader>
        <CardContent>
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Duplicate Lead Bulunamadı</h3>
              <p className="text-muted-foreground">Tüm leadler benzersiz görünüyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateGroups.map(([groupId, leads]: [string, any]) => {
                const isExpanded = expandedGroups.has(groupId);
                const matchType = groupId.startsWith('customer_') ? 'Müşteri ID' : 'İletişim ID';
                const matchValue = groupId.replace(/^(customer_|contact_)/, '');

                return (
                  <Collapsible key={groupId}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => toggleGroup(groupId)}
                        className="w-full justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium">{matchType}: {matchValue}</span>
                          <Badge variant="destructive">{leads.length} duplicate</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-muted-foreground">
                            {leads.length - 1} fazla lead
                          </span>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Müşteri Adı</TableHead>
                              <TableHead>Atanmış Personel</TableHead>
                              <TableHead>Lead Tipi</TableHead>
                              <TableHead>Durum</TableHead>
                              <TableHead>Talep Tarihi</TableHead>
                              <TableHead>Proje</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leads.map((lead: any, index: number) => (
                              <TableRow key={lead.id} className={index === 0 ? "bg-green-50" : "bg-red-50"}>
                                <TableCell className="font-medium">{lead.customerName}</TableCell>
                                <TableCell>{lead.assignedPersonnel}</TableCell>
                                <TableCell>
                                  <Badge variant={lead.leadType === 'kiralama' ? 'default' : 'secondary'}>
                                    {lead.leadType}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{lead.status}</Badge>
                                </TableCell>
                                <TableCell>{lead.requestDate}</TableCell>
                                <TableCell>{lead.projectName || 'Belirtilmemiş'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-yellow-800">Önerilen Eylem:</p>
                            <p className="text-yellow-700">
                              İlk satır (yeşil) orijinal lead olarak kabul edilebilir. 
                              Diğer satırlar (kırmızı) duplicate olarak değerlendirilebilir ve birleştirilebilir.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate Management Actions */}
      {duplicateGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Duplicate Yönetimi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Otomatik Birleştirme</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Duplicate leadleri otomatik olarak birleştirin. En eski lead korunur, 
                    diğer bilgiler güncellenir.
                  </p>
                  <Button className="mt-2" size="sm" disabled>
                    Yakında Geliyor
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <XCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900">Manuel İnceleme</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Her duplicate grubunu manuel olarak inceleyin ve birleştirme kararı verin.
                  </p>
                  <Button variant="outline" className="mt-2" size="sm" disabled>
                    Manuel İncelemeye Başla
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}