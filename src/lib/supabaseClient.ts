import { createClient } from "@supabase/supabase-js";
import { Player } from "../types";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

const isValidUrl = (url: string) => {
  try {
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  isValidUrl(supabaseUrl)
);

export const getSupabaseConfigStatus = () => {
  return {
    urlValue: supabaseUrl ? (supabaseUrl.length > 25 ? supabaseUrl.substring(0, 20) + "..." : supabaseUrl) : "No definida",
    keyMasked: supabaseAnonKey ? (supabaseAnonKey.length > 10 ? supabaseAnonKey.substring(0, 6) + "..." + supabaseAnonKey.substring(supabaseAnonKey.length - 4) : "Definida (Corta)") : "No definida",
    isConfigured: isSupabaseConfigured,
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseAnonKey),
    urlValid: isValidUrl(supabaseUrl)
  };
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Returns the SQL necessary to create the table in Supabase.
 */
export const SUPABASE_TABLE_SQL = `
-- 1. Elimina las tablas existentes si ya existían para asegurar que el esquema se actualice
DROP TABLE IF EXISTS open_coaching_players CASCADE;
DROP TABLE IF EXISTS open_coaching_settings CASCADE;

-- 2. Crea la tabla de jugadores con las columnas correctas en minúsculas para Postgres
CREATE TABLE open_coaching_players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  age TEXT,
  positives TEXT,
  negatives TEXT,
  status TEXT NOT NULL,
  number TEXT,
  photourl TEXT,
  lateralidad TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crea la tabla de configuraciones para ajustes globales (como el escudo del equipo)
CREATE TABLE open_coaching_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 4. Habilita Seguridad de Nivel de Fila (RLS) en ambas tablas
ALTER TABLE open_coaching_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_coaching_settings ENABLE ROW LEVEL SECURITY;

-- 5. Crea las políticas de acceso para permitir accesos anónimos públicos de lectura/escritura
DROP POLICY IF EXISTS "Permitir accesos anonimos públicos" ON open_coaching_players;
CREATE POLICY "Permitir accesos anonimos públicos" 
  ON open_coaching_players 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir accesos anonimos públicos settings" ON open_coaching_settings;
CREATE POLICY "Permitir accesos anonimos públicos settings" 
  ON open_coaching_settings 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
`;

/**
 * Fetch all players from Supabase
 */
export async function fetchPlayersFromSupabase(): Promise<Player[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("open_coaching_players")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  // Map lowcase columns to JS camelCase properties
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    position: row.position,
    age: row.age,
    positives: row.positives || "",
    negatives: row.negatives || "",
    status: row.status,
    number: row.number || "",
    photoUrl: row.photourl !== undefined ? row.photourl : row.photoUrl || undefined,
    lateralidad: row.lateralidad || "Derecho",
  })) as Player[];
}

/**
 * Helper to convert base64 image strings to a binary Blob for Supabase Storage uploading.
 */
function base64ToBlob(base64Data: string): Blob {
  const parts = base64Data.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const byteCharacters = atob(parts[1]);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mime });
}

/**
 * Upsert a single player in Supabase, uploading any base64 photo to storage
 */
