import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarOff, Loader2, LogOut, MessageCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ALL_SLOTS, STATUS_LABELS, formatDateBR, weekdayName } from "@/lib/ht";
import { blockedDatesQuery, blockedSlotsQuery, bookingsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel administrativo — HT Detail" },
      {
        name: "description",
        content: "Gerencie solicitações, orçamentos e disponibilidade da HT Detail.",
      },
      { property: "og:title", content: "Painel administrativo — HT Detail" },
      { property: "og:description", content: "Gestão de agendamentos da HT Detail." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Booking = {
  id: string;
  customer_name: string;
  customer_phone: string;
  vehicle_type: string;
  vehicle_model: string;
  service_name: string;
  custom_service: string | null;
  booking_date: string;
  booking_time: string;
  status: BookingStatus;
  price: number | null;
  admin_notes: string | null;
};

type BookingStatus =
  | "aguardando_orcamento"
  | "orcamento_enviado"
  | "aguardando_confirmacao"
  | "confirmado"
  | "concluido"
  | "cancelado";

type BookingPatch = {
  status?: BookingStatus;
  price?: number | null;
  admin_notes?: string | null;
};

const STATUS_ORDER = Object.keys(STATUS_LABELS) as BookingStatus[];

function AdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"solicitacoes" | "disponibilidade">("solicitacoes");
  const [filter, setFilter] = useState<string>("todos");
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin");
      if (!active) return;
      setIsAdmin((roles ?? []).length > 0);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const { data: bookings = [] } = useQuery({ ...bookingsQuery, enabled: isAdmin });
  const { data: blockedDates = [] } = useQuery({ ...blockedDatesQuery, enabled: isAdmin });
  const { data: blockedSlots = [] } = useQuery({ ...blockedSlotsQuery, enabled: isAdmin });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["blocked_dates"] });
    queryClient.invalidateQueries({ queryKey: ["blocked_slots"] });
    queryClient.invalidateQueries({ queryKey: ["taken_slots"] });
  };

  const updateBooking = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: BookingPatch }) => {
      const { error } = await supabase.from("bookings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação atualizada.");
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Erro ao atualizar."),
  });

  const blockDate = useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase.from("blocked_dates").insert({ blocked_date: date });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Data bloqueada.");
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Erro ao bloquear."),
  });

  const unblockDate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleSlot = useMutation({
    mutationFn: async ({ date, time, id }: { date: string; time: string; id?: string | undefined }) => {
      if (id) {
        const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blocked_slots")
          .insert({ blocked_date: date, blocked_time: time });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Erro ao atualizar horário."),
  });

  const [slotDate, setSlotDate] = useState("");
  const [newBlockedDate, setNewBlockedDate] = useState("");

  if (!ready) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="surface-card mt-8 p-8 text-center">
          <h1 className="font-display text-xl uppercase">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta não possui permissão de administrador.
          </p>
          <Button
            variant="steel"
            className="mt-5"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </AppShell>
    );
  }

  const list = (bookings as Booking[]).filter((b) => filter === "todos" || b.status === filter);
  const blockedSlotsTyped = blockedSlots as {
    id: string;
    blocked_date: string;
    blocked_time: string;
  }[];

  return (
    <AppShell>
      <div className="flex items-start justify-between">
        <SectionTitle title="Painel" subtitle="Gerencie solicitações e disponibilidade." />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sair"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="size-5" />
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {(
          [
            ["solicitacoes", "Solicitações"],
            ["disponibilidade", "Disponibilidade"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-xl border border-border bg-secondary py-2.5 text-sm font-semibold transition-smooth",
              tab === key && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "solicitacoes" && (
        <>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {["todos", ...STATUS_ORDER].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={cn(
                  "shrink-0 rounded-full border border-border bg-secondary px-3 py-1.5 text-[11px] font-semibold transition-smooth",
                  filter === s && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {s === "todos" ? "Todos" : STATUS_LABELS[s]?.label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="surface-card p-8 text-center text-sm text-muted-foreground">
              Nenhuma solicitação neste filtro.
            </p>
          ) : (
            <div className="space-y-3">
              {list.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onUpdate={(patch) => updateBooking.mutate({ id: b.id, patch })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "disponibilidade" && (
        <div className="space-y-6">
          <div className="surface-card space-y-3 p-4">
            <h2 className="font-display text-lg uppercase">Bloquear dia inteiro</h2>
            <div className="flex gap-2">
              <Input
                type="date"
                value={newBlockedDate}
                onChange={(e) => setNewBlockedDate(e.target.value)}
              />
              <Button
                disabled={!newBlockedDate || blockDate.isPending}
                onClick={() => {
                  blockDate.mutate(newBlockedDate);
                  setNewBlockedDate("");
                }}
              >
                <CalendarOff className="size-4" /> Bloquear
              </Button>
            </div>
            <div className="space-y-2">
              {(blockedDates as { id: string; blocked_date: string }[]).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
                >
                  <span>{formatDateBR(d.blocked_date)}</span>
                  <button
                    type="button"
                    aria-label="Desbloquear data"
                    onClick={() => unblockDate.mutate(d.id)}
                  >
                    <Trash2 className="size-4 text-primary" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card space-y-3 p-4">
            <h2 className="font-display text-lg uppercase">Bloquear horários</h2>
            <div>
              <Label htmlFor="slot-date">Data</Label>
              <Input
                id="slot-date"
                type="date"
                className="mt-2"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
              />
            </div>
            {slotDate ? (
              <div className="grid grid-cols-4 gap-2">
                {ALL_SLOTS.map((slot) => {
                  const found = blockedSlotsTyped.find(
                    (s) => s.blocked_date === slotDate && s.blocked_time.slice(0, 5) === slot,
                  );
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        toggleSlot.mutate({ date: slotDate, time: slot, id: found?.id })
                      }
                      className={cn(
                        "rounded-xl border border-border bg-secondary py-2.5 text-sm font-semibold transition-smooth",
                        found && "border-primary bg-primary text-primary-foreground line-through",
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Escolha uma data para liberar ou bloquear horários específicos.
              </p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function BookingCard({
  booking,
  onUpdate,
}: {
  booking: Booking;
  onUpdate: (patch: BookingPatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(booking.price ? String(booking.price) : "");
  const [notes, setNotes] = useState(booking.admin_notes ?? "");
  const status = STATUS_LABELS[booking.status];
  const phoneDigits = booking.customer_phone.replace(/\D/g, "");

  return (
    <div className="surface-card p-4">
      <button type="button" className="w-full text-left" onClick={() => setOpen(!open)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg uppercase">{booking.customer_name}</h3>
            <p className="text-sm text-muted-foreground">
              {booking.service_name} · {booking.vehicle_model}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {weekdayName(booking.booking_date)}, {formatDateBR(booking.booking_date)} às{" "}
              {booking.booking_time.slice(0, 5)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px]">
            {status?.emoji} {status?.label}
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {booking.custom_service ? (
            <p className="text-xs text-muted-foreground">
              Descrição do cliente: {booking.custom_service}
            </p>
          ) : null}
          <p className="text-sm">Telefone: {booking.customer_phone}</p>

          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onUpdate({ status: s })}
                className={cn(
                  "rounded-full border border-border bg-secondary px-3 py-1.5 text-[11px] font-semibold transition-smooth",
                  booking.status === s && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {STATUS_LABELS[s]?.emoji} {STATUS_LABELS[s]?.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`price-${booking.id}`}>Valor (R$)</Label>
              <Input
                id={`price-${booking.id}`}
                inputMode="decimal"
                className="mt-1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() =>
                  onUpdate({
                    price: price.trim() ? Number(price.replace(",", ".")) : null,
                    admin_notes: notes.trim() || null,
                  })
                }
              >
                Salvar
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor={`notes-${booking.id}`}>Observações internas</Label>
            <Textarea
              id={`notes-${booking.id}`}
              className="mt-1"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button asChild variant="steel" className="w-full">
            <a
              href={`https://wa.me/55${phoneDigits.replace(/^55/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-4" /> Falar com o cliente
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
