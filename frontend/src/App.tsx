import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './routes/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import { AuthProvider } from './context/AuthContext';

// Lazy load page components for optimal bundle splitting
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const PatientSettings = lazy(() => import('./pages/PatientSettings'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const DoctorSettings = lazy(() => import('./pages/DoctorSettings'));
const DoctorAvailabilityPage = lazy(() => import('./pages/DoctorAvailabilityPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Specialties = lazy(() => import('./pages/Specialties'));
const About = lazy(() => import('./pages/About'));
const MapPage = lazy(() => import('./pages/MapPage'));
const PharmacyProfile = lazy(() => import('./pages/PharmacyProfile'));
const PharmacySettings = lazy(() => import('./pages/PharmacySettings'));
const Contact = lazy(() => import('./pages/Contact'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PatientProfile = lazy(() => import('./pages/PatientProfile'));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
    <span className="text-sm text-gray-500 font-medium">Loading MedFinder...</span>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="search" element={<Search />} />
                <Route path="map" element={<MapPage />} />
                <Route path="specialties" element={<Specialties />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="doctor/:id" element={<DoctorProfile />} />
                <Route path="pharmacy/:id" element={<PharmacyProfile />} />
                <Route path="patient/:id" element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'ADMIN']}><PatientProfile /></ProtectedRoute>} />
                <Route path="dashboard/patient" element={<ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}><PatientDashboard /></ProtectedRoute>} />
                <Route path="dashboard/patient/settings" element={<ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}><PatientSettings /></ProtectedRoute>} />
                <Route path="dashboard/doctor" element={<ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}><DoctorDashboard /></ProtectedRoute>} />
                <Route path="dashboard/doctor/settings" element={<ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}><DoctorSettings /></ProtectedRoute>} />
                <Route path="dashboard/doctor/availability" element={<ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}><DoctorAvailabilityPage /></ProtectedRoute>} />
                <Route path="dashboard/pharmacy/settings" element={<ProtectedRoute allowedRoles={['PHARMACY', 'ADMIN']}><PharmacySettings /></ProtectedRoute>} />
                <Route path="dashboard/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password/:token" element={<ResetPassword />} />
                <Route path="verify-email/:token" element={<VerifyEmail />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
