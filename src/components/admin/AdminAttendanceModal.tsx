'use client';

import React, { useState, useEffect } from 'react';
import { useAttendance } from '@/context/AttendanceContext';
import { SessionItem, StudentAttendanceRecord, AttendanceStatus } from '@/types';
import {
  UserCheck,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Sparkles,
  Users,
  Check,
  AlertCircle,
  Save,
  Trash2,
} from 'lucide-react';

interface AdminAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionItem | null;
  onSuccess?: (message: string) => void;
  onDelete?: (session: SessionItem) => void;
}

export const AdminAttendanceModal: React.FC<AdminAttendanceModalProps> = ({
  isOpen,
  onClose,
  session,
  onSuccess,
  onDelete,
}) => {
  const { getSessionAttendance, updateSessionAttendance } = useAttendance();

  // Local state of records while editing inside modal
  const [localRecords, setLocalRecords] = useState<Record<string, StudentAttendanceRecord>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && session?.id) {
      const currentAttendance = getSessionAttendance(session.id);
      setLocalRecords(currentAttendance.records || {});
      setSavedSuccess(false);
    }
  }, [isOpen, session?.id]);

  if (!isOpen || !session) return null;

  const recordsList = Object.values(localRecords);
  const totalStudents = recordsList.length;
  const presentCount = recordsList.filter((r) => r.status === 'PRESENT').length;
  const lateCount = recordsList.filter((r) => r.status === 'LATE').length;
  const absentCount = recordsList.filter((r) => r.status === 'ABSENT').length;
  const attendedCount = presentCount + lateCount;
  const attendanceRate =
    totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 0;

  const handleToggleStatus = (email: string, newStatus: AttendanceStatus) => {
    const key = email.toLowerCase().trim();
    setLocalRecords((prev) => {
      const matchedKey =
        Object.keys(prev).find((k) => k.toLowerCase().trim() === key) || key;
      const existing = prev[matchedKey] || prev[email];
      if (!existing) return prev;
      return {
        ...prev,
        [matchedKey]: {
          ...existing,
          status: newStatus,
          markedAt: 'Just now',
        },
      };
    });
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setLocalRecords((prev) => {
      const updated: Record<string, StudentAttendanceRecord> = {};
      Object.entries(prev).forEach(([key, rec]) => {
        updated[key] = {
          ...rec,
          status,
          markedAt: 'Just now',
        };
      });
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSessionAttendance(session.id, localRecords);
      setSavedSuccess(true);
      if (onSuccess) {
        onSuccess(`Attendance saved for ${session.title}! (${attendanceRate}% attendance)`);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl sm:max-w-3xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f8f0] text-[#059669] flex items-center justify-center border border-[#d1f4e2] shrink-0">
              <UserCheck className="w-5 h-5 text-[#3ECE92]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Mark Session Attendance</h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {session.course}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium truncate max-w-md sm:max-w-lg">
                {session.title} • {session.date} • {session.time}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-5 flex-1">
          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold">Attendance Saved Successfully!</p>
                <p className="text-[11px] text-emerald-700">
                  Student dashboards and institutional records have been updated reactively.
                </p>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                Enrolled Cohort
              </span>
              <p className="text-lg font-bold text-gray-900 mt-1">{totalStudents}</p>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Present
              </span>
              <p className="text-lg font-bold text-emerald-800 mt-1">{presentCount}</p>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Late
              </span>
              <p className="text-lg font-bold text-amber-800 mt-1">{lateCount}</p>
            </div>

            <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Absent
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <p className="text-lg font-bold text-rose-800">{absentCount}</p>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  {attendanceRate}% rate
                </span>
              </div>
            </div>
          </div>

          {/* Actions & Roster Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Student Roster Attendance
              </h4>
              <p className="text-[11px] text-gray-400">
                Toggle status for each student or apply quick batch presets
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkAll('PRESENT')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#059669] bg-[#e8f8f0] border border-[#d1f4e2] hover:bg-[#d8f4e6] transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('ABSENT')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Mark All Absent</span>
              </button>
            </div>
          </div>

          {/* Student Roster List */}
          <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden bg-white">
            {recordsList.map((rec) => {
              const initials = rec.studentName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2);

              return (
                <div
                  key={rec.studentEmail}
                  className="p-3.5 sm:p-4 hover:bg-gray-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0 border border-gray-200/60">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {rec.studentName}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono truncate">
                        {rec.studentEmail}
                      </p>
                    </div>
                  </div>

                  {/* Status Toggle Segmented Buttons */}
                  <div className="inline-flex p-1 rounded-xl bg-gray-100/90 border border-gray-200/60 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(rec.studentEmail, 'PRESENT')}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        rec.status === 'PRESENT'
                          ? 'bg-[#3ECE92] text-[#111614] shadow-xs font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(rec.studentEmail, 'LATE')}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        rec.status === 'LATE'
                          ? 'bg-amber-400 text-amber-950 shadow-xs font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Late</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(rec.studentEmail, 'ABSENT')}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        rec.status === 'ABSENT'
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 font-mono">
              {attendedCount} of {totalStudents} students marked present
            </span>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(session)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                title="Delete this session from all platform areas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Session</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780] shadow-sm transition-all active:scale-95 cursor-pointer ${
                isSaving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Saving to Database...' : 'Save Attendance'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
