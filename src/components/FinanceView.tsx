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

// Status colors based on the flow: reported -> approved by admin/lecturer -> processed
const STATUS_COLORS = {
  'diproses': '#10B981', // Green for processed (final state)
  'disetujui admin': '#3B82F6', // Blue for admin approval
  'disetujui dosen/TA': '#6366F1', // Indigo for lecturer approval
  'dilaporkan': '#F59E0B', // Yellow for reported
  'tidak disetujui admin': '#EF4444', // Red for admin rejection
  'tidak disetujui dosen/TA': '#DC2626' // Dark red for lecturer rejection
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

    // Only process entries with non-empty status
    data.filter(entry => entry.Status.trim() !== '').forEach(entry => {
      const amount = cleanCurrency(entry.Jumlah_Pembayaran);
      const status = entry.Status.toLowerCase();
      totals[status] = (totals[status] || 0) + amount;
      total += amount;
    });

    return { statusTotals: totals, total };
  };

  const getChartData = (data: FinanceData[]) => {
    const { statusTotals, total } = calculateStatusTotals(data);

    // Sort statuses by the process flow
    const statusOrder = [
      'dilaporkan',
      'disetujui admin',
      'disetujui dosen/TA',
      'diproses',
      'tidak disetujui admin',
      'tidak disetujui dosen/TA'
    ];

    const sortedStatuses = Object.keys(statusTotals).sort((a, b) => {
      return statusOrder.indexOf(a) - statusOrder.indexOf(b);
    });

    const values = sortedStatuses.map(status => statusTotals[status]);
    const colors = sortedStatuses.map(status => STATUS_COLORS[status as keyof typeof STATUS_COLORS]);

    return {
      labels: sortedStatuses,
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
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 20,
          generateLabels: (chart: any) => {
            const { statusTotals, total } = calculateStatusTotals(financeData);
            const statusOrder = [
              'dilaporkan',
              'disetujui admin',
              'disetujui dosen/TA',
              'diproses',
              'tidak disetujui admin',
              'tidak disetujui dosen/TA'
            ];

            return Object.keys(statusTotals)
                .sort((a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b))
                .map(label => ({
                  text: `${label} (${((statusTotals[label] / total) * 100).toFixed(1)}%)`,
                  fillStyle: STATUS_COLORS[label as keyof typeof STATUS_COLORS],
                  strokeStyle: STATUS_COLORS[label as keyof typeof STATUS_COLORS],
                  lineWidth: 1,
                  hidden: false
                }));
          },
          font: {
            size: 12
          },
          boxWidth: 15,
          boxHeight: 15,
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${formatCurrency(value)} (${percentage}%)`;
          },
          title: (tooltipItems: any[]) => {
            return tooltipItems[0].label;
          }
        },
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        boxPadding: 6
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

        // Filter out entries with empty status
        const validData = currentData.filter(entry => entry.Status.trim() !== '');
        setFinanceData(validData);
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
      const validData = currentData.filter(entry => entry.Status.trim() !== '');
      setFinanceData(validData);
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
      render: (value: string) => {
        const status = value.toLowerCase();
        let badgeClass = 'badge-yellow'; // Default for 'dilaporkan'

        if (status === 'diproses') {
          badgeClass = 'badge-green';
        } else if (status.includes('disetujui')) {
          badgeClass = 'badge-blue';
        } else if (status.includes('tidak disetujui')) {
          badgeClass = 'badge-red';
        }

        return (
            <span className={`badge ${badgeClass}`}>
            {value}
          </span>
        );
      }
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

            <div className="card p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Status Breakdown</h3>
                  <p className="text-gray-600">Total: {formatCurrency(total)}</p>
                </div>
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

              <div className="h-[400px] mb-8">
                {financeData.length > 0 ? (
                    <Pie data={getChartData(financeData)} options={chartOptions} />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No data available
                    </div>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Payment Details</h3>
                <Table
                    columns={columns}
                    data={financeData}
                    isLoading={loading}
                    emptyMessage="No payment records found for the selected period"
                />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
  );
}