"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { performAdminEntryAction, type AdminEntryAction } from "@/lib/data/repository";

const allowedActions = new Set<AdminEntryAction>(["approve", "reject", "publish", "revoke", "review", "feature", "archive", "pin", "unpin"]);

function successCodeForAction(action: AdminEntryAction) {
  if (action === "approve") return "approved";
  if (action === "publish") return "published";
  if (action === "reject") return "rejected";
  if (action === "review") return "reviewed";
  if (action === "feature") return "featured";
  if (action === "archive") return "archived";
  if (action === "pin") return "pinned";
  if (action === "unpin") return "unpinned";
  return "revoked";
}

function mapErrorToCode(error: unknown, action: AdminEntryAction) {
  const message = typeof error === "object" && error && "message" in error ? String((error as any).message) : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("forbidden")) return "forbidden";
  if (normalized.includes("entry not found") || normalized.includes("not found")) return "entry_not_found";
  if (normalized.includes("invalid") || normalized.includes("bad request")) return "invalid_request";
  if (normalized.includes("jwt") || normalized.includes("auth") || normalized.includes("unauthorized")) return "auth_required";

  return `${action}_failed`;
}

export async function runAdminQueueAction(formData: FormData) {
  await requireRole(ADMIN_ROLES, "/admin");

  const actionValue = String(formData.get("action") ?? "");
  const entryId = String(formData.get("entryId") ?? "").trim();
  const featuredRaw = Number(formData.get("featuredLevel") ?? 1);

  if (!entryId || !allowedActions.has(actionValue as AdminEntryAction)) {
    redirect("/admin?error=invalid_request");
  }

  const action = actionValue as AdminEntryAction;

  try {
    await performAdminEntryAction({
      entryId,
      action,
      featuredLevel: Number.isFinite(featuredRaw) ? featuredRaw : 1,
    });

    revalidatePath("/admin");
    revalidatePath("/absolut");
    revalidatePath("/rooms");
    redirect(`/admin?ok=${encodeURIComponent(successCodeForAction(action))}`);
  } catch (error) {
    const code = mapErrorToCode(error, action);
    redirect(`/admin?error=${encodeURIComponent(code)}`);
  }
}
