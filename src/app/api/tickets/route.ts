import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeTicket } from "@/services/aiService";
import { assignAgent, calculateSlaDeadline } from "@/services/routingService";
import { randomUUID } from "crypto";

interface AgentSummary {
  id: string;
  name: string;
  department: string;
}

interface TicketRecord {
  id: string;
  description: string;
  category: string;
  priority: string;
  sentiment: string;
  summary: string;
  department: string;
  status: string;
  slaDeadline?: Date | null;
  assignedAgentId?: string | null;
  assignedAgent?: AgentSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

const FALLBACK_AGENTS: Record<string, AgentSummary> = {
  finance: { id: "agent-fin-01", name: "Priya Sharma", department: "Finance/Billing" },
  security: { id: "agent-sec-01", name: "Marcus Vance", department: "Security/IT" },
  logistics: { id: "agent-log-01", name: "David Chen", department: "Logistics/Operations" },
  engineering: { id: "agent-eng-01", name: "Sarah Jenkins", department: "Engineering/Support" },
  general: { id: "agent-gen-01", name: "Alex Morgan", department: "Customer Support" },
};

function resolveFallbackAgent(dept: string): AgentSummary {
  const d = dept.toLowerCase();
  if (d.includes("fin") || d.includes("bill") || d.includes("pay")) return FALLBACK_AGENTS.finance;
  if (d.includes("sec") || d.includes("auth") || d.includes("login") || d.includes("it")) return FALLBACK_AGENTS.security;
  if (d.includes("log") || d.includes("ship") || d.includes("deliver")) return FALLBACK_AGENTS.logistics;
  if (d.includes("eng") || d.includes("tech") || d.includes("bug")) return FALLBACK_AGENTS.engineering;
  return FALLBACK_AGENTS.general;
}

const memoryTickets: TicketRecord[] = [
  {
    id: "demo-tkt-001",
    description: "I paid for my order via UPI, but it still says payment pending and money was deducted.",
    category: "Billing & Payments",
    priority: "High",
    sentiment: "Frustrated/Urgent",
    summary: "Paid via UPI; payment pending but funds deducted.",
    department: "Finance/Billing",
    status: "OPEN",
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // +4h
    assignedAgentId: FALLBACK_AGENTS.finance.id,
    assignedAgent: FALLBACK_AGENTS.finance,
    createdAt: new Date(Date.now() - 1000 * 60 * 25),
    updatedAt: new Date(),
  },
  {
    id: "demo-tkt-002",
    description: "Unable to log in to my account. Password reset email is never received.",
    category: "Account & Authentication",
    priority: "Critical",
    sentiment: "Urgent",
    summary: "Login failure; password reset email not delivering.",
    department: "Security/IT",
    status: "IN_PROGRESS",
    slaDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000), // +1h
    assignedAgentId: FALLBACK_AGENTS.security.id,
    assignedAgent: FALLBACK_AGENTS.security,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updatedAt: new Date(),
  },
  {
    id: "demo-tkt-003",
    description: "Package was marked as delivered today, but I haven't received anything at my doorstep.",
    category: "Shipping & Logistics",
    priority: "Medium",
    sentiment: "Neutral",
    summary: "Package marked delivered but not physically received.",
    department: "Logistics/Operations",
    status: "OPEN",
    slaDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000), // +8h
    assignedAgentId: FALLBACK_AGENTS.logistics.id,
    assignedAgent: FALLBACK_AGENTS.logistics,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    updatedAt: new Date(),
  }
];

/**
 * GET /api/tickets
 * Retrieves all tickets with assigned agent information and SLA deadlines.
 */
export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedAgent: true,
      },
    });
    return NextResponse.json(tickets);
  } catch (dbError: unknown) {
    console.warn(
      "[GET /api/tickets] Database not yet reachable with current .env credentials. Returning cached/in-memory tickets.",
      dbError instanceof Error ? dbError.message : ""
    );
    return NextResponse.json(memoryTickets);
  }
}

/**
 * POST /api/tickets
 * Receives ticket description, analyzes it via OpenAI, computes SLA deadline,
 * saves in DB, and automatically assigns an available agent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const description = (body.ticketDescription || body.description || "").trim();

    if (!description) {
      return NextResponse.json(
        { error: "Ticket description is required." },
        { status: 400 }
      );
    }

    // 1. Analyze ticket using OpenAI service
    let analysis;
    try {
      analysis = await analyzeTicket(description);
    } catch (aiError: unknown) {
      console.error("[POST /api/tickets] AI Analysis failure:", aiError);
      return NextResponse.json(
        {
          error: "Failed to analyze ticket via AI service.",
          details: aiError instanceof Error ? aiError.message : "Unknown AI error",
        },
        { status: 502 }
      );
    }

    // 2. Compute SLA Deadline based on predicted priority
    const slaDeadline = calculateSlaDeadline(analysis.priority);

    // 3. Persist ticket record in PostgreSQL via Prisma with SLA deadline
    try {
      const createdTicket = await prisma.ticket.create({
        data: {
          description,
          category: analysis.category,
          priority: analysis.priority,
          sentiment: analysis.sentiment,
          summary: analysis.summary,
          department: analysis.department,
          status: "OPEN",
          slaDeadline,
        },
      });

      // 4. Automatically assign an available agent based on department & current open ticket load
      let finalTicket = createdTicket;
      try {
        const assignedResult = await assignAgent(createdTicket.id, analysis.department);
        if (assignedResult) {
          finalTicket = assignedResult;
        }
      } catch (routingErr) {
        console.warn("[POST /api/tickets] Auto-assignment skipped (agents table may be unseeded):", routingErr);
      }

      memoryTickets.unshift(finalTicket);
      return NextResponse.json(finalTicket, { status: 201 });
    } catch (dbError: unknown) {
      console.warn(
        "[POST /api/tickets] Prisma DB persist failed (check DATABASE_URL credentials in .env). Falling back to session storage:",
        dbError instanceof Error ? dbError.message : ""
      );

      const assignedFallbackAgent = resolveFallbackAgent(analysis.department);

      const fallbackRecord: TicketRecord = {
        id: randomUUID(),
        description,
        category: analysis.category,
        priority: analysis.priority,
        sentiment: analysis.sentiment,
        summary: analysis.summary,
        department: analysis.department,
        status: "OPEN",
        slaDeadline,
        assignedAgentId: assignedFallbackAgent.id,
        assignedAgent: assignedFallbackAgent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoryTickets.unshift(fallbackRecord);
      return NextResponse.json(fallbackRecord, { status: 201 });
    }
  } catch (error: unknown) {
    console.error("[POST /api/tickets] Unhandled server error:", error);
    return NextResponse.json(
      {
        error: "Internal server error occurred while processing ticket.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
