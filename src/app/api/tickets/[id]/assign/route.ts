import { NextRequest, NextResponse } from "next/server";
import { assignAgent, manualReassignAgent } from "@/services/routingService";
import { prisma } from "@/lib/prisma";

// Fallback agent registry – mirrors the demo agents in page.tsx
// Used when the DB is reachable but the fallback IDs aren't seeded yet.
const FALLBACK_AGENT_REGISTRY: Record<
  string,
  { id: string; name: string; email: string; department: string }
> = {
  "agent-fin-01": {
    id: "agent-fin-01",
    name: "Priya Sharma",
    email: "priya.sharma@dispatch.internal",
    department: "Finance/Billing",
  },
  "agent-sec-01": {
    id: "agent-sec-01",
    name: "Marcus Vance",
    email: "marcus.vance@dispatch.internal",
    department: "Security/IT",
  },
  "agent-log-01": {
    id: "agent-log-01",
    name: "David Chen",
    email: "david.chen@dispatch.internal",
    department: "Logistics/Operations",
  },
  "agent-eng-01": {
    id: "agent-eng-01",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@dispatch.internal",
    department: "Engineering/Support",
  },
  "agent-gen-01": {
    id: "agent-gen-01",
    name: "Alex Morgan",
    email: "alex.morgan@dispatch.internal",
    department: "Customer Support",
  },
};

/**
 * Ensures a demo fallback agent exists in the DB, upserting if necessary.
 * Allows the PATCH route to succeed even when the agents table is unseeded.
 */
async function upsertFallbackAgent(agentId: string) {
  const fallback = FALLBACK_AGENT_REGISTRY[agentId];
  if (!fallback) return null;

  return prisma.supportAgent.upsert({
    where: { id: agentId },
    update: {},
    create: {
      id: fallback.id,
      name: fallback.name,
      email: fallback.email,
      department: fallback.department,
      isActive: true,
    },
  });
}

/**
 * PATCH /api/tickets/:id/assign
 * Allows a manager to manually re-assign a ticket to a specific agent by ID,
 * or trigger workload re-assignment to an alternative department.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const agentId = body.agentId || body.assignedAgentId;
    const department = body.department;

    if (!agentId && !department) {
      return NextResponse.json(
        {
          error:
            "Missing assignment parameter. Please supply either 'agentId' for direct manager assignment or 'department' for automated workload dispatch.",
        },
        { status: 400 }
      );
    }

    // 1. Direct manager override by agent ID
    if (agentId) {
      try {
        // Ensure the fallback agent exists in the DB before attempting assignment
        await upsertFallbackAgent(agentId);

        const updatedTicket = await manualReassignAgent(id, agentId);
        return NextResponse.json({
          message: "Ticket successfully reassigned to agent.",
          ticket: updatedTicket,
        });
      } catch (manualErr: unknown) {
        // DB unreachable – return a success-shaped response using in-memory state
        // so the UI still reflects the reassignment during offline/demo operation.
        const fallback = FALLBACK_AGENT_REGISTRY[agentId];
        if (fallback) {
          console.warn(
            "[PATCH assign] DB unavailable; returning in-memory reassignment response.",
            manualErr instanceof Error ? manualErr.message : ""
          );
          return NextResponse.json({
            message: "Ticket reassigned (session-scoped; update DATABASE_URL to persist).",
            ticket: {
              id,
              assignedAgentId: agentId,
              assignedAgent: fallback,
            },
          });
        }

        return NextResponse.json(
          {
            error: "Failed to manually assign agent.",
            details: manualErr instanceof Error ? manualErr.message : "Unknown error",
          },
          { status: 404 }
        );
      }
    }

    // 2. Department-based automated workload re-assignment
    if (department) {
      try {
        const updatedTicket = await assignAgent(id, department);
        if (!updatedTicket) {
          return NextResponse.json(
            { error: `No active agents available in department "${department}".` },
            { status: 404 }
          );
        }
        return NextResponse.json({
          message: `Ticket successfully re-routed to department '${department}'.`,
          ticket: updatedTicket,
        });
      } catch (routingErr: unknown) {
        return NextResponse.json(
          {
            error: `Agent routing failed for department "${department}".`,
            details: routingErr instanceof Error ? routingErr.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  } catch (error: unknown) {
    console.error("[PATCH /api/tickets/:id/assign] Internal error:", error);
    return NextResponse.json(
      {
        error: "Internal server error occurred while reassigning ticket.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tickets/:id/assign
 * Alias to support standard POST for manual/workload reassignment.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}
