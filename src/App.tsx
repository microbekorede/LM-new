import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Sun, ShieldCheck, Phone, Mail, MapPin, Clock, CheckCircle2, Wrench,
  Zap, Search, ChevronRight, Lock, LogOut, Plus, Trash2, Calculator,
  MessageCircle, LayoutDashboard, FileText, Check, X, Building,
  ArrowRight, Sparkles
} from 'lucide-react';

// --- SERVICE & GALLERY IMAGE ASSETS ---
const IMAGES = {
  solar: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=800&q=80",
  inverter: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=800&q=80",
  audit: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
  wiring: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
};

const SERVICE_OPTIONS = [
  { id: "solar", title: "Solar System Installation", desc: "Complete hybrid or off-grid rooftop solar installations with lithium storage.", image: IMAGES.solar, badge: "Popular" },
  { id: "audit", title: "Energy Audit & Site Survey", desc: "Comprehensive power load evaluation, voltage testing & sizing analysis.", image: IMAGES.audit, badge: "Recommended" },
  { id: "maintenance", title: "Inverter Maintenance & Upgrade", desc: "Battery bank upgrades, inverter servicing & panel cleaning.", image: IMAGES.inverter, badge: "Fast Response" },
  { id: "wiring", title: "House Wiring & Earthing", desc: "Electrical installation, surge protection & earthing systems.", image: IMAGES.wiring, badge: "Safety Focused" }
];

