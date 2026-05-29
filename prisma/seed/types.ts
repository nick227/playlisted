import type {
  EditorialKind,
  HomepageSection,
  PlaylistType,
  PublishStatus,
  RecordingType,
  SaveKind,
  TagKind,
  UserRole,
  Visibility,
} from "@prisma/client";

export type SeedMediaRoots = {
  audio: string;
  images: string;
};

export type SeedMeta = {
  defaultPassword: string;
  mediaBaseUrl: string;
  mediaRoots: SeedMediaRoots;
};

export type SeedUser = {
  key: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  password?: string;
  bio?: string;
  isFeaturedArtist?: boolean;
  avatarFile?: string;
  heroImageFile?: string;
};

export type SeedTag = {
  key: string;
  name: string;
  slug: string;
  kind: TagKind;
};

export type SeedRecording = {
  key: string;
  title: string;
  description?: string;
  audioFile: string;
  artworkFile?: string;
  recordingType?: RecordingType;
  visibility?: Visibility;
  status?: PublishStatus;
  trackNumber?: number;
  episodeNumber?: number;
  explicit?: boolean;
  releaseDate?: string;
  publishedAt?: string;
  tagKeys?: string[];
};

export type SeedCollection = {
  key: string;
  ownerKey: string;
  title: string;
  slug: string;
  description?: string;
  type: PlaylistType;
  coverArtFile?: string;
  visibility?: Visibility;
  status?: PublishStatus;
  featured?: boolean;
  isPinnedOnProfile?: boolean;
  publishedAt?: string;
  tagKeys?: string[];
  recordings: SeedRecording[];
};

export type SeedPlaylist = {
  key: string;
  ownerKey: string;
  title: string;
  slug: string;
  description?: string;
  type?: PlaylistType;
  coverArtFile?: string;
  visibility?: Visibility;
  status?: PublishStatus;
  featured?: boolean;
  publishedAt?: string;
  tagKeys?: string[];
  recordingKeys: string[];
};

export type SeedSave = {
  userKey: string;
  playlistKey?: string;
  recordingKey?: string;
  kind: SaveKind;
};

export type SeedUserPlaybackEvent = {
  userKey: string;
  recordingKey: string;
  playlistKey?: string;
  sourceContext?: string;
  count?: number;
  playedSeconds?: number;
  completed?: boolean;
  daysAgoStart?: number;
  daysAgoEnd?: number;
};

export type SeedEditorial = {
  key: string;
  authorKey: string;
  kind: EditorialKind;
  title: string;
  slug: string;
  summary?: string;
  body: string;
  coverImageFile?: string;
  status?: PublishStatus;
  publishedAt?: string;
};

export type SeedHomepageFeature = {
  section: HomepageSection;
  position: number;
  playlistKey?: string;
  userKey?: string;
  editorialKey?: string;
  createdByKey?: string;
  titleOverride?: string;
  subtitleOverride?: string;
  isActive?: boolean;
};

export type SeedData = {
  meta: SeedMeta;
  users: SeedUser[];
  tags?: SeedTag[];
  collections: SeedCollection[];
  playlists: SeedPlaylist[];
  saves?: SeedSave[];
  userPlaybackEvents?: SeedUserPlaybackEvent[];
  editorial?: SeedEditorial[];
  homepageFeatures?: SeedHomepageFeature[];
};
