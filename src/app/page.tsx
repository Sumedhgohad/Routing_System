"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  User,
  Building,
  Clock,
  Timer,
  Tag,
  Sparkles,
  Clipboard,
  Check,
  Frown,
  Meh,
  Smile,
  AlertTriangle,
  ChevronRight,
  SendHorizonal,
  Loader2,
  Filter,
  ArrowUpRight,
  MessageSquare,
  Activity,
} from "lucide-react";
import { TicketCard } from "@/components/TicketCard";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────── */
/*  Types                                                      */
/* ────────────────────────────────────────────────────────── */
interface Agent {
  id: string;
  name: string;
  department: string;
}

interface Ticket {
  id: string;
  description: string;
  category: string;
  priority: string;
  sentiment: string;
  summary: string;
  department: string;
  status: string;
  slaDeadline?: string | Date | null;
  assignedAgentId?: string | null;
  assignedAgent?: Agent | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const AVAILABLE_AGENTS: Agent[] = [
  { id: "agent-fin-01", name: "Priya Sharma", department: "Finance/Billing" },
  { id: "agent-sec-01", name: "Marcus Vance", department: "Security/IT" },
  { id: "agent-log-01", name: "David Chen", department: "Logistics/Operations" },
  { id: "agent-eng-01", name: "Sarah Jenkins", department: "Engineering/Support" },
  { id: "agent-gen-01", name: "Alex Morgan", department: "Customer Support" },
];

const TEMPLATES = [
  { title: "Payment Settlement Pending", text: "Customer charged via bank transfer (Ref #TXN-90214). Transaction completed on bank side but order status remains 'Payment Pending' for 4 hours." },
  { title: "SSO / OTP Authentication Stall", text: "User locked out after corporate domain password reset. One-time passcode is not being dispatched to registered phone number or backup email." },
  { title: "Logistics Delivery Exception", text: "Package for Order #88194 marked as 'Delivered' in regional hub tracking, but consignee confirms non-receipt at destination address." },
  { title: "Checkout 500 Gateway Timeout", text: "Intermittent HTTP 500 / 504 Gateway Timeout observed on checkout API endpoint during peak traffic. Mobile client fails to complete session." },
];

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                    */
/* ────────────────────────────────────────────────────────── */
function formatSlaTarget(priority: string): string {
  const p = priority.toLowerCase();
  if (p.includes("crit") || p.includes("urgent")) return "1 hour (P1)";
  if (p.includes("high")) return "4 hours (P2)";
  if (p.includes("med")) return "8 hours (P3)";
  return "24 hours (P4)";
}

function priorityClass(priority: string) {
  const p = priority.toLowerCase();
  if (p.includes("crit") || p.includes("urgent")) return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50";
  if (p.includes("high")) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
  if (p.includes("med")) return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50";
  return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
}

function sentimentIcon(sentiment: string) {
  const s = sentiment.toLowerCase();
  if (s.includes("frustrat") || s.includes("angry") || s.includes("urgent")) return { icon: Frown, color: "text-red-500", label: "Frustrated / Urgent" };
  if (s.includes("calm") || s.includes("polite") || s.includes("positive")) return { icon: Smile, color: "text-emerald-500", label: "Calm / Positive" };
  return { icon: Meh, color: "text-amber-500", label: "Neutral" };
}

/* ────────────────────────────────────────────────────────── */
/*  New Ticket Modal                                           */
/* ────────────────────────────────────────────────────────── */
function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Ticket) => void }) {
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketDescription: desc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create ticket");
      onCreated(data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log New Incident</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Preset Scenarios</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDesc(t.text)}
                className="text-left p-2 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Issue Description</label>
            <textarea
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe the customer's issue..."
              className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-900/40">{error}</p>
          )}

          <div className="flex items-center justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading || !desc.trim()} className="px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendHorizonal className="w-3.5 h-3.5" />}
              <span>{loading ? "Classifying..." : "Submit & Route"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Main Page                                                  */
/* ────────────────────────────────────────────────────────── */
export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showNewModal, setShowNewModal] = useState(false);

  // AI Co-Pilot state
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionSource, setSuggestionSource] = useState<"openai" | "fallback" | null>(null);
  const [copied, setCopied] = useState(false);

  // Reassign state
  const [reassigning, setReassigning] = useState(false);
  const [reassignMsg, setReassignMsg] = useState<string | null>(null);

  const fetchTickets = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/tickets");
      if (res.ok) {
        const data: Ticket[] = await res.json();
        setTickets(data);
        if (data.length > 0 && !selected) setSelected(data[0]);
        if (selected) {
          const refreshed = data.find((t) => t.id === selected.id);
          if (refreshed) setSelected(refreshed);
        }
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selected]);

  useEffect(() => { fetchTickets(); }, []);

  // Reset copilot suggestion when ticket changes
  useEffect(() => {
    setSuggestion(null);
    setSuggestionSource(null);
    setCopied(false);
    setReassignMsg(null);
  }, [selected?.id]);

  const handleGenerate = async () => {
    if (!selected || copilotLoading) return;
    setCopilotLoading(true);
    setSuggestion(null);
    try {
      const res = await fetch(`/api/tickets/${selected.id}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: selected.description,
          category: selected.category,
          department: selected.department,
          sentiment: selected.sentiment,
          summary: selected.summary,
          priority: selected.priority,
        }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion || "Unable to generate suggestion.");
      setSuggestionSource(data.source);
    } catch {
      setSuggestion("Failed to connect to AI service.");
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!suggestion) return;
    await navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReassign = async (agentId: string) => {
    if (!selected || reassigning) return;
    setReassigning(true);
    setReassignMsg(null);
    try {
      const res = await fetch(`/api/tickets/${selected.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      const agent = AVAILABLE_AGENTS.find((a) => a.id === agentId);
      const updated: Ticket = { ...selected, assignedAgentId: agentId, assignedAgent: agent || selected.assignedAgent };
      setSelected(updated);
      setTickets((prev) => prev.map((t) => (t.id === selected.id ? updated : t)));
      setReassignMsg(`Reassigned to ${agent?.name || "agent"}`);
      setTimeout(() => setReassignMsg(null), 3000);
    } finally {
      setReassigning(false);
    }
  };

  const onNewTicketCreated = (ticket: Ticket) => {
    setTickets((prev) => [ticket, ...prev]);
    setSelected(ticket);
  };

  const filtered = tickets.filter((t) => {
    const matchSearch = !search || t.summary.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search);
    const matchPriority = filterPriority === "ALL" || t.priority.toLowerCase().includes(filterPriority.toLowerCase());
    const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchSearch && matchPriority && matchStatus;
  });

  const senti = selected ? sentimentIcon(selected.sentiment) : null;
  const SentiIcon = senti?.icon ?? Meh;

  return (
    <div className="h-screen flex flex-col bg-[#f4f4f5] dark:bg-[#0a0a0b] text-zinc-900 dark:text-zinc-100 font-sans antialiased overflow-hidden">

      {/* ── Top Navigation Bar ── */}
      <header className="h-12 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center px-4 gap-4 z-30">
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-6 h-6 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-[10px] font-bold tracking-wider">
            DI
          </div>
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">DispatchOps</span>
          <span className="text-zinc-400 text-xs hidden md:inline">/</span>
          <span className="text-zinc-500 text-xs hidden md:inline">Support Console</span>
        </div>

        <div className="flex-1" />

        <div className="hidden lg:flex items-center space-x-4 text-xs text-zinc-500 mr-2">
          <span className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span><strong className="text-zinc-900 dark:text-zinc-200">{tickets.length}</strong> total</span>
          </span>
          <span><strong className="text-zinc-900 dark:text-zinc-200">{tickets.filter(t => t.status === "OPEN").length}</strong> open</span>
          <span><strong className="text-amber-600">{tickets.filter(t => t.priority.toLowerCase().includes("high") || t.priority.toLowerCase().includes("crit")).length}</strong> high SLA</span>
        </div>

        <button onClick={() => setShowNewModal(true)} className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" />
          <span>New Incident</span>
        </button>

        <button onClick={() => fetchTickets(true)} disabled={isRefreshing} className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
        </button>
      </header>

      {/* ── 3-Column Workspace ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ════════════════════════════════════════════════ */}
        {/* LEFT COLUMN – Ticket List                        */}
        {/* ════════════════════════════════════════════════ */}
        <aside className="w-72 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] overflow-hidden">
          {/* Search + Filters */}
          <div className="p-3 space-y-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search incidents..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="flex-1 text-[11px] px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 text-[11px] px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-zinc-400 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                <span>Loading incidents...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-zinc-400 space-y-1 pt-8">
                <MessageSquare className="w-6 h-6 text-zinc-300 dark:text-zinc-700 stroke-1" />
                <p>No incidents found</p>
              </div>
            ) : (
              filtered.map((t) => (
                <TicketCard
                  key={t.id}
                  {...t}
                  isSelected={selected?.id === t.id}
                  onClick={() => setSelected(t)}
                />
              ))
            )}
          </div>

          {/* Footer count */}
          <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between">
            <span>{filtered.length} of {tickets.length} incidents</span>
            <Filter className="w-3 h-3" />
          </div>
        </aside>

        {/* ════════════════════════════════════════════════ */}
        {/* CENTER COLUMN – Ticket Detail                    */}
        {/* ════════════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800 bg-[#fafafa] dark:bg-[#0d0d0f]">
          {selected ? (
            <>
              {/* Detail Header */}
              <div className="shrink-0 px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border", priorityClass(selected.priority))}>
                      {selected.priority}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 truncate">{selected.id}</span>
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                    {selected.summary}
                  </h2>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                    <span className="flex items-center space-x-1"><Building className="w-3 h-3" /><span>{selected.department}</span></span>
                    <span className="flex items-center space-x-1"><Tag className="w-3 h-3" /><span>{selected.category}</span></span>
                    <span className="flex items-center space-x-1"><Clock className="w-3 h-3" /><span>{new Date(selected.createdAt).toLocaleString()}</span></span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900">
                    <span className={cn("w-1.5 h-1.5 rounded-full", selected.status === "OPEN" ? "bg-emerald-500" : selected.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-zinc-400")} />
                    <span>{selected.status.replace("_", " ")}</span>
                  </span>
                </div>
              </div>

              {/* Detail Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Original Message */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Customer Message</p>
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                    {selected.description}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Category", value: selected.category },
                    { label: "Department", value: selected.department },
                    { label: "Priority Tier", value: selected.priority },
                    { label: "SLA Target", value: formatSlaTarget(selected.priority) },
                  ].map((item) => (
                    <div key={item.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                      <p className="text-[11px] text-zinc-400 mb-0.5">{item.label}</p>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Assignment Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Assigned Engineer</p>
                    {reassignMsg && <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{reassignMsg}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                        {selected.assignedAgent?.name?.slice(0, 2).toUpperCase() ?? "—"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{selected.assignedAgent?.name ?? "Unassigned"}</p>
                        <p className="text-[10px] text-zinc-500">{selected.assignedAgent?.department ?? ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider shrink-0">Reassign:</p>
                      <select
                        disabled={reassigning}
                        value={selected.assignedAgentId || ""}
                        onChange={(e) => handleReassign(e.target.value)}
                        className="text-[11px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>Select engineer...</option>
                        {AVAILABLE_AGENTS.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Audit Trace */}
                <div className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 space-y-1">
                  <div className="flex items-center space-x-1.5 text-zinc-700 dark:text-zinc-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Audit: Workload-Balanced Dispatch</span>
                  </div>
                  <p className="pl-5 leading-normal">
                    Routed to {selected.assignedAgent?.name ?? "queue"} — {selected.department} — Priority: {selected.priority} — SLA: {formatSlaTarget(selected.priority)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 space-y-2">
              <MessageSquare className="w-10 h-10 text-zinc-300 dark:text-zinc-700 stroke-1" />
              <p className="text-sm">Select an incident to view details</p>
            </div>
          )}
        </main>

        {/* ════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN – AI Co-Pilot & Insights           */}
        {/* ════════════════════════════════════════════════ */}
        <aside className="w-80 shrink-0 flex flex-col overflow-hidden bg-white dark:bg-[#09090b]">
          {selected ? (
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">

              {/* ── Sentiment Indicator ── */}
              <div className="p-4 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Customer Sentiment</p>
                <div className="flex items-center space-x-2">
                  <SentiIcon className={cn("w-5 h-5 shrink-0", senti?.color)} />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{senti?.label}</p>
                    <p className="text-[11px] text-zinc-500">{selected.sentiment}</p>
                  </div>
                </div>
                {sentimentIcon(selected.sentiment).icon === Frown && (
                  <div className="flex items-start space-x-1.5 p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[11px] text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>High frustration detected. Consider priority escalation and immediate response.</span>
                  </div>
                )}
              </div>

              {/* ── SLA Countdown ── */}
              <div className="p-4 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">SLA Resolution Window</p>
                <div className="flex items-center justify-between p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center space-x-1.5 text-xs">
                    <Timer className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatSlaTarget(selected.priority)}</span>
                  </div>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold border", priorityClass(selected.priority))}>
                    {selected.priority}
                  </span>
                </div>
              </div>

              {/* ── AI Co-Pilot ── */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">AI Co-Pilot</p>
                  </div>
                  {suggestionSource && (
                    <span className="text-[10px] text-zinc-400 italic">{suggestionSource === "openai" ? "GPT-4o-mini" : "Heuristic"}</span>
                  )}
                </div>

                {/* AI Summary */}
                <div className="p-2.5 rounded bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40">
                  <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">AI Summary</p>
                  <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-mono leading-relaxed">{selected.summary}</p>
                </div>

                {/* Generate Button */}
                {!suggestion && (
                  <button
                    onClick={handleGenerate}
                    disabled={copilotLoading}
                    className="w-full py-2 px-3 rounded bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center justify-center space-x-2 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {copilotLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Generating Draft...</span></>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /><span>Generate Suggested Response</span></>
                    )}
                  </button>
                )}

                {/* Suggested Response */}
                {suggestion && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Draft Response</p>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={handleCopy}
                          className="flex items-center space-x-1 text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Clipboard className="w-3 h-3" />}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                          onClick={handleGenerate}
                          className="flex items-center space-x-1 text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors ml-2 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Regenerate</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="w-full p-2.5 rounded border border-violet-200 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/10 text-[11px] text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed resize-none focus:outline-none focus:border-violet-400 dark:focus:border-violet-700"
                      rows={10}
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* ── Quick Context ── */}
              <div className="p-4 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Routing Context</p>
                <dl className="space-y-1.5 text-xs">
                  {[
                    { label: "Category", value: selected.category },
                    { label: "Department", value: selected.department },
                    { label: "Engineer", value: selected.assignedAgent?.name ?? "Unassigned" },
                    { label: "Created", value: new Date(selected.createdAt).toLocaleDateString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start gap-2">
                      <dt className="text-zinc-500 shrink-0">{label}</dt>
                      <dd className="font-medium text-zinc-900 dark:text-zinc-100 text-right truncate">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-6 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-zinc-300 dark:text-zinc-700 stroke-1" />
              <p className="text-xs">Select an incident to activate the AI Co-Pilot</p>
            </div>
          )}
        </aside>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <NewTicketModal onClose={() => setShowNewModal(false)} onCreated={onNewTicketCreated} />
      )}
    </div>
  );
}
