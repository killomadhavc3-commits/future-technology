import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BedDouble, CarFront, Eye, EyeOff, Hotel, Menu, Sparkles, Utensils, Waves, Wifi, X } from 'lucide-react';
import api, { getErrorMessage } from './api';
import { useAuth } from './AuthContext';

const formatMoney = (value) => `$${Number(value || 0).toFixed(0)} / night`;
const formatDate = (value) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
const roomVisuals = {
  Single: {
    exterior: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
    interior: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85',
    accent: '#c68b5b',
  },
  Double: {
    exterior: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85',
    interior: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
    accent: '#7b9a91',
  },
  Suite: {
    exterior: 'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=1200&q=85',
    interior: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85',
    accent: '#b77a58',
  },
};

const getRoomVisuals = (room) => roomVisuals[room.type] || roomVisuals.Double;
const resortImage = 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=2000&q=90';
const resortFacilities = [
  { title: 'Fast Wi-Fi', detail: 'Stay connected, wherever you settle in.', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=85', icon: Wifi },
  { title: 'Infinity pool', detail: 'Long afternoons with a view of the water.', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=85', icon: Waves },
  { title: 'Seasonal dining', detail: 'Thoughtful menus, made with local produce.', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85', icon: Utensils },
  { title: 'Easy parking', detail: 'Arrive and leave at your own pace.', image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=85', icon: CarFront },
  { title: 'Restorative spa', detail: 'A little more room to unwind.', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=85', icon: Sparkles },
];
const resortScenes = [
  { title: 'Poolside mornings', image: resortImage },
  { title: 'Rooms with a view', image: roomVisuals.Double.exterior },
  { title: 'Quiet corners', image: roomVisuals.Suite.interior },
];

function Shell({ children }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isRegister = location.pathname === '/register';
  useEffect(() => {
    if (!location.hash) return;
    requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [location.pathname, location.hash]);
  const navItems = [
    ['Home', 'home'],
    ['Rooms', 'rooms'],
    ['Facilities', 'facilities'],
    ['Gallery', 'gallery'],
    ['About us', 'about'],
    ['Contact', 'contact'],
  ];

  return (
    <div className={`app-shell${isAuthPage ? ' auth-shell' : ''}`}>
      <header className={`topbar${isAuthPage ? ' auth-topbar' : ''}`}>
        <Link className="brand" to="/rooms"><span className="brand-mark"><Hotel size={19} strokeWidth={1.8} /></span><span className="brand-name">staywell<small>HOTEL & RETREAT</small></span></Link>
        {!isAuthPage && <nav className={`main-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          {navItems.map(([label, anchor]) => <Link key={anchor} to={`/rooms#${anchor}`} onClick={() => setMenuOpen(false)}>{label}</Link>)}
          {user && <Link to="/bookings" onClick={() => setMenuOpen(false)}>My stays</Link>}
          {user?.role === 'admin' && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>}
          {!user && <div className="mobile-nav-actions"><Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link><Link to="/register" onClick={() => setMenuOpen(false)}>Create account</Link></div>}
        </nav>}
        <div className="account-nav">
          {user ? <><span className="welcome">Hi, {user.name.split(' ')[0]}</span><button className="button button-quiet" onClick={logout}>Log out</button></> : isAuthPage ? <Link className="auth-return" to="/rooms"><ArrowRight size={15} /> Back to staywell</Link> : <><Link className="button button-quiet" to="/login">Log in</Link><Link className="button button-gold" to="/register">Sign up</Link></>}
        </div>
        {!isAuthPage && <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>}
      </header>
      <main>{children}</main>
      {!isAuthPage && <footer className="footer" id="contact"><div><strong>staywell</strong><span>HOTEL & RETREAT</span></div><p>Considered rooms for slower days.<br /><a href="mailto:hello@staywell.example">hello@staywell.example</a></p><span>© 2026 staywell</span></footer>}
    </div>
  );
}

function ProtectedRoute({ children, admin = false }) {
  const { loading, user } = useAuth();
  if (loading) return <div className="page-state">Checking your account...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/rooms" replace />;
  return children;
}

function AuthPage({ mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password }, remember);
      navigate('/rooms');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'We could not complete that request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-layout" style={{ '--auth-image': `url(${resortImage})` }}>
      <form className="auth-card" onSubmit={submit}>
        <span className="auth-kicker">{isRegister ? 'Begin your stay' : 'Welcome back'}</span>
        <h1>{isRegister ? 'Make yourself at home.' : 'Your next stay, made easy.'}</h1>
        <p className="auth-description">{isRegister ? 'Create an account to keep every detail of your stay close.' : 'Sign in to manage your reservations and discover somewhere new.'}</p>
        {error && <div className="alert" role="alert">{error}</div>}
        {isRegister && <label htmlFor="auth-name">Full name<input id="auth-name" autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
        <label htmlFor="auth-email">Email address<input id="auth-email" autoComplete="email" required type="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label htmlFor="auth-password">Password
          <span className="password-control"><input id="auth-password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength="6" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
        </label>
        {!isRegister && <div className="auth-options"><label className="remember-option"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Remember me</label><a href="#forgot-password" onClick={(event) => { event.preventDefault(); setNotice('Online password resets are not available yet. Please contact the hotel team for help.'); }}>Forgot password?</a></div>}
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        <button className="button button-gold button-wide login-submit" disabled={submitting}>{submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'}<ArrowRight size={17} /></button>
        <p className="form-foot">{isRegister ? 'Already have an account?' : "Don't have an account?"} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create account'}</Link></p>
        <span className="auth-assurance"><Hotel size={15} /> A considered stay starts here</span>
      </form>
    </section>
  );
}

function RoomCard({ room, number }) {
  const visuals = getRoomVisuals(room);
  const interior = room.images?.[0] || visuals.interior;
  const exterior = room.images?.[1] || visuals.exterior;
  return (
    <article className="room-card">
      <Link className="room-card-visual" to={`/rooms/${room._id}`} aria-label={`View ${room.type} room`}>
        <img src={interior} alt={`${room.type} room interior`} />
        <span className="room-type">{room.type} collection</span>
        <span className="room-number">{String(number).padStart(2, '0')}</span>
      </Link>
      <div className="room-card-body">
        <div className="room-card-copy"><h3>{room.type} room</h3><p>{room.description || 'A calm, comfortable room for your next stay.'}</p><span className="room-capacity"><BedDouble size={15} /> Up to {room.capacity || 2} guests</span></div>
        <div className="room-card-action"><strong>{formatMoney(room.price)}</strong><Link className="button button-gold room-book" to={`/rooms/${room._id}`}>Book now <ArrowUpRight size={15} /></Link></div>
      </div>
      <span className="room-card-exterior" style={{ backgroundImage: `url(${exterior})` }} aria-hidden="true" />
    </article>
  );
}

function SearchPanel({ onSearch }) {
  const [dates, setDates] = useState({ from: '', to: '', guests: '2', rooms: '1' });
  const [error, setError] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const submit = (event) => { event.preventDefault(); if (!dates.from || !dates.to || dates.from >= dates.to) return setError('Choose a valid check-in and check-out range.'); setError(''); onSearch(dates); };
  return (
    <form className="search-panel" onSubmit={submit}>
      <label className="search-date">Check in<input required min={today} type="date" value={dates.from} onChange={(event) => setDates({ ...dates, from: event.target.value })} /></label>
      <label className="search-date">Check out<input required min={dates.from || today} type="date" value={dates.to} onChange={(event) => setDates({ ...dates, to: event.target.value })} /></label>
      <label className="search-select">Guests<select value={dates.guests} onChange={(event) => setDates({ ...dates, guests: event.target.value })}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}</select></label>
      <label className="search-select">Rooms<select value={dates.rooms} onChange={(event) => setDates({ ...dates, rooms: event.target.value })}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'room' : 'rooms'}</option>)}</select></label>
      <button className="button button-gold search-submit" type="submit">Search rooms <ArrowRight size={16} /></button>
      {error && <small className="search-error">{error}</small>}
    </form>
  );
}

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [type, setType] = useState('');
  const [search, setSearch] = useState(null);
  const [error, setError] = useState('');
  const loadRooms = async (page = 1, selectedType = type, dates = search) => {
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: 6 });
      let endpoint = '/rooms';
      if (dates) {
        endpoint = '/rooms/available';
        params.set('from', dates.from);
        params.set('to', dates.to);
      } else if (selectedType) endpoint = `/rooms/type/${encodeURIComponent(selectedType)}`;
      const { data } = await api.get(`${endpoint}?${params}`);
      setRooms(data.data);
      setPagination(data.pagination);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Rooms are taking a moment to load.'));
    }
  };
  useEffect(() => { loadRooms(); }, [type, search]);
  const handleSearch = (criteria) => { setSearch(criteria); setType(''); };
  const matchingRooms = rooms.filter((room) => !search || !room.capacity || room.capacity >= Number(search.guests));
  const sortedRooms = [...matchingRooms].sort((firstRoom, secondRoom) => (firstRoom.type === 'Single' ? 1 : firstRoom.type === 'Double' ? 2 : 3) - (secondRoom.type === 'Single' ? 1 : secondRoom.type === 'Double' ? 2 : 3));

  return (
    <>
      <section className="hero" id="home" style={{ '--hero-image': `url(${resortImage})` }}>
        <div className="hero-copy"><span className="eyebrow">A considered stay, by the water</span><h1>Find Your <em>Perfect Stay</em></h1><p>Discover a slower rhythm, thoughtful details, and room to breathe.</p><a className="hero-link" href="#rooms">Explore the collection <ArrowRight size={16} /></a></div>
        <div className="hero-note"><span>STAY A LITTLE LONGER</span><p>Poolside mornings.<br />Garden air.<br />Time well spent.</p></div>
        <div className="hero-location"><span className="location-dot" /> A private retreat, made for you</div>
      </section>
      <SearchPanel onSearch={handleSearch} />
      <section className="content-section rooms-section" id="rooms">
        <div className="section-heading"><div><span className="eyebrow">Staywell collection</span><h2>{search ? 'Rooms for your dates' : 'Find your room to unwind'}</h2>{search && <p className="results-note">{search.guests} guests · {search.rooms} {Number(search.rooms) === 1 ? 'room' : 'rooms'} requested. Each room is reserved individually.</p>}</div><select aria-label="Filter by room type" value={type} onChange={(event) => { setSearch(null); setType(event.target.value); }}><option value="">All room types</option><option value="Single">Single</option><option value="Double">Double</option><option value="Suite">Suite</option></select></div>
        {error && <div className="alert" role="alert">{error}</div>}
        {sortedRooms.length ? <div className="room-grid">{sortedRooms.map((room, index) => <RoomCard key={room._id} room={room} number={(pagination.page - 1) * pagination.limit + index + 1} />)}</div> : <div className="empty-state">{search ? 'No rooms match your dates and guest count yet.' : 'Rooms are being prepared. Please check back soon.'}</div>}
        <div className="pagination"><button className="button button-quiet" disabled={pagination.page <= 1} onClick={() => loadRooms(pagination.page - 1)}>Previous</button><span>Page {pagination.page || 1} of {pagination.totalPages || 1}</span><button className="button button-quiet" disabled={pagination.page >= pagination.totalPages} onClick={() => loadRooms(pagination.page + 1)}>Next</button></div>
      </section>
      <section className="facility-section" id="facilities"><div className="section-heading facility-heading"><div><span className="eyebrow">Thoughtful touches</span><h2>Everything in its place.</h2></div><p>Good stays are made of the details you feel.</p></div><div className="facility-grid">{resortFacilities.map(({ title, detail, image, icon: Icon }) => <article className="facility-item" key={title}><div className="facility-image"><img src={image} alt={`${title} at staywell`} loading="lazy" /><span className="facility-icon"><Icon size={21} strokeWidth={1.6} /></span></div><div className="facility-copy"><h3>{title}</h3><p>{detail}</p></div></article>)}</div></section>
      <section className="gallery-section" id="gallery"><div className="section-heading"><div><span className="eyebrow">A glimpse of staywell</span><h2>Let the outside in.</h2></div><Link className="text-link" to="/rooms">View all rooms <ArrowRight size={16} /></Link></div><div className="scene-grid">{resortScenes.map((scene, index) => <figure className={`scene scene-${index + 1}`} key={scene.title}><img src={scene.image} alt={scene.title} loading="lazy" /><figcaption>{scene.title}</figcaption></figure>)}</div></section>
      <section className="about-section" id="about"><div className="about-image" style={{ backgroundImage: `url(${roomVisuals.Single.exterior})` }} role="img" aria-label="Staywell resort surrounded by tropical gardens" /><div className="about-copy"><span className="eyebrow">A quieter kind of escape</span><h2>Made for being here.</h2><p>At staywell, the best moments aren't planned. They're found in a long breakfast, a garden path, or one more hour by the pool.</p><Link className="button button-gold" to="/register">Plan your stay <ArrowRight size={16} /></Link></div></section>
    </>
  );
}

