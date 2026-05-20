"""
Classification déterministe (par mots-clés) des pièces déjà analysées
afin d'ajouter rétroactivement tags_thematiques / sujets_concernes / nature_document
sans relancer d'appel IA coûteux.
"""
from typing import List, Optional

# Dictionnaire de mots-clés (en minuscules, sans accents) -> thème
# L'ordre suit la priorité (violence > harcelement par exemple)
THEME_KEYWORDS = {
    "violence": [
        "violence", "agression", "coups", "blessure", "frappe", "frapper",
        "menaces de mort", "menace", "ITT", "incapacite", "agresse",
        "viol", "tentative de", "lesions", "lesions corporelles",
    ],
    "harcelement": [
        "harcelement", "harceler", "harcele",
        "insulte", "intimidation", "diffamation",
        "moral", "outrage", "denigre",
        "appels manques", "appels repetes",
        "messages repetes", "stalking",
    ],
    "sante": [
        "medecin", "medical", "hopital", "hospitalisation", "diagnostic",
        "ordonnance", "prescription", "certificat medical", "psychiatre",
        "psychologue", "infirmier", "soins", "therapie", "depression",
        "anxiete", "trouble", "maladie", "consultation", "urgences",
    ],
    "famille": [
        "mariage", "divorce", "epoux", "epouse", "conjoint", "ex-conjoint",
        "compagnon", "compagne", "concubin", "pacs", "separation",
        "enfant", "garde", "filiation", "pension alimentaire", "JAF",
        "juge aux affaires familiales", "ATB", "autorite parentale",
        "famille", "parent",
    ],
    "logement": [
        "bail", "locataire", "bailleur", "loyer", "quittance",
        "appartement", "domicile", "logement", "expulsion", "preavis",
        "etat des lieux", "charges locatives", "depot de garantie",
        "proprietaire", "syndic", "copropriete",
    ],
    "travail": [
        "employeur", "salarie", "contrat de travail", "bulletin de salaire",
        "fiche de paie", "licenciement", "demission", "rupture conventionnelle",
        "harcelement moral", "harcelement professionnel", "CSE", "prud'hommes",
        "prudhommes", "conge", "arret de travail",
        "embauche", "preavis", "travail",
    ],
    "finances": [
        "banque", "virement", "releve bancaire", "compte bancaire",
        "facture", "impaye", "credit", "pret", "huissier", "saisie",
        "recouvrement", "endettement", "surendettement", "decouvert",
        "RIB", "echeance",
    ],
    "administratif": [
        "prefecture", "mairie", "CAF", "URSSAF", "impots", "CPAM",
        "pole emploi", "decision administrative", "notification",
        "refus", "titre de sejour", "carte d'identite", "passeport",
        "convocation",
    ],
    "scolaire": [
        "ecole", "college", "lycee", "professeur", "directeur d'ecole",
        "bulletin scolaire", "absentee", "exclusion", "conseil de classe",
        "rectorat", "academie", "psy-EN",
    ],
    "succession": [
        "succession", "heritage", "heritier", "deces", "testament",
        "notaire", "legataire", "indivision", "donation",
    ],
    "consommation": [
        "commande", "livraison", "produit defectueux", "remboursement",
        "garantie", "SAV", "service apres-vente",
        "consommation", "vente a distance",
    ],
}

SUBJECT_KEYWORDS = {
    "ex-conjoint": ["ex-conjoint", "ex-mari", "ex-femme", "ex-epoux", "ex-epouse",
                    "ex-compagnon", "ex-compagne", "ex-concubin", "ex-partenaire",
                    " ex "],
    "conjoint": ["mari", "epoux", "femme", "epouse", "conjoint",
                 "compagnon", "compagne", "concubin", "partenaire"],
    "enfant": ["enfant", "fille", "fils", "mineur", "bebe", "nourisson",
               "ado", "adolescent"],
    "employeur": ["employeur", "directeur", "supervisor", "RH", "service RH",
                  "manager", "chef de service"],
    "bailleur": ["bailleur", "proprietaire", "syndic", "agence immobiliere"],
    "voisin": ["voisin", "voisine", "voisinage"],
    "administration": ["prefecture", "mairie", "CAF", "URSSAF", "impots", "CPAM",
                       "pole emploi", "administration", "ministere"],
    "medecin": ["medecin", "docteur", "Dr.", "psychiatre", "psychologue",
                "infirmier", "hopital"],
    "police": ["police", "gendarmerie", "commissariat", "policier",
               "OPJ", "agent de police"],
    "tiers": ["tiers", "temoin"],
}

