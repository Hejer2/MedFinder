import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { MapPin, Star, Phone, Briefcase, X, Navigation2, ChevronRight, Camera } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import api from '../api/axios';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { getUserAvatar } from '../utils/avatar';

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

const CURRENCIES = [
  { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
  { code: 'EUR', symbol: '€',   name: 'Euro' },
  { code: 'USD', symbol: '$',   name: 'US Dollar' },
  { code: 'GBP', symbol: '£',   name: 'British Pound' },
  { code: 'MAD', symbol: 'د.م', name: 'Moroccan Dirham' },
  { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar' },
  { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'LYD', symbol: 'ل.د', name: 'Libyan Dinar' },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
];

function LocationMarker({ position, setPosition }: { position: [number, number] | null; setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

const formatPhoneDisplay = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const matched = COUNTRY_CODES.find(c => phone.startsWith(c.dial));
  if (matched) {
    const local = phone.slice(matched.dial.length).trim();
    return `${matched.dial} ${local}`;
  }
  return phone;
};

export default function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hasLoadedMyReview, setHasLoadedMyReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docBio, setDocBio] = useState('');
  const [docAddress, setDocAddress] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docPhoneCountry, setDocPhoneCountry] = useState('+216');
  const [docSpecialtyId, setDocSpecialtyId] = useState('');
  const [docFee, setDocFee] = useState(100);
  const [docFeeCurrency, setDocFeeCurrency] = useState('TND');
  const [docLat, setDocLat] = useState('');
  const [docLng, setDocLng] = useState('');
  const [docAvatar, setDocAvatar] = useState('');

  // Generate next 7 days
  const nextDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    return d;
  });

  const { data: doctor, isLoading: isDoctorLoading } = useQuery({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['doctor-reviews', id],
    queryFn: async () => {
      const res = await api.get(`/reviews/doctor/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const res = await api.get('/specialties');
      return res.data;
    }
  });

  useEffect(() => {
    if (doctor) {
      setDocName(doctor.user?.name || '');
      setDocBio(doctor.bio || '');
      setDocAddress(doctor.clinicAddress || '');
      // Parse existing phone into country code + local number
      const rawPhone = doctor.phone || '';
      const matched = COUNTRY_CODES.find(c => rawPhone.startsWith(c.dial));
      if (matched) {
        setDocPhoneCountry(matched.dial);
        setDocPhone(rawPhone.slice(matched.dial.length).trim());
      } else {
        setDocPhoneCountry('+216');
        setDocPhone(rawPhone);
      }
      setDocSpecialtyId(doctor.specialtyId || '');
      setDocFee(doctor.consultationFee || 100);
      setDocFeeCurrency(localStorage.getItem(`currency_${doctor.id}`) || 'TND');
      setDocLat(doctor.latitude !== null && doctor.latitude !== undefined ? doctor.latitude.toString() : '');
      setDocLng(doctor.longitude !== null && doctor.longitude !== undefined ? doctor.longitude.toString() : '');
      setDocAvatar(localStorage.getItem(`avatar_${doctor.userId}`) || '');
    }
  }, [doctor]);

  const getLocalDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ['doctor-slots', id, getLocalDateStr(selectedDateObj)],
    queryFn: async () => {
      const dateString = getLocalDateStr(selectedDateObj);
      const res = await api.get(`/doctors/${id}/slots?date=${dateString}`);
      return res.data;
    },
    enabled: !!id
  });

  const bookingMutation = useMutation({
    mutationFn: (dateObj: Date) => api.post('/appointments', {
      doctorId: id,
      date: dateObj.toISOString()
    }),
    onSuccess: () => {
      toast.success(`Booking confirmed for ${selectedDateObj.toDateString()} at ${selectedTime}`);
      navigate('/dashboard/patient');
    },
    onError: () => {
      toast.error('Failed to book appointment. Please try again.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/doctors/me', data),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['doctor', id] });
      queryClient.invalidateQueries({ queryKey: ['doctor-profile-me'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Failed to update profile.');
    }
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentLat = docLat ? parseFloat(docLat) : null;
    const currentLng = docLng ? parseFloat(docLng) : null;

    let resolvedAddress = docAddress;
    if (currentLat && currentLng) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        if (data?.address) {
          const a = data.address;
          const parts = [
            a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
            a.suburb || a.neighbourhood || a.quarter,
            a.city || a.town || a.village || a.county
          ].filter(Boolean);
          resolvedAddress = parts.length > 0 ? parts.join(', ') : (data.display_name || docAddress);
          setDocAddress(resolvedAddress);
        }
      } catch (err) {
        console.error('Reverse geocoding failed', err);
      }
    }

    updateMutation.mutate({
      bio: docBio,
      clinicAddress: resolvedAddress,
      phone: docPhone.trim() ? `${docPhoneCountry}${docPhone.trim()}` : '',
      specialtyId: docSpecialtyId,
      consultationFee: Number(docFee),
      currency: docFeeCurrency || 'TND',
      avatar: docAvatar || null,
      latitude: currentLat,
      longitude: currentLng
    });

    if (docName && docName !== doctor?.user?.name) {
      try {
        await api.patch('/users/me', { name: docName });
        updateUser({ name: docName });
      } catch (err) {
        toast.error('Failed to update account name');
      }
    }
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDocLat(pos.coords.latitude.toString());
          setDocLng(pos.coords.longitude.toString());
          toast.success('Current GPS coordinates acquired!');
        },
        () => {
          toast.error('Unable to retrieve location. Please check browser permissions.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocAvatar(reader.result as string);
        toast.success('Photo preview updated!');
      };
      reader.readAsDataURL(file);
    }
  };

  const reviewMutation = useMutation({
    mutationFn: (data: { doctorId: string, patientId: string, rating: number, comment: string }) => 
      api.post('/reviews', data),
    onSuccess: () => {
      toast.success('Review saved successfully!');
      setIsEditingReview(false);
      queryClient.invalidateQueries({ queryKey: ['doctor-reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['doctor', id] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to save review';
      toast.error(msg);
    }
  });

  const handleBooking = () => {
    if (!user) {
      toast.error('Please log in to book an appointment.');
      navigate('/login');
      return;
    }
    if (!selectedTime) {
      toast.error('Please select an appointment slot');
      return;
    }
    const [hours, minutes] = selectedTime.split(':');
    const dateObj = new Date(selectedDateObj);
    dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    bookingMutation.mutate(dateObj);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to submit a review.');
      return;
    }
    reviewMutation.mutate({
      doctorId: id || '',
      patientId: user.id,
      rating,
      comment
    });
  };

  const isOwner = user?.role === 'DOCTOR' && doctor?.userId === user?.id;
  const myReview = reviews.find((r: any) => r.patientId === user?.id);

  if (myReview && !hasLoadedMyReview) {
    setRating(myReview.rating);
    setComment(myReview.comment || '');
    setHasLoadedMyReview(true);
  }

  if (isDoctorLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 text-xl font-medium">Loading Doctor Profile...</div>;
  }

  const profile = doctor;
  if (!profile) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-rose-500 text-xl font-bold">Doctor Profile not found.</div>;
  }

  const locationCoords: [number, number] | null = 
    profile.latitude !== null && profile.longitude !== null 
      ? [profile.latitude, profile.longitude] 
      : null;

  const currentAvatarUrl = docAvatar || getUserAvatar(profile.userId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      
      {/* Top Banner and Quick Bio Info */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative group shrink-0">
            <img 
              src={currentAvatarUrl} 
              alt="Doctor Avatar" 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-inner"
            />
            {isOwner && (
              <button 
                onClick={handlePhotoClick}
                className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-black transition-all gap-1"
              >
                <Camera size={18} /> Update Photo
              </button>
            )}
          </div>
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{profile.user?.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <p className="text-primary-700 bg-primary-50 px-3 py-1 rounded-full text-xs font-black inline-block">
                {profile.specialty?.name || 'Medical Specialist'}
              </p>
              {isOwner && (
                <button 
                  onClick={() => setShowEditModal(true)} 
                  className="text-primary-605 hover:text-primary-750 hover:underline text-xs font-black"
                >
                  Edit Profile
                </button>
              )}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-slate-600 mt-1">
              <Star className="text-yellow-400 fill-yellow-400" size={16} />
              <span className="font-extrabold text-slate-900">{profile.ratingAverage ?? 0}</span>
              <span className="text-slate-400">({reviews.length} reviews)</span>
            </div>
            {profile.phone && (
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-slate-600">
                <Phone size={15} className="text-slate-400" />
                <a href={`tel:${profile.phone}`} className="font-semibold hover:text-primary-600 transition-colors">
                  {formatPhoneDisplay(profile.phone)}
                </a>
              </div>
            )}
          </div>
        </div>

        {!isOwner && (
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto self-center">
            <a
              href={`tel:${profile.phone || '+21671123456'}`}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 rounded-xl hover:bg-slate-55 text-slate-700 font-bold transition-all text-sm w-full shadow-sm"
            >
              <Phone size={18} /> Call Doctor
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info detail components */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="text-primary-500" size={24} /> About Doctor
            </h2>
            <p className="text-slate-605 text-sm sm:text-base leading-relaxed">
              {profile.bio || `Dr. ${profile.user?.name} is a highly accomplished ${profile.specialty?.name || 'specialist'} committed to providing premium quality medical care and treatments to patients.`}
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="text-primary-500" size={24} /> Doctor Location
            </h2>
            <p className="text-slate-600 mb-4">{profile.clinicAddress || 'Location address not specified'}</p>
            {locationCoords ? (
              <div className="h-64 rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative z-0">
                <MapContainer 
                  center={locationCoords} 
                  zoom={14} 
                  className="h-full w-full absolute inset-0 z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <Marker position={locationCoords}>
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-slate-900 text-xs">{profile.user?.name}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">{profile.clinicAddress}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <div className="h-64 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 font-bold text-xs p-6 text-center">
                <MapPin size={32} className="text-slate-300" />
                <span>Map location is not specified by the doctor yet.</span>
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Star className="text-yellow-500 fill-yellow-500" size={24} /> Reviews & Ratings
            </h2>

            {user?.role === 'PATIENT' && (!myReview || isEditingReview) && (
              <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">{isEditingReview ? 'Edit Your Review' : 'Write a Review'}</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Rating</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        type="button" 
                        key={star} 
                        onClick={() => setRating(star)}
                        className="transition-transform active:scale-95"
                      >
                        <Star className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'} size={24} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Comment</label>
                  <textarea 
                    rows={3} 
                    required 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your appointment experience..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 outline-none text-slate-700 bg-white font-medium text-sm transition-all"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  {isEditingReview && (
                    <button 
                      type="button" 
                      onClick={() => setIsEditingReview(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={reviewMutation.isPending}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors"
                  >
                    {reviewMutation.isPending ? 'Saving...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}

            {myReview && !isEditingReview && (
              <div className="bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100/50 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-yellow-900 text-xs">Your Submitted Review</h3>
                  <button 
                    onClick={() => setIsEditingReview(true)}
                    className="text-[10px] font-black text-yellow-750 hover:underline"
                  >
                    Edit Review
                  </button>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={i < myReview.rating ? 'text-yellow-450 fill-yellow-450' : 'text-slate-200'} size={14} />
                  ))}
                </div>
                <p className="text-yellow-950/80 text-xs italic">"{myReview.comment}"</p>
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-4">No reviews yet for this doctor.</p>
              ) : (
                reviews.map((rev: any) => (
                  <div key={rev.id} className="py-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{rev.patient?.name || 'Patient'}</h4>
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={i < rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'} size={12} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-605 text-sm leading-relaxed">"{rev.comment}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right appointment scheduler panel — hidden for the owner */}
        {isOwner && (
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation Fee</p>
                <p className="text-2xl font-black text-slate-900">
                  {profile.consultationFee ?? '—'}
                  <span className="text-sm font-semibold text-slate-400 ml-1.5">{localStorage.getItem(`currency_${profile.id}`) || 'TND'}</span>
                </p>
              </div>
            </div>
          </div>
        )}
        {!isOwner && (
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Book Visit</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Consultation Fee: {profile.consultationFee ?? 100} {localStorage.getItem(`currency_${profile.id}`) || 'TND'}</p>
              </div>

              {/* Day selection carousel */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Date</label>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {nextDays.map((date) => {
                    const isSelected = getLocalDateStr(selectedDateObj) === getLocalDateStr(date);
                    return (
                      <button 
                        key={date.toString()}
                        onClick={() => {
                          setSelectedDateObj(date);
                          setSelectedTime(null);
                        }}
                        className={`flex flex-col items-center p-2.5 rounded-xl border min-w-14 transition-all shrink-0 ${
                          isSelected 
                            ? 'border-primary-500 bg-primary-600 text-white shadow-md shadow-primary-500/20' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase opacity-80">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-base font-black mt-0.5">{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time selection grid */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Time</label>
                {isLoadingSlots ? (
                  <div className="text-center py-4 text-slate-500 text-sm">Loading slots...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-sm">No slots available on this date.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {availableSlots.map((time: string) => (
                      <button 
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 border rounded-lg font-medium transition-colors text-sm ${
                          selectedTime === time 
                            ? 'border-primary-500 bg-primary-50 text-primary-700' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={handleBooking}
                disabled={bookingMutation.isPending || !selectedTime}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-primary-500/10 disabled:opacity-50"
              >
                {bookingMutation.isPending ? 'Confirming...' : 'Book Appointment'}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Edit Profile</h3>
                <p className="text-xs text-primary-100 mt-0.5">Manage details of your doctor profile, specialties, and coordinates</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-white/70 hover:text-white transition-colors p-1.5 bg-white/10 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <img 
                  src={currentAvatarUrl} 
                  alt="Avatar Preview" 
                  className="w-16 h-16 rounded-2xl object-cover shadow-sm"
                />
                <div>
                  <button 
                    type="button"
                    onClick={handlePhotoClick}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-55 transition-all shadow-sm"
                  >
                    Upload New Photo
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1">Accepts PNG, JPG or GIF up to 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={e => setDocName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Specialty</label>
                  <div className="relative">
                    <select 
                      value={docSpecialtyId} 
                      onChange={e => setDocSpecialtyId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold appearance-none"
                    >
                      <option value="" disabled>Choose specialty</option>
                      {specialties.map((spec: any) => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} className="absolute right-3.5 top-3.5 rotate-90 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Doctor Bio</label>
                <textarea
                  rows={3}
                  value={docBio}
                  onChange={e => setDocBio(e.target.value)}
                  placeholder="Describe your expertise and patient care style..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Phone Number</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 bg-slate-55">
                    <select
                      value={docPhoneCountry}
                      onChange={e => setDocPhoneCountry(e.target.value)}
                      className="bg-slate-100 border-r border-slate-200 px-2 py-2.5 text-sm font-bold outline-none shrink-0 cursor-pointer"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.dial + c.name} value={c.dial}>
                          {c.flag} {c.dial}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={docPhone}
                      onChange={e => setDocPhone(e.target.value)}
                      placeholder="12 345 678"
                      className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm font-semibold min-w-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Consultation Fee</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 bg-slate-55">
                    <select
                      value={docFeeCurrency}
                      onChange={e => setDocFeeCurrency(e.target.value)}
                      className="bg-slate-100 border-r border-slate-200 px-2 py-2.5 text-sm font-bold outline-none shrink-0 cursor-pointer"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={docFee}
                      onChange={e => setDocFee(Number(e.target.value))}
                      className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm font-semibold min-w-0"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 text-[11px] text-primary-700 font-semibold">
                📍 Address will be automatically resolved from your pinned location on save.
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase">GPS Helper</span>
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="text-xs font-black text-primary-700 hover:text-primary-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Navigation2 size={12} className="rotate-45 text-primary-600" /> Pin Current GPS
                </button>
              </div>

              <div className="h-44 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                <MapContainer
                  center={[parseFloat(docLat) || 36.8065, parseFloat(docLng) || 10.1815]}
                  zoom={13}
                  className="h-full w-full absolute inset-0 z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <LocationMarker
                    position={docLat && docLng ? [parseFloat(docLat), parseFloat(docLng)] : null}
                    setPosition={(pos) => {
                      setDocLat(pos[0].toString());
                      setDocLng(pos[1].toString());
                    }}
                  />
                </MapContainer>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2.5 border rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
