import React, { useState, useEffect } from "react";
import {
  Upload, Clock, FileText, Users, Briefcase, User, Plus, Search,
  Check, X, AlertTriangle, ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Shared data
// ---------------------------------------------------------------------------

const STAGES = [
  { key: "sourced", ja: "発掘", en: "Sourced" },
  { key: "training", ja: "研修中", en: "Training" },
  { key: "exam_passed", ja: "試験合格", en: "Exam passed" },
  { key: "matched", ja: "マッチング済", en: "Matched" },
  { key: "documents_in_progress", ja: "書類手続中", en: "Documents" },
  { key: "coe_issued", ja: "COE発行", en: "COE issued" },
  { key: "deployed", ja: "配属済", en: "Deployed" },
];

const INITIAL_CANDIDATES = [
  { id: "C-014", name: "Dilnoza Yusupova", stage: "sourced", level: "—", jobId: null },
  { id: "C-021", name: "Aziz Karimov", stage: "training", level: "JLPT N5", jobId: null },
  { id: "C-009", name: "Nodira Tashkentova", stage: "training", level: "JLPT N5", jobId: null },
  { id: "C-033", name: "Bekzod Rashidov", stage: "exam_passed", level: "JLPT N4", jobId: null },
  { id: "C-018", name: "Malika Abdullayeva", stage: "matched", level: "JLPT N4", jobId: "J-01" },
  { id: "C-007", name: "Sardor Yoldashev", stage: "documents_in_progress", level: "JLPT N4", jobId: "J-01" },
  { id: "C-002", name: "Gulnora Ismoilova", stage: "documents_in_progress", level: "JLPT N3", jobId: "J-02" },
  { id: "C-011", name: "Javlon Nazarov", stage: "coe_issued", level: "JLPT N3", jobId: "J-01" },
  { id: "C-005", name: "Shahnoza Ergasheva", stage: "deployed", level: "JLPT N3", jobId: "J-02" },
];

const JOBS = [
  { id: "J-01", title: "Care Worker — Day Shift", wage: "¥210,000–240,000/mo" },
  { id: "J-02", title: "Care Worker — Live-in", wage: "¥220,000–250,000/mo" },
];

const DOC_TEMPLATE = [
  { type: "在留資格認定証明書交付申請書", en: "Application form (COE)", owner: "agency" },
  { type: "健康診断書", en: "Medical examination report", owner: "candidate" },
  { type: "年金・保険・納税証明", en: "Pension / insurance / tax docs", owner: "candidate" },
  { type: "課税証明書・納税証明書", en: "Taxation certificate", owner: "agency" },
  { type: "二国間協力覚書関連書類", en: "Bilateral MoC procedure docs", owner: "agency" },
  { type: "技能評価試験結果", en: "Skills evaluation result", owner: "candidate" },
  { type: "日本語能力試験結果", en: "JLPT / JFT-Basic result", owner: "candidate" },
  { type: "雇用契約書", en: "Employment contract", owner: "employer" },
  { type: "支援計画書", en: "Support plan (SSW-1)", owner: "agency" },
];

const INITIAL_DOC_STATUS = {
  "C-007": ["verified", "verified", "in_progress", "not_started", "not_started", "verified", "verified", "in_progress", "not_started"],
  "C-002": ["verified", "verified", "verified", "verified", "in_progress", "verified", "verified", "not_started", "not_started"],
  "C-018": ["in_progress", "not_started", "not_started", "not_started", "not_started", "not_started", "verified", "not_started", "not_started"],
  "C-011": ["verified", "verified", "verified", "verified", "verified", "verified", "verified", "verified", "verified"],
};

const DEADLINES = { "C-007": { 3: "2026-08-02" }, "C-002": { 4: "2026-09-10" } };
const OWNER_LABEL = {
  agency: { en: "Agency", ja: "エージェンシー" },
  employer: { en: "Employer", ja: "雇用主" },
  candidate: { en: "Candidate", ja: "候補者" },
};
const TODAY = "2026-08-15";

// The logged-in candidate for the "user" view
const CURRENT_CANDIDATE_ID = "C-007";
// The logged-in employer only owns job J-01
const CURRENT_EMPLOYER_JOB_IDS = ["J-01"];

const COLORS = {
  bg: "#FAF8F4",
  card: "#FFFFFF",
  cardAlt: "#FAF8F4",
  border: "#DDD8CD",
  ink: "#1F2D3D",
  slate: "#3D4A5C",
  muted: "#6B7280",
  faint: "#9CA3AF",
  stamp: "#B23A2E",
  overdueBg: "#FBEAE8",
  soonBg: "#FBF1DE",
  soonText: "#92650B",
};

function defaultStatuses() {
  return DOC_TEMPLATE.map(() => "not_started");
}

function pctFor(id, docStatus) {
  const s = docStatus[id];
  if (!s) return 0;
  return Math.round((s.filter((x) => x === "verified").length / s.length) * 100);
}

function daysUntil(dateStr) {
  return Math.round((new Date(dateStr) - new Date(TODAY)) / 86400000);
}

function overdueDocsFor(id, docStatus) {
  const statuses = docStatus[id] || defaultStatuses();
  const deadlines = DEADLINES[id] || {};
  return Object.entries(deadlines).filter(
    ([idx, date]) => statuses[idx] !== "verified" && daysUntil(date) < 0
  ).length;
}

// ---------------------------------------------------------------------------
// Signature element: hanko stamp
// ---------------------------------------------------------------------------

function HankoStamp({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
      <g transform="rotate(-6 20 20)">
        <circle cx="20" cy="20" r="17" fill="none" stroke={COLORS.stamp} strokeWidth="2.2" opacity="0.9" />
        <text x="20" y="26" textAnchor="middle" fontFamily="'Shippori Mincho', serif" fontSize="17" fill={COLORS.stamp} opacity="0.9">済</text>
      </g>
    </svg>
  );
}

function StatusMark({ status, size = 22 }) {
  if (status === "verified") return <HankoStamp size={size} />;
  if (status === "submitted")
    return <span className="inline-flex rounded-full border-2" style={{ width: size, height: size, borderColor: COLORS.slate, flexShrink: 0 }} />;
  if (status === "in_progress")
    return <span className="inline-flex rounded-full border-2 border-dashed" style={{ width: size, height: size, borderColor: "#8A7B5E", flexShrink: 0 }} />;
  return <span className="inline-block rounded-full border" style={{ width: size, height: size, borderColor: COLORS.border, flexShrink: 0 }} />;
}

const STATUS_LABEL = {
  not_started: { en: "Not started", ja: "未着手" },
  in_progress: { en: "In progress", ja: "進行中" },
  submitted: { en: "Submitted", ja: "提出済" },
  verified: { en: "Verified", ja: "確認済" },
};

// ---------------------------------------------------------------------------
// Small reusable UI
// ---------------------------------------------------------------------------

function ProgressBar({ value, color = COLORS.stamp }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: COLORS.border }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${value}%`, background: color, transition: "width 300ms ease" }}
      />
    </div>
  );
}

function Legend({ lang }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 px-1">
      {Object.entries(STATUS_LABEL).map(([status, label]) => (
        <div key={status} className="flex items-center gap-1.5">
          <StatusMark status={status} size={15} />
          <span className="text-xs" style={{ color: COLORS.muted }}>{lang === "en" ? label.en : label.ja}</span>
        </div>
      ))}
    </div>
  );
}

function DeadlinePill({ date, isVerified }) {
  if (isVerified) return null;
  const diff = daysUntil(date);
  const overdue = diff < 0;
  const soon = !overdue && diff <= 14;
  const bg = overdue ? COLORS.overdueBg : soon ? COLORS.soonBg : "transparent";
  const color = overdue ? COLORS.stamp : soon ? COLORS.soonText : COLORS.muted;
  return (
    <div className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded whitespace-nowrap" style={{ color, background: bg }}>
      <Clock size={11} />
      {date}
    </div>
  );
}

function StageStepper({ stageKey, lang }) {
  const currentIndex = STAGES.findIndex((s) => s.key === stageKey);
  return (
    <div className="flex items-start overflow-x-auto pb-1 -mx-1 px-1" aria-label={lang === "en" ? "Pipeline stages" : "受入段階"}>
      {STAGES.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center" style={{ minWidth: 76 }}>
              <div
                className="flex items-center justify-center rounded-full font-mono text-xs"
                style={{
                  width: 26,
                  height: 26,
                  background: done ? COLORS.ink : current ? COLORS.stamp : COLORS.card,
                  border: current || done ? "none" : `1px solid ${COLORS.border}`,
                  color: done || current ? "#FFFFFF" : COLORS.muted,
                }}
              >
                {done ? <Check size={13} /> : i + 1}
              </div>
              <div
                className="text-[11px] mt-1.5 text-center leading-tight"
                style={{ color: current ? COLORS.ink : COLORS.muted, fontWeight: current ? 600 : 400, maxWidth: 76 }}
              >
                {lang === "en" ? s.en : s.ja}
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div className="h-[1px] mt-[13px] mx-1" style={{ minWidth: 16, flex: 1, background: done ? COLORS.ink : COLORS.border }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-4 py-2.5 rounded shadow-lg text-sm"
          style={{ background: COLORS.ink, color: "#FFFFFF" }}
        >
          <Check size={14} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared checklist renderer — role controls what's editable
// ---------------------------------------------------------------------------

function Checklist({ candidateId, lang, editableOwners = [], docStatus, onUpload, allowVerify, onVerify }) {
  const statuses = docStatus[candidateId] || defaultStatuses();
  const deadlines = DEADLINES[candidateId] || {};

  return (
    <div className="rounded border overflow-hidden" style={{ borderColor: COLORS.border }}>
      {DOC_TEMPLATE.map((doc, i) => {
        const status = statuses[i];
        const deadline = deadlines[i];
        const canEdit = editableOwners.includes(doc.owner) && (status === "not_started" || status === "in_progress");
        const canVerify = allowVerify && status === "submitted";

        let note = null;
        if (status !== "verified" && !canEdit && !canVerify) {
          note =
            status === "submitted"
              ? (lang === "en" ? "Awaiting agency verification" : "エージェンシーの確認待ち")
              : (lang === "en" ? `Awaiting ${OWNER_LABEL[doc.owner].en}` : `${OWNER_LABEL[doc.owner].ja}待ち`);
        }

        return (
          <div
            key={i}
            className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-4 py-3"
            style={{ background: i % 2 === 0 ? COLORS.card : COLORS.cardAlt, borderBottom: i < DOC_TEMPLATE.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
          >
            <StatusMark status={status} />
            <div className="flex-1 min-w-[140px]">
              <div className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{lang === "en" ? doc.en : doc.type}</div>
              <div className="font-mono text-xs mt-0.5" style={{ color: COLORS.muted }}>{OWNER_LABEL[doc.owner][lang]}</div>
            </div>

            {deadline && <DeadlinePill date={deadline} isVerified={status === "verified"} />}

            {canVerify ? (
              <button
                onClick={() => onVerify(candidateId, i)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border font-medium"
                style={{ borderColor: COLORS.stamp, color: COLORS.stamp }}
              >
                <Check size={12} />{lang === "en" ? "Verify" : "確認する"}
              </button>
            ) : canEdit ? (
              <button
                onClick={() => onUpload(candidateId, i)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border"
                style={{ borderColor: COLORS.slate, color: COLORS.slate }}
              >
                <Upload size={12} />{lang === "en" ? "Upload" : "アップロード"}
              </button>
            ) : note ? (
              <div className="text-xs px-1 py-1" style={{ color: COLORS.faint }}>{note}</div>
            ) : (
              <div className="text-xs px-1 py-1 font-medium" style={{ color: COLORS.stamp }}>
                {lang === "en" ? "Verified" : "確認済"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add candidate modal (agency only)
// ---------------------------------------------------------------------------

function AddCandidateModal({ lang, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("—");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), level });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(31,45,61,0.45)" }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="w-full max-w-sm rounded border p-5"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={lang === "en" ? "Add candidate" : "候補者を追加"}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg" style={{ color: COLORS.ink }}>
            {lang === "en" ? "Add candidate" : "候補者を追加"}
          </h3>
          <button onClick={onClose} aria-label={lang === "en" ? "Close" : "閉じる"}>
            <X size={18} style={{ color: COLORS.muted }} />
          </button>
        </div>

        <label className="block text-xs font-mono mb-1" style={{ color: COLORS.muted }}>
          {lang === "en" ? "Full name" : "氏名"}
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full mb-4 px-3 py-2 rounded border text-sm"
          style={{ borderColor: COLORS.border, color: COLORS.ink }}
          placeholder={lang === "en" ? "e.g. Feruza Nomozova" : "例：フェルーザ・ノモゾワ"}
        />

        <label className="block text-xs font-mono mb-1" style={{ color: COLORS.muted }}>
          {lang === "en" ? "Japanese level" : "日本語レベル"}
        </label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="w-full mb-5 px-3 py-2 rounded border text-sm"
          style={{ borderColor: COLORS.border, color: COLORS.ink }}
        >
          {["—", "JLPT N5", "JLPT N4", "JLPT N3", "JLPT N2", "JLPT N1"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-3 py-2 rounded border" style={{ borderColor: COLORS.border, color: COLORS.muted }}>
            {lang === "en" ? "Cancel" : "キャンセル"}
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="text-xs px-3 py-2 rounded border font-medium"
            style={{ borderColor: COLORS.ink, color: "#FFFFFF", background: name.trim() ? COLORS.ink : COLORS.faint }}
          >
            {lang === "en" ? "Add to pipeline" : "パイプラインに追加"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AGENCY VIEW — full write + verify access, all candidates, all stages
// ---------------------------------------------------------------------------

function AgencyView({ lang, candidates, docStatus, onUpload, onVerify, onAddCandidate }) {
  const [selectedId, setSelectedId] = useState("C-007");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? candidates.filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
    : candidates;
  const grouped = STAGES.map((s) => ({ ...s, items: filtered.filter((c) => c.stage === s.key) }));

  const overdueCandidates = candidates.filter((c) => overdueDocsFor(c.id, docStatus) > 0);
  const selected = candidates.find((c) => c.id === selectedId);

  return (
    <div>
      {overdueCandidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 px-4 py-3 rounded border" style={{ background: COLORS.overdueBg, borderColor: "#E9C7C2" }}>
          <AlertTriangle size={16} style={{ color: COLORS.stamp, flexShrink: 0 }} />
          <span className="text-sm" style={{ color: COLORS.stamp }}>
            {lang === "en"
              ? `${overdueCandidates.length} candidate${overdueCandidates.length > 1 ? "s have" : " has"} overdue documents:`
              : `${overdueCandidates.length}名の候補者に期限超過の書類があります：`}
          </span>
          {overdueCandidates.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="text-sm font-medium underline"
              style={{ color: COLORS.stamp }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.muted }}>
          {lang === "en" ? "All sourced candidates" : "自社候補者一覧"}
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} style={{ position: "absolute", left: 9, top: 9, color: COLORS.muted }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "en" ? "Search name or ID" : "氏名またはIDで検索"}
              className="pl-7 pr-3 py-1.5 rounded border text-xs w-44"
              style={{ borderColor: COLORS.border, color: COLORS.ink }}
              aria-label={lang === "en" ? "Search candidates" : "候補者を検索"}
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border whitespace-nowrap"
            style={{ borderColor: COLORS.ink, color: COLORS.ink }}
          >
            <Plus size={12} />{lang === "en" ? "Add candidate" : "候補者を追加"}
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 mb-8">
        {grouped.map((stage) => (
          <div key={stage.key} className="flex-1" style={{ minWidth: 160 }}>
            <div className="text-xs font-medium mb-2 pb-2 border-b-2" style={{ borderColor: COLORS.ink, color: COLORS.ink }}>
              {lang === "en" ? stage.en : stage.ja}
              <span className="font-mono ml-1.5" style={{ color: COLORS.muted }}>{stage.items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {stage.items.length === 0 && (
                <div className="text-xs px-1 py-2" style={{ color: COLORS.faint }}>
                  {lang === "en" ? "None" : "該当なし"}
                </div>
              )}
              {stage.items.map((c) => {
                const overdue = overdueDocsFor(c.id, docStatus) > 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="text-left px-3 py-2.5 rounded border text-sm"
                    style={{ background: selectedId === c.id ? "#EFEAE1" : COLORS.card, borderColor: selectedId === c.id ? COLORS.ink : COLORS.border }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate" style={{ color: COLORS.ink }}>{c.name}</span>
                      {overdue && <AlertTriangle size={12} style={{ color: COLORS.stamp, flexShrink: 0 }} />}
                    </div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: COLORS.muted }}>{c.id} · {c.level}</div>
                    {docStatus[c.id] && (
                      <div className="mt-2"><ProgressBar value={pctFor(c.id, docStatus)} /></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <FileText size={16} style={{ color: COLORS.muted }} />
            <span className="font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.muted }}>
              {lang === "en" ? "Document checklist" : "書類チェックリスト"}
            </span>
            <span className="font-display text-lg ml-2" style={{ color: COLORS.ink }}>{selected.name}</span>
            <span className="font-mono text-xs" style={{ color: COLORS.muted }}>{pctFor(selected.id, docStatus)}%</span>
          </div>
          <div className="max-w-xs mb-4"><ProgressBar value={pctFor(selected.id, docStatus)} /></div>
          <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
            {lang === "en"
              ? "Upload on behalf of anyone, then verify once a document is submitted."
              : "誰の書類でも代行アップロードでき、提出後に確認できます。"}
          </p>
          <Legend lang={lang} />
          <Checklist
            candidateId={selected.id}
            lang={lang}
            editableOwners={["agency", "candidate", "employer"]}
            docStatus={docStatus}
            onUpload={onUpload}
            allowVerify={true}
            onVerify={onVerify}
          />
        </>
      )}

      {showAdd && (
        <AddCandidateModal
          lang={lang}
          onClose={() => setShowAdd(false)}
          onAdd={(data) => { onAddCandidate(data); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EMPLOYER VIEW — only own job postings + matched candidates, own-doc write only
// ---------------------------------------------------------------------------

function EmployerView({ lang, candidates, docStatus, onUpload }) {
  const myJobs = JOBS.filter((j) => CURRENT_EMPLOYER_JOB_IDS.includes(j.id));
  const myCandidates = candidates.filter((c) => CURRENT_EMPLOYER_JOB_IDS.includes(c.jobId));
  const [selectedId, setSelectedId] = useState(myCandidates[0]?.id);
  const selected = myCandidates.find((c) => c.id === selectedId);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Briefcase size={16} style={{ color: COLORS.muted }} />
        <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.muted }}>
          {lang === "en" ? "My job postings" : "自社の求人"}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {myJobs.map((j) => (
          <div key={j.id} className="rounded border p-4" style={{ borderColor: COLORS.border, background: COLORS.card }}>
            <div className="text-sm font-medium" style={{ color: COLORS.ink }}>{j.title}</div>
            <div className="font-mono text-xs mt-1" style={{ color: COLORS.muted }}>{j.wage}</div>
          </div>
        ))}
      </div>

      <h2 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: COLORS.muted }}>
        {lang === "en" ? "Matched candidates (read-only profile)" : "マッチング済候補者（閲覧のみ）"}
      </h2>

      {myCandidates.length === 0 ? (
        <div className="rounded border p-6 text-center mb-8" style={{ borderColor: COLORS.border, background: COLORS.card }}>
          <Users size={20} style={{ color: COLORS.faint, margin: "0 auto 8px" }} />
          <div className="text-sm" style={{ color: COLORS.muted }}>
            {lang === "en" ? "No candidates matched to your postings yet." : "現在マッチング済の候補者はいません。"}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {myCandidates.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="text-left rounded border p-4"
              style={{ background: selectedId === c.id ? "#EFEAE1" : COLORS.card, borderColor: selectedId === c.id ? COLORS.ink : COLORS.border }}
            >
              <div className="text-sm font-medium" style={{ color: COLORS.ink }}>{c.name}</div>
              <div className="font-mono text-xs mt-1" style={{ color: COLORS.muted }}>{c.level}</div>
              <div className="mt-3"><ProgressBar value={pctFor(c.id, docStatus)} /></div>
              <div className="text-xs mt-1.5" style={{ color: COLORS.muted }}>
                {pctFor(c.id, docStatus)}% {lang === "en" ? "documents complete" : "書類完了"}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: COLORS.muted }} />
            <span className="font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.muted }}>
              {lang === "en" ? "Document checklist" : "書類チェックリスト"}
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
            {lang === "en"
              ? "You can only upload documents where you're the assigned owner (e.g. the employment contract)."
              : "自社が担当する書類のみアップロード可能です（例：雇用契約書）。"}
          </p>
          <Legend lang={lang} />
          <Checklist
            candidateId={selected.id}
            lang={lang}
            editableOwners={["employer"]}
            docStatus={docStatus}
            onUpload={onUpload}
            allowVerify={false}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CANDIDATE ("user") VIEW — fully read-only, own record only
// ---------------------------------------------------------------------------

function CandidateView({ lang, candidates, docStatus }) {
  const me = candidates.find((c) => c.id === CURRENT_CANDIDATE_ID);
  const stageLabel = STAGES.find((s) => s.key === me.stage);
  const pct = pctFor(me.id, docStatus);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <User size={16} style={{ color: COLORS.muted }} />
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.muted }}>
          {lang === "en" ? "My progress" : "私の進捗"}
        </span>
      </div>
      <h2 className="font-display text-2xl mb-5" style={{ color: COLORS.ink }}>{me.name}</h2>

      <div className="mb-8 rounded border p-4" style={{ borderColor: COLORS.border, background: COLORS.card }}>
        <StageStepper stageKey={me.stage} lang={lang} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded border p-4" style={{ borderColor: COLORS.border, background: COLORS.card }}>
          <div className="text-xs mb-1" style={{ color: COLORS.muted }}>{lang === "en" ? "Current stage" : "現在の段階"}</div>
          <div className="font-display text-lg" style={{ color: COLORS.ink }}>{lang === "en" ? stageLabel.en : stageLabel.ja}</div>
        </div>
        <div className="rounded border p-4" style={{ borderColor: COLORS.border, background: COLORS.card }}>
          <div className="text-xs mb-1" style={{ color: COLORS.muted }}>{lang === "en" ? "Language level" : "日本語レベル"}</div>
          <div className="font-display text-lg" style={{ color: COLORS.ink }}>{me.level}</div>
        </div>
        <div className="rounded border p-4" style={{ borderColor: COLORS.border, background: COLORS.card }}>
          <div className="text-xs mb-1" style={{ color: COLORS.muted }}>{lang === "en" ? "Documents complete" : "書類完了率"}</div>
          <div className="font-display text-lg mb-2" style={{ color: COLORS.ink }}>{pct}%</div>
          <ProgressBar value={pct} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} style={{ color: COLORS.muted }} />
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.muted }}>
          {lang === "en" ? "My document status" : "私の書類状況"}
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
        {lang === "en"
          ? "This is a view of your progress — your agency and employer handle uploads and verification on your behalf."
          : "こちらは進捗確認用の画面です。アップロードと確認はエージェンシー・雇用主が行います。"}
      </p>
      <Legend lang={lang} />
      <Checklist candidateId={me.id} lang={lang} editableOwners={[]} docStatus={docStatus} onUpload={() => {}} allowVerify={false} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App shell with role switcher
// ---------------------------------------------------------------------------

const ROLES = [
  { key: "agency", en: "Agency", ja: "エージェンシー", icon: Users },
  { key: "employer", en: "Employer", ja: "雇用主", icon: Briefcase },
  { key: "candidate", en: "Candidate", ja: "候補者", icon: User },
];

export default function RoleDashboards() {
  const [role, setRole] = useState("agency");
  const [lang, setLang] = useState("en");
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [docStatus, setDocStatus] = useState(INITIAL_DOC_STATUS);
  const [toasts, setToasts] = useState([]);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
  };

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((t) => t.slice(1)), 2600);
    return () => clearTimeout(timer);
  }, [toasts]);

  const updateStatus = (candidateId, index, newStatus) => {
    setDocStatus((prev) => {
      const current = prev[candidateId] ? [...prev[candidateId]] : defaultStatuses();
      current[index] = newStatus;
      return { ...prev, [candidateId]: current };
    });
  };

  const handleUpload = (candidateId, index) => {
    updateStatus(candidateId, index, "submitted");
    pushToast(lang === "en" ? "Document uploaded" : "書類をアップロードしました");
  };

  const handleVerify = (candidateId, index) => {
    updateStatus(candidateId, index, "verified");
    pushToast(lang === "en" ? "Document verified" : "書類を確認しました");
  };

  const handleAddCandidate = ({ name, level }) => {
    const newId = `C-${Math.floor(100 + Math.random() * 899)}`;
    setCandidates((prev) => [...prev, { id: newId, name, stage: "sourced", level, jobId: null }]);
    pushToast(lang === "en" ? "Candidate added" : "候補者を追加しました");
  };

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .font-display { font-family: 'Shippori Mincho', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        *:focus-visible { outline: 2px solid ${COLORS.stamp}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>

      <header className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-5 border-b" style={{ borderColor: COLORS.border }}>
        <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h1 className="font-display text-xl sm:text-2xl tracking-tight">受入パイプライン</h1>
          <span className="font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.muted }}>SSW Intake · Care Work</span>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "ja" : "en")}
          className="font-mono text-xs px-3 py-1.5 rounded border"
          style={{ borderColor: COLORS.slate, color: COLORS.slate }}
          aria-label={lang === "en" ? "Switch to Japanese" : "Switch to English"}
        >
          {lang === "en" ? "日本語" : "English"}
        </button>
      </header>

      {/* Role switcher */}
      <div className="flex gap-1 px-5 sm:px-8 pt-5 overflow-x-auto" style={{ borderBottom: `1px solid ${COLORS.border}` }} role="tablist" aria-label={lang === "en" ? "Choose your role" : "役割を選択"}>
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRole(r.key)}
            role="tab"
            aria-selected={role === r.key}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t border border-b-0 whitespace-nowrap"
            style={{
              background: role === r.key ? COLORS.card : "transparent",
              borderColor: role === r.key ? COLORS.border : "transparent",
              color: role === r.key ? COLORS.ink : COLORS.muted,
              marginBottom: role === r.key ? "-1px" : "0",
            }}
          >
            <r.icon size={14} />
            {lang === "en" ? r.en : r.ja}
          </button>
        ))}
      </div>

      <main className="px-5 sm:px-8 py-6" style={{ background: COLORS.card }}>
        <div className="max-w-5xl">
          {role === "agency" && (
            <AgencyView lang={lang} candidates={candidates} docStatus={docStatus} onUpload={handleUpload} onVerify={handleVerify} onAddCandidate={handleAddCandidate} />
          )}
          {role === "employer" && (
            <EmployerView lang={lang} candidates={candidates} docStatus={docStatus} onUpload={handleUpload} />
          )}
          {role === "candidate" && (
            <CandidateView lang={lang} candidates={candidates} docStatus={docStatus} />
          )}
        </div>
      </main>

      <ToastStack toasts={toasts} />
    </div>
  );
}