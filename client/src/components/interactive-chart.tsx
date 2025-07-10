import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

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

import { generateChartColors } from '@/lib/color-system';

// Use the improved color system for unique colors
const DEFAULT_COLORS = generateChartColors(30);

// Custom tooltip with enhanced styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
        <p className="font-semibold text-gray-900 dark:text-gray-100">{data.name}</p>
        <p className="text-blue-600 dark:text-blue-400">
          <span className="font-medium">Değer:</span> {data.value}
        </p>
        <p className="text-green-600 dark:text-green-400">
          <span className="font-medium">Yüzde:</span> {data.percentage}%
        </p>
      </div>
    );
  }
  return null;
};

// Custom label function for pie charts with enhanced visibility
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percentage, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Only show label if percentage is significant enough
  if (percentage < 3) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
      stroke="rgba(0,0,0,0.5)"
      strokeWidth="0.5"
    >
      {`${value} (${percentage}%)`}
    </text>
  );
};

export default function InteractiveChart({ 
  title,
  data,
  onItemClick,
  colors = DEFAULT_COLORS,
  height = 300,
  chartType = 'pie'
}: InteractiveChartProps) {
  
  // Enhanced data with colors and 3D effects
  const enhancedData = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
    fill: item.color || colors[index % colors.length]
  }));

  const handleClick = (data: any) => {
    if (onItemClick) {
      onItemClick(data);
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={enhancedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#666' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12, fill: '#666' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="value" 
              onClick={handleClick}
              cursor="pointer"
              radius={[4, 4, 0, 0]}
            >
              {enhancedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke={entry.color}
                  strokeWidth={2}
                  style={{
                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        );
      
      case 'line':
        return (
          <LineChart data={enhancedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#666' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12, fill: '#666' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
              style={{
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
              }}
            />
          </LineChart>
        );
      
      default: // pie
        return (
          <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Pie
              data={enhancedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={Math.min(height * 0.35, 120)}
              innerRadius={Math.min(height * 0.15, 40)}
              fill="#8884d8"
              dataKey="value"
              onClick={handleClick}
              cursor="pointer"
              style={{
                filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.4))',
                transition: 'all 0.3s ease'
              }}
            >
              {enhancedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => (
                <span style={{ color: entry.color, fontWeight: 'bold' }}>
                  {value} ({entry.payload.value})
                </span>
              )}
            />
          </PieChart>
        );
    }
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}
      
      {/* Smart Data Summary Cards - Dynamic Layout */}
      <div className="mb-4">
        {/* Top Priority Items (Always Visible) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {enhancedData.slice(0, Math.min(8, enhancedData.length)).map((item, index) => (
            <div 
              key={index} 
              className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border-l-4"
              style={{ borderLeftColor: item.color }}
              onClick={() => handleClick(item)}
            >
              <div 
                className="w-4 h-4 rounded-full mr-2 shadow-sm border-2 border-white" 
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {item.value} ({item.percentage}%)
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Expandable Section for Remaining Items */}
        {enhancedData.length > 8 && (
          <details className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              {enhancedData.length - 8} daha fazla öğe göster...
            </summary>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {enhancedData.slice(8).map((item, index) => (
                <div 
                  key={index + 8} 
                  className="flex items-center p-2 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer border-l-4"
                  style={{ borderLeftColor: item.color }}
                  onClick={() => handleClick(item)}
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-2 border border-white" 
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.value} ({item.percentage}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
      
      {/* Compact Data Table for All Items */}
      <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Detaylı Analiz ({enhancedData.length} öğe)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-1">Kategori</th>
                <th className="text-right py-1">Değer</th>
                <th className="text-right py-1">Yüzde</th>
                <th className="text-left py-1">Renk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {enhancedData.map((item, index) => (
                <tr 
                  key={index}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleClick(item)}
                >
                  <td className="py-1 font-medium text-gray-900 dark:text-gray-100">
                    {item.name}
                  </td>
                  <td className="py-1 text-right text-gray-600 dark:text-gray-400">
                    {item.value}
                  </td>
                  <td className="py-1 text-right text-gray-600 dark:text-gray-400">
                    {item.percentage}%
                  </td>
                  <td className="py-1">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded border border-gray-300" 
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}