import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeadSchema, type InsertLead } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CloudUpload, Plus, Trash2, FileText } from "lucide-react";
import { useLeads } from "@/hooks/use-leads";
import { useSalesReps } from "@/hooks/use-leads";
import ImportValidationWarnings from "@/components/import-validation-warnings";

export default function DataEntryTab() {
  const { toast } = useToast();
  const { data: salesReps = [] } = useSalesReps();
  const { data: stats } = useLeads();
  const [file, setFile] = useState<File | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<any>(null);

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      customerName: "",
      requestDate: new Date().toISOString().split('T')[0],
      leadType: "kiralama",
      assignedPersonnel: "",
      status: "yeni",
      // Optional fields
      customerId: "",
      contactId: "",
      firstCustomerSource: "",
      formCustomerSource: "",
      webFormNote: "",
      infoFormLocation1: "",
      infoFormLocation2: "",
      infoFormLocation3: "",
      infoFormLocation4: "",
      reminderPersonnel: "",
      wasCalledBack: "",
      webFormPoolDate: "",
      formSystemDate: "",
      assignmentTimeDiff: "",
      responseTimeDiff: "",
      outgoingCallSystemDate: "",
      customerResponseDate: "",
      wasEmailSent: "",
      customerEmailResponseDate: "",
      unreachableByPhone: "",
      daysWaitingResponse: undefined,
      daysToResponse: undefined,
      callNote: "",
      emailNote: "",
      oneOnOneMeeting: "",
      meetingDate: "",
      responseResult: "",
      negativeReason: "",
      wasSaleMade: "",
      saleCount: undefined,
      appointmentDate: "",
      lastMeetingNote: "",
      lastMeetingResult: "",
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      const response = await apiRequest("POST", "/api/leads", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
      toast({
        title: "Başarılı",
        description: "Lead başarıyla eklendi.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Lead eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const importFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Import failed");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-reps"] });
      
      // Display validation warnings if present
      if (data.validationWarnings) {
        setValidationWarnings(data.validationWarnings);
      }
      
      setFile(null);
      toast({
        title: "İçe Aktarma Başarılı",
        description: `${data.imported} lead başarıyla içe aktarıldı. ${data.errors > 0 ? `${data.errors} hata oluştu.` : ""}`,
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Dosya içe aktarılırken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/leads/clear");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Veriler Temizlendi",
        description: "Tüm lead verileri başarıyla temizlendi.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Veriler temizlenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLead) => {
    createLeadMutation.mutate(data);
  };

  // Secondary file import mutation
  const importSecondaryMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/takipte/import', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Takipte upload failed: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/takipte'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setSecondaryFile(null);
      toast({
        title: "Takip Dosyası Yüklendi",
        description: `${data.imported} takip kaydı başarıyla işlendi.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Takip dosyası yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      importFileMutation.mutate(selectedFile);
    }
  };

  const handleSecondaryFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setSecondaryFile(selectedFile);
      importSecondaryMutation.mutate(selectedFile);
    }
  };

  const handleClear = () => {
    form.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Validation Warnings */}
      {validationWarnings && (
        <div className="lg:col-span-3">
          <ImportValidationWarnings validationResults={validationWarnings} />
        </div>
      )}
      
      {/* Manual Entry Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Manuel Veri Girişi</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Müşteri Adı Soyadı</FormLabel>
                        <FormControl>
                          <Input placeholder="Müşteri adını girin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requestDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Talep Geliş Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leadType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Tipi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kiralama">Kiralama</SelectItem>
                            <SelectItem value="satis">Satış</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedPersonnel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Atanan Personel</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Personel seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {salesReps.map((rep) => (
                              <SelectItem key={rep.id} value={rep.name}>
                                {rep.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durum</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Durum seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yeni">Yeni</SelectItem>
                            <SelectItem value="bilgi-verildi">Bilgi Verildi</SelectItem>
                            <SelectItem value="olumsuz">Olumsuz</SelectItem>
                            <SelectItem value="satis">Satış</SelectItem>
                            <SelectItem value="takipte">Takipte</SelectItem>
                            <SelectItem value="randevu">Randevu</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Müşteri ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Müşteri ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İletişim ID</FormLabel>
                        <FormControl>
                          <Input placeholder="İletişim ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webFormNote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WebForm Notu</FormLabel>
                        <FormControl>
                          <Input placeholder="Web form notları" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salesRep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Satış Temsilcisi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {salesReps.map((rep) => (
                              <SelectItem key={rep.id} value={rep.name}>
                                {rep.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="project"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proje</FormLabel>
                        <FormControl>
                          <Input placeholder="Proje adını girin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Ek Bilgiler</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lastMeetingNote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Son Görüşme Notu</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Son görüşme notları..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="callNote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geri Dönüş Notu (Arama)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Arama notları..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="negativeReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Olumsuzluk Nedeni</FormLabel>
                          <FormControl>
                            <Input placeholder="Olumsuzluk nedeni" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="appointmentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Randevu Tarihi</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={handleClear}>
                    Temizle
                  </Button>
                  <Button type="submit" disabled={createLeadMutation.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Lead Ekle
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* File Import and Stats */}
      <div className="space-y-6">
        {/* Intelligent File Import */}
        <Card>
          <CardHeader>
            <CardTitle>🧠 Akıllı Dosya İçe Aktarma</CardTitle>
            <CardDescription>Ana lead dosyası + isteğe bağlı takip dosyası</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Main Lead File */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-700">1. Ana Lead Dosyası</Label>
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors bg-blue-50">
                  <CloudUpload className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-sm text-blue-700 mb-2">Ana lead dosyasını yükleyin</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.csv,.json"
                    onChange={handleFileUpload}
                    id="main-file-upload"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => document.getElementById('main-file-upload')?.click()}
                    disabled={importFileMutation.isPending}
                  >
                    {importFileMutation.isPending ? 'İşleniyor...' : 'Ana Dosya Seç'}
                  </Button>
                </div>
              </div>

              {/* Secondary Takipte File */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-700">2. Takip Dosyası (ZORUNLU)</Label>
                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors bg-green-50">
                  <FileText className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-green-700 mb-2">Kriter, İrtibat Kaynağı, Görüşme Tipi kolonları</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.csv,.json"
                    onChange={handleSecondaryFileUpload}
                    id="secondary-file-upload"
                  />
                  <Button 
                    type="button" 
                    variant={secondaryFile ? "default" : "outline"}
                    size="sm"
                    onClick={() => document.getElementById('secondary-file-upload')?.click()}
                    disabled={importSecondaryMutation.isPending}
                  >
                    {importSecondaryMutation.isPending ? 'İşleniyor...' : 
                     secondaryFile ? `✓ ${secondaryFile.name}` : 'Takip Dosyası Seç'}
                  </Button>
                </div>
                {!secondaryFile && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    ⚠️ Takipte Analizi için bu dosya gereklidir
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <strong>Akıllı Özellikler:</strong><br/>
                • Tarih formatlarını otomatik algılar<br/>
                • Duplicate leadleri tespit eder<br/>
                • Proje tipini WebForm'dan çıkarır<br/>
                • Boş durumlar "Yeni" olarak etiketlenmez
              </div>
              
              {/* Clear Data Button */}
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => clearDataMutation.mutate()}
                  disabled={clearDataMutation.isPending}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {clearDataMutation.isPending ? 'Temizleniyor...' : 'Tüm Verileri Temizle'}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Bu işlem tüm lead verilerini kalıcı olarak siler
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Hızlı İstatistikler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Toplam Lead</span>
                <span className="text-lg font-semibold text-gray-900">
                  {stats?.totalLeads || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bu Ay</span>
                <span className="text-lg font-semibold text-primary">
                  {stats?.thisMonth || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Satış</span>
                <span className="text-lg font-semibold text-green-600">
                  {stats?.sales || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
