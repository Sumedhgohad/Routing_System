"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  KeyRound,
  Truck,
  AlertOctagon,
  Inbox,
  Filter,
  CheckCircle,
  Clock,
  Building,
  ShieldAlert,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Layers,
  ArrowRight,
  User,
  UserCheck,
  Check,
  Timer,
} from "lucide-react";

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
  assignedAgent?: {
    id: string;
    name: string;
    department: string;
  } | null;
  createdAt: string | Date;
}

const TEMPLATES = [
  {
    title: "Payment Settlement Pending",
    icon: CreditCard,
    text: "Customer charged via bank transfer (Ref #TXN-90214). Transaction completed on bank side but order status remains 'Payment Pending' for 4 hours.",
  },
  {
    title: "SSO / OTP Authentication Stall",
    icon: KeyRound,
    text: "User locked out after corporate domain password reset. One-time passcode is not being dispatched to registered phone number or backup email.",
  },
  {
    title: "Logistics Delivery Exception",
    icon: Truck,
    text: "Package for Order #88194 marked as 'Delivered' in regional hub tracking, but consignee confirms non-receipt at destination address.",
  },
  {
    title: "Checkout 500 Gateway Timeout",
    icon: AlertOctagon,
    text: "Intermittent HTTP 500 / 504 Gateway Timeout observed on checkout API endpoint during peak traffic. Mobile client fails to complete session.",
  },
];

