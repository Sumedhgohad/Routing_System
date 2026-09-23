import OpenAI from "openai";

export interface TicketAnalysis {
  category: string;
  priority: string;
  sentiment: string;
  summary: string;
  department: string;
}

let cachedOpenAI: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!cachedOpenAI) {
    cachedOpenAI = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return cachedOpenAI;
}

/**
 * Fallback heuristic analysis used if OpenAI API key is missing or API errors occur.
 * Ensures the system remains operational for testing and offline demos.
 */
export function fallbackAnalysis(description: string): TicketAnalysis {
  const lower = description.toLowerCase();

  let category = "General Support";
  let department = "Customer Support";
  let priority = "Medium";
  let sentiment = "Neutral";

  if (
    lower.includes("paid") ||
    lower.includes("payment") ||
    lower.includes("charge") ||
    lower.includes("refund") ||
    lower.includes("billing") ||
    lower.includes("upi")
  ) {
    category = "Billing & Payments";
    department = "Finance/Billing";
    priority = "High";
  } else if (
    lower.includes("login") ||
    lower.includes("password") ||
    lower.includes("account") ||
    lower.includes("otp") ||
    lower.includes("auth")
  ) {
    category = "Account & Authentication";
    department = "Security/IT";
    priority = "High";
  } else if (
    lower.includes("delivery") ||
    lower.includes("shipping") ||
    lower.includes("tracking") ||
    lower.includes("delayed") ||
    lower.includes("courier")
  ) {
    category = "Shipping & Logistics";
    department = "Logistics/Operations";
    priority = "Medium";
  } else if (
    lower.includes("bug") ||
    lower.includes("error") ||
    lower.includes("crash") ||
    lower.includes("down") ||
    lower.includes("500") ||
    lower.includes("failed")
  ) {
    category = "Technical Issue";
    department = "Engineering/Support";
    priority = "Critical";
  }

  if (
    lower.includes("angry") ||
    lower.includes("frustrated") ||
    lower.includes("horrible") ||
    lower.includes("terrible") ||
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("immediately")
  ) {
    sentiment = "Frustrated/Urgent";
    if (priority === "Medium") priority = "High";
  } else if (lower.includes("please") || lower.includes("thank") || lower.includes("kindly")) {
    sentiment = "Calm/Polite";
  }

  const summary = description.length > 100 ? `${description.slice(0, 97)}...` : description;

  return {
    category,
    priority,
    sentiment,
    summary,
    department,
  };
}

/**
 * Analyzes ticket content using OpenAI LLM with structured JSON output.
 * @param ticketDescription - The raw customer complaint or issue text.
 * @returns Promise<TicketAnalysis>
 */
export async function analyzeTicket(ticketDescription: string): Promise<TicketAnalysis> {
  if (!ticketDescription || typeof ticketDescription !== "string" || !ticketDescription.trim()) {
    throw new Error("Ticket description cannot be empty.");
  }

  const client = getOpenAIClient();

  // If no OpenAI API key is configured, log warning and use smart fallback
  if (!client) {
    console.warn("[aiService] OPENAI_API_KEY not configured. Utilizing fallback ticket analysis.");
    return fallbackAnalysis(ticketDescription);
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert Support Analyst. Analyze tickets and return ONLY valid JSON with keys: category, priority, sentiment, summary, department.",
        },
        {
          role: "user",
          content: ticketDescription.trim(),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const choice = response.choices[0];
    const content = choice?.message?.content;

    if (!content) {
      throw new Error("Empty response received from OpenAI API.");
    }

    const parsedData = JSON.parse(content) as TicketAnalysis;

    // Validate structure of parsed JSON
    if (
      !parsedData.category ||
      !parsedData.priority ||
      !parsedData.sentiment ||
      !parsedData.summary ||
      !parsedData.department
    ) {
      throw new Error("OpenAI response was missing required ticket analysis keys.");
    }

    return {
      category: String(parsedData.category),
      priority: String(parsedData.priority),
      sentiment: String(parsedData.sentiment),
      summary: String(parsedData.summary),
      department: String(parsedData.department),
    };
  } catch (error: unknown) {
    console.error("[aiService] Error during OpenAI ticket analysis:", error);

    // If an OpenAI API error occurred (rate limit, invalid auth, network drop)
    if (error instanceof OpenAI.APIError) {
      console.warn(`[aiService] OpenAI API Error [${error.status}]: ${error.message}. Switching to fallback.`);
      return fallbackAnalysis(ticketDescription);
    }

    // If parsing or other unexpected error, attempt fallback or rethrow
    if (error instanceof SyntaxError) {
      console.warn("[aiService] Failed to parse JSON response from OpenAI. Switching to fallback.");
      return fallbackAnalysis(ticketDescription);
    }

    // Re-throw if it's already an explicit descriptive error and not an external network/API failure
    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze ticket with AI service."
    );
  }
}
