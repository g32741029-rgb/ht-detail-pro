import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

type AdminSession = { admin?: boolean };

function sessionConfig() {
  return {
    password: process.env["ADMIN_SESSION_SECRET"]!,
    name: "ht-admin-session",
    maxAge: 60 * 60 * 12,
  };
}

async function requireAdminSession() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data?.admin) throw new Error("Acesso negado. Faça login novamente.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => ({ password: String(data?.password ?? "") }))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"] ?? "";
    if (!expected || data.password !== expected) {
      return { ok: false as const };
    }
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ admin: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true };
});

export const adminMe = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { authenticated: Boolean(session.data?.admin) };
});

export const adminBookings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const supabase = await admin();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminUpdateBooking = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      status?: string;
      price?: number | null;
      admin_notes?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdminSession();
    const supabase = await admin();
    const { id, ...patch } = data;
    const { error } = await supabase
      .from("bookings")
      .update(patch as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAvailability = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const supabase = await admin();
  const [dates, slots] = await Promise.all([
    supabase.from("blocked_dates").select("*").order("blocked_date"),
    supabase.from("blocked_slots").select("*").order("blocked_date"),
  ]);
  if (dates.error) throw new Error(dates.error.message);
  if (slots.error) throw new Error(slots.error.message);
  return { dates: dates.data ?? [], slots: slots.data ?? [] };
});

export const adminBlockDate = createServerFn({ method: "POST" })
  .inputValidator((data: { date: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const supabase = await admin();
    const { error } = await supabase.from("blocked_dates").insert({ blocked_date: data.date });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUnblockDate = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const supabase = await admin();
    const { error } = await supabase.from("blocked_dates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleSlot = createServerFn({ method: "POST" })
  .inputValidator((data: { date: string; time: string; id?: string | null }) => data)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const supabase = await admin();
    if (data.id) {
      const { error } = await supabase.from("blocked_slots").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("blocked_slots")
        .insert({ blocked_date: data.date, blocked_time: data.time });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
