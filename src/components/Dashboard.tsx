import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, DollarSign, User, LogOut, Eye, BookOpen, Clock, CheckCircle, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Lowongan } from '../types/log';
import toast from 'react-hot-toast';
import { getLowongan } from '../lib/api';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [allVacancies, setAllVacancies] = useState<Lowongan[]>([]);
  const [activeVacancies, setActiveVacancies] = useState<Lowongan[]>([]);
  const [inactiveVacancies, setInactiveVacancies] = useState<Lowongan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.sessionId || !user?.csrfToken) {
      console.log('No session data found:', user);
      toast.error('Session not found');
      return;
    }

    console.log('Fetching vacancies with session:', {
      sessionId: user.sessionId,
      csrfToken: user.csrfToken
    });

    getLowongan(user.sessionId, user.csrfToken)
      .then((data) => {
        console.log('Received vacancies:', data);
        setAllVacancies(data);

        // Find the most recent semester and year
        if (data.length > 0) {
          const sortedVacancies = [...data].sort((a, b) => {
            // First compare academic year
            const yearComparison = b['Tahun Ajaran'].localeCompare(a['Tahun Ajaran']);
            if (yearComparison !== 0) return yearComparison;
            
            // If same year, compare semester (assuming format is "Genap"/"Ganjil")
            return b.Semester.localeCompare(a.Semester);
          });

          const latestYear = sortedVacancies[0]['Tahun Ajaran'];
          const latestSemester = sortedVacancies[0].Semester;

          // Split into active and inactive
          const active = sortedVacancies.filter(
            v => v['Tahun Ajaran'] === latestYear && v.Semester === latestSemester
          );
          const inactive = sortedVacancies.filter(
            v => v['Tahun Ajaran'] !== latestYear || v.Semester !== latestSemester
          );

          setActiveVacancies(active);
          setInactiveVacancies(inactive);
        }
      })
      .catch((error) => {
        console.error('Error fetching vacancies:', error);
        toast.error(error.message || 'Failed to fetch vacancies');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleViewLogs = (logId: string) => {
    navigate(`/vacancy/${logId}`);
  };

  const VacancyTable = ({ vacancies, isLoading }: { vacancies: Lowongan[], isLoading: boolean }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th scope="col" className="table-header">#</th>
            <th scope="col" className="table-header">Course</th>
            <th scope="col" className="table-header">Semester</th>
            <th scope="col" className="table-header">Academic Year</th>
            <th scope="col" className="table-header">Lecturer</th>
            <th scope="col" className="table-header">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center">
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </td>
            </tr>
          ) : vacancies.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                No positions found
              </td>
            </tr>
          ) : (
            vacancies.map((vacancy) => (
              <tr key={vacancy.LogID} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="table-cell">{vacancy.No}</td>
                <td className="table-cell font-medium text-gray-900">{vacancy['Mata Kuliah']}</td>
                <td className="table-cell">{vacancy.Semester}</td>
                <td className="table-cell">{vacancy['Tahun Ajaran']}</td>
                <td className="table-cell">{vacancy.Dosen}</td>
                <td className="table-cell">
                  <button
                    onClick={() => handleViewLogs(vacancy.LogID)}
                    className="btn-primary"
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
  );

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
          {/* Welcome Section */}
          <div className="card p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.username}!
                </h2>
                <p className="text-gray-600">
                  Manage your teaching assistant positions
                </p>
              </div>
              <Clock className="h-12 w-12 text-indigo-600" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Positions</p>
                  <p className="text-2xl font-bold text-gray-900">{allVacancies.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Positions</p>
                  <p className="text-2xl font-bold text-green-600">{activeVacancies.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Past Positions</p>
                  <p className="text-2xl font-bold text-gray-600">{inactiveVacancies.length}</p>
                </div>
                <History className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Active Positions Section */}
          <div className="card p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Active Positions
                </h3>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                {activeVacancies.length} Active
              </span>
            </div>
            <VacancyTable vacancies={activeVacancies} isLoading={loading} />
          </div>

          {/* Past Positions Section */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-gray-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Past Positions
                </h3>
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                {inactiveVacancies.length} Past
              </span>
            </div>
            <VacancyTable vacancies={inactiveVacancies} isLoading={loading} />
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