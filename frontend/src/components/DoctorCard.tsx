import { Link } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';

import { getUserAvatar } from '../utils/avatar';

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  rating?: number;
  reviewsCount?: number;
  address?: string;
  avatarUrl?: string;
}

export default function DoctorCard({
  id,
  name,
  specialty,
  rating = 5,
  reviewsCount = 0,
  address = 'Tunis',
  avatarUrl,
}: DoctorCardProps) {
  const displayAvatar = avatarUrl && !avatarUrl.includes('pravatar') ? avatarUrl : getUserAvatar(id);
  return (
    <Link
      to={`/doctor/${id}`}
      className="group block bg-white/70 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-md hover:shadow-xl transition-shadow duration-300 hover:scale-[1.02]"
    >
      <div className="flex items-center gap-4">
        <img
          src={displayAvatar}
          alt={name}
          className="w-16 h-16 rounded-xl object-cover border-2 border-primary-100 group-hover:border-primary-300 transition-colors"
        />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
            {name}
          </h3>
          <p className="text-sm text-slate-600">{specialty}</p>
          <div className="flex items-center text-xs text-slate-500 mt-1">
            <Star className="text-yellow-400 fill-current" size={14} />
            <span className="ml-1 font-medium text-slate-800">{rating.toFixed(1)}</span>
            <span className="ml-2">({reviewsCount})</span>
            <MapPin className="ml-2" size={14} />
            <span className="ml-1">{address}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
