export type ClaimType = "decision" | "dependency" | "risk" | "process";

export type Claim = {
  id: string;
  type: ClaimType;
  text: string;
  rationale?: string;
  source: string;
  confidence: number;
  interviewId: string;
  attributedTo?: string;
};

export type Question = {
  id: string;
  text: string;
  context: string;
  systemName: string;
};

export type ExtractedClaim = {
  id: string;
  type: ClaimType;
  summary: string;
  confidence: number;
  status: "confirmed" | "pending";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  citations?: Citation[];
  timestamp: Date;
};

export type Citation = {
  nodeId: string;
  type: ClaimType;
  label: string;
  detail: {
    claim: string;
    rationale?: string;
    confidence: number;
    source: string;
    capturedDate: string;
    attributedTo?: string;
    externalUrl?: string;
  };
};

export type KnowledgeSystem = {
  id: string;
  name: string;
  coveragePercent: number;
  ownerCount: number;
  lastUpdated: string;
  hasWarning: boolean;
};

export type BusFactorRisk = {
  engineerId: string;
  engineerName: string;
  soleExpertFor: string;
  tenure: string;
};

export type StaleKnowledge = {
  systemId: string;
  systemName: string;
  staleNodeCount: number;
  staleDays: number;
  trigger: string;
};

export type InterviewRecommendation = {
  engineerId: string;
  engineerName: string;
  trigger: string;
  systems: string[];
  action: "send" | "dismiss" | "priority";
};

export type ConnectionStatus = "connected" | "not_connected";

export type ConnectionTool = {
  id: string;
  name: string;
  description: string;
  status: ConnectionStatus;
  connectedCount?: number;
  connectedLabel?: string;
};

export type SyncStatus = {
  toolId: string;
  toolName: string;
  lastSynced: string;
  eventsProcessed: number;
};

export type EngineerProfile = {
  name: string;
  team: string;
  ringLevel: number;
  ringLabel: string;
  tenure: string;
  joinedDate: string;
  systems: { name: string; ownershipPercent: number; knowledgePercent: number }[];
  attributedKnowledge: { decisions: number; risks: number; dependencies: number };
  lastInterview: string;
  nextInterviewRecommended: string;
  privacy: {
    passiveCapture: boolean;
    allowInterviews: boolean;
    showAttribution: boolean;
  };
};

const CLAIMS: Claim[] = [
  {
    id: "clm_1",
    type: "decision",
    text: 'The payment service retries 3 times because the team decided bounded retries prevent cascading timeouts while still handling transient failures.',
    rationale: "After the Sept 12 incident, analysis showed that 5 retries caused 400ms+ cascading delays across the payment chain.",
    source: "Interview (Sept 15, 2025)",
    confidence: 0.82,
    interviewId: "int_1",
    attributedTo: "Engineer A",
  },
  {
    id: "clm_2",
    type: "dependency",
    text: "payment-service depends on Stripe API for all payment processing. No fallback provider exists.",
    source: 'PR #187 — "Add Stripe integration"',
    confidence: 0.91,
    interviewId: "int_1",
  },
  {
    id: "clm_3",
    type: "risk",
    text: "If Stripe experiences a sustained outage, the payment service has no circuit breaker and will queue jobs indefinitely.",
    source: "PR #203 — discussion thread",
    confidence: 0.65,
    interviewId: "int_1",
  },
  {
    id: "clm_4",
    type: "process",
    text: "All payment service deployments require sign-off from at least two team leads before merging to main.",
    source: "Interview (Sept 15, 2025)",
    confidence: 0.78,
    interviewId: "int_1",
    attributedTo: "Engineer A",
  },
  {
    id: "clm_5",
    type: "decision",
    text: "The auth service switched from JWT to session-based tokens to reduce token expiry issues in distributed environments.",
    source: 'PR #92 — "Migrate auth to sessions"',
    confidence: 0.88,
    interviewId: "int_1",
    attributedTo: "Engineer B",
  },
];

