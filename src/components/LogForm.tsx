import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Calendar } from 'lucide-react';
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

// Days of the week
const daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function LogForm({ vacancy, log, onClose, onSave }: LogFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
      const [day, month, year] = log.Tanggal.split('-');
      const [startHour, startMinute] = log['Jam Mulai'].split(':');
      const [endHour, endMinute] = log['Jam Selesai'].split(':');

      const logDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      setSelectedDate(logDate);

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
    } else {
      // Set today's date as default for new logs
      const today = new Date();
      setSelectedDate(today);
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
    if (!selectedDate) {
      toast.error('Please select a date');
      return false;
    }

    const now = new Date();
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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setFormData({
      ...formData,
      tanggal: {
        day: date.getDate().toString().padStart(2, '0'),
        month: (date.getMonth() + 1).toString().padStart(2, '0'),
        year: date.getFullYear().toString()
      }
    });
    setShowCalendar(false);
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
        toast.success('Log updated successfully');
      } else {
        if (!vacancy['Create Log Link']) {
          throw new Error('Create log link not found');
        }
        await createLog(user.sessionId, user.csrfToken, vacancy['Create Log Link'], formData);
        toast.success('Log created successfully');
      }
      onSave();
    } catch (error) {
      console.error('Error:', error);
      toast.error(log ? 'Failed to update log' : 'Failed to create log');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = getDaysInMonth(year, month);
    const today = new Date();

    // Adjust first day to start from Monday (0) instead of Sunday (6)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();
      const isPast = date < today;
      const isFuture = date > today;

      days.push(
          <button
              key={day}
              type="button"
              disabled={isFuture}
              onClick={() => handleDateSelect(date)}
              className={`
            h-8 w-8 rounded-full flex items-center justify-center text-sm
            ${isSelected ? 'bg-indigo-600 text-white' : ''}
            ${isToday ? 'bg-indigo-100 text-indigo-600' : ''}
            ${isPast ? 'hover:bg-gray-100' : ''}
            ${isFuture ? 'text-gray-300 cursor-not-allowed' : ''}
          `}
          >
            {day}
          </button>
      );
    }

    return days;
  };

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
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <div className="relative">
                    <input
                        type="text"
                        value={selectedDate ? selectedDate.toLocaleDateString() : ''}
                        readOnly
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="input-field pr-10 cursor-pointer"
                        placeholder="Select date"
                        required
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>

                  {showCalendar && (
                      <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border p-4">
                        <div className="flex items-center justify-between mb-4">
                          <button
                              type="button"
                              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                              className="p-1 hover:bg-gray-100 rounded"
                          >
                            ←
                          </button>
                          <span className="font-medium">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                          <button
                              type="button"
                              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                              className="p-1 hover:bg-gray-100 rounded"
                          >
                            →
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {daysOfWeek.map(day => (
                              <div key={day} className="h-8 w-8 flex items-center justify-center text-xs text-gray-500">
                                {day}
                              </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {generateCalendarDays()}
                        </div>
                      </div>
                  )}
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