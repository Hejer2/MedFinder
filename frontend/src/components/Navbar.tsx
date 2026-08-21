// src/components/Navbar.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, Menu, X, User } from 'lucide-react';
import LogoutConfirmModal from './LogoutConfirmModal';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    setShowLogoutModal(false);
    navigate('/');
  };

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  const navLinks = [
    { name: 'Find Doctors', path: '/search' },
    { name: 'Specialties', path: '/specialties' },
    { name: 'About', path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl leading-none">M</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              MedFinder
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary-600 dark:hover:text-primary-400 ${
                    isActive(link.path) 
                      ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-700 pl-6">
              <button onClick={toggleTheme} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors" aria-label="Toggle theme">
                {dark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <Link 
                    to={`/dashboard/${user?.role?.toLowerCase()}`}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <span className="hidden lg:block">{user?.name?.split(' ')[0]}</span>
                  </Link>
                  <button onClick={handleLogoutClick} className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors">
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 transition-colors">
                    Log in
                  </Link>
                  <Link to="/register" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/20">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            <button onClick={toggleTheme} className="text-slate-500 dark:text-slate-400">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-6 space-y-4 shadow-lg absolute w-full">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-base font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 py-2"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            {isAuthenticated ? (
              <div className="space-y-4">
                <Link 
                  to={`/dashboard/${user?.role?.toLowerCase()}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-slate-700 dark:text-slate-200 font-medium"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                    <User size={20} />
                  </div>
                  {user?.name}
                </Link>
                <button 
                  onClick={handleLogoutClick} 
                  className="w-full text-left text-red-600 font-medium py-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link 
                  to="/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-slate-700 dark:text-slate-200 font-medium border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-primary-600 text-white font-medium rounded-lg"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </nav>
  );
};

export default Navbar;
