import { Link } from 'react-router-dom';
import { SEO_STORE_NAME, usePageMetadata } from '../lib/seo';

export default function NotFoundPage() {
  usePageMetadata({ title: `Page not found | ${SEO_STORE_NAME}`, description: 'This page is unavailable.', pathname: '/404', noIndex: true });
  return <div className="success-page shell"><span className="eyebrow">404</span><h1>This page has wandered away.</h1><p>Let’s return to The Pooja House.</p><Link className="button button--dark" to="/">Go home</Link></div>;
}
