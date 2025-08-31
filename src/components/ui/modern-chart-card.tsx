import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts";
import { cn } from "@/lib/utils";

interface ModernChartCardProps {
  title: string;
  data: any[];
  type: 'bar' | 'line';
  dataKey: string;
  xAxisKey?: string;
  className?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showValueLabels?: boolean;
  formatValue?: (value: number) => string;
}

export function ModernChartCard({
  title,
  data,
  type,
  dataKey,
  xAxisKey = "month",
  className,
  height = 200,
  color = "hsl(var(--primary))",
  showGrid = true,
  showValueLabels = false,
  formatValue = (value: number) => value.toString()
}: ModernChartCardProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-xl shadow-glow p-4">
          <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
          <p className="text-sm text-primary font-medium">
            {`${payload[0].name}: ${typeof payload[0].value === 'number' && payload[0].value > 1000 
              ? `$${(payload[0].value / 1000000).toFixed(1)}M`
              : payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("bg-card border-0 rounded-2xl shadow-elegant", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-6">
        <ResponsiveContainer width="100%" height={height}>
          {type === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              {showGrid && <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--muted))" strokeOpacity={0.3} />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => dataKey === 'volume' ? `$${(value / 1000000).toFixed(1)}M` : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey={dataKey} 
                fill={color}
                radius={[8, 8, 0, 0]}
              >
                {showValueLabels && (
                  <LabelList 
                    dataKey={dataKey} 
                    position="top" 
                    formatter={formatValue}
                    fontSize={12}
                    fill="hsl(var(--muted-foreground))"
                  />
                )}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 4, stroke: color, strokeWidth: 0 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}