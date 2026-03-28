"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthUser, requireRole } from "@/lib/auth/server";
import { MEMBER_ROLES } from "@/lib/auth/roles";
import { getRoomBySlug, updateRoomMeta } from "@/lib/data/repository";

export async function runRoomMetaAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();

  await requireRole(MEMBER_ROLES, `/member/rooms/${slug}`);

  const title = String(formData.get("title") ?? "").trim();
  const publicSummary = String(formData.get("publicSummary") ?? "").trim();
  const heroImageUrl = String(formData.get("heroImageUrl") ?? "").trim() || undefined;
  const qrCodeUrl = String(formData.get("qrCodeUrl") ?? "").trim() || undefined;

  if (!slug || !title) {
    redirect(`/member/rooms/${slug}?error=missing_fields`);
  }

  const room = await getRoomBySlug(slug);
  if (!room) redirect(`/member?error=room_not_found`);

  const user = await getAuthUser();
  if (!user || user.id !== room.ownerId) {
    redirect("/");
  }

  try {
    await updateRoomMeta({
      roomId: room.id,
      title,
      publicSummary,
      heroImageUrl,
      qrCodeUrl,
    });
  } catch (error: unknown) {
    const msg = typeof error === "object" && error && "message" in error
      ? String((error as any).message).toLowerCase() : "";
    if (msg.includes("room_archived")) redirect(`/member/rooms/${slug}?error=room_archived`);
    redirect(`/member/rooms/${slug}?error=update_failed`);
  }

  revalidatePath(`/member/rooms/${slug}`);
  revalidatePath(`/rooms/${slug}`);
  redirect(`/member/rooms/${slug}?ok=room_meta_saved`);
}