function RoomDetail() {
  const { id } = useParams(); const { user } = useAuth(); const navigate = useNavigate(); const [room, setRoom] = useState(null); const [dates, setDates] = useState({ checkInDate: '', checkOutDate: '' }); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { api.get(`/rooms/${id}`).then(({ data }) => setRoom(data.data)).catch(() => setError('This room is no longer available.')); }, [id]);
  const book = async (event) => { event.preventDefault(); if (!user) return navigate('/login'); try { const { data } = await api.post('/bookings', { room: id, ...dates }); setMessage(`Your stay is confirmed. Total: $${data.data.totalPrice}`); } catch (requestError) { setError(getErrorMessage(requestError, 'This room could not be booked.')); } };
  if (error && !room) return <div className="page-state">{error}</div>; if (!room) return <div className="page-state">Loading room...</div>;
  const visuals = getRoomVisuals(room);
  const customImages = room.images || [];
  const interior = customImages[0] || visuals.interior;
  const exterior = customImages[1] || visuals.exterior;
  return <section className="detail-layout"><div className="detail-image"><Link className="back-link" to="/rooms">← Back to rooms</Link><div className="detail-gallery"><div className="gallery-image gallery-interior" style={{ backgroundImage: `url(${interior})`, '--room-accent': visuals.accent }}><span>Inside the room</span></div><div className="gallery-image gallery-exterior" style={{ backgroundImage: `url(${exterior})` }}><span>Outside the stay</span></div></div></div><div className="detail-copy"><span className="eyebrow">{room.type} collection</span><h1>Your next quiet morning.</h1><p className="lead">{room.description || 'A welcoming room designed for unhurried stays and easy mornings.'}</p><div className="detail-facts"><span><b>{formatMoney(room.price)}</b>nightly rate</span><span><b>{room.capacity || '—'}</b>guests</span><span><b>{room.amenities?.length || 0}</b>amenities</span></div>{room.amenities?.length > 0 && <div className="amenities">{room.amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}</div>}<form className="booking-form" onSubmit={book}><h2>Book this room</h2><div className="date-fields"><label>Check in<input required type="date" value={dates.checkInDate} onChange={(event) => setDates({ ...dates, checkInDate: event.target.value })} /></label><label>Check out<input required type="date" value={dates.checkOutDate} onChange={(event) => setDates({ ...dates, checkOutDate: event.target.value })} /></label></div>{error && <div className="alert">{error}</div>}{message && <div className="success">{message}</div>}<button className="button button-accent button-wide">{user ? 'Reserve this room' : 'Log in to book'}</button></form></div></section>;
}

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data } = await api.get('/bookings/mine');
        if (active) setBookings(data.data);
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError));
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const cancel = async (id) => {
    try {
      await api.patch(`/bookings/${id}/cancel`);
      const { data } = await api.get('/bookings/mine');
      setBookings(data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to cancel this booking.'));
    }
  };

  return <section className="content-section narrow"><div className="section-heading"><div><span className="eyebrow">Your space</span><h1>My stays</h1></div><Link className="button button-accent" to="/rooms">Find another room</Link></div>{error && <div className="alert">{error}</div>}{bookings.length ? <div className="booking-list">{bookings.map((booking) => <article className="booking-row" key={booking._id}><div><span className={`status status-${booking.status}`}>{booking.status}</span><h3>{booking.room?.type || 'Room'} room</h3><p>{formatDate(booking.checkInDate)} — {formatDate(booking.checkOutDate)}</p></div><div className="booking-side"><strong>${booking.totalPrice}</strong>{booking.status !== 'cancelled' && <button className="button button-quiet" onClick={() => cancel(booking._id)}>Cancel</button>}</div></article>)}</div> : <div className="empty-state">You have no stays yet. Your next one is waiting.</div>}</section>;
}

