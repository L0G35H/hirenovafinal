"""
TalentLens – Resume Achievement Analyzer
Extracts Major Projects, Certifications, and Achievements from resume text.

Uses section-header detection + keyword scanning — no external ML dependencies.
Integrates into the upload pipeline AFTER skill extraction, BEFORE scoring.
"""
import re
from typing import Dict, List

# ── Section header patterns ─────────────────────────────────────────────────────
# Matches headings like "PROJECTS", "Major Projects", "Academic Projects:", etc.
_PROJECT_SECTION = re.compile(
    r'(?:^|\n)\s*(?:major\s+)?(?:academic\s+|professional\s+|personal\s+|key\s+)?'
    r'projects?(?:\s+done|\s+undertaken)?'
    r'\s*[:\-–—]?\s*\n',
    re.IGNORECASE,
)
_CERT_SECTION = re.compile(
    r'(?:^|\n)\s*certifications?(?:\s+&\s+courses?)?(?:\s+earned)?'
    r'\s*[:\-–—]?\s*\n',
    re.IGNORECASE,
)
_ACHIEVE_SECTION = re.compile(
    r'(?:^|\n)\s*(?:achievements?|awards?\s+(?:&\s+)?(?:achievements?|honors?)'
    r'|honors?|accomplishments?|extra.?curricular)'
    r'\s*[:\-–—]?\s*\n',
    re.IGNORECASE,
)

# ── Next-section terminator ─────────────────────────────────────────────────────
# When we hit any major section heading, we stop collecting from the current one
_NEXT_SECTION = re.compile(
    r'^\s*(?:education|work\s+experience|experience|employment|skills?|'
    r'technical\s+skills?|languages?|interests?|objective|summary|profile|'
    r'references?|publications?|contact|hobbies|volunteer|internship)\s*[:\-–—]?\s*$',
    re.IGNORECASE | re.MULTILINE,
)

# ── Bullet / numbered item pattern ─────────────────────────────────────────────
_ITEM_LINE = re.compile(
    r'^\s*(?:[•\-\*●◦▸▹○◎➢➣➤✓✔✦✧]|\d+[\.\)]\s)'
    r'\s*(.+)', re.MULTILINE
)

# ── Certification keyword patterns ─────────────────────────────────────────────
_CERT_PATTERNS = [
    # Explicit cert/certified keyword
    re.compile(
        r'((?:AWS|Azure|GCP|Google|Microsoft|Oracle|Cisco|Meta|IBM|Salesforce|'
        r'CompTIA|PMI|Red\s*Hat|ISACA|EC-Council|HashiCorp|Databricks|'
        r'HubSpot|Coursera|Udemy|edX|LinkedIn|NPTEL|NASSCOM|Infosys|TCS|'
        r'FreeCodeCamp|Scrum\.org|SAFe|PMP|ITIL)?'
        r'\s*[\w\s\.\-/]+?'
        r'(?:certified|certification|certificate|developer|associate|professional|'
        r'practitioner|specialist|architect|fundamentals|essentials|master|expert)'
        r'[\w\s\.\-/]*)',
        re.IGNORECASE,
    ),
    # "TensorFlow Developer Certificate", "AWS Cloud Practitioner" — common named certs
    re.compile(
        r'((?:TensorFlow|PyTorch|Kubernetes|Docker|Terraform|Splunk|Tableau|'
        r'Power\s*BI|Data\s*Analytics|Machine\s*Learning|Deep\s*Learning|'
        r'Full[\s\-]?Stack|Cloud|DevOps|Cybersecurity|Data\s*Science|'
        r'Artificial\s*Intelligence|Natural\s*Language|Computer\s*Vision)'
        r'[\s\w\.\-/]*?(?:certified|certification|certificate|course|program|bootcamp)'
        r'[\s\w\.\-/]*)',
        re.IGNORECASE,
    ),
]

# ── Achievement keyword patterns ────────────────────────────────────────────────
_ACHIEVE_PATTERNS = [
    re.compile(
        r'((?:[\w\s\-]+?)'
        r'(?:hackathon|winner|finalist|runner[\s\-]?up|1st\s+place|2nd\s+place|'
        r'3rd\s+place|champion|winner|award|prize|scholarship|rank|ranked|'
        r'topper|gold\s*medal|silver\s*medal|national\s+level|state\s+level|'
        r'international\s+level|publication|published|paper|research|ieee|acm|'
        r'springer|inventor|patent|competition|olympiad|quiz|fest|event|'
        r'sih|smart\s+india|kaggle|leetcode|hackerrank|codechef|rating|streak)'
        r'[\w\s\-,\.]*)',
        re.IGNORECASE,
    ),
]

# ── Project title heuristics ────────────────────────────────────────────────────
# A project line typically has 2–8 words, possibly with tech-sounding terms
_PROJECT_LINE = re.compile(
    r'^(?!http|www|email|phone|\d{4}|\s*$).{8,80}$',
    re.MULTILINE,
)

