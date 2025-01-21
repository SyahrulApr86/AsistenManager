import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, DollarSign, User, LogOut, ArrowLeft, BookOpen, ClipboardList, Clock } from 'lucide-react';
import { Log } from '../types/log';
import toast from 'react-hot-toast';
import { getLogs } from '../lib/api';

export default function VacancyLogs() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut } = useAuth();
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

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const getTotalDuration = () => {
    return logs.reduce((total, log) => total + (log['Durasi (Menit)'] || 0), 0);
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
        {/* Navbar */}
        <nav className="bg-white shadow-lg fixed w-full z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <BookOpen className="h-8 w-8 text-indigo-600" />
                  <span className="ml-2 text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  AsistenManager
                </span>
                </div>
                <div className="hidden md:ml-6 md:flex md:space-x-8">
                  <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-indigo-600">
                    <Home className="h-4 w-4 mr-1" />
                    Home
                  </a>
                  <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors duration-200">
                    <Calendar className="h-4 w-4 mr-1" />
                    Calendar
                  </a>
                  <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors duration-200">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Finance
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center space-x-4">
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">{user?.username}</span>
                  </div>
                  <button
                      onClick={handleLogout}
                      className="btn-secondary"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="pt-16 pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <button
                onClick={handleBack}
                className="btn-secondary mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </button>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Logs</p>
                    <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
                  </div>
                  <ClipboardList className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Duration</p>
                    <p className="text-2xl font-bold text-gray-900">{getTotalDuration()} minutes</p>
                  </div>
                  <Clock className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="text-2xl font-bold text-green-600">Active</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Activity Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                  <tr>
                    <th scope="col" className="table-header w-12">#</th>
                    <th scope="col" className="table-header w-24">Date</th>
                    <th scope="col" className="table-header w-24">Start</th>
                    <th scope="col" className="table-header w-24">End</th>
                    <th scope="col" className="table-header w-24">Duration</th>
                    <th scope="col" className="table-header w-32">Category</th>
                    <th scope="col" className="table-header">Description</th>
                    <th scope="col" className="table-header w-28">Status</th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        </td>
                      </tr>
                  ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                          No logs found
                        </td>
                      </tr>
                  ) : (
                      logs.map((log) => (
                          <tr key={log.LogID} className="table-row">
                            <td className="table-cell text-center">{log.No}</td>
                            <td className="table-cell">{log.Tanggal}</td>
                            <td className="table-cell">{log['Jam Mulai']}</td>
                            <td className="table-cell">{log['Jam Selesai']}</td>
                            <td className="table-cell">{log['Durasi (Menit)']}</td>
                            <td className="table-cell">
                          <span className="badge badge-indigo">
                            {log.Kategori}
                          </span>
                            </td>
                            <td className="table-cell">
                              <div className="truncate max-w-md" title={log['Deskripsi Tugas']}>
                                {log['Deskripsi Tugas']}
                              </div>
                            </td>
                            <td className="table-cell">
                          <span className={`badge ${
                              log.Status.toLowerCase().includes('disetujui')
                                  ? 'badge-green'
                                  : 'badge-yellow'
                          }`}>
                            {log.Status}
                          </span>
                            </td>
                          </tr>
                      ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white shadow-inner mt-auto">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm text-gray-500">
              © 2024 AsistenManager |{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500 transition-colors duration-200">Privacy Policy</a> |{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500 transition-colors duration-200">Terms of Service</a>
            </div>
          </div>
        </footer>
      </div>
  );
}