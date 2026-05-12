import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Scale, Upload, Sparkles, Share2, Check, ArrowRight, Shield, Clock, FileText, Quote, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';

const TESTIMONIALS = [
  {
    initials: 'MT',
    name: 'Marie T.',
    context: 'Litige locatif',
    quote: "AlliéFile m'a aidée à organiser tous mes échanges avec mon bailleur. La chronologie générée par l'IA m'a fait gagner un temps fou avant le rendez-vous avec mon avocat.",
  },
  {
    initials: 'KB',
    name: 'Karim B.',
    context: 'Procédure de divorce',
    quote: "Pouvoir partager un lien sécurisé à mon avocat avec toutes mes pièces classées, c'est précieux. Plus de pièces jointes éparpillées dans les emails.",
  },
  {
    initials: 'AV',
    name: 'Association AVEF',
    context: 'Accompagnement victimes',
    quote: "Nous l'utilisons pour structurer les dossiers des personnes que nous accompagnons. L'export PDF est nickel, et l'analyse IA repère ce qui manque.",
  },
];

const FAQ = [
  {
    q: 'Puis-je annuler à tout moment ?',
    a: "Oui, sans préavis. L'annulation est immédiate depuis votre tableau de bord, et vous conservez l'accès jusqu'à la fin de votre période de facturation.",
  },
  {
    q: 'Comment fonctionne l\'analyse IA ?',
    a: "Notre IA analyse chaque document que vous déposez et structure automatiquement votre dossier : type de pièce, date, parties, résumé, mots-clés et chronologie. Vous n'avez plus qu'à valider.",
  },
  {
    q: 'Mes documents sont-ils sécurisés ?',
    a: "Oui. Vos documents sont chiffrés et stockés sur des serveurs sécurisés en Europe. Seul vous (et les destinataires que vous choisissez via vos liens de partage) y avez accès.",
  },
];