type BookingStatus = 'Pending' | 'Confirmed' | 'In Progress' | 'Completed';
type Booking = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  propertyType: string;
  estimatedLoad: string;
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;
  assignedEngineer: string;
  notes: string;
  image?: string;
};
type Appliance = { id: string; name: string; watts: number; count: number };
type BookingForm = Omit<Booking, 'id' | 'status' | 'assignedEngineer' | 'image'>;
type ContactForm = { name: string; phone: string; email: string; message: string };
type ContactMessage = { id: string; name: string; phone: string; email: string; message: string; createdAt: string };

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const rawBody = response.status === 204 ? '' : await response.text();
  let payload: any = null;
  if (rawBody) { try { payload = JSON.parse(rawBody); } catch { payload = { message: rawBody.slice(0, 300) }; } }
  if (!response.ok) {
    const message = payload && typeof payload.message === 'string' ? payload.message : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

function getTodayLocalDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizeNigerianPhone(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, '');
  if (/^0[789][01]\d{8}$/.test(digits)) return digits;
  if (/^234[789][01]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^\+234[789][01]\d{8}$/.test(digits)) return digits;
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Booking data is loaded from the authenticated API; never seed production metrics with demo records.
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [contactForm, setContactForm] = useState<ContactForm>({ name: '', phone: '', email: '', message: '' });

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BookingStatus>('All');

  const [bookingStep, setBookingStep] = useState(1);
  const [formData, setFormData] = useState<BookingForm>({
    serviceType: SERVICE_OPTIONS[0].title,
    propertyType: 'Residential Duplex',
    estimatedLoad: 'Medium (1-2 ACs, Fridge, TV, Lights - 5kVA - 7.5kVA)',
    customerName: '', phone: '', email: '', address: '', preferredDate: '',
    preferredTime: 'Morning (9:00 AM - 12:00 PM)', notes: ''
  });
  const [lastSubmittedBooking, setLastSubmittedBooking] = useState<Booking | null>(null);

  const [calcAppliances, setCalcAppliances] = useState<Appliance[]>([
    { id: '1', name: 'LED Bulbs', watts: 10, count: 10 },
    { id: '2', name: 'Standing / Ceiling Fans', watts: 75, count: 4 },
    { id: '3', name: 'Smart LED TV', watts: 150, count: 2 },
    { id: '4', name: 'Deep freezer', watts: 300, count: 3 },
    { id: '5', name: '1 HP AC', watts: 746, count: 1 }
  ]);
  const [customName, setCustomName] = useState('');
  const [customWatts, setCustomWatts] = useState('');
  const [customQty, setCustomQty] = useState('1');

  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(''), 4000);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const loadAdminBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingError('');
    try {
      const result = await apiRequest<{ bookings: Booking[] }>('/api/bookings');
      setBookings(Array.isArray(result.bookings) ? result.bookings : []);
      try {
        const inbox = await apiRequest<{ messages: ContactMessage[] }>('/api/contact');
        setContactMessages(Array.isArray(inbox.messages) ? inbox.messages : []);
      } catch (error) {
        showToast(error instanceof Error ? `Bookings loaded, but inquiries could not be loaded: ${error.message}` : 'Bookings loaded, but inquiries could not be loaded.');
      }
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Unable to load bookings.');
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  // Restore an existing server session after a refresh; the server remains the
  // authority and all admin API routes independently enforce authorization.
  useEffect(() => {
    let cancelled = false;
    apiRequest<{ authenticated: boolean }>('/api/admin/session')
      .then(async result => {
        if (!cancelled && result.authenticated) {
          setIsAdminAuthenticated(true);
          await loadAdminBookings();
        }
      })
      .catch(() => { /* A 401 simply means there is no active admin session. */ });
    return () => { cancelled = true; };
  }, [loadAdminBookings]);

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminSubmitting(true);
    setPasswordError('');
    try {
      await apiRequest('/api/admin/session', { method: 'POST', body: JSON.stringify({ password: adminPasswordInput }) });
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
      await loadAdminBookings();
      showToast('Admin portal unlocked');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Login failed. Check your credentials.');
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    let serverLogoutSucceeded = false;
    try {
      await apiRequest('/api/admin/session', { method: 'DELETE' });
      serverLogoutSucceeded = true;
    } catch (error) {
      // Clear the local UI even if the network is unavailable. The server must
      // still expire the session cookie and enforce authorization on every API.
      showToast(error instanceof Error ? `Local session closed; server logout could not be verified: ${error.message}` : 'Local session closed; server logout could not be verified.');
    }
    setIsAdminAuthenticated(false);
    setSelectedBooking(null);
    setAdminPasswordInput('');
    setPasswordError('');
    setBookings([]);
    setContactMessages([]);
    setActiveTab('customer');
    if (serverLogoutSucceeded) showToast('Logged out of Admin Portal');
  };

  const handleCustomerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (bookingSubmitting) return;
    const customerName = formData.customerName.trim();
    const address = formData.address.trim();
    const phone = normalizeNigerianPhone(formData.phone);
    if (!customerName || !address || !phone || !formData.preferredDate) {
      showToast('Enter a valid name, Nigerian phone number, address and visit date.');
      return;
    }
    if (formData.preferredDate < getTodayLocalDate()) {
      showToast('Please choose today or a future date.');
      return;
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      showToast('Please enter a valid email address or leave it blank.');
      return;
    }
    setBookingSubmitting(true);
    try {
      const payload = { ...formData, customerName, address, phone, email: formData.email.trim(), notes: formData.notes.trim() };
      const result = await apiRequest<{ booking: Booking }>('/api/bookings', { method: 'POST', body: JSON.stringify(payload) });
      if (!result?.booking?.id) throw new Error('The server did not return a booking reference. Please contact us before retrying.');
      setLastSubmittedBooking(result.booking);
      setBookingStep(3);
      showToast(`Booking request ${result.booking.id} received.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Booking could not be submitted. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleResetCustomerForm = () => {
    setBookingStep(1);
    setFormData({ serviceType: SERVICE_OPTIONS[0].title, propertyType: 'Residential Duplex', estimatedLoad: 'Medium (1-2 ACs, Fridge, TV, Lights - 5kVA - 7.5kVA)', customerName: '', phone: '', email: '', address: '', preferredDate: '', preferredTime: 'Morning (9:00 AM - 12:00 PM)', notes: '' });
    setLastSubmittedBooking(null);
  };

  const handleAddCustomAppliance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = customName.trim();
    const watts = Number(customWatts);
    const quantity = Number(customQty);
    if (!name || !Number.isFinite(watts) || watts <= 0 || watts > 100000 || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      showToast('Enter a name, watts between 1 and 100,000, and a whole-number quantity from 1 to 1,000.');
      return;
    }
    const newItem: Appliance = { id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, watts, count: quantity };
    setCalcAppliances(prev => [...prev, newItem]);
    setCustomName(''); setCustomWatts(''); setCustomQty('1');
    showToast(`Added ${newItem.name} to load list`);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCalcAppliances(prev => prev.map(app => app.id === id ? { ...app, count: Math.min(1000, Math.max(0, app.count + delta)) } : app));
  };
  const handleRemoveAppliance = (id: string) => setCalcAppliances(prev => prev.filter(a => a.id !== id));

  const calculatedTotalWatts = useMemo(() => calcAppliances.reduce((acc, curr) => acc + curr.watts * curr.count, 0), [calcAppliances]);
  const recommendedInverter = useMemo(() => {
    const watts = calculatedTotalWatts;
    if (watts <= 0) return 'Add appliances to calculate an indicative load';
    const recommendedVA = Math.ceil((watts / 0.8) * 1.25 / 500) * 500;
    if (recommendedVA <= 3500) return `Indicative inverter capacity: ${Math.max(3, recommendedVA / 1000).toFixed(1)}kVA (verify surge and battery voltage)`;
    if (recommendedVA <= 7000) return `Indicative inverter capacity: ${Math.ceil(recommendedVA / 1000)}kVA (verify phase and surge requirements)`;
    if (recommendedVA <= 15000) return `Indicative inverter capacity: ${Math.ceil(recommendedVA / 1000)}kVA (professional system design required)`;
    return `Indicative capacity: ${(recommendedVA / 1000).toFixed(1)}kVA+ (professional commercial design required)`;
  }, [calculatedTotalWatts]);

  const handleQuickStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      const result = await apiRequest<{ booking: Booking }>(`/api/bookings/${encodeURIComponent(bookingId)}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      const updatedBooking = result.booking;
      setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      setSelectedBooking(current => current?.id === bookingId ? updatedBooking : current);
      showToast(`Status updated to ${newStatus}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update booking status.');
    }
  };

  const handleEngineerChange = async (bookingId: string, assignedEngineer: string) => {
    try {
      const result = await apiRequest<{ booking: Booking }>(`/api/bookings/${encodeURIComponent(bookingId)}`, { method: 'PATCH', body: JSON.stringify({ assignedEngineer }) });
      setBookings(prev => prev.map(b => b.id === bookingId ? result.booking : b));
      setSelectedBooking(current => current?.id === bookingId ? result.booking : current);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not save engineer assignment.'); }
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (contactSubmitting) return;
    const normalizedPhone = normalizeNigerianPhone(contactForm.phone);
    const payload = { ...contactForm, name: contactForm.name.trim(), phone: normalizedPhone ?? '', email: contactForm.email.trim(), message: contactForm.message.trim() };
    if (!payload.name || !normalizedPhone || !payload.message || payload.message.length > 5000 || payload.name.length > 100) {
      showToast('Enter your name, a valid Nigerian phone number and a message (maximum 5,000 characters).'); return;
    }
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { showToast('Enter a valid email address or leave it blank.'); return; }
    setContactSubmitting(true);
    try {
      await apiRequest('/api/contact', { method: 'POST', body: JSON.stringify(payload) });
      setContactForm({ name: '', phone: '', email: '', message: '' });
      showToast('Your inquiry has been received.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Message could not be sent. Please try again.'); }
    finally { setContactSubmitting(false); }
  };

  const metrics = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'Pending').length,
    inProgress: bookings.filter(b => b.status === 'In Progress' || b.status === 'Confirmed').length,
    completed: bookings.filter(b => b.status === 'Completed').length
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bookings.filter(b => {
      const matchesSearch = !query || [b.customerName, b.id, b.address, b.phone].some(value => String(value ?? '').toLowerCase().includes(query));
      return matchesSearch && (statusFilter === 'All' || b.status === statusFilter);
    });
  }, [bookings, searchQuery, statusFilter]);

  const scrollToSection = (id: string) => {
    setActiveTab('customer');
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 font-sans selection:bg-amber-400 selection:text-black">
      
      {/* --- BRAND HEADER & NAVIGATION --- */}
      <header className="sticky top-0 z-40 bg-[#0d121f]/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <button type="button" aria-label="Lumina Power System home" className="flex items-center space-x-3.5 text-left" onClick={() => scrollToSection('hero')}>
            <div className="relative group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-[#080b12] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-400 fill-current" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#080b12]" title="Online" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl md:text-2xl tracking-tight text-white">LUMINA</span>
                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 font-bold tracking-widest">
                  POWER SYSTEM
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Solar Engineering & Electrical Services • Abuja</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-300">
            <button onClick={() => scrollToSection('about')} className="hover:text-amber-400 transition">About</button>
            <button onClick={() => scrollToSection('why-us')} className="hover:text-amber-400 transition">Why Choose Us</button>
            <button onClick={() => scrollToSection('calculator')} className="hover:text-amber-400 transition">Solar Calculator</button>
            <button onClick={() => scrollToSection('services')} className="hover:text-amber-400 transition">Services & Booking</button>
            <button onClick={() => scrollToSection('contact')} className="hover:text-amber-400 transition">Contact</button>
          </nav>

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('customer')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'customer' ? 'bg-amber-400 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Website View
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'admin' ? 'bg-amber-400 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>Admin Portal</span>
                {metrics.pending > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    {metrics.pending}
                  </span>
                )}
              </button>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <LayoutDashboard className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 flex flex-col space-y-2 pb-2">
            <button onClick={() => scrollToSection('about')} className="text-left py-2 px-3 rounded hover:bg-slate-900 text-sm font-medium">About Us</button>
            <button onClick={() => scrollToSection('why-us')} className="text-left py-2 px-3 rounded hover:bg-slate-900 text-sm font-medium">Why Choose Us</button>
            <button onClick={() => scrollToSection('calculator')} className="text-left py-2 px-3 rounded hover:bg-slate-900 text-sm font-medium">Solar Calculator</button>
            <button onClick={() => scrollToSection('services')} className="text-left py-2 px-3 rounded hover:bg-slate-900 text-sm font-medium">Book Site Survey</button>
            <button onClick={() => scrollToSection('contact')} className="text-left py-2 px-3 rounded hover:bg-slate-900 text-sm font-medium">Contact Us</button>
            <div className="pt-2 border-t border-slate-800 flex justify-between gap-2">
              <button 
                onClick={() => { setActiveTab('customer'); setMobileMenuOpen(false); }}
                className={`flex-1 py-2 rounded text-xs font-bold ${activeTab === 'customer' ? 'bg-amber-400 text-black' : 'bg-slate-900 text-slate-300'}`}
              >
                Website View
              </button>
              <button 
                onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                className={`flex-1 py-2 rounded text-xs font-bold ${activeTab === 'admin' ? 'bg-amber-400 text-black' : 'bg-slate-900 text-slate-300'}`}
              >
                Admin Portal ({metrics.pending})
              </button>
            </div>
          </div>
        )}
      </header>

      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-20 right-5 z-50 bg-slate-900 border border-amber-400/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* --- FLOATING WHATSAPP BUTTON --- */}
      <a
        href="https://wa.me/2349063297214?text=Hello%20Lumina%20Power%20System,%20I%20have%20an%20inquiry%20regarding%20solar%20installation."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        title="Optional WhatsApp inquiry" aria-label="Optional WhatsApp inquiry"
      >
        <MessageCircle className="w-7 h-7 fill-white" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-bold text-sm ml-0 group-hover:ml-2">
          Chat Us
        </span>
      </a>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        
        {activeTab === 'customer' ? (
          /* ========================================================= */
          /*                 CUSTOMER WEBSITE VIEW                     */
          /* ========================================================= */
          <div className="space-y-16 lg:space-y-24">
            
            {/* HERO SECTION */}
            <section id="hero" className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-[#0e1424] via-[#080b12] to-[#0a101d] p-6 md:p-12 lg:p-16 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold tracking-wide">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Abuja's Premier Solar & Electrical Engineers</span>
                  </div>

                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                    Reliable Power, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">Uninterrupted Energy</span>
                  </h1>

                  <p className="text-slate-300 text-base md:text-lg max-w-xl">
                    Engineering high-performance solar power systems, lithium battery arrays, and certified electrical wiring for homes and commercial facilities across Abuja.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                    <button
                      onClick={() => scrollToSection('services')}
                      className="flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold px-6 py-3.5 rounded-xl hover:brightness-110 transition shadow-lg shadow-amber-500/20"
                    >
                      <span>Book a Site Survey</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => scrollToSection('calculator')}
                      className="flex items-center justify-center space-x-2 bg-slate-900 border border-slate-700 hover:border-slate-500 text-white font-bold px-6 py-3.5 rounded-xl transition"
                    >
                      <Calculator className="w-4 h-4 text-amber-400" />
                      <span>Solar Load Calculator</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 text-xs md:text-sm">
                    <div>
                      <span className="block font-black text-2xl text-white">Abuja</span>
                      <span className="text-slate-400">Service Coverage</span>
                    </div>
                    <div>
                      <span className="block font-black text-2xl text-amber-400">Safe</span>
                      <span className="text-slate-400">Safety-led design</span>
                    </div>
                    <div>
                      <span className="block font-black text-2xl text-white">Abuja</span>
                      <span className="text-slate-400">Local service focus</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 relative">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl group">
                    <img 
                      src={IMAGES.solar} 
                      alt="Solar panel installation" fetchPriority="high" width="800" height="600" decoding="async"
                      className="w-full h-[360px] object-cover group-hover:scale-105 transition duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080b12] via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Abuja, Nigeria</span>
                      </div>
                      <p className="text-xs text-slate-300">10kVA Hybrid Solar System with LiFePO4 Lithium Storage</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ABOUT US SECTION */}
            <section id="about" className="bg-[#0e1424] border border-slate-800 rounded-3xl p-8 lg:p-12 shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                    <Building className="w-3.5 h-3.5" />
                    <span>About Lumina Power System</span>
                  </div>

                  <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                    Powering Abuja Homes & Businesses with Engineering Excellence
                  </h2>

                  <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                    Lumina Power System is a renewable energy and electrical engineering practice headquartered in Abuja. We eliminate grid instability through custom hybrid solar designs, high-capacity lithium storage, and comprehensive load audits.
                  </p>

                  <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                    Our team focuses on safe electrical practices and practical system design. From initial site surveys to rooftop mounting and scheduled battery maintenance, we work to deliver dependable energy solutions.
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 mt-1">
                        <Check className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Tier-1 Components</h4>
                        <p className="text-xs text-slate-400">Grade-A panels & pure sine wave inverters.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 mt-1">
                        <Check className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Full Abuja Coverage</h4>
                        <p className="text-xs text-slate-400">Maitama, Asokoro, Gwarinpa, CBD & environs.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <img src={IMAGES.inverter} alt="Inverter" loading="lazy" decoding="async" className="rounded-2xl h-48 w-full object-cover border border-slate-700 shadow-lg" />
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                      <span className="block text-2xl font-black text-amber-400">24/7</span>
                      <span className="text-xs text-slate-400">Technical Support</span>
                    </div>
                  </div>
                  <div className="space-y-4 pt-6">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                      <span className="block text-2xl font-black text-white">Local</span>
                      <span className="text-xs text-slate-400">First Priority</span>
                    </div>
                    <img src={IMAGES.audit} alt="Audit" loading="lazy" decoding="async" className="rounded-2xl h-48 w-full object-cover border border-slate-700 shadow-lg" />
                  </div>
                </div>
              </div>
            </section>

            {/* WHY CHOOSE US SECTION */}
            <section id="why-us" className="space-y-8">
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-xs font-bold tracking-widest uppercase text-amber-400 px-3 py-1 rounded bg-amber-400/10 border border-amber-400/20">
                  Our Engineering Standards
                </span>
                <h2 className="text-3xl lg:text-4xl font-black text-white mt-3 mb-2">
                  Why Clients Choose Lumina Power System
                </h2>
                <p className="text-slate-400 text-sm">
                  We combine technical expertise with quality hardware to build long-lasting power setups.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-amber-400/50 transition group">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Certified Electrical Engineers</h3>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                    Our field teams ensure safe earthing, proper breaker configuration, and balanced load distribution.
                  </p>
                </div>

                <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-amber-400/50 transition group">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Accurate Load Sizing</h3>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                    We calculate surge currents and continuous load needs before recommending inverter or battery bank sizes.
                  </p>
                </div>

                <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-amber-400/50 transition group">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Dedicated Site Audits</h3>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                    Every installation is backed by scheduled site evaluations, health diagnostics, and ongoing technical support.
                  </p>
                </div>
              </div>
            </section>

            {/* SOLAR & INVERTER CALCULATOR SECTION */}
            <section id="calculator" className="bg-gradient-to-br from-[#0e1424] to-[#080b12] border border-slate-800 rounded-3xl p-6 lg:p-10 shadow-2xl">
              <div className="max-w-3xl mx-auto text-center mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 px-3 py-1 rounded bg-amber-400/10 border border-amber-400/30">
                  Interactive Load Sizing Tool
                </span>
                <h2 className="text-3xl font-black text-white mt-3 mb-2">
                  Solar & Inverter Load Calculator
                </h2>
                <p className="text-slate-400 text-sm">
                  Select appliances or add your own items to estimate connected load. This is an initial guide, not a final engineering design.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Appliance List & Custom Entry */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Custom Appliance Form Input */}
                  <form onSubmit={handleAddCustomAppliance} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Custom Appliance
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Appliance Name (e.g. Microwave)"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Rating (Watts)"
                        value={customWatts}
                        onChange={(e) => setCustomWatts(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={customQty}
                          onChange={(e) => setCustomQty(e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white text-center outline-none"
                        />
                        <button
                          type="submit"
                          className="flex-1 bg-amber-400 hover:bg-amber-500 text-black font-bold text-xs rounded-xl py-2 transition-all"
                        >
                          Add Item
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Appliance List */}
                  <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-2">Appliance List</h3>
                    
                    {calcAppliances.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div>
                          <span className="font-bold text-white text-sm block">{item.name}</span>
                          <span className="text-[11px] text-slate-400">{item.watts}W per unit</span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id, -1)}
                              className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs transition"
                            >
                              -
                            </button>
                            <span className="font-bold text-amber-400 text-xs w-6 text-center">{item.count}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id, 1)}
                              className="w-7 h-7 rounded-md bg-amber-400 hover:bg-amber-500 text-black font-bold flex items-center justify-center text-xs transition"
                            >
                              +
                            </button>
                          </div>

                          <span className="text-xs font-bold text-white w-16 text-right">
                            {item.watts * item.count} W
                          </span>

                          <button 
                            type="button" 
                            onClick={() => handleRemoveAppliance(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Calculation Summary Sidebar */}
                <div className="lg:col-span-5 bg-[#080b12] border border-amber-400/40 p-6 rounded-2xl shadow-xl sticky top-24 space-y-6">
                  <h3 className="font-bold text-white text-lg flex items-center space-x-2">
                    <Zap className="text-amber-400 w-5 h-5" />
                    <span>Sizing Analysis Result</span>
                  </h3>

                  <div className="space-y-4 text-sm">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Total Estimated Load</span>
                      <span className="text-3xl font-black text-white">{calculatedTotalWatts.toLocaleString()} Watts</span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Recommended Inverter System</span>
                      <span className="text-base font-extrabold text-amber-400">{recommendedInverter}</span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Battery Storage Guidance</span>
                      <span className="text-sm font-bold text-white">
                        {calculatedTotalWatts === 0 ? 'Add appliances for an indicative estimate' : 'Battery capacity cannot be sized from watts alone. Runtime, usable depth of discharge, inverter efficiency and battery voltage must be specified.'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-400">Indicative only: the estimate does not account for appliance starting surge, power factor, duty cycle, cable losses, phase balancing, battery chemistry or site conditions. Have a qualified installer verify the design.</p>
                  <button
                    onClick={() => scrollToSection('services')}
                    className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold py-3.5 rounded-xl hover:brightness-110 transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
                  >
                    <span>Book Site Survey for this Sizing</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </section>

            {/* CUSTOMER BOOKING PORTAL SECTION */}
            <section id="services" className="space-y-8">
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-xs font-bold tracking-widest uppercase text-amber-400 px-3 py-1 rounded bg-amber-400/10 border border-amber-400/30">
                  Online Booking System
                </span>
                <h2 className="text-3xl lg:text-4xl font-black text-white mt-3 mb-2">
                  Schedule Your Site Visit or Survey
                </h2>
                <p className="text-slate-400 text-sm">
                  Select your service and submit your details. We will return a reference number when the booking is successfully saved.
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${bookingStep >= 1 ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-500'}`}>1</div>
                  <span className={`text-sm font-medium ${bookingStep >= 1 ? 'text-white' : 'text-slate-500'}`}>Service Details</span>
                  <div className="w-8 md:w-12 h-0.5 bg-slate-800" />
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${bookingStep >= 2 ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-500'}`}>2</div>
                  <span className={`text-sm font-medium ${bookingStep >= 2 ? 'text-white' : 'text-slate-500'}`}>Contact & Location</span>
                  <div className="w-8 md:w-12 h-0.5 bg-slate-800" />
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${bookingStep >= 3 ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-500'}`}>3</div>
                  <span className={`text-sm font-medium ${bookingStep >= 3 ? 'text-white' : 'text-slate-500'}`}>Confirmation</span>
                </div>
              </div>

              {/* STEP 1: SERVICE SELECTION */}
              {bookingStep === 1 && (
                <div className="bg-[#0e1424] border border-slate-800 rounded-3xl p-6 lg:p-10 shadow-2xl max-w-4xl mx-auto">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Sun className="text-amber-400 w-5 h-5" /> Select Electrical / Solar Service
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {SERVICE_OPTIONS.map((srv) => (
                      <button
                        type="button"
                        key={srv.id}
                        aria-pressed={formData.serviceType === srv.title}
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: srv.title }))}
                        className={`relative overflow-hidden rounded-2xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          formData.serviceType === srv.title
                            ? 'border-amber-400 bg-amber-400/10 shadow-lg ring-1 ring-amber-400'
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="h-32 w-full relative overflow-hidden bg-slate-800">
                          <img src={srv.image} alt={srv.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1424] via-transparent to-black/30" />
                          <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-black/70 text-amber-400 border border-amber-400/30">
                            {srv.badge}
                          </span>
                          <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border flex items-center justify-center ${
                            formData.serviceType === srv.title ? 'border-amber-400 bg-amber-400' : 'border-white/50 bg-black/40'
                          }`}>
                            {formData.serviceType === srv.title && <Check className="w-4 h-4 text-black stroke-[3]" />}
                          </div>
                        </div>

                        <div className="p-4">
                          <h4 className="font-bold text-white text-base mb-1">{srv.title}</h4>
                          <p className="text-xs text-slate-400">{srv.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Property Type</label>
                      <select
                        value={formData.propertyType}
                        onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option>Residential Duplex</option>
                        <option>Residential Villa</option>
                        <option>Commercial Office</option>
                        <option>Healthcare Facility</option>
                        <option>Hotel / Guest House</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Estimated Power Requirement / Load</label>
                      <select
                        value={formData.estimatedLoad}
                        onChange={(e) => setFormData({ ...formData, estimatedLoad: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option>Basic (Lights, TV, Fans, Fridge - 2.5kVA - 3.5kVA)</option>
                        <option>Medium (1-2 ACs, Fridge, TV, Lights - 5kVA - 7.5kVA)</option>
                        <option>High (3+ ACs, Deep Freezers, Full House - 10kVA - 15kVA)</option>
                        <option>Heavy Commercial / Industrial (20kVA+)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      className="flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold px-6 py-3.5 rounded-xl hover:brightness-110 transition shadow-lg shadow-amber-500/20"
                    >
                      <span>Next: Contact & Location</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CONTACT & LOCATION FORM (EMAIL OPTIONAL) */}
              {bookingStep === 2 && (
                <form onSubmit={handleCustomerSubmit} className="bg-[#0e1424] border border-slate-800 rounded-3xl p-6 lg:p-10 shadow-2xl max-w-4xl mx-auto">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <MapPin className="text-amber-400 w-5 h-5" /> Site Address & Contact Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chief Emeka Okafor"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="08031234567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-slate-300">Email Address</label>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Optional</span>
                      </div>
                      <input
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        placeholder="e.g. name@domain.com (Leave empty if none)"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Preferred Site Visit Date *</label>
                      <input
                        type="date"
                        required
                        min={getTodayLocalDate()}
                        value={formData.preferredDate}
                        onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Full Address in Abuja / Environs *</label>
                    <input
                      type="text"
                      required
                      maxLength={240}
                      placeholder="Plot number, Street name, District (e.g. Maitama, Gwarinpa, Asokoro, Wuse)"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Preferred Time Window</label>
                      <select
                        value={formData.preferredTime}
                        onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option>Morning (9:00 AM - 12:00 PM)</option>
                        <option>Afternoon (1:00 PM - 4:00 PM)</option>
                        <option>Evening (4:00 PM - 6:00 PM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Technical Equipment Notes (Optional)</label>
                      <input
                        type="text"
                        maxLength={500}
                        placeholder="e.g. Need lithium battery upgrade, south-facing roof"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold px-6 py-3.5 rounded-xl hover:brightness-110 transition shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-5 h-5 text-black" />
                      <span>{bookingSubmitting ? 'Submitting…' : 'Submit & Request Site Survey'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: CONFIRMATION DISPLAY */}
              {bookingStep === 3 && lastSubmittedBooking && (
                <div className="bg-[#0e1424] border border-amber-400/40 rounded-3xl p-6 lg:p-10 shadow-2xl text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-amber-400/20 border border-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                    Booking Request Received
                  </h3>
                  <p className="text-slate-400 text-sm mb-6">
                    Thank you, <strong className="text-white">{lastSubmittedBooking.customerName}</strong>. Your request has been received. Our team will review it and contact you to confirm the appointment. The requested date is not confirmed until we contact you.
                  </p>

                  <div className="inline-block bg-slate-900 border border-slate-700 px-6 py-3 rounded-xl mb-8">
                    <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Booking Reference ID</span>
                    <span className="text-2xl font-black text-amber-400 tracking-widest">{lastSubmittedBooking.id}</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 text-left mb-8 space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Selected Service:</span>
                      <span className="font-semibold text-white">{lastSubmittedBooking.serviceType}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Scheduled Date & Time:</span>
                      <span className="font-semibold text-white">{lastSubmittedBooking.preferredDate} ({lastSubmittedBooking.preferredTime})</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Site Location:</span>
                      <span className="font-semibold text-white text-right max-w-[240px]">{lastSubmittedBooking.address}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Email Address:</span>
                      <span className="font-semibold text-white">{lastSubmittedBooking.email || "Not Provided (Optional)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Status:</span>
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3" />
                        <span>{lastSubmittedBooking.status}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={handleResetCustomerForm}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-medium text-sm transition"
                    >
                      Submit Another Booking
                    </button>

                  </div>
                </div>
              )}
            </section>

            {/* CONTACT US SECTION */}
            <section id="contact" className="bg-[#0e1424] border border-slate-800 rounded-3xl p-8 lg:p-12 shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-5 space-y-6">
                  <span className="text-xs font-bold tracking-widest uppercase text-amber-400 px-3 py-1 rounded bg-amber-400/10 border border-amber-400/30">
                    Get In Touch
                  </span>
                  <h2 className="text-3xl font-black text-white">
                    Contact Lumina Power System
                  </h2>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Have inquiries regarding solar inverter capacity, battery health tests, or custom wiring projects? Reach out to our engineers directly.
                  </p>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center space-x-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Direct Telephone / WhatsApp</span>
                        <a href="tel:09063297214" className="font-bold text-white text-base hover:text-amber-400">09063297214</a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Official Support Email</span>
                        <a href="mailto:microbekorede@gmail.com" className="font-bold text-white text-base hover:text-amber-400">microbekorede@gmail.com</a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Service Area</span>
                        <span className="font-bold text-white text-sm">Abuja and surrounding areas</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Send a Technical Inquiry</h3>
                    <p className="text-slate-400 text-xs mb-6">Leave a message and our team will contact you using the details provided.</p>

                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Your Name</label>
                          <input type="text" required value={contactForm.name} onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full Name" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                          <input type="tel" required value={contactForm.phone} onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="09063297214" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Email Address (Optional)</label>
                        <input type="email" value={contactForm.email} onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))} placeholder="microbekorede@gmail.com" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400" />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Message Details</label>
                        <textarea rows={4} required value={contactForm.message} onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))} placeholder="Describe your power system requirements..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400" />
                      </div>

                      <button type="submit" disabled={contactSubmitting} className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold py-3 rounded-xl hover:brightness-110 transition shadow-lg shadow-amber-500/20 disabled:opacity-60">
                        {contactSubmitting ? 'Sending…' : 'Send Message'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </section>

          </div>
        ) : (
          /* ========================================================= */
          /*            PASSWORD-PROTECTED ADMIN PORTAL                */
          /* ========================================================= */
          <div>
            {!isAdminAuthenticated ? (
              /* ADMIN PASSWORD LOGIN SCREEN */
              <div className="max-w-md mx-auto my-12 bg-[#0e1424] border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="w-12 h-12 bg-amber-400/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-400/30">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold text-white text-center">Admin Portal Login</h3>
                <p className="text-xs text-slate-400 text-center mt-1 mb-6">Sign in using your server-managed administrator credentials.</p>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Admin Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-sm"
                    />
                    {passwordError && (
                      <p role="alert" className="text-xs text-rose-400 mt-2 font-semibold">{passwordError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={adminSubmitting}
                    className="w-full bg-amber-400 hover:bg-amber-500 text-black font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 disabled:opacity-60"
                  >
                    {adminSubmitting ? 'Signing in…' : 'Unlock Dashboard'}
                  </button>
                </form>
              </div>
            ) : (
              /* ACTIVE ADMIN DASHBOARD */
              <div className="space-y-6">
                
                {/* Admin Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0e1424] p-6 rounded-2xl border border-slate-800">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                      <LayoutDashboard className="w-6 h-6 text-amber-400" /> Technical Booking Queue
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Manage incoming site surveys and assign engineers.</p>
                  </div>

                  <button
                    onClick={handleAdminLogout}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Total Bookings</p>
                      <h3 className="text-2xl font-black text-white mt-1">{metrics.total}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 border border-slate-800">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Pending Visits</p>
                      <h3 className="text-2xl font-black text-amber-400 mt-1">{metrics.pending}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">In Progress</p>
                      <h3 className="text-2xl font-black text-blue-400 mt-1">{metrics.inProgress}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Wrench className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Completed</p>
                      <h3 className="text-2xl font-black text-emerald-400 mt-1">{metrics.completed}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {bookingError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{bookingError} <button onClick={loadAdminBookings} className="underline font-bold ml-2">Retry</button></div>}
                {bookingsLoading && <p className="text-sm text-slate-400" role="status">Loading bookings…</p>}

                {/* Filters */}
                <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search name, ID, or district..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {['All', 'Pending', 'Confirmed', 'In Progress', 'Completed'].map((status) => (
                      <button
                        type="button"
                        key={status}
                        onClick={() => setStatusFilter(status as 'All' | BookingStatus)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          statusFilter === status
                            ? 'bg-amber-400 text-black shadow-md'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="bg-[#0e1424] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm">
                      <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="py-4 px-4">Ref ID / Client</th>
                          <th className="py-4 px-4">Service</th>
                          <th className="py-4 px-4">Visit Date</th>
                          <th className="py-4 px-4">Engineer</th>
                          <th className="py-4 px-4">Status</th>
                          <th className="py-4 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredBookings.length === 0 ? (
                          <tr>
                           <td colSpan={6} className="py-8 text-center text-slate-500">No booking records found matching filter.</td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-900/50 transition">
                              <td className="py-4 px-4">
                                <span className="font-extrabold text-amber-400 block text-xs tracking-wider">{b.id}</span>
                                <span className="font-bold text-white block text-sm">{b.customerName}</span>
                                <span className="text-slate-400 text-xs">{b.phone}</span>
                              </td>
                              <td className="py-4 px-4 text-slate-300">{b.serviceType}</td>
                              <td className="py-4 px-4 text-slate-300">
                                <span className="font-semibold block">{b.preferredDate}</span>
                                <span className="text-slate-400 text-xs">{b.preferredTime}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-xs bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 text-slate-300 font-medium">
                                  {b.assignedEngineer}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  b.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                                  b.status === 'Confirmed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                                  b.status === 'In Progress' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={() => setSelectedBooking(b)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                                >
                                  Manage
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <section className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">Customer Inquiries</h3>
                      <p className="text-xs text-slate-400">Messages submitted through the website contact form.</p>
                    </div>
                    <span className="text-xs font-bold text-amber-400">{contactMessages.length} saved</span>
                  </div>
                  {contactMessages.length === 0 ? (
                    <p className="text-sm text-slate-500">No contact inquiries have been received yet.</p>
                  ) : contactMessages.map(message => (
                    <article key={message.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <h4 className="font-bold text-white">{message.name}</h4>
                        <time className="text-[11px] text-slate-500" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
                      </div>
                      <p className="text-xs text-slate-300">{message.phone}{message.email ? ` · ${message.email}` : ''}</p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{message.message}</p>
                    </article>
                  ))}
                </section>

              </div>
            )}
          </div>
        )}

      </main>

      {/* ADMIN EDIT / MANAGEMENT DRAWER */}
      {isAdminAuthenticated && activeTab === 'admin' && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#0e1424] border-l border-slate-800 h-full p-6 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div>
                  <span className="text-xs text-amber-400 font-bold tracking-widest">{selectedBooking.id}</span>
                  <h3 className="text-xl font-bold text-white">Booking Details</h3>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <p><strong className="text-white">Customer Name:</strong> {selectedBooking.customerName}</p>
                  <p><strong className="text-white">Phone:</strong> {selectedBooking.phone}</p>
                  <p><strong className="text-white">Email Address:</strong> {selectedBooking.email || "None Provided (Optional)"}</p>
                  <p><strong className="text-white">Site Address:</strong> {selectedBooking.address}</p>
                  <p><strong className="text-white">Property Type:</strong> {selectedBooking.propertyType}</p>
                  <p><strong className="text-white">Scheduled Date:</strong> {selectedBooking.preferredDate} ({selectedBooking.preferredTime})</p>
                  <p><strong className="text-white">Notes:</strong> {selectedBooking.notes || "None"}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Assign Field Engineer</label>
                  <input
                    type="text"
                    value={selectedBooking.assignedEngineer ?? ''}
                    maxLength={100}
                    onChange={(e) => setSelectedBooking(current => current ? { ...current, assignedEngineer: e.target.value } : current)}
                    onBlur={(e) => handleEngineerChange(selectedBooking.id, e.currentTarget.value.trim())}
                    placeholder="e.g. Engr. Korede"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Update Operational Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Pending', 'Confirmed', 'In Progress', 'Completed'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleQuickStatusChange(selectedBooking.id, st)}
                        className={`py-2 px-3 rounded-lg font-bold text-xs border transition ${
                          selectedBooking.status === st ? 'bg-amber-400 text-black border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs transition mt-6"
            >
              Close Details Drawer
            </button>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 bg-[#0d121f] mt-20 py-10 px-4 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="font-black text-white text-sm">LUMINA POWER SYSTEM</span>
          </div>

          <p className="text-center md:text-left">
            Phone: <strong className="text-white">09063297214</strong> | Email: <strong className="text-white">microbekorede@gmail.com</strong> | Abuja, FCT
          </p>

          <p>© 2026 Lumina Power System. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}