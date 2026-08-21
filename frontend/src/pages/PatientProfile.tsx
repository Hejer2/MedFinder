import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { User, Phone, Mail, Calendar, ArrowLeft, Heart, Activity, Settings } from 'lucide-react';
import api from '../api/axios';

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-profile', id],
    queryFn: async () => {
      const res = await api.get(`/users/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  const handleBack = () => {
    if (currentUser?.role === 'DOCTOR') {
      navigate('/dashboard/doctor');
    } else {
      navigate('/dashboard/patient');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500 text-lg font-semibold">
        Loading Patient Profile...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-rose-500 text-lg font-bold">
        Patient Profile not found or access denied.
      </div>
    );
  }

  const medInfo = patient.medicalInfo || {};

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back & Edit buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-all text-xs uppercase tracking-wider bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {currentUser?.id === patient.id && (
          <Link
            to="/dashboard/patient/settings"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold transition-all text-xs uppercase tracking-wider px-4 py-2 rounded-xl shadow-sm"
          >
            <Settings size={16} />
            Edit Profile Settings
          </Link>
        )}
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-inner">
          {patient.name ? patient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 3) : 'PT'}
        </div>
        <div className="text-center md:text-left space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{patient.name}</h1>
          <span className="text-xs text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full inline-block font-bold uppercase tracking-wider">
            Patient Account
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Details Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
            <User size={18} className="text-primary-600" /> Contact Details
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={12} /> Email Address
              </span>
              <p className="text-sm font-semibold text-slate-700 break-all">{patient.email}</p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone size={12} /> Phone Number
              </span>
              <p className="text-sm font-semibold text-slate-700">{patient.phone || 'Not provided'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} /> Date of Birth
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Medical Background Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
            <Activity size={18} className="text-primary-600" /> Medical Background
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Heart size={12} className="text-red-500" /> Blood Type
              </span>
              <p className="text-sm font-semibold text-slate-700">{medInfo.bloodType || 'Not specified'}</p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allergies</span>
              <p className="text-sm font-semibold text-slate-700">{medInfo.allergies || 'None reported'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Medications</span>
              <p className="text-sm font-semibold text-slate-700">{medInfo.medications || 'None reported'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
