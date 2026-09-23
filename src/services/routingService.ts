import { prisma } from "@/lib/prisma";

export interface SlaConfig {
  criticalHours: number;
  highHours: number;
  mediumHours: number;
  lowHours: number;
}

export const DEFAULT_SLA_CONFIG: SlaConfig = {
  criticalHours: 1, // Critical = 1 hour
  highHours: 4,     // High = 4 hours
  mediumHours: 8,   // Medium = 8 hours
  lowHours: 24,     // Low = 24 hours
};

/**
 * Calculates the SLA breach deadline based on ticket priority.
 * - Critical / Urgent: +1 hour
 * - High: +4 hours
 * - Medium: +8 hours
 * - Low: +24 hours
 */
export function calculateSlaDeadline(priority: string, fromDate: Date = new Date()): Date {
  const p = (priority || "").toLowerCase();
  let hours = DEFAULT_SLA_CONFIG.mediumHours;

  if (p.includes("crit") || p.includes("urgent") || p.includes("p1")) {
    hours = DEFAULT_SLA_CONFIG.criticalHours;
  } else if (p.includes("high") || p.includes("p2")) {
    hours = DEFAULT_SLA_CONFIG.highHours;
  } else if (p.includes("med") || p.includes("p3")) {
    hours = DEFAULT_SLA_CONFIG.mediumHours;
  } else if (p.includes("low") || p.includes("p4")) {
    hours = DEFAULT_SLA_CONFIG.lowHours;
  }

  return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Automated Agent Assignment Logic:
 * Queries active SupportAgent users in the matching department,
 * sorts them by current count of open tickets (least loaded first),
 * and updates ticket.assignedAgentId (and optionally slaDeadline).
 */
export async function assignAgent(ticketId: string, department: string, priority?: string) {
  if (!ticketId || !department) {
    throw new Error("Both ticketId and department are required to assign an agent.");
  }

  try {
    // 1. Query active support agents with their open tickets count
    const allActiveAgents = await prisma.supportAgent.findMany({
      where: {
        isActive: true,
      },
      include: {
        tickets: {
          where: {
            status: "OPEN",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (allActiveAgents.length === 0) {
      console.warn("[routingService] No active support agents found in database.");
      return null;
    }

    // 2. Filter agents matching the target department (with fuzzy keyword matching)
    const targetDept = department.toLowerCase().trim();
    const deptKeywords = targetDept.split(/[\s/,&]+/).filter(Boolean);

    let matchingAgents = allActiveAgents.filter((agent) => {
      const agentDept = agent.department.toLowerCase().trim();
      return (
        agentDept.includes(targetDept) ||
        targetDept.includes(agentDept) ||
        deptKeywords.some((keyword) => agentDept.includes(keyword))
      );
    });

    // Fall back to general pool if department specific pool is empty
    if (matchingAgents.length === 0) {
      console.warn(
        `[routingService] No active agent found matching department "${department}". Utilizing general agent pool.`
      );
      matchingAgents = allActiveAgents;
    }

    // 3. Sort agents by their current number of open tickets (ascending = least workload first)
    matchingAgents.sort((a, b) => a.tickets.length - b.tickets.length);

    const selectedAgent = matchingAgents[0];

    // Prepare update data
    const updateData: { assignedAgentId: string; slaDeadline?: Date } = {
      assignedAgentId: selectedAgent.id,
    };

    if (priority) {
      updateData.slaDeadline = calculateSlaDeadline(priority);
    }

    // 4. Update the ticket's assignedAgentId and optional SLA deadline
    const updatedTicket = await prisma.ticket.update({
      where: {
        id: ticketId,
      },
      data: updateData,
      include: {
        assignedAgent: true,
      },
    });

    console.log(
      `[routingService] Ticket ${ticketId} auto-assigned to Agent "${selectedAgent.name}" (${selectedAgent.department}) with ${selectedAgent.tickets.length} open tickets.`
    );

    return updatedTicket;
  } catch (error: unknown) {
    console.error(`[routingService] Error auto-assigning agent to ticket ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Manual Manager Override:
 * Allows a manager to manually reassign a ticket to a specific agent by ID.
 */
export async function manualReassignAgent(ticketId: string, agentId: string) {
  if (!ticketId || !agentId) {
    throw new Error("Both ticketId and agentId are required for manual re-assignment.");
  }

  try {
    // Verify agent exists and is active
    const agent = await prisma.supportAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error(`SupportAgent with ID ${agentId} not found.`);
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedAgentId: agentId,
      },
      include: {
        assignedAgent: true,
      },
    });

    console.log(
      `[routingService] Ticket ${ticketId} manually reassigned by manager to Agent "${agent.name}" (${agent.department}).`
    );

    return updatedTicket;
  } catch (error: unknown) {
    console.error(`[routingService] Error during manual re-assignment of ticket ${ticketId}:`, error);
    throw error;
  }
}
