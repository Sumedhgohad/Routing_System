# Smart Issue Routing & AI Support Operations Platform

## Project Overview & Positioning
The **Smart Issue Routing & AI Support Operations Platform** is an enterprise-grade incident management and automated routing system inspired by ServiceNow Incident Intelligence and Zendesk AI Copilot.

Rather than a basic CRUD ticketing system, this platform operates as an **Autonomous AI Dispatcher & Agent Copilot** designed to handle high ticket volume with multi-factor routing, real-time SLA breach predictions, semantic duplicate detection, and automated root-cause clustering.

---

## What Makes This Stand Out for Evaluations & Interviews
1. **Explainable AI Routing**: The system doesn't just route blindly; it generates an audit trail explaining *why* it routed a ticket (e.g., *"Matched 98% Billing category; assigned to Agent Priya due to Stripe specialization and low queue load of 2 active tickets"*).
2. **Semantic Similarity & Duplicate Detection**: Uses vector embeddings to detect duplicate complaints (e.g., payment gateway downtime) and suggest solutions from resolved past incidents.
3. **Multi-Objective Assignment Engine**: Balances expertise, current active ticket load, work shift availability, and SLA urgency.
4. **AI Agent Copilot**: Generates contextual draft replies with tone adjustment (empathetic, professional, technical) and citations to knowledge base articles.
5. **Real-Time SLA & Escalation Risk Scoring**: Dynamic score predicting breach likelihood based on age, priority, sentiment, and agent response patterns.
6. **Dual-Mode AI Engine (OpenAI + Intelligent Fallback)**: Zero-friction presentation mode where the system works with live OpenAI API keys or falls back to an offline rule-based NLP simulation without crashing during live demos.
7. **One-Click Demo Seeder**: Populates realistic enterprise customer complaints (e.g., payment pending, double charge, app crash, delivery delay) to make the live demo look instantly production-grade.

---

## Architecture & Technology Stack

```
[ Customer Portal / Ticket Submission ]   <--->   [ Support Agent Copilot & Manager BI ]
                                 │
                                 ▼
                     Next.js 14+ (App Router)
                  TypeScript • Modern Responsive UI
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
[ Next.js API Routes ]    [ Prisma ORM ]           [ AI Pipeline ]
  • JWT Auth & RBAC         • PostgreSQL / SQLite    • Classification & Priority
  • Ticket State Machine    • Tickets, Users, Logs   • Sentiment Analysis
  • Workload Dispatcher     • Vector Embeddings      • Semantic Similarity
                                                     • Agent Copilot Response
```

- **Frontend & App Framework**: Next.js (App Router), TypeScript, Tailwind CSS with sleek modern enterprise styling (dark/light mode, glassmorphism, responsive data tables, Recharts visualizations).
- **Backend**: Next.js Server Actions & API Routes (modular Node.js architecture).
- **Database & ORM**: PostgreSQL with Prisma ORM (configured to support easy local SQLite toggle for zero-config evaluation or PostgreSQL with pgvector for production).
- **AI & NLP Engine**:
  - OpenAI API (`gpt-4o-mini` for categorization, summarization, copilot draft responses).
  - Embeddings (`text-embedding-3-small`) for duplicate detection & similar ticket retrieval.
  - Smart Mock Fallback Engine (allows full offline demonstration if OpenAI quota is unavailable).
- **Authentication & RBAC**:
  - Roles: `ADMIN` (configuration, SLA rules, department management), `MANAGER` (analytics, routing rules, team workload), `AGENT` (ticket resolution, copilot drafts, queue), `CUSTOMER` (ticket submission, tracking).

---

## Core Proposed Features & Modules

### 1. Ticket Ingestion & AI Analysis Pipeline
- **Auto-Categorization**: Predicts category (Billing, Tech Support, Logistics, Authentication, Returns).
- **Priority & Urgency Matrix**: Computes priority (P1 - Critical to P4 - Low) based on impact and sentiment.
- **Sentiment & Frustration Detector**: Flags angry/urgent customers to bump priority and alert leads.
- **Auto-Summarization**: Produces a one-sentence TL;DR for quick triage.

