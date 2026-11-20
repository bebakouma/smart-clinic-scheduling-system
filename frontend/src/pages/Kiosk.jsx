import React, { useEffect, useState } from 'react';
import { kioskService } from '../services/api';

// Patient self check-in kiosk (Task 23). Shown full screen on a tablet in the
// waiting room, outside the staff layout.
//
// Flow: enter code + date of birth -> confirm the appointment -> checked in.
// The screen clears itself after every patient so the next person never sees
// the previous patient's details.

const SUCCESS_RESET_MS = 8000;   // back to the start after a successful check-in
const CONFIRM_TIMEOUT_MS = 30000; // walk-away protection on the confirm screen

function friendlyError(err) {
  if (err.status === 409) {
    return /already checked in/i.test(err.message)
      ? 'You are already checked in. Please take a seat.'
      : "This appointment can't be checked in here. Please see the front desk.";
  }
  if (err.status === 404 || err.status === 429) return err.message;
  if (err.status === 400) return 'Please enter your check-in code and date of birth.';
  return 'Something went wrong. Please see the front desk.';
}

function formatAppointmentTime(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function Kiosk() {
  const [step, setStep] = useState('entry'); // entry | confirm | success
  const [code, setCode] = useState('');
  const [dob, setDob] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Clear everything and return to the start screen.
  const reset = () => {
    setStep('entry');
    setCode('');
    setDob('');
    setAppointment(null);
    setError('');
    setBusy(false);
  };

  // Automatically return to the start after success, or if someone walks away
  // from the confirm screen.
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(reset, SUCCESS_RESET_MS);
      return () => clearTimeout(timer);
    }
    if (step === 'confirm') {
      const timer = setTimeout(reset, CONFIRM_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step]);

  const handleLookup = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await kioskService.lookup(code, dob);
      setAppointment(result);
      setStep('confirm');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await kioskService.checkIn(code, dob);
      setAppointment(result);
      setStep('success');
    } catch (err) {
      // Send the patient back to the start with the reason shown.
      const message = friendlyError(err);
      reset();
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-blue-700">Smart Clinic</h1>
        <p className="text-xl text-gray-600 mt-2">Patient Check-In</p>
      </header>

      <main className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8">
        {error && (
          <div role="alert" className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-lg text-red-700">
            {error}
          </div>
        )}

        {step === 'entry' && (
          <form onSubmit={handleLookup} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-xl font-medium text-gray-800 mb-2">
                Check-in code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={12}
                required
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-4 text-3xl tracking-widest uppercase focus:border-blue-500 focus:outline-none"
                placeholder="ABCD2345"
              />
              <p className="text-gray-500 mt-2">It is in your appointment reminder.</p>
            </div>

            <div>
              <label htmlFor="dob" className="block text-xl font-medium text-gray-800 mb-2">
                Date of birth
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                autoComplete="off"
                required
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-4 text-2xl focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !code || !dob}
              className="w-full rounded-xl bg-blue-600 py-5 text-2xl font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Looking up...' : 'Find my appointment'}
            </button>
          </form>
        )}

        {step === 'confirm' && appointment && (
          <div className="text-center space-y-6">
            <p className="text-3xl font-semibold text-gray-800">Hello, {appointment.first_name}</p>
            <p className="text-xl text-gray-600">Your appointment is</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatAppointmentTime(appointment.appointment_datetime)}
            </p>
            <div className="space-y-4 pt-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="w-full rounded-xl bg-green-600 py-5 text-2xl font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Checking in...' : 'Yes, check me in'}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="w-full rounded-xl border-2 border-gray-300 py-4 text-xl text-gray-700"
              >
                This is not me
              </button>
            </div>
          </div>
        )}

        {step === 'success' && appointment && (
          <div className="text-center space-y-4" role="status">
            <p className="text-6xl">✅</p>
            <p className="text-3xl font-bold text-green-700">You are checked in, {appointment.first_name}</p>
            <p className="text-xl text-gray-600">Please take a seat. We will call you shortly.</p>
          </div>
        )}
      </main>
    </div>
  );
}
