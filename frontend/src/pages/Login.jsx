import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Scale, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Connexion réussie');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <a href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-sm flex items-center justify-center">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
              Dossier Juridique
            </h1>
            <p className="text-sm text-slate-500">Intelligent</p>
          </div>
        </a>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="font-heading text-xl">Connexion</CardTitle>
            <CardDescription>
              Accédez à votre espace de gestion de dossiers
            </CardDescription>
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
                  data-testid="login-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-sm"
                  data-testid="login-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 rounded-sm"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-500">Pas encore de compte ? </span>
              <Link
                to="/register"
                className="text-sky-600 hover:text-sky-700 font-medium"
                data-testid="register-link"
              >
                Créer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
