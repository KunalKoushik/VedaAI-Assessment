import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';
import {
  Home, Users, BookOpen, Wrench, Library,
  Settings, Bell, ChevronDown, ChevronLeft,
  Download, RefreshCw, Plus, Sparkles
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
interface Question {
  text: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  marks: number;
}
interface Section {
  title: string;
  instruction: string;
  questions: Question[];
}
interface QuestionPaper {
  _id: string;
  subject: string;
  className: string;
  timeAllowed: number;
  maxMarks: number;
  sections: Section[];
  answerKey?: string;
}
interface Assignment {
  _id: string;
  title: string;
  status: string;
  generatedPaperId?: string;
}

// ── VedaAI Logo ────────────────────────────────────────────────────
function VedaLogo({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: 'linear-gradient(135deg, #FF6B35 0%, #E84646 100%)',
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.5, fontFamily: 'Georgia, serif' }}>V</span>
    </div>
  );
}

// ── Difficulty Badge ───────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    Easy: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    Moderate: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    Challenging: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  };
  const style = map[difficulty] || map.Easy;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {difficulty}
    </span>
  );
}

// ── PDF Download util ──────────────────────────────────────────────
function printPaper(el?: HTMLElement | null) {
  // If no element provided, fall back to default print
  if (!el) return window.print();

  // Open a new window and write only the paper content into it.
  // Copy existing styles so Tailwind and app styles apply in the print preview.
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return window.print();

  // Clone the element so we can replace inputs with their values for printing
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('input, textarea').forEach((node) => {
    const n = node as HTMLInputElement | HTMLTextAreaElement;
    const span = document.createElement('span');
    span.textContent = n.value || n.placeholder || '';
    node.parentNode?.replaceChild(span, node);
  });

  const headHtml = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join('\n');

  // Inject override print styles to ensure the cloned content is visible
  const overrideStyles = `
    <style>
      @media print {
        body * { visibility: visible !important; }
        aside, header, button, a { display: none !important; }
        .print\\:shadow-none { position: static !important; visibility: visible !important; width: auto !important; left: auto !important; top: auto !important; }
      }
      body { background: #fff; color: #000; }
    </style>`;

  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">${headHtml}\n${overrideStyles}
    <style>@page{size:auto;margin:20mm} body{background:#fff}</style></head><body>
    ${clone.outerHTML}
    </body></html>`);
  win.document.close();
  win.focus();

  // Give the new window a moment to load fonts/images before printing
  setTimeout(() => {
    try {
      win.print();
      win.close();
    } catch (e) {
      console.error('Print failed', e);
    }
  }, 700);
}

// ── Main Output Page ───────────────────────────────────────────────
export default function AssignmentOutput() {
  const router = useRouter();
  const { id } = router.query;
  const printRef = useRef<HTMLDivElement>(null);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questionPaper, setQuestionPaper] = useState<QuestionPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState({ name: '', rollNumber: '', section: '' });
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  useEffect(() => {
    if (id) fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    try {
      const assignmentId = Array.isArray(id) ? id[0] : id;
      const res = await axios.get(`/api/assignments/${assignmentId}`);
      if (res.data.success) {
        const data = res.data.data;
        setAssignment(data);
        if (data.generatedPaperId) {
          const paperId = typeof data.generatedPaperId === 'object'
            ? data.generatedPaperId._id || data.generatedPaperId.toString()
            : data.generatedPaperId;
          await fetchQuestionPaper(paperId);
        } else {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchQuestionPaper = async (paperId: string) => {
    try {
      const res = await axios.get(`/api/question-papers/${paperId}`);
      if (res.data.success) setQuestionPaper(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: Users, label: 'My Groups' },
    { icon: BookOpen, label: 'Assignments', badge: 32 },
    { icon: Wrench, label: "AI Teacher's Toolkit" },
    { icon: Library, label: 'My Library' },
  ];

  // ── Sidebar ───────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20 shadow-sm">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <VedaLogo size={30} />
          <span className="text-lg font-bold text-gray-900 tracking-tight">VedaAI</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #E84646)' }}>
          <Sparkles size={14} />
          AI Teacher's Toolkit
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ icon: Icon, label, active, badge }) => (
          <a key={label} href="#"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
              ${active ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'}`}>
            <Icon size={15} className={active ? 'text-gray-700' : 'text-gray-400'} />
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #E84646)' }}>
                {badge}
              </span>
            )}
          </a>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-50">
          <Settings size={15} />
          Settings
        </a>
        <div className="mt-3 mx-1 p-3 bg-gray-50 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">D</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">Delhi Public School</p>
            <p className="text-xs text-gray-400 truncate">Bokaro Steel City</p>
          </div>
        </div>
      </div>
    </aside>
  );

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className=" min-h-screen bg-[#F5F5F5] flex font-sans">
        <Sidebar />
        <div className="flex-1 ml-60 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Loading question paper…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Still Generating ──────────────────────────────────────────────
  if (!assignment || assignment.status !== 'completed' || !questionPaper) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex font-sans">
        <Sidebar />
        <div className="flex-1 ml-60 flex flex-col">
          <header className="bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-3 shadow-sm">
            <Link href="/" className="p-1.5 text-gray-400 hover:text-gray-600"><ChevronLeft size={18} /></Link>
            <span className="text-sm text-gray-400">Assignment</span>
          </header>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl border border-amber-200 p-10 text-center max-w-md shadow-sm">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={24} className="text-amber-500 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Generating your paper…</h2>
              <p className="text-sm text-gray-500 mb-1">AI is crafting your question paper.</p>
              <p className="text-xs text-gray-400 mb-6">Status: <span className="font-medium text-amber-600">{assignment?.status || 'Processing'}</span></p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-white"
                style={{ background: '#111' }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full Output ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex font-sans">
      <Sidebar />

      <div className="flex-1 ml-60 flex flex-col">

        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <Link href="/" className="p-1.5 text-gray-400 hover:text-gray-600"><ChevronLeft size={18} /></Link>
          <div className="flex items-center gap-1.5">
            <Plus size={14} className="text-gray-300" />
            <span className="text-sm text-gray-400">Create New</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="relative">
              <Bell size={18} className="text-gray-500" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">1</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">J</div>
              <span className="text-sm font-medium text-gray-700">John Doe</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-7">

          {/* ── AI Banner ──────────────────────────────────────── */}
          <div className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-6"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}>
            <p className="text-white text-sm leading-relaxed font-medium flex-1">
              Certainly, {studentInfo.name || 'Teacher'}! Here are customized Question Papers for your{' '}
              {questionPaper.subject} – Class {questionPaper.className} students.
            </p>
            <button
              onClick={() => printPaper(printRef.current)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <Download size={15} />
              Download as PDF
            </button>
          </div>

          {/* ── Question Paper Card ────────────────────────────── */}
          <div ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none">

            {/* School Header */}
            <div className="px-10 pt-10 pb-6 text-center border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-900">Delhi Public School, Sector-4, Bokaro</h1>
              <p className="mt-1.5 text-base font-semibold text-gray-700">Subject: {questionPaper.subject}</p>
              <p className="text-base font-semibold text-gray-700">Class: {questionPaper.className}</p>
            </div>

            {/* Meta Row */}
            <div className="flex items-center justify-between px-10 py-4 border-b border-gray-100 bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-800">
                Time Allowed: {questionPaper.timeAllowed} minutes
              </span>
              <span className="text-sm font-semibold text-gray-800">
                Maximum Marks: {questionPaper.maxMarks}
              </span>
            </div>

            {/* General Instructions */}
            <div className="px-10 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">
                All questions are compulsory unless stated otherwise.
              </p>
            </div>

            {/* Student Info */}
            <div className="px-10 py-5 border-b border-gray-100 space-y-3">
              {[
                { label: 'Name', key: 'name', placeholder: '________________' },
                { label: 'Roll Number', key: 'rollNumber', placeholder: '____________' },
                { label: `Class: ${questionPaper.className} Section`, key: 'section', placeholder: '________' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 w-36 flex-shrink-0">{label}:</span>
                  <input
                    type="text"
                    value={studentInfo[key as keyof typeof studentInfo]}
                    onChange={(e) => setStudentInfo({ ...studentInfo, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="border-b border-gray-400 text-sm text-gray-800 bg-transparent focus:outline-none focus:border-gray-800 w-48 pb-0.5 transition-colors placeholder-gray-300"
                  />
                </div>
              ))}
            </div>

            {/* Question Sections */}
            <div className="px-10 py-8 space-y-10">
              {questionPaper.sections.map((section, si) => {
                let qCounter = 0;
                // Count questions from previous sections
                for (let i = 0; i < si; i++) qCounter += questionPaper.sections[i].questions.length;

                return (
                  <div key={si}>
                    {/* Section Title */}
                    <h2 className="text-base font-bold text-gray-900 text-center mb-1">{section.title}</h2>

                    {/* Sub-title (question type) */}
                    <div className="mb-1">
                      <p className="text-sm font-bold text-gray-800">
                        {section.questions[0] ? (
                          (() => {
                            // derive section type label from first question or instruction
                            return section.instruction?.split('.')[0] || 'Questions';
                          })()
                        ) : ''}
                      </p>
                      {section.instruction && (
                        <p className="text-xs text-gray-500 italic">{section.instruction}</p>
                      )}
                    </div>

                    {/* Questions */}
                    <ol className="mt-4 space-y-4 list-none">
                      {section.questions.map((q, qi) => {
                        const num = qCounter + qi + 1;
                        return (
                          <li key={qi} className="flex items-start gap-3">
                            <span className="text-sm font-semibold text-gray-700 w-7 flex-shrink-0 mt-0.5">{num}.</span>
                            <div className="flex-1 flex items-start justify-between gap-4">
                              <p className="text-sm text-gray-800 leading-relaxed flex-1">{q.text}</p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <DifficultyBadge difficulty={q.difficulty} />
                                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                                  [{q.marks} Marks]
                                </span>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>

            {/* End of Paper */}
            <div className="px-10 pb-8 text-center">
              <p className="text-sm font-bold text-gray-800">End of Question Paper</p>
            </div>

            {/* Answer Key */}
            {questionPaper.answerKey && (
              <div className="border-t border-gray-100">
                <button
                  onClick={() => setShowAnswerKey(!showAnswerKey)}
                  className="w-full px-10 py-4 flex items-center justify-between text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <span>Answer Key:</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${showAnswerKey ? 'rotate-180' : ''}`}
                  />
                </button>
                {showAnswerKey && (
                  <div className="px-10 pb-8">
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {questionPaper.answerKey}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Action Bar ────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-6 pb-6">
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft size={14} />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/create')}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
              <button
                onClick={() => printPaper(printRef.current)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#111' }}
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:shadow-none, .print\\:shadow-none * { visibility: visible; }
          .print\\:shadow-none { position: absolute; left: 0; top: 0; width: 100%; }
          aside, header, button, a { display: none !important; }
        }
      `}</style>
    </div>
  );
}
