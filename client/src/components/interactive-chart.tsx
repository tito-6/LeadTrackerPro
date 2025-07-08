import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieIcon, BarChart3, LineChart as LineIcon, BarChart2 } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

interface InteractiveChartProps {
  title: string;
  data: ChartData[];
  onItemClick?: (item: ChartData) => void;
  colors?: string[];
  height?: number;
  chartType?: 'pie' | 'bar' | 'line';
}

const DEFAULT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
];

export default function InteractiveChart({ 
  title, 
  data, 
  onItemClick, 
  colors = DEFAULT_COLORS,
  height = 300 
}: InteractiveChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'donut' | 'bar' | 'line'>('pie');

  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.color || colors[index % colors.length]
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">Miktar: {data.value}</p>
          <p className="text-sm">Yüzde: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const handleCellClick = (data: any) => {
    if (onItemClick) {
      onItemClick(data);
    }
  };

  const renderPieChart = (innerRadius = 0) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          onClick={handleCellClick}
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.fill}
              className="hover:opacity-80 transition-opacity duration-200"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="value" 
          onClick={handleCellClick}
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.fill}
              className="hover:opacity-80 transition-opacity duration-200"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#8884d8" 
          strokeWidth={3}
          dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
          activeDot={{ r: 8, className: "cursor-pointer" }}
          onClick={handleCellClick}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return renderPieChart();
      case 'donut':
        return renderPieChart(40);
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      default:
        return renderPieChart();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex gap-1">
          <Button
            variant={chartType === 'pie' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('pie')}
            className="p-2"
          >
            <PieIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'donut' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('donut')}
            className="p-2"
          >
            <PieIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('bar')}
            className="p-2"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('line')}
            className="p-2"
          >
            <LineIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="transition-all duration-500 ease-in-out">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}