import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, MapPin, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { LocationPicker } from '../../components/account/LocationPicker';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useToast } from '../../context/ToastContext';
import { checkPincode } from '../../services/deliveryService';
import { updateCustomerAddress, type CustomerAddress } from '../../services/customerAuthService';
import { customerAddressUpdateSchema, type CustomerAddressUpdateInput } from '../../utils/validation';

function AddressEditor({ address, onCancel, onSaved }: {
  address: CustomerAddress;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CustomerAddressUpdateInput>({
    resolver: zodResolver(customerAddressUpdateSchema),
    defaultValues: {
      label: address.label,
      addressLine1: address.address_line_1,
      addressLine2: address.address_line_2 ?? '',
      landmark: address.landmark ?? '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      locationUrl: address.location_url ?? '',
    },
  });

  const submit = async (values: CustomerAddressUpdateInput) => {
    setSaving(true); setMessage(null);
    try {
      const area = await checkPincode(values.pincode);
      if (!area) throw new Error('Delivery is not available for this PIN code.');
      await updateCustomerAddress(address.id, values);
      await onSaved();
      showToast('Your delivery address was updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not update your address.');
    } finally { setSaving(false); }
  };

  return <form className="account-inline-form account-address-form" onSubmit={handleSubmit(submit)} noValidate>
    <label>Address label<input {...register('label')} autoComplete="off" aria-invalid={Boolean(errors.label)} />{errors.label && <small>{errors.label.message}</small>}</label>
    <label className="is-wide">Address line 1<input {...register('addressLine1')} autoComplete="address-line1" aria-invalid={Boolean(errors.addressLine1)} />{errors.addressLine1 && <small>{errors.addressLine1.message}</small>}</label>
    <label>Address line 2 <span>(optional)</span><input {...register('addressLine2')} autoComplete="address-line2" /></label>
    <label>Landmark <span>(optional)</span><input {...register('landmark')} /></label>
    <label>City<input {...register('city')} autoComplete="address-level2" aria-invalid={Boolean(errors.city)} />{errors.city && <small>{errors.city.message}</small>}</label>
    <label>State<input {...register('state')} autoComplete="address-level1" aria-invalid={Boolean(errors.state)} />{errors.state && <small>{errors.state.message}</small>}</label>
    <label>Delivery PIN<input {...register('pincode', { onChange: (event) => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6); } })} inputMode="numeric" autoComplete="postal-code" maxLength={6} aria-invalid={Boolean(errors.pincode)} />{errors.pincode && <small>{errors.pincode.message}</small>}<em>The live delivery area is checked again when you save.</em></label>
    <div className="is-wide"><LocationPicker value={watch('locationUrl') ?? ''} onChange={(value) => setValue('locationUrl', value, { shouldDirty: true, shouldValidate: true })} disabled={saving} /></div>
    {message && <p className="account-form-status account-form-status--error is-wide" role="alert">{message}</p>}
    <div className="account-form-actions is-wide">
      <button className="primary-btn" disabled={saving}>{saving ? <><LoaderCircle className="spin" />Saving…</> : 'Save address'}</button>
      <button className="secondary-btn" type="button" disabled={saving} onClick={onCancel}><X />Cancel</button>
    </div>
  </form>;
}

export default function AddressesPage() {
  const auth = useCustomerAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  return <div className="account-page shell">
    <header className="page-heading">
      <span className="eyebrow">Saved delivery details</span>
      <h1>Addresses</h1>
      <p>Edit your written address or add an optional map pin to help the store find your delivery location.</p>
    </header>
    <div className="account-grid">{auth.addresses.map((address) => <article className={`account-card${editingId === address.id ? ' account-card--editing' : ''}`} key={address.id}>
      <div className="account-card-header">
        <h2><MapPin />{address.label}{address.is_default && <span className="status-chip">Default</span>}</h2>
        {editingId !== address.id && <button className="account-edit-button" type="button" onClick={() => setEditingId(address.id)}><Pencil />Edit address</button>}
      </div>
      {editingId === address.id ? <AddressEditor address={address} onCancel={() => setEditingId(null)} onSaved={async () => { await auth.refreshAccount(); setEditingId(null); }} /> : <>
        <p>{address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ''}</p>
        <p>{address.landmark ? `${address.landmark}, ` : ''}{address.city}, {address.state} · PIN {address.pincode}</p>
        {address.location_url && <LocationPicker value={address.location_url} onChange={() => undefined} disabled />}
      </>}
    </article>)}</div>
  </div>;
}
