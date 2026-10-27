'use client';

import React, { useState } from 'react';
import { SessionItem } from '@/types';
import { Clock, Play, Video, ExternalLink, Bookmark, CheckCircle2 } from 'lucide-react';
import { parseDbTimestamp } from '@/lib/dateUtils';

interface RecentSessionsTableProps {
  sessions: SessionItem[];
}

export const RecentSessionsTable: React.FC<RecentSessionsTableProps> = ({ sessions }) => {
  const [activeSessionModal, setActiveSessionModal] = useState<SessionItem | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-[#eaedf0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Recent sessions
        </h3>
        <button
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Save or view session records"
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-[#fafbfb]/60">
              <th className="py-3.5 px-6">Session</th>
              <th className="py-3.5 px-6">Course</th>
              <th className="py-3.5 px-6">Type</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map((session) => {
              const isLive = session.status === 'In Progress';
              const isUpcoming = session.status === 'Upcoming';

              // Calculate dynamic remaining minutes if expiring
              let remainingMinutesText = '';
              if (isLive && session.expiresAt) {
                const exp = parseDbTimestamp(session.expiresAt);
                const diffMs = exp - Date.now();
                if (diffMs > 0) {
                  const mins = Math.max(1, Math.round(diffMs / 60000));
                  remainingMinutesText = ` • ${mins}m left`;
                }
              }

              const meetUrl = session.meetingUrl || 'https://meet.google.com/jye-igap-skb';

              return (
                <tr
                  key={session.id}
                  className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                  onClick={() => setActiveSessionModal(session)}
                >
                  {/* Session Title */}
                  <td className="py-4 px-6 font-semibold text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{session.title}</span>
                      {isLive && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ECE92] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Course Name */}
                  <td className="py-4 px-6 text-gray-500 font-medium">
                    {session.course}
                  </td>

                  {/* Type Badge */}
                  <td className="py-4 px-6">
                    <span
                      className={`text-[11px] font-semibold tracking-wider uppercase ${
                        session.type === 'LIVE'
                          ? 'text-[#059669]'
                          : 'text-[#10b981]'
                      }`}
                    >
                      {session.type}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-6">
                    {isLive ? (
                      <span suppressHydrationWarning className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#5ae4a8] text-[#111614] shadow-xs">
                        <Clock className="w-3 h-3 text-[#111614]" />
                        <span suppressHydrationWarning>Live Now{remainingMinutesText}</span>
                      </span>
                    ) : isUpcoming ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Upcoming</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#f3f4f6] text-gray-600 border border-gray-200/60">
                        <CheckCircle2 className="w-3 h-3 text-gray-400" />
                        <span>Closed</span>
                      </span>
                    )}
                  </td>

                  {/* Action Link */}
                  <td className="py-4 px-6 text-right">
                    {isLive ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(meetUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121614] text-white hover:bg-black transition-all shadow-xs active:scale-95 cursor-pointer"
                        title="Join Google Meet Live Room"
                      >
                        <Video className="w-3.5 h-3.5 text-[#3ECE92]" />
                        <span>Join Live</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSessionModal(session);
                        }}
                        className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Details</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Session Details / Live Player Modal */}
      {activeSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#059669] bg-[#e8f8f0] px-2.5 py-1 rounded-full">
                {activeSessionModal.type} Session
              </span>
              <button
                onClick={() => setActiveSessionModal(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-bold text-gray-900">
                {activeSessionModal.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Course: {activeSessionModal.course}
              </p>

              <div className="mt-4 bg-[#f8faf9] p-4 rounded-2xl space-y-2.5 text-xs text-gray-600 border border-gray-100">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-400">Instructor:</span>
                  <span className="font-semibold text-gray-800">{activeSessionModal.instructor || 'Faculty Member'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-400">Date & Time:</span>
                  <span className="font-semibold text-gray-800">{activeSessionModal.date} ({activeSessionModal.time})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-400">Duration:</span>
                  <span className="font-semibold text-gray-800">{activeSessionModal.duration || '60 mins'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-400">Status:</span>
                  <span className={`font-semibold ${activeSessionModal.status === 'In Progress' ? 'text-[#059669]' : 'text-gray-700'}`}>
                    {activeSessionModal.status === 'In Progress' ? 'Live Now' : activeSessionModal.status}
                  </span>
                </div>
                {activeSessionModal.meetingUrl && (
                  <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                    <span className="font-medium text-gray-400">Meet Room:</span>
                    <a
                      href={activeSessionModal.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-[#059669] hover:underline flex items-center gap-1 font-semibold truncate max-w-[200px]"
                    >
                      <span>{activeSessionModal.meetingUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                {activeSessionModal.status === 'In Progress' || activeSessionModal.meetingUrl ? (
                  <button
                    onClick={() => {
                      const url = activeSessionModal.meetingUrl || 'https://meet.google.com/jye-igap-skb';
                      window.open(url, '_blank', 'noopener,noreferrer');
                      setActiveSessionModal(null);
                    }}
                    className="flex-1 bg-[#3ECE92] hover:bg-[#34be83] text-[#111614] font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Video className="w-4 h-4 fill-current" />
                    <span>Join Google Meet Classroom</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (activeSessionModal.recordingUrl) {
                        window.open(activeSessionModal.recordingUrl, '_blank', 'noopener,noreferrer');
                      }
                      setActiveSessionModal(null);
                    }}
                    className="flex-1 bg-[#121614] hover:bg-black text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-[#3ECE92]" />
                    <span>Watch High-Def Recording</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveSessionModal(null)}
                  className="px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
