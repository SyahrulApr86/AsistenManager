import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { Log } from '../types/log';
import { useAuth } from '../contexts/AuthContext';
import { getLogs, getLowongan } from '../lib/api';
import Calendar from './Calendar';
import Navbar from './shared/Navbar';
import Footer from './shared/Footer';
import toast from 'react-hot-toast';

export default function CalendarView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.sessionId || !user?.csrfToken) {
        toast.error('Session not found');
        return;
      }

      try {
        // Fetch ALL vacancies for the complete log history
        const vacancies = await getLowongan(user.sessionId, user.csrfToken);
        const allLogs: Log[] = [];

        // Get logs from all vacancies, not just active ones
        for (const vacancy of vacancies) {
          const { logs: vacancyLogs } = await getLogs(user.sessionId, user.csrfToken, vacancy.LogID);
          allLogs.push(...vacancyLogs.map(log => ({
            ...log,
            'Mata Kuliah': vacancy['Mata Kuliah']
          })));
        }

        setLogs(allLogs);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleBack = () => {
    navigate('/dashboard');
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

          <div className="card p-8">
            <Calendar
              logs={logs}
              onEventClick={setSelectedLog}
            />
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                Log Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Course</label>
                <p className="text-gray-900">{selectedLog['Mata Kuliah']}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Date & Time</label>
                <p className="text-gray-900">
                  {selectedLog.Tanggal} ({selectedLog['Jam Mulai']} - {selectedLog['Jam Selesai']})
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <p className="text-gray-900">{selectedLog['Durasi (Menit)']} minutes</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Category</label>
                <p className="text-gray-900">{selectedLog.Kategori}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{selectedLog['Deskripsi Tugas']}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-block mt-1 px-2 py-1 text-sm rounded-full ${
                  selectedLog.Status.toLowerCase().includes('disetujui')
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedLog.Status}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-4 p-6 border-t">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => navigate(`/vacancy/${selectedLog.LogID}`)}
                className="btn-primary"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}