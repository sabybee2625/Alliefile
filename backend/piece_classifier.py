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

    return {
        "tags_thematiques": themes,
        "sujets_concernes": subjects,
        "nature_document": nature,
    }
