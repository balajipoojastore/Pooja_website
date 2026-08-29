import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return <div className="success-page shell"><span className="eyebrow">404</span><h1>This page has wandered away.</h1><p>Let’s return to The Pooja House.</p><Link className="button button--dark" to="/">Go home</Link></div>;
}
