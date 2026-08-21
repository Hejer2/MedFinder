export default function Footer() {
  return (
    <footer className="bg-dark text-slate-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="font-bold text-xl text-white tracking-tight">MedFinder</span>
          </div>
          <p className="text-sm text-slate-400">
            Find the best doctors in Tunisia and book appointments online easily.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-white mb-4">Patients</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-primary-400 transition-colors">Search Doctors</a></li>
            <li><a href="#" className="hover:text-primary-400 transition-colors">How it works</a></li>
            <li><a href="#" className="hover:text-primary-400 transition-colors">Help Center</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-white mb-4">Doctors</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-primary-400 transition-colors">Join MedFinder</a></li>
            <li><a href="#" className="hover:text-primary-400 transition-colors">Pricing</a></li>
            <li><a href="#" className="hover:text-primary-400 transition-colors">Provider Dashboard</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-white mb-4">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-primary-400 transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-primary-400 transition-colors">Contact Us</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-700 text-sm text-center text-slate-400">
        &copy; {new Date().getFullYear()} MedFinder. All rights reserved.
      </div>
    </footer>
  );
}
