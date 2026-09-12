import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, Twitter } from 'lucide-react';
import toast from 'react-hot-toast';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { to: '/shop', label: 'All products' },
      { to: '/categories', label: 'Categories' },
      { to: '/shop?sort=newest', label: 'New arrivals' },
      { to: '/shop?sort=best-selling', label: 'Best sellers' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { to: '/become-a-seller', label: 'Become a seller' },
      { to: '/dashboard/seller', label: 'Seller dashboard' },
      { to: '/artisans', label: 'Meet the makers' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/account', label: 'My profile' },
      { to: '/orders', label: 'My orders' },
      { to: '/cart', label: 'Cart' },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState('');

  const subscribe = (event) => {
    event.preventDefault();
    toast.success('Thanks - we will let you know when new makers join.');
    setEmail('');
  };

  return (
    <footer className="mt-24 border-t border-sand bg-white">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-600 font-display text-lg text-white">
                A
              </span>
              <span className="font-display text-lg text-ink">Artisan&rsquo;s Corner</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              A marketplace for people who make things by hand. Every order supports an independent
              studio - and 95% of every sale goes straight to the maker.
            </p>

            <form onSubmit={subscribe} className="mt-6 max-w-sm">
              <label htmlFor="newsletter" className="label">
                New makers, once a month
              </label>
              <div className="flex gap-2">
                <input
                  id="newsletter"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="field"
                />
                <button type="submit" className="btn-primary shrink-0">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Join
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="font-display text-sm text-ink">{column.title}</h2>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.to + link.label}>
                      <Link to={link.to} className="text-sm text-ink-muted hover:text-clay-700">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-sand pt-6 sm:flex-row">
          <p className="text-xs text-ink-soft">
            &copy; {new Date().getFullYear()} Artisan&rsquo;s Corner. A student full-stack project.
          </p>
          <div className="flex items-center gap-3 text-ink-soft">
            <a href="https://instagram.com" aria-label="Instagram" className="hover:text-clay-700">
              <Instagram className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="https://twitter.com" aria-label="Twitter" className="hover:text-clay-700">
              <Twitter className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
