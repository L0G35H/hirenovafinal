"""
TalentLens – Skill Detection Engine
Keyword matching with word-boundary awareness across 8 skill categories.
"""
import re
from typing import Dict, List

# ── Master Skills Dictionary ───────────────────────────────────────────────────
SKILL_CATEGORIES: Dict[str, List[str]] = {
    "Programming Languages": [
        "Python", "Java", "C++", "JavaScript", "TypeScript", "C#", "C",
        "Go", "Rust", "Swift", "Kotlin", "PHP", "Ruby", "Scala", "R",
        "MATLAB", "Perl", "Bash", "Shell",
    ],
    "Web Technologies": [
        "HTML", "CSS", "React", "Angular", "Vue", "Vue.js", "Node.js",
        "Next.js", "Nuxt.js", "jQuery", "Bootstrap", "Tailwind", "SASS",
        "SCSS", "WebSocket", "REST", "GraphQL", "JSON", "XML",
    ],
    "Frameworks & Libraries": [
        "Spring Boot", "Django", "Flask", "FastAPI", "Express", "Laravel",
        "Rails", "Hibernate", "Pandas", "NumPy", "TensorFlow", "PyTorch",
        "Scikit-learn", "Keras", "OpenCV", "Selenium", "Playwright",
    ],
    "Design Tools": [
        "Figma", "Adobe XD", "Photoshop", "Illustrator", "Sketch",
        "InVision", "Zeplin", "Canva", "After Effects", "Premiere Pro",
    ],
    "DevOps & Cloud": [
        "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes",
        "Jenkins", "GitLab CI", "GitHub Actions", "Terraform", "Ansible",
        "Nginx", "Apache", "Linux", "Ubuntu", "CI/CD", "Firebase",
    ],
    "Databases": [
        "MySQL", "PostgreSQL", "MongoDB", "SQLite", "Oracle", "SQL Server",
        "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Firebase",
        "MariaDB", "Neo4j",
    ],
    "Data Science & AI": [
        "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
        "Data Analysis", "Data Science", "Power BI", "Tableau", "Excel",
        "Statistics", "Spark", "Hadoop", "Kafka",
    ],
    "Soft Skills": [
        "Leadership", "Communication", "Teamwork", "Problem Solving",
        "Critical Thinking", "Time Management", "Adaptability",
        "Collaboration", "Creativity", "Presentation",
    ],
}

# All skills flat list for quick lookup
ALL_SKILLS: List[str] = [s for skills in SKILL_CATEGORIES.values() for s in skills]


def _make_pattern(skill: str) -> re.Pattern:
    """Compile a case-insensitive word-boundary pattern for a skill."""
    escaped = re.escape(skill)
    # Handle special cases like C++ or C#
    return re.compile(r'(?<![a-zA-Z0-9])' + escaped + r'(?![a-zA-Z0-9])', re.IGNORECASE)


_PATTERNS = {skill: _make_pattern(skill) for skill in ALL_SKILLS}


def extract_skills(text: str) -> Dict:
    """
    Scan resume text and return detected skills grouped by category.
    Returns:
        {
            'by_category': { category: [skills] },
            'detected_skills': [all flat list],
        }
    """
    by_category: Dict[str, List[str]] = {}
    detected_flat: List[str] = []

    for category, skills in SKILL_CATEGORIES.items():
        matched = []
        for skill in skills:
            pattern = _PATTERNS.get(skill) or _make_pattern(skill)
            if pattern.search(text):
                if skill not in detected_flat:
                    matched.append(skill)
                    detected_flat.append(skill)
        if matched:
            by_category[category] = matched

    return {
        "by_category": by_category,
        "detected_skills": detected_flat,
    }
