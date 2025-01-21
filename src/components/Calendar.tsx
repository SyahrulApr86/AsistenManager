// Calendar.tsx
import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Log } from '../types/log';

interface CalendarProps {
    logs: Log[];
    onEventClick?: (log: Log) => void;
    className?: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: {
        description: string;
        duration: number;
        kategori: string;
        status: string;
        course: string;
    };
}

export default function Calendar({ logs, onEventClick, className }: CalendarProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [courseColors, setCourseColors] = useState<Record<string, string>>({});

    // Function to generate a consistent color for each course
    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, 70%, 65%)`;
    };

    useEffect(() => {
        // Generate colors for each unique course
        const colors: Record<string, string> = {};
        const uniqueCourses = [...new Set(logs.map(log => log['Mata Kuliah']))];
        uniqueCourses.forEach(course => {
            colors[course] = stringToColor(course);
        });
        setCourseColors(colors);

        // Convert logs to calendar events
        const calendarEvents = logs.map(log => {
            const [day, month, year] = log.Tanggal.split('-');
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            return {
                id: log.LogID,
                title: `${log['Mata Kuliah']} - ${log.Kategori}`,
                start: `${formattedDate}T${log['Jam Mulai']}`,
                end: `${formattedDate}T${log['Jam Selesai']}`,
                backgroundColor: colors[log['Mata Kuliah']],
                borderColor: 'transparent',
                extendedProps: {
                    description: log['Deskripsi Tugas'],
                    duration: log['Durasi (Menit)'],
                    kategori: log.Kategori,
                    status: log.Status,
                    course: log['Mata Kuliah']
                }
            };
        });

        setEvents(calendarEvents);
    }, [logs]);

    return (
        <div className={`calendar-container ${className}`}>
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'timeGridWeek,timeGridDay'
                }}
                events={events}
                eventClick={info => {
                    const log = logs.find(l => l.LogID === info.event.id);
                    if (log && onEventClick) {
                        onEventClick(log);
                    }
                }}
                eventDidMount={info => {
                    info.el.title = `${info.event.extendedProps.course}\n${info.event.extendedProps.description}`;
                }}
                height={600} // Set a fixed height
                allDaySlot={false}
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                nowIndicator={true}
                weekends={true}
                expandRows={true}
                stickyHeaderDates={true}
                dayMaxEvents={true}
            />

            {/* Compact Course Legend */}
            <div className="mt-4 p-2 bg-white rounded-lg shadow text-sm">
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(courseColors).map(([course, color]) => (
                        <div key={course} className="flex items-center gap-1">
                            <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-gray-600 truncate" title={course}>
                                {course}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}