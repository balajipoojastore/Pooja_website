import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LocationPicker } from '../../components/account/LocationPicker';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { checkPincode } from '../../services/deliveryService';
import { completeCustomerSignup } from '../../services/customerAuthService';
import { signupSchema, type SignupInput } from '../../utils/validation';

const profileSchema = signupSchema.omit({ email: true });
type ProfileInput = Omit<SignupInput, 'email'>;

export default function CompleteProfilePage() {
  const auth = useCustomerAuth(); const navigate = useNavigate(); const location = useLocation();
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { pincode: '', locationUrl: '', termsAccepted: false } });
  const submit = async (values: ProfileInput) => { setBusy(true); setMessage(null); try { if (!await checkPincode(values.pincode)) throw new Error('Delivery is not available for this PIN code.'); await completeCustomerSignup(values); await auth.refreshAccount(); const from = (location.state as { from?: string } | null)?.from; navigate(from?.startsWith('/') && !from.startsWith('//') ? from : '/', { replace: true }); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save your profile.'); } finally { setBusy(false); } };
  return <div className="account-page shell"><header className="page-heading"><span className="eyebrow">One last step</span><h1>Complete your profile</h1><p>Checkout needs a name, format-validated mobile number and serviceable delivery address.</p></header><form className="account-form" onSubmit={handleSubmit(submit)}>
    <label>Full name<input {...register('fullName')} />{errors.fullName && <small>{errors.fullName.message}</small>}</label><label>Mobile number<input {...register('phone')} inputMode="numeric" maxLength={10} />{errors.phone && <small>{errors.phone.message}</small>}</label><label className="is-wide">Address line 1<input {...register('addressLine1')} />{errors.addressLine1 && <small>{errors.addressLine1.message}</small>}</label><label>Address line 2<input {...register('addressLine2')} /></label><label>Landmark<input {...register('landmark')} /></label><label>City<input {...register('city')} />{errors.city && <small>{errors.city.message}</small>}</label><label>State<input {...register('state')} />{errors.state && <small>{errors.state.message}</small>}</label><label>PIN code<input {...register('pincode')} inputMode="numeric" maxLength={6} />{errors.pincode && <small>{errors.pincode.message}</small>}</label><div className="is-wide"><LocationPicker value={watch('locationUrl')} onChange={(value) => setValue('locationUrl', value, { shouldDirty: true, shouldValidate: true })} disabled={busy} /></div><div className="auth-terms is-wide"><input id="profile-terms" type="checkbox" {...register('termsAccepted')} /><label htmlFor="profile-terms">I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</Link> and acknowledge the <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link>.</label></div><button className="primary-btn is-wide" disabled={busy}>{busy ? <><LoaderCircle className="spin" />Saving…</> : 'Save profile'}</button>{message && <p className="auth-message auth-message--error is-wide" role="alert">{message}</p>}
  </form></div>;
}
