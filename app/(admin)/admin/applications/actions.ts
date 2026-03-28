"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { reviewOwnerApplication } from "@/lib/data/repository";

export async function runApplicationReviewAction(formData: FormData) {
  await requireRole(ADMIN_ROLES, "/admin/applications");

  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";

  if (!applicationId || !["approved", "rejected"].includes(decision)) {
    redirect("/admin/applications?error=invalid_request");
  }

  try {
    await reviewOwnerApplication(applicationId, decision);
  } catch (error: unknown) {
    const msg = typeof error === "object" && error && "message" in error ? String((error as any).message).toLowerCase() : "";
    if (msg.includes("forbidden")) redirect("/admin/applications?error=forbidden");
    redirect("/admin/applications?error=review_failed");
  }

  revalidatePath("/admin/applications");
  redirect(`/admin/applications?ok=${decision}`);
}
