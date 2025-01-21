import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';
import { Log, LogFormData, LOG_CATEGORIES } from '../types/log';
import { createLog, updateLog } from '../lib/api';
import toast from 'react-hot-toast';

interface LogFormProps {
  vacancy: {
    'Create Log Link': string;
    LogID: string;
  };
  log?: Log | null;
  onClose: () => void;
  onSave: () => void;
}

// Generate hours array (00-23)
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
// Minutes array (00, 15, 30, 45)
const minutes = ['00', '15', '30', '45'];

export default function LogForm({ vacancy, log, onClose, onSave }: LogFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LogFormData>({
    kategori_log: '',
    deskripsi: '',
    tanggal: {
      day: new Date().getDate().toString().padStart(2, '0'),
      month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      year: new Date().getFullYear().toString()
    },
    waktu_mulai: {
      hour: '08',
      minute: '00'
    },
    waktu_selesai: {
      hour: '09',
      minute: '00'
    }
  });

  useEffect(() => {
    if (log) {
      // Parse existing log data
      const [day, month, year] = log.Tanggal.split('-');
      const [startHour, startMinute] = log['Jam Mulai'].split(':');
      const [endHour, endMinute] = log['Jam Selesai'].split(':');

      setFormData({
        kategori_log: Object.entries(LOG_CATEGORIES).find(([_, value]) => value === log.Kategori)?.[0] || '1',
        deskripsi: log['Deskripsi Tugas'],
        tanggal: {
          day: day.padStart(2, '0'),
          month: month.padStart(2, '0'),
          year
        },
        waktu_mulai: {
          hour: startHour.padStart(2, '0'),
          minute: startMinute.padStart(2, '0')
        },
        waktu_selesai: {
          hour: endHour.padStart(2, '0'),
          minute: endMinute.padStart(2, '0')
        }
      });
    }
  }, [log]);

  const validateTime = () => {
    const startTime = parseInt(formData.waktu_mulai.hour) * 60 + parseInt(formData.waktu_mulai.minute);
    const endTime = parseInt(formData.waktu_selesai.hour) * 60 + parseInt(formData.waktu_selesai.minute);

    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return false;
    }

    return true;
  };

  const validateDate = () => {
    const now = new Date();
    const selectedDate = new Date(
        parseInt(formData.tanggal.year),
        parseInt(formData.tanggal.month) - 1,
        parseInt(formData.tanggal.day)
    );
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if selected date is in the future
    if (selectedDate > today) {
      toast.error('Cannot select future dates');
      return false;
    }

    // Check if it's today and before 7 AM
    if (selectedDate.getTime() === today.getTime() && now.getHours() < 7) {
      toast.error('Cannot create logs for today before 7 AM');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.sessionId || !user?.csrfToken) {
      toast.error('Session not found');
      return;
    }

    if (!validateTime() || !validateDate()) {
      return;
    }

    setLoading(true);
    try {
      if (log) {
        await updateLog(user.sessionId, user.csrfToken, log.LogID, formData);
      } else {
        const createLogId = vacancy['Create Log Link'].split('/').slice(-2)[0];
        await createLog(user.sessionId, user.csrfToken, createLogId, formData);
      }
      onSave();
    } catch (error) {
      console.error('Error:', error);
      toast.error(log ? 'Failed to update log' : 'Failed to create log');
    } finally {
      setLoading(false);
    }
  };

  // Get available days for the current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const currentDate = new Date();
  const daysInMonth = getDaysInMonth(
      parseInt(formData.tanggal.year),
      parseInt(formData.tanggal.month)
  );

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-xl font-semibold text-gray-900">
              {log ? 'Edit Log' : 'Create New Log'}
            </h3>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                    value={formData.kategori_log}
                    onChange={(e) => setFormData({ ...formData, kategori_log: e.target.value })}
                    className="input-field"
                    required
                >
                  <option value="">Select a category</option>
                  {Object.entries(LOG_CATEGORIES).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    className="input-field min-h-[100px]"
                    required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                        value={formData.tanggal.day}
                        onChange={(e) => setFormData({
                          ...formData,
                          tanggal: { ...formData.tanggal, day: e.target.value }
                        })}
                        className="input-field"
                        required
                    >
                      {Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'))
                          .filter(day => {
                            const selectedDate = new Date(
                                parseInt(formData.tanggal.year),
                                parseInt(formData.tanggal.month) - 1,
                                parseInt(day)
                            );
                            const today = new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth(),
                                currentDate.getDate()
                            );
                            return selectedDate <= today;
                          })
                          .map(day => (
                              <option key={day} value={day}>{day}</option>
                          ))
                      }
                    </select>
                    <select
                        value={formData.tanggal.month}
                        onChange={(e) => setFormData({
                          ...formData,
                          tanggal: { ...formData.tanggal, month: e.target.value }
                        })}
                        className="input-field"
                        required
                    >
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
                          .filter(month => {
                            const selectedMonth = parseInt(month) - 1;
                            const selectedYear = parseInt(formData.tanggal.year);
                            return (
                                selectedYear < currentDate.getFullYear() ||
                                (selectedYear === currentDate.getFullYear() && selectedMonth <= currentDate.getMonth())
                            );
                          })
                          .map(month => (
                              <option key={month} value={month}>{month}</option>
                          ))
                      }
                    </select>
                    <select
                        value={formData.tanggal.year}
                        onChange={(e) => setFormData({
                          ...formData,
                          tanggal: { ...formData.tanggal, year: e.target.value }
                        })}
                        className="input-field"
                        required
                    >
                      {[currentDate.getFullYear(), currentDate.getFullYear() - 1].map(year => (
                          <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                        value={formData.waktu_mulai.hour}
                        onChange={(e) => setFormData({
                          ...formData,
                          waktu_mulai: { ...formData.waktu_mulai, hour: e.target.value }
                        })}
                        className="input-field"
                        required
                    >
                      {hours.map(hour => (
                          <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <select
                        value={formData.waktu_mulai.minute}
                        onChange={(e) => setFormData({
                          ...formData,
                          waktu_mulai: { ...formData.waktu_mulai, minute: e.target.value }
                        })}
                        className="input-field"
                        required
                    >
                      {minutes.map(minute => (
                          <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                        value={formData.waktu_selesai.hour}
                        onChange={(e) => setFormData({
                          ...formData,
                          waktu_selesai: { ...formData.waktu_selesai, hour: e.target.value }
                        })}
                        className="input-field"
                        required
                    >
                      {hours.map(hour => (
                          <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <select
                        value={formData.waktu_selesai.minute}
                        onChange={(e) => setFormData({
                          ...formData,
                          waktu_selesai: { ...formData.waktu_selesai, minute: e.target.value }
                        })}
                        className="input-field"
                        required
                    >
                      {minutes.map(minute => (
                          <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={loading}
              >
                Cancel
              </button>
              <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
              >
                {loading ? (
                    <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                      {log ? 'Updating...' : 'Creating...'} </span>
                ) : (
                    log ? 'Update Log' : 'Create Log'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}