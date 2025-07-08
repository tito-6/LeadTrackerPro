import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { InsertLead } from '@shared/schema';
import { Plus, Save, Upload, Download } from 'lucide-react';

// Excel-style lead data structure matching the screenshot
interface ExcelLead {
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
}

// Status columns with colors
const statusColumns = [
  { key: 'toplamLead', label: 'Toplam Lead', color: 'bg-gray-100' },
  { key: 'ulasilmiyorCevapYok', label: 'Ulaşılmıyor - Cevap Yok', color: 'bg-orange-100' },
  { key: 'aranmayanLead', label: 'Aranmayan Lead', color: 'bg-blue-100' },
  { key: 'ulasilmiyorBilgiHatali', label: 'Ulaşılmıyor - Bilgi Hatalı', color: 'bg-purple-100' },
  { key: 'bilgiVerildiTekrarAranacak', label: 'Bilgi Verildi - Tekrar Aranacak', color: 'bg-cyan-100' },
  { key: 'olumsuz', label: 'Olumsuz', color: 'bg-red-100' },
  { key: 'toplantiBirebirGorusme', label: 'Toplantı - Birebir Görüşme', color: 'bg-indigo-100' },
  { key: 'potansiyelTakipte', label: 'Potansiyel Takipte', color: 'bg-yellow-100' },
  { key: 'satis', label: 'Satış', color: 'bg-green-100' },
];

