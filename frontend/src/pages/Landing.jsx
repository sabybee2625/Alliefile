import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Scale, ShieldCheck, Sparkles, FileText, UserRound,
  Check, X, Quote, ChevronDown, Clock, Calendar, Brain,
} from 'lucide-react';

const NAVY = '#1E3A5F';
const NAVY_DEEP = '#0F172A';
const GOLD = '#B8960C';
const CTA_RED = '#DC2626';

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
    q: "Comment fonctionne l'analyse IA ?",
    a: "Notre IA analyse chaque document que vous déposez et structure automatiquement votre dossier : type de pièce, date, parties, résumé, mots-clés et chronologie. Vous n'avez plus qu'à valider.",
  },
  {
    q: 'Mes documents sont-ils sécurisés ?',
    a: "Oui. Vos documents sont chiffrés et stockés sur des serveurs sécurisés en Europe. Seul vous (et les destinataires que vous choisissez via vos liens de partage) y avez accès.",
  },
];

const PAINS = [
  'Des dizaines de PDF, captures et mails éparpillés sur 3 appareils différents.',
  "Vous perdez du temps à chercher LA pièce que votre avocat vous demande, en pleine procédure.",
  "Vous payez votre avocat à l'heure pour qu'il trie ce que vous auriez pu organiser vous-même.",
];

const SOLUTIONS = [
  'Tous vos documents au même endroit, classés automatiquement par l\'IA.',
  "Une chronologie claire et un exposé des faits prêt à l'emploi en 5 minutes.",
  "Un lien sécurisé à envoyer à votre avocat : il a tout, sans aller-retours d'emails.",
];

const SAVINGS = [
  {
    icon: Clock,
    title: 'Moins d\'heures facturées',
    desc: "Votre avocat n'a plus à trier vos pièces : il facture du conseil, pas du classement.",
  },
  {
    icon: Calendar,
    title: 'Rendez-vous mieux préparés',
    desc: "Vous arrivez avec un dossier structuré, vous gagnez du temps et vous êtes plus crédible.",
  },
  {
    icon: Brain,
    title: 'Charge mentale réduite',
    desc: "Plus de panique à 23h pour retrouver une attestation. Tout est là, prêt à être consulté.",
  },
];

const STEPS = [
  { n: '01', title: 'Déposez vos documents', desc: 'PDF, photos, captures, courriers… tout est accepté.' },
  { n: '02', title: 'L\'IA structure votre dossier', desc: 'Type, date, parties, résumé, chronologie : automatique.' },
  { n: '03', title: 'Partagez à votre avocat', desc: 'Un lien sécurisé, et il accède au dossier complet.' },
];

