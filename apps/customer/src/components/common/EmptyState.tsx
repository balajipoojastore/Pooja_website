import { PackageSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmptyState({ title = 'Nothing here yet', message = 'Try changing your search or filters.', action }: { title?: string; message?: string; action?: boolean }) {
  return <div className="empty-state"><PackageSearch size={34} /><h2>{title}</h2><p>{message}</p>{action && <Link className="button button--dark" to="/products">Browse products</Link>}</div>;
}
