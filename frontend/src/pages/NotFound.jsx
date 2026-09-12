import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export default function NotFound() {
  useDocumentTitle('Page not found');

  return (
    <div className="container-page py-24">
      <EmptyState
        as="h1"
        icon={Compass}
        title="We could not find that page"
        description="The link may be out of date, or the piece may have sold out and been removed."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">
              Back to home
            </Link>
            <Link to="/shop" className="btn-secondary">
              Browse the marketplace
            </Link>
          </div>
        }
      />
    </div>
  );
}
