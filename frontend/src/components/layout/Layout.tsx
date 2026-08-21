import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AiSymptomChecker from '../AiSymptomChecker';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <main className="flex-grow pt-16">
        <Outlet />
      </main>
      <AiSymptomChecker />
      <Footer />
    </div>
  );
}
