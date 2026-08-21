import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, XCircle, Star, ShoppingBag, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const getCurrencyByPhone = (phone: string | null | undefined) => {
  const defaultCurr = { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' };
  if (!phone) return defaultCurr;
  const trimmed = phone.trim();

  const dialMap: Record<string, string> = {
    '+216': 'TND',
    '+212': 'MAD',
    '+213': 'DZD',
    '+218': 'LYD',
    '+20': 'EGP',
    '+966': 'SAR',
    '+971': 'AED',
    '+974': 'QAR',
    '+965': 'KWD',
    '+33': 'EUR',
    '+49': 'EUR',
    '+39': 'EUR',
    '+34': 'EUR',
    '+32': 'EUR',
    '+31': 'EUR',
    '+44': 'GBP',
    '+1': 'USD',
    '+41': 'CHF',
  };

  const matchedDial = Object.keys(dialMap).find(dial => trimmed.startsWith(dial));
  if (matchedDial) {
    const code = dialMap[matchedDial];
    const mapSymbols: Record<string, string> = {
      TND: 'د.ت', EUR: '€', USD: '$', GBP: '£', MAD: 'د.م', DZD: 'د.ج', EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ', QAR: 'ر.ق', KWD: 'د.ك', LYD: 'ل.د', CHF: 'Fr', CAD: 'CA$'
    };
    return { code, symbol: mapSymbols[code] || code };
  }
  
  return defaultCurr;
};

interface Appointment {
  id: string;
  doctor: {
    id: string;
    specialty?: { name: string };
    user: { name: string };
  };
  date: string;
  startTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  notes?: string;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeView, setActiveView] = useState<'appointments' | 'care_circle' | 'orders'>('appointments');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await api.get('/appointments/patient');
      return res.data;
    }
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<any[]>({
    queryKey: ['patient-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/patient');
      return res.data;
    }
  });

  const filteredAppointments = appointments.filter((appt) => {
    const doctorName = appt.doctor?.user?.name || '';
    const matchesSearch = doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || appt.status === statusFilter;
    const matchesDate = !dateFilter || new Date(appt.date).toISOString().split('T')[0] === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: { id: string, notes?: string }) => {
      if (payload.notes === 'PROPOSED_BY_DOCTOR') {
        return api.patch(`/appointments/${payload.id}`, { status: 'CANCELLED', notes: 'DECLINED_BY_PATIENT' });
      }
      return api.patch(`/appointments/${payload.id}/status`, { status: 'CANCELLED' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled successfully');
    }
  });

  const reviewMutation = useMutation({
    mutationFn: (data: { doctorId: string, patientId: string, rating: number, comment: string }) => 
      api.post('/reviews', data),
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      setReviewModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to submit review. Have you already reviewed this doctor?');
    }
  });

  // Reschedule state
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);

  const { data: rescheduleSlots = [], isLoading: isLoadingRescheduleSlots } = useQuery<string[]>({
    queryKey: ['reschedule-slots', rescheduleAppt?.doctor.id, rescheduleDate],
    queryFn: async () => {
      const res = await api.get(`/doctors/${rescheduleAppt?.doctor.id}/slots?date=${rescheduleDate}`);
      return res.data;
    },
    enabled: !!rescheduleAppt,
  });

  const rescheduleMutation = useMutation({
    mutationFn: (payload: { appointmentId: string; dateTime: string }) =>
      api.patch(`/appointments/${payload.appointmentId}`, { 
        dateTime: payload.dateTime,
        status: 'PENDING',
        notes: 'PROPOSED_BY_PATIENT'
      }),
    onSuccess: () => {
      toast.success('Reschedule request sent to doctor');
      setRescheduleAppt(null);
      setRescheduleTime(null);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to reschedule';
      toast.error(msg);
    },
  });

  const approveProposalMutation = useMutation({
    mutationFn: (id: string) => 
      api.patch(`/appointments/${id}`, { status: 'CONFIRMED', notes: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Reschedule proposal approved');
    },
    onError: () => toast.error('Failed to approve proposal'),
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

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const openReviewModal = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setRating(5);
    setComment('');
    setReviewModalOpen(true);
  };

  const submitReview = () => {
    if (!selectedAppointment || !user) return;
    reviewMutation.mutate({
      doctorId: selectedAppointment.doctor.id,
      patientId: user.id,
      rating,
      comment
    });
  };

  const consultedDoctors = Array.from(
    new Map(
      appointments
        .filter((appt) => appt.status === 'COMPLETED')
        .map((appt) => [appt.doctor.id, appt.doctor])
    ).values()
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Patient Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Welcome back, {user?.name}. Check your upcoming visits.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveView('appointments')}
            className={`px-4 py-2 font-bold rounded-xl text-sm transition-all border ${
              activeView === 'appointments'
                ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveView('care_circle')}
            className={`px-4 py-2 font-bold rounded-xl text-sm transition-all border ${
              activeView === 'care_circle'
                ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            Care Circle
          </button>
          <button
            onClick={() => setActiveView('orders')}
            className={`px-4 py-2 font-bold rounded-xl text-sm transition-all border ${
              activeView === 'orders'
                ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            Medicine Orders ({orders.length})
          </button>
          <Link 
            to="/dashboard/patient/settings"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center"
          >
            Account Settings
          </Link>
        </div>
      </div>

      {activeView === 'appointments' ? (
        /* Appointment View */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Your Appointments</h2>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-slate-50/50 p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by doctor name..."
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
            {isLoading && (
              <div className="p-8 text-center text-slate-500">Loading appointments...</div>
            )}

            {!isLoading && filteredAppointments.length === 0 && (
              <div className="p-8 text-center text-slate-500">No appointments found matching your search filters.</div>
            )}
            
            {!isLoading && filteredAppointments.map((appointment) => {
              const dateObj = new Date(appointment.date);
              return (
                <div key={appointment.id} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary-50 p-4 rounded-2xl text-primary-600">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{appointment.doctor.user.name}</h3>
                      <p className="text-slate-500 text-sm">
                        {appointment.doctor.specialty?.name || 'General'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={16} /> {dateObj.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={16} /> {appointment.startTime}
                        </span>
                      </div>
                      {appointment.status === 'PENDING' && appointment.notes === 'PROPOSED_BY_DOCTOR' && (
                        <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-100/50 px-3 py-1.5 rounded-xl font-bold">
                          Proposed Reschedule: The doctor wants to move your appointment to this time. Please approve or reject.
                        </div>
                      )}
                      {appointment.status === 'PENDING' && appointment.notes === 'PROPOSED_BY_PATIENT' && (
                        <div className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-100/50 px-3 py-1.5 rounded-xl font-medium">
                          Reschedule requested: Waiting for Doctor approval.
                        </div>
                      )}
                      {appointment.status === 'CANCELLED' && appointment.notes === 'DECLINED_BY_DOCTOR' && (
                        <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 px-3 py-1.5 rounded-xl font-bold space-y-1.5">
                          <p>The doctor declined your appointment or reschedule request. Would you like to select another slot?</p>
                          <button
                            onClick={() => {
                              setRescheduleAppt(appointment);
                              setRescheduleTime(null);
                            }}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                          >
                            Choose Another Slot
                          </button>
                        </div>
                      )}
                      {appointment.status === 'CANCELLED' && appointment.notes === 'NO_SHOW' && (
                        <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 px-3 py-1.5 rounded-xl font-bold">
                          Marked as No Show: You did not attend this scheduled appointment.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      appointment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      appointment.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {appointment.notes === 'NO_SHOW' ? 'NO SHOW' : appointment.status}
                    </span>
                    
                    <div className="flex items-center gap-3 mt-1">
                      {appointment.status === 'PENDING' && appointment.notes === 'PROPOSED_BY_DOCTOR' && (
                        <button
                          onClick={() => approveProposalMutation.mutate(appointment.id)}
                          disabled={approveProposalMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Approve Proposal
                        </button>
                      )}

                      {appointment.status === 'ACCEPTED' && (
                        <button 
                          onClick={() => {
                            setRescheduleAppt(appointment);
                            setRescheduleTime(null);
                          }}
                          className="text-slate-600 hover:text-slate-700 text-sm font-medium flex items-center gap-1"
                        >
                          <Calendar size={16} /> Reschedule
                        </button>
                      )}
                      
                      {(appointment.status === 'PENDING' || appointment.status === 'ACCEPTED') && (
                        <button 
                          onClick={() => cancelMutation.mutate({ id: appointment.id, notes: appointment.notes })} 
                          disabled={cancelMutation.isPending} 
                          className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle size={16} /> {appointment.notes === 'PROPOSED_BY_DOCTOR' ? 'Reject' : 'Cancel'}
                        </button>
                      )}
                    </div>

                    {appointment.status === 'COMPLETED' && (
                      <button 
                        onClick={() => openReviewModal(appointment)} 
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Star size={16} /> Leave Review
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {!isLoading && appointments.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No appointments found.
              </div>
            )}
          </div>
        </div>
      ) : activeView === 'care_circle' ? (
        /* Care Circle View */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Star className="text-primary-600 fill-primary-600" size={20} /> Your Care Circle
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">List of all doctors you have consulted in past completed visits.</p>
            </div>
          </div>

          {consultedDoctors.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm italic">
              No consulted doctors found. Your Care Circle will populate once visits are marked as completed.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {consultedDoctors.map((doc: any) => (
                <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 hover:shadow-md hover:border-primary-200 transition-all duration-300">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{doc.user?.name}</h4>
                    <p className="text-[10px] text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full inline-block mt-1.5 font-bold uppercase tracking-wider">
                      {doc.specialty?.name || 'Specialist'}
                    </p>
                  </div>
                  <Link
                    to={`/doctor/${doc.id}`}
                    className="px-3.5 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-[10px] transition-all shadow-sm shrink-0 uppercase tracking-wider"
                  >
                    Book Again
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Orders View */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="text-primary-650" size={20} /> Medicine Orders
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Track your online medicine orders and payment status.</p>
            </div>
          </div>

          <div className="space-y-4">
            {isLoadingOrders ? (
              <div className="text-slate-400 text-sm py-4">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm italic">
                No orders placed yet. Visit a pharmacy profile to buy medicines.
              </div>
            ) : (
              orders.map((order: any) => (
                <div key={order.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Order ID: {order.id.slice(0, 8)}...</p>
                      <h4 className="font-extrabold text-slate-800 text-sm mt-1">Pharmacy: {order.pharmacy?.user?.name || 'Unknown'}</h4>
                      <p className="text-xs text-slate-500 font-medium">Phone: {order.pharmacy?.phone || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                        order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'PAID' ? 'bg-blue-50 text-blue-700' :
                        order.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {order.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs font-semibold text-slate-650">
                        <span>{item.medicine?.name} x {item.quantity}</span>
                        <span className="text-slate-800">{item.price.toFixed(2)} {getCurrencyByPhone(order.pharmacy?.phone).symbol}</span>
                      </div>
                    ))}

                    {order.deliveryMethod === 'DELIVERY' && (
                      <div className="flex justify-between text-xs font-semibold text-amber-700">
                        <span>Delivery Fee</span>
                        <span>+{order.deliveryFee.toFixed(2)} {getCurrencyByPhone(order.pharmacy?.phone).symbol}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs font-extrabold text-slate-800 border-t border-slate-50 pt-2">
                      <span className="flex flex-col gap-0.5">
                        <span>Total Paid</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Method: {order.deliveryMethod === 'DELIVERY' ? 'Delivery' : 'Store Pickup'}
                        </span>
                      </span>
                      <span className="text-emerald-650 font-black">{order.totalPrice.toFixed(2)} {getCurrencyByPhone(order.pharmacy?.phone).symbol}</span>
                    </div>

                    {order.deliveryMethod === 'DELIVERY' && order.deliveryAddress && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 font-medium space-y-1">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 block uppercase mb-0.5">Delivery Destination</span>
                          {order.deliveryAddress}
                        </div>
                        {order.deliveryPhone && (
                          <div>
                            <span className="text-[9px] font-black text-slate-400 block uppercase mb-0.5">Contact Phone</span>
                            <span className="font-bold text-slate-700">{order.deliveryPhone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Prescription link if any */}
                  {order.prescriptionUrl && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5">
                      <FileText size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">Prescription Uploaded</span>
                        <a
                          href={order.prescriptionUrl.startsWith('http') ? order.prescriptionUrl : `${api.defaults.baseURL}${order.prescriptionUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-650 hover:text-emerald-700 font-bold underline break-all block"
                        >
                          View uploaded prescription document/image
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
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
            <p className="text-sm text-slate-500">Select a new date and available slot from your calendar for Dr. {rescheduleAppt.doctor.user.name}.</p>

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

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Leave a Review</h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            <p className="text-slate-600 mb-6">How was your visit with {selectedAppointment?.doctor.user.name}?</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className={`transition-colors ${rating >= star ? 'text-yellow-400' : 'text-slate-200'} hover:text-yellow-400`}
                >
                  <Star size={32} className="fill-current" />
                </button>
              ))}
            </div>

            <textarea 
              className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" 
              rows={4} 
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>
            
            <button 
              onClick={submitReview}
              disabled={reviewMutation.isPending}
              className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
