export type Role = "guest" | "owner" | "curator" | "admin";

export type EntryVisibility = "private" | "curated_public" | "public_room";

export type CuratorStatus = "pending" | "review" | "approved" | "featured" | "rejected" | "archived";

export type Room = {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  theme: string;
  mission: string;
  visualStyle: string;
  qrCodeUrl: string;
  heroImageUrl: string;
  publicSummary: string;
};

export type Entry = {
  id: string;
  roomId: string;
  title: string;
  content: string;
  visibility: EntryVisibility;
  createdAt: string;
  isCurated: boolean;
  locked: boolean;
};

export type DialogMessage = {
  id: string;
  entryId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type Curation = {
  id: string;
  entryId: string;
  curatorStatus: CuratorStatus;
  featuredLevel: number;
  pinned: boolean;
  publishedAt?: string;
};

export type EntryVersion = {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  visibility: EntryVisibility;
  createdBy: string | null;
  createdAt: string;
};

export type Tag = {
  name: string;
  entryCount: number;
};

export type RoomBundle = {
  room: Room;
  entries: Entry[];
  dialogMessages: DialogMessage[];
};
