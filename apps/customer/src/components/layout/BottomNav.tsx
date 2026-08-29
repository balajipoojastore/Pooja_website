import { CircleUserRound, Grid2X2, Home, PackageCheck, Search } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export function BottomNav() {
  const auth = useCustomerAuth();
  return <nav className="bottom-nav" aria-label="Mobile navigation"><NavLink to="/"><Home /><span>Home</span></NavLink><Link to="/#categories"><Grid2X2 /><span>Categories</span></Link><Link to="/products"><Search /><span>Search</span></Link><Link to={auth.user ? '/orders' : '/auth'} state={{ from: '/orders' }}><PackageCheck /><span>Orders</span></Link><Link to={auth.user ? '/profile' : '/auth'} state={{ from: '/profile' }}><CircleUserRound /><span>{auth.user ? 'Account' : 'Login'}</span></Link></nav>;
}
