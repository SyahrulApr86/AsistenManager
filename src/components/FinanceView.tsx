import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, Calendar as CalendarIcon, TrendingUp, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { FinanceData, FinanceStats } from '../types/log';
import { getFinanceData, getAllFinanceData } from '../lib/api';
import Navbar from './shared/Navbar';
import Footer from './shared/Footer';
import Table from './shared/Table';
import StatsCard from './shared/StatsCard';
import toast from 'react-hot-toast';

export default function FinanceView() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState<FinanceData[]>([]);
    const [allFinanceData, setAllFinanceData] = useState<FinanceData[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [stats, setStats] = useState<FinanceStats | null>(null);

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
        { length: 5 },
        (_, i) => new Date().getFullYear() - 2 + i
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

    const calculateStats = (data: FinanceData[]): FinanceStats => {
        const statusTotals: Record<string, number> = {};
        const monthlyTotals: Record<string, number> = {};
        let totalAmount = 0;

        data.forEach(entry => {
            const amount = cleanCurrency(entry.Jumlah_Pembayaran);
            const status = entry.Status.toLowerCase();
            const monthKey = `${entry.Bulan}`;

            totalAmount += amount;
            statusTotals[status] = (statusTotals[status] || 0) + amount;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amount;
        });

        const monthlyAmounts = Object.values(monthlyTotals);
        const averageMonthly = monthlyAmounts.length > 0
            ? monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length
            : 0;
        const maxMonthly = Math.max(...monthlyAmounts, 0);
        const minMonthly = Math.min(...monthlyAmounts, 0);

        return {
            totalAmount,
            statusTotals,
            monthlyTotals,
            averageMonthly,
            maxMonthly,
            minMonthly
        };
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.sessionId || !user?.csrfToken) {
                toast.error('Session not found');
                return;
            }

            setLoading(true);
            try {
                // Fetch current month's data
                const currentData = await getFinanceData(
                    user.sessionId,
                    user.csrfToken,
                    selectedYear,
                    selectedMonth
                );
                setFinanceData(currentData);

                // Fetch all historical data
                const allData = await getAllFinanceData(user.sessionId, user.csrfToken);
                setAllFinanceData(allData);
                setStats(calculateStats(allData));
            } catch (error) {
                console.error('Error fetching finance data:', error);
                toast.error('Failed to fetch finance data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, selectedYear, selectedMonth]);

    const columns = [
        { header: 'NPM', key: 'NPM', width: 'w-32', centerHeader: true, centerData: true },
        { header: 'Course', key: 'Mata_Kuliah', centerHeader: true },
        { header: 'Month', key: 'Bulan', width: 'w-32', centerHeader: true, centerData: true },
        { header: 'Hours', key: 'Jumlah_Jam', width: 'w-24', centerHeader: true, centerData: true },
        { header: 'Rate', key: 'Honor_Per_Jam', width: 'w-32', centerHeader: true, centerData: true },
        { header: 'Amount', key: 'Jumlah_Pembayaran', width: 'w-40', centerHeader: true, centerData: true },
        { header: 'Status', key: 'Status', width: 'w-32', centerHeader: true, centerData: true, render: (value: string) => (
                <span className={`badge ${
                    value.toLowerCase().includes('dibayar') ? 'badge-green' : 'badge-yellow'
                }`}>
        {value}
      </span>
            )}
    ];

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

                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <StatsCard
                                title="Total Earnings"
                                value={formatCurrency(stats.totalAmount)}
                                icon={DollarSign}
                                iconColor="text-green-600"
                            />
                            <StatsCard
                                title="Average Monthly"
                                value={formatCurrency(stats.averageMonthly)}
                                icon={TrendingUp}
                                iconColor="text-blue-600"
                            />
                            <StatsCard
                                title="Highest Monthly"
                                value={formatCurrency(stats.maxMonthly)}
                                icon={ArrowUp}
                                iconColor="text-green-600"
                            />
                            <StatsCard
                                title="Lowest Monthly"
                                value={formatCurrency(stats.minMonthly)}
                                icon={ArrowDown}
                                iconColor="text-red-600"
                            />
                        </div>
                    )}

                    <div className="card p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2">
                                <Clock className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-xl font-semibold text-gray-900">Payment History</h3>
                            </div>
                            <div className="flex items-center space-x-4">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="input-field w-32"
                                >
                                    {years.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="input-field w-40"
                                >
                                    {months.map(month => (
                                        <option key={month.value} value={month.value}>
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <Table
                            columns={columns}
                            data={financeData}
                            isLoading={loading}
                            emptyMessage="No payment records found for the selected period"
                        />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}