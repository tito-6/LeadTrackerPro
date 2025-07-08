import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CloudUpload, Plus, Trash2 } from "lucide-react";
import { useLeads } from "@/hooks/use-leads";
import { useSalesReps } from "@/hooks/use-leads";

export default function DataEntryTab() {
  const { toast } = useToast();
  const { data: salesReps = [] } = useSalesReps();
  const { data: stats } = useLeads();
  const [file, setFile] = useState<File | null>(null);

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      importFileMutation.mutate(selectedFile);
    }
  };

  const handleClear = () => {
    form.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        {/* File Import */}
        <Card>
          <CardHeader>
            <CardTitle>Dosya İçe Aktarma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <CloudUpload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">Dosyayı sürükleyip bırakın veya seçin</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.csv,.json"
                  onChange={handleFileUpload}
                  id="file-upload"
                />
                <Button 
                  type="button" 
                  variant="link" 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={importFileMutation.isPending}
                >
                  {importFileMutation.isPending ? 'Yükleniyor...' : 'Dosya Seç'}
                </Button>
              </div>
              <div className="text-xs text-gray-500">
                Desteklenen formatlar: .xlsx, .csv, .json
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
