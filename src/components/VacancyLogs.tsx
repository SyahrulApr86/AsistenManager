import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, ClipboardList, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Log, Lowongan } from '../types/log';
import toast from 'react-hot-toast';
import { getLogs, getLowongan, deleteLog } from '../lib/api';
import Navbar from './shared/Navbar';
import Footer from './shared/Footer';
import Table from './shared/Table';
import StatsCard from './shared/StatsCard';
import LogForm from './LogForm';

export default function VacancyLogs() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentVacancy, setCurrentVacancy] = useState<Lowongan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [createLogLink, setCreateLogLink] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.sessionId || !user?.csrfToken || !id) {
      toast.error('Session or vacancy ID not found');
      return;
    }

    try {
      // First fetch all vacancies to determine if this one is active
      const vacancies = await getLowongan(user.sessionId, user.csrfToken);
      if (vacancies.length > 0) {
        const sortedVacancies = [...vacancies].sort((a, b) => {
          const yearComparison = b['Tahun Ajaran'].localeCompare(a['Tahun Ajaran']);
          if (yearComparison !== 0) return yearComparison;
          return b.Semester.localeCompare(a.Semester);
        });

        const latestYear = sortedVacancies[0]['Tahun Ajaran'];
        const latestSemester = sortedVacancies[0].Semester;

        const vacancy = vacancies.find(v => v.LogID === id);
        if (vacancy) {
          setCurrentVacancy(vacancy);
          setIsActive(
              vacancy['Tahun Ajaran'] === latestYear &&
              vacancy.Semester === latestSemester
          );
        }
      }

      // Then fetch the logs
      const { logs: logsData, createLogLink: logLink } = await getLogs(user.sessionId, user.csrfToken, id);
      setLogs(logsData);
      setCreateLogLink(logLink);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleCreateLog = () => {
    setSelectedLog(null);
    setShowForm(true);
  };

  const handleEditLog = (log: Log) => {
    setSelectedLog(log);
    setShowForm(true);
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
                  onClick={() => handleEditLog(row)}
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
              <StatsCard
                  title="Status"
                  value={isActive ? "Active" : "Past"}
                  icon={() => (
                      <div className={`h-8 w-8 rounded-full ${isActive ? 'bg-green-100' : 'bg-gray-100'} flex items-center justify-center`}>
                        <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      </div>
                  )}
                  iconColor={isActive ? "text-green-600" : "text-gray-600"}
              />
            </div>

            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Activity Logs</h3>
                {createLogLink && (
                    <button
                        onClick={handleCreateLog}
                        className="btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Log
                    </button>
                )}
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

        {showForm && currentVacancy && createLogLink && (
            <LogForm
                vacancy={{
                  ...currentVacancy,
                  'Create Log Link': createLogLink
                }}
                log={selectedLog}
                onClose={() => {
                  setShowForm(false);
                  setSelectedLog(null);
                }}
                onSave={() => {
                  setShowForm(false);
                  setSelectedLog(null);
                  fetchData();
                }}
            />
        )}
      </div>
  );
}