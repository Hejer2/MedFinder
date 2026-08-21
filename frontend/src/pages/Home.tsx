import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, ShieldCheck, CalendarCheck, Activity, Users, ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getUserAvatar } from '../utils/avatar';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/map?q=${encodeURIComponent(searchQuery)}`);
  };

  const [specialties, setSpecialties] = useState([] as { name: string; icon: string; count: number; path: string }[]);
  const [featuredDoctors, setFeaturedDoctors] = useState([] as any[]);

  useEffect(() => {
    api.get('/specialties/top')
      .then(res => {
        const data = res.data;
        const icons: Record<string, string> = {
          Cardiology: '❤️',
          Dermatology: '✨',
          Dentistry: '🦷',
          Pediatrics: '👶',
          Neurology: '🧠',
          Orthopedics: '🦴',
          Ophthalmology: '👁️',
          'General Practice': '🩺',
        };
        setSpecialties(data.map((s: any) => ({
          name: s.name,
          icon: icons[s.name] || '❓',
          count: s.doctorCount,
          path: s.name.toLowerCase().replace(/\s+/g, ''),
        })));
      })
      .catch(() => setSpecialties([]));

    api.get('/doctors')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const mapped = data.map((d: any) => ({
          id: d.id,
          userId: d.user?.id,
          name: d.user?.name || 'Unknown Doctor',
          specialty: d.specialty?.name || 'General',
          rating: d.ratingAverage || 0,
          reviewsCount: d._count?.reviews || 0,
          address: d.clinicAddress || d.city || 'Tunis',
          price: `${d.consultationFee || 100} TND`,
        }));
        const sorted = [...mapped].sort((a: any, b: any) => b.rating - a.rating).slice(0, 4);
        setFeaturedDoctors(sorted);
      })
      .catch(() => setFeaturedDoctors([]));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero Section */}
      <section className="relative bg-white pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1638202993928-7267aad84c31?auto=format&fit=crop&q=80&w=2000" 
            alt="Medical Hero" 
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/50" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
                Your Health, <br/>
                <span className="text-primary-600">Our Priority.</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                Find the right doctor and book your appointment online instantly. Join MedFinder to experience seamless healthcare.
              </p>
            </motion.div>

            {/* Smart search input */}
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              onSubmit={handleSearch}
              className="bg-white p-3 rounded-2xl shadow-xl flex flex-col md:flex-row gap-3 border border-slate-100 mb-8"
            >
              <div className="flex-1 relative flex items-center border-b md:border-b-0 md:border-r border-slate-200">
                <Search className="absolute left-4 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Doctor, specialty, clinic..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:ring-0 outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div className="flex-1 relative flex items-center">
                <MapPin className="absolute left-4 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="City or region" 
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:ring-0 outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-8 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2">
                <Search size={20} />
                <span>Search</span>
              </button>
            </motion.form>


          </div>
        </div>
      </section>

      {/* 2. Quick Specialties */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Quick Specialties</h2>
              <p className="text-slate-600">Find experienced doctors across top specialties.</p>
            </div>

          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {specialties.map((spec, i) => (
              <motion.button 
                key={spec.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/map?q=${encodeURIComponent(spec.name)}`)}
                className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col items-center justify-center hover:bg-primary-50 hover:border-primary-100 hover:shadow-sm hover:-translate-y-1 transition-all group"
              >
                <span className="text-4xl mb-4 group-hover:scale-110 transition-transform block">{spec.icon}</span>
                <span className="font-semibold text-slate-800 mb-1">{spec.name}</span>
                <span className="text-xs text-slate-500">{spec.count} Doctors</span>
              </motion.button>
            ))}
          </div>

        </div>
      </section>

      {/* 3. How It Works */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary-600/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Get your healthcare sorted in three simple steps.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-slate-800 -translate-y-1/2 z-0"></div>

            {[
              { icon: <Search className="text-primary-400" size={32} />, title: 'Search Doctor', desc: 'Find doctors by specialty, location, or name.' },
              { icon: <CalendarCheck className="text-blue-400" size={32} />, title: 'Book Appointment', desc: 'Choose a time slot that works best for you.' },
              { icon: <Activity className="text-emerald-400" size={32} />, title: 'Visit Clinic', desc: 'Get the care you need and leave a review.' },
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 bg-slate-800 border-4 border-slate-900 rounded-full flex items-center justify-center mb-6 shadow-xl relative">
                  {step.icon}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold border-4 border-slate-900">
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Featured Doctors */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Featured Doctors</h2>
              <p className="text-slate-600">Highly rated professionals ready to help you.</p>
            </div>
            <button onClick={() => navigate('/map')} className="hidden md:flex items-center gap-1 text-primary-600 font-medium hover:text-primary-700 transition-colors">
              See all doctors <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDoctors.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <img src={getUserAvatar(doc.userId)} alt={doc.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary-50" />
                    <div>
                      <h3 className="font-bold text-slate-900">{doc.name}</h3>
                      <p className="text-sm text-slate-500">{doc.specialty}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-slate-600">
                      {doc.rating > 0 ? (
                        <>
                          <Star size={16} className="text-amber-400 fill-current mr-2" />
                          <span className="font-medium text-slate-800 mr-1">{doc.rating}</span>
                          <span>({doc.reviewsCount} reviews)</span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No rating yet</span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <MapPin size={16} className="text-slate-400 mr-2" />
                      {doc.address}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Activity size={16} className="text-slate-400 mr-2" />
                      Consultation: <span className="font-medium text-slate-800 ml-1">{doc.price}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/doctor/${doc.id}`)}
                    className="w-full py-3 bg-slate-50 hover:bg-primary-50 text-primary-600 font-semibold rounded-xl transition-colors border border-slate-100 hover:border-primary-100 flex justify-center items-center gap-2"
                  >
                    View Profile <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          <button onClick={() => navigate('/map')} className="mt-8 w-full md:hidden flex items-center justify-center gap-1 text-primary-600 font-medium py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            See all doctors <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* 5. Map Preview */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Find Doctors Near You</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Use our interactive map to discover top-rated healthcare professionals in your area. Check clinic locations, view availability, and book your visit instantly.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Real-time availability updates',
                  'Turn-by-turn navigation to clinics',
                  'Filter by proximity and specialty'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/map')} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-8 rounded-xl transition-colors shadow-lg shadow-primary-500/30 flex items-center gap-2">
                Open Map View <MapPin size={20} />
              </button>
            </div>
            
            <div className="h-[400px] bg-slate-100 rounded-3xl overflow-hidden shadow-xl border-4 border-white relative z-0">
              <MapContainer 
                center={[36.8065, 10.1815]}
                zoom={12} 
                scrollWheelZoom={false}
                className="w-full h-full z-0"
              >
                <TileLayer
                  attribution='&amp;copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[36.8065, 10.1815]}>
                  <Popup>
                    <div className="font-semibold text-slate-800">Dr. Sarah Ahmed</div>
                    <div className="text-sm text-slate-500">Cardiology</div>
                  </Popup>
                </Marker>
                <Marker position={[36.82, 10.16]}>
                  <Popup>
                    <div className="font-semibold text-slate-800">Dr. Karim Ben Ali</div>
                    <div className="text-sm text-slate-500">Dermatology</div>
                  </Popup>
                </Marker>
                <Marker position={[36.85, 10.20]}>
                  <Popup>
                    <div className="font-semibold text-slate-800">Dr. Youssef Mansour</div>
                    <div className="text-sm text-slate-500">Pediatrics</div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Why MedFinder */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Trust MedFinder</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">We prioritize your health and security by providing a reliable and transparent platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 mx-auto bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Doctors</h3>
              <p className="text-slate-600">Every practitioner on our platform goes through a strict verification process to ensure highest medical standards.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                <CalendarCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Booking</h3>
              <p className="text-slate-600">Your data is fully encrypted. Book appointments with peace of mind knowing your medical information is safe.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 mx-auto bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Genuine Reviews</h3>
              <p className="text-slate-600">Read verified reviews from actual patients. We ensure transparency so you can make informed health decisions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary-600 z-0"></div>
        {/* Abstract pattern */}
        <div className="absolute inset-0 opacity-10 z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-md border border-white/20 p-10 md:p-14 rounded-3xl shadow-2xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Are you a doctor? Join MedFinder</h2>
            <p className="text-primary-100 text-lg mb-10 max-w-2xl mx-auto">
              Digitize your practice, reach more patients, and reduce administrative work. Join the fastest growing healthcare network today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/register')} className="w-full sm:w-auto bg-white text-primary-600 font-bold py-4 px-10 rounded-xl hover:bg-slate-50 transition-colors shadow-lg flex items-center justify-center gap-2">
                List Your Practice <ArrowRight size={20} />
              </button>
              <button onClick={() => navigate('/contact')} className="w-full sm:w-auto bg-primary-700/50 text-white font-medium py-4 px-10 rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                Contact Sales
              </button>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
