"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server";
import { performAdminEntryAction, type AdminEntryAction } from "@/lib/data/repository";

const CURATOR_ACTIONS = new Set<AdminEntryAction>(["approve", "reject", "review"]);

export async function runCuratorQueueAction(formData: FormData) {
  await requireRole(["curator", "admin"], "/curator");

  const entryId = String(formData.get("entryId") ?? "").trim();
  const action = String(formData.get("action") ?? "") as AdminEntryAction;
  const featuredLevelRaw = Number(formData.get("featuredLevel") ?? 0);
  const featuredLevel = Number.isFinite(featuredLevelRaw) ? Math.max(0, Math.min(10, featuredLevelRaw)) : 0;

  if (!entryId || !CURATOR_ACTIONS.has(action)) {
    redirect("/curator?error=invalid_request");
  }

  try {
    await performAdminEntryAction({ entryId, action, featuredLevel });
  } catch (error: unknown) {
    const msg = typeof error === "object" && error && "message" in error
      ? String((error as any).message).toLowerCase() : "";
    if (msg.includes("forbidden")) redirect("/curator?error=forbidden");
    redirect(`/curator?error=${action}_failed`);
  }

  revalidatePath("/curator");
  revalidatePath("/absolut");
  revalidatePath("/admin");

  const codes: Record<string, string> = { approve: "approved", reject: "rejected", review: "reviewed" };
  redirect(`/curator?ok=${codes[action] ?? action}`);
}