# Known project type keywords
_PROJECT_TYPES = [
    'system', 'application', 'app', 'platform', 'website', 'portal', 'tool',
    'framework', 'engine', 'bot', 'assistant', 'dashboard', 'analyzer',
    'detector', 'classifier', 'predictor', 'tracker', 'manager', 'monitor',
]


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: extract text from a named section
# ─────────────────────────────────────────────────────────────────────────────
def _extract_section_text(text: str, section_pattern: re.Pattern) -> str:
    """Return the text block immediately following a section header."""
    m = section_pattern.search(text)
    if not m:
        return ''
    start = m.end()
    # Stop at next major section heading (100 lines max)
    end_match = _NEXT_SECTION.search(text, start)
    end = end_match.start() if end_match else min(start + 3000, len(text))
    return text[start:end]


def _clean(s: str) -> str:
    """Strip whitespace and trailing punctuation."""
    return re.sub(r'[\s,;:\.\-–—]+$', '', s.strip())


# ─────────────────────────────────────────────────────────────────────────────
# PROJECTS
# ─────────────────────────────────────────────────────────────────────────────
def extract_projects(text: str) -> List[str]:
    """
    Extract major projects from the resume text.
    Strategy:
      1. Find a 'Projects' section header → extract items below it.
      2. Fallback: scan whole text for lines that look like project titles.
    Returns a deduplicated list of project title strings.
    """
    projects: List[str] = []
    seen: set = set()

    section_text = _extract_section_text(text, _PROJECT_SECTION)

    if section_text:
        # Try bullet/numbered items first
        items = _ITEM_LINE.findall(section_text)
        if items:
            for raw in items:
                title = _clean(raw)
                key = title.lower()
                if title and len(title) > 4 and key not in seen:
                    projects.append(title)
                    seen.add(key)
        else:
            # Lines that are non-empty and not too long (plain list)
            for line in section_text.splitlines():
                line = _clean(line)
                key = line.lower()
                if 6 < len(line) < 100 and key not in seen:
                    projects.append(line)
                    seen.add(key)
    else:
        # Fallback: look for lines near project-type keywords anywhere in text
        for line in text.splitlines():
            line = _clean(line)
            if not line or len(line) < 8 or len(line) > 100:
                continue
            lower = line.lower()
            if any(pt in lower for pt in _PROJECT_TYPES):
                key = lower
                if key not in seen:
                    projects.append(line)
                    seen.add(key)

    return projects[:10]  # Cap at 10 projects


# ─────────────────────────────────────────────────────────────────────────────
# CERTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────
def extract_certifications(text: str) -> List[str]:
    """
    Extract certifications from the resume text.
    Strategy:
      1. Find a 'Certifications' section → extract items.
      2. Scan full text for certificate keyword patterns.
    Returns deduplicated list of certification name strings.
    """
    certs: List[str] = []
    seen: set = set()

    # === Section-based extraction ===
    section_text = _extract_section_text(text, _CERT_SECTION)
    if section_text:
        items = _ITEM_LINE.findall(section_text)
        source_lines = items if items else [
            l for l in section_text.splitlines() if l.strip()
        ]
        for raw in source_lines:
            title = _clean(str(raw))
            key = title.lower()
            if title and len(title) > 4 and key not in seen:
                certs.append(title)
                seen.add(key)

    # === Keyword-based scan across full text ===
    for pattern in _CERT_PATTERNS:
        for m in pattern.finditer(text):
            title = _clean(m.group(1))
            key = title.lower()
            if len(title) > 6 and key not in seen:
                certs.append(title)
                seen.add(key)

    return certs[:10]


# ─────────────────────────────────────────────────────────────────────────────
# ACHIEVEMENTS
# ─────────────────────────────────────────────────────────────────────────────
def extract_achievements(text: str) -> List[str]:
    """
    Extract achievements and awards from the resume text.
    Strategy:
      1. Find 'Achievements' section → collect items.
      2. Scan full text for achievement-keyword sentences.
    Returns deduplicated list of achievement strings.
    """
    achievements: List[str] = []
    seen: set = set()

    # === Section-based extraction ===
    section_text = _extract_section_text(text, _ACHIEVE_SECTION)
    if section_text:
        items = _ITEM_LINE.findall(section_text)
        source_lines = items if items else [
            l for l in section_text.splitlines() if l.strip()
        ]
        for raw in source_lines:
            title = _clean(str(raw))
            key = title.lower()
            if title and len(title) > 4 and key not in seen:
                achievements.append(title)
                seen.add(key)

    # === Keyword-based scan across full text ===
    for pattern in _ACHIEVE_PATTERNS:
        for m in pattern.finditer(text):
            achievement = _clean(m.group(1))
            key = achievement.lower()
            if len(achievement) > 8 and key not in seen:
                achievements.append(achievement)
                seen.add(key)

    return achievements[:10]


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────
def extract_achievements_data(text: str) -> Dict[str, List[str]]:
    """
    Master function called by the upload pipeline.

    Accepts the raw resume text extracted by resume_processor.py.
    Returns a structured dict compatible with the candidate data model.

    Example:
        {
            "projects":       ["AI Resume Analyzer", "Smart Traffic System"],
            "certifications": ["AWS Cloud Practitioner", "Google Data Analytics"],
            "achievements":   ["Smart India Hackathon Finalist", "IEEE Paper Published"],
        }
    """
    return {
        "projects":       extract_projects(text),
        "certifications": extract_certifications(text),
        "achievements":   extract_achievements(text),
    }
