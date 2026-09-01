"use client";

import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MatchActions({
  matchId,
  canEdit,
}: {
  matchId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  if (!canEdit) return null;

  async function act(action: "confirm" | "reject") {
    await fetch(`/api/matches/${matchId}/${action}`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => act("confirm")}>
        <Check className="h-3.5 w-3.5" /> Confirm
      </Button>
      <Button variant="outline" size="sm" onClick={() => act("reject")}>
        <X className="h-3.5 w-3.5" /> Reject
      </Button>
    </div>
  );
}
