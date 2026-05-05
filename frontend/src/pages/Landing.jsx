import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import {
  FileText,
  Upload,
  Share2,
  Lock,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Crown,
  Star,
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/public/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="pt-8 pb-16 md:pt-12 md:pb-24">
          <div className="max-w-6xl mx-auto px-4">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="mb-6">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  ✨ Nouvel assistant juridique 2026
                </Badge>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Constituez votre dossier juridique en quelques minutes
              </h1>

              {/* Subheading */}
              <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl">
                AlliéFile analyse vos documents, génère votre chronologie et prépare vos courriers. Conçu pour les particuliers accompagnés par des professionnels.
              </p>

              {/* Stats Counter */}
              {!loadingStats && stats && (
                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200 inline-block">
                  <p className="text-sm text-slate-600">
                    <strong className="text-slate-900">{stats.total_dossiers.toLocaleString('fr-FR')}</strong> dossiers créés • 
                    <strong className="text-slate-900 ml-2">{stats.total_users.toLocaleString('fr-FR')}</strong> utilisateurs
                  </p>
                </div>
              )}

              {/* Trust Badge */}
              <div className="mb-8 flex items-center gap-2 text-sm text-slate-600">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Sécurisé et confidentiel • Chiffrement AES-256</span>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-8 py-6 text-base font-medium"
                  onClick={() => navigate('/register')}
                >
                  Essayer gratuitement — sans carte bancaire
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-300 text-slate-900 hover:bg-slate-50 rounded-sm px-8 py-6 text-base font-medium"
                  onClick={() => navigate('/pricing')}
                >
                  Voir les tarifs
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
              Comment ça marche
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Déposez vos documents</h3>
                <p className="text-slate-600">
                  Uploadez PDF, images, emails et documents Word. AlliéFile accepte tous les formats.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">L'IA analyse et structure</h3>
                <p className="text-slate-600">
                  Notre moteur d'IA extrait les dates clés, les faits pertinents et génère une chronologie.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Exportez et partagez</h3>
                <p className="text-slate-600">
                  Exportez en PDF/DOCX et partagez avec votre avocat via lien sécurisé.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
              Fonctionnalités principales
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <Card className="border-slate-200">
                <CardHeader>
                  <FileText className="w-8 h-8 text-blue-600 mb-2" />
                  <CardTitle className="text-lg">Analyse IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Extraction automatique de dates, faits et arguments juridiques.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border-slate-200">
                <CardHeader>
                  <FileText className="w-8 h-8 text-blue-600 mb-2" />
                  <CardTitle className="text-lg">Chronologie</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Génération automatique d'une timeline claire et structurée.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border-slate-200">
                <CardHeader>
                  <Share2 className="w-8 h-8 text-blue-600 mb-2" />
                  <CardTitle className="text-lg">Partage sécurisé</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Liens temporaires et révocables pour partager avec votre avocat.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="border-slate-200">
                <CardHeader>
                  <Lock className="w-8 h-8 text-blue-600 mb-2" />
                  <CardTitle className="text-lg">Sécurité</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Chiffrement AES-256, hébergement France, conforme RGPD.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
              Témoignages
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <Card className="border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-4">
                    "AlliéFile m'a fait gagner des heures de tri documentaire. Mon dossier était prêt en une journée."
                  </p>
                  <p className="font-semibold text-slate-900">Marie D.</p>
                  <p className="text-sm text-slate-500">Particulière en litige</p>
                </CardContent>
              </Card>

              {/* Testimonial 2 */}
              <Card className="border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-4">
                    "Mes clients arrivent maintenant avec des dossiers structurés. Cela accélère mon travail."
                  </p>
                  <p className="font-semibold text-slate-900">Maître Jean L.</p>
                  <p className="text-sm text-slate-500">Avocat</p>
                </CardContent>
              </Card>

              {/* Testimonial 3 */}
              <Card className="border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-4">
                    "L'interface est intuitive et la sécurité est rassurante. Je recommande vivement."
                  </p>
                  <p className="font-semibold text-slate-900">Sophie M.</p>
                  <p className="text-sm text-slate-500">Utilisatrice Premium</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
              Plans de tarification
            </h2>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* Free Plan */}
              <Card className="border-2 border-slate-200">
                <CardHeader>
                  <CardTitle className="text-xl">Découverte</CardTitle>
                  <CardDescription>Pour commencer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">0€</span>
                    <span className="text-slate-500">/mois</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      1 dossier
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      10 pièces
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Export PDF
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full border-slate-900 text-slate-900 hover:bg-slate-50 rounded-sm"
                    onClick={() => navigate('/register')}
                  >
                    Commencer gratuitement
                  </Button>
                </CardFooter>
              </Card>

              {/* Standard Plan */}
              <Card className="border-2 border-blue-400 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white">Populaire</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    Essentiel
                  </CardTitle>
                  <CardDescription>Pour les particuliers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">14,90€</span>
                    <span className="text-slate-500">/mois</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      5 dossiers
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      100 pièces
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Export DOCX
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 rounded-sm"
                    onClick={() => navigate('/pricing')}
                  >
                    Choisir ce plan
                  </Button>
                </CardFooter>
              </Card>

              {/* Premium Plan */}
              <Card className="border-2 border-amber-400">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    Pro
                  </CardTitle>
                  <CardDescription>Pour les professionnels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">39,90€</span>
                    <span className="text-slate-500">/mois</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Dossiers illimités
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Pièces illimitées
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Partage avancé
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 rounded-sm"
                    onClick={() => navigate('/pricing')}
                  >
                    Choisir ce plan
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* FAQ Section */}
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                Questions fréquentes sur les tarifs
              </h3>
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left font-semibold">
                    Puis-je annuler à tout moment ?
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    Oui, vous pouvez annuler votre abonnement à tout moment sans préavis. Aucune pénalité.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left font-semibold">
                    Comment fonctionne l'analyse IA ?
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    Claude analyse vos documents et les structure automatiquement en extrayant les dates, faits et arguments clés. Le tout est ensuite organisé chronologiquement.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left font-semibold">
                    Mes documents sont-ils sécurisés ?
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    Oui, tous vos documents sont chiffrés avec AES-256 et stockés en Europe. Nous respectons le RGPD et les normes ISO 27001.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Prêt à simplifier vos démarches juridiques ?
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Commencez gratuitement, sans carte bancaire. Aucun engagement.
            </p>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100 rounded-sm px-8 py-6 text-base font-medium"
              onClick={() => navigate('/register')}
            >
              Créer mon compte gratuitement
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default LandingPage;
