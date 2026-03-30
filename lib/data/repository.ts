import { demoCurations, demoDialogMessages, demoEntries, demoRooms } from "@/lib/mock/data";
import { isMockMode } from "@/lib/env";
import { CuratorStatus, DialogMessage, Entry, EntryVersion, Notification, NotificationKind, OwnerApplication, Room, RoomStatus, Tag } from "@/lib/data/types";
import { getSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/auth/server";

function sortNewest<T extends { createdAt?: string; publishedAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftDate = left.createdAt ?? left.publishedAt ?? "";
    const rightDate = right.createdAt ?? right.publishedAt ?? "";
    return rightDate.localeCompare(leftDate);
  });
}

type RoomRow = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  theme: string;
  mission: string;
  qr_code_url: string | null;
  hero_image_url: string | null;
  status?: string;
  system_prompt?: string | null;
  public_summary?: string | null;
  visual_style?: string | null;
};

type EntryRow = {
  id: string;
  room_id: string;
  title: string;
  content: string;
  visibility: Entry["visibility"];
  created_at: string;
  is_curated: boolean;
  locked: boolean;
};

type EntryVersionRow = {
  id: string;
  version_number: number;
  title: string;
  content: string;
  visibility: string;
  created_by: string | null;
  created_at: string;
};

type TagRow = {
  name: string;
  entry_count: number;
};

type DialogMessageRow = {
  id: string;
  entry_id: string;
  role: DialogMessage["role"];
  content: string;
  created_at: string;
};

