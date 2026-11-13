'use client';

import React, { useState } from 'react';
import { useCourses } from '@/context/CourseContext';
import { CurriculumModule, CourseSubmodule } from '@/types';
import { toYouTubeEmbedUrl, getVideoEmbedInfo, isYouTubeUrl } from '@/lib/videoUtils';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Video,
  FileText,
  Award,
  Sparkles,
  ExternalLink,
  BookOpen,
  ArrowRight,
  X,
  Play,
  Save,
  Check,
} from 'lucide-react';

export const AdminCurriculumView: React.FC = () => {
  const {
    activeCourse,
    modules,
    totalLessons,
    completedLessonsCount,
    courseProgress,
    adminAddModule,
    adminEditModule,
    adminDeleteModule,
    adminAddSubmodule,
    adminEditSubmodule,
    adminDeleteSubmodule,
  } = useCourses();

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modal States
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CurriculumModule | null>(null);

  const [isAddSubmoduleModalOpen, setIsAddSubmoduleModalOpen] = useState(false);
  const [selectedModuleIdForSub, setSelectedModuleIdForSub] = useState<string>(
    modules[0]?.id || 'mod_1'
  );
  const [editingSubmodule, setEditingSubmodule] = useState<CourseSubmodule | null>(null);

  // New Module Form State
  const [newModTitle, setNewModTitle] = useState('');
  const [newModSubtitle, setNewModSubtitle] = useState('');
  const [newModWeeks, setNewModWeeks] = useState('Weeks 13–16');
  const [newModCert, setNewModCert] = useState('');

  // Edit Module Form State
  const [editModTitle, setEditModTitle] = useState('');
  const [editModSubtitle, setEditModSubtitle] = useState('');
  const [editModWeeks, setEditModWeeks] = useState('');
  const [editModCert, setEditModCert] = useState('');

  // New Sub-module Form State
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubDuration, setNewSubDuration] = useState('45m');
  const [newSubVideoUrl, setNewSubVideoUrl] = useState('');
  const [newSubType, setNewSubType] = useState<'video' | 'interactive' | 'challenge' | 'reading'>('video');
  const [newSubTakeaways, setNewSubTakeaways] = useState('');

  // Edit Sub-module Form State
  const [editSubTitle, setEditSubTitle] = useState('');
  const [editSubDesc, setEditSubDesc] = useState('');
  const [editSubDuration, setEditSubDuration] = useState('');
  const [editSubVideoUrl, setEditSubVideoUrl] = useState('');
  const [editSubType, setEditSubType] = useState<'video' | 'interactive' | 'challenge' | 'reading'>('video');
  const [editSubTakeaways, setEditSubTakeaways] = useState('');

  // Handlers for Module Creation
  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModTitle.trim()) return;

    adminAddModule({
      title: newModTitle.trim(),
      subtitle: newModSubtitle.trim(),
      weeks: newModWeeks.trim(),
      certificationName: newModCert.trim() || `${newModTitle.trim()} Certified`,
    });

    setNewModTitle('');
    setNewModSubtitle('');
    setNewModWeeks('Weeks 13–16');
    setNewModCert('');
    setIsAddModuleModalOpen(false);
    showToast(`Curriculum Module "${newModTitle.slice(0, 30)}" created successfully!`);
  };

  // Handlers for Module Editing
  const handleOpenEditModule = (mod: CurriculumModule) => {
    setEditingModule(mod);
    setEditModTitle(mod.title);
    setEditModSubtitle(mod.subtitle);
    setEditModWeeks(mod.weeks);
    setEditModCert(mod.certificationName || '');
  };

  const handleSaveEditModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editModTitle.trim()) return;

    adminEditModule({
      moduleId: editingModule.id,
      title: editModTitle.trim(),
      subtitle: editModSubtitle.trim(),
      weeks: editModWeeks.trim(),
      certificationName: editModCert.trim(),
    });

    setEditingModule(null);
    showToast(`Module updated successfully!`);
  };

  const handleDeleteModule = (mod: CurriculumModule) => {
    if (confirm(`Are you sure you want to delete "${mod.title}" and its ${mod.submodules.length} sub-modules?`)) {
      adminDeleteModule(mod.id);
      showToast(`Module "${mod.title}" deleted.`);
    }
  };

  // Handlers for Sub-module Creation
  const handleOpenAddSubmodule = (modId: string) => {
    setSelectedModuleIdForSub(modId);
    setNewSubTitle('');
    setNewSubDesc('');
    setNewSubDuration('45m');
    setNewSubTakeaways('');
    setIsAddSubmoduleModalOpen(true);
  };

  const handleCreateSubmodule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTitle.trim()) return;

    const takeawaysArray = newSubTakeaways
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const embedUrl = newSubVideoUrl.trim()
      ? toYouTubeEmbedUrl(newSubVideoUrl.trim()) || newSubVideoUrl.trim()
      : '';

    adminAddSubmodule({
      moduleId: selectedModuleIdForSub,
      title: newSubTitle.trim(),
      description: newSubDesc.trim(),
      duration: newSubDuration.trim() || '45m',
      videoUrl: embedUrl,
      type: newSubType,
      takeaways: takeawaysArray,
    });

    setIsAddSubmoduleModalOpen(false);
    showToast(`Sub-module "${newSubTitle.slice(0, 30)}" added successfully!`);
  };

  // Handlers for Sub-module Editing
  const handleOpenEditSubmodule = (sub: CourseSubmodule) => {
    setEditingSubmodule(sub);
    setEditSubTitle(sub.title);
    setEditSubDesc(sub.description);
    setEditSubDuration(sub.duration);
    // If it has a YouTube URL, ensure it is presented cleanly as embed URL
    const embedUrl = sub.videoUrl ? toYouTubeEmbedUrl(sub.videoUrl) || sub.videoUrl : '';
    setEditSubVideoUrl(embedUrl);
    setEditSubType(sub.type || 'video');
    setEditSubTakeaways((sub.takeaways || []).join('\n'));
  };

  const handleSaveEditSubmodule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmodule || !editSubTitle.trim()) return;

    const takeawaysArray = editSubTakeaways
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const embedUrl = editSubVideoUrl.trim()
      ? toYouTubeEmbedUrl(editSubVideoUrl.trim()) || editSubVideoUrl.trim()
      : '';

    adminEditSubmodule({
      submoduleId: editingSubmodule.id,
      title: editSubTitle.trim(),
      description: editSubDesc.trim(),
      duration: editSubDuration.trim(),
      videoUrl: embedUrl,
      type: editSubType,
      takeaways: takeawaysArray,
    });

    setEditingSubmodule(null);
    showToast(`Sub-module updated successfully!`);
  };

  const handleDeleteSubmodule = (sub: CourseSubmodule) => {
    if (confirm(`Are you sure you want to delete sub-module Part ${sub.subpartCode}: "${sub.title}"?`)) {
      adminDeleteSubmodule(sub.id);
      showToast(`Sub-module removed.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121614] text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-800 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-6 h-6 rounded-full bg-[#3ECE92]/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-[#3ECE92]" />
          </div>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Program Header & Action Bar */}
      <div className="bg-white rounded-2xl p-6 border border-[#eaedf0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#e8f8f0] text-[#059669] border border-[#d1f4e2]">
              <Layers className="w-3.5 h-3.5" />
              Flagship Curriculum • {activeCourse.code}
            </span>
            <span className="text-xs text-gray-400 font-mono">• 3 Professional Certifications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111614]">
            {activeCourse.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            {activeCourse.description}
          </p>
        </div>

        {/* Global Admin Curriculum Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href={`/courses/${activeCourse.id}`}
            id="admin-launch-classroom-btn"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200/80 shadow-xs transition-all active:scale-95"
            title="Preview Learner Classroom & Video Player"
          >
            <Play className="w-3.5 h-3.5 text-[#059669]" />
            <span>Classroom View</span>
          </Link>

          <button
            onClick={() => setIsAddModuleModalOpen(true)}
            id="admin-add-module-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#121614] hover:bg-black shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#3ECE92]" />
            <span>Add Module</span>
          </button>
        </div>
      </div>

      {/* Program Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#eaedf0] shadow-xs">
          <div className="text-[11px] text-gray-400 font-mono font-semibold uppercase tracking-wider">
            Total Modules
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 mt-1">
            {modules.length}
          </div>
          <div className="text-[11px] text-[#059669] font-medium mt-0.5">
            12-Week Executive Roadmap
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#eaedf0] shadow-xs">
          <div className="text-[11px] text-gray-400 font-mono font-semibold uppercase tracking-wider">
            Sub-modules / Lessons
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 mt-1">
            {totalLessons}
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-0.5">
            Structured Syllabus Units
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#eaedf0] shadow-xs">
          <div className="text-[11px] text-gray-400 font-mono font-semibold uppercase tracking-wider">
            Enrolled Learners
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 mt-1">
            {activeCourse.enrolledStudentsCount || 148}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-0.5">
            Active Cohort 2026
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#eaedf0] shadow-xs">
          <div className="text-[11px] text-gray-400 font-mono font-semibold uppercase tracking-wider">
            Cohort Benchmark Progress
          </div>
          <div className="text-2xl font-bold font-mono text-[#059669] mt-1">
            {courseProgress}%
          </div>
          <div className="text-[11px] text-gray-500 font-mono mt-0.5">
            {completedLessonsCount}/{totalLessons} completed
          </div>
        </div>
      </div>

      {/* ================= CURRICULUM MODULES LIST ================= */}
      <div className="space-y-6">
        {modules.map((module) => (
          <div
            key={module.id}
            className="bg-white rounded-2xl border border-[#eaedf0] shadow-xs overflow-hidden"
          >
            {/* Module Header Bar (Matching Assessment page style) */}
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/40">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-[#059669] bg-[#e8f8f0] px-2.5 py-0.5 rounded-md">
                    Module {module.moduleNumber} ({module.weeks})
                  </span>
                  {module.certificationName && (
                    <span className="text-xs text-gray-500 font-mono">
                      • {module.certificationName}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-gray-400">
                    • {module.submodules.length} Sub-modules
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{module.title}</h3>
                <p className="text-xs text-gray-500 max-w-3xl leading-relaxed">
                  {module.subtitle}
                </p>
              </div>

              {/* Module Action CTAs */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleOpenAddSubmodule(module.id)}
                  id={`admin-add-subpart-btn-${module.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 shadow-xs transition-colors"
                  title="Add Sub-module under this module"
                >
                  <Plus className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Add Sub-Module</span>
                </button>

                <button
                  onClick={() => handleOpenEditModule(module)}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200 bg-white"
                  title="Edit Module Details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteModule(module)}
                  className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors border border-rose-200 bg-white"
                  title="Delete Module"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-modules List (Identical in structure to assessment page) */}
            <div className="divide-y divide-gray-100">
              {module.submodules.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No sub-modules added yet. Click &ldquo;+ Add Sub-Module&rdquo; above to create syllabus units.
                </div>
              ) : (
                module.submodules.map((subpart) => (
                  <div
                    key={subpart.id}
                    className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          Part {subpart.subpartCode}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900">
                          {subpart.title}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {subpart.duration}
                        </span>
                        {subpart.type && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {subpart.type}
                          </span>
                        )}
                        {subpart.videoUrl && getVideoEmbedInfo(subpart.videoUrl).isValid && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <Video className="w-3 h-3 text-rose-600" />
                            {getVideoEmbedInfo(subpart.videoUrl).provider === 'youtube' ? 'YouTube Embedded' : 'Video Linked'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed">
                        {subpart.description}
                      </p>

                      {/* Takeaways & Keywords */}
                      {subpart.takeaways && subpart.takeaways.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {subpart.takeaways.map((takeaway, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#f4f6f5] text-gray-700 px-2 py-0.5 rounded-md border border-gray-200/60"
                            >
                              <Check className="w-2.5 h-2.5 text-[#059669]" />
                              {takeaway}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sub-module Actions */}
                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <Link
                        href={`/courses/${activeCourse.id}?lesson=${subpart.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        title="View Lesson in Classroom"
                      >
                        <Play className="w-3 h-3 text-[#059669]" />
                        <span>Preview</span>
                      </Link>

                      <button
                        onClick={() => handleOpenEditSubmodule(subpart)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        title="Edit Sub-module"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteSubmodule(subpart)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Sub-module"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ================= MODAL 1: ADD MODULE ================= */}
      {isAddModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e8f8f0] flex items-center justify-center text-[#059669]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Add Course Module</h3>
                  <p className="text-[11px] text-gray-400">Expand the curriculum hierarchy</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModuleModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI-Native Project Management"
                  value={newModTitle}
                  onChange={(e) => setNewModTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Subtitle / Learning Scope *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Lead AI-powered projects. Deliver outcomes, not just plans."
                  value={newModSubtitle}
                  onChange={(e) => setNewModSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Weeks Duration *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weeks 9–12"
                    value={newModWeeks}
                    onChange={(e) => setNewModWeeks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Certification Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI-Native PM Certified"
                    value={newModCert}
                    onChange={(e) => setNewModCert(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#121614] hover:bg-black text-white font-bold transition-all"
                >
                  Create Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT MODULE ================= */}
      {editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e8f8f0] flex items-center justify-center text-[#059669]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Edit Module {editingModule.moduleNumber}
                  </h3>
                  <p className="text-[11px] text-gray-400">Update module parameters</p>
                </div>
              </div>
              <button
                onClick={() => setEditingModule(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={editModTitle}
                  onChange={(e) => setEditModTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Subtitle / Learning Scope *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editModSubtitle}
                  onChange={(e) => setEditModSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Weeks Duration *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModWeeks}
                    onChange={(e) => setEditModWeeks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Certification Tag
                  </label>
                  <input
                    type="text"
                    value={editModCert}
                    onChange={(e) => setEditModCert(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#121614] hover:bg-black text-white font-bold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ADD SUB-MODULE ================= */}
      {isAddSubmoduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e8f8f0] flex items-center justify-center text-[#059669]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Add Sub-Module / Lesson</h3>
                  <p className="text-[11px] text-gray-400">
                    Create a new syllabus unit beneath the selected module
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSubmoduleModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmodule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Target Module *
                </label>
                <select
                  value={selectedModuleIdForSub}
                  onChange={(e) => setSelectedModuleIdForSub(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#3ECE92]"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Module {m.moduleNumber}: {m.title} ({m.weeks})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Sub-Module Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Context Engineering & Structured Prompting"
                  value={newSubTitle}
                  onChange={(e) => setNewSubTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Description & Learning Scope *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain what the learner will build, understand, or execute in this lesson."
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Duration (e.g. 45m, 1h 15m) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="45m"
                    value={newSubDuration}
                    onChange={(e) => setNewSubDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Content Type
                  </label>
                  <select
                    value={newSubType}
                    onChange={(e) => setNewSubType(e.target.value as typeof newSubType)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#3ECE92]"
                  >
                    <option value="video">Video Lecture</option>
                    <option value="interactive">Interactive Build</option>
                    <option value="challenge">Mini Challenge</option>
                    <option value="reading">Reading / Documentation</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-gray-700 font-semibold">
                    Video URL (YouTube, Vimeo, Loom)
                  </label>
                  {toYouTubeEmbedUrl(newSubVideoUrl) && newSubVideoUrl !== toYouTubeEmbedUrl(newSubVideoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        const embed = toYouTubeEmbedUrl(newSubVideoUrl);
                        if (embed) setNewSubVideoUrl(embed);
                      }}
                      className="text-[11px] font-mono font-bold text-[#059669] hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-Format Embed
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. https://youtu.be/_Xe2JAoMwIA or https://youtube.com/watch?v=..."
                  value={newSubVideoUrl}
                  onChange={(e) => setNewSubVideoUrl(e.target.value)}
                  onBlur={() => {
                    const embed = toYouTubeEmbedUrl(newSubVideoUrl);
                    if (embed) setNewSubVideoUrl(embed);
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    const embed = toYouTubeEmbedUrl(text);
                    if (embed) {
                      e.preventDefault();
                      setNewSubVideoUrl(embed);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
                {getVideoEmbedInfo(newSubVideoUrl).isValid ? (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                      <span className="flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Embed Link Created for Platform
                      </span>
                      <span className="text-[10px] text-emerald-600 truncate max-w-[200px]">
                        {getVideoEmbedInfo(newSubVideoUrl).embedUrl}
                      </span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-black aspect-video max-h-48 w-full mt-1.5 shadow-inner">
                      <iframe
                        src={getVideoEmbedInfo(newSubVideoUrl).embedUrl}
                        title="New Sub-module Video Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">
                    Paste any YouTube URL (watch, share, shorts) to automatically generate an embedded player for learners.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Key Takeaways (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="The CTID Framework&#10;System prompts and role engineering&#10;Prompt library management"
                  value={newSubTakeaways}
                  onChange={(e) => setNewSubTakeaways(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddSubmoduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#121614] hover:bg-black text-white font-bold transition-all"
                >
                  Add Sub-Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: EDIT SUB-MODULE ================= */}
      {editingSubmodule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e8f8f0] flex items-center justify-center text-[#059669]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Edit Part {editingSubmodule.subpartCode}
                  </h3>
                  <p className="text-[11px] text-gray-400">Update sub-module details</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSubmodule(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmodule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Sub-Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={editSubTitle}
                  onChange={(e) => setEditSubTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editSubDesc}
                  onChange={(e) => setEditSubDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSubDuration}
                    onChange={(e) => setEditSubDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Content Type
                  </label>
                  <select
                    value={editSubType}
                    onChange={(e) => setEditSubType(e.target.value as typeof editSubType)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#3ECE92]"
                  >
                    <option value="video">Video Lecture</option>
                    <option value="interactive">Interactive Build</option>
                    <option value="challenge">Mini Challenge</option>
                    <option value="reading">Reading / Documentation</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-gray-700 font-semibold">
                    Video URL (YouTube Embed / Stream)
                  </label>
                  {toYouTubeEmbedUrl(editSubVideoUrl) && editSubVideoUrl !== toYouTubeEmbedUrl(editSubVideoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        const embed = toYouTubeEmbedUrl(editSubVideoUrl);
                        if (embed) setEditSubVideoUrl(embed);
                      }}
                      className="text-[11px] font-mono font-bold text-[#059669] hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-Format Embed
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. https://youtu.be/_Xe2JAoMwIA or https://youtube.com/watch?v=..."
                  value={editSubVideoUrl}
                  onChange={(e) => setEditSubVideoUrl(e.target.value)}
                  onBlur={() => {
                    const embed = toYouTubeEmbedUrl(editSubVideoUrl);
                    if (embed) setEditSubVideoUrl(embed);
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    const embed = toYouTubeEmbedUrl(text);
                    if (embed) {
                      e.preventDefault();
                      setEditSubVideoUrl(embed);
                      showToast('Converted to YouTube embed link!');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
                {getVideoEmbedInfo(editSubVideoUrl).isValid ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        YouTube Embed Link Created
                      </span>
                      <span className="text-[10px] text-emerald-600 truncate max-w-[220px]">
                        {getVideoEmbedInfo(editSubVideoUrl).embedUrl}
                      </span>
                    </div>
                    {/* Live Preview Embed */}
                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-black aspect-video max-h-52 w-full shadow-inner">
                      <iframe
                        src={getVideoEmbedInfo(editSubVideoUrl).embedUrl}
                        title="Live Platform Embed Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">
                    Paste any YouTube URL (watch, share, shorts) to automatically generate an embedded player for learners.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Key Takeaways (one per line)
                </label>
                <textarea
                  rows={3}
                  value={editSubTakeaways}
                  onChange={(e) => setEditSubTakeaways(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#3ECE92]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingSubmodule(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#121614] hover:bg-black text-white font-bold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