export async function upsertPlayerInSupabase(player: Player): Promise<string | undefined> {
  if (!supabase) return player.photoUrl;

  let finalPhotoUrl = player.photoUrl;

  // Auto-upload any local base64/data URI image to Supabase Storage Bucket 'player-photos'
  if (player.photoUrl && player.photoUrl.startsWith("data:image/")) {
    try {
      const blob = base64ToBlob(player.photoUrl);
      const mimeType = player.photoUrl.split(';')[0].split(':')[1] || 'image/jpeg';
      const fileExt = mimeType.split('/')[1] || 'jpeg';
      const fileName = `${player.id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("player-photos")
        .upload(fileName, blob, {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: true
        });

      if (error) {
        console.warn("No se pudo subir la foto a Supabase Storage. ¿Has creado el bucket 'player-photos' o asignado políticas?:", error);
      } else if (data) {
        const { data: urlData } = supabase.storage
          .from("player-photos")
          .getPublicUrl(fileName);
        
        if (urlData?.publicUrl) {
          finalPhotoUrl = urlData.publicUrl;
        }
      }
    } catch (e) {
      console.error("Error interno al convertir/subir base64 a Storage:", e);
    }
  }

  const dbRow = {
    id: player.id,
    name: player.name,
    position: player.position,
    age: player.age,
    positives: player.positives,
    negatives: player.negatives,
    status: player.status,
    number: player.number || null,
    photourl: finalPhotoUrl || null,
    lateralidad: player.lateralidad || "Derecho",
  };

  const { error } = await supabase
    .from("open_coaching_players")
    .upsert(dbRow, { onConflict: "id" });

  if (error) {
    throw error;
  }

  return finalPhotoUrl;
}

/**
 * Delete a player from Supabase
 */
export async function deletePlayerInSupabase(playerId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("open_coaching_players")
    .delete()
    .eq("id", playerId);

  if (error) {
    throw error;
  }
}

/**
 * Perform a full bilateral sync:
 * Sends local players that are missing or newer to Supabase,
 * and fetches missing ones from Supabase, returning a merged list.
 */
export async function syncLocalWithSupabase(localPlayers: Player[]): Promise<Player[]> {
  if (!supabase) return localPlayers;

  // 1. Fetch remote data
  const remotePlayers = await fetchPlayersFromSupabase();
  const remoteMap = new Map(remotePlayers.map((p) => [p.id, p]));
  const localMap = new Map(localPlayers.map((p) => [p.id, p]));

  // 2. Upload players present locally but missing in Supabase
  const uploadPromises: Promise<any>[] = [];
  localPlayers.forEach((p) => {
    if (!remoteMap.has(p.id)) {
      uploadPromises.push(upsertPlayerInSupabase(p));
    }
  });

  if (uploadPromises.length > 0) {
    await Promise.all(uploadPromises);
  }

  // 3. Re-fetch current remote state to ensure we get the fully merged list
  const fullySyncedRemote = await fetchPlayersFromSupabase();
  return fullySyncedRemote;
}

/**
 * Fetch a setting by key from Supabase
 */
export async function getSettingFromSupabase(key: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("open_coaching_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data?.value || null;
  } catch (err: any) {
    console.warn(`Error getting setting "${key}" from Supabase:`, err.message || err);
    return null;
  }
}

/**
 * Save a setting by key in Supabase. Auto-uploads base64 data to storage.
 */
export async function saveSettingInSupabase(key: string, value: string): Promise<string> {
  if (!supabase) return value;

  let finalValue = value;

  // Auto-upload base64 logo image to Supabase Storage Bucket 'player-photos'
  if (value && value.startsWith("data:image/")) {
    try {
      const blob = base64ToBlob(value);
      const mimeType = value.split(";")[0].split(":")[1] || "image/png";
      const fileExt = mimeType.split("/")[1] || "png";
      const fileName = `team-${key}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("player-photos")
        .upload(fileName, blob, {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: true
        });

      if (error) {
        console.warn("No se pudo subir la configuración a Supabase Storage:", error);
      } else if (data) {
        const { data: urlData } = supabase.storage
          .from("player-photos")
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          finalValue = urlData.publicUrl;
        }
      }
    } catch (e) {
      console.error("Error al subir la configuración a Storage:", e);
    }
  }

  try {
    const { error } = await supabase
      .from("open_coaching_settings")
      .upsert({ key, value: finalValue }, { onConflict: "key" });

    if (error) {
      throw error;
    }
  } catch (err: any) {
    console.error(`Error saving setting "${key}" in Supabase:`, err.message || err);
  }

  return finalValue;
}
