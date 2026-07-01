"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  type Claim,
  type ClaimType,
  getClaims,
  getConfidenceColor,
  getConfidenceBg,
  getConfidenceLabel,
  getConfidenceBadgeClass,
  CLAIM_TYPE_LABELS,
  CLAIM_TYPE_COLORS,
} from "@/lib/mock-data";

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", getConfidenceBg(value))}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className={cn("text-xs font-mono", getConfidenceColor(value))}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

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

type ClaimState = {
  original: Claim;
  current: Claim;
  removed: boolean;
  editing: boolean;
  editText: string;
};

export default function ConfirmPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimState[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  useEffect(() => {
    getClaims("int_1").then((data) => {
      setClaims(
        data.map((c) => ({
          original: { ...c },
          current: { ...c },
          removed: false,
          editing: false,
          editText: c.text,
        }))
      );
      setLoading(false);
    });
  }, []);

  const activeClaims = claims.filter((c) => !c.removed);

  const handleEdit = useCallback((id: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.current.id === id
          ? { ...c, editing: true, editText: c.current.text }
          : c
      )
    );
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.current.id === id
          ? {
              ...c,
              editing: false,
              current: {
                ...c.current,
                text: c.editText,
                confidence: Math.min(c.current.confidence + 0.03, 1),
              },
            }
          : c
      )
    );
  }, []);

  const handleCancelEdit = useCallback((id: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.current.id === id
          ? { ...c, editing: false, editText: c.current.text }
          : c
      )
    );
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!removeTarget) return;
    setClaims((prev) =>
      prev.map((c) =>
        c.current.id === removeTarget ? { ...c, removed: true } : c
      )
    );
    setRemoveTarget(null);
  }, [removeTarget]);

  const handleApprove = useCallback(() => {
    toast.success(`${activeClaims.length} claims approved`, {
      description: "Approved claims have entered the knowledge graph.",
    });
  }, [activeClaims.length]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-lg bg-secondary/50"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-foreground">
          Review Knowledge Claims
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Review each claim extracted from your interview. Edit for accuracy,
          remove what's wrong, and approve what should enter the knowledge graph.
        </p>
      </div>

      <div className="space-y-4">
        {claims
          .filter((c) => !c.removed)
          .map((claim) => (
            <div
              key={claim.current.id}
              className="rounded-lg bg-secondary/50 p-5"
            >
              <div className="mb-3">
                <TypeBadge type={claim.current.type} />
              </div>

              {claim.editing ? (
                <div className="space-y-3">
                  <Textarea
                    value={claim.editText}
                    onChange={(e) =>
                      setClaims((prev) =>
                        prev.map((c) =>
                          c.current.id === claim.current.id
                            ? { ...c, editText: e.target.value }
                            : c
                        )
                      )
                    }
                    className="min-h-[80px] resize-none bg-background text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(claim.current.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelEdit(claim.current.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground leading-relaxed">
                    {claim.current.text}
                  </p>

                  {claim.current.rationale && (
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      <span className="font-medium text-muted-foreground">
                        Rationale:
                      </span>{" "}
                      {claim.current.rationale}
                    </p>
                  )}
                </>
              )}

              {!claim.editing && (
                <>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Source: {claim.current.source}</span>
                    {claim.current.attributedTo && (
                      <span>By: {claim.current.attributedTo}</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <ConfidenceBar value={claim.current.confidence} />
                    {claim.current.confidence !==
                      claim.original.confidence && (
                      <span className="text-xs text-green-500 font-medium">
                        +{(claim.current.confidence - claim.original.confidence).toFixed(2)} human validated
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => handleEdit(claim.current.id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1.5 size-3.5"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoveTarget(claim.current.id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1.5 size-3.5"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      Remove
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
      </div>

      {activeClaims.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <div className="flex justify-center">
            <Button size="lg" onClick={handleApprove}>
              Approve & Save ({activeClaims.length} claim
              {activeClaims.length !== 1 ? "s" : ""})
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Only claims you approve will enter the knowledge graph.
          </p>
        </div>
      )}

      {activeClaims.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            All claims have been removed. No data will enter the knowledge graph.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Start Over
          </Button>
        </div>
      )}

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This claim will not be saved. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, remove it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