const PLANS = [
  {
    name: 'Découverte',
    price: 'Gratuit',
    period: '',
    description: 'Testez AlliéFile sans engagement',
    features: ['1 dossier', '15 pièces', '3 liens de partage', 'Analyse IA', 'Un courrier d\'exposé des faits'],
    border: 'border-slate-300',
    cta: 'Commencer gratuitement',
    btnClass: 'bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900',
    style: 'free',
  },
  {
    name: 'Essentiel',
    price: '14,90€',
    period: '/mois',
    description: 'Gérez votre dossier sereinement',
    features: ['5 dossiers', '100 pièces par dossier', '20 liens de partage', 'Export PDF + DOCX', 'Courriers illimités', 'Tous types de documents'],
    border: '',
    cta: 'Choisir ce plan',
    btnClass: 'text-white',
    btnStyle: { backgroundColor: NAVY },
    style: 'essentiel',
    badge: 'Populaire',
  },
  {
    name: 'Sérénité',
    price: '39,90€',
    period: '/mois',
    description: 'Allez au bout sans limite',
    features: ['Dossiers illimités', 'Pièces illimitées', 'Liens de partage illimités', 'Stockage 10 Go', 'Support prioritaire', 'Accès avant-première'],
    border: '',
    cta: 'Choisir ce plan',
    btnClass: 'text-white',
    btnStyle: { backgroundColor: GOLD },
    style: 'serenite',
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
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200" data-testid="landing-header">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-sm flex items-center justify-center" style={{ backgroundColor: NAVY_DEEP }}>
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-lg text-slate-900">AlliéFile</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2" data-testid="landing-login-btn">
              Connexion
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-white px-4 py-2 rounded-sm hover:opacity-90"
              style={{ backgroundColor: CTA_RED }}
              data-testid="landing-register-btn"
            >
              Commencer
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO */}
      <section className="px-4 pt-12 pb-20 bg-white" data-testid="landing-hero">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sécurisé et confidentiel
          </div>
          <div className="mb-6" data-testid="landing-hero-counter">
            {userCount !== null ? (
              <span className="text-sm text-slate-500">
                Déjà <strong className="text-slate-900">{userCount.toLocaleString('fr-FR')}</strong> personnes nous font confiance.
              </span>
            ) : (
              <span className="text-sm text-slate-400">Rejoignez notre communauté.</span>
            )}
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Votre dossier juridique,<br />
            <span style={{ color: NAVY }}>enfin organisé</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            Divorce, litige locatif, procédure contre une administration… On en sort rarement indemne, et on s'épuise à <strong className="text-slate-900">tout garder en tête</strong>. AlliéFile prend le relais et organise votre dossier <strong className="text-slate-900">à votre place</strong>.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-sm text-base hover:opacity-90 shadow-sm"
            style={{ backgroundColor: CTA_RED }}
            data-testid="landing-cta-hero"
          >
            Commencer gratuitement
          </Link>
          <p className="text-xs text-slate-400 mt-4">Sans carte bancaire. Sans engagement.</p>
        </div>
      </section>

      {/* 2. BANDE BLEU MARINE — 4 ÉLÉMENTS */}
      <section className="py-10 px-4" style={{ backgroundColor: NAVY }} data-testid="landing-trust">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {[
            { icon: UserRound, label: 'Conçu pour les particuliers' },
            { icon: Sparkles, label: 'IA juridique' },
            { icon: ShieldCheck, label: 'Données chiffrées' },
            { icon: FileText, label: 'Export PDF avocat' },
          ].map((it, i) => {
            const Icon = it.icon;
            return (
              <div key={i} className="flex flex-col items-center gap-2" data-testid={`landing-trust-${i}`}>
                <Icon className="w-7 h-7" strokeWidth={1.5} />
                <span className="text-sm font-medium leading-tight">{it.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. PROBLÈME / SOLUTION */}
      <section className="py-20 px-4 bg-white" data-testid="landing-problem-solution">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12">
            Si vous avez déjà géré un dossier juridique…
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 mb-5">Ce que vous vivez</h3>
              <ul className="space-y-3">
                {PAINS.map((p, i) => (
                  <li
                    key={i}
                    className="flex gap-3 items-start bg-red-50 border border-red-100 rounded-sm p-4"
                    data-testid={`landing-pain-${i}`}
                  >
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-sm text-slate-700 leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 mb-5">Avec AlliéFile</h3>
              <ul className="space-y-3">
                {SOLUTIONS.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-3 items-start bg-emerald-50 border border-emerald-100 rounded-sm p-4"
                    data-testid={`landing-solution-${i}`}
                  >
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-sm text-slate-700 leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ÉCONOMIE RÉELLE */}
      <section className="py-20 px-4 bg-slate-50" data-testid="landing-savings">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-3">
            Ce que vous économisez vraiment
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            AlliéFile ne remplace pas votre avocat. Il fait en sorte que vous ne payiez plus pour ce que vous pouvez faire vous-même.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {SAVINGS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-sm p-6"
                  data-testid={`landing-saving-${i}`}
                >
                  <Icon className="w-7 h-7 mb-4" style={{ color: NAVY }} strokeWidth={1.5} />
                  <h3 className="font-heading font-semibold text-lg text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. 3 ÉTAPES */}
      <section className="py-20 px-4 bg-white" data-testid="landing-steps">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12">
            Comment ça marche
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center" data-testid={`landing-step-${i}`}>
                <div
                  className="font-heading font-bold text-5xl mb-3 leading-none"
                  style={{ color: GOLD }}
                >
                  {s.n}
                </div>
                <h3 className="font-heading font-semibold text-lg text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TÉMOIGNAGES */}
      <section className="py-20 px-4 bg-slate-50" data-testid="landing-testimonials">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12">
            Ils utilisent AlliéFile
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <figure
                key={i}
                className="relative bg-white border border-slate-200 rounded-sm p-6 flex flex-col"
                data-testid={`landing-testimonial-${i}`}
              >
                <div className="text-base mb-3" style={{ color: GOLD }} aria-label="5 étoiles sur 5">★★★★★</div>
                <Quote className="w-5 h-5 mb-3" style={{ color: NAVY }} />
                <blockquote className="text-sm text-slate-700 leading-relaxed flex-1">
                  « {t.quote} »
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 pt-4 border-t border-slate-200">
                  <div
                    className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: NAVY }}
                  >
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

      {/* 7. TARIFS + FAQ */}
      <section className="py-20 px-4 bg-white" data-testid="landing-pricing">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-3">
            Des tarifs à votre image
          </h2>
          <p className="text-center text-slate-600 mb-12">Commencez gratuitement, payez seulement si vous en avez besoin.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((p) => {
              const borderStyle =
                p.style === 'essentiel'
                  ? { borderColor: NAVY }
                  : p.style === 'serenite'
                  ? { borderColor: GOLD }
                  : {};
              return (
                <div
                  key={p.name}
                  className={`relative bg-white border-2 ${p.border || ''} rounded-sm p-7 flex flex-col`}
                  style={borderStyle}
                  data-testid={`landing-plan-card-${p.style}`}
                >
                  {p.badge && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: NAVY }}
                    >
                      {p.badge}
                    </div>
                  )}
                  <h3 className="font-heading font-bold text-xl text-slate-900 mb-1">{p.name}</h3>
                  <p className="text-xs text-slate-500 mb-5">{p.description}</p>
                  <div className="mb-6">
                    <span className="font-heading text-4xl font-bold text-slate-900">{p.price}</span>
                    {p.period && <span className="text-slate-500 text-sm ml-1">{p.period}</span>}
                  </div>
                  <ul className="space-y-2 mb-7 flex-1">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`w-full inline-flex items-center justify-center px-4 py-2.5 rounded-sm text-sm font-semibold hover:opacity-90 ${p.btnClass}`}
                    style={p.btnStyle || {}}
                    data-testid={`landing-plan-${p.style}`}
                  >
                    {p.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto" data-testid="landing-faq">
            <h3 className="font-heading text-2xl font-bold text-slate-900 text-center mb-8">
              Questions fréquentes
            </h3>
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
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed">{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA FINAL */}
      <section className="py-20 px-4" style={{ backgroundColor: NAVY }} data-testid="landing-final-cta">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-5 leading-tight">
            Ne laissez plus vos droits dépendre<br />
            d'un tiroir en désordre.
          </h2>
          <p className="text-slate-200 mb-8 max-w-xl mx-auto leading-relaxed">
            Quelques minutes pour structurer votre dossier. Des heures économisées chez votre avocat.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-sm text-base hover:opacity-90 shadow-lg"
            style={{ backgroundColor: CTA_RED }}
            data-testid="landing-cta-final"
          >
            Commencer gratuitement
          </Link>
          <p className="text-xs text-slate-300 mt-4">Sans carte bancaire. Annulation à tout moment.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-10 text-slate-400 text-sm" style={{ backgroundColor: NAVY_DEEP }} data-testid="landing-footer">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-white/10">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">AlliéFile</span>
            <span className="text-slate-500 hidden sm:inline">— Votre allié juridique intelligent</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <Link to="/pricing" className="hover:text-white" data-testid="footer-pricing-link">Tarifs</Link>
            <Link to="/login" className="hover:text-white" data-testid="footer-login-link">Connexion</Link>
            <Link to="/cgu" className="hover:text-white" data-testid="footer-cgu-link">CGU</Link>
            <Link to="/privacy" className="hover:text-white" data-testid="footer-privacy-link">Confidentialité</Link>
            <span className="text-slate-500">© {new Date().getFullYear()} AlliéFile</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
