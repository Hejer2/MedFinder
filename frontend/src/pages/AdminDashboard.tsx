import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Users, UserPlus, Calendar, Activity } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    }
  });

  if (isLoading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-primary-50 text-primary-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Users</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-xl">
            <UserPlus size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Doctors</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalDoctors || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Appointments</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalAppointments || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={20} /> Platform Activity (Last 7 Days)
        </h2>
        <div className="h-64 flex items-end justify-between bg-slate-50 rounded-xl border border-slate-100 p-6 pt-12">
          {stats?.weeklyActivity && stats.weeklyActivity.length > 0 ? (
            stats.weeklyActivity.map((day: { label: string; count: number }, i: number) => {
              const maxCount = Math.max(...stats.weeklyActivity.map((d: any) => d.count), 1);
              const heightPercent = Math.max(Math.round((day.count / maxCount) * 100), 8);
              return (
                <div key={i} className="flex flex-col items-center gap-2 w-full">
                  <div
                    className="w-12 bg-teal-500 hover:bg-teal-600 rounded-t-lg relative group transition-all duration-300 flex items-center justify-center cursor-pointer"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-semibold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow">
                      {day.count} appointments
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{day.label}</span>
                </div>
              );
            })
          ) : (
            <div className="w-full text-center text-sm text-slate-400 py-12">No activity recorded for this period</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
