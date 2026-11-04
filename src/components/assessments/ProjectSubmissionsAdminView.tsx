'use client';

import React, { useState } from 'react';
import { useProjectSubmissions } from '@/context/ProjectSubmissionsContext';
import {
  ProjectModule,
  ProjectSubpart,
  StudentProjectSubmission,
  SubmissionReviewStatus,
  SubmissionFileType,
} from '@/types';
import {
  FolderKanban,
  FileCheck,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  MessageSquare,
  Search,
  Filter,
  ExternalLink,
  FileText,
  Trash2,
  Calendar,
  Layers,
  X,
  Send,
  Edit2,
  ChevronRight,
} from 'lucide-react';
import { isSafeUrl } from '@/lib/videoUtils';

export const ProjectSubmissionsAdminView: React.FC = () => {
  const {
    modules,
    submissions,
    stats,
    adminAddModule,
    adminAddSubpart,
    adminDeleteSubpart,
    adminUpdateDeadline,
    adminGiveRemark,
  } = useProjectSubmissions();

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<'submissions' | 'curriculum'>('submissions');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SubmissionReviewStatus>('ALL');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [evaluatingSubmission, setEvaluatingSubmission] =
    useState<StudentProjectSubmission | null>(null);
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [isAddSubpartModalOpen, setIsAddSubpartModalOpen] = useState(false);
  const [editingDeadlineSubpart, setEditingDeadlineSubpart] = useState<ProjectSubpart | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Module Form State
  const [newModTitle, setNewModTitle] = useState('');
  const [newModSubtitle, setNewModSubtitle] = useState('');
  const [newModWeeks, setNewModWeeks] = useState('Weeks 13–16');
  const [newModChallenge, setNewModChallenge] = useState('');
  const [newModBuild, setNewModBuild] = useState('');

  // New Subpart Form State
  const [selectedModuleForSubpart, setSelectedModuleForSubpart] = useState<string>(
    modules[0]?.id || 'mod_1'
  );
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubDescription, setNewSubDescription] = useState('');
  const [newSubDeadline, setNewSubDeadline] = useState('Nov 15, 2026 • 11:59 PM');
  const [newSubFormats, setNewSubFormats] = useState<SubmissionFileType[]>([
    'pdf',
    'doc',
    'link',
  ]);
  const [newSubGuidelines, setNewSubGuidelines] = useState('');

  // Evaluating Form State
  const [evalRemarks, setEvalRemarks] = useState('');
  const [evalStatus, setEvalStatus] = useState<SubmissionReviewStatus>('APPROVED');
  const [evalScore, setEvalScore] = useState<number>(95);

  // Deadline Edit State
  const [newDeadlineVal, setNewDeadlineVal] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open evaluation modal
  const handleOpenEvaluate = (subm: StudentProjectSubmission) => {
    setEvaluatingSubmission(subm);
    setEvalRemarks(subm.adminRemarks || '');
    setEvalStatus(subm.status === 'PENDING_REVIEW' ? 'APPROVED' : subm.status);
    setEvalScore(subm.score || 90);
  };

  // Submit evaluation remark
  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSubmission) return;

    adminGiveRemark({
      submissionId: evaluatingSubmission.id,
      remarks: evalRemarks.trim(),
      status: evalStatus,
      score: Number(evalScore),
      evaluatorName: 'Admin Faculty',
    });

    showToast(`Remark saved for ${evaluatingSubmission.studentName}!`);
    setEvaluatingSubmission(null);
  };

  // Create Module
  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModTitle.trim()) return;

    adminAddModule({
      title: newModTitle.trim(),
      subtitle: newModSubtitle.trim(),
      weeks: newModWeeks.trim(),
      miniChallenge: newModChallenge.trim(),
      deliverableBuild: newModBuild.trim(),
    });

    setNewModTitle('');
    setNewModSubtitle('');
    setNewModChallenge('');
    setNewModBuild('');
    setIsAddModuleModalOpen(false);
    showToast('New project module created successfully!');
  };

  // Create Subpart
  const handleCreateSubpart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTitle.trim()) return;

    const guidelinesArray = newSubGuidelines
      .split('\n')
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    adminAddSubpart({
      moduleId: selectedModuleForSubpart,
      title: newSubTitle.trim(),
      description: newSubDescription.trim(),
      deadline: newSubDeadline.trim(),
      allowedFormats: newSubFormats,
      maxPoints: 100,
      guidelines: guidelinesArray,
    });

    setNewSubTitle('');
    setNewSubDescription('');
    setNewSubGuidelines('');
    setIsAddSubpartModalOpen(false);
    showToast('New submission subpart added to module!');
  };

  // Update Deadline
  const handleSaveDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeadlineSubpart || !newDeadlineVal.trim()) return;

    adminUpdateDeadline(editingDeadlineSubpart.id, newDeadlineVal.trim());
    showToast(`Deadline updated for ${editingDeadlineSubpart.title}!`);
    setEditingDeadlineSubpart(null);
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter((subm) => {
    const matchesStatus = statusFilter === 'ALL' || subm.status === statusFilter;
    const matchesModule =
      selectedModuleFilter === 'ALL' || subm.moduleId === selectedModuleFilter;
    const matchesSearch =
      subm.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subm.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesModule && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121614] text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-800 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-6 h-6 rounded-full bg-[#3ECE92]/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-[#3ECE92]" />
          </div>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Admin Top Action Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#eaedf0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#e8f8f0] text-[#059669]">
            Faculty Review & Curriculum Desk
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mt-1">
            Project Submissions & Assessment Management
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Review student deliverables, provide qualitative feedback remarks, and configure submission subparts.
          </p>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddSubpartModalOpen(true)}
            id="admin-add-subpart-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780] shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Submission Subpart</span>
          </button>

          <button
            onClick={() => setIsAddModuleModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-xs transition-colors"
          >
            <FolderKanban className="w-4 h-4 text-gray-500" />
            <span>New Module</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#eaedf0] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Total Subparts</span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-gray-900">{stats.totalSubparts}</span>
            <span className="text-[11px] text-gray-400">across 3 modules</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#eaedf0] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Total Submissions</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-gray-900">
              {stats.totalSubmissions}
            </span>
            <span className="text-[11px] text-[#059669] font-medium">all learners</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#eaedf0] shadow-xs">
          <div className="flex items-center justify-between text-amber-600 text-xs">
            <span>Awaiting Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600">{stats.pendingReview}</span>
            <span className="text-[11px] text-amber-700 font-medium">action required</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#eaedf0] shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs">
            <span>Approved / Excellent</span>
            <Award className="w-4 h-4 text-[#3ECE92]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#059669]">
              {stats.approvedCount}
            </span>
            <span className="text-[11px] text-gray-400">graded</span>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'submissions'
                ? 'bg-[#121614] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            Submissions Audit & Remarks ({submissions.length})
          </button>

          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'curriculum'
                ? 'bg-[#121614] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            Modules & Subparts Setup ({modules.length} Modules)
          </button>
        </div>
      </div>

      {/* ================= TAB 1: SUBMISSIONS AUDIT & REMARKS DESK ================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-[#eaedf0] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 font-mono mr-1">Status:</span>
              {(['ALL', 'PENDING_REVIEW', 'APPROVED', 'REVISION_REQUESTED'] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-[#121614] text-white font-bold'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {status === 'ALL'
                      ? 'All'
                      : status === 'PENDING_REVIEW'
                      ? 'Pending Review'
                      : status === 'APPROVED'
                      ? 'Approved'
                      : 'Revision Needed'}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedModuleFilter}
                onChange={(e) => setSelectedModuleFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white outline-none"
              >
                <option value="ALL">All Modules</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    Module {m.moduleNumber}: {m.title}
                  </option>
                ))}
              </select>

              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-2xl border border-[#eaedf0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#fbfdfc] text-gray-400 font-mono text-[11px]">
                    <th className="py-3.5 px-6 font-medium">STUDENT</th>
                    <th className="py-3.5 px-6 font-medium">MODULE & SUBPART</th>
                    <th className="py-3.5 px-6 font-medium">SUBMITTED FILES & LINKS</th>
                    <th className="py-3.5 px-6 font-medium">STATUS</th>
                    <th className="py-3.5 px-6 font-medium">SCORE</th>
                    <th className="py-3.5 px-6 font-medium text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                        No submissions found matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((subm) => {
                      const mod = modules.find((m) => m.id === subm.moduleId);
                      const sub = mod?.subparts.find((s) => s.id === subm.subpartId);

                      return (
                        <tr key={subm.id} className="hover:bg-gray-50/70 transition-colors">
                          {/* Student */}
                          <td className="py-4 px-6">
                            <div className="font-bold text-gray-900">{subm.studentName}</div>
                            <div className="text-[11px] text-gray-400">{subm.studentEmail}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              {subm.submittedAt}
                            </div>
                          </td>

                          {/* Module & Subpart */}
                          <td className="py-4 px-6">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              Part {sub?.subpartCode || '1.1'}
                            </span>
                            <div className="font-medium text-gray-800 mt-1 max-w-xs truncate">
                              {sub?.title}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Module {mod?.moduleNumber}: {mod?.title}
                            </div>
                          </td>

                          {/* Files & Links */}
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1 max-w-xs">
                              {subm.files.map((f, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-gray-700 truncate"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#3ECE92] shrink-0" />
                                  <span className="truncate">{f.name}</span>
                                </span>
                              ))}

                              {subm.links.map((l, i) => {
                                const safe = isSafeUrl(l);
                                return (
                                  <a
                                    key={i}
                                    href={safe ? l : '#'}
                                    target={safe ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    onClick={safe ? undefined : (e) => e.preventDefault()}
                                    className={`inline-flex items-center gap-1 text-[11px] font-mono truncate ${
                                      safe ? 'text-blue-600 hover:underline' : 'text-gray-400 cursor-not-allowed'
                                    }`}
                                    title={safe ? l : 'Untrusted or unsafe link scheme blocked'}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{l}</span>
                                  </a>
                                );
                              })}

                              {subm.studentNotes && (
                                <p className="text-[10px] text-gray-400 italic line-clamp-1 mt-0.5">
                                  Note: &ldquo;{subm.studentNotes}&rdquo;
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            {subm.status === 'EXCELLENT' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                                <Award className="w-3 h-3 text-emerald-600" />
                                Excellent
                              </span>
                            ) : subm.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Approved
                              </span>
                            ) : subm.status === 'REVISION_REQUESTED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Revision Req.
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending Review
                              </span>
                            )}
                          </td>

                          {/* Score */}
                          <td className="py-4 px-6 font-mono font-bold text-gray-900">
                            {subm.score ? `${subm.score}/100` : '—'}
                          </td>

                          {/* Action Button */}
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleOpenEvaluate(subm)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#111614] hover:bg-black text-white shadow-xs transition-all active:scale-95"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#3ECE92]" />
                              <span>{subm.adminRemarks ? 'Edit Remark' : 'Give Remark'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CURRICULUM SETUP (MODULES & SUBPARTS) ================= */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          {modules.map((module) => (
            <div
              key={module.id}
              className="bg-white rounded-2xl border border-[#eaedf0] shadow-xs overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-[#059669] bg-[#e8f8f0] px-2.5 py-0.5 rounded-md">
                      Module {module.moduleNumber} ({module.weeks})
                    </span>
                    <span className="text-xs text-gray-400 font-mono">• {module.certificationName}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{module.title}</h3>
                  <p className="text-xs text-gray-500">{module.subtitle}</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedModuleForSubpart(module.id);
                    setIsAddSubpartModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-[#3ECE92]" />
                  <span>Add Subpart</span>
                </button>
              </div>

              {/* Subparts Table */}
              <div className="divide-y divide-gray-100">
                {module.subparts.map((subpart) => (
                  <div
                    key={subpart.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded">
                          Part {subpart.subpartCode}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                          {subpart.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500">{subpart.description}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-gray-400 font-mono">Accepted:</span>
                        {subpart.allowedFormats.map((fmt) => (
                          <span
                            key={fmt}
                            className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-gray-100 text-gray-600"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left md:text-right font-mono text-xs">
                        <div className="text-gray-400 text-[10px]">DEADLINE</div>
                        <div className="font-semibold text-gray-800">{subpart.deadline}</div>
                      </div>

                      <button
                        onClick={() => {
                          setEditingDeadlineSubpart(subpart);
                          setNewDeadlineVal(subpart.deadline);
                        }}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        title="Update Deadline"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Remove subpart "${subpart.title}"?`)) {
                            adminDeleteSubpart(subpart.id);
                            showToast('Subpart deleted.');
                          }
                        }}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete Subpart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL 1: EVALUATE & GIVE REMARK ================= */}
      {evaluatingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#e8f8f0] text-[#059669]">
                  Evaluator Desk
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  Deliverable Review & Remarks
                </h3>
                <p className="text-xs text-gray-500">
                  Student: <strong>{evaluatingSubmission.studentName}</strong> ({evaluatingSubmission.studentEmail})
                </p>
              </div>
              <button
                onClick={() => setEvaluatingSubmission(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Deliverables summary */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
                <span className="font-semibold text-gray-700">Submitted Deliverables:</span>
                <div className="space-y-1">
                  {evaluatingSubmission.files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono text-gray-800">
                      <FileText className="w-3.5 h-3.5 text-[#3ECE92]" />
                      <span>{f.name}</span>
                      <span className="text-gray-400">({f.size})</span>
                    </div>
                  ))}

                  {evaluatingSubmission.links.map((l, i) => {
                    const safe = isSafeUrl(l);
                    return (
                      <a
                        key={i}
                        href={safe ? l : '#'}
                        target={safe ? "_blank" : undefined}
                        rel={safe ? "noreferrer noopener" : undefined}
                        onClick={safe ? undefined : (e) => e.preventDefault()}
                        title={safe ? l : 'Untrusted or invalid link blocked for security'}
                        className={`flex items-center gap-1 text-[11px] font-mono ${
                          safe ? 'text-blue-600 hover:underline' : 'text-gray-400 cursor-not-allowed line-through'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{l}</span>
                      </a>
                    );
                  })}
                </div>

                {evaluatingSubmission.studentNotes && (
                  <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200/60">
                    Student note: &ldquo;{evaluatingSubmission.studentNotes}&rdquo;
                  </p>
                )}
              </div>

              {/* Status and Score */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Evaluation Status *
                  </label>
                  <select
                    value={evalStatus}
                    onChange={(e) => setEvalStatus(e.target.value as SubmissionReviewStatus)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white font-medium outline-none focus:border-[#3ECE92]"
                  >
                    <option value="APPROVED">Approved (Pass)</option>
                    <option value="EXCELLENT">Excellent (Distinction)</option>
                    <option value="REVISION_REQUESTED">Revision Requested</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Points Score (Out of 100) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={evalScore}
                    onChange={(e) => setEvalScore(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 font-mono font-bold outline-none focus:border-[#3ECE92]"
                  />
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Faculty Remark & Feedback for Student *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why this deliverable was approved or what specific revisions are required..."
                  value={evalRemarks}
                  onChange={(e) => setEvalRemarks(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#3ECE92] focus:ring-1 focus:ring-[#3ECE92] outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEvaluatingSubmission(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780] shadow-sm transition-all"
                >
                  Save Remark & Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD SUBMISSION SUBPART ================= */}
      {isAddSubpartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Submission Subpart</h3>
                <p className="text-xs text-gray-500">
                  Assign a new deliverable and deadline under a project module.
                </p>
              </div>
              <button
                onClick={() => setIsAddSubpartModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubpart} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign to Module *
                </label>
                <select
                  value={selectedModuleForSubpart}
                  onChange={(e) => setSelectedModuleForSubpart(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white outline-none"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Module {m.moduleNumber}: {m.title} ({m.weeks})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subpart Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.4 Production Tool Deployment & Error Tracing"
                  value={newSubTitle}
                  onChange={(e) => setNewSubTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description / Task Goal *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Briefly describe what students need to produce..."
                  value={newSubDescription}
                  onChange={(e) => setNewSubDescription(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Deadline Date & Cutoff Time *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nov 15, 2026 • 11:59 PM"
                  value={newSubDeadline}
                  onChange={(e) => setNewSubDeadline(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Allowed Submission Formats *
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['pdf', 'doc', 'ppt', 'image', 'link'] as const).map((fmt) => {
                    const isChecked = newSubFormats.includes(fmt);
                    return (
                      <button
                        type="button"
                        key={fmt}
                        onClick={() => {
                          if (isChecked) {
                            if (newSubFormats.length > 1) {
                              setNewSubFormats((prev) => prev.filter((f) => f !== fmt));
                            }
                          } else {
                            setNewSubFormats((prev) => [...prev, fmt]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors ${
                          isChecked
                            ? 'bg-[#121614] text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rubric Guidelines (One item per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ensure schema adheres to Pydantic models&#10;Include video execution demo link"
                  value={newSubGuidelines}
                  onChange={(e) => setNewSubGuidelines(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddSubpartModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780]"
                >
                  Save Subpart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ADD PROJECT MODULE ================= */}
      {isAddModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Project Module</h3>
                <p className="text-xs text-gray-500">
                  Define a new milestone project block in the program.
                </p>
              </div>
              <button
                onClick={() => setIsAddModuleModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise AI Deployment & LLMOps"
                  value={newModTitle}
                  onChange={(e) => setNewModTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subtitle / Learning Theme *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scale agent pipelines with observability, telemetry, and CI/CD."
                  value={newModSubtitle}
                  onChange={(e) => setNewModSubtitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Timeline / Weeks *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weeks 13–16"
                  value={newModWeeks}
                  onChange={(e) => setNewModWeeks(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mini Challenge Prompt *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Deploy an autonomous observability agent that detects drift and triggers automated rollbacks."
                  value={newModChallenge}
                  onChange={(e) => setNewModChallenge(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Deliverable Build Target *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A production-ready LLMOps monitoring pipeline."
                  value={newModBuild}
                  onChange={(e) => setNewModBuild(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModuleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780]"
                >
                  Create Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: EDIT DEADLINE ================= */}
      {editingDeadlineSubpart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                Part {editingDeadlineSubpart.subpartCode}
              </span>
              <h3 className="text-sm font-bold text-gray-900 mt-1">Update Deadline</h3>
              <p className="text-xs text-gray-500">{editingDeadlineSubpart.title}</p>
            </div>

            <form onSubmit={handleSaveDeadline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cutoff Date & Time
                </label>
                <input
                  type="text"
                  required
                  value={newDeadlineVal}
                  onChange={(e) => setNewDeadlineVal(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDeadlineSubpart(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780]"
                >
                  Save Deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
