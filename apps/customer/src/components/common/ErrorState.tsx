import { CircleAlert } from 'lucide-react';

export function ErrorState({ message = 'We could not load this right now.', retry }: { message?: string; retry?: () => void }) {
  return <div className="empty-state empty-state--error" role="alert"><CircleAlert size={34} /><h2>Something went wrong</h2><p>{message}</p>{retry && <button className="button button--dark" onClick={retry}>Try again</button>}</div>;
}
