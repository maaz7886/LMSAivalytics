'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProjectSubmissions } from '@/context/ProjectSubmissionsContext';
import {
  ProjectModule,
  ProjectSubpart,
  StudentProjectSubmission,
  SubmittedFile,
} from '@/types';
import {
  FolderKanban,
  FileText,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Sparkles,
  FileCode,
  File,
  X,
  Plus,
  RefreshCw,
  Send,
} from 'lucide-react';
import { isSafeUrl } from '@/lib/videoUtils';

export const ProjectSubmissionsLearnerView: React.FC = () => {
  const { user } = useAuth();
  const { modules, getStudentSubpartSubmission, submitProject } = useProjectSubmissions();

  const studentEmail = user?.email || '';
  const studentName = user?.name || 'Learner';

  // UI state
  const [expandedModuleId, setExpandedModuleId] = useState<string>('mod_1');
  const [activeSubpartModal, setActiveSubpartModal] = useState<{
    module: ProjectModule;
    subpart: ProjectSubpart;
  } | null>(null);

  // Submission Form State inside modal
  const [uploadedFiles, setUploadedFiles] = useState<SubmittedFile[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [linksList, setLinksList] = useState<string[]>([]);
  const [studentNotes, setStudentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenSubmissionModal = (module: ProjectModule, subpart: ProjectSubpart) => {
    const existing = getStudentSubpartSubmission(studentEmail, subpart.id);
    if (existing) {
      setUploadedFiles(existing.files || []);
      setLinksList(existing.links || []);
      setStudentNotes(existing.studentNotes || '');
    } else {
      setUploadedFiles([]);
      setLinksList([]);
      setStudentNotes('');
    }
    setLinkInput('');
    setActiveSubpartModal({ module, subpart });
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    let url = linkInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setLinksList((prev) => [...prev, url]);
    setLinkInput('');
  };

  const handleRemoveLink = (idx: number) => {
    setLinksList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: SubmittedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split('.').pop()?.toLowerCase() || '';

      let type: SubmittedFile['type'] = 'doc';
      if (ext === 'pdf') type = 'pdf';
      else if (['ppt', 'pptx'].includes(ext)) type = 'ppt';
      else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) type = 'image';
      else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) type = 'doc';

      const sizeInMb = (f.size / (1024 * 1024)).toFixed(1);

      newFiles.push({
        name: f.name,
        size: `${sizeInMb} MB`,
        type,
        url: '#',
      });
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubpartModal) return;

    if (uploadedFiles.length === 0 && linksList.length === 0) {
      alert('Please upload at least one document/file or provide a live project link.');
      return;
    }

    setIsSubmitting(true);
    submitProject({
      moduleId: activeSubpartModal.module.id,
      subpartId: activeSubpartModal.subpart.id,
      studentId: user?.id || '',
      studentName,
      studentEmail,
      files: uploadedFiles,
      links: linksList,
      studentNotes,
    });

    setIsSubmitting(false);
    showToast(`Deliverable for "${activeSubpartModal.subpart.title}" submitted successfully!`);
    setActiveSubpartModal(null);
  };

  // Progress metrics
  const allSubparts = modules.flatMap((m) => m.subparts);
  const myCompletedCount = allSubparts.filter((s) => {
    const subm = getStudentSubpartSubmission(studentEmail, s.id);
    return subm && (subm.status === 'APPROVED' || subm.status === 'EXCELLENT');
  }).length;
  const progressPercent = Math.round((myCompletedCount / (allSubparts.length || 1)) * 100);

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

      {/* Flagship Program Overview Hero Card */}
      <div className="bg-linear-to-r from-[#111614] via-[#1a211d] to-[#121614] text-white rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#3ECE92] text-[#111614]">
                Executive Curriculum
              </span>
              <span className="text-xs text-gray-400 font-mono">
                3 Months • 3 Certifications • Live Guided Projects
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              AI-Native Project Management Program
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              &ldquo;This is not just a course. This is an AI-native execution system. You don&apos;t just learn how execution works. You build and run it.&rdquo;
            </p>
          </div>

          {/* Overall Completion Gauge */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0 backdrop-blur-xs">
            <div className="w-14 h-14 rounded-xl bg-[#3ECE92]/10 border border-[#3ECE92]/30 flex items-center justify-center font-mono font-extrabold text-xl text-[#3ECE92]">
              {progressPercent}%
            </div>
            <div>
              <div className="text-xs text-gray-300 font-medium">Deliverables Approved</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {myCompletedCount} of {allSubparts.length} Subparts
              </div>
              <div className="w-32 h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-[#3ECE92] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Submissions Accordion List */}
      <div className="space-y-4">
        {modules.map((module) => {
          const isExpanded = expandedModuleId === module.id;
          const moduleSubparts = module.subparts;
          const completedInModule = moduleSubparts.filter((s) => {
            const subm = getStudentSubpartSubmission(studentEmail, s.id);
            return subm && (subm.status === 'APPROVED' || subm.status === 'EXCELLENT');
          }).length;

          return (
            <div
              key={module.id}
              className="bg-white rounded-2xl border border-[#eaedf0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden transition-all"
            >
              {/* Module Header Bar */}
              <div
                onClick={() => setExpandedModuleId(isExpanded ? '' : module.id)}
                className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] text-[#3ECE92] flex items-center justify-center font-mono font-extrabold text-sm shrink-0 border border-[#d1f4e2]">
                    0{module.moduleNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#059669] bg-[#e8f8f0] px-2 py-0.5 rounded-md">
                        {module.weeks}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">• {module.certificationName}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      Module {module.moduleNumber}: {module.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-1 sm:line-clamp-none">
                      {module.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-gray-800">
                      {completedInModule} / {moduleSubparts.length} Approved
                    </span>
                    <span className="text-[11px] text-gray-400 block font-mono">
                      Submissions Track
                    </span>
                  </div>

                  <div className="p-2 rounded-xl text-gray-400 bg-gray-100 hover:text-gray-700">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Module Subparts Detail Section */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-[#fbfdfc] p-4 sm:p-6 space-y-4">
                  {/* Mini Challenge Banner */}
                  <div className="p-4 rounded-xl bg-white border border-[#eaedf0] flex items-start gap-3 shadow-xs">
                    <div className="p-2 rounded-lg bg-[#e8f8f0] text-[#3ECE92] shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold text-[#059669] uppercase tracking-wider">
                        Core Guided Project Challenge:
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5">
                        {module.miniChallenge}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Build Goal: <strong>{module.deliverableBuild}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Subparts Grid / List */}
                  <div className="space-y-3">
                    {moduleSubparts.map((subpart) => {
                      const submission = getStudentSubpartSubmission(studentEmail, subpart.id);
                      const isSubmitted = !!submission;

                      return (
                        <div
                          key={subpart.id}
                          className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 hover:border-gray-300 transition-all space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-extrabold text-[#111614] bg-gray-100 px-2 py-0.5 rounded-md">
                                  Part {subpart.subpartCode}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                  Max: {subpart.maxPoints} pts
                                </span>

                                {/* Accepted Formats Pills */}
                                <div className="flex items-center gap-1">
                                  {subpart.allowedFormats.map((fmt) => (
                                    <span
                                      key={fmt}
                                      className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-gray-50 text-gray-500 border border-gray-200"
                                    >
                                      {fmt}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <h4 className="text-sm font-bold text-gray-900">
                                {subpart.title}
                              </h4>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {subpart.description}
                              </p>
                            </div>

                            {/* Status Pill & Action Button */}
                            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                              {submission ? (
                                submission.status === 'EXCELLENT' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                                    Excellent ({submission.score}/100)
                                  </span>
                                ) : submission.status === 'APPROVED' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Approved ({submission.score}/100)
                                  </span>
                                ) : submission.status === 'REVISION_REQUESTED' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-800">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                    Revision Requested
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    Awaiting Review
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-gray-100 text-gray-600">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  Pending Submission
                                </span>
                              )}

                              <button
                                onClick={() => handleOpenSubmissionModal(module, subpart)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                                  submission && submission.status === 'REVISION_REQUESTED'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : submission
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                    : 'bg-[#3ECE92] hover:bg-[#34b780] text-[#111614]'
                                }`}
                              >
                                {submission && submission.status === 'REVISION_REQUESTED' ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Resubmit Fixes</span>
                                  </>
                                ) : submission ? (
                                  <>
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Update Deliverable</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Submit Deliverable</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Submission Details & Admin Feedback Box */}
                          {submission && (
                            <div className="pt-3 border-t border-gray-100 space-y-3">
                              {/* Files & Links Submitted */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-mono text-gray-400">
                                  Submitted {submission.submittedAt}:
                                </span>

                                {submission.files.map((file, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-gray-50 border border-gray-200 text-gray-700"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-[#3ECE92]" />
                                    <span>{file.name}</span>
                                    <span className="text-gray-400 text-[10px]">({file.size})</span>
                                  </span>
                                ))}

                                {submission.links.map((link, lIdx) => {
                                  const safe = isSafeUrl(link);
                                  return (
                                    <a
                                      key={lIdx}
                                      href={safe ? link : '#'}
                                      target={safe ? "_blank" : undefined}
                                      rel={safe ? "noreferrer noopener" : undefined}
                                      onClick={safe ? undefined : (e) => e.preventDefault()}
                                      title={safe ? link : 'Untrusted or invalid link blocked for security'}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono ${
                                        safe
                                          ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:underline'
                                          : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed line-through'
                                      }`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span className="max-w-xs truncate">{link}</span>
                                    </a>
                                  );
                                })}
                              </div>

                              {/* Student Notes */}
                              {submission.studentNotes && (
                                <p className="text-[11px] text-gray-500 italic bg-gray-50/70 p-2 rounded-lg border border-gray-100">
                                  &ldquo;{submission.studentNotes}&rdquo;
                                </p>
                              )}

                              {/* Admin Remark Box */}
                              {submission.adminRemarks && (
                                <div
                                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                                    submission.status === 'REVISION_REQUESTED'
                                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                  }`}
                                >
                                  <MessageSquare
                                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                                      submission.status === 'REVISION_REQUESTED'
                                        ? 'text-rose-600'
                                        : 'text-emerald-600'
                                    }`}
                                  />
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold font-mono">
                                        Faculty Remark ({submission.adminEvaluatorName || 'Admin'}):
                                      </span>
                                      {submission.score && (
                                        <span className="text-[10px] font-bold font-mono px-2 py-0.2 rounded bg-white/80 border border-current">
                                          Score: {submission.score}/100
                                        </span>
                                      )}
                                      <span className="text-[10px] text-gray-500 font-mono">
                                        • {submission.adminEvaluatedAt}
                                      </span>
                                    </div>
                                    <p className="text-xs leading-relaxed">
                                      {submission.adminRemarks}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer Deadline */}
                          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-2 border-t border-gray-50">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              Deadline: <strong className="text-gray-700">{subpart.deadline}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= SUBMISSION MODAL ================= */}
      {activeSubpartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#e8f8f0] text-[#059669]">
                  Part {activeSubpartModal.subpart.subpartCode}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {activeSubpartModal.subpart.title}
                </h3>
                <p className="text-xs text-gray-500">
                  Module {activeSubpartModal.module.moduleNumber}: {activeSubpartModal.module.title}
                </p>
              </div>
              <button
                onClick={() => setActiveSubpartModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitDeliverable} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Guidelines Box */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                <span className="font-semibold text-gray-800">Rubric & Submission Instructions:</span>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-[11px]">
                  {activeSubpartModal.subpart.guidelines.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>

              {/* 1. File Upload Dropzone */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Upload Deliverables (PDF, DOC, PPT, Images)
                </label>

                <div className="relative border-2 border-dashed border-gray-300 hover:border-[#3ECE92] rounded-xl p-5 text-center transition-colors bg-white group cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.svg,.webp"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center">
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-[#3ECE92] mb-1.5 transition-colors" />
                    <p className="text-xs font-medium text-gray-700">
                      Click or drag & drop files here to upload
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Accepted: PDF, Word (DOC/DOCX), PowerPoint (PPT/PPTX), PNG/JPG
                    </p>
                  </div>
                </div>

                {/* Uploaded Files Pills */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono text-gray-400">Attached Files:</span>
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#e8f8f0] border border-[#d1f4e2] text-xs font-mono text-[#111614]"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#3ECE92]" />
                          <span className="font-medium max-w-xs truncate">{file.name}</span>
                          <span className="text-[10px] text-gray-500">({file.size})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-gray-400 hover:text-red-500 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. External Links (Loom, GitHub, Google Drive, Live App) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  External Links (Loom Walkthrough, GitHub Repo, n8n Live URL)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="https://loom.com/share/... or https://github.com/..."
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLink();
                        }
                      }}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#3ECE92] focus:ring-1 focus:ring-[#3ECE92] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                  >
                    Add Link
                  </button>
                </div>

                {/* Added Links List */}
                {linksList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono text-gray-400">Attached Links:</span>
                    <div className="space-y-1">
                      {linksList.map((link, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs font-mono text-blue-800"
                        >
                          <span className="truncate max-w-md">{link}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(idx)}
                            className="text-gray-400 hover:text-red-500 ml-2"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Optional Student Notes to Faculty */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Student Notes for Evaluator (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide context on your implementation, testing methodology, or questions for feedback..."
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#3ECE92] focus:ring-1 focus:ring-[#3ECE92] outline-none resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubpartModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780] shadow-md transition-all flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Deliverable'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
