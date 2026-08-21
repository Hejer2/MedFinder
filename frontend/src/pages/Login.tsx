import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      toast.success('Logged in successfully!');
      if (user.role === 'DOCTOR') navigate('/dashboard/doctor');
      else if (user.role === 'PHARMACY') navigate('/pharmacy/me');
      else navigate('/dashboard/patient');
    } catch (error: any) {
      console.error("Login Error:", error);
      const message = error.response?.data?.message || 'Login failed. Check your credentials.';
      toast.error(typeof message === 'string' ? message : message.join(', '));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">Welcome Back</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input 
            type="email" 
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-primary-500" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input 
            type="password" 
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-primary-500" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition">
          Sign In
        </button>
      </form>
      <p className="mt-4 text-center text-slate-600 text-sm">
        Don't have an account? <Link to="/register" className="text-primary-600 hover:underline">Sign up</Link>
      </p>
    </div>
  );
}
