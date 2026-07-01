"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type ConnectionTool,
  type SyncStatus,
  getConnectionTools,
  getSyncStatuses,
} from "@/lib/mock-data";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.528 2.528 0 0 1-2.52-2.521V2.522A2.528 2.528 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.527 2.527 0 0 1 24 15.163a2.527 2.527 0 0 1-2.522 2.523h-6.315z" />
    </svg>
  ),
};

function ToolIcon({ id }: { id: string }) {
  return (
    <div className="flex size-10 items-center justify-center text-foreground">
      {TOOL_ICONS[id] ?? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const [tools, setTools] = useState<ConnectionTool[]>([]);
  const [syncs, setSyncs] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectTarget, setConnectTarget] = useState<ConnectionTool | null>(null);
  const [manageTarget, setManageTarget] = useState<ConnectionTool | null>(null);

  useEffect(() => {
    Promise.all([getConnectionTools(), getSyncStatuses()]).then(
      ([toolsData, syncData]) => {
        setTools(toolsData);
        setSyncs(syncData);
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-foreground">
          Connect Data Sources
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the tools your team uses so Archaeon can capture
          organizational knowledge.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <div key={tool.id} className="rounded-lg bg-secondary/50 p-5">
            <div className="flex items-start justify-between mb-3">
              <ToolIcon id={tool.id} />
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                  tool.status === "connected"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {tool.status === "connected" && (
                  <div className="size-1.5 rounded-full bg-green-500" />
                )}
                {tool.status === "connected" ? "Connected" : "Not connected"}
              </div>
            </div>

            <p className="text-sm font-medium text-foreground">{tool.name}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {tool.description}
            </p>

            {tool.connectedCount != null && tool.connectedLabel && (
              <p className="mt-2 text-xs text-muted-foreground">
                {tool.connectedLabel}
              </p>
            )}

            <div className="mt-4">
              {tool.status === "connected" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManageTarget(tool)}
                >
                  Manage
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setConnectTarget(tool)}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {syncs.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Sync Status
          </h2>
          <div className="space-y-2">
            {syncs.map((sync) => (
              <div
                key={sync.toolId}
                className="flex items-center justify-between text-sm text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {sync.toolName}
                </span>
                <span>
                  Last synced: {sync.lastSynced}
                </span>
                <span>{sync.eventsProcessed} events processed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={connectTarget !== null}
        onOpenChange={(open) => !open && setConnectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connectTarget?.name}</DialogTitle>
            <DialogDescription>
              Archaeon wants to access:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {connectTarget?.id === "github" ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked disabled />
                  <span>Repository contents</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked disabled />
                  <span>Pull requests</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked disabled />
                  <span>Commit history</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked disabled />
                <span>Read access to {connectTarget?.name}</span>
              </div>
            )}
          </div>

          {connectTarget?.id === "github" && (
            <div className="pt-2">
              <p className="text-sm font-medium text-foreground mb-3">
                Which repositories?
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="repo-scope"
                    defaultChecked
                    className="accent-primary"
                  />
                  <span className="text-muted-foreground">All repositories</span>
                </div>
                <div className="space-y-2 ml-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox />
                    <span>payment-service</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox />
                    <span>auth-service</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox />
                    <span>archaeon-docs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConnectTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => setConnectTarget(null)}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manageTarget !== null}
        onOpenChange={(open) => !open && setManageTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {manageTarget?.name}</DialogTitle>
            <DialogDescription>
              {manageTarget?.connectedLabel} currently connected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Button variant="outline" className="w-full" onClick={() => setManageTarget(null)}>
              Sync now
            </Button>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setManageTarget(null)}
            >
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
