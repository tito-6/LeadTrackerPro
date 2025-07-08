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

// Enhanced 3D color palette with gradients
const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
  '#14B8A6', '#F472B6', '#A855F7', '#22C55E', '#FB923C'
];

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
      
      {/* Data Summary Cards */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        {enhancedData.slice(0, 4).map((item, index) => (
          <div 
            key={index} 
            className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={() => handleClick(item)}
          >
            <div 
              className="w-4 h-4 rounded-full mr-2 shadow-sm" 
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
      
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
      
      {/* Additional Data Below Chart */}
      {enhancedData.length > 4 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {enhancedData.slice(4).map((item, index) => (
            <div 
              key={index + 4} 
              className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => handleClick(item)}
            >
              <div 
                className="w-3 h-3 rounded-full mr-2" 
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
      )}
    </div>
  );
}