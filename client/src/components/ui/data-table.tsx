import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, EyeOff } from "lucide-react";

interface DataTableProps {
  title: string;
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  totalRecords: number;
  onExport?: () => void;
}

export function DataTable({ title, data, totalRecords, onExport }: DataTableProps) {
  const [isVisible, setIsVisible] = useState(false);

  const exportToCSV = () => {
    const csvData = data.map(row => ({
      'Kategori': row.name,
      'Sayı': row.value,
      'Yüzde': `${row.percentage}%`
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (onExport) onExport();
  };

  const exportToExcel = () => {
    const headers = ['Kategori', 'Sayı', 'Yüzde', 'Toplam İçindeki Oran'];
    const rows = data.map(row => [
      row.name,
      row.value,
      `${row.percentage}%`,
      `${row.value}/${totalRecords}`
    ]);

    let excelContent = headers.join('\t') + '\n';
    rows.forEach(row => {
      excelContent += row.join('\t') + '\n';
    });

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            📊 {title} - Özet Tablosu
            <Badge variant="outline">{data.length} kategori</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
              className="flex items-center gap-1"
            >
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isVisible ? 'Gizle' : 'Göster'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isVisible && (
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left font-medium">Kategori</th>
                  <th className="border border-gray-200 px-4 py-2 text-right font-medium">Sayı</th>
                  <th className="border border-gray-200 px-4 py-2 text-right font-medium">Yüzde</th>
                  <th className="border border-gray-200 px-4 py-2 text-center font-medium">Oran</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-4 py-2">{row.name}</td>
                    <td className="border border-gray-200 px-4 py-2 text-right font-mono">{row.value}</td>
                    <td className="border border-gray-200 px-4 py-2 text-right">
                      <Badge variant="secondary">{row.percentage}%</Badge>
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-center text-sm text-gray-600">
                      {row.value}/{totalRecords}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 font-medium">
                  <td className="border border-gray-200 px-4 py-2">TOPLAM</td>
                  <td className="border border-gray-200 px-4 py-2 text-right font-mono">{totalRecords}</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">
                    <Badge>100%</Badge>
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-center text-sm text-gray-600">
                    {totalRecords}/{totalRecords}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}