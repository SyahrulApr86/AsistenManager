import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, DollarSign, User, LogOut, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Lowongan } from '../types/log';
import toast from 'react-hot-toast';
import { getLowongan } from '../lib/api';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState<Lowongan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVacancies = async () => {
      if (!user?.sessionId || !user?.csrfToken) {
        toast.error('Session not found');
        return;
      }

      console.log('Session:', user.sessionId);
        console.log('CSRF Token:', user.csrfToken);

      try {
        const data = await getLowongan(user.sessionId, user.csrfToken);
        setVacancies(data);
      } catch (error) {
        toast.error('Failed to fetch vacancies');
        console.error('Error fetching vacancies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVacancies();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleViewLogs = (logId: string) => {
    navigate(`/vacancy/${logId}`);
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
                <a href="#" className="hover:text-gray-700">Home</a>
              </li>
              <li>
                <span className="mx-2">/</span>
              </li>
              <li className="text-gray-700">Dashboard</li>
            </ol>
          </nav>

          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome, {user?.username}!
            </h2>
            <p className="text-gray-600">Here are your accepted vacancies:</p>
          </div>

          {/* Vacancies Table */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Accepted Vacancies</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mata Kuliah</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tahun Ajaran</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosen</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : vacancies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No vacancies found
                      </td>
                    </tr>
                  ) : (
                    vacancies.map((vacancy) => (
                      <tr key={vacancy.LogID}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.No}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vacancy['Mata Kuliah']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.Semester}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy['Tahun Ajaran']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.Dosen}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewLogs(vacancy.LogID)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Logs
                          </button>
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
            <a href="#" className="text-indigo-600 hover:text-indigo-500">Privacy Policy</a> |{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-500">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}