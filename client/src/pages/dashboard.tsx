import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChartLine, Plus, BarChart, Download, Settings, Moon, UserCircle, TrendingDown, Clock } from "lucide-react";
import DataEntryTab from "@/components/data-entry-tab";
import ReportsTab from "@/components/reports-tab";
import ExportTab from "@/components/export-tab";
import SettingsTab from "@/components/settings-tab";
import OlumsuzAnaliziTab from "@/components/olumsuz-analizi-tab";
import TakipteAnaliziTab from "@/components/takipte-analizi-tab";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("data-entry");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <ChartLine className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Lead Report Automation</h1>
                <p className="text-sm text-gray-500">Emlak Satış Raporu Sistemi</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="p-2 text-gray-400 hover:text-gray-600">
                <Moon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="p-2 text-gray-400 hover:text-gray-600">
                <UserCircle className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="data-entry" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Veri Girişi</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <BarChart className="h-4 w-4" />
              <span>Raporlar</span>
            </TabsTrigger>
            <TabsTrigger value="olumsuz-analizi" className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4" />
              <span>Olumsuz Analizi</span>
            </TabsTrigger>
            <TabsTrigger value="takipte-analizi" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Takipte Analizi</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Dışa Aktar</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Ayarlar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data-entry">
            <DataEntryTab />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="olumsuz-analizi">
            <OlumsuzAnaliziTab />
          </TabsContent>

          <TabsContent value="takipte-analizi">
            <TakipteAnaliziTab />
          </TabsContent>

          <TabsContent value="export">
            <ExportTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
