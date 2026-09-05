import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
}) => {
  return (
    <div className="bg-surface border border-border rounded-enterprise p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-secondary-text mb-2">{title}</p>
          <h3 className="text-2xl font-bold text-primary-text mb-1">{value}</h3>
          {description && <p className="text-xs text-muted-text">{description}</p>}
        </div>
        {Icon && (
          <div className="p-2 bg-background rounded-enterprise">
            <Icon className="w-5 h-5 text-ai-blue" />
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className={`mt-4 text-sm font-medium ${trend === 'up' ? 'text-primary-green' : 'text-danger'}`}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
