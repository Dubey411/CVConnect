/**
 * ScorePanel.jsx — ATS Match Intelligence
 * Shows: score, radar chart, skill gaps, keyword gaps, action items, rewrite button
 * Auto-apply section removed.
 */
import { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle2, Sparkles, TrendingUp, XCircle } from 'lucide-react';

const DIM_LABELS = {
  skills: 'Skills',
  experience: 'Experience',
  keywords: 'Keywords',
  domain: 'Domain',
  education: 'Education',
};

/* ── helpers ────────────────────────────────────────────────────────────── */
function scoreColor(s) {
  if (s >= 75) return 'text-[#A8412E]';
  if (s >= 55) return 'text-[#D4A24C]';
  return 'text-[#A8412E]';
}

function scoreBg(s) {
  if (s >= 75) return 'bg-[#A8412E]/10 border-[#A8412E]/30';
  if (s >= 55) return 'bg-[#D4A24C]/15 border-[#D4A24C]/35';
  return 'bg-[#A8412E]/10 border-[#A8412E]/25';
}

function scoreLabel(s) {
  if (s >= 85) return '🎯 Excellent Match';
  if (s >= 70) return '✅ Strong Match';
  if (s >= 55) return '⚡ Good Foundation';
  return '⚠️ Needs Work';
}

/* ── keyword chip ───────────────────────────────────────────────────────── */
function Chip({ text, variant = 'missing' }) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-medium transition-colors';
  const styles = {
    missing:  `${base} bg-[#A8412E]/10 text-[#A8412E] border border-[#A8412E]/25`,
    matched:  `${base} bg-[#D4A24C]/15 text-[#2B2D42] border border-[#D4A24C]/35`,
    neutral:  `${base} bg-[#F5EFE4] text-[#5F6170] border border-[#2B2D42]/12`,
  };
  return <span className={styles[variant]}>{text}</span>;
}

