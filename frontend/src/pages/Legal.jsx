import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Scale, Shield, AlertTriangle } from 'lucide-react';

// CGU - Conditions Générales d'Utilisation
export function CGU() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation" icon={Scale}>
      <Section title="1. Objet">
        <p>
          Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions 
          d'utilisation de la plateforme "Dossier Juridique Intelligent" (ci-après "le Service"), ainsi que de définir 
          les droits et obligations des parties dans ce cadre.
        </p>
      </Section>

      <Section title="2. Acceptation des CGU">
        <p>
          L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. En vous inscrivant ou 
          en utilisant le Service, vous reconnaissez avoir pris connaissance des présentes CGU et les accepter sans réserve.
        </p>
      </Section>

      <Section title="3. Description du Service">
        <p>Le Service est une plateforme en ligne permettant aux utilisateurs de :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Constituer et organiser des dossiers juridiques numériques</li>
          <li>Analyser automatiquement des documents juridiques grâce à l'intelligence artificielle</li>
          <li>Générer des chronologies et exposés des faits</li>
          <li>Partager des dossiers de manière sécurisée avec des professionnels du droit</li>
        </ul>
      </Section>

      <Section title="4. Inscription et Compte Utilisateur">
        <p>
          Pour accéder au Service, vous devez créer un compte utilisateur en fournissant des informations exactes et 
          à jour. Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toutes les activités 
          effectuées sous votre compte.
        </p>
      </Section>

      <Section title="5. Plans et Tarification">
        <p>Le Service propose différents plans d'abonnement :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Plan Gratuit :</strong> 1 dossier, 15 pièces maximum, fonctionnalités limitées</li>
          <li><strong>Plan Standard :</strong> 5 dossiers, 500 pièces, fonctionnalités avancées</li>
          <li><strong>Plan Premium :</strong> Dossiers illimités, toutes fonctionnalités</li>
        </ul>
        <p className="mt-2">
          Les tarifs sont indiqués en euros TTC et peuvent être modifiés à tout moment. Toute modification tarifaire 
          sera notifiée aux utilisateurs avec un préavis de 30 jours.
        </p>
      </Section>

      <Section title="6. Utilisation du Service">
        <p>Vous vous engagez à utiliser le Service de manière conforme aux lois en vigueur et aux présentes CGU. Il est notamment interdit de :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Télécharger des contenus illicites, diffamatoires ou portant atteinte aux droits de tiers</li>
          <li>Tenter de contourner les mesures de sécurité du Service</li>
          <li>Utiliser le Service à des fins frauduleuses</li>
          <li>Revendre ou sous-licencier l'accès au Service</li>
        </ul>
      </Section>

      <Section title="7. Propriété Intellectuelle">
        <p>
          Le Service et tous ses éléments (logiciels, textes, images, marques) sont protégés par le droit de la propriété 
          intellectuelle. L'utilisateur conserve la propriété de ses documents et données personnelles.
        </p>
      </Section>

      <Section title="8. Protection des Données">
        <p>
          Le traitement des données personnelles est régi par notre Politique de Confidentialité. En utilisant le Service, 
          vous consentez au traitement de vos données conformément à cette politique.
        </p>
        <p className="mt-2">
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Consulter notre Politique de Confidentialité
          </Link>
        </p>
      </Section>

      <Section title="9. Limitation de Responsabilité">
        <p>
          Le Service est fourni "en l'état". Nous ne garantissons pas que le Service sera exempt d'erreurs ou 
          d'interruptions. L'analyse par intelligence artificielle est fournie à titre indicatif et ne constitue 
          pas un conseil juridique.
        </p>
        <p className="mt-2 font-semibold text-amber-700">
          En aucun cas le Service ne peut se substituer à l'avis d'un professionnel du droit qualifié.
        </p>
      </Section>

      <Section title="10. Résiliation">
        <p>
          Vous pouvez résilier votre compte à tout moment. La résiliation entraîne la suppression définitive de 
          toutes vos données. En cas de violation des CGU, nous nous réservons le droit de suspendre ou résilier 
          votre compte sans préavis.
        </p>
      </Section>

      <Section title="11. Modification des CGU">
        <p>
          Nous nous réservons le droit de modifier les présentes CGU à tout moment. Les modifications seront notifiées 
          par email ou via le Service. La poursuite de l'utilisation du Service après modification vaut acceptation 
          des nouvelles CGU.
        </p>
      </Section>

      <Section title="12. Droit Applicable">
        <p>
          Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux français seront 
          seuls compétents.
        </p>
      </Section>

      <p className="text-sm text-slate-500 mt-8">
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </LegalLayout>
  );
}

