import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, ClipboardList, Clock, Pencil, Trash2, BookOpen } from 'lucide-react';
import { Log, Lowongan } from '../types/log';
import toast from 'react-hot-toast';
import { getLogs, getLowongan, deleteLog } from '../lib/api';
import Navbar from './shared/Navbar';
import Footer from './shared/Footer';
import Table from './shared/Table';
import StatsCard from './shared/StatsCard';
import LogForm from './LogForm';

interface CombinedLog extends Log {
  'Mata Kuliah': string;
  'Create Log Link': string;
}

interface VacancyWithLogs extends Lowongan {
  'Create Log Link': string;
  logs: Log[];
}

export default function AllLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CombinedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVacancies, setActiveVacancies] = useState<VacancyWithLogs[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<VacancyWithLogs | null>(null);

  const fetchData = async () => {
    if (!user?.sessionId || !user?.csrfToken) {
      toast.error('Session not found');
      return;
    }

    try {
      // First fetch all vacancies to determine active ones
      const vacancies = await getLowongan(user.sessionId, user.csrfToken);
      if (vacancies.length > 0) {
        const sortedVacancies = [...vacancies].sort((a, b) => {
          const yearComparison = b['Tahun Ajaran'].localeCompare(a['Tahun Ajaran']);
          if (yearComparison !== 0) return yearComparison;
          return b.Semester.localeCompare(a.Semester);
        });

        const latestYear = sortedVacancies[0]['Tahun Ajaran'];
        const latestSemester = sortedVacancies[0].Semester;

        const active = sortedVacancies.filter(
            v => v['Tahun Ajaran'] === latestYear && v.Semester === latestSemester
        );

        // Fetch logs for each active vacancy
        const vacanciesWithLogs: VacancyWithLogs[] = [];
        const allLogs: CombinedLog[] = [];

        for (const vacancy of active) {
          const { logs: vacancyLogs, createLogLink } = await getLogs(user.sessionId, user.csrfToken, vacancy.LogID);

          // Store vacancy with its logs and createLogLink
          vacanciesWithLogs.push({
            ...vacancy,
            'Create Log Link': createLogLink || '',
            logs: vacancyLogs
          });

          // Add course info to each log
          const logsWithCourse = vacancyLogs.map(log => ({
            ...log,
            'Mata Kuliah': vacancy['Mata Kuliah'],
            'Create Log Link': createLogLink || ''
          }));

          allLogs.push(...logsWithCourse);
        }

        setActiveVacancies(vacanciesWithLogs);

        // Sort logs by date and time
        const sortedLogs = allLogs.sort((a, b) => {
          const [dayA, monthA, yearA] = a.Tanggal.split('-').map(Number);
          const [dayB, monthB, yearB] = b.Tanggal.split('-').map(Number);
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);

          if (dateA.getTime() !== dateB.getTime()) {
            return dateB.getTime() - dateA.getTime();
          }

          const [hoursA, minutesA] = a['Jam Mulai'].split(':').map(Number);
          const [hoursB, minutesB] = b['Jam Mulai'].split(':').map(Number);
          const timeA = hoursA * 60 + minutesA;
          const timeB = hoursB * 60 + minutesB;

          return timeB - timeA;
        });

        setLogs(sortedLogs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleCreateLog = (vacancy: VacancyWithLogs) => {
    setSelectedVacancy(vacancy);
    setSelectedLog(null);
    setShowForm(true);
  };

  const handleEditLog = (log: CombinedLog) => {
    const vacancy = activeVacancies.find(v => v['Mata Kuliah'] === log['Mata Kuliah']);
    if (vacancy) {
      setSelectedVacancy(vacancy);
      setSelectedLog(log);
      setShowForm(true);
    }
  };

  const handleDeleteLog = async (log: Log) => {
    if (!user?.sessionId || !user?.csrfToken) {
      toast.error('Session not found');
      return;
    }

    const confirmDelete = () => {
      return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Log</h3>
            <p class="text-gray-500 mb-6">Are you sure you want to delete this log? This action cannot be undone.</p>
            <div class="flex justify-end space-x-4">
              <button class="btn-secondary" id="cancel">Cancel</button>
              <button class="btn-primary bg-red-600 hover:bg-red-700" id="confirm">Delete</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        const cancelBtn = modal.querySelector('#cancel');
        const confirmBtn = modal.querySelector('#confirm');

        cancelBtn?.addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(false);
        });

        confirmBtn?.addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(true);
        });
      });
    };

    if (await confirmDelete()) {
      try {
        await deleteLog(user.sessionId, user.csrfToken, log.LogID);
        toast.success('Log deleted successfully');
        fetchData();
      } catch {
        toast.error('Failed to delete log');
      }
    }
  };

  const getTotalDuration = () => {
    return logs.reduce((total, log) => total + (log['Durasi (Menit)'] || 0), 0);
  };

  const columns = [
    { header: '#', key: 'No', width: 'w-12', centerHeader: true, centerData: true },
    { header: 'Course', key: 'Mata Kuliah', width: 'w-48', centerHeader: true, render: (value: string) => (
          <div className="table-cell-course">{value}</div>
      )},
    { header: 'Date', key: 'Tanggal', width: 'w-24', centerHeader: true, centerData: true },
    { header: 'Start', key: 'Jam Mulai', width: 'w-24', centerHeader: true, centerData: true },
    { header: 'End', key: 'Jam Selesai', width: 'w-24', centerHeader: true, centerData: true },
    { header: 'Duration', key: 'Durasi (Menit)', width: 'w-24', centerHeader: true, centerData: true },
    { header: 'Category', key: 'Kategori', width: 'w-32', centerHeader: true, centerData: true, render: (value: string) => (
          <span className="badge badge-indigo">{value}</span>
      )},
    { header: 'Description', key: 'Deskripsi Tugas', centerHeader: true },
    { header: 'Status', key: 'Status', width: 'w-28', centerHeader: true, centerData: true, render: (value: string) => (
          <span className={`badge ${value.toLowerCase().includes('disetujui') ? 'badge-green' : 'badge-yellow'}`}>
        {value}
      </span>
      )},
    { header: 'Actions', key: 'LogID', width: 'w-32', centerHeader: true, centerData: true, render: (_value: string, row: Log) => {
        const canEdit = row.Status.toLowerCase() === 'dilaporkan';
        return (
            <div className="flex items-center justify-center space-x-2">
              <button
                  onClick={() => handleEditLog(row as CombinedLog)}
                  className="action-button-edit"
                  title={canEdit ? 'Edit log' : 'Cannot edit approved logs'}
                  disabled={!canEdit}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                  onClick={() => handleDeleteLog(row)}
                  className="action-button-delete"
                  title={canEdit ? 'Delete log' : 'Cannot delete approved logs'}
                  disabled={!canEdit}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
        );
      }}
  ];

  return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-blue-50">
        <Navbar />
        <div className="flex-grow pt-16 pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
                onClick={handleBack}
                className="btn-secondary mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatsCard title="Total Logs" value={logs.length} icon={ClipboardList} />
              <StatsCard title="Total Duration" value={`${getTotalDuration()} minutes`} icon={Clock} />
              <StatsCard title="Active Positions" value={activeVacancies.length} icon={BookOpen} />
            </div>

            <div className="card p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Create New Log</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeVacancies.map((vacancy) => (
                    <button
                        key={vacancy.LogID}
                        onClick={() => handleCreateLog(vacancy)}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <h4 className="font-medium text-gray-900 mb-1">{vacancy['Mata Kuliah']}</h4>
                      <p className="text-sm text-gray-500">
                        {vacancy.Semester} - {vacancy['Tahun Ajaran']}
                      </p>
                    </button>
                ))}
              </div>
            </div>

            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">All Activity Logs</h3>
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

        {showForm && selectedVacancy && (
            <LogForm
                vacancy={selectedVacancy}
                log={selectedLog}
                onClose={() => {
                  setShowForm(false);
                  setSelectedLog(null);
                  setSelectedVacancy(null);
                }}
                onSave={() => {
                  setShowForm(false);
                  setSelectedLog(null);
                  setSelectedVacancy(null);
                  fetchData();
                }}
            />
        )}
      </div>
  );
}