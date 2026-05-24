import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TITLE_STYLE = { color: '#1E3A5F', fontFamily: '"Playfair Display", serif' };
const BODY_STYLE = { color: '#374151' };

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-white" data-testid="confidentialite-page">
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
          Politique de confidentialité
        </h1>
        <p className="text-sm text-slate-500 mb-8">Dernière mise à jour : 7 mai 2026</p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Qui sommes-nous
        </h2>
        <p className="mb-2">
          AlliéFile (ci-après « nous ») édite la plateforme alliefile.com, service de constitution et
          de gestion de dossiers juridiques. Contact :{' '}
          <a href="mailto:contact@alliefile.com" className="underline">
            contact@alliefile.com
          </a>
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Données collectées
        </h2>
        <p className="mb-2">Nous collectons les données suivantes :</p>
        <ul className="list-disc pl-6 space-y-1 mb-2">
          <li>
            <strong>Données de compte :</strong> adresse email, nom, mot de passe chiffré
          </li>
          <li>
            <strong>Documents uploadés :</strong> fichiers PDF, images, documents Word déposés
            volontairement par l'utilisateur
          </li>
          <li>
            <strong>Données de paiement :</strong> gérées exclusivement par Stripe. AlliéFile ne
            stocke aucune donnée bancaire.
          </li>
          <li>
            <strong>Données de connexion :</strong> adresse IP, horodatage, type d'appareil (logs de
            sécurité)
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Nature des données traitées — avertissement important
        </h2>
        <p className="mb-2">
          Les documents que vous uploadez peuvent contenir des données à caractère personnel
          sensibles au sens des articles 9 et 10 du Règlement Général sur la Protection des Données
          (RGPD) : données de santé (certificats médicaux, ordonnances), données judiciaires
          (plaintes, procès-verbaux), données relatives à des violences ou des infractions. Ces
          données sont traitées exclusivement sur votre initiative et pour votre propre usage. Vous
          en restez le seul responsable du contenu.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Base légale du traitement
        </h2>
        <ul className="list-disc pl-6 space-y-1 mb-2">
          <li>
            <strong>Données de compte et de paiement :</strong> exécution du contrat (art. 6.1.b
            RGPD)
          </li>
          <li>
            <strong>Documents sensibles uploadés :</strong> consentement explicite de l'utilisateur
            (art. 6.1.a et art. 9.2.a RGPD), exprimé lors de la création du compte et confirmé par
            l'acte volontaire d'upload
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Finalités
        </h2>
        <p className="mb-2">
          Vos données sont utilisées pour : fournir le service de classement et d'analyse de
          documents, générer des chronologies et des exports, permettre le partage sécurisé avec des
          tiers désignés par vous (avocat, professionnel), assurer la sécurité du service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Durée de conservation
        </h2>
        <ul className="list-disc pl-6 space-y-1 mb-2">
          <li>
            <strong>Données de compte :</strong> durée de vie du compte, puis suppression dans les
            30 jours suivant la résiliation ou la demande de suppression
          </li>
          <li>
            <strong>Documents uploadés :</strong> conservés tant que le compte est actif. Supprimés
            immédiatement à la demande ou à la clôture du compte
          </li>
          <li>
            <strong>Logs de sécurité :</strong> 12 mois
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Partage des données
        </h2>
        <p className="mb-2">
          Vos données ne sont jamais vendues ni cédées à des tiers à des fins commerciales. Elles
          peuvent être transmises à : Stripe (paiements), Emergent Labs (infrastructure
          d'hébergement), Resend (envoi d'emails transactionnels). Ces prestataires agissent en
          qualité de sous-traitants et sont contractuellement tenus de respecter la confidentialité
          de vos données.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Transferts hors UE
        </h2>
        <p className="mb-2">
          Emergent Labs est hébergé aux États-Unis. Le transfert est encadré par les clauses
          contractuelles types de la Commission européenne.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Vos droits
        </h2>
        <p className="mb-2">
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement,
          de portabilité, de limitation et d'opposition. Pour exercer ces droits :{' '}
          <a href="mailto:contact@alliefile.com" className="underline">
            contact@alliefile.com
          </a>
          . Vous pouvez également introduire une réclamation auprès de la CNIL (
          <a href="https://cnil.fr" target="_blank" rel="noopener noreferrer" className="underline">
            cnil.fr
          </a>
          ).
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Suppression du compte
        </h2>
        <p className="mb-2">
          Vous pouvez supprimer votre compte et l'ensemble de vos données depuis votre espace
          personnel, à tout moment, sans justification.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Cookies
        </h2>
        <p className="mb-2">
          AlliéFile utilise uniquement des cookies strictement nécessaires au fonctionnement du
          service (cookie de session JWT, maintien de la connexion). Aucun cookie publicitaire ou de
          tracking tiers n'est déposé.
        </p>
      </main>
    </div>
  );
}
