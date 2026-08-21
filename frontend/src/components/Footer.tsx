// src/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Premium footer with glassmorphism, dark‑mode aware and quick navigation links.
 */
const Footer: React.FC = () => {
  return (
    <footer className="glass py-6 mt-12 container text-center">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          © {new Date().getFullYear()} MedFinder. All rights reserved.
        </div>
        <div className="flex gap-4">
          <Link to="/about" className="hover-lift text-sm">About</Link>
          <Link to="/contact" className="hover-lift text-sm">Contact</Link>
          <Link to="/privacy" className="hover-lift text-sm">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
