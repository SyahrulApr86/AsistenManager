import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, RefreshCw } from 'lucide-react';
import { FinanceData } from '../types/log';
import { getFinanceData } from '../lib/api';
import Navbar from './shared/Navbar';
import Footer from './shared/Footer';
import Table from './shared/Table';
import toast from 'react-hot-toast';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLORS = {
  'tidak disetujui admin': '#EF4444',
  'disetujui admin': '#10B981',
  'dilaporkan': '#F59E0B',
  'diproses': '#3B82F6',
  'disetujui dosen/TA': '#6366F1',
  'tidak disetujui dosen/TA': '#DC2626'
};

export default function FinanceView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState<FinanceData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [refreshing, setRefreshing] = useState(false);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = Array.from(
      { length: new Date().getFullYear() - 2021 + 1 },
      (_, i) => 2021 + i
  );

  const cleanCurrency = (value: string): number => {
    try {
      if (typeof value !== 'string') return 0;
      return parseFloat(
          value
              .replace('Rp', '')
              .replace(/\./g, '')
              .replace(',00', '')
              .replace(',', '.')
              .trim()
      );
    } catch {
      return 0;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateStatusTotals = (data: FinanceData[]) => {
    const totals: Record<string, number> = {};
    let total = 0;

    data.forEach(entry => {
      const amount = cleanCurrency(entry.Jumlah_Pembayaran);
      const status = entry.Status.toLowerCase();
      totals[status] = (totals[status] || 0) + amount;
      total += amount;
    });

    return { statusTotals: totals, total };
  };

  const getChartData = (data: FinanceData[]) => {
    const { statusTotals, total } = calculateStatusTotals(data);
    const labels = Object.keys(statusTotals);
    const values = Object.values(statusTotals);
    const colors = labels.map(label => STATUS_COLORS[label as keyof typeof STATUS_COLORS] || '#CBD5E1');

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          generateLabels: (chart: any) => {
            const { statusTotals, total } = calculateStatusTotals(financeData);
            return Object.entries(statusTotals).map(([label, value]) => ({
              text: `${label} (${((value / total) * 100).toFixed(1)}%) - ${formatCurrency(value)}`,
              fillStyle: STATUS_COLORS[label as keyof typeof STATUS_COLORS] || '#CBD5E1',
              strokeStyle: STATUS_COLORS[label as keyof typeof STATUS_COLORS] || '#CBD5E1',
              lineWidth: 1,
              hidden: false
            }));
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.sessionId || !user?.csrfToken) {
        toast.error('Session not found');
        return;
      }

      setLoading(true);
      try {
        const currentData = await getFinanceData(
            user.sessionId,
            user.csrfToken,
            selectedYear,
            selectedMonth
        );
        setFinanceData(currentData);
      } catch (error) {
        console.error('Error fetching finance data:', error);
        toast.error('Failed to fetch finance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedYear, selectedMonth]);

  const handleRefresh = async () => {
    if (!user?.sessionId || !user?.csrfToken) {
      toast.error('Session not found');
      return;
    }

    setRefreshing(true);
    try {
      const currentData = await getFinanceData(
          user.sessionId,
          user.csrfToken,
          selectedYear,
          selectedMonth
      );
      setFinanceData(currentData);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const columns = [
    { header: 'NPM', key: 'NPM', width: 'w-32', centerHeader: true, centerData: true },
    { header: 'Course', key: 'Mata_Kuliah', centerHeader: true },
    { header: 'Month', key: 'Bulan', width: 'w-32', centerHeader: true, centerData: true },
    { header: 'Hours', key: 'Jumlah_Jam', width: 'w-24', centerHeader: true, centerData: true },
    { header: 'Rate', key: 'Honor_Per_Jam', width: 'w-32', centerHeader: true, centerData: true },
    { header: 'Amount', key: 'Jumlah_Pembayaran', width: 'w-40', centerHeader: true, centerData: true },
    {
      header: 'Status',
      key: 'Status',
      width: 'w-32',
      centerHeader: true,
      centerData: true,
      render: (value: string) => (
          <span className={`badge ${
              value.toLowerCase().includes('tidak disetujui') ? 'badge-red' :
                  value.toLowerCase().includes('diproses') ? 'badge-blue' :
                      value.toLowerCase().includes('disetujui') ? 'badge-green' :
                          'badge-yellow'
          }`}>
          {value}
        </span>
      )
    }
  ];

  const { total } = calculateStatusTotals(financeData);

  return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-blue-50">
        <Navbar />
        <div className="flex-grow pt-16 pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="card p-8 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Financial Overview
                  </h2>
                  <p className="text-gray-600">
                    Track your teaching assistant payments
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2 card p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Payment History</h3>
                  <div className="flex items-center space-x-4">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="input-field w-32"
                        disabled={loading}
                    >
                      {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="input-field w-40"
                        disabled={loading}
                    >
                      {months.map(month => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                      ))}
                    </select>
                    <button
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        className="btn-secondary"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                <Table
                    columns={columns}
                    data={financeData}
                    isLoading={loading}
                    emptyMessage="No payment records found for the selected period"
                />
              </div>

              <div className="card p-8">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Status Breakdown</h3>
                  <p className="text-gray-600">Total: {formatCurrency(total)}</p>
                </div>
                {financeData.length > 0 ? (
                    <div className="relative">
                      <Pie data={getChartData(financeData)} options={chartOptions} />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No data available
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
  );
}