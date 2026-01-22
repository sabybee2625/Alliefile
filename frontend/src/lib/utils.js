import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateStr) => {
  if (!dateStr) return 'Non définie';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

export const pieceTypeLabels = {
  plainte: 'Plainte',
  main_courante: 'Main courante',
  certificat_medical: 'Certificat médical',
  attestation: 'Attestation',
  sms: 'SMS',
  conclusions: 'Conclusions',
  assignation: 'Assignation',
  recit: 'Récit',
  autre: 'Autre'
};

export const confidenceLabels = {
  fort: 'Confiance élevée',
  moyen: 'Confiance moyenne',
  faible: 'Confiance faible'
};

export const statusLabels = {
  a_verifier: 'À vérifier',
  pret: 'Prêt'
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
