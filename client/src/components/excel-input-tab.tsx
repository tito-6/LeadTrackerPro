import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Save, Upload, Download, FileSpreadsheet } from 'lucide-react';

// Main lead data structure matching your specification
interface MainLeadData {
  "Müşteri ID": string;
  "İletişim ID": string;
  "Müşteri Adı Soyadı": string;
  "İlk Müşteri Kaynağı": string;
  "Form Müşteri Kaynağı": string;
  "WebForm Notu": string;
  "Talep Geliş Tarihi": string;
  "İnfo Form Geliş Yeri": string;
  "İnfo Form Geliş Yeri 2": string;
  "İnfo Form Geliş Yeri 3": string;
  "İnfo Form Geliş Yeri 4": string;
  "Atanan Personel": string;
  "Hatırlatma Personeli": string;
  "GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)": string;
  "Web Form Havuz Oluşturma Tarihi": string;
  "Form Sistem Olusturma Tarihi": string;
  "Atama Saat Farkı": string;
  "Dönüş Saat Farkı": string;
  "Giden Arama Sistem Oluşturma Tarihi": string;
  "Müşteri Geri Dönüş Tarihi (Giden Arama)": string;
  "GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)": string;
  "Müşteri Mail Geri Dönüş Tarihi": string;
  "Telefonla Ulaşılamayan Müşteriler": string;
  "Kaç Gündür Geri Dönüş Bekliyor": string;
  "Kaç Günde Geri Dönüş Yapılmış (Süre)": string;
  "GERİ DÖNÜŞ NOTU (Giden Arama Notu)": string;
  "GERİ DÖNÜŞ NOTU (Giden Mail Notu)": string;
  "Birebir Görüşme Yapıldı mı ?": string;
  "Birebir Görüşme Tarihi": string;
  "Dönüş Görüşme Sonucu": string;
  "Dönüş Olumsuzluk Nedeni": string;
  "Müşteriye Satış Yapıldı Mı ?": string;
  "Satış Adedi": string;
  "Randevu Tarihi": string;
  "SON GORUSME NOTU": string;
  "SON GORUSME SONUCU": string;
}

// Takipte data structure matching your specification
interface TakipteData {
  "Müşteri Adı Soyadı(203)": string;
  "Tarih": string;
  "Personel Adı(203)": string;
  "Ofis": string;
  "Notlar": string;
  "Müşteri Haberleşme Tipi": string;
  "Görüşme Tipi": string;
  "Saat": string;
  "Hatırlatma Var Mı": string;
  "Hatırlatma Tarihi": string;
  "Hatırlatma Personeli": string;
  "Hatırlatma Son Mu ?": string;
  "Konuşma Süresi": string;
  "Meslek Adı": string;
  "Acenta Adı": string;
  "Son Sonuç Adı": string;
  "Puan": string;
  "Randevu Var Mı ?": string;
  "Randevu Tarihi": string;
  "Sorumlu Satış Personeli": string;
  "Randevu Ofisi": string;
  "Ofis Bazında İlk Geliş": string;
  "İletişim Aktif Mi ?": string;
  "İrtibat Müşteri Kaynağı": string;
  "İrtibat Müşteri Kaynak Grubu": string;
  "İletişim Müşteri Kaynağı": string;
  "İletişim Müşteri Kaynak Grubu": string;
  "Cep Tel": string;
  "İş Tel": string;
  "Ev Tel": string;
  "Email": string;
  "Kriter": string;
  "AktifMi": string;
}