const QUESTIONS: Question[] = [
  {
    id: "q_1",
    text: "Why did the team choose 3 retries for the Stripe webhook instead of 5 or 1?",
    context: "This is about the payment-service, specifically the work you did in September 2025.",
    systemName: "payment-service",
  },
  {
    id: "q_2",
    text: "What happens when the Stripe API experiences a sustained outage? Is there a fallback or circuit breaker?",
    context: "Relating to the payment-service's resilience and error handling strategy.",
    systemName: "payment-service",
  },
  {
    id: "q_3",
    text: "How does the payment-service handle webhook delivery failures from Stripe?",
    context: "About the webhook retry logic and dead-letter queue in payment-service.",
    systemName: "payment-service",
  },
  {
    id: "q_4",
    text: "What is the deployment process for the payment-service? Who needs to approve changes?",
    context: "Relating to CI/CD pipeline and approval gates for payment-service.",
    systemName: "payment-service",
  },
  {
    id: "q_5",
    text: "How does the auth-service manage session tokens across multiple instances?",
    context: "About the session store and token rotation mechanism in auth-service.",
    systemName: "auth-service",
  },
  {
    id: "q_6",
    text: "What data does the user-mgmt service store, and are there any compliance concerns?",
    context: "Relating to PII handling and data retention in the user-mgmt service.",
    systemName: "user-mgmt",
  },
  {
    id: "q_7",
    text: "What happened during the Sept 12 payment incident? How was it resolved?",
    context: "About the production incident that led to the retry logic change.",
    systemName: "payment-service",
  },
  {
    id: "q_8",
    text: "How is the notification-service expected to scale under high load?",
    context: "About the scalability design and known bottlenecks in notification-svc.",
    systemName: "notification-svc",
  },
];

const EXTRACTED_CLAIMS: ExtractedClaim[] = [
  { id: "ec_1", type: "decision", summary: "Use 3 retries for Stripe webhook", confidence: 0.82, status: "confirmed" },
  { id: "ec_2", type: "process", summary: "Payment service uses bounded exponential backoff", confidence: 0.68, status: "pending" },
  { id: "ec_3", type: "dependency", summary: "payment-service depends on Stripe", confidence: 0.91, status: "confirmed" },
];

const CHAT_HISTORY: ChatMessage[] = [
  {
    id: "msg_1",
    role: "user",
    content: "Why does the payment service retry 3 times?",
    timestamp: new Date("2025-09-20T10:00:00"),
  },
  {
    id: "msg_2",
    role: "assistant",
    content:
      'The payment service retries 3 times because the original design [Decision: PR #142] decided that transient failures in the Stripe webhook handler [System: payment-service] required exactly 3 attempts before failing permanently [Risk: PR #187]. The team considered 5 retries but settled on 3 to avoid cascading timeouts [Interview: Engineer A, Q3 2025].',
    confidence: 0.85,
    citations: [
      {
        nodeId: "node_142",
        type: "decision",
        label: "Decision: PR #142",
        detail: {
          claim: "Use 3 retries for Stripe webhook to handle transient failures",
          rationale:
            "Transient failures in the Stripe webhook handler required bounded retries. The team considered 5 retries but settled on 3 to avoid cascading timeouts after the Sept 12 incident.",
          confidence: 0.82,
          source: "PR #142",
          capturedDate: "2025-09-15",
          attributedTo: "Engineer A, Payments Team",
          externalUrl: "https://github.com/org/payment-service/pull/142",
        },
      },
      {
        nodeId: "node_187",
        type: "risk",
        label: "Risk: PR #187",
        detail: {
          claim: "No circuit breaker exists for sustained Stripe outages",
          rationale: "If Stripe experiences a sustained outage, the payment service will queue jobs indefinitely without a circuit breaker.",
          confidence: 0.65,
          source: "PR #187",
          capturedDate: "2025-09-18",
          attributedTo: "Engineer A, Payments Team",
          externalUrl: "https://github.com/org/payment-service/pull/187",
        },
      },
      {
        nodeId: "node_int_1",
        type: "decision",
        label: "Interview: Engineer A, Q3 2025",
        detail: {
          claim: "After Sept 12 incident, settled on 3 retries to avoid cascading timeouts",
          rationale: "Analysis showed 5 retries caused 400ms+ cascading delays across the payment chain.",
          confidence: 0.82,
          source: "Interview (Sept 15, 2025)",
          capturedDate: "2025-09-15",
          attributedTo: "Engineer A, Payments Team",
        },
      },
    ],
    timestamp: new Date("2025-09-20T10:00:05"),
  },
];

