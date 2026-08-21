import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const COUNTRY_CODES = [
  { flag: '🇹🇳', name: 'Tunisia',        dial: '+216' },
  { flag: '🇩🇿', name: 'Algeria',        dial: '+213' },
  { flag: '🇲🇦', name: 'Morocco',        dial: '+212' },
  { flag: '🇱🇾', name: 'Libya',          dial: '+218' },
  { flag: '🇪🇬', name: 'Egypt',          dial: '+20'  },
  { flag: '🇸🇦', name: 'Saudi Arabia',   dial: '+966' },
  { flag: '🇦🇪', name: 'UAE',            dial: '+971' },
  { flag: '🇶🇦', name: 'Qatar',          dial: '+974' },
  { flag: '🇰🇼', name: 'Kuwait',         dial: '+965' },
  { flag: '🇯🇴', name: 'Jordan',         dial: '+962' },
  { flag: '🇱🇧', name: 'Lebanon',        dial: '+961' },
  { flag: '🇸🇾', name: 'Syria',          dial: '+963' },
  { flag: '🇮🇶', name: 'Iraq',           dial: '+964' },
  { flag: '🇫🇷', name: 'France',         dial: '+33'  },
  { flag: '🇩🇪', name: 'Germany',        dial: '+49'  },
  { flag: '🇬🇧', name: 'United Kingdom', dial: '+44'  },
  { flag: '🇮🇹', name: 'Italy',          dial: '+39'  },
  { flag: '🇪🇸', name: 'Spain',          dial: '+34'  },
  { flag: '🇧🇪', name: 'Belgium',        dial: '+32'  },
  { flag: '🇨🇭', name: 'Switzerland',    dial: '+41'  },
  { flag: '🇳🇱', name: 'Netherlands',    dial: '+31'  },
  { flag: '🇺🇸', name: 'United States',  dial: '+1'   },
  { flag: '🇨🇦', name: 'Canada',         dial: '+1'   },
  { flag: '🇧🇷', name: 'Brazil',         dial: '+55'  },
  { flag: '🇹🇷', name: 'Turkey',         dial: '+90'  },
  { flag: '🇮🇷', name: 'Iran',           dial: '+98'  },
  { flag: '🇵🇰', name: 'Pakistan',       dial: '+92'  },
  { flag: '🇮🇳', name: 'India',          dial: '+91'  },
  { flag: '🇨🇳', name: 'China',          dial: '+86'  },
  { flag: '🇯🇵', name: 'Japan',          dial: '+81'  },
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [phoneCountry, setPhoneCountry] = useState('+216');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'PATIENT',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };
      if (formData.phone.trim()) {
        payload.phone = `${phoneCountry}${formData.phone.trim()}`;
      }

      await api.post('/auth/register', payload);
      toast.success('Registration successful. Please verify your email or login.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-slate-50 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
          <p className="text-slate-500 mt-2">Join MedFinder to manage your health.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="John Doe"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="you@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <div className="flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 bg-white">
              <select
                value={phoneCountry}
                onChange={e => setPhoneCountry(e.target.value)}
                className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-sm font-semibold outline-none shrink-0 cursor-pointer text-slate-700"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.dial + c.name} value={c.dial}>
                    {c.flag} {c.dial}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                className="flex-1 px-4 py-2 outline-none text-sm font-semibold min-w-0"
                placeholder="12 345 678"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <CheckCircle size={18} />
              </div>
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Register As</label>
            <select
              className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="PHARMACY">Pharmacy</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/30 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-center text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
