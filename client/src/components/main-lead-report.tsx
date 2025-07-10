import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DollarSign, TrendingUp, Users, Calculator } from "lucide-react";

interface ExpenseStats {
  leadCount: number;
  expenses: {
    tl: {
      totalAgencyFees: number;
      totalAdsExpenses: number;
      totalExpenses: number;
    };
    usd: {
      totalExpenses: number;
      avgCostPerLead: number;
    };
  };
  exchangeRate: {
    rate: number;
    lastUpdated: string;
  };
}

interface ExchangeRateInfo {
  rate: number;
  buyingRate: number;
  sellingRate: number;
  lastUpdated: string;
  source: string;
}

export default function MainLeadReport() {
  // Fetch lead expense statistics
  const { data: expenseStats, isLoading: expenseLoading } = useQuery<ExpenseStats>({
    queryKey: ["/api/lead-expenses/stats"],
  });

  // Fetch current exchange rate
  const { data: exchangeRate, isLoading: rateLoading } = useQuery<ExchangeRateInfo>({
    queryKey: ["/api/exchange-rate/usd"],
  });

  if (expenseLoading || rateLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: 'TL' | 'USD') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'TL' ? 'TRY' : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">İNNO Gayrimenkul - Lead Gider Raporu</h2>
        <p className="text-gray-600">Toplam lead maliyeti ve performans analizi</p>
      </div>

      {/* Exchange Rate Info */}
      {exchangeRate && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Güncel Döviz Kuru (TCMB)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Alış</p>
                <p className="text-2xl font-bold text-green-600">
                  {exchangeRate.buyingRate.toFixed(4)} TL
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Satış</p>
                <p className="text-2xl font-bold text-red-600">
                  {exchangeRate.sellingRate.toFixed(4)} TL
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Son Güncelleme</p>
                <p className="text-sm font-medium">
                  {new Date(exchangeRate.lastUpdated).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Summary */}
      {expenseStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Lead</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenseStats.leadCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Sistemdeki toplam lead sayısı
              </p>
            </CardContent>
          </Card>

          {/* Total Expenses (TL) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gider (TL)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(expenseStats.expenses.tl.totalExpenses, 'TL')}
              </div>
              <p className="text-xs text-muted-foreground">
                Acenta + Reklam giderleri
              </p>
            </CardContent>
          </Card>

          {/* Total Expenses (USD) */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gider (USD)</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(expenseStats.expenses.usd.totalExpenses, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                TCMB kuru ile hesaplanmış
              </p>
            </CardContent>
          </Card>

          {/* Cost Per Lead (USD) */}
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lead Başına Maliyet</CardTitle>
              <Calculator className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(expenseStats.expenses.usd.avgCostPerLead, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                Ortalama lead maliyeti
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Breakdown */}
      {expenseStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gider Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TL Breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Türk Lirası (TL) Detayı</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Acenta Aylık Ücretleri:</span>
                    <Badge variant="secondary">
                      {formatCurrency(expenseStats.expenses.tl.totalAgencyFees, 'TL')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reklam Giderleri:</span>
                    <Badge variant="secondary">
                      {formatCurrency(expenseStats.expenses.tl.totalAdsExpenses, 'TL')}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Toplam:</span>
                    <Badge className="bg-red-100 text-red-800">
                      {formatCurrency(expenseStats.expenses.tl.totalExpenses, 'TL')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* USD Conversion */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">USD Karşılığı</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Kur:</span>
                    <Badge variant="outline">
                      1 USD = {expenseStats.exchangeRate.rate.toFixed(4)} TL
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Toplam Gider:</span>
                    <Badge className="bg-green-100 text-green-800">
                      {formatCurrency(expenseStats.expenses.usd.totalExpenses, 'USD')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lead Başına:</span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {formatCurrency(expenseStats.expenses.usd.avgCostPerLead, 'USD')}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    <p>Kur bilgisi: {new Date(expenseStats.exchangeRate.lastUpdated).toLocaleString('tr-TR')}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data Message */}
      {expenseStats && expenseStats.leadCount === 0 && (
        <Card className="text-center p-8">
          <CardContent>
            <p className="text-gray-600">Henüz gider verisi bulunmamaktadır.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Lead'leri gider bilgileri ile birlikte ekledikçe burada analiz görüntülenecektir.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}