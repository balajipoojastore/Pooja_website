import desktopLogo from '../../assets/balaji-store-logo.webp';

interface BrandLogoProps {
  className: 'brand-mark' | 'auth-brand-mark' | 'footer-brand-mark';
}

export function BrandLogo({ className }: BrandLogoProps) {
  return <picture className={className} aria-hidden="true">
    <img src={desktopLogo} alt="" />
  </picture>;
}