// Privacy - Politique de Confidentialité
export function Privacy() {
  return (
    <LegalLayout title="Politique de Confidentialité" icon={Shield}>
      <Section title="1. Responsable du Traitement">
        <p>
          Le responsable du traitement des données personnelles collectées via le Service "Dossier Juridique Intelligent" 
          est l'éditeur de la plateforme.
        </p>
      </Section>

      <Section title="2. Données Collectées">
        <p>Nous collectons les catégories de données suivantes :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Données d'identification :</strong> nom, prénom, adresse email</li>
          <li><strong>Données de connexion :</strong> logs, adresse IP, horodatages</li>
          <li><strong>Documents téléchargés :</strong> fichiers juridiques que vous importez</li>
          <li><strong>Données de paiement :</strong> traitées de manière sécurisée par notre prestataire Stripe</li>
        </ul>
      </Section>

      <Section title="3. Finalités du Traitement">
        <p>Vos données sont traitées pour les finalités suivantes :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Fourniture et gestion du Service</li>
          <li>Analyse automatique de vos documents par intelligence artificielle</li>
          <li>Gestion de votre compte et abonnement</li>
          <li>Communication relative au Service</li>
          <li>Amélioration et sécurisation du Service</li>
          <li>Respect de nos obligations légales</li>
        </ul>
      </Section>

      <Section title="4. Base Légale du Traitement">
        <p>Les traitements sont fondés sur :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>L'exécution du contrat (fourniture du Service)</li>
          <li>Votre consentement (pour certaines communications)</li>
          <li>Nos intérêts légitimes (sécurité, amélioration du Service)</li>
          <li>Le respect de nos obligations légales</li>
        </ul>
      </Section>

      <Section title="5. Destinataires des Données">
        <p>Vos données peuvent être partagées avec :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Nos prestataires techniques (hébergement, paiement)</li>
          <li>Les services d'IA pour l'analyse de documents (données anonymisées ou pseudonymisées)</li>
          <li>Les autorités compétentes en cas d'obligation légale</li>
        </ul>
        <p className="mt-2">
          Nous ne vendons jamais vos données personnelles à des tiers.
        </p>
      </Section>

      <Section title="6. Durée de Conservation">
        <p>Vos données sont conservées :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Pendant la durée de votre compte actif</li>
          <li>3 ans après la suppression de votre compte pour les données de facturation</li>
          <li>Les documents sont supprimés immédiatement lors de la suppression du compte</li>
        </ul>
      </Section>

      <Section title="7. Sécurité des Données">
        <p>Nous mettons en œuvre des mesures de sécurité appropriées :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Chiffrement des données en transit (HTTPS/TLS)</li>
          <li>Stockage sécurisé des mots de passe (hachage bcrypt)</li>
          <li>Accès restreint aux données personnelles</li>
          <li>Surveillance et journalisation des accès</li>
        </ul>
      </Section>

      <Section title="8. Vos Droits">
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
          <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
          <li><strong>Droit à l'effacement :</strong> supprimer vos données</li>
          <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
          <li><strong>Droit d'opposition :</strong> vous opposer à certains traitements</li>
          <li><strong>Droit de retirer votre consentement</strong></li>
        </ul>
        <p className="mt-2">
          Pour exercer vos droits, vous pouvez supprimer votre compte depuis les paramètres ou nous contacter.
        </p>
      </Section>

      <Section title="9. Cookies">
        <p>
          Le Service utilise des cookies essentiels au fonctionnement (authentification, préférences). 
          Nous n'utilisons pas de cookies publicitaires ou de tracking tiers.
        </p>
      </Section>

      <Section title="10. Transferts Internationaux">
        <p>
          Vos données peuvent être traitées par des prestataires situés hors de l'Union Européenne. 
          Dans ce cas, nous nous assurons que des garanties appropriées sont en place (clauses contractuelles types, 
          certification Privacy Shield, etc.).
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          Pour toute question relative à la protection de vos données personnelles, vous pouvez nous contacter 
          ou déposer une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés).
        </p>
      </Section>

      <p className="text-sm text-slate-500 mt-8">
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </LegalLayout>
  );
}

// Disclaimer Component (pour affichage inline)
export function Disclaimer({ className = '' }) {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Avertissement Important</p>
          <p>
            Ce service utilise l'intelligence artificielle pour analyser vos documents. Les analyses et suggestions 
            générées sont fournies à titre <strong>indicatif uniquement</strong> et ne constituent en aucun cas 
            un conseil juridique.
          </p>
          <p className="mt-2">
            <strong>Consultez toujours un professionnel du droit</strong> (avocat, juriste) pour obtenir un avis 
            juridique adapté à votre situation personnelle.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composants utilitaires
function LegalLayout({ title, icon: Icon, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <div className="flex items-center gap-3">
            <Icon className="w-8 h-8 text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-6">
          {children}
        </div>
      </main>
      
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-wrap gap-4 text-sm text-slate-600">
          <Link to="/cgu" className="hover:text-slate-900">CGU</Link>
          <Link to="/privacy" className="hover:text-slate-900">Politique de Confidentialité</Link>
          <Link to="/pricing" className="hover:text-slate-900">Tarifs</Link>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="text-slate-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default { CGU, Privacy, Disclaimer };
