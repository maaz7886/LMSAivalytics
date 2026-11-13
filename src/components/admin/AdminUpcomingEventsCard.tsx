'use client';

import React from 'react';
import Link from 'next/link';
import { SessionItem } from '@/types';
import { useAttendance } from '@/context/AttendanceContext';
import {
  Calendar,
  Video,
  Clock,
  Plus,
  ExternalLink,
  User,
  UserCheck,
  Trash2,
} from 'lucide-react';

interface AdminUpcomingEventsCardProps {
  events: SessionItem[];
  onAddEvent?: (event: Omit<SessionItem, 'id'>) => void;
  onOpenCreateModal?: () => void;
}

export const AdminUpcomingEventsCard: React.FC<AdminUpcomingEventsCardProps> = ({
  events,
  onOpenCreateModal,
}) => {
  const { getSessionAttendance, deleteSession } = useAttendance();
  const [eventToDelete, setEventToDelete] = React.useState<SessionItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[#eaedf0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 card-hover flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f8f0] flex items-center justify-center border border-[#d1f4e2]/60">
              <Calendar className="w-4 h-4 text-[#3ECE92]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Upcoming Events</h3>
              <p className="text-xs text-gray-400">Scheduled seminars, exams & reviews</p>
            </div>
          </div>

          {onOpenCreateModal ? (
            <button
              onClick={onOpenCreateModal}
              id="admin-events-schedule-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#121614] text-white hover:bg-black transition-colors"
              title="Launch Live Lecture"
            >
              <Plus className="w-3.5 h-3.5 text-[#3ECE92]" />
              <span>+ Lecture</span>
            </button>
          ) : (
            <Link
              href="/attendance?action=schedule"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#121614] text-white hover:bg-black transition-colors"
              title="Schedule new session on Attendance page"
            >
              <Plus className="w-3.5 h-3.5 text-[#3ECE92]" />
              <span>Schedule</span>
            </Link>
          )}
        </div>

        {/* Events List */}
        <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
          {events.map((event) => {
            const isLive = event.status === 'In Progress';
            const attendance = getSessionAttendance(event.id);
            const hasAttendance = attendance && attendance.totalEnrolled > 0;

            return (
              <div
                key={event.id}
                className="py-3.5 px-2 hover:bg-gray-50/70 rounded-xl transition-colors flex items-start justify-between gap-3"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-[#059669] bg-[#e8f8f0] px-2 py-0.5 rounded-md">
                      {event.course}
                    </span>

                    {isLive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5ae4a8] text-[#111614]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#111614] animate-ping" />
                        <span>Live Now</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {event.type}
                      </span>
                    )}

                    {/* Attendance Badge - Redirects directly to Attendance page */}
                    <Link
                      href={`/attendance?session=${event.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-colors"
                      title="Manage session attendance on Attendance page"
                    >
                      <UserCheck className="w-3 h-3 text-[#059669]" />
                      <span>
                        {hasAttendance
                          ? `${attendance.presentCount + attendance.lateCount}/${attendance.totalEnrolled} Present (${attendance.attendanceRate}%)`
                          : 'Mark Attendance'}
                      </span>
                    </Link>
                  </div>

                  <h4 className="text-xs font-bold text-gray-900 truncate">
                    {event.title}
                  </h4>

                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {event.date} • {event.time}
                    </span>
                    {event.instructor && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        {event.instructor}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-center flex items-center gap-1.5">
                  <Link
                    href={`/attendance?session=${event.id}`}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-emerald-800 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 transition-all flex items-center gap-1.5 shadow-2xs"
                    title="Update Attendance on Attendance page"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#3ECE92]" />
                    <span className="hidden sm:inline">Attendance</span>
                  </Link>

                  {isLive ? (
                    <button
                      onClick={() => {
                        const url = event.meetingUrl || 'https://meet.google.com/jye-igap-skb';
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#3ECE92] text-[#111614] hover:bg-[#34be83] flex items-center gap-1 transition-transform hover:scale-105 shadow-sm"
                      title="Join Google Meet Live Room"
                    >
                      <Video className="w-3 h-3 fill-current" />
                      <span>Join Room</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const url = event.meetingUrl || event.recordingUrl || 'https://meet.google.com/jye-igap-skb';
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      title="Open meeting room"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setEventToDelete(event)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Session from all platform areas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Lecture Session</h3>
                <p className="text-[11px] text-gray-400">Permanently removes session from all platform areas</p>
              </div>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
              <p className="text-xs font-semibold text-gray-900">{eventToDelete.title}</p>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1 font-mono">
                <span>{eventToDelete.course}</span>
                <span>•</span>
                <span>{eventToDelete.date}</span>
              </div>
              <p className="text-[11px] text-rose-700 mt-2 font-medium">
                ⚠️ This action cannot be undone. All associated attendance records and rosters will also be deleted from the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteSession(eventToDelete.id);
                    setEventToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete event:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
