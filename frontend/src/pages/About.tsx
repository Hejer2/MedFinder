import { Shield, Clock, Users } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">About MedFinder</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          We are on a mission to simplify healthcare access. MedFinder connects patients with top-rated medical professionals in their area, making booking appointments seamless and transparent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Patient-Centric</h3>
          <p className="text-slate-600">
            We prioritize your health journey by providing easy access to verified doctors, transparent reviews, and instant booking.
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
          <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Verified Professionals</h3>
          <p className="text-slate-600">
            Every doctor on our platform is carefully vetted to ensure you receive the highest standard of medical care.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
          <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">24/7 Booking</h3>
          <p className="text-slate-600">
            Book appointments at your convenience. No more waiting on hold or calling during office hours.
          </p>
        </div>
      </div>
    </div>
  );
}
