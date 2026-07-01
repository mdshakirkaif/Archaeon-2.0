"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type ConsentState = {
  passiveCapture: boolean;
  allowInterviews: boolean;
  showAttribution: boolean;
  submitted: boolean;
};

const STEP_LABELS = ["What We Capture", "Who Can See It", "Your Controls", "Confirm"];

export default function ConsentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<ConsentState>({
    passiveCapture: true,
    allowInterviews: true,
    showAttribution: true,
    submitted: false,
  });

  const handleSubmit = () => {
    setState((prev) => ({ ...prev, submitted: true }));
    toast.success("Consent recorded", {
      description: "Your privacy preferences have been saved.",
    });
  };

  if (state.submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-8 text-green-500"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-6 text-xl font-semibold text-foreground">
            Consent recorded
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
            Your privacy preferences have been saved. You can modify these
            settings at any time from your profile.
          </p>
          <div className="mt-8 flex gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Review Consent
            </Button>
            <Button onClick={() => router.push("/chat")}>
              Continue to Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    i <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {i < step ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3.5"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:inline",
                    i <= step
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-6 sm:w-10 mx-3",
                    i < step ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[340px]">
        {step === 0 && <StepWhatWeCapture />}
        {step === 1 && <StepWhoCanSeeIt />}
        {step === 2 && (
          <StepYourControls
            passiveCapture={state.passiveCapture}
            allowInterviews={state.allowInterviews}
            showAttribution={state.showAttribution}
            onToggle={(key) =>
              setState((prev) => ({ ...prev, [key]: !prev[key] }))
            }
          />
        )}
        {step === 3 && <StepConfirm onSubmit={handleSubmit} />}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="text-muted-foreground"
        >
          Back
        </Button>
        {step < 3 && (
          <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
        )}
      </div>
    </div>
  );
}

function StepWhatWeCapture() {
  const capturedItems = [
    "Your commits and pull request contributions",
    "Interview sessions about your work",
    "Knowledge you explicitly approve",
  ];

  const neverCapturedItems = [
    "Your private messages",
    "Personal accounts",
    "Anything outside connected repos/channels",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Welcome to Archaeon
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Before we begin, here's exactly what Archaeon captures and why.
        </p>
      </div>

      <div className="rounded-lg bg-secondary/50 p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">
          What we capture
        </h3>
        <ul className="space-y-3">
          {capturedItems.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 text-green-500 mt-0.5 shrink-0"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-secondary/50 p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">
          What we NEVER capture
        </h3>
        <ul className="space-y-3">
          {neverCapturedItems.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 text-red-500 mt-0.5 shrink-0"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const RING_CARDS = [
  {
    level: 1,
    title: "Your Team",
    description: "Knowledge from your systems",
    detail: "Your name in attribution",
  },
  {
    level: 2,
    title: "Team Leads",
    description: "Knowledge health for your team",
    detail: "Your name in attribution",
  },
  {
    level: 3,
    title: "Manager View",
    description: "Knowledge health for all teams",
    detail: "System health only",
  },
];

function StepWhoCanSeeIt() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Who Can See Your Data
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Access to your knowledge is controlled by ring levels. Higher rings
          see less detail about you as an individual.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {RING_CARDS.map((ring) => (
          <div
            key={ring.level}
            className="rounded-lg bg-secondary/50 p-4 text-center"
          >
            <div className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
              {ring.level}
            </div>
            <p className="text-sm font-medium text-foreground">
              Ring {ring.level}
            </p>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              {ring.title}
            </p>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">{ring.description}</p>
            <p className="text-xs text-muted-foreground mt-2">{ring.detail}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Your interview transcript is only visible to you. Always.
      </p>
    </div>
  );
}

function StepYourControls({
  passiveCapture,
  allowInterviews,
  showAttribution,
  onToggle,
}: {
  passiveCapture: boolean;
  allowInterviews: boolean;
  showAttribution: boolean;
  onToggle: (key: "passiveCapture" | "allowInterviews" | "showAttribution") => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Your Privacy Controls
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Control how Archaeon interacts with your data. All are enabled by
          default. You can opt out of any setting.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
          <div className="pr-4">
            <p className="text-sm font-medium text-foreground">
              Allow passive capture of GitHub contributions
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Archaeon reads commit and PR data from connected repositories
            </p>
          </div>
          <Switch
            checked={passiveCapture}
            onCheckedChange={() => onToggle("passiveCapture")}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
          <div className="pr-4">
            <p className="text-sm font-medium text-foreground">
              Allow interview invitations
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Managers can send you interview requests to capture knowledge
            </p>
          </div>
          <Switch
            checked={allowInterviews}
            onCheckedChange={() => onToggle("allowInterviews")}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
          <div className="pr-4">
            <p className="text-sm font-medium text-foreground">
              Show my name in knowledge attribution
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your name appears on knowledge claims you contributed to
            </p>
          </div>
          <Switch
            checked={showAttribution}
            onCheckedChange={() => onToggle("showAttribution")}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <button className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          View all data stored about you
        </button>
        <button className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Request deletion of your data
        </button>
      </div>
    </div>
  );
}

function StepConfirm({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Ready to Start
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          You can change these settings at any time in your profile.
        </p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Your contributions improve organizational knowledge for everyone.
      </p>

      <div className="flex justify-center">
        <Button onClick={onSubmit} size="lg">
          I understand and I consent
        </Button>
      </div>
    </div>
  );
}
