import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAssignmentStore } from '@/store/AssignmentStore';
import { useWebSocket } from '@/hooks/UseWebSocket';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  MoreVertical, Eye, Trash2, Plus, SlidersHorizontal, Search,
} from 'lucide-react';

// ── Empty state illustration ──────────────────────────────────────
function EmptyIllustration() {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="95" r="70" fill="#EBEBEB" />
      <rect x="55" y="45" width="75" height="95" rx="6" fill="white" stroke="#D1D5DB" strokeWidth="1.5" />
      <rect x="65" y="60" width="35" height="5" rx="2.5" fill="#9CA3AF" />
      <rect x="65" y="72" width="55" height="4" rx="2" fill="#D1D5DB" />
      <rect x="65" y="82" width="50" height="4" rx="2" fill="#D1D5DB" />
      <rect x="65" y="92" width="55" height="4" rx="2" fill="#D1D5DB" />
      <rect x="65" y="102" width="45" height="4" rx="2" fill="#D1D5DB" />
      <circle cx="112" cy="110" r="30" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
      <circle cx="112" cy="110" r="25" fill="#F9FAFB" />
      <path d="M100 98 L124 122 M100 122 L124 98" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
      <circle cx="130" cy="132" r="6" fill="#3B82F6" />
      <path d="M75 48 C70 35 55 32 58 22" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M58 22 C56 18 60 16 62 20" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M62 26 L58 22 L54 26" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M82 40 L85 34 L88 40 M83.5 38 L86.5 38" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M125 62 L125 54 M121 58 L129 58" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Card 3-dot menu ───────────────────────────────────────────────
function AssignmentCardMenu({
  assignmentId, isCompleted, generatedPaperId, onDelete
}: {
  assignmentId: string;
  isCompleted: boolean;
  generatedPaperId?: string;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-44">
          {isCompleted && generatedPaperId && (
            <Link
              href={`/assignment/${assignmentId}`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Eye size={14} className="text-gray-400" />
              View Assignment
            </Link>
          )}
          <button
            onClick={() => { onDelete(assignmentId); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    generating: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-600',
    draft: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.draft}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'completed' ? 'bg-green-500' :
        status === 'generating' ? 'bg-amber-400' :
        status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────
export default function Dashboard() {
  const { assignments, setAssignments, updateAssignment, isLoading, setIsLoading } = useAssignmentStore();
  const { lastMessage } = useWebSocket();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchAssignments(); }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'GENERATION_COMPLETED') {
      updateAssignment(lastMessage.assignmentId, {
        status: 'completed',
        generatedPaperId: lastMessage.questionPaperId,
      });
    } else if (lastMessage.type === 'GENERATION_FAILED') {
      updateAssignment(lastMessage.assignmentId, { status: 'failed' });
    }
  }, [lastMessage, updateAssignment]);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/assignments');
      if (res.data.success) setAssignments(res.data.data);
    } catch (e) {
      console.error('Failed to fetch assignments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await axios.delete(`/api/assignments/${id}`);
      useAssignmentStore.getState().deleteAssignment(id);
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const filtered = assignments.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex font-sans">

      {/* ── Shared Sidebar ──────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">

        <TopBar backLabel="Assignment" />

        <main className="flex-1 px-8 py-7">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                <p className="text-sm text-gray-400">Loading assignments…</p>
              </div>
            </div>
          ) : assignments.length === 0 ? (
            /* ── EMPTY STATE ── */
            <div className="flex flex-col items-center justify-center min-h-[75vh] gap-6">
              <EmptyIllustration />
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900 mb-1.5">No assignments yet</h2>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                  Create your first assignment to start collecting and grading student submissions.
                  You can set up rubrics, define marking criteria, and let AI assist with grading.
                </p>
              </div>
              <Link
                href="/create"
                className="flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold"
                style={{ background: '#111', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}
              >
                <Plus size={16} />
                Create Your First Assignment
              </Link>
            </div>
          ) : (
            /* ── FILLED STATE ── */
            <>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-300" />
                <h1 className="text-xl font-bold text-gray-900">Assignments</h1>
              </div>
              <p className="text-sm text-gray-400 mb-6 pl-5">Manage and create assignments for your classes.</p>

              <div className="flex items-center justify-between mb-6 gap-4">
                <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  <SlidersHorizontal size={15} />
                  Filter By
                </button>
                <div className="relative w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Assignment"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No results for "{searchTerm}"</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map((assignment) => (
                    <div
                      key={assignment._id}
                      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Link
                          href={assignment.status === 'completed' ? `/assignment/${assignment._id}` : '#'}
                          className="text-base font-bold text-gray-900 hover:underline underline-offset-2 leading-snug pr-2"
                        >
                          {assignment.title}
                        </Link>
                        <AssignmentCardMenu
                          assignmentId={assignment._id}
                          isCompleted={assignment.status === 'completed'}
                          generatedPaperId={assignment.generatedPaperId}
                          onDelete={handleDelete}
                        />
                      </div>

                      <div className="mb-3">
                        <StatusBadge status={assignment.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                        <span>
                          <span className="font-medium text-gray-600">Assigned on</span> :{' '}
                          {new Date(assignment.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                          }).replace(/\//g, '-')}
                        </span>
                        <span>
                          <span className="font-medium text-gray-600">Due</span> :{' '}
                          {new Date(assignment.dueDate).toLocaleDateString('en-GB', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                          }).replace(/\//g, '-')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Floating Create Button ──────────────────────────────── */}
      {assignments.length > 0 && (
        <Link
          href="/create"
          className="fixed bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold z-30 transition-all hover:scale-105 active:scale-95"
          style={{ background: '#111', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
        >
          <Plus size={16} />
          Create Assignment
        </Link>
      )}
    </div>
  );
}