const Landing = () => {
  const [userCount, setUserCount] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_BACKEND_URL;
    axios.get(`${apiUrl}/api/public/stats`, { timeout: 4000 })
      .then((r) => {
        const n = r?.data?.total_users;
        if (typeof n === 'number' && n > 0) setUserCount(n);
      })
      .catch(() => { /* fallback handled in render */ });
  }, []);

  const plans = [
    {
      name: 'Découverte',
      price: 'Gratuit',
      period: '',
      description: 'Testez AlliéFile sans engagement',
      features: [
        '1 dossier',
        '15 pièces',
        '3 liens de partage',
        'Analyse IA',
        'Export PDF',
        '1 courrier/jour',
      ],
      excluded: [],
      cta: 'Commencer gratuitement',
      ctaLink: '/register',
      style: 'outline',
    },
    {
      name: 'Essentiel',
      price: '14,90€',
      period: '/mois',
      description: 'Gérez votre dossier sereinement',
      features: [
        '5 dossiers',
        '100 pièces par dossier',
        '20 liens de partage',
        'Export PDF + DOCX',
        'Courriers illimités',
        'Tous types de documents',
      ],
      excluded: [],
      cta: 'Choisir ce plan',
      ctaLink: '/register',
      style: 'blue',
      highlighted: true,
    },
    {
      name: 'Sérénité',
      price: '39,90€',
      period: '/mois',
      description: 'Allez au bout sans limite',
      features: [
        'Dossiers illimités',
        'Pièces illimitées',
        'Liens de partage illimités',
        'Stockage 10 Go',
        'Support prioritaire',
        'Accès avant-première nouvelles fonctionnalités',
      ],
      excluded: [],
      cta: 'Choisir ce plan',
      ctaLink: '/register',
      style: 'gold',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-sm flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-lg text-slate-900 tracking-tight">AlliéFile</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" data-testid="landing-login-btn">
                  Se connecter
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm" data-testid="landing-register-btn">
                  Commencer gratuitement
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pb-24 px-4" style={{ paddingTop: '2rem' }} data-testid="landing-hero">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-sky-50 text-sky-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Sécurisé et confidentiel
          </div>
          <div className="mb-8" data-testid="landing-hero-counter">
            {userCount !== null ? (
              <span className="text-sm text-slate-500">
                Déjà <strong className="text-slate-900">{userCount.toLocaleString('fr-FR')}</strong> personnes nous font confiance.
              </span>
            ) : (
              <span className="text-sm text-slate-400">Rejoignez notre communauté.</span>
            )}
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
            Constituez votre dossier juridique en quelques minutes
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AlliéFile analyse vos documents, génère votre chronologie et prépare vos courriers. 
            Conçu pour les particuliers accompagnés par des professionnels.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 h-12 text-base rounded-sm shadow-lg shadow-red-600/20" data-testid="landing-cta-hero">
                Essayer gratuitement — sans carte bancaire
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-20 bg-slate-50 px-4" data-testid="landing-how-it-works">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-16">
            Comment ça marche
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: Upload,
                title: 'Déposez vos documents',
                desc: 'Déposez vos pièces justificatives : contrats, factures, courriers, photos. Tous les formats sont acceptés.',
              },
              {
                step: '2',
                icon: Sparkles,
                title: 'L\'IA analyse et structure',
                desc: 'Notre intelligence artificielle identifie chaque document, propose un classement et génère votre chronologie des faits.',
              },
              {
                step: '3',
                icon: Share2,
                title: 'Exportez et partagez',
                desc: 'Exportez votre dossier en PDF, générez un lien de partage sécurisé pour votre avocat ou votre association.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <item.icon className="w-6 h-6 text-slate-700" />
                </div>
                <div className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-2">Étape {item.step}</div>
                <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-20 px-4 bg-white" data-testid="landing-testimonials">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
            Ils utilisent AlliéFile
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <figure
                key={i}
                className="relative bg-slate-50 border border-slate-200 rounded-sm p-6 flex flex-col"
                data-testid={`landing-testimonial-${i}`}
              >
                <div className="text-amber-400 text-base mb-3" aria-label="5 étoiles sur 5">★★★★★</div>
                <Quote className="w-5 h-5 text-sky-500 mb-3" />
                <blockquote className="text-sm text-slate-700 leading-relaxed flex-1">
                  « {t.quote} »
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 pt-4 border-t border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.context}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-16">
            Pourquoi AlliéFile
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: 'Gain de temps', desc: 'Automatisez le classement et l\'analyse de vos documents juridiques.' },
              { icon: Shield, title: 'Données sécurisées', desc: 'Vos documents sont chiffrés et stockés de manière sécurisée dans le cloud.' },
              { icon: FileText, title: 'Dossier structuré', desc: 'Chronologie, bordereau, exposé des faits : tout est généré automatiquement.' },
              { icon: Share2, title: 'Partage simple', desc: 'Envoyez un lien sécurisé à votre avocat, il accède directement à votre dossier.' },
              { icon: Sparkles, title: 'IA juridique', desc: 'L\'intelligence artificielle identifie vos documents et propose un classement pertinent.' },
              { icon: Scale, title: 'Fait pour vous', desc: 'Conçu pour les particuliers, même sans connaissance juridique.' },
            ].map((item, i) => (
              <div key={i} className="p-5 border border-slate-200 rounded-sm hover:border-slate-300 transition-colors">
                <item.icon className="w-5 h-5 text-sky-600 mb-3" />
                <h3 className="font-heading font-semibold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-20 bg-slate-50 px-4" id="pricing" data-testid="landing-pricing">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">
            Tarifs simples et transparents
          </h2>
          <p className="text-center text-slate-600 mb-12">Sans engagement. Annulez à tout moment.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`bg-white rounded-sm border-2 p-6 flex flex-col ${
                  plan.highlighted ? 'border-sky-500 shadow-lg shadow-sky-500/10 relative' : 'border-slate-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Populaire
                  </div>
                )}
                <h3 className="font-heading font-bold text-lg text-slate-900">{plan.name}</h3>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  {plan.period && <span className="text-slate-500 text-sm">{plan.period}</span>}
                </div>
                <p className="text-sm text-slate-500 mb-6">{plan.description}</p>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.excluded.map((f, j) => (
                    <li key={`ex-${j}`} className="flex items-start gap-2 text-sm text-slate-400 line-through">
                      <span className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.ctaLink}>
                  <Button
                    className={`w-full rounded-sm ${
                      plan.style === 'outline'
                        ? 'bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900'
                        : plan.style === 'gold'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                    }`}
                    data-testid={`landing-plan-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-white" data-testid="landing-faq">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
            Questions fréquentes
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="border border-slate-200 rounded-sm overflow-hidden bg-white"
                data-testid={`landing-faq-${i}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  data-testid={`landing-faq-toggle-${i}`}
                >
                  <span className="font-semibold text-slate-900 text-sm">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            Prêt à organiser votre dossier ?
          </h2>
          <p className="text-slate-600 mb-8" data-testid="landing-counter">
            {userCount !== null
              ? `Déjà ${userCount.toLocaleString('fr-FR')} personnes nous font confiance.`
              : 'Rejoignez notre communauté.'}
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 h-12 text-base rounded-sm">
              Créer mon compte gratuitement
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4" data-testid="landing-footer">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-white/10 rounded-sm flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-heading font-bold text-lg">AlliéFile</span>
              </div>
              <p className="text-sm text-slate-400 max-w-xs">
                Votre allié juridique intelligent. Constituez, organisez et partagez vos dossiers en toute simplicité.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <h4 className="font-semibold text-sm mb-3">Produit</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                  <li><Link to="/login" className="hover:text-white transition-colors">Se connecter</Link></li>
                  <li><Link to="/register" className="hover:text-white transition-colors">S'inscrire</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Légal</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link to="/cgu" className="hover:text-white transition-colors">CGU</Link></li>
                  <li><Link to="/privacy" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Contact</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="mailto:contact@alliefile.com" className="hover:text-white transition-colors">contact@alliefile.com</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} AlliéFile. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