function AdminPage() { const [rooms, setRooms] = useState([]); const [bookings, setBookings] = useState([]); const [form, setForm] = useState({ type: 'Double', price: '', capacity: '', description: '' }); const [editing, setEditing] = useState(null); const [message, setMessage] = useState(''); const load = async () => { const [roomResponse, bookingResponse] = await Promise.all([api.get('/rooms?limit=100'), api.get('/bookings?limit=100')]); setRooms(roomResponse.data.data); setBookings(bookingResponse.data.data); }; useEffect(() => { load().catch(() => setMessage('Unable to load dashboard data.')); }, []); const submit = async (event) => { event.preventDefault(); try { const payload = { ...form, price: Number(form.price), capacity: form.capacity ? Number(form.capacity) : undefined }; if (editing) await api.put(`/rooms/${editing}`, payload); else await api.post('/rooms', payload); setForm({ type: 'Double', price: '', capacity: '', description: '' }); setEditing(null); setMessage('Saved successfully.'); load(); } catch (error) { setMessage(getErrorMessage(error, 'Could not save room.')); } }; const remove = async (id) => { if (window.confirm('Delete this room?')) { await api.delete(`/rooms/${id}`); load(); } }; return <section className="content-section admin-page"><div className="section-heading"><div><span className="eyebrow">Operations</span><h1>Admin dashboard</h1></div><span className="admin-badge">Live inventory</span></div><div className="admin-grid"><form className="admin-form" onSubmit={submit}><h2>{editing ? 'Edit room' : 'Add a room'}</h2><label>Type<input required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label><label>Price per night<input required min="0" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Capacity<input min="1" type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label><label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><button className="button button-accent">{editing ? 'Update room' : 'Create room'}</button>{editing && <button type="button" className="button button-quiet" onClick={() => { setEditing(null); setForm({ type: 'Double', price: '', capacity: '', description: '' }); }}>Cancel edit</button>}{message && <p className="muted">{message}</p>}</form><div><h2 className="subheading">Rooms <span>{rooms.length}</span></h2><div className="admin-list">{rooms.map((room) => <div className="admin-row" key={room._id}><div><b>{room.type}</b><span>{formatMoney(room.price)}</span></div><div><button className="text-button" onClick={() => { setEditing(room._id); setForm({ type: room.type, price: room.price, capacity: room.capacity || '', description: room.description || '' }); }}>Edit</button><button className="text-button danger" onClick={() => remove(room._id)}>Delete</button></div></div>)}</div></div></div><div className="admin-bookings"><h2 className="subheading">Recent bookings <span>{bookings.length}</span></h2>{bookings.map((booking) => <div className="admin-row" key={booking._id}><div><b>{booking.room?.type || 'Room'} · {booking.user?.name || 'Guest'}</b><span>{formatDate(booking.checkInDate)} — {booking.status}</span></div><strong>${booking.totalPrice}</strong></div>)}</div></section>; }

export default function App() { return <Shell><Routes><Route path="/" element={<Navigate to="/rooms" replace />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/rooms" element={<RoomsPage />} /><Route path="/rooms/:id" element={<RoomDetail />} /><Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} /><Route path="/admin" element={<ProtectedRoute admin><AdminPage /></ProtectedRoute>} /><Route path="*" element={<Navigate to="/rooms" replace />} /></Routes></Shell>; }
