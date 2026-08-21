import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Calendar, Users, Settings, FileText } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  
  const navItems = {
    PATIENT: [
      { path: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/search', label: 'Find Doctors', icon: Users },
      { path: '/patient/settings', label: 'Settings', icon: Settings },
    ],
    DOCTOR: [
      { path: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/doctor/appointments', label: 'Appointments', icon: Calendar },
      { path: '/doctor/settings', label: 'Profile & Settings', icon: Settings },
    ],
    ADMIN: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/reports', label: 'Reports', icon: FileText },
      { path: '/admin/settings', label: 'System', icon: Settings },
    ]
  };

  const items = user?.role ? navItems[user.role as keyof typeof navItems] || [] : [];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] hidden md:block">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        
        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
