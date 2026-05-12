import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Scale, Loader2, CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import { PasswordStrengthMeter, getPasswordStrength } from '../components/PasswordStrengthMeter';

const API = process.env.REACT_APP_BACKEND_URL;

// =========== Request reset (forgot password form) ===========
export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Veuillez saisir votre email');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/password-reset/request`, { email });
      setSent(true);
    } catch (err) {
      // Toujours afficher comme si OK (no email enumeration)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-sm flex items-center justify-center">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">AlliéFile</h1>
            <p className="text-sm text-slate-500">Votre allié juridique intelligent</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          {sent ? (
            <CardContent className="pt-6 text-center" data-testid="forgot-success">
              <Mail className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              <h2 className="font-heading text-xl text-slate-900 mb-2">Vérifiez votre boîte mail</h2>
              <p className="text-sm text-slate-600 mb-6">
                Si un compte AlliéFile existe avec cette adresse, vous allez recevoir un lien de réinitialisation valable 1 heure.
              </p>
              <Link to="/login">
                <Button variant="outline" className="rounded-sm" data-testid="forgot-back-login">
                  <ArrowLeft className="w-4 h-4 mr-2" />Retour à la connexion
                </Button>
              </Link>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="font-heading text-xl">Mot de passe oublié ?</CardTitle>
                <CardDescription>Saisissez votre email, nous vous enverrons un lien de réinitialisation.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-sm"
                      data-testid="forgot-email"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 rounded-sm"
                    disabled={loading}
                    data-testid="forgot-submit"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : 'Envoyer le lien'}
                  </Button>
                </form>
                <div className="mt-6 text-center text-sm">
                  <Link to="/login" className="text-sky-600 hover:text-sky-700 font-medium" data-testid="forgot-back-link">
                    Retour à la connexion
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

// =========== Confirm reset (with token from email) ===========
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Lien invalide');
      return;
    }
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (getPasswordStrength(password).score < 2) {
      toast.error('Mot de passe trop faible. Ajoutez majuscules, chiffres ou caractères spéciaux.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/password-reset/confirm`, {
        token,
        new_password: password,
      });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600 mb-4">Lien de réinitialisation manquant ou invalide.</p>
            <Link to="/login"><Button variant="outline">Retour à la connexion</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-sm flex items-center justify-center">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-slate-900">AlliéFile</h1>
            <p className="text-sm text-slate-500">Votre allié juridique intelligent</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          {done ? (
            <CardContent className="pt-6 text-center" data-testid="reset-success">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              <h2 className="font-heading text-xl text-slate-900 mb-2">Mot de passe réinitialisé</h2>
              <p className="text-sm text-slate-600">Redirection vers la connexion...</p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="font-heading text-xl">Nouveau mot de passe</CardTitle>
                <CardDescription>Choisissez un mot de passe robuste.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nouveau mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-sm"
                      data-testid="reset-password"
                    />
                    <PasswordStrengthMeter password={password} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-sm"
                      data-testid="reset-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 rounded-sm"
                    disabled={loading}
                    data-testid="reset-submit"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Réinitialisation...</> : 'Réinitialiser mon mot de passe'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
