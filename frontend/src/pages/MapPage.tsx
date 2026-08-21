import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { Search, MapPin, Star, Activity, ChevronRight, Navigation2, Calendar, Clock, X, CheckCircle, List } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Geolocation } from '@capacitor/geolocation';
import api from '../api/axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Fix leaflet icon
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const doctorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const pharmacyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// ---- Date helpers ----
function getNextDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDateLabel(d: Date, i: number) {
  if (i === 0) return 'Today';
  if (i === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---- Booking Modal ----
interface BookingModalProps {
  doctor: { id: string; name: string; specialty: string; price: string; rating: number; address: string };
  onClose: () => void;
}

function BookingModal({ doctor, onClose }: BookingModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nextDays = getNextDays(7);
  const [selectedDate, setSelectedDate] = useState<Date>(nextDays[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const dateStr = toDateString(selectedDate);

  const { data: slots = [], isLoading: loadingSlots } = useQuery<string[]>({
    queryKey: ['doctor-slots', doctor.id, dateStr],
    queryFn: async () => {
      const res = await api.get(`/doctors/${doctor.id}/slots?date=${dateStr}`);
      return res.data;
    },
    enabled: !!doctor.id,
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error('No slot selected');
      // Parse 12h slot back to 24h for the ISO date
      const [timePart, modifier] = selectedSlot.split(' ');
      let [hStr, mStr] = timePart.split(':');
      let h = parseInt(hStr, 10);
      if (modifier === 'PM' && h !== 12) h += 12;
      if (modifier === 'AM' && h === 12) h = 0;
      const dateObj = new Date(selectedDate);
      dateObj.setUTCHours(h, parseInt(mStr, 10), 0, 0);
      return api.post('/appointments', { doctorId: doctor.id, date: dateObj.toISOString() });
    },
    onSuccess: () => {
      toast.success(`Appointment booked on ${selectedDate.toLocaleDateString()} at ${selectedSlot}!`);
      onClose();
      navigate('/dashboard/patient');
    },
    onError: () => toast.error('Failed to book appointment. Please try again.'),
  });

  const handleBook = () => {
    if (!user) {
      toast.error('Please log in to book an appointment.');
      navigate('/login');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select a time slot first.');
      return;
    }
    bookingMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{doctor.name}</h2>
              <p className="text-primary-100 text-sm mt-0.5">{doctor.specialty}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1 font-semibold bg-white/10 px-2 py-1 rounded-lg">
                  <Star size={14} className="fill-yellow-300 text-yellow-300" /> {doctor.rating}
                </span>
                <span className="bg-white/10 px-2 py-1 rounded-lg font-semibold">{doctor.price}</span>
                <span className="flex items-center gap-1 text-primary-100">
                  <MapPin size={14} /> {doctor.address}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Date Selector */}
          <div className="mb-5">
            <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-primary-500" /> Select Date
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {nextDays.map((d, i) => {
                const isSelected = toDateString(d) === dateStr;
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs opacity-80">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-base font-bold">{d.getDate()}</span>
                    <span className="text-xs opacity-70">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div className="mb-5">
            <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-primary-500" /> Available Slots
              <span className="text-xs font-normal text-slate-400">– {formatDateLabel(selectedDate, nextDays.indexOf(selectedDate) === -1 ? 2 : nextDays.indexOf(selectedDate))}</span>
            </p>
            {loadingSlots ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading slots…</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium">No availability on this day</p>
                <p className="text-xs mt-1">Try another date</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                {slots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 rounded-xl border text-sm font-semibold transition-all ${
                      selectedSlot === slot
                        ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleBook}
            disabled={!selectedSlot || bookingMutation.isPending}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
          >
            {bookingMutation.isPending ? (
              'Confirming…'
            ) : (
              <>
                <CheckCircle size={18} />
                {selectedSlot ? `Confirm – ${selectedSlot}` : 'Select a slot to book'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main MapPage ----
export default function MapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const [filterType, setFilterType] = useState(qParam ? 'DOCTOR' : 'ALL');
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.8065, 10.1815]);
  const [zoomLevel, setZoomLevel] = useState(12);
  const [bookingDoctor, setBookingDoctor] = useState<null | {
    id: string; name: string; specialty: string; price: string; rating: number; address: string;
  }>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [selectedProfile, setSelectedProfile] = useState<'driving' | 'foot'>('driving');
  const [routeInfo, setRouteInfo] = useState<{
    driving: { distance: string; duration: string } | null;
    foot: { distance: string; duration: string } | null;
  } | null>(null);

  // Dynamic directions routing effect (Parallel Car and Foot fetches)
  useEffect(() => {
    const fetchRoutes = async () => {
      if (!userLocation || !selectedItem) {
        setRouteCoords([]);
        setRouteInfo(null);
        return;
      }
      const [startLat, startLng] = userLocation;
      const endLat = selectedItem.lat;
      const endLng = selectedItem.lng;

      let drivingInfo = null;
      let footInfo = null;
      let coords: [number, number][] = [];

      // 1. Fetch Driving Route
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const res = await fetch(url).then(r => r.json());
        if (res.code === 'Ok' && res.routes && res.routes[0]) {
          const route = res.routes[0];
          drivingInfo = {
            distance: `${(route.distance / 1000).toFixed(1)} km`,
            duration: `${Math.round(route.duration / 60)} mins`
          };
          if (selectedProfile === 'driving') {
            coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch driving route:', err.message);
      }

      // 2. Fetch Foot Route
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const res = await fetch(url).then(r => r.json());
        if (res.code === 'Ok' && res.routes && res.routes[0]) {
          const route = res.routes[0];
          footInfo = {
            distance: `${(route.distance / 1000).toFixed(1)} km`,
            duration: `${Math.round(route.duration / 60)} mins`
          };
          if (selectedProfile === 'foot') {
            coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch foot route:', err.message);
      }

      // Fallback
      if (coords.length === 0) {
        coords = [userLocation, [endLat, endLng]];
        drivingInfo = { distance: 'Direct line', duration: 'Calculating...' };
        footInfo = { distance: 'Direct line', duration: 'Calculating...' };
      }

      setRouteCoords(coords);
      setRouteInfo({ driving: drivingInfo, foot: footInfo });
    };
    fetchRoutes();
  }, [userLocation, selectedItem, selectedProfile]);

  const { data: realDoctors = [] } = useQuery({
    queryKey: ['map-doctors'],
    queryFn: async () => { 
      const res = await api.get('/doctors'); 
      return Array.isArray(res.data) ? res.data : (res.data.data || []); 
    },
  });

  const { data: realPharmacies = [] } = useQuery({
    queryKey: ['map-pharmacies'],
    queryFn: async () => { 
      const res = await api.get('/pharmacies'); 
      return Array.isArray(res.data) ? res.data : (res.data.data || []); 
    },
  });

  const doctorData = realDoctors
    .filter((doc: any) => doc.latitude !== null && doc.longitude !== null && doc.latitude !== undefined && doc.longitude !== undefined)
    .map((doc: any) => ({
      id: doc.id,
      type: 'DOCTOR' as const,
      name: doc.user?.name || 'Unknown Doctor',
      specialty: doc.specialty?.name || 'General',
      rating: doc.ratingAverage || 0,
      address: doc.clinicAddress || 'Tunis',
      lat: doc.latitude,
      lng: doc.longitude,
      price: `${doc.consultationFee || 80} TND`,
    }));

  const pharmacyData = realPharmacies
    .filter((ph: any) => ph.latitude !== null && ph.longitude !== null && ph.latitude !== undefined && ph.longitude !== undefined)
    .map((ph: any) => ({
      id: ph.id,
      type: 'PHARMACY' as const,
      name: ph.user?.name || 'Unknown Pharmacy',
      specialty: 'Pharmacy',
      rating: 0,
      address: ph.address || ph.city || 'Tunis',
      lat: ph.latitude,
      lng: ph.longitude,
      price: '',
    }));

  const allMapData = [...doctorData, ...pharmacyData];

  const locateUser = async () => {
    const isCapacitor = !!(window as any).Capacitor;
    if (isCapacitor) {
      const locateToast = toast.loading('Locating you...');
      try {
        const perm = await Geolocation.requestPermissions();
        if (perm.coarseLocation === 'granted' || perm.location === 'granted') {
          const coordinates = await Geolocation.getCurrentPosition();
          const loc: [number, number] = [coordinates.coords.latitude, coordinates.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
          setZoomLevel(14);
          toast.success('Location found!', { id: locateToast });
        } else {
          toast.error('Location permission denied', { id: locateToast });
        }
      } catch (err: any) {
        console.error('Capacitor location error:', err);
        toast.error('Unable to retrieve location. Please check your GPS settings.', { id: locateToast });
      }
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLocation(loc);
            setMapCenter(loc);
            setZoomLevel(14);
            toast.success('Location found!');
          },
          () => toast.error('Unable to retrieve your location')
        );
      } else {
        toast.error('Geolocation not supported by this browser.');
      }
    }
  };

  const filteredData = allMapData.filter(item => {
    const matchType = filterType === 'ALL' || item.type === filterType;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-50 mt-16 overflow-hidden relative">
      {/* Sidebar */}
      <div className={`w-full md:w-96 bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl transition-all ${
        mobileView === 'list' ? 'h-full flex' : 'hidden md:flex md:h-full'
      }`}>
        <div className="p-4 border-b border-slate-100 space-y-4 bg-white">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Explore Map</h1>

          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors, pharmacies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            {['ALL', 'DOCTOR', 'PHARMACY'].map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
                  filterType === f
                    ? f === 'ALL' ? 'bg-slate-800 text-white shadow-md'
                    : f === 'DOCTOR' ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : f === 'ALL' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : f === 'DOCTOR' ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'DOCTOR' ? 'Doctors' : 'Pharmacies'}
              </button>
            ))}
          </div>

          <button
            onClick={locateUser}
            className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
          >
            <Navigation2 size={18} /> Use My Location
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filteredData.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary-200 hover:shadow-lg cursor-pointer transition-all"
              onClick={() => { setSelectedItem(item); setMapCenter([item.lat, item.lng]); setZoomLevel(15); }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900">{item.name}</h3>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold ${item.type === 'DOCTOR' ? 'bg-primary-50 text-primary-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {item.type}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-3">{item.specialty}</p>
              <div className="flex items-center text-xs text-slate-600 mb-4 gap-4">
                <span className="flex items-center gap-1 font-medium"><Star size={14} className="text-amber-400 fill-current" /> {item.rating}</span>
                <span className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {item.address}</span>
                {item.type === 'DOCTOR' && <span className="font-semibold text-primary-600">{item.price}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); navigate(item.type === 'DOCTOR' ? `/doctor/${item.id}` : `/pharmacy/${item.id}`); }}
                  className="flex-1 py-2 text-sm font-bold bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors flex justify-center items-center gap-1"
                >
                  Details <ChevronRight size={14} />
                </button>
                {item.type === 'DOCTOR' && (
                  <button
                    onClick={e => { e.stopPropagation(); setBookingDoctor(item); }}
                    className="flex-1 py-2 text-sm font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-md shadow-primary-500/20 transition-colors flex justify-center items-center gap-1"
                  >
                    <Calendar size={14} /> Book
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No places found</h3>
              <p className="text-slate-500">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
      </div>
 
      {/* Map */}
      <div className={`flex-1 relative z-0 transition-all ${
        mobileView === 'map' ? 'h-full block' : 'hidden md:block md:h-full'
      }`}>
        <MapContainer center={mapCenter} zoom={zoomLevel} className="w-full h-full" zoomControl={false}>
          <ChangeView center={mapCenter} zoom={zoomLevel} />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              color="#10b981"
              weight={4}
              opacity={0.85}
              dashArray={routeInfo?.[selectedProfile]?.duration === 'Calculating...' ? '5, 10' : undefined}
            />
          )}

          {selectedItem && routeInfo && (
            <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md border border-slate-100 p-4 rounded-3xl shadow-xl flex flex-col gap-3.5 max-w-[280px] w-full">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${selectedItem.type === 'DOCTOR' ? 'bg-primary-50 text-primary-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {selectedItem.type}
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-900 truncate mt-1">{selectedItem.name}</h4>
                  <p className="text-slate-500 text-[10px] truncate mt-0.5">{selectedItem.address}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Driving Toggle */}
                <button
                  onClick={() => setSelectedProfile('driving')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    selectedProfile === 'driving' 
                      ? 'border-primary-500 bg-primary-50/50 text-primary-900 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-500 bg-white'
                  }`}
                >
                  <span className="text-[10px] font-black">🚗 By Car</span>
                  {routeInfo.driving ? (
                    <span className="text-[8px] font-bold text-slate-500 mt-0.5">
                      {routeInfo.driving.duration} ({routeInfo.driving.distance})
                    </span>
                  ) : (
                    <span className="text-[8px] text-slate-400 mt-0.5">N/A</span>
                  )}
                </button>

                {/* Foot Toggle */}
                <button
                  onClick={() => setSelectedProfile('foot')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    selectedProfile === 'foot' 
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-500 bg-white'
                  }`}
                >
                  <span className="text-[10px] font-black">🚶 On Foot</span>
                  {routeInfo.foot ? (
                    <span className="text-[8px] font-bold text-slate-500 mt-0.5">
                      {routeInfo.foot.duration} ({routeInfo.foot.distance})
                    </span>
                  ) : (
                    <span className="text-[8px] text-slate-400 mt-0.5">N/A</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {userLocation && (
            <Marker position={userLocation}>
              <Popup>Your Location</Popup>
            </Marker>
          )}

          {filteredData.map(item => (
            <Marker 
              key={item.id} 
              position={[item.lat, item.lng]} 
              icon={item.type === 'DOCTOR' ? doctorIcon : pharmacyIcon}
              eventHandlers={{
                click: () => setSelectedItem(item)
              }}
            >
              <Popup className="custom-popup" closeButton={false}>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${item.type === 'DOCTOR' ? 'bg-primary-50 text-primary-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {item.type}
                    </span>
                    <span className="flex items-center text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-md">
                      <Star size={12} className="text-amber-400 fill-current mr-1" /> {item.rating}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{item.name}</h3>
                  <p className="text-sm text-slate-500 mb-3 border-b border-slate-100 pb-3">{item.specialty}</p>
                  <div className="space-y-2 mb-4 text-sm">
                    <p className="flex items-start gap-2 text-slate-600"><MapPin size={16} className="shrink-0 mt-0.5 text-slate-400" /><span className="leading-tight">{item.address}</span></p>
                    {item.type === 'DOCTOR' && <p className="flex items-center gap-2 text-slate-600"><Activity size={16} className="text-slate-400" /> {item.price}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate(item.type === 'DOCTOR' ? `/doctor/${item.id}` : `/pharmacy/${item.id}`)}
                      className="w-full py-2 text-slate-700 bg-slate-100 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                      View Profile
                    </button>
                    {item.type === 'DOCTOR' && (
                      <button
                        onClick={() => setBookingDoctor(item)}
                        className="w-full py-2.5 text-white bg-primary-600 rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/30 flex items-center justify-center gap-2"
                      >
                        <Calendar size={14} /> Book Appointment
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Booking Modal (portal-style overlay) */}
      {bookingDoctor && (
        <BookingModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
        />
      )}

      {/* Mobile view toggle floating button */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 shadow-xl shadow-slate-900/20">
        <button
          onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
          className="bg-slate-900 text-white font-bold px-6 py-3.5 rounded-full text-xs tracking-wider uppercase flex items-center gap-2 hover:bg-slate-800 transition-all border border-slate-800 active:scale-95"
        >
          {mobileView === 'list' ? (
            <>
              <MapPin size={16} /> Show Map View
            </>
          ) : (
            <>
              <List size={16} /> Show List View
            </>
          )}
        </button>
      </div>
    </div>
  );
}
