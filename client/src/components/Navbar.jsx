import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Shield,
  ShoppingBag,
  Store,
  User,
  X,
} from 'lucide-react';
import { logout, selectIsAdmin, selectIsVendor } from '../store/authSlice.js';
import { selectCartCount } from '../store/cartSlice.js';
import cn from '../utils/cn.js';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/artisans', label: 'Artisans' },
];

function MenuLink({ to, icon: Icon, children, onClick }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-muted hover:bg-sand hover:text-ink"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

export function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isVendor = useSelector(selectIsVendor);
  const isAdmin = useSelector(selectIsAdmin);
  const cartCount = useSelector(selectCartCount);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [term, setTerm] = useState('');
  const accountRef = useRef(null);

  useEffect(() => {
    const onClick = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(term.trim() ? `/shop?q=${encodeURIComponent(term.trim())}` : '/shop');
    setMobileOpen(false);
  };

  const signOut = async () => {
    await dispatch(logout());
    setAccountOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    cn(
      'text-sm transition-colors hover:text-clay-700',
      isActive ? 'text-clay-700 font-medium' : 'text-ink-muted'
    );

  return (
    <header className="sticky top-0 z-40 border-b border-sand/80 bg-cream/90 backdrop-blur">
      <div className="container-page">
        <div className="flex h-16 items-center gap-4 lg:h-20">
          <button
            type="button"
            className="btn-ghost -ml-2 p-2 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-600 font-display text-lg text-white">
              A
            </span>
            <span className="hidden font-display text-lg leading-none text-ink sm:block">
              Artisan&rsquo;s Corner
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <form
            onSubmit={submitSearch}
            className="ml-auto hidden max-w-xs flex-1 md:block"
            role="search"
          >
            <label htmlFor="global-search" className="sr-only">
              Search handmade products
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              />
              <input
                id="global-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search pottery, jewellery, prints..."
                className="field pl-9"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {!isVendor && (
              <Link to="/become-a-seller" className="btn-ghost hidden xl:inline-flex">
                <Store className="h-4 w-4" aria-hidden="true" />
                Become a seller
              </Link>
            )}

            <Link
              to="/cart"
              className="btn-ghost relative p-2.5"
              aria-label={`Cart, ${cartCount} items`}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-600 px-1 text-[11px] font-medium text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  className="btn-ghost gap-1.5 px-2.5"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay-100 text-xs font-semibold text-clay-700">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                </button>

                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 animate-fade-up overflow-hidden rounded-2xl border border-sand bg-white py-1.5 shadow-lift"
                  >
                    <div className="border-b border-sand px-4 pb-2.5 pt-1.5">
                      <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                      <p className="truncate text-xs text-ink-soft">{user.email}</p>
                    </div>
                    <MenuLink to="/account" icon={User} onClick={() => setAccountOpen(false)}>
                      My profile
                    </MenuLink>
                    <MenuLink to="/orders" icon={Package} onClick={() => setAccountOpen(false)}>
                      My orders
                    </MenuLink>
                    {isVendor && (
                      <MenuLink
                        to="/dashboard/seller"
                        icon={LayoutDashboard}
                        onClick={() => setAccountOpen(false)}
                      >
                        Seller dashboard
                      </MenuLink>
                    )}
                    {isAdmin && (
                      <MenuLink
                        to="/dashboard/admin"
                        icon={Shield}
                        onClick={() => setAccountOpen(false)}
                      >
                        Admin dashboard
                      </MenuLink>
                    )}
                    {!isVendor && (
                      <MenuLink to="/become-a-seller" icon={Store} onClick={() => setAccountOpen(false)}>
                        Become a seller
                      </MenuLink>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={signOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-ink-muted hover:bg-sand hover:text-ink"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/login" className="btn-ghost">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary hidden sm:inline-flex">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="animate-fade-up border-t border-sand py-4 lg:hidden">
            <form onSubmit={submitSearch} role="search" className="mb-4 md:hidden">
              <label htmlFor="mobile-search" className="sr-only">
                Search products
              </label>
              <input
                id="mobile-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search handmade goods"
                className="field"
              />
            </form>
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-xl px-3 py-2.5 text-sm',
                      isActive ? 'bg-clay-50 font-medium text-clay-700' : 'text-ink-muted'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Link
                to="/become-a-seller"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm text-ink-muted"
              >
                Become a seller
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