const KNOWLEDGE_SYSTEMS: KnowledgeSystem[] = [
  { id: "sys_1", name: "payment-service", coveragePercent: 78, ownerCount: 2, lastUpdated: "2d ago", hasWarning: false },
  { id: "sys_2", name: "auth-service", coveragePercent: 95, ownerCount: 3, lastUpdated: "1w ago", hasWarning: false },
  { id: "sys_3", name: "user-mgmt", coveragePercent: 52, ownerCount: 1, lastUpdated: "30d ago", hasWarning: true },
  { id: "sys_4", name: "notification-svc", coveragePercent: 23, ownerCount: 1, lastUpdated: "45d ago", hasWarning: true },
];

const BUS_FACTOR_RISKS: BusFactorRisk[] = [
  { engineerId: "eng_a", engineerName: "Engineer A", soleExpertFor: "payment-service", tenure: "2.1 years" },
  { engineerId: "eng_b", engineerName: "Engineer B", soleExpertFor: "notification-svc", tenure: "8 months" },
];

const STALE_KNOWLEDGE: StaleKnowledge[] = [
  { systemId: "sys_3", systemName: "user-mgmt", staleNodeCount: 4, staleDays: 30, trigger: "12 commits last week" },
  { systemId: "sys_4", systemName: "notification-svc", staleNodeCount: 6, staleDays: 45, trigger: "API refactor last week" },
];

const INTERVIEW_RECOMMENDATIONS: InterviewRecommendation[] = [
  { engineerId: "eng_a", engineerName: "Engineer A", trigger: "Gap score > 0.6", systems: ["auth-service"], action: "send" },
  { engineerId: "eng_b", engineerName: "Engineer B", trigger: "Quarterly review due", systems: ["user-mgmt"], action: "send" },
  { engineerId: "eng_c", engineerName: "Engineer C", trigger: "Departure flagged", systems: ["payment-service"], action: "priority" },
];

const CONNECTION_TOOLS: ConnectionTool[] = [
  { id: "github", name: "GitHub", description: "Commits, pull requests, code reviews, repository activity", status: "connected", connectedCount: 3, connectedLabel: "3 repos" },
  { id: "slack", name: "Slack", description: "Channel messages, direct messages, reactions, thread participation", status: "connected", connectedCount: 12, connectedLabel: "12 channels" },
  { id: "jira", name: "Jira", description: "Issues, comments, status transitions, sprint data", status: "not_connected" },
  { id: "linear", name: "Linear", description: "Issues, projects, cycles, and team workflow data", status: "not_connected" },
  { id: "notion", name: "Notion", description: "Documentation, wikis, databases, and team knowledge", status: "not_connected" },
];

const SYNC_STATUSES: SyncStatus[] = [
  { toolId: "github", toolName: "GitHub", lastSynced: "2 hours ago", eventsProcessed: 47 },
  { toolId: "slack", toolName: "Slack", lastSynced: "15 min ago", eventsProcessed: 203 },
];

