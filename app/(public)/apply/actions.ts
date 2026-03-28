"use server";

import { redirect } from "next/navigation";
import { submitOwnerApplication } from "@/lib/data/repository";

export async function runApplyAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const motivation = String(formData.get("motivation") ?? "").trim();

  if (!email || !displayName) {
    redirect("/apply?error=missing_fields");
  }
  if (motivation.length < 20) {
    redirect("/apply?error=motivation_too_short");
  }

  try {
    await submitOwnerApplication({ email, displayName, motivation });
  } catch {
    redirect("/apply?error=submit_failed");
  }

  redirect("/apply?ok=submitted");
}
