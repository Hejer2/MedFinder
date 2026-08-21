import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { User, Shield, Camera, Activity, Heart, Bell, Lock, ChevronRight, LogOut, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LogoutConfirmModal from '../components/LogoutConfirmModal';

export default function PatientSettings() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('edit_profile');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [notifications, setNotifications] = useState({ email: true, sms: true, promotions: false });
  const [privacy, setPrivacy] = useState({ shareProfile: true, shareHistory: false, twoFactor: false });
  const [preferences, setPreferences] = useState({ darkMode: false, highContrast: false });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [bloodType, setBloodType] = useState('');

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

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/users/me');
        return res.data;
      } catch (err) {
        return null;
      }
    },
    enabled: !!user
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setDateOfBirth(profile.dateOfBirth || '');
      if (profile.notificationSettings) setNotifications(profile.notificationSettings as any);
      if (profile.privacySettings) setPrivacy(profile.privacySettings as any);
      if (profile.preferences) setPreferences(profile.preferences as any);
      if (profile.medicalInfo) {
        setAllergies(profile.medicalInfo.allergies || '');
        setMedications(profile.medicalInfo.medications || '');
        setBloodType(profile.medicalInfo.bloodType || '');
      }
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/users/me', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      updateUser(variables);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || 'Failed to save settings.')
  });

  const handleToggleChange = (category: string, state: any, setter: any, key: string, value: boolean) => {
    const newSettings = { ...state, [key]: value };
    setter(newSettings);
    updateMutation.mutate({ [category]: newSettings });
  };

  const handleMedicalSubmit = () => {
    updateMutation.mutate(
      { medicalInfo: { allergies, medications, bloodType } },
      { onSuccess: () => toast.success('Medical info updated successfully!') }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ name, email, phone, dateOfBirth }, { onSuccess: () => toast.success('Profile updated successfully!') });
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/');
  };

  const menuItems = [
    { id: 'edit_profile', label: 'Edit Profile', icon: User },
    { id: 'medical', label: 'Medical Info', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Heart },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-8 pb-20 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your patient account settings and preferences.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="lg:w-1/4 flex-shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden sticky top-24 transition-colors duration-300">
              
              {/* Profile Brief */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 transition-colors duration-300">
                <div className="relative cursor-pointer group">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                    alt="Avatar"
                    className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-slate-50 dark:bg-slate-700 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full w-8 h-8 flex items-center justify-center text-white border-4 border-white dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform">
                    <Camera size={14} />
                  </div>
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Patient'}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md inline-block mt-1">Patient Account</div>
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
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-100 dark:border-slate-700">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:w-3/4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 min-h-[600px] transition-colors duration-300">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  
                  {/* EDIT PROFILE */}
                  {activeTab === 'edit_profile' && (
                    <form onSubmit={handleSubmit}>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Edit Profile</h2>
                      
                      <div className="space-y-6 max-w-2xl">
                        <FormRow label="Full Name">
                          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200" />
                        </FormRow>
                        
                        <FormRow label="Email Address">
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200" />
                        </FormRow>
                        
                        <FormRow label="Date of Birth">
                          <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200" />
                        </FormRow>
                        
                        <FormRow label="Phone Number">
                          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +1 234 567 8900" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200" />
                        </FormRow>

                        <div className="pt-4 flex justify-end">
                          <button type="submit" disabled={updateMutation.isPending} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-70 flex items-center gap-2">
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* MEDICAL INFO */}
                  {activeTab === 'medical' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Medical Information</h2>
                      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 mb-8 flex items-start gap-3">
                        <Shield className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">This information is kept strictly confidential and shared only with your booked doctors to provide better care.</p>
                      </div>
                      
                      <div className="space-y-6 max-w-2xl">
                        <FormRow label="Allergies">
                          <textarea rows={3} value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="List any drug, food, or environmental allergies..." className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200 resize-y" />
                        </FormRow>
                        
                        <FormRow label="Current Medications">
                          <textarea rows={3} value={medications} onChange={e => setMedications(e.target.value)} placeholder="List any ongoing medications or treatments..." className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200 resize-y" />
                        </FormRow>
                        
                        <FormRow label="Blood Type">
                          <div className="relative">
                            <select value={bloodType} onChange={e => setBloodType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200 appearance-none bg-white dark:bg-slate-900">
                              <option value="">Select Blood Type</option>
                              <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                              <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                            </select>
                            <ChevronRight size={16} className="absolute right-4 top-4 text-slate-400 dark:text-slate-500 rotate-90 pointer-events-none" />
                          </div>
                        </FormRow>
                        
                        <div className="pt-4 flex justify-end">
                          <button type="button" onClick={handleMedicalSubmit} disabled={updateMutation.isPending} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-70">
                            {updateMutation.isPending ? 'Saving...' : 'Save Information'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NOTIFICATIONS */}
                  {activeTab === 'notifications' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Notifications</h2>
                      <div className="space-y-4 max-w-2xl">
                        <ToggleRow label="Email Notifications" desc="Receive emails for upcoming appointments" checked={notifications.email} onChange={(v) => handleToggleChange('notificationSettings', notifications, setNotifications, 'email', v)} />
                        <ToggleRow label="SMS Reminders" desc="Receive text messages 24h before visits" checked={notifications.sms} onChange={(v) => handleToggleChange('notificationSettings', notifications, setNotifications, 'sms', v)} />
                        <ToggleRow label="Promotional Emails" desc="Get updates about new features and offers" checked={notifications.promotions} onChange={(v) => handleToggleChange('notificationSettings', notifications, setNotifications, 'promotions', v)} />
                      </div>
                    </div>
                  )}

                  {/* PREFERENCES */}
                  {activeTab === 'preferences' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Preferences</h2>
                      <div className="space-y-4 max-w-2xl">
                        <ToggleRow label="Dark Mode" desc="Use dark theme across the platform" checked={preferences.darkMode} onChange={(v) => handleToggleChange('preferences', preferences, setPreferences, 'darkMode', v)} />
                        <ToggleRow label="High Contrast" desc="Increase contrast for better readability" checked={preferences.highContrast} onChange={(v) => handleToggleChange('preferences', preferences, setPreferences, 'highContrast', v)} />
                      </div>
                    </div>
                  )}

                  {/* PRIVACY */}
                  {activeTab === 'privacy' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Privacy & Security</h2>
                      <div className="space-y-4 max-w-2xl">
                        <ToggleRow label="Share profile with doctors" desc="Allow booked doctors to view your medical info" checked={privacy.shareProfile} onChange={(v) => handleToggleChange('privacySettings', privacy, setPrivacy, 'shareProfile', v)} />
                        <ToggleRow label="Share appointment history" desc="Let new doctors see your past appointments" checked={privacy.shareHistory} onChange={(v) => handleToggleChange('privacySettings', privacy, setPrivacy, 'shareHistory', v)} />
                        <ToggleRow label="Two-factor authentication" desc="Add extra security to your account" checked={privacy.twoFactor} onChange={(v) => handleToggleChange('privacySettings', privacy, setPrivacy, 'twoFactor', v)} />
                      </div>
                    </div>
                  )}

                  {/* PASSWORD */}
                  {activeTab === 'password' && (
                    <form onSubmit={handlePasswordSubmit}>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Change Password</h2>
                      <div className="space-y-6 max-w-2xl">
                        <FormRow label="Current Password"><input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200" /></FormRow>
                        <FormRow label="New Password"><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200" /></FormRow>
                        <FormRow label="Confirm New Password"><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-700 dark:text-slate-200" /></FormRow>
                        
                        <div className="pt-4 flex justify-end">
                          <button type="submit" disabled={passwordMutation.isPending} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-70">
                            {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* HELP */}
                  {activeTab === 'help' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Help & Support</h2>
                      <div className="space-y-3 max-w-2xl">
                        <HelpItem 
                          title="How do I book an appointment?" 
                          content="To book an appointment, go to the Search tab or map to find a doctor. Once you find a doctor, click 'Book Appointment', select an available time slot, and confirm." 
                        />
                        <HelpItem 
                          title="How do I cancel a booking?" 
                          content="You can cancel a booking from your Patient Dashboard. Find the upcoming appointment you wish to cancel, click on 'Cancel Appointment', and provide a reason if prompted." 
                        />
                        <HelpItem 
                          title="How do I change my doctor?" 
                          content="Simply search for a new doctor using our platform and book an appointment with them. You can manage multiple doctors from your Dashboard." 
                        />
                        <HelpItem 
                          title="How is my data protected?" 
                          content="We use industry-standard encryption to protect your data. Your medical information is strictly confidential and only shared with doctors you have explicitly booked an appointment with." 
                        />
                        <HelpItem title="Contact Support" isLink onClick={() => navigate('/contact')} />
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

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 sm:items-center">
      <label className="sm:w-1/3 text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>
      <div className="sm:w-2/3">{children}</div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <div className="flex justify-between items-center p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors bg-white dark:bg-slate-800">
      <div>
        <div className="font-bold text-slate-900 dark:text-white">{label}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{desc}</div>
      </div>
      <button 
        type="button" 
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

function HelpItem({ title, content, isLink, onClick }: { title: string; content?: string; isLink?: boolean; onClick?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLink) {
    return (
      <button onClick={onClick} className="w-full flex justify-between items-center p-5 rounded-2xl border transition-all bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
        <span className="font-bold">{title}</span>
        <ChevronRight size={18} className="text-emerald-500" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
      >
        <span className="font-bold text-left">{title}</span>
        <ChevronRight size={18} className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700/50">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
