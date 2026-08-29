import { ExternalLink, LoaderCircle, LocateFixed, MapPinned, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createGoogleMapsLocationUrl, isSafeGoogleMapsLocationUrl } from '../../utils/location';

type LocationPickerProps = {
  value?: string;
  onChange: (value: string) => void | Promise<void>;
  disabled?: boolean;
};

export function LocationPicker({ value = '', onChange, disabled = false }: LocationPickerProps) {
  const [state, setState] = useState<'idle' | 'locating' | 'saved' | 'error'>(value ? 'saved' : 'idle');
  const [message, setMessage] = useState(value ? 'Map location saved.' : '');
  const safeValue = isSafeGoogleMapsLocationUrl(value) ? value : '';

  const locate = () => {
    if (!navigator.geolocation) {
      setState('error'); setMessage('Location is not supported by this browser. Enter the address manually.'); return;
    }
    setState('locating'); setMessage('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const url = createGoogleMapsLocationUrl(coords.latitude, coords.longitude);
        if (!url) { setState('error'); setMessage('We could not read a valid location. Please try again.'); return; }
        try {
          await onChange(url); setState('saved'); setMessage('Location saved. You can preview it before continuing.');
        } catch {
          setState('error'); setMessage('We found your location but could not save it. Please try again.');
        }
      },
      (error) => {
        setState('error');
        setMessage(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. You can continue with the written address.'
          : 'We could not get your location. Check your connection and try again.');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  return <div className="location-picker">
    <div className="location-picker-heading">
      <span className="location-picker-icon"><MapPinned aria-hidden="true" /></span>
      <span><strong>Pin your delivery location</strong><small>Optional · shared only with the store for delivery</small></span>
    </div>
    <div className="location-picker-actions">
      <button className="location-picker-button" type="button" disabled={disabled || state === 'locating'} onClick={locate}>
        {state === 'locating' ? <LoaderCircle className="spin" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />}
        {safeValue ? 'Update current location' : 'Use my current location'}
      </button>
      {safeValue && <>
        <a href={safeValue} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ExternalLink aria-hidden="true" />Preview map</a>
        <button className="location-picker-remove" type="button" disabled={disabled} onClick={async () => { try { await onChange(''); setState('idle'); setMessage('Location removed.'); } catch { setState('error'); setMessage('We could not remove the location. Please try again.'); } }} aria-label="Remove saved map location"><Trash2 aria-hidden="true" /></button>
      </>}
    </div>
    {message && <p className={`location-picker-message location-picker-message--${state}`} role="status" aria-live="polite">{message}</p>}
  </div>;
}
