import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
  thresholds?: {
    value: number;
    greenAbove?: number;
    amberAbove?: number;
  };
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  description,
  thresholds
}: MetricCardProps) {
  const getChangeBadgeVariant = (): "confirmed" | "cancelled" | "secondary" => {
    switch (changeType) {
      case "positive": return "confirmed";
      case "negative": return "cancelled";
      default: return "secondary";
    }
  };

  const getCardClassName = () => {
    if (!thresholds) return "bg-card shadow-sm hover:shadow-md transition-all duration-300";
    
    const { value: numValue, greenAbove = 95, amberAbove = 80 } = thresholds;
    
    if (numValue >= greenAbove) {
      return "bg-card shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-green-500";
    } else if (numValue >= amberAbove) {
      return "bg-card shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-amber-500";
    } else {
      return "bg-card shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-red-500";
    }
  };

  return (
    <Card className={getCardClassName()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-kpi-title">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-kpi-value">{value}</div>
        {change && (
          <div className="mt-2">
            <Badge variant={getChangeBadgeVariant()} className="text-xs">
              {change}
            </Badge>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}