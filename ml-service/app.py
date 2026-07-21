"""
CVConnect ML service v2.0
Serves trained models for:
  - /analyze     — skill extraction
  - /similarity  — resume-job similarity (TF-IDF cosine)
  - /rewrite     — ML-based resume optimisation fallback
  - /classify    — domain classifier
  - /skill-gap   — skill gap predictor from dataset
"""
import os, re, json
from pathlib import Path
from collections import Counter
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field
import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ─── Bootstrap ───────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
# Use local AppData to avoid OneDrive sync restrictions on binary files
MODELS_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "CVConnect" / "models"

app = FastAPI(title="CVConnect ML service", version="2.0.0")

# Lazy-loaded model cache
_tfidf       = None
_domain_clf  = None
_skill_gap   = None
_meta        = None

def get_tfidf():
    global _tfidf
    if _tfidf is None:
        p = MODELS_DIR / "tfidf.joblib"
        if p.exists():
            _tfidf = joblib.load(p)
    return _tfidf

def get_domain_clf():
    global _domain_clf
    if _domain_clf is None:
        p = MODELS_DIR / "domain_clf.joblib"
        if p.exists():
            _domain_clf = joblib.load(p)
    return _domain_clf

def get_skill_gap():
    global _skill_gap
    if _skill_gap is None:
        p = MODELS_DIR / "skill_gap.json"
        if p.exists():
            with open(p, encoding="utf-8") as f:
                _skill_gap = json.load(f)
    return _skill_gap

def get_meta():
    global _meta
    if _meta is None:
        p = MODELS_DIR / "meta.json"
        if p.exists():
            with open(p, encoding="utf-8") as f:
                _meta = json.load(f)
        else:
            _meta = {}
    return _meta

# ─── Skill taxonomy (lexical fallback) ───────────────────────────────────────
SKILLS = {
    "engineering": [
        "javascript","typescript","react","redux","node.js","express",
        "python","java","c++","sql","postgresql","mysql","mongodb",
        "docker","kubernetes","aws","azure","gcp","terraform","graphql",
        "rest api","git","ci/cd","flask","django","fastapi","spring boot",
        "angular","vue.js","next.js","redis","elasticsearch","rabbitmq",
        "kafka","microservices","linux","bash","rust","go","kotlin","swift"
    ],
    "data": [
        "machine learning","deep learning","nlp","pandas","numpy",
        "tableau","power bi","excel","statistics","data analysis",
        "tensorflow","pytorch","scikit-learn","spark","hadoop","data pipeline",
        "etl","data warehouse","looker","dbt","a/b testing","feature engineering"
    ],
    "design": [
        "figma","adobe xd","sketch","illustrator","photoshop","indesign",
        "after effects","blender","canva","ui design","ux design","wireframing",
        "prototyping","user research","accessibility","typography"
    ],
    "product": [
        "product management","agile","scrum","roadmap","stakeholder management",
        "communication","leadership","jira","confluence","okr","kpi",
        "product strategy","go-to-market","customer discovery","sprint planning"
    ],
    "marketing": [
        "seo","social media marketing","content writing","digital marketing",
        "email marketing","google analytics","facebook ads","copywriting",
        "brand management","marketing strategy","ms-office","excel"
    ]
}
ALL_SKILLS = [s for grp in SKILLS.values() for s in grp]

ACTION_VERBS = {
    "engineering": ["Architected","Engineered","Developed","Implemented","Deployed",
                    "Optimised","Refactored","Integrated","Automated","Containerised",
                    "Designed","Built","Migrated","Scaled","Streamlined"],
    "data":        ["Analysed","Modelled","Processed","Visualised","Trained",
                    "Evaluated","Extracted","Transformed","Predicted","Curated",
                    "Benchmarked","Tuned","Validated","Aggregated","Deployed"],
    "design":      ["Designed","Prototyped","Wireframed","Researched","Iterated",
                    "Collaborated","Illustrated","Visualised","Produced","Crafted"],
    "product":     ["Led","Defined","Prioritised","Shipped","Coordinated",
                    "Aligned","Researched","Launched","Managed","Improved"],
    "marketing":   ["Grew","Managed","Executed","Launched","Drove","Optimised",
                    "Tracked","Analysed","Coordinated","Created"],
    "default":     ["Delivered","Contributed","Enhanced","Created",
                    "Maintained","Improved","Enabled","Supported"]
}

WEAK_OPENERS = re.compile(
    r"^\s*(responsible for|helped|assisted|worked on|contributed to|"
    r"was involved in|participated in|tasked with|duties included)\b",
    re.IGNORECASE
)

# ─── Helpers ──────────────────────────────────────────────────────────────────
def norm_text(text: str) -> str:
    return " " + re.sub(r"[^a-z0-9+#. ]", " ", text.lower()) + " "