export default function ExcelInputTab() {
  const [excelData, setExcelData] = useState<ExcelLead[]>([
    {
      personel: '',
      toplamLead: 0,
      ulasilmiyorCevapYok: 0,
      aranmayanLead: 0,
      ulasilmiyorBilgiHatali: 0,
      bilgiVerildiTekrarAranacak: 0,
      olumsuz: 0,
      toplantiBirebirGorusme: 0,
      potansiyelTakipte: 0,
      satis: 0,
    }
  ]);
  
  const [leadCategory, setLeadCategory] = useState<'satis' | 'kiralama'>('satis');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation to save Excel data as individual leads
  const saveDataMutation = useMutation({
    mutationFn: async (data: ExcelLead[]) => {
      const leads: InsertLead[] = [];
      
      data.forEach(row => {
        if (!row.personel) return;
        
        // Create individual leads for each status category
        statusColumns.forEach(status => {
          const count = row[status.key as keyof ExcelLead] as number;
          for (let i = 0; i < count; i++) {
            let leadStatus = 'yeni';
            
            // Map Excel columns to lead statuses
            switch (status.key) {
              case 'ulasilmiyorCevapYok':
                leadStatus = 'ulasilamiyor';
                break;
              case 'aranmayanLead':
                leadStatus = 'yeni';
                break;
              case 'ulasilmiyorBilgiHatali':
                leadStatus = 'ulasilamiyor';
                break;
              case 'bilgiVerildiTekrarAranacak':
                leadStatus = 'takipte';
                break;
              case 'olumsuz':
                leadStatus = 'olumsuz';
                break;
              case 'toplantiBirebirGorusme':
                leadStatus = 'toplanti';
                break;
              case 'potansiyelTakipte':
                leadStatus = 'takipte';
                break;
              case 'satis':
                leadStatus = 'satildi';
                break;
            }
            
            if (status.key !== 'toplamLead') {
              leads.push({
                customerName: `${row.personel} - ${status.label} #${i + 1}`,
                requestDate: new Date().toISOString().split('T')[0],
                leadType: leadCategory,
                assignedPersonnel: row.personel,
                status: leadStatus,
                firstCustomerSource: 'Excel Import',
                callNote: `${status.label} kategorisinden import edildi`,
              });
            }
          }
        });
      });
      
      // Batch save all leads
      const results = await Promise.all(
        leads.map(lead => apiRequest('/api/leads', { method: 'POST', body: lead }))
      );
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Başarılı",
        description: "Veriler başarıyla kaydedildi",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Veri kaydetme sırasında hata oluştu",
        variant: "destructive",
      });
    },
  });

  const addRow = () => {
    setExcelData([...excelData, {
      personel: '',
      toplamLead: 0,
      ulasilmiyorCevapYok: 0,
      aranmayanLead: 0,
      ulasilmiyorBilgiHatali: 0,
      bilgiVerildiTekrarAranacak: 0,
      olumsuz: 0,
      toplantiBirebirGorusme: 0,
      potansiyelTakipte: 0,
      satis: 0,
    }]);
  };

  const updateCell = (rowIndex: number, field: keyof ExcelLead, value: string | number) => {
    const newData = [...excelData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    
    // Auto-calculate totals
    if (field !== 'toplamLead' && field !== 'personel') {
      const total = statusColumns.slice(1).reduce((sum, col) => {
        return sum + (newData[rowIndex][col.key as keyof ExcelLead] as number || 0);
      }, 0);
      newData[rowIndex].toplamLead = total;
    }
    
    setExcelData(newData);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const rows = pastedData.split('\n').map(row => row.split('\t'));
    
    const newData = [...excelData];
    
    rows.forEach((row, rIdx) => {
      const targetRowIndex = rowIndex + rIdx;
      if (targetRowIndex >= newData.length) {
        // Add new rows if needed
        while (newData.length <= targetRowIndex) {
          newData.push({
            personel: '',
            toplamLead: 0,
            ulasilmiyorCevapYok: 0,
            aranmayanLead: 0,
            ulasilmiyorBilgiHatali: 0,
            bilgiVerildiTekrarAranacak: 0,
            olumsuz: 0,
            toplantiBirebirGorusme: 0,
            potansiyelTakipte: 0,
            satis: 0,
          });
        }
      }
      
      row.forEach((cell, cIdx) => {
        const targetColIndex = colIndex + cIdx;
        if (targetColIndex === 0) {
          newData[targetRowIndex].personel = cell;
        } else if (targetColIndex <= statusColumns.length) {
          const columnKey = statusColumns[targetColIndex - 1]?.key as keyof ExcelLead;
          if (columnKey) {
            const numValue = parseInt(cell) || 0;
            newData[targetRowIndex][columnKey] = numValue;
          }
        }
      });
      
      // Recalculate total for this row
      const total = statusColumns.slice(1).reduce((sum, col) => {
        return sum + (newData[targetRowIndex][col.key as keyof ExcelLead] as number || 0);
      }, 0);
      newData[targetRowIndex].toplamLead = total;
    });
    
    setExcelData(newData);
  }, [excelData]);

  const exportToExcel = () => {
    // Create CSV format for Excel export
    const headers = ['Personel', ...statusColumns.map(col => col.label)];
    const csvData = [
      headers.join(','),
      ...excelData.map(row => [
        row.personel,
        ...statusColumns.map(col => row[col.key as keyof ExcelLead])
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lead-raporu-${leadCategory}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>Excel Tarzı Lead Girişi</span>
              <Badge variant="outline">{leadCategory === 'satis' ? 'Satış' : 'Kiralama'}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={leadCategory} onValueChange={(value: 'satis' | 'kiralama') => setLeadCategory(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="satis">Satış</SelectItem>
                  <SelectItem value="kiralama">Kiralama</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addRow} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Satır Ekle
              </Button>
              <Button onClick={exportToExcel} size="sm" variant="outline">
                <Download className="h-4 w-4" />
                Excel'e Aktar
              </Button>
              <Button 
                onClick={() => saveDataMutation.mutate(excelData)} 
                disabled={saveDataMutation.isPending}
                size="sm"
              >
                <Save className="h-4 w-4" />
                Kaydet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            💡 İpucu: Excel'den verileri kopyalayıp doğrudan tabloya yapıştırabilirsiniz
          </div>
          
          {/* Excel-style table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 font-medium text-left min-w-32">Personel</th>
                  {statusColumns.map((col, index) => (
                    <th 
                      key={col.key} 
                      className={`border p-2 font-medium text-center min-w-24 ${col.color}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excelData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    <td className="border p-1">
                      <Input
                        value={row.personel}
                        onChange={(e) => updateCell(rowIndex, 'personel', e.target.value)}
                        onPaste={(e) => handlePaste(e, rowIndex, 0)}
                        className="border-0 h-8"
                        placeholder="Personel adı"
                      />
                    </td>
                    {statusColumns.map((col, colIndex) => (
                      <td key={col.key} className={`border p-1 ${col.color}`}>
                        <Input
                          type="number"
                          min="0"
                          value={row[col.key as keyof ExcelLead] as number}
                          onChange={(e) => updateCell(rowIndex, col.key as keyof ExcelLead, parseInt(e.target.value) || 0)}
                          onPaste={(e) => handlePaste(e, rowIndex, colIndex + 1)}
                          className="border-0 h-8 text-center"
                          readOnly={col.key === 'toplamLead'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Summary row */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-10 gap-4 text-sm">
              <div className="font-medium">Toplam:</div>
              {statusColumns.map((col) => (
                <div key={col.key} className="text-center font-medium">
                  {excelData.reduce((sum, row) => sum + (row[col.key as keyof ExcelLead] as number), 0)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}