// Main lead columns configuration
const mainLeadColumns = [
  { key: "Müşteri ID", label: "Müşteri ID", width: "100px" },
  { key: "İletişim ID", label: "İletişim ID", width: "100px" },
  { key: "Müşteri Adı Soyadı", label: "Müşteri Adı Soyadı", width: "150px" },
  { key: "İlk Müşteri Kaynağı", label: "İlk Müşteri Kaynağı", width: "120px" },
  { key: "Form Müşteri Kaynağı", label: "Form Müşteri Kaynağı", width: "120px" },
  { key: "WebForm Notu", label: "WebForm Notu", width: "200px" },
  { key: "Talep Geliş Tarihi", label: "Talep Geliş Tarihi", width: "120px" },
  { key: "İnfo Form Geliş Yeri", label: "İnfo Form Geliş Yeri", width: "120px" },
  { key: "İnfo Form Geliş Yeri 2", label: "İnfo Form Geliş Yeri 2", width: "120px" },
  { key: "İnfo Form Geliş Yeri 3", label: "İnfo Form Geliş Yeri 3", width: "120px" },
  { key: "İnfo Form Geliş Yeri 4", label: "İnfo Form Geliş Yeri 4", width: "120px" },
  { key: "Atanan Personel", label: "Atanan Personel", width: "120px" },
  { key: "Hatırlatma Personeli", label: "Hatırlatma Personeli", width: "120px" },
  { key: "GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)", label: "GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)", width: "180px" },
  { key: "Web Form Havuz Oluşturma Tarihi", label: "Web Form Havuz Oluşturma Tarihi", width: "150px" },
  { key: "Form Sistem Olusturma Tarihi", label: "Form Sistem Olusturma Tarihi", width: "150px" },
  { key: "Atama Saat Farkı", label: "Atama Saat Farkı", width: "120px" },
  { key: "Dönüş Saat Farkı", label: "Dönüş Saat Farkı", width: "120px" },
  { key: "Giden Arama Sistem Oluşturma Tarihi", label: "Giden Arama Sistem Oluşturma Tarihi", width: "180px" },
  { key: "Müşteri Geri Dönüş Tarihi (Giden Arama)", label: "Müşteri Geri Dönüş Tarihi (Giden Arama)", width: "180px" },
  { key: "GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)", label: "GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)", width: "200px" },
  { key: "Müşteri Mail Geri Dönüş Tarihi", label: "Müşteri Mail Geri Dönüş Tarihi", width: "150px" },
  { key: "Telefonla Ulaşılamayan Müşteriler", label: "Telefonla Ulaşılamayan Müşteriler", width: "150px" },
  { key: "Kaç Gündür Geri Dönüş Bekliyor", label: "Kaç Gündür Geri Dönüş Bekliyor", width: "150px" },
  { key: "Kaç Günde Geri Dönüş Yapılmış (Süre)", label: "Kaç Günde Geri Dönüş Yapılmış (Süre)", width: "150px" },
  { key: "GERİ DÖNÜŞ NOTU (Giden Arama Notu)", label: "GERİ DÖNÜŞ NOTU (Giden Arama Notu)", width: "200px" },
  { key: "GERİ DÖNÜŞ NOTU (Giden Mail Notu)", label: "GERİ DÖNÜŞ NOTU (Giden Mail Notu)", width: "200px" },
  { key: "Birebir Görüşme Yapıldı mı ?", label: "Birebir Görüşme Yapıldı mı ?", width: "150px" },
  { key: "Birebir Görüşme Tarihi", label: "Birebir Görüşme Tarihi", width: "130px" },
  { key: "Dönüş Görüşme Sonucu", label: "Dönüş Görüşme Sonucu", width: "130px" },
  { key: "Dönüş Olumsuzluk Nedeni", label: "Dönüş Olumsuzluk Nedeni", width: "130px" },
  { key: "Müşteriye Satış Yapıldı Mı ?", label: "Müşteriye Satış Yapıldı Mı ?", width: "130px" },
  { key: "Satış Adedi", label: "Satış Adedi", width: "100px" },
  { key: "Randevu Tarihi", label: "Randevu Tarihi", width: "120px" },
  { key: "SON GORUSME NOTU", label: "SON GORUSME NOTU", width: "150px" },
  { key: "SON GORUSME SONUCU", label: "SON GORUSME SONUCU", width: "150px" }
];