const ENGINEER_PROFILE: EngineerProfile = {
  name: "Engineer A",
  team: "Payments Team",
  ringLevel: 2,
  ringLabel: "Team Lead",
  tenure: "2.1 years",
  joinedDate: "March 2024",
  systems: [
    { name: "payment-service", ownershipPercent: 85, knowledgePercent: 78 },
    { name: "stripe-webhook-handler", ownershipPercent: 40, knowledgePercent: 62 },
  ],
  attributedKnowledge: { decisions: 5, risks: 3, dependencies: 2 },
  lastInterview: "Sept 15, 2025",
  nextInterviewRecommended: "Dec 15, 2025",
  privacy: { passiveCapture: true, allowInterviews: true, showAttribution: true },
};

export function getClaims(_interviewId: string): Promise<Claim[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(CLAIMS), 300);
  });
}

export function getQuestions(): Promise<Question[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(QUESTIONS), 200);
  });
}

export function getExtractedClaims(): Promise<ExtractedClaim[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(EXTRACTED_CLAIMS), 150);
  });
}

export function getChatHistory(): Promise<ChatMessage[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(CHAT_HISTORY), 200);
  });
}

export function submitQuery(_question: string): Promise<ChatMessage> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `msg_${Date.now()}`,
        role: "assistant",
        content:
          'The payment service retries 3 times because the original design [Decision: PR #142] decided that transient failures in the Stripe webhook handler [System: payment-service] required exactly 3 attempts before failing permanently [Risk: PR #187].',
        confidence: 0.85,
        citations: [
          {
            nodeId: "node_142",
            type: "decision",
            label: "Decision: PR #142",
            detail: {
              claim: "Use 3 retries for Stripe webhook to handle transient failures",
              rationale: "Transient failures in the Stripe webhook handler required bounded retries.",
              confidence: 0.82,
              source: "PR #142",
              capturedDate: "2025-09-15",
              attributedTo: "Engineer A, Payments Team",
              externalUrl: "https://github.com/org/payment-service/pull/142",
            },
          },
        ],
        timestamp: new Date(),
      });
    }, 800);
  });
}

export function getKnowledgeSystems(): Promise<KnowledgeSystem[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(KNOWLEDGE_SYSTEMS), 300);
  });
}

export function getBusFactorRisks(): Promise<BusFactorRisk[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(BUS_FACTOR_RISKS), 250);
  });
}

export function getStaleKnowledge(): Promise<StaleKnowledge[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(STALE_KNOWLEDGE), 250);
  });
}

export function getInterviewRecommendations(): Promise<InterviewRecommendation[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(INTERVIEW_RECOMMENDATIONS), 200);
  });
}

export function getConnectionTools(): Promise<ConnectionTool[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(CONNECTION_TOOLS), 200);
  });
}

export function getSyncStatuses(): Promise<SyncStatus[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(SYNC_STATUSES), 150);
  });
}

export function getEngineerProfile(): Promise<EngineerProfile> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ENGINEER_PROFILE), 200);
  });
}

export function getInterviewOpening(): Promise<{
  systems: { name: string; role: string }[];
  knowledgeGaps: number;
  estimatedTime: string;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        systems: [
          { name: "payment-service", role: "primary" },
          { name: "stripe-webhook-handler", role: "secondary" },
        ],
        knowledgeGaps: 8,
        estimatedTime: "15-20 minutes",
      });
    }, 200);
  });
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "text-green-500";
  if (confidence >= 0.4) return "text-amber-500";
  return "text-red-500";
}

export function getConfidenceBg(confidence: number): string {
  if (confidence >= 0.7) return "bg-green-500";
  if (confidence >= 0.4) return "bg-amber-500";
  return "bg-red-500";
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return "HIGH CONFIDENCE";
  if (confidence >= 0.4) return "LOW CONFIDENCE";
  return "NO KNOWLEDGE FOUND";
}

export function getConfidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.7) return "bg-green-500/10 text-green-500 border-green-500/20";
  if (confidence >= 0.4) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  decision: "Decision Node",
  dependency: "Dependency Node",
  risk: "Risk Node",
  process: "Process Node",
};

export const CLAIM_TYPE_COLORS: Record<ClaimType, string> = {
  decision: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  dependency: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  risk: "bg-red-500/10 text-red-400 border-red-500/20",
  process: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};
