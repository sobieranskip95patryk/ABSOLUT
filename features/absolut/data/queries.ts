import { Tag, Entry, Room } from "@/lib/data/types";
import { isMockMode } from "@/lib/env";
import { demoCurations, demoEntries } from "@/lib/mock/data";
import { getSupabaseClient } from "@/lib/supabase/server";
import { withMockFallback } from "@/lib/data/repository";

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
      return (data as any[]).map((row) => ({ name: row.name, entryCount: Number(row.entry_count) }));
    },
  );
}

export async function getAbsolutEntries(
  view: AbsolutView = "newest",
  tag?: string,
): Promise<Array<Entry & { room: Room; featuredLevel: number; curatorStatus: string; pinned: boolean; tags: string[]; viewCount: number }>> {
  if (!isMockMode()) {
    return withMockFallback(
      "getAbsolutEntries",
      async () => {
        const rooms = await import("@/lib/data/repository").then(m => m.getRooms());
        const approvedEntryIds = new Set(
          demoCurations.filter((item) => item.curatorStatus === "approved").map((item) => item.entryId),
        );

        return [...demoEntries]
          .filter((entry) => entry.visibility !== "private")
          .filter((entry) => entry.visibility === "public_room" || approvedEntryIds.has(entry.id))
          .map((entry) => {
            const curation = demoCurations.find((c) => c.entryId === entry.id);
            return {
              ...entry,
              room: rooms.find((room: Room) => room.id === entry.roomId)!,
              featuredLevel: curation?.featuredLevel ?? 0,
              curatorStatus: curation?.curatorStatus ?? "pending",
              pinned: curation?.pinned ?? false,
              tags: [] as string[],
              viewCount: 0,
            };
          });
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
        return (data as any[]).map((row) => {
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
            viewCount: row.view_count ?? 0,
          };
        });
      },
    );
  }

  const rooms = await import("@/lib/data/repository").then(m => m.getRooms());
  const approvedEntryIds = new Set(
    demoCurations.filter((item) => item.curatorStatus === "approved").map((item) => item.entryId),
  );

  return [...demoEntries]
    .filter((entry) => entry.visibility !== "private")
    .filter((entry) => entry.visibility === "public_room" || approvedEntryIds.has(entry.id))
    .map((entry) => ({
      ...entry,
      room: rooms.find((room: Room) => room.id === entry.roomId)!,
      featuredLevel: 0,
      curatorStatus: "none",
      pinned: false,
      tags: [],
      viewCount: 0,
    }));
}

export async function getAbsolutEntryById(
  entryId: string,
): Promise<(Entry & { room: Room; featuredLevel: number; curatorStatus: string; pinned: boolean; tags: string[]; viewCount: number }) | null> {
  if (isMockMode()) {
    const entry = demoEntries.find((e) => e.id === entryId);
    if (!entry) return null;
    const rooms = await import("@/lib/data/repository").then(m => m.getRooms());
    const curation = demoCurations.find((c) => c.entryId === entryId);
    return {
      ...entry,
      room: rooms.find((r: Room) => r.id === entry.roomId)!,
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

  const roomFromRow = (await import("@/lib/data/repository")).roomFromRow;

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
