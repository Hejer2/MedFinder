import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Lock, Bell, LogOut, HelpCircle, Shield } from 'lucide-react';
import { getPharmAvatar } from '../utils/avatar';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LogoutConfirmModal from '../components/LogoutConfirmModal';

export default function PharmacySettings() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const { data: pharmacy } = useQuery({
    queryKey: ['pharmacy-me'],
    queryFn: async () => {
      const res = await api.get('/pharmacies/me');
      return res.data;
    },
    enabled: user?.role === 'PHARMACY'
  });

  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState({ email: true, sms: true, reviews: false });
  const [privacy, setPrivacy] = useState({ showEmail: false, showPhone: true, publicProfile: true });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.patch('/users/me/password', data),
    onSuccess: () => {
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update password.';
      toast.error(typeof msg === 'string' ? msg : msg[0]);
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    passwordMutation.mutate({ oldPassword, newPassword });
  };

  useEffect(() => {
    if (user) {
      const u = user as any;
      if (u.notificationSettings) setNotifications(u.notificationSettings as any);
      if (u.privacySettings) setPrivacy(u.privacySettings as any);
    }
  }, [user]);

  const userSettingsMutation = useMutation({
    mutationFn: (data: any) => api.patch('/users/me', data),
    onSuccess: (_, variables) => {
      updateUser(variables);
    },
    onError: () => toast.error('Failed to save settings')
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    const newSettings = { ...notifications, [key]: value };
    setNotifications(newSettings);
    userSettingsMutation.mutate({ notificationSettings: newSettings });
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    const newSettings = { ...privacy, [key]: value };
    setPrivacy(newSettings);
    userSettingsMutation.mutate({ privacySettings: newSettings });
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/');
  };

  const avatarUrl = getPharmAvatar(pharmacy, api.defaults.baseURL);

  const menuItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-8 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your pharmacy account settings and preferences.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4 flex-shrink-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden sticky top-24">
              {/* Profile Brief */}
              <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-gradient-to-br from-white to-slate-55">
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-900 truncate">{user?.name || 'Pharmacy'}</div>
                  <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1">Pharmacy Account</div>
                </div>
              </div>

              {/* Nav */}
              <nav className="p-3 space-y-1">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                        isActive 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* NOTIFICATIONS */}
                  {activeTab === 'notifications' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Notifications</h2>
                      <div className="space-y-4 max-w-2xl">
                        <ToggleRow label="Email Notifications" desc="Receive email for stock updates" checked={notifications.email} onChange={(val) => handleNotificationChange('email', val)} />
                        <ToggleRow label="SMS Reminders" desc="Get text reminders for orders" checked={notifications.sms} onChange={(val) => handleNotificationChange('sms', val)} />
                        <ToggleRow label="Review Alerts" desc="Notify when users leave reviews" checked={notifications.reviews} onChange={(val) => handleNotificationChange('reviews', val)} />
                      </div>
                    </div>
                  )}

                  {/* PRIVACY */}
                  {activeTab === 'privacy' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Privacy & Visibility</h2>
                      <div className="space-y-4 max-w-2xl">
                        <ToggleRow label="Show Email Address" desc="Allow patients to see your email address" checked={privacy.showEmail} onChange={(val) => handlePrivacyChange('showEmail', val)} />
                        <ToggleRow label="Show Phone Number" desc="Display phone number on your public profile" checked={privacy.showPhone} onChange={(val) => handlePrivacyChange('showPhone', val)} />
                        <ToggleRow label="Public Profile Visibility" desc="Make your profile discoverable on search results" checked={privacy.publicProfile} onChange={(val) => handlePrivacyChange('publicProfile', val)} />
                      </div>
                    </div>
                  )}

                  {/* PASSWORD */}
                  {activeTab === 'password' && (
                    <form onSubmit={handlePasswordSubmit}>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Change Password</h2>
                      <div className="space-y-6 max-w-2xl">
                        <FormRow label="Current Password">
                          <input type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                        </FormRow>
                        <FormRow label="New Password">
                          <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                        </FormRow>
                        <FormRow label="Confirm New Password">
                          <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                        </FormRow>
                        <div className="pt-4 flex justify-end">
                          <button type="submit" disabled={passwordMutation.isPending} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20">
                            {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* HELP */}
                  {activeTab === 'help' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-slate-900 mb-4">Help & Support</h2>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">Have questions or need assistance with your MedFinder pharmacy inventory account? Our support team is here to help you configure your inventory, update medicines, and manage notifications.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div className="p-5 border border-slate-100 rounded-2xl space-y-2">
                          <h3 className="font-extrabold text-sm text-slate-800">Support Email</h3>
                          <p className="text-xs font-bold text-emerald-600">support@medfinder.com</p>
                        </div>
                        <div className="p-5 border border-slate-100 rounded-2xl space-y-2">
                          <h3 className="font-extrabold text-sm text-slate-800">Hotline Help</h3>
                          <p className="text-xs font-bold text-slate-600">+216 71 999 888</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}

interface FormRowProps {
  label: string;
  children: React.ReactNode;
}
function FormRow({ label, children }: FormRowProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}
function ToggleRow({ label, desc, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/30">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800">{label}</h3>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{desc}</p>
      </div>
      <button 
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-emerald-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