### 2. Intelligent Routing & Dispatch Engine
- **Workload Balancing**: Distributes tickets to prevent agent burnout (caps at max concurrent tickets).
- **Skill-Based Routing**: Matches ticket tags/category with agent skills and past resolution history.
- **Audit Log / Routing Explanation**: Stores explicit rationale for why the agent was selected.

### 3. Agent Copilot & Knowledge Assist
- **AI Draft Responses**: One-click reply generation based on issue context and resolution notes.
- **Similar Ticket Lookup**: Shows top 3 past resolved tickets with their actual solutions.
- **Knowledge Base Integration**: Suggests public articles that could resolve customer queries automatically.

### 4. Duplicate & Incident Cluster Detection
- **Duplicate Merging**: Links identical user reports to a primary incident ticket.
- **Root Cause Spike Alert**: Detects when >5 tickets within 30 minutes share keywords (e.g., "Gateway 504").

### 5. SLA Tracking & Manager Analytics Dashboard
- **Countdown Timers & SLA Breach Gauge**: Visual warnings before SLA deadline is missed.
- **Manager KPI Cards**: MTTR (Mean Time to Resolution), First Contact Resolution rate, SLA compliance %, Agent workload distribution chart.

---

## User Review Required

> [!IMPORTANT]
> **Database Choice for Initial Setup**:
> We recommend starting with **Prisma + SQLite** (or local PostgreSQL via Docker). SQLite requires zero external database installation, meaning you can test, run, and demonstrate the entire project immediately on your machine without configuring a cloud database. It can be switched to PostgreSQL anytime by changing one line in `schema.prisma`.

> [!NOTE]
> **OpenAI API Key & Demo Mode**:
> The system will include an **OpenAI API integration** with a **Smart Simulated Fallback**. If you enter an OpenAI API key in `.env`, it will query live GPT models. If no key is provided, the mock engine provides realistic AI classifications and embeddings automatically, ensuring you never run into demo failures during evaluations.

---

## Phased Implementation Plan

### Phase 1: Project Scaffolding & Database Schema
- Initialize Next.js project with TypeScript, Prisma, and UI components.
- Define Prisma schema for `User`, `Department`, `Ticket`, `AuditLog`, `KnowledgeBase`, `TicketComment`.
- Setup seed script with realistic initial users (Admin, Support Agents, Managers) and departments.

### Phase 2: AI Dispatch & Processing Engine
- Implement ticket analysis service (category, priority, sentiment, summary, tags).
- Implement similarity matcher using cosine similarity (or pgvector).
- Implement the multi-factor agent routing algorithm with explainable logs.

### Phase 3: Core Dashboards & RBAC
- **Customer View**: Submit issue, view ticket history, real-time status tracker (Timeline stepper: Received -> Analyzed -> In Progress -> Resolved).
- **Agent Copilot View**: Active ticket queue, AI draft generator, similar ticket suggestions, resolution modal.
- **Manager / Admin BI View**: Real-time KPI metrics, SLA countdowns, department workload charts, team performance.

### Phase 4: Verification & Demo Seeder
- 1-Click "Seed 25 Demo Incidents" feature in Admin panel for instant presentations.
- Test routing logic, SLA triggers, and draft response workflows.

---

## Verification Plan

### Automated & Unit Checks
- Run Prisma migrations and seed validation.
- Verify routing algorithm test cases (workload limits, skill match, fallback agent).

### Manual Demo Walkthrough
1. **Submit Ticket as Customer**: Submit a payment failure ticket.
2. **Inspect AI Processing**: Confirm AI predicts "Billing", "High Priority", "Frustrated Sentiment", and assigns to appropriate billing agent.
3. **Agent Resolution**: Log in as the assigned agent, view similar resolved tickets, generate AI draft response, resolve ticket.
4. **Manager Dashboard**: Verify SLA compliance charts and ticket status transitions update accurately.
