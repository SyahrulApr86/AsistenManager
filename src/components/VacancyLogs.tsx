import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, BookOpen, ClipboardList, Clock } from 'lucide-react';
import { Log } from '../types/log';
import toast from 'react-hot-toast';
import { getLogs } from '../lib/api';
import Navbar from './shared/Navbar';
import Footer from './shared/Footer';
import Table from './shared/Table';
import StatsCard from './shared/StatsCard';

export default function VacancyLogs() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user?.sessionId || !user?.csrfToken || !id) {
        toast.error('Session or vacancy ID not found');
        return;
      }

      try {
        const data = await getLogs(user.sessionId, user.csrfToken, id);
        setLogs(data);
      } catch (error) {
        toast.error('Failed to fetch logs');
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [id, user]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const getTotalDuration = () => {
    return logs.reduce((total, log) => total + (log['Durasi (Menit)'] || 0), 0);
  };

  const columns = [
    { header: '#', key: 'No', width: 'w-12' },
    { header: 'Date', key: 'Tanggal', width: 'w-24' },
    { header: 'Start', key: 'Jam Mulai', width: 'w-24' },
    { header: 'End', key: 'Jam Selesai', width: 'w-24' },
    { header: 'Duration', key: 'Durasi (Menit)', width: 'w-24' },
    { header: 'Category', key: 'Kategori', width: 'w-32', render: (value: string) => (
      <span className="badge badge-indigo">{value}</span>
    )},
    { header: 'Description', key: 'Deskripsi Tugas', render: (value: string) => (
      <div className="table-cell-wrap">{value}</div>
    )},
    { header: 'Status', key: 'Status', width: 'w-28', render: (value: string) => (
      <span className={`badge ${value.toLowerCase().includes('disetujui') ? 'badge-green' : 'badge-yellow'}`}>
        {value}
      </span>
    )}
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <Navbar />
      <div className="pt-16 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={handleBack} className="btn-secondary mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard title="Total Logs" value={logs.length} icon={ClipboardList} />
            <StatsCard title="Total Duration" value={`${getTotalDuration()} minutes`} icon={Clock} />
            <StatsCard
              title="Status"
              value="Active"
              icon={() => (
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
              )}
            />
          </div>

          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Activity Logs</h3>
            </div>
            <Table
              columns={columns}
              data={logs}
              isLoading={loading}
              emptyMessage="No logs found"
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}