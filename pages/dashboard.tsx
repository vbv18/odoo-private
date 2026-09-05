import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatsCard from '../components/dashboard/StatsCard';
import { PageHeader } from '../components/ui/PageHeader';
import { TrendingUp, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader 
        title="Dashboard"
        description="Financial overview and key metrics"
      />

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Revenue"
              value={stats?.totalRevenue || '$0'}
              icon={DollarSign}
              trend="up"
              trendValue="12% from last month"
            />
            <StatsCard
              title="Outstanding Invoices"
              value={stats?.outstandingInvoices || '0'}
              icon={AlertCircle}
              trend="down"
              trendValue="8% decrease"
            />
            <StatsCard
              title="Risk Alerts"
              value={stats?.riskAlerts || '0'}
              icon={TrendingUp}
            />
            <StatsCard
              title="Reconciled Accounts"
              value={stats?.reconciledAccounts || '0'}
              icon={CheckCircle}
              trend="up"
              trendValue="100% status"
            />
          </div>

          {/* Placeholder sections */}
          <div className="bg-surface border border-border rounded-enterprise p-6">
            <h3 className="text-lg font-semibold text-primary-text mb-4">Recent Transactions</h3>
            <p className="text-secondary-text">Transaction list would appear here</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
