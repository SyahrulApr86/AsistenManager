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

export default function LogForm({ vacancy, log, onClose, onSave }: LogFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LogFormData>({
    kategori_log: '',
    deskripsi: '',
    tanggal: {
      day: new Date().getDate().toString(),
      month: (new Date().getMonth() + 1).toString(),
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
        tanggal: { day, month, year },
        waktu_mulai: { hour: startHour, minute: startMinute },
        waktu_selesai: { hour: endHour, minute: endMinute }
      });
    }
  }, [log]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.sessionId || !user?.csrfToken) {
      toast.error('Session not found');
      return;
    }

    setLoading(true);
    try {
      if (log) {
        await updateLog(user.sessionId, user.csrfToken, log.LogID, formData);
        toast.success('Log updated successfully');
      } else {
        const createLogId = vacancy['Create Log Link'].split('/').slice(-2)[0];
        await createLog(user.sessionId, user.csrfToken, createLogId, formData);
        toast.success('Log created successfully');
      }
      onSave();
    } catch {
      toast.error(log ? 'Failed to update log' : 'Failed to create log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
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
              className="input-field"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="DD"
                  value={formData.tanggal.day}
                  onChange={(e) => setFormData({
                    ...formData,
                    tanggal: { ...formData.tanggal, day: e.target.value }
                  })}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="MM"
                  value={formData.tanggal.month}
                  onChange={(e) => setFormData({
                    ...formData,
                    tanggal: { ...formData.tanggal, month: e.target.value }
                  })}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="YYYY"
                  value={formData.tanggal.year}
                  onChange={(e) => setFormData({
                    ...formData,
                    tanggal: { ...formData.tanggal, year: e.target.value }
                  })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="HH"
                  value={formData.waktu_mulai.hour}
                  onChange={(e) => setFormData({
                    ...formData,
                    waktu_mulai: { ...formData.waktu_mulai, hour: e.target.value }
                  })}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="MM"
                  value={formData.waktu_mulai.minute}
                  onChange={(e) => setFormData({
                    ...formData,
                    waktu_mulai: { ...formData.waktu_mulai, minute: e.target.value }
                  })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="HH"
                  value={formData.waktu_selesai.hour}
                  onChange={(e) => setFormData({
                    ...formData,
                    waktu_selesai: { ...formData.waktu_selesai, hour: e.target.value }
                  })}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="MM"
                  value={formData.waktu_selesai.minute}
                  onChange={(e) => setFormData({
                    ...formData,
                    waktu_selesai: { ...formData.waktu_selesai, minute: e.target.value }
                  })}
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
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