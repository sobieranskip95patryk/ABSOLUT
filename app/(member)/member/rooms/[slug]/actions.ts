"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthUser, requireRole } from "@/lib/auth/server";
import { MEMBER_ROLES } from "@/lib/auth/roles";
import {
  getRoomBySlug,
  performMemberEntryAction,
  saveRoomConsentSettings,
  type MemberEntryAction,
} from "@/lib/data/repository";

function safeMemberPath(slug: string) {
  return `/member/rooms/${slug}`;
}

function mapMemberError(error: unknown, fallback: string) {
  const message = typeof error === "object" && error && "message" in error ? String((error as any).message) : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("forbidden")) return "forbidden";
  if (normalized.includes("room not found")) return "room_not_found";
  if (normalized.includes("entry not found")) return "entry_not_found";
  if (normalized.includes("entry_locked") || normalized.includes("entry is locked")) return "entry_locked";
  if (normalized.includes("invalid")) return "invalid_request";
  return fallback;
}

async function authorizeOwnerForRoom(slug: string) {
  const role = await requireRole(MEMBER_ROLES, safeMemberPath(slug));
  const room = await getRoomBySlug(slug);
  if (!room) {
    redirect(`${safeMemberPath(slug)}?error=room_not_found`);
  }

  if (role === "owner") {
    const user = await getAuthUser();
    if (!user || user.id !== room.ownerId) {
      redirect("/");
    }
  }

  return room;
}

export async function runMemberEntryAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const action = String(formData.get("entryAction") ?? "") as MemberEntryAction;
  const entryId = String(formData.get("entryId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "private");
  const featuredLevel = Number(formData.get("featuredLevel") ?? 0);

  if (!slug) {
    redirect("/member?error=invalid_request");
  }

  const room = await authorizeOwnerForRoom(slug);

  if (!["create", "update", "request_curation"].includes(action)) {
    redirect(`${safeMemberPath(slug)}?error=invalid_request`);
  }

  if ((action === "create" || action === "update") && (!title || !content)) {
    redirect(`${safeMemberPath(slug)}?error=missing_entry_fields`);
  }

  if ((action === "update" || action === "request_curation") && !entryId) {
    redirect(`${safeMemberPath(slug)}?error=entry_not_found`);
  }

  try {
    await performMemberEntryAction({
      roomId: room.id,
      action,
      entryId: entryId || undefined,
      title,
      content,
      visibility: visibility === "public_room" ? "public_room" : "private",
      featuredLevel: Number.isFinite(featuredLevel) ? featuredLevel : 0,
    });

    revalidatePath(safeMemberPath(slug));
    revalidatePath(`/rooms/${slug}`);
    revalidatePath("/rooms");
    revalidatePath("/absolut");
    revalidatePath("/admin");
    redirect(`${safeMemberPath(slug)}?ok=${encodeURIComponent(action)}`);
  } catch (error) {
    redirect(`${safeMemberPath(slug)}?error=${encodeURIComponent(mapMemberError(error, `${action}_failed`))}`);
  }
}

export async function runMemberConsentAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();

  if (!slug) {
    redirect("/member?error=invalid_request");
  }

  const room = await authorizeOwnerForRoom(slug);

  const allowPublicExcerpt = formData.get("allowPublicExcerpt") === "on";
  const allowAnonymousPublication = formData.get("allowAnonymousPublication") === "on";

  try {
    await saveRoomConsentSettings({
      roomId: room.id,
      allowPublicExcerpt,
      allowAnonymousPublication,
    });

    revalidatePath(safeMemberPath(slug));
    redirect(`${safeMemberPath(slug)}?ok=consent_saved`);
  } catch (error) {
    redirect(`${safeMemberPath(slug)}?error=${encodeURIComponent(mapMemberError(error, "consent_failed"))}`);
  }
}
