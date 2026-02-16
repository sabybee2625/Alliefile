import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { userApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Check, 
  X, 
  Loader2, 
  CreditCard, 
  Shield, 
  Zap, 
  Crown,
  ArrowLeft,
  Percent,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const PricingPage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(null);
  
  // Check for payment success/cancel
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const status = searchParams.get('status');
    
    if (sessionId && status === 'success') {
      checkPaymentStatus(sessionId);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await userApi.getPlans();
      setPlans(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des plans');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await userApi.checkPaymentStatus(sessionId);
      if (response.data.status === 'paid') {
        toast.success(response.data.message);
        refreshUser?.();
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    }
  };

  const validatePromo = async (planId) => {
    if (!promoCode.trim()) {
      setPromoValidation(null);
      return;
    }
    
    setValidatingPromo(true);
    try {
      const response = await userApi.validatePromoCode(promoCode, planId);
      setPromoValidation({
        valid: true,
        ...response.data
      });
      toast.success('Code promo valide !');
    } catch (error) {
      setPromoValidation({
        valid: false,
        error: error.response?.data?.detail || 'Code invalide'
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }
    
    setProcessingPayment(planId);
    try {
      const response = await userApi.createCheckout(
        planId,
        billingPeriod,
        promoCode || null
      );
      
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du paiement');
      setProcessingPayment(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const getCurrentPlan = () => {
    return user?.plan || 'free';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au tableau de bord
          </Button>
          
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Organisez et analysez vos dossiers juridiques avec l'aide de l'IA.
            Choisissez le plan adapté à vos besoins.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <Tabs value={billingPeriod} onValueChange={setBillingPeriod}>
            <TabsList>
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly" className="relative">
                Annuel
                <Badge className="ml-2 bg-emerald-500 text-white text-xs">-17%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Free Plan */}
          <Card className={`border-2 ${getCurrentPlan() === 'free' ? 'border-slate-400' : 'border-slate-200'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Gratuit</CardTitle>
                {getCurrentPlan() === 'free' && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    Plan actuel
                  </Badge>
                )}
              </div>
              <CardDescription>Pour découvrir l'application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">0€</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  1 dossier
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  20 pièces maximum
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  3 liens de partage
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Export PDF
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  1 génération assistant/jour
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <X className="w-4 h-4" />
                  Export DOCX
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <X className="w-4 h-4" />
                  Partage avancé
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full rounded-sm"
                disabled={getCurrentPlan() === 'free'}
              >
                {getCurrentPlan() === 'free' ? 'Plan actuel' : 'Rétrograder'}
              </Button>
            </CardFooter>
          </Card>

          {/* Standard Plan */}
          {plans?.plans?.standard && (
            <Card className={`border-2 ${getCurrentPlan() === 'standard' ? 'border-blue-400' : 'border-slate-200'} relative`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">Populaire</Badge>
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    Standard
                  </CardTitle>
                  {getCurrentPlan() === 'standard' && (
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      Plan actuel
                    </Badge>
                  )}
                </div>
                <CardDescription>Pour les particuliers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {formatPrice(billingPeriod === 'yearly' 
                      ? plans.plans.standard.price_yearly / 12 
                      : plans.plans.standard.price_monthly
                    )}
                  </span>
                  <span className="text-slate-500">/mois</span>
                  {billingPeriod === 'yearly' && (
                    <p className="text-sm text-emerald-600">
                      Facturé {formatPrice(plans.plans.standard.price_yearly)}/an
                    </p>
                  )}
                </div>
                <ul className="space-y-3">
                  {plans.plans.standard.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-sm"
                  onClick={() => handleSubscribe('standard')}
                  disabled={processingPayment === 'standard' || getCurrentPlan() === 'standard'}
                >
                  {processingPayment === 'standard' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {getCurrentPlan() === 'standard' ? 'Plan actuel' : 'Choisir ce plan'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Premium Plan */}
          {plans?.plans?.premium && (
            <Card className={`border-2 ${getCurrentPlan() === 'premium' ? 'border-amber-400' : 'border-slate-200'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    Premium
                  </CardTitle>
                  {getCurrentPlan() === 'premium' && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Plan actuel
                    </Badge>
                  )}
                </div>
                <CardDescription>Pour les professionnels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {formatPrice(billingPeriod === 'yearly' 
                      ? plans.plans.premium.price_yearly / 12 
                      : plans.plans.premium.price_monthly
                    )}
                  </span>
                  <span className="text-slate-500">/mois</span>
                  {billingPeriod === 'yearly' && (
                    <p className="text-sm text-emerald-600">
                      Facturé {formatPrice(plans.plans.premium.price_yearly)}/an
                    </p>
                  )}
                </div>
                <ul className="space-y-3">
                  {plans.plans.premium.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 rounded-sm"
                  onClick={() => handleSubscribe('premium')}
                  disabled={processingPayment === 'premium' || getCurrentPlan() === 'premium'}
                >
                  {processingPayment === 'premium' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4 mr-2" />
                  )}
                  {getCurrentPlan() === 'premium' ? 'Plan actuel' : 'Choisir ce plan'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Promo Code Section */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Code promotionnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Entrez votre code"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoValidation(null);
                }}
                className="rounded-sm"
              />
              <Button
                variant="outline"
                onClick={() => validatePromo('standard')}
                disabled={validatingPromo || !promoCode.trim()}
                className="rounded-sm"
              >
                {validatingPromo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Valider'
                )}
              </Button>
            </div>
            {promoValidation && (
              <div className={`mt-3 p-3 rounded-sm ${
                promoValidation.valid 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {promoValidation.valid ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {promoValidation.discount_percent > 0 
                        ? `${promoValidation.discount_percent}% de réduction`
                        : `${formatPrice(promoValidation.discount_amount)} de réduction`
                      }
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{promoValidation.error}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Shield className="w-5 h-5" />
            <span>Paiement sécurisé par Stripe</span>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Annulez à tout moment. Vos données restent confidentielles.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default PricingPage;
