import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function fallbackSuggestion(
  category: string,
  department: string,
  summary: string,
  sentiment: string
): string {
  const isUrgent =
    sentiment.toLowerCase().includes("frustrat") ||
    sentiment.toLowerCase().includes("urgent") ||
    sentiment.toLowerCase().includes("angry");

  const greeting = isUrgent
    ? "Thank you for reaching out, and I sincerely apologize for the inconvenience this has caused you."
    : "Thank you for contacting our support team.";

  return `Dear Customer,

${greeting}

I have reviewed your request regarding: "${summary}"

Our ${department} team has been notified and is actively working on this issue. Based on the nature of your complaint (${category}), we expect to have a resolution for you within the SLA timeframe committed at ticket creation.

In the meantime, if you require immediate assistance or have any additional information to share, please do not hesitate to reply to this message. Our team is monitoring this ticket and will keep you updated as progress is made.

We appreciate your patience and understanding.

Kind regards,
${department} Support Team`;
}

/**
 * POST /api/tickets/:id/suggest
 * Generates an AI-drafted support reply based on ticket metadata.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { description, category, department, sentiment, summary, priority } = body;

    if (!description && !summary) {
      return NextResponse.json(
        { error: "Ticket description or summary is required to generate a response." },
        { status: 400 }
      );
    }

    const client = getClient();

    if (!client) {
      // Return a high-quality heuristic response if no API key configured
      const suggestion = fallbackSuggestion(
        category || "general",
        department || "Support",
        summary || description,
        sentiment || "Neutral"
      );
      return NextResponse.json({
        suggestion,
        source: "fallback",
        ticketId: id,
      });
    }

    const isUrgent =
      (sentiment || "").toLowerCase().includes("frustrat") ||
      (sentiment || "").toLowerCase().includes("urgent") ||
      (sentiment || "").toLowerCase().includes("angry");

    const systemPrompt = `You are an expert customer support agent at a large enterprise.
Your task is to draft a professional, empathetic, and concise reply to a customer support ticket.
Guidelines:
- Be professional and empathetic${isUrgent ? ", especially since the customer appears frustrated or upset" : ""}.
- Acknowledge the issue clearly.
- Explain that the team is working on it.
- Provide reassurance about resolution within the SLA.
- Keep it under 150 words.
- Do NOT make up specific resolution steps or ETAs not provided.
- Sign off from the '${department || "Support"}' team.`;

    const userPrompt = `Ticket Details:
Category: ${category || "Not specified"}
Department: ${department || "Support"}
Priority: ${priority || "Medium"}
Sentiment: ${sentiment || "Neutral"}
AI Summary: ${summary || ""}
Customer Original Message: "${description}"

Draft a reply to this customer.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    const suggestion = response.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      suggestion,
      source: "openai",
      ticketId: id,
    });
  } catch (error: unknown) {
    console.error("[POST /api/tickets/:id/suggest] Error:", error);

    if (error instanceof OpenAI.APIError) {
      const body = await (request.json().catch(() => ({}))) as Record<string, string>;
      const fallback = fallbackSuggestion(
        body.category || "general",
        body.department || "Support",
        body.summary || body.description || "",
        body.sentiment || "Neutral"
      );
      return NextResponse.json({ suggestion: fallback, source: "fallback" });
    }

    return NextResponse.json(
      { error: "Failed to generate suggested response." },
      { status: 500 }
    );
  }
}
