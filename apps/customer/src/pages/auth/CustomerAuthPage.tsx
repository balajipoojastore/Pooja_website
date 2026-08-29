import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { OtpCodeInput } from '../../components/auth/OtpCodeInput';
import { LocationPicker } from '../../components/account/LocationPicker';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { checkPincode } from '../../services/deliveryService';
import { completeCustomerSignup, loadCustomerAccount, sendCustomerOtp, verifyCustomerOtp } from '../../services/customerAuthService';
import { emailSchema, signupSchema, type SignupInput } from '../../utils/validation';

type Mode = 'login' | 'signup';
type Stage = 'details' | 'otp';

function safeReturnPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return 'your email';
  return `${name.slice(0, 2)}${'•'.repeat(Math.min(6, Math.max(2, name.length - 2)))}@${domain}`;
}

export default function CustomerAuthPage() {
  const auth = useCustomerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = safeReturnPath((location.state as { from?: unknown } | null)?.from);
  const [mode, setMode] = useState<Mode>('login');
  const [stage, setStage] = useState<Stage>('details');
  const [email, setEmail] = useState('');
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const [signupDetails, setSignupDetails] = useState<SignupInput | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pinState, setPinState] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const signupForm = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '', email: '', phone: '', addressLine1: '', addressLine2: '', landmark: '',
      city: '', state: '', pincode: '', locationUrl: '', termsAccepted: false,
    },
  });
  const signupPin = signupForm.watch('pincode');

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);
  useEffect(() => { setPinState('idle'); }, [signupPin]);

  const requestOtp = async (nextEmail: string, nextMode: Mode, details?: SignupInput) => {
    setBusy(true); setMessage(null);
    try {
      if (nextMode === 'signup') {
        setPinState('checking');
        const area = await checkPincode(details!.pincode);
        if (!area) { setPinState('unavailable'); throw new Error('Delivery is not available for this PIN code.'); }
        setPinState('available'); setSignupDetails(details!);
      }
      await sendCustomerOtp(nextEmail, nextMode);
      setEmail(nextEmail.trim().toLowerCase()); setOtp(''); setStage('otp'); setCooldown(60);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to continue.'); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) { setMessage('Enter the complete six-digit code.'); return; }
    setBusy(true); setMessage(null);
    try {
      const result = await verifyCustomerOtp(email, otp);
      setOtp('');
      if (mode === 'signup' && signupDetails) {
        await completeCustomerSignup(signupDetails);
        setSignupDetails(null);
        await auth.refreshAccount();
        navigate(returnTo, { replace: true });
        return;
      }
      const account = await loadCustomerAccount(result.user.id);
      await auth.refreshAccount();
      navigate(account.profile && account.addresses.some((address) => address.is_default) ? returnTo : '/complete-profile', { replace: true, state: { from: returnTo } });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Verification failed.'); }
    finally { setBusy(false); }
  };

  const subtitle = useMemo(() => mode === 'login' ? 'Welcome back. We’ll email a secure six-digit code.' : 'Create your account and save a serviceable delivery address.', [mode]);
  if (!auth.loading && auth.profileComplete) return <Navigate to={returnTo} replace />;

  return <main className="customer-auth-page">
    <section className="auth-brand-panel" aria-hidden="true"><BrandLogo className="auth-brand-mark" /><p>THE POOJA HOUSE</p><h1>Everyday pooja essentials, delivered with care.</h1><small>Secure email verification. Cash on Delivery.</small></section>
    <section className="auth-card" aria-labelledby="customer-auth-title">
      {stage === 'details' ? <>
        <p className="eyebrow">Customer account</p><h1 id="customer-auth-title">Login or create an account</h1><p className="auth-subtitle">{subtitle}</p>
        <div className="auth-tabs" role="tablist" aria-label="Customer authentication">
          {(['login', 'signup'] as const).map((tab) => <button key={tab} role="tab" aria-selected={mode === tab} className={mode === tab ? 'is-active' : ''} onClick={() => { setMode(tab); setMessage(null); }}>{tab === 'login' ? 'Login' : 'Sign Up'}</button>)}
        </div>
        {mode === 'login' ? <form className="auth-form" onSubmit={(event) => { event.preventDefault(); const parsed = emailSchema.safeParse(loginEmailRef.current?.value ?? ''); if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? 'Enter a valid email.'); return; } void requestOtp(parsed.data, 'login'); }} noValidate>
          <label>Email address<input ref={loginEmailRef} type="email" defaultValue="" autoComplete="email" aria-describedby={message ? 'auth-error' : undefined} /></label>
          <button className="primary-btn auth-submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" />Sending code…</> : <><Mail />Continue</>}</button>
          <p className="auth-legal-copy">By continuing, you agree to our <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</Link> and acknowledge the <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link>.</p>
        </form> : <form className="auth-form signup-form" onSubmit={signupForm.handleSubmit((values) => requestOtp(values.email, 'signup', values))} noValidate>
          <label>Full name<input {...signupForm.register('fullName')} autoComplete="name" />{signupForm.formState.errors.fullName && <small>{signupForm.formState.errors.fullName.message}</small>}</label>
          <label>Email address<input {...signupForm.register('email')} type="email" autoComplete="email" />{signupForm.formState.errors.email && <small>{signupForm.formState.errors.email.message}</small>}</label>
          <label>Indian mobile number<input {...signupForm.register('phone')} inputMode="numeric" autoComplete="tel" maxLength={10} />{signupForm.formState.errors.phone && <small>{signupForm.formState.errors.phone.message}</small>}<em>Format checked; this number is not phone-verified.</em></label>
          <label className="is-wide">Address line 1<input {...signupForm.register('addressLine1')} autoComplete="address-line1" />{signupForm.formState.errors.addressLine1 && <small>{signupForm.formState.errors.addressLine1.message}</small>}</label>
          <label>Address line 2 <span>(optional)</span><input {...signupForm.register('addressLine2')} autoComplete="address-line2" /></label>
          <label>Landmark <span>(optional)</span><input {...signupForm.register('landmark')} /></label>
          <label>City<input {...signupForm.register('city')} autoComplete="address-level2" />{signupForm.formState.errors.city && <small>{signupForm.formState.errors.city.message}</small>}</label>
          <label>State<input {...signupForm.register('state')} autoComplete="address-level1" />{signupForm.formState.errors.state && <small>{signupForm.formState.errors.state.message}</small>}</label>
          <label>Delivery PIN<div className="auth-pin-row"><input {...signupForm.register('pincode')} inputMode="numeric" maxLength={6} autoComplete="postal-code" /><button type="button" disabled={!/^\d{6}$/.test(signupPin) || pinState === 'checking'} onClick={async () => { setPinState('checking'); const area = await checkPincode(signupPin).catch(() => null); setPinState(area ? 'available' : 'unavailable'); }}>Check</button></div>{signupForm.formState.errors.pincode && <small>{signupForm.formState.errors.pincode.message}</small>}{pinState === 'available' && <em className="is-success"><CheckCircle2 /> Delivery available</em>}{pinState === 'unavailable' && <small>Delivery is not available for this PIN code.</small>}</label>
          <div className="is-wide"><LocationPicker value={signupForm.watch('locationUrl')} onChange={(value) => signupForm.setValue('locationUrl', value, { shouldDirty: true, shouldValidate: true })} disabled={busy} /></div>
          <div className="auth-terms is-wide"><input id="signup-terms" type="checkbox" {...signupForm.register('termsAccepted')} /><label htmlFor="signup-terms">I agree to The Pooja House <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</Link> and acknowledge the <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link>.</label></div>{signupForm.formState.errors.termsAccepted && <small className="is-wide">{signupForm.formState.errors.termsAccepted.message}</small>}
          <button className="primary-btn auth-submit is-wide" disabled={busy || pinState === 'checking'}>{busy ? <><LoaderCircle className="spin" />Checking and sending…</> : <><ShieldCheck />Verify email & create account</>}</button>
        </form>}
      </> : <div className="otp-stage">
        <button className="auth-back" type="button" onClick={() => { setStage('details'); setOtp(''); setMessage(null); setSignupDetails(null); }}><ArrowLeft />Change email</button>
        <p className="eyebrow">Email verification</p><h1 id="customer-auth-title">Enter your six-digit code</h1><p>We sent it to <strong>{maskEmail(email)}</strong>. The code is temporary and should never be shared.</p>
        <OtpCodeInput value={otp} onChange={(value) => { setOtp(value); setMessage(null); }} disabled={busy} />
        <button className="primary-btn auth-submit" type="button" onClick={() => void verify()} disabled={busy || otp.length !== 6}>{busy ? <><LoaderCircle className="spin" />Verifying…</> : 'Verify code'}</button>
        <button className="auth-resend" type="button" disabled={busy || cooldown > 0} onClick={() => void requestOtp(email, mode, signupDetails ?? undefined)}>{cooldown ? `Resend code in ${cooldown}s` : 'Resend OTP'}</button>
      </div>}
      {message && <p id="auth-error" className="auth-message auth-message--error" role="alert">{message}</p>}
    </section>
  </main>;
}
