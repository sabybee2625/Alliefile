import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TITLE_STYLE = { color: '#1E3A5F', fontFamily: '"Playfair Display", serif' };
const BODY_STYLE = { color: '#374151' };

export default function CGU() {
  return (
    <div className="min-h-screen bg-white" data-testid="cgu-page">
      <header className="max-w-3xl mx-auto px-6 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
      </header>

      <main
        className="max-w-3xl mx-auto"
        style={{ ...BODY_STYLE, padding: '40px', maxWidth: '800px' }}
      >
        <h1 className="text-3xl font-bold mb-2" style={TITLE_STYLE}>
          Conditions générales d'utilisation
        </h1>
        <p className="text-sm text-slate-500 mb-8">Dernière mise à jour : 7 mai 2026</p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 1 — Objet
        </h2>
        <p className="mb-2">
          Les présentes CGU régissent l'accès et l'utilisation de la plateforme AlliéFile,
          accessible à l'adresse alliefile.com, éditée par Sabrina Harmim, entrepreneur individuel
          (EI), immatriculée au RCS de Lyon sous le numéro SIREN 104 673 140, dont le siège est
          situé 92 Rue Château-Gaillard, 69100 Villeurbanne (ci-après « AlliéFile »).
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 2 — Description du service
        </h2>
        <p className="mb-2">
          AlliéFile est un outil d'aide à la constitution et à l'organisation de dossiers
          juridiques. Il permet l'upload de documents, leur classification assistée par intelligence
          artificielle, la génération de chronologies et l'export ou le partage sécurisé du dossier.
          AlliéFile est un outil d'aide et ne constitue en aucun cas un conseil juridique. Les
          analyses générées par l'IA sont fournies à titre indicatif.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 3 — Accès et inscription
        </h2>
        <p className="mb-2">
          L'accès au service requiert la création d'un compte avec une adresse email valide et un
          mot de passe d'au moins 8 caractères. L'utilisateur certifie que les informations fournies
          sont exactes. Un seul compte par personne est autorisé.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 4 — Plans et tarifs
        </h2>
        <p className="mb-2">
          AlliéFile propose un plan gratuit et des plans payants (Essentiel et Sérénité) aux tarifs
          affichés sur la page{' '}
          <Link to="/pricing" className="underline">
            /tarifs
          </Link>
          . Les prix sont indiqués en euros TTC. AlliéFile se réserve le droit de modifier ses
          tarifs avec un préavis de 30 jours.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 5 — Paiement et résiliation
        </h2>
        <p className="mb-2">
          Les abonnements payants sont souscrits pour une durée mensuelle ou annuelle, renouvelables
          par tacite reconduction. La résiliation peut être effectuée à tout moment depuis l'espace
          personnel, avec effet à la fin de la période en cours. Aucun remboursement partiel n'est
          effectué sauf obligation légale. Pour les abonnements annuels, AlliéFile informe l'utilisateur
          par écrit, entre trois mois et un mois avant la date d'échéance, de la possibilité de ne pas
          reconduire son abonnement, conformément à l'article L215-1 du Code de la consommation. À
          défaut d'envoi de cette information, l'utilisateur peut résilier gratuitement son abonnement
          à tout moment.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 5 bis — Droit de rétractation
        </h2>
        <p className="mb-2">
          Conformément à l'article L221-18 du Code de la consommation, l'utilisateur consommateur
          dispose d'un délai de 14 jours à compter de la souscription pour exercer son droit de
          rétractation, sans avoir à justifier de motif. Toutefois, en cochant la case prévue à cet
          effet au moment du paiement, l'utilisateur demande expressément l'exécution immédiate du
          service et renonce à son droit de rétractation, conformément à l'article L221-28 13° du
          Code de la consommation. Pour exercer ce droit avant toute renonciation expresse,
          l'utilisateur peut écrire à contact@alliefile.com.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 5 ter — Médiation de la consommation
        </h2>
        <p className="mb-2">
          En cas de litige non résolu directement avec AlliéFile, l'utilisateur consommateur peut
          recourir gratuitement à un médiateur de la consommation. AlliéFile renvoie l'utilisateur
          vers la plateforme de Règlement en Ligne des Litiges de la Commission européenne,
          accessible à l'adresse :{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 6 — Propriété des données
        </h2>
        <p className="mb-2">
          Les documents uploadés par l'utilisateur restent sa propriété exclusive. AlliéFile ne
          revendique aucun droit sur leur contenu. L'utilisateur garantit disposer des droits
          nécessaires sur les documents qu'il uploade.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 7 — Responsabilité
        </h2>
        <p className="mb-2">
          AlliéFile met tout en œuvre pour assurer la disponibilité et la sécurité du service. Sa
          responsabilité ne saurait être engagée en cas d'interruption pour maintenance, de force
          majeure, ou de mauvaise utilisation du service par l'utilisateur. Les analyses IA sont
          fournies sans garantie de résultat juridique.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 8 — Données personnelles
        </h2>
        <p className="mb-2">
          Le traitement des données personnelles est décrit dans la Politique de confidentialité
          disponible à l'adresse{' '}
          <Link to="/confidentialite" className="underline">
            /confidentialite
          </Link>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Article 9 — Droit applicable
        </h2>
        <p className="mb-2">
          Les présentes CGU sont soumises au droit français. En cas de litige, les parties
          rechercheront une solution amiable avant tout recours judiciaire. À défaut, le Tribunal
          compétent sera celui de Lyon.
        </p>
      </main>
    </div>
  );
}
