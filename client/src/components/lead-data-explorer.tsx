import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, Eye } from "lucide-react";
import { Lead } from "@shared/schema";

interface LeadDataExplorerProps {
  leads: Lead[];
  isLoading?: boolean;
}

export default function LeadDataExplorer({ leads = [], isLoading = false }: LeadDataExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [salesRepFilter, setSalesRepFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Get unique values for filters
  const uniqueLeadTypes = [...new Set(leads.map(lead => lead.leadType).filter(Boolean))];
  const uniqueStatuses = [...new Set(leads.map(lead => lead.status).filter(Boolean))];
  const uniqueSalesReps = [...new Set(leads.map(lead => lead.assignedPersonnel).filter(Boolean))];

  // Filter leads based on search and filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.webFormNote?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLeadType = leadTypeFilter === "all" || lead.leadType === leadTypeFilter;
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesSalesRep = salesRepFilter === "all" || lead.assignedPersonnel === salesRepFilter;

    return matchesSearch && matchesLeadType && matchesStatus && matchesSalesRep;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + itemsPerPage);

  // Lead type color mapping
  const getLeadTypeColor = (leadType: string) => {
    switch (leadType) {
      case 'satis': return 'bg-green-100 text-green-800 border-green-200';
      case 'kiralama': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLeadTypeLabel = (leadType: string) => {
    switch (leadType) {
      case 'satis': return 'Satılık';
      case 'kiralama': return 'Kiralık';
      default: return leadType || 'Belirtilmemiş';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Lead Veri Keşifçisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Veriler yükleniyor...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Lead Veri Keşifçisi
          <Badge variant="outline" className="ml-auto">
            {filteredLeads.length} / {leads.length} Lead
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Müşteri adı, ID veya WebForm notu ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={leadTypeFilter} onValueChange={setLeadTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Lead Tipi Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Lead Tipleri</SelectItem>
              {uniqueLeadTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {getLeadTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Durum Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={salesRepFilter} onValueChange={setSalesRepFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Satış Temsilcisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Temsilciler</SelectItem>
              {uniqueSalesReps.map(rep => (
                <SelectItem key={rep} value={rep}>
                  {rep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredLeads.filter(lead => lead.leadType === 'satis').length}
            </div>
            <div className="text-sm text-gray-600">Satılık Leadleri</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredLeads.filter(lead => lead.leadType === 'kiralama').length}
            </div>
            <div className="text-sm text-gray-600">Kiralık Leadleri</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {filteredLeads.length}
            </div>
            <div className="text-sm text-gray-600">Toplam Gösterilen</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Müşteri Bilgileri</TableHead>
                <TableHead className="font-semibold">Lead Tipi</TableHead>
                <TableHead className="font-semibold">Proje</TableHead>
                <TableHead className="font-semibold">Durum</TableHead>
                <TableHead className="font-semibold">Temsilci</TableHead>
                <TableHead className="font-semibold">Tarih</TableHead>
                <TableHead className="font-semibold">WebForm Notu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {searchTerm || leadTypeFilter !== "all" || statusFilter !== "all" || salesRepFilter !== "all" 
                      ? "Filtrelere uygun lead bulunamadı" 
                      : "Henüz lead verisi yok"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead, index) => (
                  <TableRow key={lead.id || `${lead.customerId}-${index}`} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{lead.customerName || 'İsimsiz'}</div>
                        <div className="text-sm text-gray-500">
                          ID: {lead.customerId} | İletişim: {lead.contactId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getLeadTypeColor(lead.leadType || '')}>
                        {getLeadTypeLabel(lead.leadType || '')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-32 truncate">
                      {lead.projectName || 'Belirtilmemiş'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {lead.status || 'Durum yok'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.assignedPersonnel || 'Atanmamış'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.requestDate || 'Tarih yok'}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm text-gray-600">
                      {lead.webFormNote || 'Not yok'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredLeads.length)} / {filteredLeads.length} lead gösteriliyor
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Önceki
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm">
                  Sayfa {currentPage} / {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}