def lex_skills(text: str) -> list[str]:
    h = norm_text(text)
    return sorted({s for s in ALL_SKILLS if f" {s} " in h or f" {s.replace('.','').replace('-','')} " in h})

def tokens(text: str) -> set:
    return set(re.findall(r"[a-z][a-z0-9+#.]{2,}", text.lower()))

def normalize_skills(raw) -> list[str]:
    if not isinstance(raw, str): return []
    return [s.strip().lower() for s in re.split(r"[,;|/]", raw) if s.strip() and len(s.strip()) > 1]

def strengthen_bullet(bullet: str, domain: str) -> str:
    bullet = WEAK_OPENERS.sub("", bullet.strip()).strip().rstrip(".")
    if not bullet: return bullet
    # Already starts with a strong action verb (regular -ed OR common irregulars)
    _ALREADY_STRONG = re.compile(
        r"^(built|led|made|ran|drove|designed|wrote|created|grew|spearheaded|won|taught|"
        r"launched|managed|researched|analysed|analyzed|coordinated|produced|shipped|"
        r"[A-Z][a-z]+ed)\b",
        re.IGNORECASE
    )
    if _ALREADY_STRONG.match(bullet):
        return bullet + "."
    verbs = ACTION_VERBS.get(domain, ACTION_VERBS["default"])
    idx = sum(ord(c) for c in bullet[:10]) % len(verbs)
    verb = verbs[idx]
    remainder = bullet[0].lower() + bullet[1:] if len(bullet) > 1 else bullet.lower()
    return f"{verb} {remainder}."

def gap_fill_skills(resume_skills, job_skills, source_text: str) -> list[str]:
    src = source_text.lower() if source_text else ""
    new = [s for s in job_skills if s not in resume_skills
           and (s.lower() in src or s.replace(".","").lower() in src)]
    return list(dict.fromkeys(resume_skills + new))

def tailor_summary(summary: str, job: dict, domain: str, gap: list[str]) -> str:
    title = job.get("title", "the role")
    if not summary:
        summary = "Results-driven professional with a track record of delivering quality work."
    if title.lower() in summary.lower(): return summary
    tail = f" Applying this experience to {title}"
    if gap[:3]: tail += f", with particular alignment to {', '.join(gap[:3])}"
    return summary.rstrip(".") + tail + "."

def infer_domain_from_text(text: str) -> str:
    clf = get_domain_clf()
    if clf:
        try:
            return clf.predict([text])[0]
        except Exception:
            pass
    # Lexical fallback
    t = text.lower()
    best, best_score = "engineering", 0
    for domain, keywords in SKILLS.items():
        score = sum(1 for kw in keywords if kw in t)
        if score > best_score:
            best, best_score = domain, score
    return best

def predict_skill_gap(title: str, domain: str, resume_skills: list[str]) -> list[str]:
    """Return skills from dataset that are missing from resume, ranked by frequency."""
    sg = get_skill_gap()
    if not sg:
        return []
    key = re.sub(r"[^a-z0-9 ]", "", title.lower()).strip()
    candidate_skills = []
    # 1) Title-specific skills (highest priority)
    candidate_skills.extend(sg.get("title_skills", {}).get(key, []))
    # 2) Domain-level skills
    candidate_skills.extend(sg.get("domain_skills", {}).get(domain, []))
    seen = set()
    ranked = []
    for s in candidate_skills:
        if s not in seen and s not in resume_skills:
            seen.add(s)
            ranked.append(s)
    return ranked[:15]

def tfidf_similarity(text_a: str, text_b: str) -> float:
    tfidf = get_tfidf()
    if tfidf is None:
        one, two = tokens(text_a), tokens(text_b)
        return round(len(one & two) / ((len(one) * len(two)) ** .5 or 1), 4)
    try:
        vecs = tfidf.transform([text_a, text_b])
        score = float(cosine_similarity(vecs[0], vecs[1])[0, 0])
        return round(score, 4)
    except Exception:
        return 0.0

# ─── Request models ───────────────────────────────────────────────────────────
class TextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100000)

class SimilarityRequest(BaseModel):
    first: str  = Field(min_length=1, max_length=100000)
    second: str = Field(min_length=1, max_length=100000)

class RewriteRequest(BaseModel):
    resume: dict[str, Any]
    job: dict[str, Any]

class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50000)

# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    meta = get_meta()
    models_ready = (MODELS_DIR / "tfidf.joblib").exists()
    return {
        "status": "ok",
        "model": "ml-v2" if models_ready else "lexical-v2",
        "sbert_enabled": False,
        "trained_on": meta.get("total_records", 0),
        "titles_indexed": meta.get("titles_indexed", 0),
        "domains": meta.get("domains", [])
    }

