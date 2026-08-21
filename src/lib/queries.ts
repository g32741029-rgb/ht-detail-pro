import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Service = {
  id: string;
  name: string;
  category: "carro" | "moto";
  description: string;
  duration_minutes: number;
  image_url: string | null;
  sort_order: number;
  active: boolean;
};

export const servicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: async (): Promise<Service[]> => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Service[];
  },
});

export const allServicesQuery = queryOptions({
  queryKey: ["services", "all"],
  queryFn: async (): Promise<Service[]> => {
    const { data, error } = await supabase.from("services").select("*").order("sort_order");
    if (error) throw error;
    return (data ?? []) as Service[];
  },
});

export const galleryQuery = queryOptions({
  queryKey: ["gallery"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const blockedDatesQuery = queryOptions({
  queryKey: ["blocked_dates"],
  queryFn: async () => {
    const { data, error } = await supabase.from("blocked_dates").select("*").order("blocked_date");
    if (error) throw error;
    return data ?? [];
  },
});

export function takenSlotsQuery(date: string | null) {
  return queryOptions({
    queryKey: ["taken_slots", date],
    enabled: Boolean(date),
    queryFn: async (): Promise<string[]> => {
      if (!date) return [];
      const { data, error } = await supabase.rpc("get_taken_slots", { _date: date });
      if (error) throw error;
      return ((data ?? []) as { slot: string }[]).map((row) =>
        typeof row === "string" ? row : row.slot,
      );
    },
  });
}

export const bookingsQuery = queryOptions({
  queryKey: ["bookings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .order("booking_time");
    if (error) throw error;
    return data ?? [];
  },
});

export const blockedSlotsQuery = queryOptions({
  queryKey: ["blocked_slots"],
  queryFn: async () => {
    const { data, error } = await supabase.from("blocked_slots").select("*").order("blocked_date");
    if (error) throw error;
    return data ?? [];
  },
});
