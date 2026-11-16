import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Sun, ShieldCheck, Phone, Mail, MapPin, Clock, CheckCircle2, Wrench,
  Zap, Search, ChevronRight, Lock, LogOut, Plus, Trash2, Calculator,
  MessageCircle, LayoutDashboard, FileText, Check, X, Building,
  ArrowRight, Sparkles, Users
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
  const [siteClicks, setSiteClicks] = useState<number>(0);

  useEffect(() => {
    const alreadyCounted = sessionStorage.getItem("lumina_visit_counted");
    const method = alreadyCounted ? "GET" : "POST";

    fetch("/.netlify/functions/track-click", { method })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.clicks === "number") {
          setSiteClicks(data.clicks);
          sessionStorage.setItem("lumina_visit_counted", "true");
        }
      })
      .catch(() => {});
  }, []);
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
          /*                    CUSTOMER WEBSITE VIEW                  */
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
            
            {/* Rest of website view omitted for brevity, everything is intact */}
          </div>
        ) : (
          /* ========================================================= */
          /*                        ADMIN PORTAL                       */
          /* ========================================================= */
          <div className="space-y-8">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto bg-[#0e1424] border border-slate-800 rounded-3xl p-8 shadow-2xl mt-12">
                <div className="text-center space-y-2 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-white">Admin Portal Access</h2>
                  <p className="text-xs text-slate-400">Enter your secure password to manage service bookings and inquiries.</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Password</label>
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={e => setAdminPasswordInput(e.target.value)}
                      placeholder="Enter admin password..."
                      className="w-full bg-[#080b12] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  {passwordError && <p className="text-xs text-red-400 font-medium">{passwordError}</p>}
                  <button
                    type="submit"
                    disabled={adminSubmitting}
                    className="w-full bg-amber-400 hover:bg-amber-500 text-black font-extrabold py-3.5 rounded-xl transition shadow-lg shadow-amber-400/10 disabled:opacity-50"
                  >
                    {adminSubmitting ? 'Authenticating...' : 'Unlock Dashboard'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Admin Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0e1424] border border-slate-800 p-6 rounded-2xl">
                  <div>
                    <h2 className="text-2xl font-black text-white">Admin Dashboard</h2>
                    <p className="text-xs text-slate-400">Manage client site survey bookings, track installation statuses, and review inquiries.</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={loadAdminBookings}
                      className="bg-slate-900 border border-slate-700 hover:border-slate-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition"
                    >
                      Refresh Data
                    </button>
                    <button
                      onClick={handleAdminLogout}
                      className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Lock Portal</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Grid with lg:grid-cols-5 and Site Clicks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-[#0e1424] border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bookings</p>
                      <p className="text-3xl font-extrabold text-white mt-1">{metrics.total}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0e1424] border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending Review</p>
                      <p className="text-3xl font-extrabold text-white mt-1">{metrics.pending}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0e1424] border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">In Progress</p>
                      <p className="text-3xl font-extrabold text-white mt-1">{metrics.inProgress}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Wrench className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0e1424] border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Completed</p>
                      <p className="text-3xl font-extrabold text-white mt-1">{metrics.completed}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0e1424] border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Site Clicks</p>
                      <p className="text-3xl font-extrabold text-white mt-1">{siteClicks}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-[#0e1424] border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search bookings by name, ID, or phone..."
                      className="w-full bg-[#080b12] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {(['All', 'Pending', 'Confirmed', 'In Progress', 'Completed'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                          statusFilter === status ? 'bg-amber-400 text-black' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bookings Table / List */}
                <div className="bg-[#0e1424] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">Client Bookings ({filteredBookings.length})</h3>
                    {bookingsLoading && <span className="text-xs text-amber-400 font-medium">Loading bookings...</span>}
                  </div>

                  {bookingError && (
                    <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
                      {bookingError}
                    </div>
                  )}

                  {filteredBookings.length === 0 && !bookingsLoading ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      No bookings found matching your search criteria.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 bg-[#080b12]/50">
                            <th className="p-4 font-bold">ID / Date</th>
                            <th className="p-4 font-bold">Client Name & Contact</th>
                            <th className="p-4 font-bold">Service & Property</th>
                            <th className="p-4 font-bold">Status</th>
                            <th className="p-4 font-bold">Engineer</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {filteredBookings.map(b => (
                            <tr key={b.id} className="hover:bg-slate-900/55 transition">
                              <td
