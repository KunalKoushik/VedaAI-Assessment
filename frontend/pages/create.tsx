import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  Upload, X, Plus, Minus, Mic, ChevronDown, ArrowRight, ChevronLeft,
} from 'lucide-react';

interface QuestionType {
  type: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
}

const QUESTION_TYPE_OPTIONS = [
  'Multiple Choice Questions',
  'Short Questions',
  'Diagram/Graph-Based Questions',
  'Numerical Problems',
  'Long Answer Questions',
  'Fill in the Blanks',
];

// ── Stepper (+/- number control) ─────────────────────────────────
function Stepper({
  value, onChange, min = 1, max = 99
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-1 py-0.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-600"
      >
        <Minus size={11} />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-gray-800">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-600"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

// ── File Upload Zone ──────────────────────────────────────────────
function FileUploadZone({
  file, onFile, onClear
}: {
  file: File | null; onFile: (f: File) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
        ${dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'}`}
      onClick={() => !file && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {file ? (
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Upload size={18} className="text-orange-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-4 w-7 h-7 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
          >
            <X size={13} className="text-red-500" />
          </button>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Upload size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Choose a file or drag &amp; drop it here</p>
          <p className="text-xs text-gray-400 mb-4">JPEG, PNG, PDF, up to 10MB</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="px-5 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            Browse Files
          </button>
        </>
      )}
      <p className="text-xs text-gray-400 mt-3">Upload images of your preferred document/image</p>
    </div>
  );
}

// ── Main Create Page ──────────────────────────────────────────────
export default function CreateAssignment() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    className: '',
    dueDate: '',
    timeAllowed: 45,
    additionalInstructions: '',
    questionTypes: [
      { type: 'Multiple Choice Questions', numberOfQuestions: 4, marksPerQuestion: 1 },
      { type: 'Short Questions', numberOfQuestions: 3, marksPerQuestion: 2 },
    ] as QuestionType[],
  });

  const addQuestionType = () => {
    setFormData((prev) => ({
      ...prev,
      questionTypes: [
        ...prev.questionTypes,
        { type: 'Short Questions', numberOfQuestions: 1, marksPerQuestion: 1 },
      ],
    }));
  };

  const removeQuestionType = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      questionTypes: prev.questionTypes.filter((_, i) => i !== index),
    }));
  };

  const updateQT = (index: number, field: keyof QuestionType, value: string | number) => {
    setFormData((prev) => {
      const updated = [...prev.questionTypes];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, questionTypes: updated };
    });
  };

  const totalQuestions = formData.questionTypes.reduce((s, qt) => s + qt.numberOfQuestions, 0);
  const totalMarks = formData.questionTypes.reduce((s, qt) => s + qt.numberOfQuestions * qt.marksPerQuestion, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dueDate) { alert('Please set a due date'); return; }
    if (totalQuestions === 0) { alert('Please add at least one question type'); return; }

    setLoading(true);
    try {
      const res = await axios.post('/api/assignments', {
        title: formData.title || `${formData.subject} – ${formData.className}`,
        description: `${formData.subject} - ${formData.className}`,
        dueDate: formData.dueDate,
        questionTypes: formData.questionTypes,
        additionalInstructions: formData.additionalInstructions,
      });

      if (res.data.success) {
        await axios.post('/api/generate', {
          assignmentId: res.data.data._id,
          formData: {
            subject: formData.subject,
            className: formData.className,
            timeAllowed: formData.timeAllowed,
            totalMarks,
            questionTypes: formData.questionTypes,
            additionalInstructions: formData.additionalInstructions,
          },
        });
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex font-sans">

      {/* ── Shared Sidebar ──────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">

        <TopBar backHref="/assignments" backLabel="Assignments" />

        {/* Page Title */}
        <div className="px-8 pt-7 pb-2">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <h1 className="text-xl font-bold text-gray-900">Create Assignment</h1>
          </div>
          <p className="text-sm text-gray-400 pl-5">Set up a new assignment for your students</p>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-4">
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full bg-gray-800 transition-all" style={{ width: '55%' }} />
          </div>
        </div>

        {/* Form */}
        <main className="flex-1 px-4 pb-32 sm:px-6 lg:px-10">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 max-w-3xl">

                <div className="mb-6">
                  <h2 className="text-base font-bold text-gray-900">Assignment Details</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Basic information about your assignment</p>
                </div>

                {/* File Upload */}
                <div className="mb-6">
                  <FileUploadZone
                    file={uploadedFile}
                    onFile={setUploadedFile}
                    onClear={() => setUploadedFile(null)}
                  />
                </div>

                {/* Subject + Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Science"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-gray-50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
                    <input
                      type="text"
                      placeholder="e.g. 8th"
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-gray-50 transition-all"
                    />
                  </div>
                </div>

                {/* Due Date */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-gray-50 transition-all appearance-none"
                  />
                </div>

                {/* Question Types */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-800">Question Type</span>
                    <div className="flex items-center gap-8 pr-2">
                      <span className="text-xs font-medium text-gray-500">No. of Questions</span>
                      <span className="text-xs font-medium text-gray-500">Marks</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {formData.questionTypes.map((qt, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <select
                            value={qt.type}
                            onChange={(e) => updateQT(i, 'type', e.target.value)}
                            className="w-full appearance-none pl-4 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 cursor-pointer"
                          >
                            {QUESTION_TYPE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeQuestionType(i)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <X size={12} />
                        </button>

                        <Stepper value={qt.numberOfQuestions} onChange={(v) => updateQT(i, 'numberOfQuestions', v)} />
                        <Stepper value={qt.marksPerQuestion} onChange={(v) => updateQT(i, 'marksPerQuestion', v)} />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addQuestionType}
                    className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <Plus size={13} className="text-white" />
                    </div>
                    Add Question Type
                  </button>

                  {totalQuestions > 0 && (
                    <div className="mt-4 flex flex-col items-end gap-0.5 text-sm font-medium text-gray-700">
                      <span>Total Questions : {totalQuestions}</span>
                      <span>Total Marks : {totalMarks}</span>
                    </div>
                  )}
                </div>

                {/* Additional Instructions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Additional Information <span className="text-gray-400 font-normal">(For better output)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={formData.additionalInstructions}
                      onChange={(e) => setFormData({ ...formData, additionalInstructions: e.target.value })}
                      placeholder="e.g Generate a question paper for 3 hour exam duration..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-gray-50 resize-none transition-all"
                    />
                    <button
                      type="button"
                      className="absolute right-3 bottom-3 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-400 shadow-sm"
                    >
                      <Mic size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>

        {/* Bottom nav bar */}
        <div className="fixed bottom-0 md:left-60 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Link
              href="/assignments"
              className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={15} />
              Previous
            </Link>
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-7 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: loading ? '#555' : '#111', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>Next <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}