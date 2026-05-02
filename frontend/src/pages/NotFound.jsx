import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-slate-900 rounded-sm flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-xl text-slate-900">AlliéFile</span>
        </div>
        <h1 className="font-heading text-6xl font-bold text-slate-900 mb-4" data-testid="404-title">404</h1>
        <p className="text-lg text-slate-600 mb-2">Page introuvable</p>
        <p className="text-sm text-slate-500 mb-8">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <Link to="/">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm" data-testid="404-home-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
