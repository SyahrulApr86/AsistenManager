import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, DollarSign, User, LogOut, ArrowLeft } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-indigo-600 text-white shadow-lg fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Home className="h-6 w-6 mr-2" />
                <span className="text-xl font-bold">AsistenManager</span>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white">
                  <Home className="h-4 w-4 mr-1" />
                  Home
                </a>
                <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-indigo-200 hover:text-white">
                  <Calendar className="h-4 w-4 mr-1" />
                  Calendar
                </a>
                <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-indigo-200 hover:text-white">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Keuangan
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-sm mr-4">
                  <User className="h-4 w-4 inline mr-1" />
                  {user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="py-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <button onClick={handleBack} className="hover:text-gray-700 flex items-center">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Dashboard
                </button>
              </li>
              <li>
                <span className="mx-2">/</span>
              </li>
              <li className="text-gray-700">Vacancy Logs</li>
            </ol>
          </nav>

          {/* Logs Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Logs</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jam Mulai</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jam Selesai</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durasi (Menit)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi Tugas</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.LogID}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.No}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.Tanggal}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log['Jam Mulai']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log['Jam Selesai']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log['Durasi (Menit)']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.Kategori}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{log['Deskripsi Tugas']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.Status}</td>
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
            <a href="#" className="text-indigo-600 hover:text-indigo-500">Privacy Policy</a> |{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-500">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}  