# Mapping type_piece -> nature_document
TYPE_TO_NATURE = {
    "plainte": "officiel",
    "main_courante": "officiel",
    "jugement": "officiel",
    "ordonnance": "officiel",
    "conclusions": "officiel",
    "assignation": "officiel",
    "certificat_medical": "medical",
    "attestation": "temoignage",
    "temoignage": "temoignage",
    "sms": "prive",
    "email": "prive",
    "courrier": "prive",
    "recit": "prive",
    "facture": "financier",
    "contrat": "financier",
    "releve_bancaire": "financier",
}


# Taxonomie canonique à 3 niveaux : domaine → sous-catégorie → mots-clés.
# (Référence authoritative pour les 5 domaines juridiques.)
TAXONOMY = {
    'PÉNAL': {
        'Violence conjugale': ['physique', 'psychologique', 'sexuelle'],
        'Harcèlement': ['moral', 'sexuel', 'cyber'],
        'Menaces': ['intimidation'],
        'Infractions biens': ['vol', 'escroquerie', 'dégradation'],
    },
    'FAMILLE': {
        'Divorce': ['séparation'],
        'Garde': ['autorité parentale'],
        'Pension alimentaire': [],
        'Violence intrafamiliale': [],
    },
    'LOGEMENT': {
        'Litige locatif': ['loyers', 'charges', 'dépôt de garantie'],
        'Expulsion': [],
        'Malfaçons': ['travaux'],
        'Copropriété': ['voisinage'],
    },
    'TRAVAIL': {
        'Licenciement': ['abusif'],
        'Harcèlement professionnel': [],
        'Discrimination': [],
        'Salaires': ['heures supplémentaires'],
    },
    'CIVIL': {
        'Dettes': ['créances'],
        'Responsabilité civile': [],
        'Litiges contractuels': [],
    },
}

# Mapping des anciennes clés (ou clés intermédiaires d'une migration antérieure)
# vers les 5 domaines canoniques.
LEGACY_MAP = {
    'violence': 'PÉNAL', 'harcelement': 'PÉNAL', 'sante': 'PÉNAL',
    'famille': 'FAMILLE', 'succession': 'CIVIL', 'consommation': 'CIVIL',
    'logement': 'LOGEMENT', 'travail': 'TRAVAIL',
    'administratif': 'CIVIL', 'financier': 'CIVIL', 'finances': 'CIVIL',
    'scolaire': 'CIVIL', 'CIVIL_FAMILLE': 'FAMILLE',
    'IMMOBILIER_LOGEMENT': 'LOGEMENT', 'ADMINISTRATIF': 'CIVIL',
}

VALID_DOMAINS = set(TAXONOMY.keys())


