import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../lib/api';
import { toast } from 'sonner';
import { CreditCard, Loader2, User as UserIcon, Mail } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isFree = !user?.plan || user.plan === 'free';
  const hasStripeCustomer = Boolean(user?.has_stripe_customer);
  const canManageSubscription = !isFree && hasStripeCustomer;

  const handleOpenPortal = async () => {
    setLoading(true);
    try {
      const res = await userApi.createPortalSession();
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Réponse invalide du serveur.");
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Impossible d'ouvrir le portail Stripe.";
      toast.error(typeof msg === 'string' ? msg : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="settings-page">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres du profil</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez vos informations et votre abonnement.</p>
        </div>

        {/* Compte */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserIcon className="w-5 h-5 text-slate-500" />
              Mon compte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 w-24">Nom</span>
              <span className="text-slate-900 font-medium" data-testid="settings-name">{user?.name || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 w-24">Email</span>
              <span className="text-slate-900 font-medium" data-testid="settings-email">{user?.email || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 w-24">Plan actuel</span>
              <span className="text-slate-900 font-medium capitalize" data-testid="settings-plan">
                {user?.plan || 'free'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Abonnement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-slate-500" />
              Abonnement
            </CardTitle>
            <CardDescription>
              Mettez à jour votre moyen de paiement, téléchargez vos factures ou résiliez votre abonnement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManageSubscription ? (
              <Button
                onClick={handleOpenPortal}
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800"
                data-testid="manage-subscription-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ouverture…
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Gérer mon abonnement
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3" data-testid="no-subscription-message">
                <p className="text-sm text-slate-500 italic">
                  Aucun abonnement actif associé à ce compte
                </p>
                {isFree && (
                  <Link to="/pricing">
                    <Button variant="outline" size="sm" data-testid="view-plans-btn">
                      Voir les plans disponibles
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
