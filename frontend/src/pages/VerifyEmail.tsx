import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../api/axios';

const VerifyEmail: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
      } catch (err) {
        setStatus('error');
      }
    };
    if (token) verify();
  }, [token]);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-slate-50 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
        {status === 'loading' && (
          <div className="text-slate-500">Verifying your email...</div>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h1>
            <p className="text-slate-500 mb-6">Your account is now active.</p>
            <Link to="/login" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
              Login Now
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h1>
            <p className="text-slate-500 mb-6">The link is invalid or has expired.</p>
            <Link to="/login" className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300 transition">
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
