"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResolveAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const [resolving, setResolving] = useState(false);

  async function resolve() {
    setResolving(true);
    try {
      await fetch(`/api/security/alerts/${id}/resolve`, { method: "POST" });
      router.refresh();
    } finally {
      setResolving(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={resolve} disabled={resolving}>
      {resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      Resolve
    </Button>
  );
}