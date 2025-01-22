import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, ClipboardList, Clock, Pencil, Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import { Log, Lowongan } from '../types/log';
import toast from 'react-hot-toast';
import { getLogs, getLowongan, deleteLog } from '../lib/api';
import { findOverlappingLogs, OverlapInfo } from '../lib/utils';
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
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [overlappingLogs, setOverlappingLogs] = useState<OverlapInfo[]>([]);

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

  const handleCheckOverlap = async () => {
    if (!user?.sessionId || !user?.csrfToken) {
      toast.error('Session not found');
      return;
    }

    try {
      let logsToCheck: Log[] = [];

      // If this is a past position, get logs from active positions too
      if (!isActive) {
        // Get logs from all active positions
        const vacancies = await getLowongan(user.sessionId, user.csrfToken);
        const sortedVacancies = [...vacancies].sort((a, b) => {
          const yearComparison = b['Tahun Ajaran'].localeCompare(a['Tahun Ajaran']);
          if (yearComparison !== 0) return yearComparison;
          return b.Semester.localeCompare(a.Semester);
        });

        const latestYear = sortedVacancies[0]['Tahun Ajaran'];
        const latestSemester = sortedVacancies[0].Semester;

        const activeVacancies = sortedVacancies.filter(
            v => v['Tahun Ajaran'] === latestYear && v.Semester === latestSemester
        );

        const activePositionsLogs: Log[] = [];
        for (const vacancy of activeVacancies) {
          const { logs: vacancyLogs } = await getLogs(user.sessionId, user.csrfToken, vacancy.LogID);
          activePositionsLogs.push(...vacancyLogs.map(log => ({
            ...log,
            'Mata Kuliah': vacancy['Mata Kuliah']
          })));
        }
        logsToCheck = [...logs, ...activePositionsLogs];
      } else {
        // For active positions, just check its own logs
        logsToCheck = logs;
      }

      const overlaps = findOverlappingLogs(logsToCheck);
      setOverlappingLogs(overlaps);
      setShowOverlapModal(true);

      if (overlaps.length === 0) {
        toast.success('No overlapping logs found!');
      }
    } catch (error) {
      console.error('Error checking overlaps:', error);
      toast.error('Failed to check for overlapping logs');
    }
  };

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
              <StatsCard title="Total Logs" value={logs.length} icon={ClipboardList}/>
              <StatsCard title="Total Duration" value={`${getTotalDuration()} minutes`} icon={Clock}/>
              <StatsCard
                  title="Status"
                  value={isActive ? "Active" : "Past"}
                  icon={() => (
                      <div
                          className={`h-8 w-8 rounded-full ${isActive ? 'bg-green-100' : 'bg-gray-100'} flex items-center justify-center`}>
                        <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      </div>
                  )}
                  iconColor={isActive ? "text-green-600" : "text-gray-600"}
              />
              <button
                  onClick={handleCheckOverlap}
                  className="card p-6 hover:shadow-xl transition-shadow duration-300 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-600">Check Schedule</p>
                  <p className="text-2xl font-bold text-orange-600">Overlaps</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600"/>
              </button>
            </div>

            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Activity Logs</h3>
                {createLogLink && (
                    <button
                        onClick={handleCreateLog}
                        className="btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-1"/>
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

        {/* Overlap Modal */}
        {showOverlapModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Schedule Overlaps
                  </h3>
                  <button
                      onClick={() => setShowOverlapModal(false)}
                      className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  {overlappingLogs.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900">No Overlaps Found</p>
                        <p className="text-gray-500">All your schedules are properly arranged.</p>
                      </div>
                  ) : (
                      <div className="space-y-6">
                        <p className="text-sm text-gray-500">
                          Found {overlappingLogs.length} overlapping schedule{overlappingLogs.length > 1 ? 's' : ''}.
                        </p>
                        {overlappingLogs.map((overlap, index) => (
                            <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-orange-800 mb-2">Schedule 1</h4>
                                  <div className="space-y-2">
                                    <p className="text-sm"><span className="font-medium">Course:</span> {overlap.log1.course}</p>
                                    <p className="text-sm"><span className="font-medium">Date:</span> {overlap.log1.date}</p>
                                    <p className="text-sm"><span className="font-medium">Time:</span> {overlap.log1.startTime} - {overlap.log1.endTime}</p>
                                    <p className="text-sm"><span className="font-medium">Description:</span> {overlap.log1.description}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium text-orange-800 mb-2">Schedule 2</h4>
                                  <div className="space-y-2">
                                    <p className="text-sm"><span className="font-medium">Course:</span> {overlap.log2.course}</p>
                                    <p className="text-sm"><span className="font-medium">Date:</span> {overlap.log2.date}</p>
                                    <p className="text-sm"><span className="font-medium">Time:</span> {overlap.log2.startTime} - {overlap.log2.endTime}</p>
                                    <p className="text-sm"><span className="font-medium">Description:</span> {overlap.log2.description}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4 p-6 border-t">
                  <button
                      onClick={() => setShowOverlapModal(false)}
                      className="btn-primary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
        )}

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