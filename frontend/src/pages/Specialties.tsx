import { Link } from 'react-router-dom';
import { Stethoscope, Heart, Brain, Bone, Eye, Baby, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const iconMap: Record<string, any> = {
  Cardiology: Heart,
  Neurology: Brain,
  Orthopedics: Bone,
  Pediatrics: Baby,
  Ophthalmology: Eye,
  'General Practice': Stethoscope,
};

export default function Specialties() {
  const { data: specialties = [], isLoading, isError } = useQuery({
    queryKey: ['specialties-list'],
    queryFn: async () => {
      const res = await api.get('/specialties');
      return res.data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Medical Specialties</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Find the right specialist for your health needs. We have partnered with top-rated doctors across various medical fields.
        </p>
      </div>

      {isLoading && (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        </div>
      )}

      {isError && (
        <div className="text-center text-red-500 py-12">
          Unable to load specialties. Please try again later.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialties.map((spec: any) => {
            const IconComponent = iconMap[spec.name] || Activity;
            return (
              <Link 
                key={spec.id || spec.name} 
                to={`/search?specialty=${encodeURIComponent(spec.name)}`}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-teal-200 transition-all group"
              >
                <div className="bg-teal-50 w-16 h-16 rounded-2xl flex items-center justify-center text-teal-600 mb-6 group-hover:scale-110 transition-transform">
                  <IconComponent size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors">
                  {spec.name}
                </h3>
                <p className="text-slate-600 text-sm">
                  {spec.description || `Specialized consultations and care for ${spec.name.toLowerCase()} conditions.`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
