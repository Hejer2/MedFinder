import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stethoscope, User, Menu, X, LogOut, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoutConfirmModal from '../LogoutConfirmModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <nav className="fixed w-full z-50 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary-500 p-2 rounded-lg text-white">
              <Stethoscope size={24} />
            </div>
            <span className="font-bold text-xl text-dark tracking-tight">MedFinder</span>
          </Link>
          <div className="hidden md:flex space-x-8">
            <Link to="/map" className="text-slate-600 hover:text-primary-600 font-medium transition-colors flex items-center gap-1"><MapPin size={18}/> Interactive Map</Link>
            <Link to="/about" className="text-slate-600 hover:text-primary-600 font-medium transition-colors">About Us</Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <Link 
                  to={
                    user.role === 'DOCTOR' 
                      ? '/dashboard/doctor' 
                      : user.role === 'PHARMACY' 
                      ? '/pharmacy/me' 
                      : '/dashboard/patient'
                  } 
                  className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
                >
                  {
                    user.role === 'DOCTOR' 
                      ? 'Doctor Dashboard' 
                      : user.role === 'PHARMACY' 
                      ? 'Pharmacy Inventory' 
                      : 'Patient Dashboard'
                  }
                </Link>


                <div className="text-slate-600 text-sm font-medium px-2 border-l border-slate-205">
                  {user.name}
                </div>
                <button onClick={() => setShowLogoutModal(true)} className="text-slate-500 hover:text-red-500 transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            ) : !isAuthPage ? (
              <div className="hidden md:flex items-center gap-4">
                <Link to="/login" className="text-slate-600 font-medium hover:text-primary-600 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/20">
                  <User size={18} />
                  Sign Up
                </Link>
              </div>
            ) : null}
            
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden text-slate-650 focus:outline-none"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-6 space-y-4 shadow-lg absolute w-full left-0 top-16 z-50">
          <Link 
            to="/map" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-700 hover:text-primary-650 py-2"
          >
            Interactive Map
          </Link>
          <Link 
            to="/about" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-700 hover:text-primary-650 py-2"
          >
            About Us
          </Link>
          <div className="pt-4 border-t border-slate-100">
            {user ? (
              <div className="space-y-4">
                <div className="text-slate-600 text-sm font-medium px-2 py-1 bg-slate-50 rounded-lg">
                  Logged in as: <span className="font-bold text-slate-800">{user.name}</span>
                </div>
                <Link 
                  to={
                    user.role === 'DOCTOR' 
                      ? '/dashboard/doctor' 
                      : user.role === 'PHARMACY' 
                      ? '/pharmacy/me' 
                      : '/dashboard/patient'
                  } 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center py-2.5 bg-primary-50 text-primary-700 font-bold rounded-xl"
                >
                  {
                    user.role === 'DOCTOR' 
                      ? 'Doctor Dashboard' 
                      : user.role === 'PHARMACY' 
                      ? 'Pharmacy Inventory' 
                      : 'Patient Dashboard'
                  }
                </Link>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full text-left text-red-600 font-bold py-2 px-2 flex items-center gap-2"
                >
                  <LogOut size={18} /> Log out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link 
                  to="/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-slate-700 font-medium border border-slate-200 rounded-xl"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-md shadow-primary-500/20"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          logout();
          setShowLogoutModal(false);
        }}
      />
    </nav>
  );
}
