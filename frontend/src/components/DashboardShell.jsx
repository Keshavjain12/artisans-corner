import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import cn from '../utils/cn.js';

export function DashboardShell({ title, subtitle, links, badge }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-sand bg-white">
        <div className="container-page flex flex-wrap items-center gap-4 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-600 font-display text-lg text-white">
              A
            </span>
            <span className="hidden font-display text-base text-ink sm:block">
              Artisan&rsquo;s Corner
            </span>
          </Link>

          <div className="min-w-0 border-l border-sand pl-4">
            <p className="truncate text-sm font-medium text-ink">{title}</p>
            {subtitle && <p className="truncate text-xs text-ink-soft">{subtitle}</p>}
          </div>

          {badge}

          <Link to="/" className="btn-ghost ml-auto">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to marketplace
          </Link>
        </div>
      </header>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Dashboard" className="min-w-0 lg:sticky lg:top-8 lg:h-fit">
          <div className="relative lg:contents">
            <ul className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {links.map((link) => (
              <li key={link.to} className="shrink-0">
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-clay-600 font-medium text-white'
                        : 'text-ink-muted hover:bg-white hover:text-ink'
                    )
                  }
                >
                  <link.icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </NavLink>
              </li>
            ))}
            </ul>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-cream to-transparent lg:hidden"
            />
          </div>
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default DashboardShell;
