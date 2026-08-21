import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDoctorAvailability, createDoctorAvailability, deleteDoctorAvailability } from '../api/availability';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Calendar, Trash2, ArrowLeft, ChevronLeft, ChevronRight, User, CalendarDays, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface AvailabilityItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface AppointmentItem {
  id: string;
  date: string;
  startTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  patient: {
    name: string;
    email: string;
  } | null;
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const getStartOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const getSafeDateString = (dateInput: any) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export default function DoctorAvailabilityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));

  // ----- Fetch Queries -----
  const { data: rawAvailabilities } = useQuery<AvailabilityItem[]>({
    queryKey: ['doctor-availability'],
    queryFn: () => fetchDoctorAvailability(),
    enabled: !!user,
  });

  const { data: rawAppointments } = useQuery<AppointmentItem[]>({
    queryKey: ['doctor-appointments'],
    queryFn: async () => {
      const res = await api.get('/appointments');
      return res.data;
    },
    enabled: !!user,
  });

  const availabilities = Array.isArray(rawAvailabilities) ? rawAvailabilities : [];
  const appointments = Array.isArray(rawAppointments) ? rawAppointments : [];

  // ----- Mutations -----
  const createMutation = useMutation({
    mutationFn: (payload: { date: string; startTime: string; endTime: string }) =>
      createDoctorAvailability(payload),
    onSuccess: () => {
      toast.success('Working slot added');
      queryClient.invalidateQueries({ queryKey: ['doctor-availability'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to save availability block';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDoctorAvailability(id),
    onSuccess: () => {
      toast.success('Block removed');
      queryClient.invalidateQueries({ queryKey: ['doctor-availability'] });
    },
    onError: () => toast.error('Failed to remove block'),
  });

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    return d;
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const nextStart = new Date(currentWeekStart);
    nextStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(nextStart);
  };

  const toDateString = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const format12Hour = (time24: string) => {
    return time24 || '';
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    
    const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
    const year = start.getFullYear();
    
    const monthHeader = startMonth === endMonth 
      ? `${startMonth} ${year}` 
      : `${startMonth} / ${endMonth} ${year}`;
      
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    
    return `${monthHeader} (${startStr} – ${endStr})`;
  };

  // Quick Action: Add standard 9:00 - 17:00 day
  const handleQuickAddDay = (dateStr: string) => {
    createMutation.mutate({
      date: dateStr,
      startTime: '09:00',
      endTime: '17:00'
    });
  };

  // Quick Action: Clear all availability blocks for a day
  const handleClearDay = (dateStr: string) => {
    const dayBlocks = availabilities.filter(a => a.date === dateStr);
    if (dayBlocks.length === 0) {
      toast.error('No slots to clear on this day');
      return;
    }
    if (confirm(`Are you sure you want to clear all working slots for ${dateStr}?`)) {
      dayBlocks.forEach(block => deleteMutation.mutate(block.id));
    }
  };

  // Quick Action: Add single 1-hour slot
  const handleAddHourSlot = (dateStr: string, hour24: string) => {
    const [hStr, mStr] = hour24.split(':');
    const nextH = (parseInt(hStr, 10) + 1).toString().padStart(2, '0');
    createMutation.mutate({
      date: dateStr,
      startTime: hour24,
      endTime: `${nextH}:${mStr}`
    });
  };

    // Find upcoming appointments safely
    const upcomingAppointments = appointments
      .filter(appt => {
        const apptDate = new Date(appt?.date);
        return !isNaN(apptDate.getTime()) && apptDate.getTime() >= Date.now() && appt?.status !== 'CANCELLED' && appt?.status !== 'REJECTED';
      })
      .sort((a, b) => new Date(a?.date || 0).getTime() - new Date(b?.date || 0).getTime())
      .slice(0, 4);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen bg-slate-50/50">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full uppercase tracking-wider">
              1-Click Scheduler
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Interactive Doctor Agenda</h1>
            <p className="text-slate-500 text-sm mt-0.5">Click directly on any hour slot to add availability, or use 1-click day templates.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/doctor')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Column: Legend & Quick Summaries */}
          <div className="xl:col-span-1 space-y-6">
            {/* Guide & Shortcuts */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">How to use</h2>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded bg-primary-100 flex-shrink-0 mt-0.5"></div>
                  <p><strong>Click empty cells</strong> to instantly add a 1-hour available working slot.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded bg-emerald-100 flex-shrink-0 mt-0.5"></div>
                  <p><strong>Green cells</strong> show booked appointments. You cannot overwrite these.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded border border-slate-200 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs">⚡</div>
                  <p>Use <strong>⚡ Quick Day</strong> buttons at the top of day columns to set standard 9:00 – 17:00 hours instantly.</p>
                </div>
              </div>
            </div>

            {/* Mini Agenda summary card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="text-primary-600" size={20} />
                Upcoming Visits
              </h2>
              <div className="space-y-3">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No upcoming visits booked.</p>
                ) : (
                  upcomingAppointments.map((appt) => {
                    const dObj = new Date(appt?.date);
                    return (
                      <div key={appt.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-slate-500">
                            {dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-extrabold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                            {format12Hour(appt.startTime)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          {appt.patient?.name || 'Patient'}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Weekly Scheduler Grid */}
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
              {/* Week navigation controller */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <Calendar size={22} className="text-primary-600" />
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{formatWeekRange()}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                  >
                    Current Week
                  </button>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Time Grid Scheduler */}
              <div className="overflow-x-auto">
                <div className="min-w-[850px]">
                  {/* Column Headers + Actions */}
                  <div className="grid grid-cols-8 border-b border-slate-100 pb-4 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase py-1 self-center">Day</div>
                    {weekDays.map((day, idx) => {
                      const dateStr = toDateString(day);
                      const isToday = toDateString(new Date()) === dateStr;

                      return (
                        <div
                          key={idx}
                          className="py-1 px-1 rounded-xl flex flex-col justify-between"
                        >
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              {day.toLocaleDateString('en-US', { weekday: 'short' })}
                            </p>
                            <p className={`text-sm font-black mt-0.5 w-6 h-6 flex items-center justify-center mx-auto rounded-full ${
                              isToday ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20' : 'text-slate-800'
                            }`}>
                              {day.getDate()}
                            </p>
                          </div>
                          
                          {/* Column Action templates */}
                          <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-slate-50">
                            <button
                              onClick={() => handleQuickAddDay(dateStr)}
                              className="text-[9px] font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                              title="Set 9:00 - 17:00 availability instantly"
                            >
                              <Zap size={8} /> 9-17
                            </button>
                            <button
                              onClick={() => handleClearDay(dateStr)}
                              className="text-[9px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded"
                              title="Clear all availability slots for this day"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid Rows */}
                  <div className="divide-y divide-slate-100/70 select-none">
                    {HOURS.map((hour) => (
                      <div key={hour} className="grid grid-cols-8 items-center min-h-[58px]">
                        {/* Hour label */}
                        <div className="text-xs font-bold text-slate-400 text-right pr-4 py-2">
                          {format12Hour(hour)}
                        </div>

                        {/* Day cells */}
                        {weekDays.map((day, dayIdx) => {
                          const dateStr = toDateString(day);

                          // Find appointment at this exact hour
                          const matchingAppt = appointments.find((appt) => {
                            const apptDateStr = getSafeDateString(appt?.date);
                            return (
                              apptDateStr === dateStr &&
                              appt?.startTime === hour &&
                              appt?.status !== 'CANCELLED' &&
                              appt?.status !== 'REJECTED'
                            );
                          });

                          // Find matching availability block covering this hour
                          const matchingAvail = availabilities.find((avail) => {
                            return (
                              avail?.date === dateStr &&
                              avail?.startTime && hour >= avail.startTime &&
                              avail?.endTime && hour < avail.endTime
                            );
                          });

                          return (
                            <div
                              key={dayIdx}
                              onClick={() => {
                                // If slot is empty, clicking adds 1-hour availability instantly!
                                if (!matchingAppt && !matchingAvail) {
                                  handleAddHourSlot(dateStr, hour);
                                }
                              }}
                              className="relative border-r border-slate-100/50 h-full min-h-[58px] p-1.5 flex flex-col justify-center cursor-pointer hover:bg-slate-50/70 transition-all"
                            >
                              {matchingAppt ? (
                                <div className="h-full w-full bg-emerald-50 border border-emerald-200/50 rounded-xl p-2 text-left flex flex-col justify-between shadow-sm overflow-hidden">
                                  <p className="text-[10px] font-black text-emerald-800 leading-none truncate">
                                    {matchingAppt.patient?.name || 'Patient'}
                                  </p>
                                  <div className="flex justify-between items-center gap-1 mt-1">
                                    <span className="text-[8px] font-extrabold text-emerald-700/80 uppercase">
                                      Booked
                                    </span>
                                    <span className="text-[8px] font-bold text-yellow-800 bg-yellow-100/85 px-1 py-0.2 rounded uppercase">
                                      {matchingAppt.status}
                                    </span>
                                  </div>
                                </div>
                              ) : matchingAvail ? (
                                <div className="h-full w-full bg-primary-50 border border-primary-200/40 rounded-xl p-2 text-left flex justify-between items-center group transition-all">
                                  <div className="min-w-0">
                                    <p className="text-[9px] font-bold text-primary-800 leading-none">Available</p>
                                    <p className="text-[9px] font-black text-primary-900/80 mt-0.5 truncate">
                                      {matchingAvail.startTime}–{matchingAvail.endTime}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteMutation.mutate(matchingAvail.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded bg-white hover:bg-rose-50 transition-colors shadow-sm shrink-0"
                                    title="Click to remove availability"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              ) : (
                                <div className="hidden group-hover:flex h-full w-full border border-dashed border-primary-300 rounded-xl items-center justify-center text-primary-600 text-xs font-bold bg-primary-50/20">
                                  + Add 1h
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