const AVAILABLE_ENGINEERS = [
  { id: "agent-fin-01", name: "Priya Sharma", department: "Finance/Billing" },
  { id: "agent-sec-01", name: "Marcus Vance", department: "Security/IT" },
  { id: "agent-log-01", name: "David Chen", department: "Logistics/Operations" },
  { id: "agent-eng-01", name: "Sarah Jenkins", department: "Engineering/Support" },
  { id: "agent-gen-01", name: "Alex Morgan", department: "Customer Support" },
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [customerEmail, setCustomerEmail] = useState("support.user@enterprise.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeDepartmentFilter, setActiveDepartmentFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/tickets");
      if (res.ok) {
        const data: Ticket[] = await res.json();
        setTickets(data);
        if (data.length > 0 && !selectedTicket) {
          setSelectedTicket(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || loading) return;

    setLoading(true);
    setError(null);
    setReassignSuccess(null);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketDescription: description.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process ticket");
      }

      setSelectedTicket(data);
      setDescription("");
      await fetchTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error processing ticket");
    } finally {
      setLoading(false);
    }
  };

  // Manager Manual Reassignment via PATCH /api/tickets/:id/assign
  const handleManualReassign = async (agentId: string) => {
    if (!selectedTicket || !agentId || reassigning) return;

    setReassigning(true);
    setReassignSuccess(null);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reassign agent");
      }

      const updatedAgent = AVAILABLE_ENGINEERS.find((a) => a.id === agentId);
      const updatedTicket: Ticket = {
        ...selectedTicket,
        assignedAgentId: agentId,
        assignedAgent: updatedAgent || selectedTicket.assignedAgent,
      };

      setSelectedTicket(updatedTicket);
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
      );
      setReassignSuccess(`Reassigned to ${updatedAgent?.name || "new agent"}`);
      setTimeout(() => setReassignSuccess(null), 3000);
    } catch (err) {
      console.error("Manual reassignment failed:", err);
      setError(err instanceof Error ? err.message : "Reassignment failed");
    } finally {
      setReassigning(false);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p.includes("crit") || p.includes("p1")) {
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50";
    }
    if (p.includes("high") || p.includes("p2")) {
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
    }
    if (p.includes("med") || p.includes("p3")) {
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50";
    }
    return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  };

  const getSentimentBadgeClass = (sentiment: string) => {
    const s = (sentiment || "").toLowerCase();
    if (s.includes("frustrat") || s.includes("angry") || s.includes("urgent")) {
      return "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/40";
    }
    if (s.includes("calm") || s.includes("positive") || s.includes("polite")) {
      return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/40";
    }
    return "text-zinc-700 bg-zinc-100 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700";
  };

  const formatSlaTarget = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p.includes("crit") || p.includes("p1") || p.includes("urgent")) return "1 Hour (P1)";
    if (p.includes("high") || p.includes("p2")) return "4 Hours (P2)";
    if (p.includes("med") || p.includes("p3")) return "8 Hours (P3)";
    return "24 Hours (P4)";
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesDept =
      activeDepartmentFilter === "ALL" ||
      t.department.toLowerCase().includes(activeDepartmentFilter.toLowerCase());

    const matchesSearch =
      !searchQuery ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDept && matchesSearch;
  });

  const highPriorityCount = tickets.filter((t) => {
    const p = (t.priority || "").toLowerCase();
    return p.includes("high") || p.includes("crit");
  }).length;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans antialiased flex flex-col">
      {/* Top Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-semibold text-xs tracking-wider">
                DI
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                  DispatchOps
                </span>
                <span className="text-zinc-400 dark:text-zinc-500 text-xs hidden sm:inline">
                  / Automated Assignment & SLA Engine
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                SLA Routing Active
              </span>
              <span className="text-zinc-400 dark:text-zinc-600">&bull;</span>
              <span>Model: gpt-4o-mini</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden lg:flex items-center space-x-4 text-zinc-500 dark:text-zinc-400 mr-2">
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{tickets.length}</span>{" "}
                <span>Total Ingested</span>
              </div>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{highPriorityCount}</span>{" "}
                <span>High SLA Queue</span>
              </div>
            </div>

            <button
              onClick={fetchTickets}
              disabled={isRefreshing}
              className="inline-flex items-center px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-zinc-500 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Workspace Split: Ingestion Form (Left) & Triage Inspector (Right) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Ticket Ingestion */}
          <div className="lg:col-span-6 bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Log Inbound Incident
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                New incidents are analyzed, given an SLA deadline, and automatically assigned to the least-loaded engineer.
              </p>
            </div>

            {/* Template Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Preset Test Scenarios
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEMPLATES.map((tmpl, index) => {
                  const Icon = tmpl.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setDescription(tmpl.text)}
                      className="text-left p-2.5 rounded border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50 transition-all text-xs group cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 text-zinc-700 dark:text-zinc-300 font-medium group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                        <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{tmpl.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ticket Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Customer Account
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <User className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                    placeholder="customer@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Issue Description
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Paste or type raw customer complaint..."
                  className="w-full p-3 text-xs leading-relaxed bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none font-sans"
                  required
                />
              </div>

              {error && (
                <div className="p-2.5 rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="w-full py-2 px-3 rounded bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing, Calculating SLA & Assigning...</span>
                  </>
                ) : (
                  <>
                    <span>Classify, Enforce SLA & Route Incident</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: AI Triage & Routing Inspector */}
          <div className="lg:col-span-6 bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Triage & Routing Inspector
                  </span>
                </div>
                {selectedTicket && (
                  <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    ID: {selectedTicket.id.slice(0, 13)}
                  </span>
                )}
              </div>

              {selectedTicket ? (
                <div className="mt-4 space-y-4">
                  {/* Summary / Original Snippet */}
                  <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/70 dark:border-zinc-800/80">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
                      Raw Inbound Text
                    </span>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed italic">
                      &ldquo;{selectedTicket.description}&rdquo;
                    </p>
                  </div>

                  {/* Metadata Classification Attributes */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <span className="text-[11px] text-zinc-500 block mb-1">Predicted Category</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                        {selectedTicket.category}
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <span className="text-[11px] text-zinc-500 block mb-1">Target Department</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                        {selectedTicket.department}
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <span className="text-[11px] text-zinc-500 block mb-1">Priority Tier</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getPriorityBadgeClass(
                          selectedTicket.priority
                        )}`}
                      >
                        {selectedTicket.priority}
                      </span>
                    </div>

                    {/* SLA Target Deadline */}
                    <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <span className="text-[11px] text-zinc-500 block mb-1">SLA Resolution Target</span>
                      <div className="flex items-center space-x-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                        <Timer className="w-3.5 h-3.5 text-amber-500" />
                        <span>{formatSlaTarget(selectedTicket.priority)}</span>
                      </div>
                    </div>

                    {/* Assigned Support Agent */}
                    <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-zinc-500">Assigned Support Engineer</span>
                        {reassignSuccess && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {reassignSuccess}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{selectedTicket.assignedAgent?.name || "Auto-assigning least-loaded agent..."}</span>
                          {selectedTicket.assignedAgent?.department && (
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded ml-1">
                              {selectedTicket.assignedAgent.department}
                            </span>
                          )}
                        </span>

                        {/* Manager Override Reassignment Control */}
                        <div className="flex items-center space-x-1.5">
                          <label className="text-[10px] text-zinc-400 uppercase tracking-wider shrink-0">
                            Reassign:
                          </label>
                          <select
                            disabled={reassigning}
                            value={selectedTicket.assignedAgentId || ""}
                            onChange={(e) => handleManualReassign(e.target.value)}
                            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 cursor-pointer"
                          >
                            <option value="" disabled>
                              Select engineer...
                            </option>
                            {AVAILABLE_ENGINEERS.map((eng) => (
                              <option key={eng.id} value={eng.id}>
                                {eng.name} ({eng.department})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <span className="text-[11px] text-zinc-500 block mb-1 font-medium">
                      Executive Summary
                    </span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono leading-relaxed">
                      {selectedTicket.summary}
                    </p>
                  </div>

                  {/* Technical Routing Log */}
                  <div className="p-2.5 rounded bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 space-y-1">
                    <div className="flex items-center text-zinc-900 dark:text-zinc-200 font-semibold">
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                      <span>Audit: SLA & Workload Dispatch Recorded</span>
                    </div>
                    <p className="pl-5 leading-normal">
                      Assigned to {selectedTicket.assignedAgent ? selectedTicket.assignedAgent.name : "Queue"} with SLA target {formatSlaTarget(selectedTicket.priority)}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-700 stroke-1" />
                  <p>Select a ticket from the queue or submit an incident to inspect triage output.</p>
                </div>
              )}
            </div>

            {selectedTicket && (
              <div className="pt-3 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Lifecycle Status: <strong className="text-zinc-700 dark:text-zinc-300">{selectedTicket.status}</strong></span>
                <span>Ingested: {new Date(selectedTicket.createdAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </section>

        {/* Bottom Section: Operations Queue Table */}
        <section className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Incident Dispatch Queue
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                All tickets persisted with AI classifications, SLA deadlines, and manager re-assignment support.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Department Filter Tabs */}
              <div className="flex items-center space-x-1 p-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                {["ALL", "Finance", "Security", "Logistics", "Engineering"].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setActiveDepartmentFilter(dept)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      activeDepartmentFilter === dept
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* Incident Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Incident</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium">Queue</th>
                  <th className="py-2.5 px-3 font-medium">Assigned Engineer</th>
                  <th className="py-2.5 px-3 font-medium">SLA Target</th>
                  <th className="py-2.5 px-3 font-medium">Priority</th>
                  <th className="py-2.5 px-3 font-medium">Sentiment</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                      selectedTicket?.id === t.id ? "bg-zinc-50 dark:bg-zinc-800/60" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 max-w-xs truncate">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {t.summary}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-400 truncate">
                        {t.id}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{t.category}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-200">
                      {t.department}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {t.assignedAgent ? (
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {t.assignedAgent.name}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-zinc-600 dark:text-zinc-300 font-mono text-[11px] flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-500 inline mr-1" />
                        {formatSlaTarget(t.priority)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityBadgeClass(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${getSentimentBadgeClass(
                          t.sentiment
                        )}`}
                      >
                        {t.sentiment}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-[11px] font-mono text-zinc-500 uppercase">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-right">
                      <span className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center text-[11px]">
                        Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-400 text-xs">
                      No incident records matching the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-4 px-6 text-center text-[11px] text-zinc-500 bg-white dark:bg-[#09090b]">
        DispatchOps Incident Intelligence &bull; SLA-Enforced Automated Routing Engine &bull; Next.js 16 &bull; Prisma ORM
      </footer>
    </div>
  );
}
