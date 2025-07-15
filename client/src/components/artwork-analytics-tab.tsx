import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface ArtworkAnalyticsTabProps {
  filters?: {
    startDate?: string;
    endDate?: string;
    month?: string;
    year?: string;
    salesRep?: string;
    leadType?: string;
  };
}

export function ArtworkAnalyticsTab({
  filters: parentFilters,
}: ArtworkAnalyticsTabProps) {
  // State for filters
  const [month, setMonth] = React.useState<string>(
    parentFilters?.month ||
      (new Date().getMonth() + 1).toString().padStart(2, "0")
  );
  const [year, setYear] = React.useState<string>(
    parentFilters?.year || new Date().getFullYear().toString()
  );
  const [selectedSalesRep, setSelectedSalesRep] = React.useState<string>(
    parentFilters?.salesRep || "all"
  );
  const [filterType, setFilterType] = React.useState<"month" | "dateRange">(
    parentFilters?.month ? "month" : "dateRange"
  );

  // Fetch sales reps
  const { data: salesReps = [] } = useQuery({
    queryKey: ["/api/sales-reps"],
    queryFn: async () => {
      const response = await fetch("/api/sales-reps");
      return response.json();
    },
  });

  // Build the filter params
  const filters = React.useMemo(() => {
    const params = new URLSearchParams();

    if (filterType === "month") {
      params.append("month", month);
      params.append("year", year);
    }

    if (selectedSalesRep !== "all") {
      params.append("salesRep", selectedSalesRep);
    }

    return params;
  }, [filterType, month, year, selectedSalesRep]);

  // Fetch artwork analytics data
  const {
    data: artworkData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/artwork-analytics", filters.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/artwork-analytics?${filters}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return await response.json();
    },
  });

  // Generate months for the dropdown
  const months = [
    { value: "01", label: "Ocak" },
    { value: "02", label: "Şubat" },
    { value: "03", label: "Mart" },
    { value: "04", label: "Nisan" },
    { value: "05", label: "Mayıs" },
    { value: "06", label: "Haziran" },
    { value: "07", label: "Temmuz" },
    { value: "08", label: "Ağustos" },
    { value: "09", label: "Eylül" },
    { value: "10", label: "Ekim" },
    { value: "11", label: "Kasım" },
    { value: "12", label: "Aralık" },
  ];

  // Generate years for the dropdown (last 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) =>
    (currentYear - 4 + i).toString()
  );

  // Generate colors for the pie chart
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#8dd1e1",
    "#a4de6c",
    "#d0ed57",
  ];

  if (error) {
    return (
      <div>Error loading artwork analytics: {(error as Error).message}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Tabs
          value={filterType}
          onValueChange={(v) => setFilterType(v as "month" | "dateRange")}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="month">Ay/Yıl</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Ay Seçin" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Yıl Seçin" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedSalesRep} onValueChange={setSelectedSalesRep}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Personel Seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Personel</SelectItem>
            {salesReps.map((rep: any) => (
              <SelectItem key={rep.name} value={rep.name}>
                {rep.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Görsel/Video Dağılımı</CardTitle>
                <CardDescription>
                  İnfo Form Geliş Yeri 3 alanında belirtilen görsel/video
                  dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={artworkData?.artworkAnalysis.slice(0, 10) || []}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="artwork"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {artworkData?.artworkAnalysis
                          .slice(0, 10)
                          .map((entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Görsel/Video Başarı Oranları</CardTitle>
                <CardDescription>
                  Her görsel/video türünün görüşme ve satış başarı oranları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        artworkData?.artworkAnalysis
                          .filter((a: any) => a.artwork !== "Belirtilmemiş")
                          .slice(0, 8) || []
                      }
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <XAxis dataKey="artwork" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="meetingRate"
                        name="Görüşme Oranı (%)"
                        fill="#8884d8"
                      />
                      <Bar
                        dataKey="salesRate"
                        name="Satış Oranı (%)"
                        fill="#82ca9d"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Hedef Kitle + Görsel Kombinasyon Başarı Oranları
              </CardTitle>
              <CardDescription>
                En yüksek başarı sağlayan kombinasyonlar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hedef Kitle</TableHead>
                      <TableHead>Görsel/Video</TableHead>
                      <TableHead className="text-right">Lead Sayısı</TableHead>
                      <TableHead className="text-right">Yüzde</TableHead>
                      <TableHead className="text-right">
                        Görüşme Oranı
                      </TableHead>
                      <TableHead className="text-right">Satış Oranı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {artworkData?.combinedAnalysis
                      .filter(
                        (item: any) =>
                          item.audience !== "Belirtilmemiş" &&
                          item.artwork !== "Belirtilmemiş"
                      )
                      .map((item: any) => (
                        <TableRow key={item.key}>
                          <TableCell>{item.audience}</TableCell>
                          <TableCell>{item.artwork}</TableCell>
                          <TableCell className="text-right">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.percentage}%
                          </TableCell>
                          <TableCell className="text-right">
                            {item.meetingRate}%
                          </TableCell>
                          <TableCell className="text-right">
                            {item.salesRate}%
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Görsel/Video Detayları</CardTitle>
              <CardDescription>
                Tüm görsel/video türlerinin detaylı istatistikleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Görsel/Video Türü</TableHead>
                      <TableHead className="text-right">Lead Sayısı</TableHead>
                      <TableHead className="text-right">Yüzde</TableHead>
                      <TableHead className="text-right">Görüşmeler</TableHead>
                      <TableHead className="text-right">
                        Görüşme Oranı
                      </TableHead>
                      <TableHead className="text-right">Satışlar</TableHead>
                      <TableHead className="text-right">Satış Oranı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {artworkData?.artworkAnalysis.map((item: any) => (
                      <TableRow key={item.artwork}>
                        <TableCell>{item.artwork}</TableCell>
                        <TableCell className="text-right">
                          {item.count}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.percentage}%
                        </TableCell>
                        <TableCell className="text-right">
                          {item.meetings}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.meetingRate}%
                        </TableCell>
                        <TableCell className="text-right">
                          {item.sales}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.salesRate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