type CurationRow = {
  id: string;
  entry_id: string;
  curator_status: CuratorStatus;
  featured_level: number;
  pinned: boolean;
  published_at: string | null;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type ConsentRow = {
  allow_public_excerpt: boolean;
  allow_anonymous_publication: boolean;
};

export type AdminEntryAction = "approve" | "reject" | "publish" | "revoke" | "review" | "feature" | "archive" | "pin" | "unpin";
export type MemberEntryAction = "create" | "update" | "request_curation";

export type AuditLogFilters = {
  actorId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type AuditLogItem = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogResult = {
  items: AuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ConsentSettings = {
  allowPublicExcerpt: boolean;
  allowAnonymousPublication: boolean;
};

export function roomFromRow(row: RoomRow): Room {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    slug: row.slug,
    theme: row.theme,
    mission: row.mission,
    visualStyle: row.visual_style ?? "System visual profile",
    qrCodeUrl: row.qr_code_url ?? "",
    heroImageUrl: row.hero_image_url ?? "",
    publicSummary: row.public_summary ?? row.mission,
    status: (row.status ?? "active") as RoomStatus,
    systemPrompt: row.system_prompt ?? null,
  };
}

function entryFromRow(row: EntryRow): Entry {
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    content: row.content,
    visibility: row.visibility,
    createdAt: row.created_at,
    isCurated: row.is_curated,
    locked: row.locked ?? false,
  };
}

function entryVersionFromRow(row: EntryVersionRow): EntryVersion {
  return {
    id: row.id,
    versionNumber: row.version_number,
    title: row.title,
    content: row.content,
    visibility: row.visibility as Entry["visibility"],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function dialogMessageFromRow(row: DialogMessageRow): DialogMessage {
  return {
    id: row.id,
    entryId: row.entry_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function auditLogFromRow(row: AuditLogRow): AuditLogItem {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  };
}

export function withMockFallback<T>(label: string, fallback: () => T | Promise<T>, run: () => Promise<T>): Promise<T> {
  return run().catch(async (error) => {
    console.warn(`[repository] ${label} failed, falling back to mock data`, error);
    return await fallback();
  });
}

async function fetchRoomsFromSupabase(): Promise<Room[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id, owner_id, title, slug, theme, mission, qr_code_url, hero_image_url")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as RoomRow[]).map(roomFromRow);
}

export async function getRooms(): Promise<Room[]> {
  if (isMockMode()) {
    return demoRooms;
  }

  return withMockFallback("getRooms", () => demoRooms, () => fetchRoomsFromSupabase());
}

export async function getRoomBySlug(slug: string): Promise<Room | undefined> {
  if (isMockMode()) {
    const rooms = await getRooms();
    return rooms.find((room) => room.slug === slug);
  }

  return withMockFallback(
    "getRoomBySlug",
    async () => {
      const rooms = await getRooms();
      return rooms.find((room) => room.slug === slug);
    },
    async () => {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not configured");

      const { data, error } = await supabase
        .from("rooms")
        .select("id, owner_id, title, slug, theme, mission, qr_code_url, hero_image_url")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) return undefined;
      return roomFromRow(data as RoomRow);
    },
  );
}

export type AbsolutView = "newest" | "top" | "thematic";

export async function getAbsolutTags(): Promise<Tag[]> {
  if (isMockMode()) return [];

  return withMockFallback(
    "getAbsolutTags",
    () => [],
    async () => {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not configured");
      const { data, error } = await (supabase as any).rpc("get_absolut_tags");
      if (error) throw error;
      return (data as TagRow[]).map((row) => ({ name: row.name, entryCount: Number(row.entry_count) }));
    },
  );
}

export async function getAbsolutEntries(
  view: AbsolutView = "newest",
  tag?: string,
): Promise<Array<Entry & { room: Room; featuredLevel: number; curatorStatus: string; pinned: boolean; tags: string[] }>> {
  if (!isMockMode()) {
    return withMockFallback(
      "getAbsolutEntries",
      async () => {
        const rooms = await getRooms();
        const approvedEntryIds = new Set(
          demoCurations.filter((item) => item.curatorStatus === "approved").map((item) => item.entryId),
        );

        return sortNewest(
          demoEntries
            .filter((entry) => entry.visibility !== "private")
            .filter((entry) => entry.visibility === "public_room" || approvedEntryIds.has(entry.id))
            .map((entry) => {
              const curation = demoCurations.find((c) => c.entryId === entry.id);
              return {
                ...entry,
                room: rooms.find((room) => room.id === entry.roomId)!,
                featuredLevel: curation?.featuredLevel ?? 0,
                curatorStatus: curation?.curatorStatus ?? "pending",
                pinned: curation?.pinned ?? false,
                tags: [] as string[],
              };
            }),
        );
      },
      async () => {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase client is not configured");

        const { data, error } = await (supabase as any).rpc("get_absolut_feed", {
          p_view: view,
          p_tag: tag ?? null,
          p_limit: 200,
          p_offset: 0,
        });
        if (error) throw error;

        type AbsolutFeedRow = {
          id: string;
          room_id: string;
          room_slug: string;
          room_title: string;
          title: string;
          content: string;
          visibility: Entry["visibility"];
          created_at: string;
          featured_level: number;
          curator_status: string;
          pinned: boolean;
          tags: string[];
        };

        return (data as AbsolutFeedRow[]).map((row) => {
          const room: Room = {
            id: row.room_id,
            ownerId: "",
            title: row.room_title,
            slug: row.room_slug,
            theme: "Global Vision",
            mission: "",
            visualStyle: "System visual profile",
            qrCodeUrl: "",
            heroImageUrl: "",
            publicSummary: "",
            status: "active",
            systemPrompt: null,
          };

          const entry: Entry = {
            id: row.id,
            roomId: row.room_id,
            title: row.title,
            content: row.content,
            visibility: row.visibility,
            createdAt: row.created_at,
            isCurated: row.visibility === "curated_public",
            locked: false,
          };

          return {
            ...entry,
            room,
            featuredLevel: row.featured_level ?? 0,
            curatorStatus: row.curator_status ?? "none",
            pinned: row.pinned ?? false,
            tags: row.tags ?? [],
          };
        });
      },
    );
  }

  const rooms = await getRooms();
  const approvedEntryIds = new Set(
    demoCurations.filter((item) => item.curatorStatus === "approved").map((item) => item.entryId),
  );

  return sortNewest(
    demoEntries
      .filter((entry) => entry.visibility !== "private")
      .filter((entry) => entry.visibility === "public_room" || approvedEntryIds.has(entry.id))
      .map((entry) => ({
        ...entry,
        room: rooms.find((room) => room.id === entry.roomId)!,
        featuredLevel: 0,
        curatorStatus: "none",
        pinned: false,
        tags: [],
      })),
  );
}

export async function getEntryVersions(entryId: string): Promise<EntryVersion[]> {
  if (isMockMode()) return [];

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase server client is not configured");

  const { data, error } = await (supabase as any).rpc("get_entry_versions", { p_entry_id: entryId });
  if (error) throw error;
  return ((data as EntryVersionRow[]) ?? []).map(entryVersionFromRow);
}

export async function getRoomPublicEntries(slug: string): Promise<Entry[]> {
  if (!isMockMode()) {
    return withMockFallback(
      "getRoomPublicEntries",
      async () => {
        const room = await getRoomBySlug(slug);
        if (!room) return [];
        return sortNewest(demoEntries.filter((entry) => entry.roomId === room.id && entry.visibility !== "private"));
      },
      async () => {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase client is not configured");

        const room = await getRoomBySlug(slug);
        if (!room) return [];

        const { data, error } = await supabase
          .from("entries")
          .select("id, room_id, title, content, visibility, created_at, is_curated")
          .eq("room_id", room.id)
          .in("visibility", ["curated_public", "public_room"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data as EntryRow[]).map(entryFromRow);
      },
    );
  }

  const room = await getRoomBySlug(slug);
  if (!room) return [];
  return sortNewest(demoEntries.filter((entry) => entry.roomId === room.id && entry.visibility !== "private"));
}

export async function getRoomPrivateEntries(slug: string): Promise<Entry[]> {
  if (!isMockMode()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new Error("Supabase server client is not configured");
    }

    const room = await getRoomBySlug(slug);
    if (!room) return [];

    const { data, error } = await supabase
      .from("entries")
      .select("id, room_id, title, content, visibility, created_at, is_curated")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as EntryRow[]).map(entryFromRow);
  }

  const room = await getRoomBySlug(slug);
  if (!room) return [];
  return sortNewest(demoEntries.filter((entry) => entry.roomId === room.id));
}

export async function getDialogMessagesForEntries(entryIds: string[]): Promise<DialogMessage[]> {
  if (!isMockMode()) {
    if (entryIds.length === 0) {
      return [];
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new Error("Supabase server client is not configured");
    }

    const { data, error } = await supabase
      .from("dialog_messages")
      .select("id, entry_id, role, content, created_at")
      .in("entry_id", entryIds)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as DialogMessageRow[]).map(dialogMessageFromRow);
  }

  return sortNewest(demoDialogMessages.filter((message) => entryIds.includes(message.entryId)));
}

export async function getAdminQueue() {
  if (!isMockMode()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new Error("Supabase server client is not configured");
    }

    const { data: curationsData, error: curationsError } = await supabase
      .from("curations")
      .select("id, entry_id, curator_status, featured_level, published_at")
      .order("published_at", { ascending: false, nullsFirst: false });
    if (curationsError) throw curationsError;

    const curations = (curationsData as CurationRow[]) ?? [];
    const entryIds = curations.map((item) => item.entry_id);
    if (entryIds.length === 0) return [];

    const { data: entriesData, error: entriesError } = await supabase
      .from("entries")
      .select("id, room_id, title, content, visibility, created_at, is_curated")
      .in("id", entryIds);
    if (entriesError) throw entriesError;

    const entries = (entriesData as EntryRow[]).map(entryFromRow);
    const roomIds = [...new Set(entries.map((entry) => entry.roomId))];

    const { data: roomsData, error: roomsError } = await supabase
      .from("rooms")
      .select("id, owner_id, title, slug, theme, mission, qr_code_url, hero_image_url")
      .in("id", roomIds);
    if (roomsError) throw roomsError;

    const rooms = (roomsData as RoomRow[]).map(roomFromRow);

    return curations
      .map((curation) => {
        const entry = entries.find((item) => item.id === curation.entry_id);
        if (!entry) return null;
        const room = rooms.find((item) => item.id === entry.roomId);
        if (!room) return null;

        return {
          id: curation.id,
          entryId: curation.entry_id,
          curatorStatus: curation.curator_status,
          featuredLevel: curation.featured_level,
          pinned: curation.pinned ?? false,
          publishedAt: curation.published_at ?? undefined,
          entry,
          room,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  const rooms = await getRooms();
  return demoCurations.map((curation) => {
    const entry = demoEntries.find((item) => item.id === curation.entryId)!;
    return {
      ...curation,
      pinned: false,
      entry,
      room: rooms.find((room) => room.id === entry.roomId)!,
    };
  });
}

export async function performAdminEntryAction(input: {
  entryId: string;
  action: AdminEntryAction;
  featuredLevel?: number;
}) {
  if (isMockMode()) {
    // Mock mode is read-only for admin mutations; no persistent backend state.
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase server client is not configured");
  }

  const featuredLevel = Math.max(0, Number.isFinite(input.featuredLevel) ? Number(input.featuredLevel) : 1);

  if (input.action === "approve") {
    const { error } = await (supabase as any).rpc("approve_curation", {
      p_entry_id: input.entryId,
      p_featured_level: featuredLevel,
    });
    if (error) throw error;
    return;
  }

  if (input.action === "publish") {
    const { error } = await (supabase as any).rpc("publish_entry_to_absolut", {
      p_entry_id: input.entryId,
      p_featured_level: featuredLevel,
    });
    if (error) throw error;
    return;
  }

  if (input.action === "reject") {
    const { error } = await (supabase as any).rpc("reject_curation", {
      p_entry_id: input.entryId,
    });
    if (error) throw error;
    return;
  }

  if (input.action === "review") {
    const { error } = await (supabase as any).rpc("review_entry", { p_entry_id: input.entryId });
    if (error) throw error;
    return;
  }

  if (input.action === "feature") {
    const { error } = await (supabase as any).rpc("feature_entry", {
      p_entry_id: input.entryId,
      p_featured_level: featuredLevel,
    });
    if (error) throw error;
    return;
  }

  if (input.action === "archive") {
    const { error } = await (supabase as any).rpc("archive_entry", { p_entry_id: input.entryId });
    if (error) throw error;
    return;
  }

  if (input.action === "pin") {
    const { error } = await (supabase as any).rpc("toggle_pin_entry", { p_entry_id: input.entryId, p_pinned: true });
    if (error) throw error;
    return;
  }

  if (input.action === "unpin") {
    const { error } = await (supabase as any).rpc("toggle_pin_entry", { p_entry_id: input.entryId, p_pinned: false });
    if (error) throw error;
    return;
  }

  const { error } = await (supabase as any).rpc("revoke_publication", {
    p_entry_id: input.entryId,
  });
  if (error) throw error;
}

// ─── View counts ────────────────────────────────────────────────────────────

export async function recordEntryView(entryId: string, role: string = "guest"): Promise<void> {
  if (isMockMode()) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await (supabase as any).rpc("record_entry_view", { p_entry_id: entryId, p_role: role });
}

export async function getEntryViewCount(entryId: string): Promise<number> {
  if (isMockMode()) return 0;
  const supabase = getSupabaseClient();
  if (!supabase) return 0;
  const { data } = await (supabase as any).rpc("get_entry_view_count", { p_entry_id: entryId });
  return Number(data ?? 0);
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getOwnerUnreadCount(): Promise<number> {
  if (isMockMode()) return 0;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;
  const { data } = await (supabase as any).rpc("get_owner_unread_count");
  return Number(data ?? 0);
}

type NotificationRow = {
  id: string;
  owner_id: string;
  kind: NotificationKind;
  entry_id: string | null;
  is_read: boolean;
  created_at: string;
};

export async function getOwnerNotifications(): Promise<Notification[]> {
  if (isMockMode()) return [];
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await (supabase as any)
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as NotificationRow[]).map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    kind: row.kind,
    entryId: row.entry_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}

export async function markNotificationsRead(): Promise<void> {
  if (isMockMode()) return;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await (supabase as any).rpc("mark_notifications_read");
}

// ─── Owner applications ──────────────────────────────────────────────────────

type ApplicationRow = {
  id: string;
  email: string;
  display_name: string;
  motivation: string;
  status: string;
  reviewed_at: string | null;
  created_at: string;
};

export async function submitOwnerApplication(input: {
  email: string;
  displayName: string;
  motivation: string;
}): Promise<void> {
  if (isMockMode()) return;
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client is not configured");
  const { error } = await (supabase as any).rpc("submit_owner_application", {
    p_email: input.email,
    p_display_name: input.displayName,
    p_motivation: input.motivation,
  });
  if (error) throw error;
}

export async function getOwnerApplications(): Promise<OwnerApplication[]> {
  if (isMockMode()) return [];
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await (supabase as any)
    .from("owner_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ApplicationRow[]).map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    motivation: row.motivation,
    status: row.status as OwnerApplication["status"],
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }));
}

export async function reviewOwnerApplication(applicationId: string, decision: "approved" | "rejected"): Promise<void> {
  if (isMockMode()) return;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase server client is not configured");
  const { error } = await (supabase as any).rpc("review_owner_application", {
    p_application_id: applicationId,
    p_decision: decision,
  });
  if (error) throw error;
}

// ─── Room metadata (owner) ───────────────────────────────────────────────────

export async function updateRoomMeta(input: {
  roomId: string;
  title: string;
  publicSummary: string;
  heroImageUrl?: string;
  qrCodeUrl?: string;
}): Promise<void> {
  if (isMockMode()) return;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase server client is not configured");
  const { error } = await (supabase as any).rpc("owner_update_room_meta", {
    p_room_id: input.roomId,
    p_title: input.title,
    p_public_summary: input.publicSummary,
    p_hero_image_url: input.heroImageUrl ?? null,
    p_qr_code_url: input.qrCodeUrl ?? null,
  });
  if (error) throw error;
}

// ─── Full-text search ────────────────────────────────────────────────────────

export type SearchResult = {
  id: string;
  title: string;
  content: string;
  visibility: string;
  createdAt: string;
  room: { id: string; title: string; slug: string };
  featuredLevel: number;
  curatorStatus: string;
  pinned: boolean;
  rank: number;
};

export async function searchAbsolutEntries(query: string, limit = 20, offset = 0): Promise<SearchResult[]> {
  if (isMockMode() || !query.trim()) return [];
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await (supabase as any).rpc("search_absolut_entries", {
    p_query: query.trim(),
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    visibility: row.visibility,
    createdAt: row.created_at,
    room: { id: row.room_id, title: row.room_title, slug: row.room_slug },
    featuredLevel: row.featured_level ?? 0,
    curatorStatus: row.curator_status ?? "pending",
    pinned: row.pinned ?? false,
    rank: row.rank ?? 0,
  }));
}

// ─── Single ABSOLUT entry ────────────────────────────────────────────────────

export async function getAbsolutEntryById(
  entryId: string,
): Promise<(Entry & { room: Room; featuredLevel: number; curatorStatus: string; pinned: boolean; tags: string[]; viewCount: number }) | null> {
  if (isMockMode()) {
    const entry = demoEntries.find((e) => e.id === entryId);
    if (!entry) return null;
    const rooms = await getRooms();
    const curation = demoCurations.find((c) => c.entryId === entryId);
    return {
      ...entry,
      room: rooms.find((r) => r.id === entry.roomId)!,
      featuredLevel: curation?.featuredLevel ?? 0,
      curatorStatus: curation?.curatorStatus ?? "pending",
      pinned: curation?.pinned ?? false,
      tags: [],
      viewCount: 0,
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from("entries")
    .select(`
      *,
      rooms (*),
      curations (featured_level, curator_status, pinned),
      entry_tags (tags (name)),
      entry_view_counts (view_count)
    `)
    .eq("id", entryId)
    .eq("visibility", "curated_public")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    roomId: data.room_id,
    title: data.title,
    content: data.content,
    visibility: data.visibility,
    createdAt: data.created_at,
    isCurated: data.is_curated,
    locked: data.locked ?? false,
    room: roomFromRow(data.rooms),
    featuredLevel: data.curations?.featured_level ?? 0,
    curatorStatus: data.curations?.curator_status ?? "pending",
    pinned: data.curations?.pinned ?? false,
    tags: (data.entry_tags ?? []).map((et: any) => et.tags?.name).filter(Boolean),
    viewCount: data.entry_view_counts?.view_count ?? 0,
  };
}

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResult> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 5), 100);
  const page = Math.max(filters.page ?? 1, 1);

  if (isMockMode()) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase server client is not configured");
  }

  let query = supabase
    .from("audit_log")
    .select("id, actor_id, action, entity_type, entity_id, payload, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.actorId) {
    query = query.eq("actor_id", filters.actorId);
  }

  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  if (filters.startDate) {
    query = query.gte("created_at", `${filters.startDate}T00:00:00Z`);
  }

  if (filters.endDate) {
    query = query.lte("created_at", `${filters.endDate}T23:59:59Z`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw error;
  }

  return {
    items: ((data as AuditLogRow[]) ?? []).map(auditLogFromRow),
    page,
    pageSize,
    total: count ?? 0,
  };
}

