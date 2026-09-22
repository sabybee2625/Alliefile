import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Mail, Loader2, LogOut } from 'lucide-react';

export default function VerifyEmail() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user && user.email_verified) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      toast.error('Entrez un code à 6 chiffres.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.verifyOtp(trimmed);
      toast.success('Email vérifié — votre compte est activé.');
      if (refresh) await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Code invalide.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendOtp();
      toast.success('Nouveau code envoyé — vérifiez votre boîte de réception.');
      setCode('');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : "Impossible d'envoyer le code.");
    } finally {
      setResending(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" data-testid="verify-email-page">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-md p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <Mail className="w-6 h-6 text-slate-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center">Vérifiez votre email</h1>
          <p className="text-sm text-slate-500 text-center mt-2">
            Nous avons envoyé un code à 6 chiffres à<br />
            <span className="font-medium text-slate-700">{user?.email || 'votre adresse'}</span>.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="otp-code">
                Code de vérification
              </label>
              <Input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="\d{6}"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-xl tracking-widest font-mono"
                data-testid="otp-input"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800"
              disabled={submitting || code.length !== 6}
              data-testid="otp-submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification…
                </>
              ) : (
                'Activer mon compte'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-500">Vous n'avez pas reçu le code ? </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-slate-900 font-medium hover:underline disabled:opacity-50"
              data-testid="otp-resend"
            >
              {resending ? 'Envoi…' : 'Renvoyer'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"
              data-testid="otp-logout"
            >
              <LogOut className="w-3 h-3" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
