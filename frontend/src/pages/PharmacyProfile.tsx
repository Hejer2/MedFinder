import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Search, Phone, Plus, Edit2, Trash2, X, Check, FileText, Navigation2, Camera, ShoppingBag, ShoppingCart, CreditCard, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import api from '../api/axios';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { getPharmAvatar } from '../utils/avatar';

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

const getCurrencyByPhone = (phone: string | null | undefined) => {
  const defaultCurr = { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' };
  if (!phone) return defaultCurr;
  const trimmed = phone.trim();

  const dialMap: Record<string, string> = {
    '+216': 'TND',
    '+212': 'MAD',
    '+213': 'DZD',
    '+218': 'LYD',
    '+20': 'EGP',
    '+966': 'SAR',
    '+971': 'AED',
    '+974': 'QAR',
    '+965': 'KWD',
    '+33': 'EUR',
    '+49': 'EUR',
    '+39': 'EUR',
    '+34': 'EUR',
    '+32': 'EUR',
    '+31': 'EUR',
    '+44': 'GBP',
    '+1': 'USD',
    '+41': 'CHF',
  };

  const matchedDial = Object.keys(dialMap).find(dial => trimmed.startsWith(dial));
  if (matchedDial) {
    const code = dialMap[matchedDial];
    const found = CURRENCIES.find(c => c.code === code);
    if (found) return found;
  }
  
  return defaultCurr;
};

const formatPhoneDisplay = (phone: string | null | undefined): string => {
  if (!phone) return 'No phone provided';
  const matched = COUNTRY_CODES.find(c => phone.startsWith(c.dial));
  if (matched) {
    const local = phone.slice(matched.dial.length).trim();
    return `${matched.dial} ${local}`;
  }
  return phone;
};

export default function PharmacyProfile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pharmAvatar, setPharmAvatar] = useState('');

  // Shopping Cart & Checkout states
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'payment'>('review');
  const [prescriptionFile, setPrescriptionFile] = useState<string | null>(null);
  const [prescriptionName, setPrescriptionName] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  // Delivery options state
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  // Payment simulated details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // Tab for Pharmacy Owner: 'catalog' | 'orders'
  const [pharmacyTab, setPharmacyTab] = useState<'catalog' | 'orders'>('catalog');

  const handlePhotoClick = async () => {
    const isCapacitor = !!(window as any).Capacitor;
    if (isCapacitor) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt
        });
        if (image.base64String) {
          const blob = await fetch(`data:image/${image.format};base64,${image.base64String}`).then(r => r.blob());
          const file = new File([blob], `avatar.${image.format}`, { type: `image/${image.format}` });
          await uploadFile(file);
        }
      } catch (err: any) {
        console.warn('Capacitor camera error:', err.message);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const uploadToast = toast.loading('Uploading photo...');
    try {
      const res = await api.post('/pharmacies/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPharmAvatar(res.data.url);
      toast.success('Photo uploaded successfully!', { id: uploadToast });
    } catch (err: any) {
      toast.error('Failed to upload photo.', { id: uploadToast });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Medicine Form states
  const [medName, setMedName] = useState('');
  const [medPrice, setMedPrice] = useState('');
  const [medStatus, setMedStatus] = useState('AVAILABLE');
  const [medDesc, setMedDesc] = useState('');
  const [medRequireUpload, setMedRequireUpload] = useState(true);

  // Pharmacy Profile Info Form states
  const [pharmName, setPharmName] = useState('');
  const [pharmPhone, setPharmPhone] = useState('');
  const [pharmPhoneCountry, setPharmPhoneCountry] = useState('+216');
  const [pharmAddress, setPharmAddress] = useState('');
  const [pharmCity, setPharmCity] = useState('');
  const [pharmLat, setPharmLat] = useState('');
  const [pharmLng, setPharmLng] = useState('');
  const [pharmWeekdays, setPharmWeekdays] = useState('');
  const [pharmSaturday, setPharmSaturday] = useState('');
  const [pharmSunday, setPharmSunday] = useState('');
  const [pharmIsOpen, setPharmIsOpen] = useState(true);
  const [pharmDeliveryFee, setPharmDeliveryFee] = useState('7.00');

  const isMe = id === 'me' || !id;

  // Fetch Pharmacy Profile
  const { data: pharmacy, isLoading, error } = useQuery({
    queryKey: ['pharmacy-profile', id],
    queryFn: async () => {
      const endpoint = isMe ? '/pharmacies/me' : `/pharmacies/${id}`;
      const res = await api.get(endpoint);
      return res.data;
    }
  });

  const isOwner = currentUser?.role === 'PHARMACY' && (isMe || pharmacy?.userId === currentUser?.id);

  // Fetch Pharmacy Orders for Owner
  const { data: pharmacyOrders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['pharmacy-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/pharmacy');
      return res.data;
    },
    enabled: !!isOwner,
  });

  useEffect(() => {
    if (pharmacy) {
      setPharmAvatar(pharmacy.avatar || '');
    }
  }, [pharmacy]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedProfile: any) => {
      return api.patch('/pharmacies/me', updatedProfile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-profile', id] });
      toast.success('Pharmacy profile updated successfully!');
      setShowInfoModal(false);
    },
    onError: () => toast.error('Failed to update pharmacy profile.')
  });

  const addMutation = useMutation({
    mutationFn: async (newMed: any) => {
      return api.post('/pharmacies/medicines', newMed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-profile', id] });
      toast.success('Medicine added successfully!');
      closeModal();
    },
    onError: () => toast.error('Failed to add medicine.')
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedMed: any) => {
      return api.patch(`/pharmacies/medicines/${updatedMed.id}`, updatedMed.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-profile', id] });
      toast.success('Medicine updated successfully!');
      closeModal();
    },
    onError: () => toast.error('Failed to update medicine.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (medId: string) => {
      return api.delete(`/pharmacies/medicines/${medId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-profile', id] });
      toast.success('Medicine removed from stock.');
    },
    onError: () => toast.error('Failed to remove medicine.')
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async (payload: { orderId: string; status: string }) => {
      return api.patch(`/orders/${payload.orderId}/status`, { status: payload.status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] });
      toast.success('Order status updated!');
    },
    onError: () => toast.error('Failed to update order status.')
  });

  // Cart operations
  const addToCart = (med: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === med.id);
      if (existing) {
        return prev.map(item => item.id === med.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: med.id, name: med.name, price: med.price, status: med.status, requireUpload: med.requireUpload !== undefined ? med.requireUpload : true, quantity: 1 }];
    });
    toast.success(`${med.name} added to cart!`);
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter((x): x is any => x !== null));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartRequiresPrescription = cart.some(item => item.status === 'PRESCRIPTION_REQUIRED' && item.requireUpload);

  const triggerPrescriptionCapture = async () => {
    const isCapacitor = !!(window as any).Capacitor;
    if (isCapacitor) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt
        });
        if (image.base64String) {
          const blob = await fetch(`data:image/${image.format};base64,${image.base64String}`).then(r => r.blob());
          const file = new File([blob], `prescription.${image.format}`, { type: `image/${image.format}` });
          await uploadPrescription(file);
        }
      } catch (err: any) {
        console.warn('Capacitor camera prescription error:', err.message);
      }
    }
  };

  const uploadPrescription = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const uploadToast = toast.loading('Uploading prescription...');
    try {
      const res = await api.post('/orders/upload-prescription', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPrescriptionFile(res.data.url);
      setPrescriptionName(file.name);
      toast.success('Prescription uploaded successfully!', { id: uploadToast });
    } catch (err: any) {
      toast.error('Failed to upload prescription.', { id: uploadToast });
    }
  };

  const handlePrescriptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPrescription(file);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (cartRequiresPrescription && !prescriptionFile) {
      toast.error('Please upload a prescription for prescription-only medicines.');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      toast.error('Please enter a valid 16-digit card number.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const orderItems = cart.map(item => ({
        medicineId: item.id,
        quantity: item.quantity,
      }));

      const orderRes = await api.post('/orders', {
        pharmacyId: pharmacy.id,
        items: orderItems,
        prescriptionUrl: prescriptionFile,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'DELIVERY' ? deliveryAddress : null,
        deliveryPhone: deliveryMethod === 'DELIVERY' ? deliveryPhone : null,
      });

      const createdOrder = orderRes.data;

      // Simulate payment call
      const payRes = await api.post(`/orders/${createdOrder.id}/pay`);
      
      setOrderSuccess(payRes.data);
      setCart([]);
      setPrescriptionFile(null);
      setPrescriptionName('');
      setShowCheckout(false);
      toast.success('Order placed and paid successfully!');
      
      queryClient.invalidateQueries({ queryKey: ['pharmacy-profile', id] });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to place order.';
      toast.error(msg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const openAddModal = () => {
    setEditingMedicine(null);
    setMedName('');
    setMedPrice('');
    setMedStatus('AVAILABLE');
    setMedDesc('');
    setMedRequireUpload(true);
    setShowModal(true);
  };

  const openEditModal = (med: any) => {
    setEditingMedicine(med);
    setMedName(med.name);
    setMedPrice(med.price.toString());
    setMedStatus(med.status);
    setMedDesc(med.description || '');
    setMedRequireUpload(med.requireUpload !== undefined ? med.requireUpload : true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMedicine(null);
  };

  const openInfoModal = () => {
    if (!pharmacy) return;
    setPharmName(pharmacy.user?.name || '');
    const rawPhone = pharmacy.phone || '';
    const matched = COUNTRY_CODES.find(c => rawPhone.startsWith(c.dial));
    if (matched) {
      setPharmPhoneCountry(matched.dial);
      setPharmPhone(rawPhone.slice(matched.dial.length).trim());
    } else {
      setPharmPhoneCountry('+216');
      setPharmPhone(rawPhone);
    }
    setPharmAddress(pharmacy.address || '');
    setPharmCity(pharmacy.city || 'Tunis');
    setPharmLat(pharmacy.latitude !== null && pharmacy.latitude !== undefined ? pharmacy.latitude.toString() : '');
    setPharmLng(pharmacy.longitude !== null && pharmacy.longitude !== undefined ? pharmacy.longitude.toString() : '');
    setPharmWeekdays(pharmacy.hoursWeekdays || '08:00 - 22:00');
    setPharmSaturday(pharmacy.hoursSaturday || '08:00 - 20:00');
    setPharmSunday(pharmacy.hoursSunday || 'Closed');
    setPharmIsOpen(pharmacy.isOpen);
    setPharmDeliveryFee(pharmacy.deliveryFee !== undefined ? pharmacy.deliveryFee.toString() : '7.00');
    setShowInfoModal(true);
  };

  const handleLocatePharmacy = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPharmLat(pos.coords.latitude.toString());
          setPharmLng(pos.coords.longitude.toString());
          toast.success('Pharmacy GPS coordinates acquired!');
        },
        () => {
          toast.error('Unable to retrieve location. Please check browser permissions.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = pharmLat ? parseFloat(pharmLat) : null;
    const lng = pharmLng ? parseFloat(pharmLng) : null;

    let resolvedAddress = pharmAddress;
    if (lat && lng) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await res.json();
        if (data?.address) {
          const a = data.address;
          const parts = [
            a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
            a.suburb || a.neighbourhood || a.quarter,
            a.city || a.town || a.village || a.county
          ].filter(Boolean);
          resolvedAddress = parts.length > 0 ? parts.join(', ') : (data.display_name || pharmAddress);
        }
      } catch (err) {
        console.warn('Reverse geocoding failed, keeping previous address.', err);
      }
    }

    const feeNum = parseFloat(pharmDeliveryFee);
    updateProfileMutation.mutate({
      name: pharmName,
      phone: pharmPhone.trim() ? `${pharmPhoneCountry}${pharmPhone.trim()}` : '',
      address: resolvedAddress,
      city: pharmCity,
      latitude: lat,
      longitude: lng,
      hoursWeekdays: pharmWeekdays,
      hoursSaturday: pharmSaturday,
      hoursSunday: pharmSunday,
      isOpen: pharmIsOpen,
      deliveryFee: isNaN(feeNum) ? 7.00 : feeNum,
      avatar: pharmAvatar
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim() || !medPrice.trim()) {
      toast.error('Name and Price are required.');
      return;
    }
    const priceNum = parseFloat(medPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Please enter a valid price.');
      return;
    }

    if (editingMedicine) {
      updateMutation.mutate({
        id: editingMedicine.id,
        data: { name: medName, price: priceNum, status: medStatus, description: medDesc, requireUpload: medRequireUpload }
      });
    } else {
      addMutation.mutate({
        name: medName,
        price: priceNum,
        status: medStatus,
        description: medDesc,
        requireUpload: medRequireUpload
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 font-semibold">
        Loading Pharmacy Profile...
      </div>
    );
  }

  if (error || !pharmacy) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-rose-500 font-bold">
        Pharmacy Profile not found or access denied.
      </div>
    );
  }

  const profileName = pharmacy.user?.name || 'Pharmacy';
  const profilePhone = formatPhoneDisplay(pharmacy.phone);
  const profileAddress = pharmacy.address || 'Tunis, Tunisia';
  const lat = pharmacy.latitude || 36.8065;
  const lng = pharmacy.longitude || 10.1815;
  const currentAvatarUrl = getPharmAvatar(pharmacy, api.defaults.baseURL);

  const medsList = pharmacy.medicines || [];
  const filteredMedicines = medsList.filter((m: any) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      {/* Header Panel */}
      {/* Header Panel */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-start justify-between relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-8 items-start flex-grow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="relative group shrink-0">
            <img 
              src={currentAvatarUrl} 
              alt="Pharmacy Avatar" 
              className="w-20 h-20 rounded-2xl object-cover shadow-inner border border-slate-100"
            />
            {isOwner && (
              <button 
                onClick={handlePhotoClick}
                className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-black transition-all gap-1"
              >
                <Camera size={14} /> Update Photo
              </button>
            )}
          </div>
          <div className="flex-grow space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${pharmacy.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {pharmacy.isOpen ? 'Open Now' : 'Closed'}
              </span>

            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{profileName}</h1>
            <div className="flex flex-wrap gap-4 text-slate-500 text-xs font-bold items-center">
              {isOwner ? (
                <button 
                  onClick={openInfoModal} 
                  className="text-emerald-650 hover:text-emerald-700 hover:underline text-sm font-black bg-transparent border-none p-0 cursor-pointer"
                >
                  Edit Profile
                </button>
              ) : (
                <p className="flex items-center gap-1.5"><MapPin size={16} className="text-slate-400" /> {profileAddress}</p>
              )}
              <p className="flex items-center gap-1.5"><Phone size={16} className="text-slate-400" /> {profilePhone}</p>
            </div>
          </div>
        </div>
        {isOwner && (
          <Link
            to="/dashboard/pharmacy/settings"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm shrink-0"
          >
            Settings
          </Link>
        )}
      </div>

      {isOwner && (
        <div className="flex gap-4 border-b border-slate-200 pb-2">
          <button
            onClick={() => setPharmacyTab('catalog')}
            className={`pb-2 px-4 font-bold text-sm border-b-2 transition-all ${
              pharmacyTab === 'catalog'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Medicine Catalog
          </button>
          <button
            onClick={() => setPharmacyTab('orders')}
            className={`pb-2 px-4 font-bold text-sm border-b-2 transition-all ${
              pharmacyTab === 'orders'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Client Orders ({pharmacyOrders.length})
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Catalog or Orders */}
        <div className="lg:col-span-2 space-y-6">
          {isOwner && pharmacyTab === 'orders' ? (
            /* Pharmacy Client Orders List */
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Client Orders</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage medicine orders placed by patients.</p>
              </div>

              <div className="space-y-4">
                {isLoadingOrders ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Loading orders...</div>
                ) : pharmacyOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm italic">No client orders found.</div>
                ) : (
                  pharmacyOrders.map((order: any) => (
                    <div key={order.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Order ID: {order.id.slice(0, 8)}...</p>
                          <h4 className="font-extrabold text-slate-800 text-sm mt-1">Patient: {order.patient?.name || 'Unknown'}</h4>
                          <p className="text-xs text-slate-500 font-medium">Contact: {order.patient?.phone || order.patient?.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                            order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                            order.status === 'PAID' ? 'bg-blue-50 text-blue-700' :
                            order.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs font-semibold text-slate-600">
                            <span>{item.medicine?.name} x {item.quantity}</span>
                            <span className="text-slate-800">{Number(item.price).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}</span>
                          </div>
                        ))}

                        {order.deliveryMethod === 'DELIVERY' && (
                          <div className="flex justify-between text-xs font-semibold text-amber-700">
                            <span>Delivery Fee</span>
                            <span>+{Number(order.deliveryFee).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-xs font-extrabold text-slate-800 border-t border-slate-50 pt-2">
                          <span className="flex flex-col gap-0.5">
                            <span>Total</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Fulfillment: {order.deliveryMethod === 'DELIVERY' ? 'Delivery' : 'Store Pickup'}
                            </span>
                          </span>
                          <span className="text-emerald-650 font-black">{Number(order.totalPrice).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}</span>
                        </div>

                        {order.deliveryMethod === 'DELIVERY' && order.deliveryAddress && (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 font-medium space-y-1">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 block uppercase mb-0.5">Delivery Address</span>
                              {order.deliveryAddress}
                            </div>
                            {order.deliveryPhone && (
                              <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase mb-0.5">Contact Phone</span>
                                <span className="font-bold text-slate-700">{order.deliveryPhone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Prescription info if any */}
                      {order.prescriptionUrl && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5">
                          <FileText size={16} className="text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-amber-800 uppercase block">Prescription Uploaded</span>
                            <a
                              href={order.prescriptionUrl.startsWith('http') ? order.prescriptionUrl : `${api.defaults.baseURL}${order.prescriptionUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold underline break-all block"
                            >
                              View uploaded prescription document/image
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {order.status === 'PAID' && (
                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'COMPLETED' })}
                            disabled={updateOrderStatusMutation.isPending}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                          >
                            Mark Completed
                          </button>
                          <button
                            onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'CANCELLED' })}
                            disabled={updateOrderStatusMutation.isPending}
                            className="px-4 py-2 border border-rose-100 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl transition-all"
                          >
                            Cancel Order
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Left Medicine Catalog */
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Medicine Catalog</h2>
                  <p className="text-xs text-slate-500 mt-0.5">List of medications available in stock.</p>
                </div>
                {isOwner && (
                  <button
                    onClick={openAddModal}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md shadow-emerald-500/20"
                  >
                    <Plus size={16} /> Add Medication
                  </button>
                )}
              </div>

              <div className="relative">
                <Search size={20} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search medication stock..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-3">
                {filteredMedicines.map((med: any) => (
                  <div 
                    key={med.id} 
                    onClick={() => isOwner && openEditModal(med)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50/50 hover:border-slate-200/80 transition-all gap-4 ${isOwner ? 'cursor-pointer' : ''}`}
                  >
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        {med.name}
                        {med.status === 'PRESCRIPTION_REQUIRED' && (
                          <span className="text-[9px] font-bold bg-amber-55 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                            Prescription Required
                          </span>
                        )}
                      </h3>
                      {med.description && <p className="text-xs text-slate-500 font-medium">{med.description}</p>}
                      <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                        {med.price.toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        med.status === 'AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : med.status === 'OUT_OF_STOCK'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {med.status === 'AVAILABLE' ? 'In Stock' : med.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'With Order'}
                      </span>
                      {!isOwner && med.status !== 'OUT_OF_STOCK' && currentUser && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(med);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                        >
                          <ShoppingCart size={12} /> Add to Cart
                        </button>
                      )}
                      {isOwner && (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openEditModal(med)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this medicine from your inventory?')) {
                                deleteMutation.mutate(med.id);
                              }
                            }}
                            className="p-2 border border-rose-100 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredMedicines.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <FileText size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">No medications found</p>
                    <p className="text-xs mt-0.5">Try searching for something else or add new stock.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Info Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="text-emerald-600" size={20} /> Opening Hours
            </h2>
            <div className="space-y-3 text-xs font-bold text-slate-500">
              <div className="flex justify-between border-b border-slate-50 pb-2"><span>Monday - Friday</span> <span className="text-slate-800">{pharmacy.hoursWeekdays || '08:00 - 22:00'}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-2"><span>Saturday</span> <span className="text-slate-800">{pharmacy.hoursSaturday || '08:00 - 20:00'}</span></div>
              <div className="flex justify-between"><span>Sunday</span> <span className={`${pharmacy.hoursSunday === 'Closed' || !pharmacy.hoursSunday ? 'text-rose-600 bg-rose-50' : 'text-slate-800'} px-2 py-0.5 rounded`}>{pharmacy.hoursSunday || 'Closed'}</span></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="text-emerald-600" size={20} /> Pharmacy Location
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{profileAddress}</p>
            <div className="h-60 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
              <MapContainer
                center={[lat, lng]}
                zoom={14}
                className="h-full w-full absolute inset-0 z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Marker position={[lat, lng]}>
                  <Popup>
                    <div className="font-extrabold text-xs">{profileName}</div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Pharmacy Info & Hours & Coordinates Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowInfoModal(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Edit Profile</h3>
                <p className="text-xs text-emerald-100 mt-0.5">Manage details of your pharmacy profile, hours, and coordinates</p>
              </div>
              <button onClick={() => setShowInfoModal(false)} className="text-white/70 hover:text-white transition-colors p-1.5 bg-white/10 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInfo} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <img 
                  src={currentAvatarUrl} 
                  alt="Avatar Preview" 
                  className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100"
                />
                <div>
                  <button 
                    type="button"
                    onClick={handlePhotoClick}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all shadow-sm"
                  >
                    Upload New Photo
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1">Accepts PNG, JPG or GIF up to 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Pharmacy Name</label>
                  <input
                    type="text"
                    required
                    value={pharmName}
                    onChange={e => setPharmName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Phone Number</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 bg-slate-55">
                    <select
                      value={pharmPhoneCountry}
                      onChange={e => setPharmPhoneCountry(e.target.value)}
                      className="bg-slate-100 border-r border-slate-200 px-2 py-2.5 text-sm font-bold outline-none shrink-0 cursor-pointer text-slate-700"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.dial + c.name} value={c.dial}>
                          {c.flag} {c.dial}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={pharmPhone}
                      onChange={e => setPharmPhone(e.target.value)}
                      placeholder="12 345 678"
                      className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm font-semibold min-w-0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Fulfillment Delivery Fee</label>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 bg-slate-50">
                  <span className="bg-slate-100 border-r border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 shrink-0">
                    {getCurrencyByPhone(`${pharmPhoneCountry}${pharmPhone}`).symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="7.00"
                    value={pharmDeliveryFee}
                    onChange={e => setPharmDeliveryFee(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm font-semibold min-w-0 text-slate-700"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Resolved Currency: <span className="font-bold text-slate-600">{getCurrencyByPhone(`${pharmPhoneCountry}${pharmPhone}`).name} ({getCurrencyByPhone(`${pharmPhoneCountry}${pharmPhone}`).code})</span> based on phone prefix.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-700 font-semibold">
                📍 Address will be automatically resolved from your pinned location on save.
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase">GPS Helper</span>
                <button
                  type="button"
                  onClick={handleLocatePharmacy}
                  className="text-xs font-black text-emerald-700 hover:text-emerald-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Navigation2 size={12} className="rotate-45 text-emerald-600" /> Pin Current GPS
                </button>
              </div>

              <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                <MapContainer
                  center={[parseFloat(pharmLat) || 36.8065, parseFloat(pharmLng) || 10.1815]}
                  zoom={13}
                  className="h-full w-full absolute inset-0 z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <LocationMarker
                    position={pharmLat && pharmLng ? [parseFloat(pharmLat), parseFloat(pharmLng)] : null}
                    setPosition={(pos) => {
                      setPharmLat(pos[0].toString());
                      setPharmLng(pos[1].toString());
                    }}
                  />
                </MapContainer>
              </div>
              <p className="text-[9px] text-slate-400 font-medium">Or click on the map to pin your pharmacy location manually.</p>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Opening Hours</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mon - Fri</label>
                    <input
                      type="text"
                      placeholder="08:00 - 22:00"
                      value={pharmWeekdays}
                      onChange={e => setPharmWeekdays(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Saturday</label>
                    <input
                      type="text"
                      placeholder="08:00 - 20:00"
                      value={pharmSaturday}
                      onChange={e => setPharmSaturday(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sunday</label>
                    <input
                      type="text"
                      placeholder="Closed"
                      value={pharmSunday}
                      onChange={e => setPharmSunday(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={pharmIsOpen}
                    onChange={e => setPharmIsOpen(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Currently Open / Active</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm uppercase tracking-wider mt-2"
              >
                <Check size={16} />
                {updateProfileMutation.isPending ? 'Saving Settings...' : 'Save Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Add Medicine Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{editingMedicine ? 'Modify Medication' : 'Add Medication'}</h3>
                <p className="text-xs text-emerald-100 mt-0.5">Manage details of medication stock</p>
              </div>
              <button onClick={closeModal} className="text-white/70 hover:text-white transition-colors p-1.5 bg-white/10 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doliprane 1000mg"
                  value={medName}
                  onChange={e => setMedName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-655 uppercase tracking-wider mb-1">Price</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 bg-slate-50">
                    <span className="bg-slate-100 border-r border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 shrink-0">
                      {getCurrencyByPhone(pharmacy?.phone).symbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="4.50"
                      value={medPrice}
                      onChange={e => setMedPrice(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm font-semibold min-w-0 text-slate-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-655 uppercase tracking-wider mb-1">Availability Status</label>
                  <select
                    value={medStatus}
                    onChange={e => setMedStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-semibold"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                    <option value="PRESCRIPTION_REQUIRED">With Order</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-655 uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Dosage details or storage instructions..."
                  value={medDesc}
                  onChange={e => setMedDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-semibold resize-none"
                />
              </div>

              {medStatus === 'PRESCRIPTION_REQUIRED' && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <input
                      type="checkbox"
                      checked={medRequireUpload}
                      onChange={e => setMedRequireUpload(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Requires Prescription Upload (Certificate)</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm uppercase tracking-wider mt-2"
              >
                <Check size={16} />
                {addMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Cart Trigger */}
      {!isOwner && cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-24 right-6 z-[999] bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-2xl transition-all flex items-center gap-2 hover:scale-105"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <span className="font-extrabold text-sm uppercase tracking-wider hidden sm:inline">View Cart</span>
        </button>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex justify-end" onClick={() => setIsCartOpen(false)}>
          <div
            className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} />
                <h3 className="text-lg font-bold">Your Shopping Cart</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-white/70 hover:text-white transition-colors p-1.5 bg-white/10 rounded-xl">
                <X size={18} />
              </button>
            </div>

            {/* Cart Items list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400 font-semibold space-y-2">
                  <ShoppingCart size={48} className="mx-auto opacity-20" />
                  <p>Your cart is empty</p>
                  <p className="text-xs text-slate-400 font-normal">Add medicines from the catalog to get started.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {cart.map(item => (
                      <div key={item.id} className="py-4 flex justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                            {item.name}
                            {item.status === 'PRESCRIPTION_REQUIRED' && (
                              <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                Prescription Required
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">{item.price.toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol} each</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button onClick={() => updateCartQty(item.id, -1)} className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black">-</button>
                            <span className="px-3 text-xs font-bold text-slate-700">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.id, 1)} className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black">+</button>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800 min-w-[60px] text-right">
                            {(item.price * item.quantity).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {cartRequiresPrescription && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
                      <div className="flex gap-2">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                        <div>
                          <h5 className="text-xs font-extrabold text-amber-800 uppercase">Prescription Upload Required</h5>
                          <p className="text-[11px] text-amber-700 font-semibold mt-0.5 leading-relaxed">
                            This order contains regulated prescription-only medication. You must upload a doctor's prescription to complete this purchase.
                          </p>
                        </div>
                      </div>

                      <div 
                        onClick={triggerPrescriptionCapture}
                        className="border-2 border-dashed border-amber-200 hover:border-amber-300 rounded-xl p-3 bg-white text-center cursor-pointer transition-colors relative"
                      >
                        {!(window as any).Capacitor && (
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handlePrescriptionUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        )}
                        {prescriptionFile ? (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-bold">
                            <Check size={16} /> {prescriptionName.slice(0, 20)}...
                          </div>
                        ) : (
                          <div className="text-slate-500 space-y-1">
                            <FileText size={18} className="mx-auto text-slate-400" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Select Prescription File</p>
                            <p className="text-[9px] text-slate-400 font-semibold">PDF or Image up to 5MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-100 space-y-4 shrink-0 bg-slate-50">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-xs font-bold uppercase tracking-wider">Subtotal</span>
                  <span className="text-xl font-black text-slate-900">{cartTotal.toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}</span>
                </div>
                <button
                  onClick={() => {
                    if (cartRequiresPrescription && !prescriptionFile) {
                      toast.error('Please upload your prescription first!');
                      return;
                    }
                    setIsCartOpen(false);
                    setCheckoutStep('review');
                    setShowCheckout(true);
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-wider text-center"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout and Payment Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowCheckout(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{checkoutStep === 'review' ? '1. Review Order Summary' : '2. Secure Payment'}</h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  {checkoutStep === 'review' 
                    ? 'Verify your items and select pickup/delivery options' 
                    : 'Your transaction is encrypted and secured'
                  }
                </p>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-white/70 hover:text-white transition-colors p-1.5 bg-white/10 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-5">
              {checkoutStep === 'review' ? (
                /* Step 1: Review Order & Fulfillment options */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Items in Order</span>
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                      {cart.map(item => (
                        <div key={item.id} className="py-2 flex justify-between text-xs font-semibold text-slate-700">
                          <span className="truncate max-w-[250px]">{item.name} <span className="text-slate-400 font-bold">x {item.quantity}</span></span>
                          <span className="font-extrabold text-slate-800">{(item.price * item.quantity).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Options */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Fulfillment</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('PICKUP')}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
                          deliveryMethod === 'PICKUP'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-450 hover:text-emerald-600'
                        }`}
                      >
                        Store Pickup (Free)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('DELIVERY')}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
                          deliveryMethod === 'DELIVERY'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-450 hover:text-emerald-600'
                        }`}
                      >
                        Delivery (+{(pharmacy?.deliveryFee ?? 7.00).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol})
                      </button>
                    </div>

                    {deliveryMethod === 'DELIVERY' && (
                      <div className="space-y-3 pt-1.5 border-t border-slate-200">
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Delivery Address</label>
                          <input
                            type="text"
                            required
                            placeholder="Street address, city, apartment"
                            value={deliveryAddress}
                            onChange={e => setDeliveryAddress(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Contact Phone Number</label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +216 12 345 678"
                            value={deliveryPhone}
                            onChange={e => setDeliveryPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total display */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-slate-800 font-extrabold">{cartTotal.toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}</span>
                    </div>
                    {deliveryMethod === 'DELIVERY' && (
                      <div className="flex justify-between text-amber-700">
                        <span>Delivery Fee</span>
                        <span className="font-extrabold">+{((pharmacy?.deliveryFee) ?? 7.00).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-slate-800">
                      <span className="font-bold uppercase tracking-wider">Total Amount</span>
                      <span className="text-lg font-black text-emerald-600">
                        {(cartTotal + (deliveryMethod === 'DELIVERY' ? (pharmacy?.deliveryFee ?? 7.00) : 0.00)).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (deliveryMethod === 'DELIVERY') {
                        if (!deliveryAddress.trim()) {
                          toast.error('Please input a valid delivery address');
                          return;
                        }
                        if (!deliveryPhone.trim()) {
                          toast.error('Please input a contact phone number');
                          return;
                        }
                      }
                      setCheckoutStep('payment');
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                  >
                    Proceed to Secure Payment
                  </button>
                </div>
              ) : (
                /* Step 2: Payment Details Form */
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('review')}
                    className="text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1"
                  >
                    ← Back to Order Summary
                  </button>

                  {/* Animated Credit Card Mockup */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg space-y-6 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full pointer-events-none"></div>
                    <div className="flex justify-between items-start">
                      <CreditCard size={32} className="text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MedFinder Pay</span>
                    </div>
                    <div className="space-y-4">
                      <div className="font-mono text-lg tracking-widest text-slate-100">
                        {cardNumber ? cardNumber.replace(/(.{4})/g, '$1 ') : '•••• •••• •••• ••••'}
                      </div>
                      <div className="flex justify-between text-xs font-mono text-slate-300">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider block text-slate-400">Card Holder</span>
                          <span className="font-bold">{cardName || 'YOUR FULL NAME'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase tracking-wider block text-slate-400">Expires</span>
                          <span className="font-bold">{cardExpiry || 'MM/YY'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Card Holder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={cardName}
                        onChange={e => setCardName(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Card Number</label>
                      <input
                        type="text"
                        required
                        placeholder="1234 5678 1234 5678"
                        maxLength={16}
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold text-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiration Date</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={e => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) val = `${val.slice(0,2)}/${val.slice(2,4)}`;
                            setCardExpiry(val);
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CVC / CVV</label>
                        <input
                          type="password"
                          required
                          placeholder="123"
                          maxLength={3}
                          value={cardCvc}
                          onChange={e => setCardCvc(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security Badge */}
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-800 font-semibold shadow-inner">
                    <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-extrabold uppercase tracking-wider text-[9px] text-emerald-700">🔒 256-Bit SSL Encrypted Connection</p>
                      <p className="text-[10px] text-slate-500 font-medium">Your card details are fully encrypted and never stored on our servers.</p>
                    </div>
                  </div>

                  {/* Total display summary */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-bold uppercase tracking-wider">Total Payment Amount</span>
                      <span className="text-lg font-black text-emerald-600">
                        {(cartTotal + (deliveryMethod === 'DELIVERY' ? (pharmacy?.deliveryFee ?? 7.00) : 0.00)).toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPlacingOrder}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                  >
                    {isPlacingOrder ? 'Processing Payment...' : `Confirm & Pay ${(cartTotal + (deliveryMethod === 'DELIVERY' ? (pharmacy?.deliveryFee ?? 7.00) : 0.00)).toFixed(2)} ${getCurrencyByPhone(pharmacy?.phone).symbol}`}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Order Success Overlay */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <Check size={36} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Your order at {profileName} has been successfully paid and placed.
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs font-semibold text-slate-650 space-y-1">
              <div className="flex justify-between"><span>Order Number:</span> <span className="font-extrabold text-slate-800">{orderSuccess.id.slice(0, 8).toUpperCase()}</span></div>
              <div className="flex justify-between"><span>Total Price:</span> <span className="font-extrabold text-slate-800">{orderSuccess.totalPrice.toFixed(2)} {getCurrencyByPhone(pharmacy?.phone).symbol}</span></div>
              <div className="flex justify-between"><span>Status:</span> <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">{orderSuccess.status}</span></div>
              <div className="flex justify-between"><span>Fulfillment:</span> <span className="font-bold text-slate-800">{orderSuccess.deliveryMethod === 'DELIVERY' ? 'Delivery' : 'Store Pickup'}</span></div>
              {orderSuccess.deliveryMethod === 'DELIVERY' && (
                <div className="border-t border-slate-200 mt-1.5 pt-1.5 text-[11px] space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Shipping Address</span>
                  <span className="font-bold text-slate-700">{orderSuccess.deliveryAddress}</span>
                  {orderSuccess.deliveryPhone && (
                    <>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mt-1">Contact Phone</span>
                      <span className="font-bold text-slate-700">{orderSuccess.deliveryPhone}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setOrderSuccess(null);
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider text-center"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
