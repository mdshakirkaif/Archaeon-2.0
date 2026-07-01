"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type EngineerProfile,
  getEngineerProfile,
} from "@/lib/mock-data";

function OwnershipBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{value}%</span>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<EngineerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacy, setPrivacy] = useState({
    passiveCapture: true,
    allowInterviews: true,
    showAttribution: true,
  });

  useEffect(() => {
    getEngineerProfile().then((data) => {
      setProfile(data);
      setPrivacy(data.privacy);
      setLoading(false);
    });
  }, []);

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="h-64 animate-pulse rounded-lg bg-secondary/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <div className="rounded-lg bg-secondary/50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {profile.name}
            </h1>
            <p className="text-sm text-muted-foreground">{profile.team}</p>
          </div>
          <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
            Ring {profile.ringLevel} ({profile.ringLabel})
          </span>
        </div>

        <div className="mt-4 flex gap-8 text-sm text-muted-foreground">
          <div>
            <p className="text-xs text-muted-foreground">Tenure</p>
            <p className="font-medium text-foreground">{profile.tenure}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="font-medium text-foreground">{profile.joinedDate}</p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          My Systems
        </h2>
        <div className="rounded-lg bg-secondary/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground">System</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Ownership</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Knowledge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.systems.map((sys) => (
                <TableRow key={sys.name} className="border-border">
                  <TableCell className="text-sm text-foreground font-medium">
                    {sys.name}
                  </TableCell>
                  <TableCell>
                    <OwnershipBar value={sys.ownershipPercent} color="bg-primary" />
                  </TableCell>
                  <TableCell>
                    <OwnershipBar value={sys.knowledgePercent} color="bg-green-500" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          My Attributed Knowledge
        </h2>
        <div className="rounded-lg bg-secondary/50 p-5">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                {profile.attributedKnowledge.decisions}
              </span>{" "}
              decisions attributed to you
            </p>
            <p>
              <span className="font-medium text-foreground">
                {profile.attributedKnowledge.risks}
              </span>{" "}
              risks you identified
            </p>
            <p>
              <span className="font-medium text-foreground">
                {profile.attributedKnowledge.dependencies}
              </span>{" "}
              dependencies you documented
            </p>
          </div>
          <Separator className="my-4" />
          <div className="flex gap-8 text-sm text-muted-foreground">
            <div>
              <p className="text-xs text-muted-foreground">Last interview</p>
              <p className="font-medium text-foreground">{profile.lastInterview}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next recommended</p>
              <p className="font-medium text-foreground">
                {profile.nextInterviewRecommended}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Privacy Settings
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
            <div className="pr-4">
              <p className="text-sm font-medium text-foreground">
                Passive capture of GitHub contributions
              </p>
            </div>
            <Switch
              checked={privacy.passiveCapture}
              onCheckedChange={(v) =>
                setPrivacy((prev) => ({ ...prev, passiveCapture: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
            <div className="pr-4">
              <p className="text-sm font-medium text-foreground">
                Interview invitations
              </p>
            </div>
            <Switch
              checked={privacy.allowInterviews}
              onCheckedChange={(v) =>
                setPrivacy((prev) => ({ ...prev, allowInterviews: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
            <div className="pr-4">
              <p className="text-sm font-medium text-foreground">
                Show name in knowledge attribution
              </p>
            </div>
            <Switch
              checked={privacy.showAttribution}
              onCheckedChange={(v) =>
                setPrivacy((prev) => ({ ...prev, showAttribution: v }))
              }
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
            View all data stored about me
          </button>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
            Request deletion of my data
          </button>
        </div>
      </section>
    </div>
  );
}