/* ── action item ─────────────────────────────────────────────────────────── */
function ActionItem({ n, text }) {
  return (
    <div className="flex gap-2.5 text-xs text-[#2B2D42] leading-relaxed">
      <span
        className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-[#A8412E]/15 text-[#A8412E] text-[9px] font-bold flex items-center justify-center"
      >
        {n}
      </span>
      {text}
    </div>
  );
}

/* ── empty state ─────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="panel flex min-h-72 flex-col justify-between p-5">
      <div>
        <p className="eyebrow">Match Intelligence</p>
        <h2 className="mt-2 text-xl font-semibold">Nothing to score—yet.</h2>
        <p className="mt-2 max-w-xs text-sm leading-6 text-[#5F6170]">
          Paste a job description and upload your resume to see your ATS match score, skill gaps, and what to add.
        </p>
      </div>
      <div className="font-mono text-[11px] text-[#5F6170]">
        Scored across: Skills · Experience · Keywords · Domain · Education
      </div>
    </div>
  );
}

/* ── main ────────────────────────────────────────────────────────────────── */
export default function ScorePanel({ analysis, onRewrite, busy, resumeId }) {
  const [showAllMissing, setShowAllMissing] = useState(false);

  if (!resumeId || !analysis) return <EmptyState />;

  const radarData = Object.entries(analysis.components).map(([k, v]) => ({
    dimension: DIM_LABELS[k] ?? k,
    value: v,
  }));

  const sc       = analysis.score ?? 0;
  const cColor   = scoreColor(sc);
  const cBg      = scoreBg(sc);

  // Build action items from missing skills + gap hints
  const actionItems = [
    ...(analysis.missingSkills || []).slice(0, 3).map(s => `Add "${s}" to your Skills section`),
    ...(analysis.keywordGaps   || []).slice(0, 3).map(k => `Use the phrase "${k}" in your Experience bullets`),
  ].filter(Boolean).slice(0, 5);

  const missingKeywords = analysis.keywordGaps    || analysis.missingKeywords  || [];
  const matchedKeywords = analysis.matchedKeywords || [];
  const missingSkills   = analysis.missingSkills  || [];
  const matchedSkills   = analysis.matchedSkills  || [];

  const visibleMissing  = showAllMissing ? missingKeywords : missingKeywords.slice(0, 8);

  return (
    <div className="panel p-5 space-y-5">

      {/* ── Header ── */}
      <div>
        <p className="eyebrow">Match Intelligence</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className={`text-5xl font-bold tracking-tighter font-mono ${cColor}`}>{sc}</span>
            <span className="text-lg text-[#5F6170]">%</span>
          </div>
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${cBg} ${cColor}`}>
            {scoreLabel(sc)}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-[#5F6170] font-mono">ATS Score {analysis.atsScore ?? '—'}/100</div>
      </div>

      {/* ── Radar ── */}
      <div className="h-44">
        <ResponsiveContainer>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(43, 45, 66, 0.12)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: '#5F6170', fontSize: 10 }} />
            <Radar dataKey="value" stroke="#A8412E" strokeWidth={2} fill="#A8412E" fillOpacity={0.20} dot={{ r: 3, fill: '#D4A24C', stroke: '#A8412E' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FAF6EE',
                border: '1px solid rgba(43, 45, 66, 0.14)',
                borderRadius: '8px',
                color: '#2B2D42',
                fontSize: '11px',
                boxShadow: '0 4px 16px rgba(43, 45, 66, 0.08)'
              }}
              labelStyle={{ color: '#2B2D42', fontWeight: 600 }}
              itemStyle={{ color: '#A8412E' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="rule -mx-5" />

      {/* ── Skill Gaps ── */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-[#2B2D42] flex items-center gap-1.5">
          <XCircle size={12} className="text-[#A8412E]" /> Missing Skills
        </p>
        {missingSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.slice(0, 8).map(s => <Chip key={s} text={s} variant="missing" />)}
          </div>
        ) : (
          <p className="text-xs text-[#5F6170] italic">All required skills matched.</p>
        )}

        {matchedSkills.length > 0 && (
          <>
            <p className="text-xs font-medium text-[#2B2D42] flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-[#A8412E]" /> Matched Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {matchedSkills.slice(0, 6).map(s => <Chip key={s} text={s} variant="matched" />)}
            </div>
          </>
        )}
      </div>

      <div className="rule -mx-5" />

      {/* ── Keyword Gaps ── */}
      {missingKeywords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#2B2D42] flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            JD Keywords Not in Your Resume ({missingKeywords.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visibleMissing.map(k => <Chip key={k} text={k} variant="neutral" />)}
          </div>
          {missingKeywords.length > 8 && (
            <button
              onClick={() => setShowAllMissing(v => !v)}
              className="text-[10px] text-[#A8412E] hover:underline"
            >
              {showAllMissing ? 'Show less' : `+${missingKeywords.length - 8} more`}
            </button>
          )}
        </div>
      )}

      {/* ── Action Items ── */}
      {actionItems.length > 0 && (
        <>
          <div className="rule -mx-5" />
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-[#2B2D42] flex items-center gap-1.5">
              <TrendingUp size={12} className="text-[#A8412E]" /> What to Add to Improve Your Score
            </p>
            {actionItems.map((item, i) => <ActionItem key={i} n={i + 1} text={item} />)}
          </div>
        </>
      )}

      <div className="rule -mx-5" />

      {/* ── Rewrite CTA ── */}
      <button
        onClick={onRewrite}
        disabled={busy}
        className="button-primary w-full disabled:opacity-50 text-xs py-2.5 flex items-center justify-center gap-1.5"
      >
        <Sparkles size={14} />
        {busy ? 'Generating tailored resume…' : '⚡ Generate Tailored Resume'}
      </button>
      <p className="text-center text-[10px] text-slate-600">
        AI rewrites your resume bullets to match this JD's language and keywords
      </p>
    </div>
  );
}