# Mots-clés (lowercase, sans accents) pour identifier la SOUS-CATÉGORIE
# au sein d'un domaine déjà détecté.
SUBDOMAIN_KEYWORDS = {
    'PÉNAL': {
        'Violence conjugale': ['violence conjugale', 'coups', 'agression', 'blessure', 'lesions', 'itt', 'epoux', 'conjoint', 'compagne', 'compagnon', 'concubin', 'viol'],
        'Harcèlement': ['harcelement', 'harceler', 'harcele', 'stalking', 'appels repetes', 'messages repetes', 'denigre', 'humiliation'],
        'Menaces': ['menace', 'menaces de mort', 'intimidation'],
        'Infractions biens': ['vol', 'cambriolage', 'escroquerie', 'fraude', 'degradation', 'destruction'],
    },
    'FAMILLE': {
        'Divorce': ['divorce', 'separation', 'jaf', 'juge aux affaires familiales', 'rupture'],
        'Garde': ['garde', 'autorite parentale', 'droit de visite', 'residence alternee'],
        'Pension alimentaire': ['pension alimentaire', 'contribution', 'atb'],
        'Violence intrafamiliale': ['violence intrafamiliale', 'maltraitance', 'enfant en danger'],
    },
    'LOGEMENT': {
        'Litige locatif': ['bail', 'loyer', 'charges locatives', 'quittance', 'depot de garantie', 'locataire', 'bailleur', 'etat des lieux'],
        'Expulsion': ['expulsion', 'commandement de payer', 'preavis'],
        'Malfaçons': ['malfacon', 'travaux', 'desordre', 'vice cache'],
        'Copropriété': ['copropriete', 'syndic', 'voisinage', 'voisin', 'nuisance'],
    },
    'TRAVAIL': {
        'Licenciement': ['licenciement', 'rupture conventionnelle', 'demission', 'abusif', 'sans cause reelle'],
        'Harcèlement professionnel': ['harcelement moral', 'harcelement professionnel', 'cse'],
        'Discrimination': ['discrimination', 'inegalite de traitement'],
        'Salaires': ['bulletin de salaire', 'fiche de paie', 'salaire', 'heures supplementaires', 'heures sup', 'prime'],
    },
    'CIVIL': {
        'Dettes': ['dette', 'creance', 'huissier', 'saisie', 'recouvrement', 'impaye', 'surendettement'],
        'Responsabilité civile': ['responsabilite', 'dommage', 'prejudice', 'reparation'],
        'Litiges contractuels': ['contrat', 'facture', 'commande', 'livraison', 'remboursement', 'garantie', 'sav'],
    },
}

# Mots-clés (lowercase, sans accents) pour identifier le TYPE SPÉCIFIQUE
# au sein d'une sous-catégorie. Vide => pas de précision possible.
TYPE_KEYWORDS = {
    'Violence conjugale': {
        'physique': ['physique', 'coups', 'blessure', 'lesions', 'frappe'],
        'psychologique': ['psychologique', 'mental', 'depression', 'anxiete', 'humiliation', 'denigre'],
        'sexuelle': ['sexuelle', 'viol', 'agression sexuelle'],
    },
    'Harcèlement': {
        'moral': ['moral', 'denigre', 'humiliation', 'intimidation'],
        'sexuel': ['sexuel', 'avances'],
        'cyber': ['cyber', 'reseau social', 'sms', 'email', 'messagerie'],
    },
    'Menaces': {
        'intimidation': ['intimidation', 'pression', 'menace'],
    },
    'Infractions biens': {
        'vol': ['vol', 'cambriolage'],
        'escroquerie': ['escroquerie', 'fraude', 'arnaque'],
        'dégradation': ['degradation', 'destruction', 'vandalisme'],
    },
    'Divorce': {
        'séparation': ['separation', 'rupture'],
    },
    'Garde': {
        'autorité parentale': ['autorite parentale'],
    },
    'Litige locatif': {
        'loyers': ['loyer', 'impaye loyer'],
        'charges': ['charge'],
        'dépôt de garantie': ['depot de garantie', 'caution'],
    },
    'Malfaçons': {
        'travaux': ['travaux'],
    },
    'Copropriété': {
        'voisinage': ['voisin', 'voisinage', 'nuisance'],
    },
    'Licenciement': {
        'abusif': ['abusif', 'sans cause reelle'],
    },
    'Salaires': {
        'heures supplémentaires': ['heures supplementaires', 'heures sup'],
    },
    'Dettes': {
        'créances': ['creance', 'huissier'],
    },
}


# Nature → source qualifiée (PRO/PRIVÉ) pour le badge sur les pièces.
NATURE_TO_SOURCE = {
    'officiel': 'PRO',
    'medical': 'PRO',
    'judiciaire': 'PRO',
    'prive': 'PRIVÉ',
    'temoignage': 'PRIVÉ',
}


def detect_subdomain(domain: str, text: str):
    """
    Retourne (sous_domaine, type_specifique) pour un domaine donné,
    ou (None, None) si rien ne matche.
    """
    if not domain or domain not in SUBDOMAIN_KEYWORDS:
        return None, None
    subdomain = None
    for sub, kws in SUBDOMAIN_KEYWORDS[domain].items():
        for kw in kws:
            if kw in text:
                subdomain = sub
                break
        if subdomain:
            break
    if not subdomain:
        return None, None
    # Type spécifique au sein de la sous-catégorie
    type_spec = None
    for tname, kws in TYPE_KEYWORDS.get(subdomain, {}).items():
        for kw in kws:
            if kw in text:
                type_spec = tname
                break
        if type_spec:
            break
    return subdomain, type_spec