// Takipte columns configuration
const takipteColumns = [
  { key: "Müşteri Adı Soyadı(203)", label: "Müşteri Adı Soyadı(203)", width: "150px" },
  { key: "Tarih", label: "Tarih", width: "100px" },
  { key: "Personel Adı(203)", label: "Personel Adı(203)", width: "130px" },
  { key: "Ofis", label: "Ofis", width: "100px" },
  { key: "Notlar", label: "Notlar", width: "200px" },
  { key: "Müşteri Haberleşme Tipi", label: "Müşteri Haberleşme Tipi", width: "150px" },
  { key: "Görüşme Tipi", label: "Görüşme Tipi", width: "120px" },
  { key: "Saat", label: "Saat", width: "80px" },
  { key: "Hatırlatma Var Mı", label: "Hatırlatma Var Mı", width: "120px" },
  { key: "Hatırlatma Tarihi", label: "Hatırlatma Tarihi", width: "120px" },
  { key: "Hatırlatma Personeli", label: "Hatırlatma Personeli", width: "130px" },
  { key: "Hatırlatma Son Mu ?", label: "Hatırlatma Son Mu ?", width: "130px" },
  { key: "Konuşma Süresi", label: "Konuşma Süresi", width: "110px" },
  { key: "Meslek Adı", label: "Meslek Adı", width: "100px" },
  { key: "Acenta Adı", label: "Acenta Adı", width: "100px" },
  { key: "Son Sonuç Adı", label: "Son Sonuç Adı", width: "110px" },
  { key: "Puan", label: "Puan", width: "80px" },
  { key: "Randevu Var Mı ?", label: "Randevu Var Mı ?", width: "120px" },
  { key: "Randevu Tarihi", label: "Randevu Tarihi", width: "120px" },
  { key: "Sorumlu Satış Personeli", label: "Sorumlu Satış Personeli", width: "150px" },
  { key: "Randevu Ofisi", label: "Randevu Ofisi", width: "110px" },
  { key: "Ofis Bazında İlk Geliş", label: "Ofis Bazında İlk Geliş", width: "130px" },
  { key: "İletişim Aktif Mi ?", label: "İletişim Aktif Mi ?", width: "120px" },
  { key: "İrtibat Müşteri Kaynağı", label: "İrtibat Müşteri Kaynağı", width: "140px" },
  { key: "İrtibat Müşteri Kaynak Grubu", label: "İrtibat Müşteri Kaynak Grubu", width: "160px" },
  { key: "İletişim Müşteri Kaynağı", label: "İletişim Müşteri Kaynağı", width: "140px" },
  { key: "İletişim Müşteri Kaynak Grubu", label: "İletişim Müşteri Kaynak Grubu", width: "160px" },
  { key: "Cep Tel", label: "Cep Tel", width: "120px" },
  { key: "İş Tel", label: "İş Tel", width: "120px" },
  { key: "Ev Tel", label: "Ev Tel", width: "120px" },
  { key: "Email", label: "Email", width: "150px" },
  { key: "Kriter", label: "Kriter", width: "100px" },
  { key: "AktifMi", label: "AktifMi", width: "80px" }
];

