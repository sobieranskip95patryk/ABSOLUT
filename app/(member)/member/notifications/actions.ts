"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { MEMBER_ROLES } from "@/lib/auth/roles";
import { markNotificationsRead } from "@/lib/data/repository";

export async function runMarkReadAction() {
  await requireRole(MEMBER_ROLES, "/member/notifications");
  await markNotificationsRead();
  revalidatePath("/member/notifications");
}
