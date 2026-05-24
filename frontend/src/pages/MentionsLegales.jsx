import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TITLE_STYLE = { color: '#1E3A5F', fontFamily: '"Playfair Display", serif' };
const BODY_STYLE = { color: '#374151' };

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-white" data-testid="mentions-legales-page">
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
        <h1 className="text-3xl font-bold mb-8" style={TITLE_STYLE}>
          Mentions légales
        </h1>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Éditeur du site
        </h2>
        <p className="mb-2">AlliéFile</p>
        <p className="mb-2">[Forme juridique à compléter — ex : auto-entrepreneur / SAS]</p>
        <p className="mb-2">[Adresse complète]</p>
        <p className="mb-2">RCS Lyon — SIREN : [à compléter]</p>
        <p className="mb-2">Directrice de la publication : [Ton prénom et nom]</p>
        <p className="mb-2">
          Contact :{' '}
          <a href="mailto:contact@alliefile.com" className="underline">
            contact@alliefile.com
          </a>
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Hébergeur
        </h2>
        <p className="mb-2">Emergent Labs Inc.</p>
        <p className="mb-2">340 Pine Street, Suite 800, San Francisco, CA 94104, États-Unis</p>
        <p className="mb-2">
          Site :{' '}
          <a href="https://emergent.sh" target="_blank" rel="noopener noreferrer" className="underline">
            emergent.sh
          </a>
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={TITLE_STYLE}>
          Propriété intellectuelle
        </h2>
        <p className="mb-2">
          Le contenu éditorial du site alliefile.com (textes, visuels, structure) est la propriété
          exclusive d'AlliéFile. Les documents uploadés par les utilisateurs restent leur propriété
          exclusive.
        </p>
      </main>
    </div>
  );
}
