import { Room, Entry } from "@/lib/data/types";
import { isMockMode } from "@/lib/env";
import { demoRooms, demoEntries } from "@/lib/mock/data";
import { getSupabaseClient } from "@/lib/supabase/server";
import { withMockFallback, roomFromRow } from "@/lib/data/repository";

export async function getRooms(): Promise<Room[]> {
  if (isMockMode()) {
    return demoRooms;
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
    return (data as any[]).map(roomFromRow);
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
      return roomFromRow(data);
    },
  );
}

export async function getRoomPublicEntries(slug: string): Promise<Entry[]> {
  if (!isMockMode()) {
    return withMockFallback(
      "getRoomPublicEntries",
      async () => {
        const room = await getRoomBySlug(slug);
        if (!room) return [];
        return demoEntries.filter((entry) => entry.roomId === room.id && entry.visibility !== "private");
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
        return (data as any[]).map((row) => ({
          id: row.id,
          roomId: row.room_id,
          title: row.title,
          content: row.content,
          visibility: row.visibility,
          createdAt: row.created_at,
          isCurated: row.is_curated,
          locked: row.locked ?? false,
        }));
      },
    );
  }
  const room = await getRoomBySlug(slug);
  if (!room) return [];
  return demoEntries.filter((entry) => entry.roomId === room.id && entry.visibility !== "private");
}

export async function getRoomPrivateEntries(slug: string): Promise<Entry[]> {
  if (!isMockMode()) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client is not configured");
    }
    const room = await getRoomBySlug(slug);
    if (!room) return [];
    const { data, error } = await supabase
      .from("entries")
      .select("id, room_id, title, content, visibility, created_at, is_curated")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as any[]).map((row) => ({
      id: row.id,
      roomId: row.room_id,
      title: row.title,
      content: row.content,
      visibility: row.visibility,
      createdAt: row.created_at,
      isCurated: row.is_curated,
      locked: row.locked ?? false,
    }));
  }
  const room = await getRoomBySlug(slug);
  if (!room) return [];
  return demoEntries.filter((entry) => entry.roomId === room.id);
}
