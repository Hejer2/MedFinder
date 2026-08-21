import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Star, MapPin, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import 'leaflet/dist/leaflet.css';
import { getUserAvatar } from '../utils/avatar';
import L from 'leaflet';
import SearchFilters from '../components/SearchFilters';

// Fix for default leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center]);
  return null;
}

interface Specialty {
  id: string;
  name: string;
}

interface DoctorResult {
  id: string;
  user: { id: string; name: string };
  specialty: { name: string };
  clinicAddress: string;
  latitude: number;
  longitude: number;
  ratingAverage?: number;
  _count?: { reviews: number };
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [hoveredDoctor, setHoveredDoctor] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  const { data: specialties = [] } = useQuery<Specialty[]>({
    queryKey: ['specialties'],
    queryFn: async () => {
      const res = await api.get('/specialties');
      return res.data;
    }
  });

  const urlSpecialty = searchParams.get('specialty') || '';

  useEffect(() => {
    if (urlSpecialty && specialties.length > 0) {
      const normalizedUrl = urlSpecialty.toLowerCase();
      const matched = specialties.find(s => {
        const name = s.name.toLowerCase();
        
        // Dictionary to map AI specialty roles to database specialty names
        const aiToDbMap: Record<string, string> = {
          'cardiologist': 'cardiology',
          'dermatologist': 'dermatology',
          'pediatrician': 'pediatrics',
          'dentist': 'dentistry',
          'neurologist': 'neurology',
          'ophthalmologist': 'ophthalmology',
          'orthopedist': 'orthopedics',
          'gynecologist': 'gyn',
          'psychiatrist': 'psychiatry'
        };

        const targetDbName = aiToDbMap[normalizedUrl] || normalizedUrl;
        return name.includes(targetDbName) || targetDbName.includes(name);
      });
      if (matched) {
        setSelectedSpecialty(matched.id);
      } else {
        setSelectedSpecialty('');
      }
    } else if (!urlSpecialty) {
      setSelectedSpecialty('');
    }
  }, [urlSpecialty, specialties]);

  const { data: doctors = [], isLoading } = useQuery<DoctorResult[]>({
    queryKey: ['doctors', query, selectedSpecialty],
    queryFn: async () => {
      const params: any = { search: query };
      if (selectedSpecialty) params.specialty = selectedSpecialty;
      const res = await api.get(`/doctors`, { params });
      return res.data;
    }
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.8065, 10.1815]);

  useEffect(() => {
    if (doctors && doctors.length > 0) {
      const firstDoc = doctors.find(d => d.latitude && d.longitude);
      if (firstDoc) {
        setMapCenter([firstDoc.latitude, firstDoc.longitude]);
      }
    }
  }, [doctors]);


  const matchedSpec = specialties.find(s => s.id === selectedSpecialty);
  let headerText = 'Available Doctors';
  if (query && matchedSpec) {
    headerText = `${matchedSpec.name} results for "${query}"`;
  } else if (query) {
    headerText = `Results for "${query}"`;
  } else if (matchedSpec) {
    headerText = `${matchedSpec.name} Specialists`;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] relative">
      {/* Sidebar / Filters & Results */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col h-full bg-slate-50 border-r border-slate-200 z-10 relative">
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-20">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            {headerText}
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
                <SearchFilters
                  showFilters={showFilters}
                  setShowFilters={setShowFilters}
                  selectedSpecialty={selectedSpecialty}
                  setSelectedSpecialty={setSelectedSpecialty}
                  specialties={specialties}
                />
        </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 bg-slate-50">
          {isLoading && <div className="text-center text-slate-500 mt-10">Loading doctors...</div>}
          {!isLoading && doctors.length === 0 && <div className="text-center text-slate-500 mt-10">No doctors found. Try adjusting your filters.</div>}
          
          {!isLoading && doctors.map(doc => (
            <div 
              key={doc.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer ${hoveredDoctor === doc.id ? 'border-primary-500 shadow-md ring-1 ring-primary-500' : 'border-slate-100 hover:border-primary-300'}`}
              onMouseEnter={() => setHoveredDoctor(doc.id)}
              onMouseLeave={() => setHoveredDoctor(null)}
            >
              <div className="flex gap-4">
                <img src={getUserAvatar(doc.user.id)} alt={doc.user.name} className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{doc.user.name}</h3>
                      <p className="text-primary-600 font-medium">{doc.specialty?.name || 'Specialist'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-sm text-slate-600">
                    <Star size={16} className="fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-slate-800">{doc.ratingAverage || 5.0}</span>
                    <span>({doc._count?.reviews || 0} reviews)</span>
                  </div>
                  <div className="flex items-start gap-1 mt-2 text-sm text-slate-500">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    <span>{doc.clinicAddress || 'Tunis'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <Link to={`/doctor/${doc.id}`} className="flex-1 text-center py-2 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100 transition-colors">
                  View Profile
                </Link>
                <Link to={`/doctor/${doc.id}`} className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                  <Calendar size={18} /> Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="hidden md:block flex-1 h-full z-0 relative">
        <MapContainer center={mapCenter} zoom={13} className="h-full w-full absolute inset-0 z-0">
          <ChangeView center={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!isLoading && doctors.map(doc => {
            if (!doc.latitude || !doc.longitude) return null;
            return (
              <Marker key={doc.id} position={[doc.latitude, doc.longitude]}>
                <Popup>
                  <div className="font-sans">
                    <h3 className="font-bold text-sm">{doc.user.name}</h3>
                    <p className="text-xs text-primary-600 mb-1">{doc.specialty?.name}</p>
                    <p className="text-xs">{doc.clinicAddress}</p>
                    <Link to={`/doctor/${doc.id}`} className="text-xs text-primary-600 underline mt-1 block">View Profile</Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