@app.post("/analyze")
def analyze(payload: TextRequest):
    skills = lex_skills(payload.text)
    entities = [
        {"text": s, "label": next((grp for grp, lst in SKILLS.items() if s in lst), "other")}
        for s in skills
    ]
    return {"skills": skills, "entities": entities, "embedding": [], "model": "lexical-v2"}

@app.post("/similarity")
def similarity(payload: SimilarityRequest):
    score = tfidf_similarity(payload.first, payload.second)
    return {"score": score}

@app.post("/classify")
def classify(payload: ClassifyRequest):
    domain = infer_domain_from_text(payload.text)
    return {"domain": domain}

@app.post("/rewrite")
def rewrite(payload: RewriteRequest):
    """
    ML-powered resume rewrite:
    1. Classify domain using trained classifier
    2. Predict skill gaps from dataset
    3. Gap-fill skills (truth-preserving — only adds skills in original text)
    4. Strengthen experience bullets with domain verbs
    5. Tailor summary for target role
    """
    resume = payload.resume
    job    = payload.job

    resume_skills: list[str] = resume.get("skills") or []
    job_skills:    list[str] = [s.lower() for s in (job.get("skills") or [])]
    source_text:   str       = resume.get("sourceText", "")
    job_title:     str       = job.get("title", "")

    # 1. Domain classification (based on target job to steer rewrite towards target domain)
    job_skills_text = " ".join(job_skills) if job_skills else ""
    if not job_skills_text:
        job_skills_text = " ".join(lex_skills(job.get("description", "")))
    combined_text = job_title + " " + job_skills_text
    domain = infer_domain_from_text(combined_text)

    # 2. Predict skill gap from trained dataset
    dataset_gap = predict_skill_gap(job_title, domain, resume_skills)

    # 3. Merge job-provided skills + dataset-predicted gap
    all_target_skills = list(dict.fromkeys(job_skills + dataset_gap))

    # 4. Gap-fill (truth-preserving)
    optimized_skills = gap_fill_skills(resume_skills, all_target_skills, source_text)

    # 5. Strengthen bullets (skip headers, dates, companies, role/stack lines)
    experience = resume.get("experience") or []
    _MONTHS = {"january","february","march","april","may","june","july","august",
                "september","october","november","december",
                "jan","feb","mar","apr","jun","jul","aug","sep","oct","nov","dec"}
    _BULLET_STARTERS = re.compile(
        r"^(completed|engineered|collaborated|architected|led|designed|developed|built|"
        r"managed|implemented|optimized|monitored|applied|generated|owned|assisted|helped|"
        r"created|worked|delivered|analysed|modelled|processed|visualised|trained|evaluated|"
        r"extracted|transformed|predicted|curated|benchmarked|tuned|validated|aggregated|"
        r"deployed|contributed|supported|enhanced|maintained|reviewed|established|improved|"
        r"enabled|reduced|increased|launched|spearheaded|drove|streamlined|automated|"
        r"integrated|coordinated|conducted|produced|performed)\b",
        re.IGNORECASE
    )

    def _is_bullet(line: str) -> bool:
        s = line.strip()
        lower = s.lower()
        if len(s) < 30:
            return False
        if "|" in s or "@" in s:
            return False
        if lower.startswith("role:") or lower.startswith("tech stack:") or lower.startswith("tools"):
            return False
        words = set(lower.split())
        if words & _MONTHS:
            return False
        if re.search(r"\b\d{4}\b", lower) or re.search(r"\b\d+\s*month", lower):
            return False
        if _BULLET_STARTERS.match(s) or len(s) > 60:
            return True
        return False

    optimized_experience = [
        strengthen_bullet(b, domain) if isinstance(b, str) and _is_bullet(b) else b
        for b in experience
    ]

    # 6. Tailor summary
    skill_gap_list = [s for s in all_target_skills if s not in resume_skills]
    optimized_summary = tailor_summary(resume.get("summary", ""), job, domain, skill_gap_list)

    optimized = {
        **resume,
        "summary":    optimized_summary,
        "skills":     optimized_skills,
        "experience": optimized_experience,
    }

    # 7. Diff changes
    changes = []
    for key in ["summary", "skills", "experience", "projects", "education"]:
        before = resume.get(key, "")
        after  = optimized.get(key, "")
        if before != after:
            changes.append({
                "id": key, "section": key,
                "before": before, "after": after, "status": "pending"
            })

    return {
        "optimized":  optimized,
        "changes":    changes,
        "provider":   "ml-v2",
        "domain":     domain,
        "skill_gap":  skill_gap_list[:10],
        "dataset_skills_added": [s for s in dataset_gap if s not in resume_skills and s in optimized_skills]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "5001")))