export default function ExcelInputTab() {
  const [mainLeadData, setMainLeadData] = useState<MainLeadData[]>([
    {} as MainLeadData
  ]);
  
  const [takipteData, setTakipteData] = useState<TakipteData[]>([
    {} as TakipteData
  ]);

  const [activeTab, setActiveTab] = useState('main-data');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add new row
  const addRow = (type: 'main' | 'takipte') => {
    if (type === 'main') {
      setMainLeadData([...mainLeadData, {} as MainLeadData]);
    } else {
      setTakipteData([...takipteData, {} as TakipteData]);
    }
  };

  // Update cell value
  const updateMainCell = (rowIndex: number, column: string, value: string) => {
    const newData = [...mainLeadData];
    newData[rowIndex] = { ...newData[rowIndex], [column]: value };
    setMainLeadData(newData);
  };

  const updateTakipteCell = (rowIndex: number, column: string, value: string) => {
    const newData = [...takipteData];
    newData[rowIndex] = { ...newData[rowIndex], [column]: value };
    setTakipteData(newData);
  };

  // Save data mutation
  const saveMainDataMutation = useMutation({
    mutationFn: async (data: MainLeadData[]) => {
      return apiRequest('/api/leads/import-main', { 
        method: 'POST', 
        body: { data } 
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Ana veri başarıyla kaydedildi",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Veri kaydedilirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const saveTakipteDataMutation = useMutation({
    mutationFn: async (data: TakipteData[]) => {
      return apiRequest('/api/takipte/import-excel', { 
        method: 'POST', 
        body: { data } 
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Takipte verisi başarıyla kaydedildi",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/takipte'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Veri kaydedilirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Export to Excel template
  const exportTemplate = (type: 'main' | 'takipte') => {
    const columns = type === 'main' ? mainLeadColumns : takipteColumns;
    const csvHeader = columns.map(col => col.label).join('\t');
    const csvContent = csvHeader + '\n';
    
    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type === 'main' ? 'ana_veri' : 'takipte_veri'}_sablonu.tsv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Excel Tarzı Lead Girişi</h2>
          <p className="text-gray-600">Tam sütun desteği ile Excel tarzı veri girişi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportTemplate('main')}>
            <Download className="h-4 w-4 mr-2" />
            Ana Veri Şablonu
          </Button>
          <Button variant="outline" onClick={() => exportTemplate('takipte')}>
            <Download className="h-4 w-4 mr-2" />
            Takipte Şablonu
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main-data">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Ana Lead Verisi ({mainLeadColumns.length} sütun)
          </TabsTrigger>
          <TabsTrigger value="takipte-data">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Takipte Verisi ({takipteColumns.length} sütun)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main-data" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Ana Lead Verisi</CardTitle>
                  <p className="text-sm text-gray-600">{mainLeadColumns.length} sütun desteklenmektedir</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => addRow('main')} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Satır Ekle
                  </Button>
                  <Button 
                    onClick={() => saveMainDataMutation.mutate(mainLeadData)}
                    disabled={saveMainDataMutation.isPending}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-xs font-medium w-12">#</th>
                      {mainLeadColumns.map((col) => (
                        <th 
                          key={col.key} 
                          className="border p-2 text-xs font-medium text-left"
                          style={{ minWidth: col.width }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mainLeadData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        <td className="border p-1 text-center text-xs font-medium bg-gray-50">
                          {rowIndex + 1}
                        </td>
                        {mainLeadColumns.map((col) => (
                          <td key={col.key} className="border p-1">
                            <Input
                              value={row[col.key as keyof MainLeadData] || ''}
                              onChange={(e) => updateMainCell(rowIndex, col.key, e.target.value)}
                              className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                              placeholder=""
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="takipte-data" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Takipte Verisi</CardTitle>
                  <p className="text-sm text-gray-600">{takipteColumns.length} sütun desteklenmektedir</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => addRow('takipte')} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Satır Ekle
                  </Button>
                  <Button 
                    onClick={() => saveTakipteDataMutation.mutate(takipteData)}
                    disabled={saveTakipteDataMutation.isPending}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-xs font-medium w-12">#</th>
                      {takipteColumns.map((col) => (
                        <th 
                          key={col.key} 
                          className="border p-2 text-xs font-medium text-left"
                          style={{ minWidth: col.width }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {takipteData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        <td className="border p-1 text-center text-xs font-medium bg-gray-50">
                          {rowIndex + 1}
                        </td>
                        {takipteColumns.map((col) => (
                          <td key={col.key} className="border p-1">
                            <Input
                              value={row[col.key as keyof TakipteData] || ''}
                              onChange={(e) => updateTakipteCell(rowIndex, col.key, e.target.value)}
                              className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                              placeholder=""
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Ana Veri</Badge>
              <span className="text-sm font-medium">{mainLeadData.length} satır</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Takipte</Badge>
              <span className="text-sm font-medium">{takipteData.length} satır</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Ana Sütun</Badge>
              <span className="text-sm font-medium">{mainLeadColumns.length} adet</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Takipte Sütun</Badge>
              <span className="text-sm font-medium">{takipteColumns.length} adet</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}