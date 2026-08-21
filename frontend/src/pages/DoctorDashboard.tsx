import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, User, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Request {
  id: string;
  patient: {
    id: string;
    name: string;
    email: string;
  };
  date: string;
  startTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
  reason?: string;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<'requests' | 'patient_registry'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { data: requests = [], isLoading } = useQuery<Request[]>({
    queryKey: ['doctor-appointments'],
    queryFn: async () => {
      const res = await api.get('/appointments');
      return res.data;
    }
  });

  const filteredRequests = requests.filter((req) => {
    const patientName = req.patient?.name || '';
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || req.status === statusFilter;
    const matchesDate = !dateFilter || new Date(req.date).toISOString().split('T')[0] === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const { data: doctorProfile } = useQuery({
    queryKey: ['doctor-profile-me'],
    queryFn: async () => {
      const res = await api.get('/doctors/me');
      return res.data;
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: Request['status'] }) => {
      if (status === 'REJECTED') {
        return api.patch(`/appointments/${id}`, { status: 'CANCELLED', notes: 'DECLINED_BY_DOCTOR' });
      }
      return api.patch(`/appointments/${id}/status`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] })
  });

  const approveProposalMutation = useMutation({
    mutationFn: (id: string) => 
      api.patch(`/appointments/${id}`, { status: 'CONFIRMED', notes: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      toast.success('Reschedule proposal approved');
    },
    onError: () => toast.error('Failed to approve proposal'),
  });

  const updateStatus = (id: string, status: Request['status']) => {
    statusMutation.mutate({ id, status });
  };

  // Reschedule state
  const [rescheduleAppt, setRescheduleAppt] = useState<Request | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);

  const { data: rescheduleSlots = [], isLoading: isLoadingRescheduleSlots } = useQuery<string[]>({
    queryKey: ['reschedule-slots', rescheduleAppt?.id, rescheduleDate],
    queryFn: async () => {
      const res = await api.get(`/doctors/${doctorProfile?.id}/slots?date=${rescheduleDate}`);
      return res.data;
    },
    enabled: !!rescheduleAppt && !!doctorProfile,
  });

  const rescheduleMutation = useMutation({
    mutationFn: (payload: { appointmentId: string; dateTime: string }) =>
      api.patch(`/appointments/${payload.appointmentId}`, { 
        dateTime: payload.dateTime,
        status: 'PENDING',
        notes: 'PROPOSED_BY_DOCTOR'
      }),
    onSuccess: () => {
      toast.success('Reschedule proposal sent to patient');
      setRescheduleAppt(null);
      setRescheduleTime(null);
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to propose reschedule';
      toast.error(msg);
    },
  });

  const handleConfirmReschedule = () => {
    if (!rescheduleAppt || !rescheduleTime) {
      toast.error('Please select a time slot');
      return;
    }
    const dateObj = new Date(rescheduleDate);
    const [hStr, mStr] = rescheduleTime.split(':');
    let h = parseInt(hStr, 10);
    dateObj.setUTCHours(h, parseInt(mStr, 10), 0, 0);

    rescheduleMutation.mutate({
      appointmentId: rescheduleAppt.id,
      dateTime: dateObj.toISOString(),
    });
  };

  const consultedPatients = Array.from(
    new Map(
      requests
        .filter((req) => req.status === 'COMPLETED')
        .map((req) => [req.patient?.id, req.patient])
    ).values()
  ).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-inner">
            {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 3) : 'DR'}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user?.name || 'Doctor Dashboard'}</h1>
            {doctorProfile && (
              <Link to={`/doctor/${doctorProfile.id}`} className="text-primary-605 hover:text-primary-700 hover:underline text-sm font-bold block mt-0.5">
                My Profile
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView(activeView === 'requests' ? 'patient_registry' : 'requests')}
            className={`px-4 py-2 font-bold rounded-xl text-xs transition-all border flex items-center justify-center gap-1.5 hover:-translate-y-0.5 duration-200 ${
              activeView === 'patient_registry'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm'
            }`}
          >
            <User size={15} />
            {activeView === 'patient_registry' ? 'View Requests' : 'Patient Registry'}
          </button>
          <Link
            to="/dashboard/doctor/availability"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-primary-500/15 flex items-center justify-center gap-1.5 hover:-translate-y-0.5 duration-200"
          >
            <Calendar size={15} />
            My Availability
          </Link>
          <Link
            to="/dashboard/doctor/settings"
            className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold transition-all flex items-center justify-center gap-1.5 hover:-translate-y-0.5 duration-200 shadow-sm"
          >
            <Settings size={15} />
            Settings
          </Link>
        </div>
      </div>

      {activeView === 'requests' ? (
        /* Requests/Appointments View */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Appointment Requests</h2>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-slate-50/50 p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-700 font-semibold"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-700 font-semibold"
              />
            </div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {isLoading && <div className="p-8 text-center text-slate-500">Loading requests...</div>}
            
            {!isLoading && filteredRequests.length === 0 && (
              <div className="p-8 text-center text-slate-500">No appointments found matching your search filters.</div>
            )}

            {!isLoading && filteredRequests.map((request) => {
              const dateObj = new Date(request.date);
              return (
                <div key={request.id} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary-50 p-4 rounded-2xl text-primary-600">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <Link to={`/patient/${request.patient?.id}`} className="hover:underline text-primary-600 hover:text-primary-700">
                        <h3 className="font-bold text-lg">{request.patient?.name || 'Patient'}</h3>
                      </Link>
                      <p className="text-slate-500 text-sm">Patient Email: {request.patient?.email || 'N/A'}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={16} /> {dateObj.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={16} /> {request.startTime}
                        </span>
                      </div>
                      {request.status === 'PENDING' && request.notes === 'PROPOSED_BY_PATIENT' && (
                        <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-100/50 px-3 py-1.5 rounded-xl font-bold">
                          Proposed Reschedule: The patient wants to move their appointment to this time. Please approve or reject.
                        </div>
                      )}
                      {request.status === 'PENDING' && request.notes === 'PROPOSED_BY_DOCTOR' && (
                        <div className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-100/50 px-3 py-1.5 rounded-xl font-medium">
                          Reschedule proposed: Waiting for Patient approval.
                        </div>
                      )}
                      {request.status === 'CANCELLED' && request.notes === 'DECLINED_BY_PATIENT' && (
                        <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 px-3 py-1.5 rounded-xl font-bold space-y-1.5">
                          <p>The patient declined your reschedule proposal. Would you like to suggest another slot?</p>
                          <button
                            onClick={() => {
                              setRescheduleAppt(request);
                              setRescheduleTime(null);
                            }}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                          >
                            Suggest Another Slot
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      request.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                      request.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                      request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {request.notes === 'NO_SHOW' ? 'NO SHOW' : request.status}
                    </span>
                    
                    <div className="flex gap-2 mt-2">
                      {request.status === 'PENDING' && request.notes === 'PROPOSED_BY_PATIENT' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveProposalMutation.mutate(request.id)}
                            disabled={approveProposalMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          >
                            Approve Proposal
                          </button>
                          <button 
                            onClick={() => updateStatus(request.id, 'REJECTED')} 
                            disabled={statusMutation.isPending} 
                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50" 
                            title="Reject"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {request.status === 'PENDING' && !request.notes && (
                        <>
                          <button 
                            onClick={() => updateStatus(request.id, 'ACCEPTED')} 
                            disabled={statusMutation.isPending} 
                            className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50" 
                            title="Accept"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button 
                            onClick={() => updateStatus(request.id, 'REJECTED')} 
                            disabled={statusMutation.isPending} 
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50" 
                            title="Reject"
                          >
                            <XCircle size={20} />
                          </button>
                        </>
                      )}
                      
                      {request.status === 'ACCEPTED' && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setRescheduleAppt(request);
                              setRescheduleTime(null);
                            }}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Calendar size={13} /> Reschedule
                          </button>
                          <button 
                            onClick={() => updateStatus(request.id, 'COMPLETED')} 
                            disabled={statusMutation.isPending} 
                            className="px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                          <button 
                            onClick={() => api.patch(`/appointments/${request.id}`, { status: 'CANCELLED', notes: 'NO_SHOW' }).then(() => queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] }))} 
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-medium text-sm transition-colors"
                          >
                            No Show
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!isLoading && requests.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No requests found.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Patient Registry View */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="text-primary-600" size={20} /> Patient Registry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">List of all patients who have completed consultations at your clinic.</p>
          </div>

          {consultedPatients.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm italic">
              No verified patients found in your registry yet.
            </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {consultedPatients.map((pat: any) => (
                <div key={pat.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-1 hover:shadow-md hover:border-primary-200 border transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{pat.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{pat.email}</p>
                    <div className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-2 uppercase tracking-wider">
                      Verified Consultation
                    </div>
                  </div>
                  <div className="pt-3 mt-2 border-t border-slate-100/60 flex justify-end">
                    <Link
                      to={`/patient/${pat.id}`}
                      className="text-[10px] text-primary-600 hover:text-primary-750 font-bold uppercase tracking-wider"
                    >
                      View Patient Profile →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleAppt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Reschedule Visit</h3>
              <button 
                onClick={() => setRescheduleAppt(null)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>
            <p className="text-sm text-slate-500">Select a new date and available slot from your calendar for {rescheduleAppt.patient?.name || 'Patient'}.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">New Date</label>
                <input 
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().split('T')[0]}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime(null);
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Available Hours</label>
                {isLoadingRescheduleSlots ? (
                  <div className="text-slate-400 text-xs py-2">Loading slots...</div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="text-slate-400 text-xs py-2">No available hours found on this date.</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {rescheduleSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setRescheduleTime(slot)}
                        className={`py-2 text-xs font-bold rounded-xl transition-all border ${
                          rescheduleTime === slot 
                            ? 'bg-primary-600 text-white border-primary-600' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={rescheduleMutation.isPending || !rescheduleTime}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors shadow-md shadow-primary-500/10"
              >
                {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
