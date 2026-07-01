"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  type ChatMessage,
  type Citation,
  type ClaimType,
  getChatHistory,
  submitQuery,
  getConfidenceColor,
  getConfidenceBg,
  getConfidenceBadgeClass,
  getConfidenceLabel,
  CLAIM_TYPE_LABELS,
  CLAIM_TYPE_COLORS,
} from "@/lib/mock-data";

function TypeBadge({ type }: { type: ClaimType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        CLAIM_TYPE_COLORS[type]
      )}
    >
      {CLAIM_TYPE_LABELS[type]}
    </span>
  );
}

function CitationChip({
  citation,
  onClick,
}: {
  citation: Citation;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <span>{citation.label}</span>
    </button>
  );
}

function ConfidenceHeader({ confidence }: { confidence: number }) {
  return (
    <div
      className={cn(
        "mb-3 inline-flex items-center gap-2 rounded-md border px-2.5 py-1",
        getConfidenceBadgeClass(confidence)
      )}
    >
      <span className="text-xs font-semibold">{getConfidenceLabel(confidence)}</span>
    </div>
  );
}

function SidePanel({
  citation,
  open,
  onClose,
}: {
  citation: Citation | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[380px] sm:w-[420px]">
        {citation && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <TypeBadge type={citation.type} />
                <span className="text-sm font-semibold text-foreground">
                  {citation.label}
                </span>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Claim
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {citation.detail.claim}
                </p>
              </div>

              {citation.detail.rationale && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Rationale
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {citation.detail.rationale}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Confidence
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        getConfidenceBg(citation.detail.confidence)
                      )}
                      style={{
                        width: `${citation.detail.confidence * 100}%`,
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-mono",
                      getConfidenceColor(citation.detail.confidence)
                    )}
                  >
                    {citation.detail.confidence.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-muted-foreground">
                    Source:
                  </span>{" "}
                  {citation.detail.source}
                </p>
                <p>
                  <span className="font-medium text-muted-foreground">
                    Captured:
                  </span>{" "}
                  {citation.detail.capturedDate}
                </p>
                {citation.detail.attributedTo && (
                  <p>
                    <span className="font-medium text-muted-foreground">
                      Attributed to:
                    </span>{" "}
                    {citation.detail.attributedTo}
                  </p>
                )}
              </div>

              {citation.detail.externalUrl && (
                <a
                  href={citation.detail.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors w-full"
                >
                  View source
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getChatHistory().then((data) => {
      setMessages(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamText]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setStreamText("");

    const response = await submitQuery(input.trim());

    const fullText = response.content;
    let revealed = "";
    const words = fullText.split(" ");

    for (let i = 0; i < words.length; i++) {
      revealed += (i > 0 ? " " : "") + words[i];
      setStreamText(revealed);
      await new Promise((r) => setTimeout(r, 30));
    }

    setStreamText("");
    setMessages((prev) => [
      ...prev,
      { ...response, content: fullText, timestamp: new Date() },
    ]);
    setSending(false);
  };

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
    setPanelOpen(true);
  };

  const highlightedContent = (content: string, citations?: Citation[]) => {
    if (!citations || citations.length === 0) return content;

    const parts: React.ReactNode[] = [];
    let remaining = content;
    let key = 0;

    const bracketRegex = /\[([^\]]+)\]/g;

    let match;
    let lastIndex = 0;

    while ((match = bracketRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++}>{remaining.slice(lastIndex, match.index)}</span>
        );
      }

      const label = match[1];
      const citation = citations.find((c) => c.label.includes(label));

      if (citation) {
        parts.push(
          <button
            key={key++}
            onClick={() => handleCitationClick(citation)}
            className="text-primary hover:underline"
          >
            [{label}]
          </button>
        );
      } else {
        parts.push(<span key={key++}>[{label}]</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
    }

    return parts;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="h-64 animate-pulse rounded-lg bg-secondary/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 pr-2"
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="rounded-lg bg-secondary/80 px-4 py-3 max-w-md">
                  <p className="text-sm text-foreground">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div>
                {msg.confidence != null && (
                  <ConfidenceHeader confidence={msg.confidence} />
                )}
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {highlightedContent(msg.content, msg.citations)}
                </p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.citations.map((c) => (
                      <CitationChip
                        key={c.nodeId}
                        citation={c}
                        onClick={() => handleCitationClick(c)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {streamText && (
          <div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {streamText}
              <span className="animate-pulse text-primary">|</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4 pb-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Textarea
              placeholder="Ask anything about your codebase..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  handleSend();
                }
              }}
              disabled={sending}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="self-end"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ctrl+Enter to send
        </p>
      </div>

      <SidePanel
        citation={selectedCitation}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
