import { useSiteSettings } from '../../hooks/useStoreData';

export function Reviews() {
  const { data: settings } = useSiteSettings();
  return <section id="reviews" className="app-section"><div className="section-title"><h2>Customer reviews</h2><a href="#site-header">Top</a></div><div className="review-rail">{settings?.reviews.map((review) => <blockquote className="review-card" key={review.id}><strong>{review.rating}.0/5</strong><p>“{review.quote}”</p><small>{review.author}</small></blockquote>)}</div></section>;
}