def derive_source_qualifiee(nature) -> Optional[str]:
    """Mappe nature_document → 'PRO' | 'PRIVÉ' | None."""
    return NATURE_TO_SOURCE.get(nature)


def normalize_themes(tags) -> List[str]:
    """
    Convertit n'importe quelle liste de thèmes (anciennes clés ou nouvelles)
    en liste dédupliquée des 5 domaines juridiques canoniques, ordre stable.
    Les valeurs non reconnues sont ignorées.
    """
    result: List[str] = []
    for t in (tags or []):
        mapped = LEGACY_MAP.get(t, t)
        if mapped in VALID_DOMAINS and mapped not in result:
            result.append(mapped)
    return result


def _normalize(s: str) -> str:
    """lowercase + strip accents (light)"""
    if not s:
        return ""
    replacements = (("é", "e"), ("è", "e"), ("ê", "e"), ("ë", "e"),
                    ("à", "a"), ("â", "a"), ("ä", "a"),
                    ("ï", "i"), ("î", "i"),
                    ("ô", "o"), ("ö", "o"),
                    ("ù", "u"), ("û", "u"), ("ü", "u"),
                    ("ç", "c"), ("'", "'"))
    s = s.lower()
    for a, b in replacements:
        s = s.replace(a, b)
    return s


def _build_haystack(piece: dict) -> str:
    """Concatène toutes les sources textuelles déjà extraites."""
    v = piece.get("validated_data") or {}
    a = piece.get("ai_proposal") or {}
    parts = [
        v.get("titre"), a.get("titre"),
        v.get("resume_qui"), a.get("resume_qui"),
        v.get("resume_quoi"), a.get("resume_quoi"),
        v.get("resume_element_cle"), a.get("resume_element_cle"),
        v.get("resume_ou"), a.get("resume_ou"),
        " ".join(v.get("mots_cles") or []),
        " ".join(a.get("mots_cles") or []),
        v.get("type_piece"), a.get("type_piece"),
        piece.get("original_filename"),
    ]
    return _normalize(" ".join(p for p in parts if p))


def classify_piece(piece: dict) -> dict:
    """
    Renvoie {tags_thematiques, sujets_concernes, nature_document}
    déduits des données déjà présentes (sans appel IA).
    Les thèmes sont normalisés vers les 5 domaines juridiques
    (PÉNAL, CIVIL_FAMILLE, IMMOBILIER_LOGEMENT, TRAVAIL, ADMINISTRATIF).
    """
    text = _build_haystack(piece)

    raw_themes: List[str] = []
    for theme, kws in THEME_KEYWORDS.items():
        for kw in kws:
            if _normalize(kw) in text:
                if theme not in raw_themes:
                    raw_themes.append(theme)
                break

    themes = normalize_themes(raw_themes)

    subjects: List[str] = ["utilisateur"]  # par défaut, le user est concerné
    for subj, kws in SUBJECT_KEYWORDS.items():
        for kw in kws:
            if _normalize(kw) in text:
                if subj not in subjects:
                    subjects.append(subj)
                break

    # Nature : dérivée du type_piece
    v = piece.get("validated_data") or {}
    a = piece.get("ai_proposal") or {}
    type_piece = v.get("type_piece") or a.get("type_piece") or ""
    nature: Optional[str] = TYPE_TO_NATURE.get(type_piece)

    # Détection sous-domaine + type spécifique au sein du domaine principal détecté
    primary_domain = themes[0] if themes else None
    sous_domaine, type_specifique = detect_subdomain(primary_domain, text)

    return {
        "tags_thematiques": themes,
        "domaine": primary_domain,
        "sous_domaine": sous_domaine,
        "type_specifique": type_specifique,
        "sujets_concernes": subjects,
        "nature_document": nature,
        "source_qualifiee": derive_source_qualifiee(nature),
    }
