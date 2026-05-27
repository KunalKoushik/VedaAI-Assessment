import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  ChevronLeft, Download, RefreshCw, Plus, ChevronDown,
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

// ── PDF print util (unchanged from original) ───────────────────────
function printPaper(el?: HTMLElement | null) {
  if (!el) return window.print();
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return window.print();
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
  const overrideStyles = `<style>
    @media print {
      body * { visibility: visible !important; }
      aside, header, button, a { display: none !important; }
    }
    body { background: #fff; color: #000; }
  </style>`;
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">${headHtml}\n${overrideStyles}
    <style>@page{size:auto;margin:20mm} body{background:#fff}</style></head><body>
    ${clone.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); win.close(); } catch (e) { console.error('Print failed', e); } }, 700);
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

  useEffect(() => { if (id) fetchAssignment(); }, [id]);

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

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex font-sans">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex items-center justify-center">
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
        <div className="flex-1 md:ml-60 flex flex-col">
          <TopBar backHref="/" backLabel="Assignment" />
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl border border-amber-200 p-10 text-center max-w-md shadow-sm">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={24} className="text-amber-500 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Generating your paper…</h2>
              <p className="text-sm text-gray-500 mb-1">AI is crafting your question paper.</p>
              <p className="text-xs text-gray-400 mb-6">
                Status: <span className="font-medium text-amber-600">{assignment?.status || 'Processing'}</span>
              </p>
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

      <div className="flex-1 md:ml-60 flex flex-col">
        <TopBar backHref="/" breadcrumb={<><Plus size={14} className="text-gray-300 inline mr-1" />Create New</>} />

        <main className="flex-1 px-8 py-7">

          {/* AI Banner */}
          <div
            className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-6"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}
          >
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

          {/* Question Paper Card */}
          <div ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none">

            {/* School Header */}
            <div className="px-10 pt-10 pb-6 text-center border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-900">Delhi Public School, Sector-4, Bokaro</h1>
              <p className="mt-1.5 text-base font-semibold text-gray-700">Subject: {questionPaper.subject}</p>
              <p className="text-base font-semibold text-gray-700">Class: {questionPaper.className}</p>
            </div>

            {/* Meta Row */}
            <div className="flex items-center justify-between px-10 py-4 border-b border-gray-100 bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-800">Time Allowed: {questionPaper.timeAllowed} minutes</span>
              <span className="text-sm font-semibold text-gray-800">Maximum Marks: {questionPaper.maxMarks}</span>
            </div>

            {/* Instructions */}
            <div className="px-10 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">All questions are compulsory unless stated otherwise.</p>
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

            {/* Sections */}
            <div className="px-10 py-8 space-y-10">
              {questionPaper.sections.map((section, si) => {
                let qCounter = 0;
                for (let i = 0; i < si; i++) qCounter += questionPaper.sections[i].questions.length;
                return (
                  <div key={si}>
                    <h2 className="text-base font-bold text-gray-900 text-center mb-1">{section.title}</h2>
                    <div className="mb-1">
                      <p className="text-sm font-bold text-gray-800">
                        {section.questions[0] ? (section.instruction?.split('.')[0] || 'Questions') : ''}
                      </p>
                      {section.instruction && (
                        <p className="text-xs text-gray-500 italic">{section.instruction}</p>
                      )}
                    </div>
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
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showAnswerKey ? 'rotate-180' : ''}`} />
                </button>
                {showAnswerKey && (
                  <div className="px-10 pb-8">
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{questionPaper.answerKey}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-6 pb-6">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5">
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
