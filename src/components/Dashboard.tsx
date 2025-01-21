import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, History, Eye, ClipboardList, Calendar as CalendarIcon } from 'lucide-react';
import { Lowongan, Log } from '../types/log';
import toast from 'react-hot-toast';
import { getLowongan, getLogs } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './shared/Navbar';
import Footer from './shared/Footer';
import Table from './shared/Table';
import StatsCard from './shared/StatsCard';
import Calendar from './Calendar';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allVacancies, setAllVacancies] = useState<Lowongan[]>([]);
  const [activeVacancies, setActiveVacancies] = useState<Lowongan[]>([]);
  const [inactiveVacancies, setInactiveVacancies] = useState<Lowongan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [allLogs, setAllLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (!user?.sessionId || !user?.csrfToken) {
      console.log('No session data found:', user);
      toast.error('Session not found');
      return;
    }

    const fetchData = async () => {
      try {
        const data = await getLowongan(user.sessionId, user.csrfToken);
        setAllVacancies(data);

        if (data.length > 0) {
          const sortedVacancies = [...data].sort((a, b) => {
            const yearComparison = b['Tahun Ajaran'].localeCompare(a['Tahun Ajaran']);
            if (yearComparison !== 0) return yearComparison;
            return b.Semester.localeCompare(a.Semester);
          });

          const latestYear = sortedVacancies[0]['Tahun Ajaran'];
          const latestSemester = sortedVacancies[0].Semester;

          const active = sortedVacancies.filter(
              v => v['Tahun Ajaran'] === latestYear && v.Semester === latestSemester
          );
          const inactive = sortedVacancies.filter(
              v => v['Tahun Ajaran'] !== latestYear || v.Semester !== latestSemester
          );

          setActiveVacancies(active);
          setInactiveVacancies(inactive);

          // Fetch logs for active vacancies
          const logs: Log[] = [];
          for (const vacancy of active) {
            const { logs: vacancyLogs } = await getLogs(user.sessionId, user.csrfToken, vacancy.LogID);
            logs.push(...vacancyLogs.map(log => ({
              ...log,
              'Mata Kuliah': vacancy['Mata Kuliah']
            })));
          }
          setAllLogs(logs);
        }
      } catch (error) {
        console.error('Error fetching vacancies:', error);
        toast.error(error.message || 'Failed to fetch vacancies');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleViewLogs = (logId: string) => {
    navigate(`/vacancy/${logId}`);
  };

  const columns = [
    { header: '#', key: 'No', width: 'w-12', centerHeader: true, centerData: true },
    { header: 'Course', key: 'Mata Kuliah', centerHeader: true, render: (value: string) => (
          <div className="table-cell-course">{value}</div>
      )},
    { header: 'Semester', key: 'Semester', width: 'w-24', centerHeader: true, centerData: true },
    { header: 'Year', key: 'Tahun Ajaran', width: 'w-28', centerHeader: true, centerData: true },
    { header: 'Lecturer', key: 'Dosen', centerHeader: true, render: (value: string) => (
          <div className="lecturer-list">
            {value.split(',').map((lecturer: string, index: number) => (
                <span key={index} className="lecturer-item">{lecturer.trim()}</span>
            ))}
          </div>
      )},
    { header: 'Actions', key: 'LogID', width: 'w-28', centerHeader: true, centerData: true, render: (value: string) => (
          <button onClick={() => handleViewLogs(value)} className="btn-primary py-1 px-3">
            <Eye className="h-4 w-4 mr-1" />
            View
          </button>
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
                    Welcome back, {user?.username}!
                  </h2>
                  <p className="text-gray-600">
                    Manage your teaching assistant positions
                  </p>
                </div>
                <BookOpen className="h-12 w-12 text-indigo-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatsCard title="Total Positions" value={allVacancies.length} icon={BookOpen} />
              <StatsCard title="Active Positions" value={activeVacancies.length} icon={CheckCircle} iconColor="text-green-600" />
              <StatsCard title="Past Positions" value={inactiveVacancies.length} icon={History} iconColor="text-gray-600" />
              <button
                  onClick={() => navigate('/calendar')}
                  className="card p-6 hover:shadow-xl transition-shadow duration-300 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-600">View All Logs</p>
                  <p className="text-2xl font-bold text-indigo-600">Calendar</p>
                </div>
                <ClipboardList className="h-8 w-8 text-indigo-600" />
              </button>
            </div>

            <div className="card p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Active Positions</h3>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                {activeVacancies.length} Active
              </span>
              </div>
              <Table
                  columns={columns}
                  data={activeVacancies}
                  isLoading={loading}
                  emptyMessage="No active positions found"
              />
            </div>

            <div className="card p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Calendar View</h3>
                </div>
                <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="btn-secondary"
                >
                  {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                </button>
              </div>

              {showCalendar && (
                  <Calendar
                      logs={allLogs}
                      onEventClick={(log) => {
                        if (log) {
                          navigate(`/vacancy/${log.LogID}`);
                        }
                      }}
                  />
              )}
            </div>

            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <History className="h-5 w-5 text-gray-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Past Positions</h3>
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                {inactiveVacancies.length} Past
              </span>
              </div>
              <Table
                  columns={columns}
                  data={inactiveVacancies}
                  isLoading={loading}
                  emptyMessage="No past positions found"
              />
            </div>
          </div>
        </div>
        <Footer />
      </div>
  );
}