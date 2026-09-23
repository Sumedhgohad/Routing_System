"use client";

import React, { useEffect, useState } from "react";
import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TicketCardProps {
  id: string;
  summary: string;
  priority: string;
  sentiment: string;
  department: string;
  status: string;
  slaDeadline?: string | Date | null;
  assignedAgent?: { name: string } | null;
  createdAt: string | Date;
  isSelected?: boolean;
  onClick?: () => void;
}

function useSlaCountdown(deadline?: string | Date | null) {
  const [remaining, setRemaining] = useState<string>("");
  const [isBreached, setIsBreached] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const compute = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setIsBreached(true);
        setIsWarning(false);
        setRemaining("SLA Breached");
        return;
      }

      const totalMinutes = Math.floor(diff / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setIsBreached(false);
      setIsWarning(diff < 30 * 60 * 1000); // warn at <30 min
      setRemaining(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
    };

    compute();
    const interval = setInterval(compute, 30000);
    return () => clearInterval(interval);
  }, [deadline]);

  return { remaining, isBreached, isWarning };
}

const PRIORITY_META: Record<
  string,
  { bar: string; badge: string; label: string }
> = {
  critical: {
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    label: "Critical",
  },
  urgent: {
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    label: "Urgent",
  },
  high: {
    bar: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "High",
  },
  medium: {
    bar: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Medium",
  },
  low: {
    bar: "bg-zinc-300",
    badge: "bg-zinc-100 text-zinc-600 border-zinc-200",
    label: "Low",
  },
};

function resolvePriority(priority: string) {
  const key = priority.toLowerCase();
  for (const k of Object.keys(PRIORITY_META)) {
    if (key.includes(k)) return PRIORITY_META[k];
  }
  return PRIORITY_META.low;
}

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-emerald-500",
  IN_PROGRESS: "bg-blue-500",
  RESOLVED: "bg-zinc-400",
  CLOSED: "bg-zinc-300",
};

export function TicketCard({
  id,
  summary,
  priority,
  sentiment,
  department,
  status,
  slaDeadline,
  assignedAgent,
  createdAt,
  isSelected = false,
  onClick,
}: TicketCardProps) {
  const meta = resolvePriority(priority);
  const { remaining, isBreached, isWarning } = useSlaCountdown(slaDeadline);
  const dotColor = STATUS_DOT[status] ?? "bg-zinc-400";
  const isNegative = sentiment.toLowerCase().includes("frustrat") ||
    sentiment.toLowerCase().includes("angry") ||
    sentiment.toLowerCase().includes("urgent");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex flex-col rounded-lg border transition-all duration-150 overflow-hidden group cursor-pointer",
        isSelected
          ? "border-zinc-400 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800/80 shadow-sm"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs"
      )}
    >
      {/* Priority colour bar */}
      <div className={cn("h-0.5 w-full", meta.bar)} />

      <div className="p-3 space-y-2 flex-1">
        {/* Top row: priority badge + status dot */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
              meta.badge
            )}
          >
            {meta.label}
          </span>
          <span className="flex items-center space-x-1 text-[10px] font-medium text-zinc-500">
            <span className={cn("w-1.5 h-1.5 rounded-full inline-block", dotColor)} />
            <span>{status.replace("_", " ")}</span>
          </span>
        </div>

        {/* Summary */}
        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100 line-clamp-2 leading-relaxed">
          {summary}
        </p>

        {/* Department */}
        <p className="text-[10px] text-zinc-500 truncate">{department}</p>

        {/* Bottom row: assigned agent + SLA countdown */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 gap-2">
          <div className="flex items-center space-x-1 text-[10px] text-zinc-500 truncate min-w-0">
            <User className="w-3 h-3 shrink-0 text-zinc-400" />
            <span className="truncate">{assignedAgent?.name ?? "Unassigned"}</span>
          </div>

          {remaining && (
            <div
              className={cn(
                "flex items-center space-x-1 text-[10px] font-mono font-medium shrink-0",
                isBreached
                  ? "text-red-600 dark:text-red-400"
                  : isWarning
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-500"
              )}
            >
              <Clock className="w-3 h-3" />
              <span>{remaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* Negative sentiment strip */}
      {isNegative && (
        <div className="px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[10px] font-medium border-t border-red-100 dark:border-red-900/40 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
          <span>Frustrated / Urgent Customer</span>
        </div>
      )}
    </button>
  );
}
