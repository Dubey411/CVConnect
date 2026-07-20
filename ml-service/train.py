"""
CVConnect ML Training Script
Builds and saves 3 models from the job + internship datasets:

1. TF-IDF vectorizer + cosine-similarity index -> resume-job matching score
2. Skill-gap predictor  → given a job title, what skills are most commonly required
3. Role classifier  → given skills/title text, classify to domain category

Run once: python train.py
Outputs saved to: models/
"""

import os
import re
import sys
import json
import pickle
import warnings
sys.stdout.reconfigure(encoding="utf-8")
import pandas as pd
import numpy as np
from collections import Counter, defaultdict

# Scikit-learn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
import joblib

warnings.filterwarnings("ignore")

DATA_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Data", "JobDataSet")
INTERN_DIR = os.path.join(DATA_DIR, "InternshipDataset")
# Use local AppData to avoid OneDrive sync restrictions on binary files
MODELS_DIR = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "CVConnect", "models")
os.makedirs(MODELS_DIR, exist_ok=True)
print(f"Models will be saved to: {MODELS_DIR}")

# ─── Domain taxonomy ──────────────────────────────────────────────────────────
DOMAIN_KEYWORDS = {
    "engineering": [
        "software", "developer", "engineer", "backend", "frontend", "fullstack",
        "devops", "data engineer", "machine learning", "cloud", "swe", "architect",
        "python", "java", "javascript", "typescript", "react", "node", "angular",
        "flutter", "android", "ios", "mobile", "embedded", "firmware", "security",
        "cybersecurity", "blockchain", "web", "api", "database", "sql"
    ],
    "data": [
        "data", "analyst", "analytics", "business intelligence", "bi", "etl",
        "data science", "ai", "machine learning", "nlp", "visualization",
        "tableau", "power bi", "statistician", "research", "quant"
    ],
    "design": [
        "design", "ux", "ui", "figma", "graphic", "product design", "visual",
        "motion", "illustrator", "photoshop", "branding", "creative"
    ],
    "product": [
        "product", "manager", "scrum", "agile", "roadmap", "stakeholder",
        "project manager", "program manager", "operations", "strategy", "growth"
    ],
    "marketing": [
        "marketing", "seo", "social media", "content", "digital marketing",
        "brand", "campaign", "advertising", "pr", "communications", "copywriting"
    ],
    "finance": [
        "finance", "accounting", "financial", "audit", "tax", "investment",
        "banking", "insurance", "actuary", "ca", "cfa", "cpa"
    ],
    "hr": [
        "hr", "human resources", "recruitment", "talent", "payroll",
        "training", "learning & development", "people operations"
    ]
}

def classify_domain(text: str) -> str:
    """Simple keyword-based domain classifier."""
    t = text.lower()
    scores = {domain: 0 for domain in DOMAIN_KEYWORDS}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for kw in keywords:
            if kw in t:
                scores[domain] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "other"

def normalize_skills(raw: str) -> list[str]:
    """Parse comma/semicolon-separated skill string → clean list."""
    if not isinstance(raw, str) or not raw.strip():
        return []
    skills = re.split(r"[,;|/]", raw)
    return [s.strip().lower() for s in skills if s.strip() and len(s.strip()) > 1]

def skills_to_text(skills: list[str]) -> str:
    return " ".join(skills)

# ─── Load datasets ────────────────────────────────────────────────────────────
print("Loading datasets...")

# 1. Internship city CSVs (profile + Skills)
intern_frames = []
for fname in os.listdir(INTERN_DIR):
    if fname.endswith(".csv"):
        try:
            df = pd.read_csv(
                os.path.join(INTERN_DIR, fname),
                encoding="utf-8", on_bad_lines="skip"
            )
            if "Skills" in df.columns:
                profile_col = "profile" if "profile" in df.columns else (
                    "Title" if "Title" in df.columns else None
                )
                if profile_col:
                    df = df[[profile_col, "Skills"]].rename(
                        columns={profile_col: "title", "Skills": "skills_raw"}
                    )
                    intern_frames.append(df)
        except Exception as e:
            print(f"  Skip {fname}: {e}")

intern_df = pd.concat(intern_frames, ignore_index=True).dropna(subset=["skills_raw"])
print(f"  Internship rows: {len(intern_df)}")

