"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  type Question,
  type ExtractedClaim,
  type ClaimType,
  getQuestions,
  getExtractedClaims,
  getInterviewOpening,
  getConfidenceColor,
  getConfidenceBg,
  CLAIM_TYPE_LABELS,
  CLAIM_TYPE_COLORS,
} from "@/lib/mock-data";

type InputMode = "text" | "voice";

function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let final = "";
      let tmp = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          tmp += r[0].transcript;
        }
      }
      setTranscript(final);
      setInterim(tmp);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  return { listening, transcript, interim, supported, start, stop, reset };
}

type InterviewPhase = "opening" | "question" | "complete";

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

function ConfidencePip({ value }: { value: number }) {
  const pips = 5;
  const filled = Math.round(value * pips);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: pips }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i < filled ? getConfidenceBg(value) : "bg-secondary"
          )}
        />
      ))}
      <span className={cn("ml-1 text-xs font-mono", getConfidenceColor(value))}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export default function InterviewPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<InterviewPhase>("opening");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [extracted, setExtracted] = useState<ExtractedClaim[]>([]);
  const [opening, setOpening] = useState<{
    systems: { name: string; role: string }[];
    knowledgeGaps: number;
    estimatedTime: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const sr = useSpeechRecognition();

  useEffect(() => {
    Promise.all([
      getInterviewOpening(),
      getQuestions(),
      getExtractedClaims(),
    ]).then(([openingData, questionsData, extractedData]) => {
      setOpening(openingData);
      setQuestions(questionsData);
      setExtracted(extractedData);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (sr.transcript) {
      setCurrentAnswer(sr.transcript + (sr.interim ? " " + sr.interim : ""));
    } else if (sr.interim) {
      setCurrentAnswer(sr.interim);
    }
  }, [sr.transcript, sr.interim]);

  const progress = questions.length
    ? Math.round((currentQ / questions.length) * 100)
    : 0;

  const handleSubmitAnswer = () => {
    sr.stop();
    sr.reset();
    const q = questions[currentQ];
    setAnswers((prev) => ({ ...prev, [q.id]: currentAnswer }));
    setCurrentAnswer("");
    setInputMode("text");

    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
    } else {
      setPhase("complete");
    }
  };

  const handleSkip = () => {
    sr.stop();
    sr.reset();
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setCurrentAnswer("");
    } else {
      setPhase("complete");
    }
  };

  const handleModeSwitch = (mode: InputMode) => {
    if (inputMode === "voice" && sr.listening) sr.stop();
    setInputMode(mode);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="h-64 animate-pulse rounded-lg bg-secondary/50" />
      </div>
    );
  }

  if (phase === "opening" && opening) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-lg bg-secondary/50 p-8 max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-foreground">
            Knowledge Interview: Payment Service
          </h2>

          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-2">
                Systems covered:
              </p>
              {opening.systems.map((s) => (
                <p key={s.name} className="ml-4">
                  {s.name}{" "}
                  <span className="text-muted-foreground">({s.role})</span>
                </p>
              ))}
            </div>

            <div className="flex gap-8">
              <div>
                <p className="font-medium text-foreground">Knowledge gaps</p>
                <p>{opening.knowledgeGaps}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Estimated time</p>
                <p>{opening.estimatedTime}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              You will review everything before it is saved. You can skip any
              question. Nothing is saved until you approve it.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setPhase("question")}>Continue</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    const answeredCount = Object.values(answers).filter(Boolean).length;
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-lg bg-secondary/50 p-8 max-w-lg mx-auto text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10 mx-auto">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7 text-green-500"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="mt-6 text-lg font-semibold text-foreground">
            Interview Complete
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Here's what was captured:
          </p>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>{extracted.length} knowledge claims extracted</p>
            <p>{opening?.systems.length ?? 0} systems covered</p>
            <p>{answeredCount} questions answered</p>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Next: You'll review each claim and approve what enters the
              knowledge graph. Nothing is saved yet.
            </p>
          </div>

          <div className="mt-6">
            <Button onClick={() => router.push("/confirm")}>
              Review & Approve
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Interview {currentQ + 1} of {questions.length}
        </p>
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Skip this question
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 space-y-4">
          <div className="rounded-lg bg-secondary/50 p-5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This is about the{" "}
              <span className="font-medium text-foreground">
                {question.systemName}
              </span>
              , specifically {question.context.toLowerCase().replace("relating to ", "").replace("about ", "")}
            </p>
            <p className="mt-3 text-sm font-medium text-foreground leading-relaxed">
              {question.text}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
            <button
              onClick={() => handleModeSwitch("text")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                inputMode === "text"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Type
            </button>
            <button
              onClick={() => handleModeSwitch("voice")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                inputMode === "voice"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Voice
            </button>
          </div>

          {inputMode === "text" ? (
            <Textarea
              placeholder="Type your answer..."
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              className="min-h-[140px] resize-none"
            />
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary/50 border border-border min-h-[140px] p-4">
                {currentAnswer ? (
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="min-h-[100px] resize-none border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                  />
                ) : sr.listening ? (
                  <div className="space-y-2">
                    {sr.interim && (
                      <p className="text-sm text-muted-foreground animate-pulse">
                        {sr.interim}
                      </p>
                    )}
                    {!sr.interim && (
                      <p className="text-sm text-muted-foreground animate-pulse">
                        Listening...
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tap the microphone to start recording your answer. You can edit the transcription afterward.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={() => {
                    if (sr.listening) {
                      sr.stop();
                    } else {
                      sr.reset();
                      setCurrentAnswer("");
                      sr.start();
                    }
                  }}
                  disabled={!sr.supported}
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full transition-all",
                    sr.listening
                      ? "bg-red-500 hover:bg-red-600 scale-110"
                      : "bg-primary hover:bg-primary/90",
                    !sr.supported && "opacity-50 cursor-not-allowed"
                  )}
                  title={sr.supported ? (sr.listening ? "Stop recording" : "Start recording") : "Speech recognition not supported in this browser"}
                >
                  {sr.listening ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 text-white">
                      <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  )}
                </button>
              </div>

              {!sr.supported && (
                <p className="text-xs text-centered text-muted-foreground text-center">
                  Speech recognition is not available in this browser. Use Chrome for voice input.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSubmitAnswer} disabled={!currentAnswer.trim()}>
              Continue
            </Button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-4">
              Live Knowledge Preview
            </p>
            <div className="space-y-3">
              {extracted.map((claim) => (
                <div
                  key={claim.id}
                  className="rounded-md bg-background/50 p-3"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <TypeBadge type={claim.type} />
                    {claim.status === "confirmed" ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5 text-green-500"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5 text-amber-500"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                    &ldquo;{claim.summary}&rdquo;
                  </p>
                  <div className="mt-2">
                    <ConfidencePip value={claim.confidence} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {extracted.length} nodes captured so far
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Progress value={progress} className="h-1" />
        <p className="mt-2 text-xs text-muted-foreground">
          {currentQ + 1} of {questions.length} gaps addressed
        </p>
      </div>
    </div>
  );
}
