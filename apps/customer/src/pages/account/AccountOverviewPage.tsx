import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, LogOut, Mail, MapPin, Pencil, Phone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useToast } from '../../context/ToastContext';
import { updateCustomerProfile } from '../../services/customerAuthService';
import { customerProfileUpdateSchema, type CustomerProfileUpdateInput } from '../../utils/validation';

export default function AccountOverviewPage() {
  const auth = useCustomerAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const address = auth.addresses.find((item) => item.is_default);
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerProfileUpdateInput>({
    resolver: zodResolver(customerProfileUpdateSchema),
    defaultValues: { fullName: auth.profile?.full_name ?? '', phone: auth.profile?.phone ?? '' },
  });

  useEffect(() => {
    reset({ fullName: auth.profile?.full_name ?? '', phone: auth.profile?.phone ?? '' });
  }, [auth.profile, reset]);

  const closeEditor = () => {
    reset({ fullName: auth.profile?.full_name ?? '', phone: auth.profile?.phone ?? '' });
    setErrorMessage(null);
    setEditingProfile(false);
  };

  const saveProfile = async (values: CustomerProfileUpdateInput) => {
    setSaving(true); setErrorMessage(null);
    try {
      await updateCustomerProfile(values);
      await auth.refreshAccount();
      setEditingProfile(false);
      showToast('Your profile details were updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'We could not update your profile.');
    } finally { setSaving(false); }
  };

  return <div className="account-page shell">
    <header className="page-heading">
      <span className="eyebrow">Your account</span>
      <h1>{auth.profile?.full_name}</h1>
      <p>Manage the customer information used for Cash on Delivery.</p>
    </header>
    <div className="account-grid">
      <section className="account-card">
        <div className="account-card-header">
          <h2>Profile</h2>
          {!editingProfile && <button className="account-edit-button" type="button" onClick={() => setEditingProfile(true)}><Pencil />Edit details</button>}
        </div>
        {!editingProfile ? <>
          <p><Mail />{auth.user?.email}</p>
          <p><Phone />{auth.profile?.phone} <small>format validated</small></p>
        </> : <form className="account-inline-form" onSubmit={handleSubmit(saveProfile)} noValidate>
          <label>Full name<input {...register('fullName')} autoComplete="name" aria-invalid={Boolean(errors.fullName)} />{errors.fullName && <small>{errors.fullName.message}</small>}</label>
          <label>Mobile number<input {...register('phone', { onChange: (event) => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10); } })} inputMode="numeric" autoComplete="tel" maxLength={10} aria-invalid={Boolean(errors.phone)} />{errors.phone && <small>{errors.phone.message}</small>}<em>Format checked; this number is not phone-verified.</em></label>
          {errorMessage && <p className="account-form-status account-form-status--error" role="alert">{errorMessage}</p>}
          <div className="account-form-actions">
            <button className="primary-btn" disabled={saving}>{saving ? <><LoaderCircle className="spin" />Saving…</> : 'Save changes'}</button>
            <button className="secondary-btn" type="button" disabled={saving} onClick={closeEditor}><X />Cancel</button>
          </div>
        </form>}
      </section>
      <section className="account-card">
        <div className="account-card-header"><h2>Default address</h2><Link className="account-edit-button" to="/addresses"><Pencil />Edit address</Link></div>
        {address ? <p><MapPin />{address.address_line_1}, {address.city}, {address.state} · PIN {address.pincode}</p> : <p>No default address.</p>}
      </section>
    </div>
    <button className="secondary-btn" onClick={async () => { navigate('/', { replace: true }); await auth.logout(); }}><LogOut />Log out</button>
  </div>;
}