# 2. Job CSV (job_title only — no skills column, used for title diversity)
try:
    job_df = pd.read_csv(os.path.join(DATA_DIR, "job.csv"), encoding="utf-8")
    print(f"  Job rows: {len(job_df)}")
except Exception as e:
    print(f"  job.csv: {e}")
    job_df = pd.DataFrame()

# ─── Build unified records ─────────────────────────────────────────────────────
records = []
for _, row in intern_df.iterrows():
    title = str(row["title"]).strip()
    skills = normalize_skills(row["skills_raw"])
    if not skills:
        continue
    domain = classify_domain(title + " " + " ".join(skills))
    records.append({"title": title, "skills": skills, "domain": domain,
                    "skills_text": skills_to_text(skills)})

print(f"Clean records with skills: {len(records)}")

# ─── Model 1: TF-IDF vectorizer on skill text ─────────────────────────────────
print("\nTraining TF-IDF vectorizer...")
skill_texts = [r["skills_text"] for r in records]
tfidf = TfidfVectorizer(
    analyzer="word",
    ngram_range=(1, 2),
    max_features=5000,
    min_df=2,
    sublinear_tf=True
)
tfidf.fit(skill_texts)
joblib.dump(tfidf, os.path.join(MODELS_DIR, "tfidf.joblib"))
print(f"  Vocabulary size: {len(tfidf.vocabulary_)}")

# ─── Model 2: Skill-gap predictor ─────────────────────────────────────────────
# Build: {normalized_title -> skill_frequency_counter}
print("\nBuilding skill-gap predictor...")
title_skill_map: dict[str, Counter] = defaultdict(Counter)
domain_skill_map: dict[str, Counter] = defaultdict(Counter)

for r in records:
    key = re.sub(r"[^a-z0-9 ]", "", r["title"].lower()).strip()
    domain = r["domain"]
    for skill in r["skills"]:
        title_skill_map[key][skill] += 1
        domain_skill_map[domain][skill] += 1

# For each title, keep top-20 skills
top_title_skills = {
    title: [s for s, _ in counter.most_common(20)]
    for title, counter in title_skill_map.items()
    if sum(counter.values()) >= 2  # min 2 appearances
}
top_domain_skills = {
    domain: [s for s, _ in counter.most_common(40)]
    for domain, counter in domain_skill_map.items()
}

skill_gap_model = {
    "title_skills": top_title_skills,
    "domain_skills": top_domain_skills
}
with open(os.path.join(MODELS_DIR, "skill_gap.json"), "w", encoding="utf-8") as f:
    json.dump(skill_gap_model, f, ensure_ascii=False, indent=2)
print(f"  Titles indexed: {len(top_title_skills)}")
print(f"  Domains indexed: {list(top_domain_skills.keys())}")

# ─── Model 3: Role domain classifier ──────────────────────────────────────────
print("\nTraining domain classifier...")
clf_data = [(r["title"] + " " + r["skills_text"], r["domain"]) for r in records]
clf_df = pd.DataFrame(clf_data, columns=["text", "domain"])
clf_df = clf_df[clf_df["domain"] != "other"]

X, y = clf_df["text"].tolist(), clf_df["domain"].tolist()
if len(set(y)) >= 2:
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)
    clf_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=8000, sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=500, C=5.0, class_weight="balanced"))
    ])
    clf_pipeline.fit(X_tr, y_tr)
    acc = clf_pipeline.score(X_te, y_te)
    print(f"  Classifier accuracy: {acc:.2%}")
    joblib.dump(clf_pipeline, os.path.join(MODELS_DIR, "domain_clf.joblib"))
else:
    print("  Not enough domain variety - skipping classifier")

# ─── Save metadata ────────────────────────────────────────────────────────────
meta = {
    "total_records": len(records),
    "tfidf_vocab_size": len(tfidf.vocabulary_),
    "titles_indexed": len(top_title_skills),
    "domains": list(top_domain_skills.keys()),
    "version": "1.0.0"
}
with open(os.path.join(MODELS_DIR, "meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

print("\nDONE: Training complete. Models saved to: " + MODELS_DIR)
print(json.dumps(meta, indent=2))