export async function getRoomConsentSettings(slug: string): Promise<ConsentSettings> {
  if (isMockMode()) {
    return {
      allowPublicExcerpt: false,
      allowAnonymousPublication: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase server client is not configured");
  }

  const room = await getRoomBySlug(slug);
  if (!room) {
    return {
      allowPublicExcerpt: false,
      allowAnonymousPublication: false,
    };
  }

  const { data, error } = await supabase
    .from("consents")
    .select("allow_public_excerpt, allow_anonymous_publication")
    .eq("room_id", room.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const consent = data as ConsentRow | null;
  return {
    allowPublicExcerpt: consent?.allow_public_excerpt ?? false,
    allowAnonymousPublication: consent?.allow_anonymous_publication ?? false,
  };
}

export async function performMemberEntryAction(input: {
  roomId: string;
  action: MemberEntryAction;
  title?: string;
  content?: string;
  entryId?: string;
  visibility?: Entry["visibility"];
  featuredLevel?: number;
}) {
  if (isMockMode()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase server client is not configured");
  }

  if (input.action === "request_curation") {
    if (!input.entryId) {
      throw new Error("entry id required");
    }

    const { error } = await (supabase as any).rpc("owner_request_curation", {
      p_entry_id: input.entryId,
      p_featured_level: Math.max(0, input.featuredLevel ?? 0),
    });
    if (error) throw error;
    return;
  }

  const visibility = input.visibility === "public_room" ? "public_room" : "private";
  const { error } = await (supabase as any).rpc("owner_upsert_entry", {
    p_room_id: input.roomId,
    p_entry_id: input.action === "update" ? input.entryId ?? null : null,
    p_title: (input.title ?? "").trim(),
    p_content: (input.content ?? "").trim(),
    p_visibility: visibility,
  });
  if (error) throw error;
}

export async function saveRoomConsentSettings(input: {
  roomId: string;
  allowPublicExcerpt: boolean;
  allowAnonymousPublication: boolean;
}) {
  if (isMockMode()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase server client is not configured");
  }

  const { error } = await (supabase as any).rpc("owner_upsert_consent", {
    p_room_id: input.roomId,
    p_allow_public_excerpt: input.allowPublicExcerpt,
    p_allow_anonymous_publication: input.allowAnonymousPublication,
  });

  if (error) throw error;
}
