import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarOff, Loader2, Lock, LogOut, MessageCircle, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  adminAvailability,
  adminBlockDate,
  adminBookings,
  adminLogin,
  adminLogout,
  adminMe,
  adminToggleSlot,
  adminUnblockDate,
  adminUpdateBooking,
} from "@/lib/admin.functions";
import { ALL_SLOTS, formatDateBR, toISODate, weekdayName } from "@/lib/ht";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel administrativo — HT Detail" },
      {
        name: "description",
        content: "Gerencie agendamentos, status e disponibilidade da HT Detail.",
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
  status: string;
  price: number | null;
  admin_notes: string | null;
  created_at?: string;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  aguardando_orcamento: {
    label: "Pendente",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  },
  orcamento_enviado: {
    label: "Orçamento enviado",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  },
  aguardando_confirmacao: {
    label: "Aguardando cliente",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/40",
  },
  confirmado: {
    label: "Confirmado",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  },
  concluido: {
    label: "Concluído",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-500/15 text-red-400 border-red-500/40",
  },
  faltou: {
    label: "Faltou",
    className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
  },
};

const STATUS_ORDER = Object.keys(STATUS_META);

function AdminPage() {
  const me = useServerFn(adminMe);
  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => me() });

  if (session.isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!session.data?.authenticated) return <LoginScreen onDone={() => session.refetch()} />;

  return <Dashboard onLogout={() => session.refetch()} />;
}

function LoginScreen({ onDone }: { onDone: () => void }) {
  const login = useServerFn(adminLogin);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({ data: { password } });
      if (!result.ok) {
        toast.error("Senha incorreta.");
        return;
      }
      onDone();
    } catch {
      toast.error("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto mt-10 max-w-sm text-center">
        <h1 className="font-display text-2xl font-bold uppercase">Painel HT Detail</h1>
        <p className="mt-1 text-sm text-muted-foreground">Área restrita da equipe.</p>
      </div>
      <form onSubmit={submit} className="surface-card mx-auto mt-6 max-w-sm space-y-4 p-5">
        <div>
          <Label htmlFor="admin-password">Senha de acesso</Label>
          <Input
            id="admin-password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          Entrar
        </Button>
      </form>
    </AppShell>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(adminBookings);
  const availabilityFn = useServerFn(adminAvailability);
  const updateFn = useServerFn(adminUpdateBooking);
  const blockDateFn = useServerFn(adminBlockDate);
  const unblockDateFn = useServerFn(adminUnblockDate);
  const toggleSlotFn = useServerFn(adminToggleSlot);
  const logoutFn = useServerFn(adminLogout);

  const [tab, setTab] = useState<"hoje" | "proximos" | "historico" | "disponibilidade">("hoje");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<Booking | null>(null);

  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => (await listFn()) as Booking[],
  });
  const availability = useQuery({
    queryKey: ["admin-availability"],
    queryFn: () => availabilityFn(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-availability"] });
    queryClient.invalidateQueries({ queryKey: ["taken_slots"] });
    queryClient.invalidateQueries({ queryKey: ["blocked_dates"] });
  };

  const update = useMutation({
    mutationFn: (data: {
      id: string;
      status?: string;
      price?: number | null;
      admin_notes?: string | null;
    }) => updateFn({ data }),
    onSuccess: () => {
      toast.success("Agendamento atualizado.");
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Erro ao atualizar."),
  });

  const blockDate = useMutation({
    mutationFn: (date: string) => blockDateFn({ data: { date } }),
    onSuccess: () => {
      toast.success("Data bloqueada.");
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Erro ao bloquear."),
  });

  const unblockDate = useMutation({
    mutationFn: (id: string) => unblockDateFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const toggleSlot = useMutation({
    mutationFn: (data: { date: string; time: string; id?: string | null }) =>
      toggleSlotFn({ data }),
    onSuccess: invalidate,
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Erro ao atualizar horário."),
  });

  const today = toISODate(new Date());
  const all = bookings.data ?? [];

  const lists = useMemo(() => {
    const byTime = (a: Booking, b: Booking) =>
      `${a.booking_date} ${a.booking_time}`.localeCompare(`${b.booking_date} ${b.booking_time}`);
    const hoje = all.filter((b) => b.booking_date === today).sort(byTime);
    let proximos = all.filter((b) => b.booking_date > today).sort(byTime);
    if (from) proximos = proximos.filter((b) => b.booking_date >= from);
    if (to) proximos = proximos.filter((b) => b.booking_date <= to);
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    const historico = all.filter((b) => {
      if (!term) return true;
      return (
        b.customer_name.toLowerCase().includes(term) ||
        (digits.length > 0 && b.customer_phone.replace(/\D/g, "").includes(digits))
      );
    });
    return { hoje, proximos, historico };
  }, [all, today, from, to, search]);

  const [slotDate, setSlotDate] = useState("");
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const blockedDates = (availability.data?.dates ?? []) as { id: string; blocked_date: string }[];
  const blockedSlots = (availability.data?.slots ?? []) as {
    id: string;
    blocked_date: string;
    blocked_time: string;
  }[];

  return (
    <AppShell>
      <div className="flex items-start justify-between">
        <SectionTitle title="Painel" subtitle="Agendamentos, status e disponibilidade." />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sair"
          onClick={async () => {
            await logoutFn({});
            onLogout();
          }}
        >
          <LogOut className="size-5" />
        </Button>
      </div>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(
          [
            ["hoje", "Hoje"],
            ["proximos", "Próximos"],
            ["historico", "Histórico"],
            ["disponibilidade", "Disponibilidade"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "shrink-0 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold transition-smooth",
              tab === key && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {bookings.isLoading && tab !== "disponibilidade" ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : null}

      {tab === "hoje" && (
        <BookingTable
          rows={lists.hoje}
          empty="Nenhum agendamento para hoje."
          onStatus={(id, status) => update.mutate({ id, status })}
          onDetail={setDetail}
        />
      )}

      {tab === "proximos" && (
        <>
          <div className="surface-card mb-3 grid grid-cols-2 gap-2 p-3">
            <div>
              <Label htmlFor="from">De</Label>
              <Input
                id="from"
                type="date"
                className="mt-1"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to">Até</Label>
              <Input
                id="to"
                type="date"
                className="mt-1"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <BookingTable
            rows={lists.proximos}
            empty="Nenhum agendamento futuro no período."
            onStatus={(id, status) => update.mutate({ id, status })}
            onDetail={setDetail}
          />
        </>
      )}

      {tab === "historico" && (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <BookingTable
            rows={lists.historico}
            empty="Nenhum registro encontrado."
            onStatus={(id, status) => update.mutate({ id, status })}
            onDetail={setDetail}
          />
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
              {blockedDates.map((d) => (
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
                  const found = blockedSlots.find(
                    (s) => s.blocked_date === slotDate && s.blocked_time.slice(0, 5) === slot,
                  );
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        toggleSlot.mutate({ date: slotDate, time: slot, id: found?.id ?? null })
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

      <DetailDialog
        booking={detail}
        onClose={() => setDetail(null)}
        onSave={(patch) => {
          if (!detail) return;
          update.mutate({ id: detail.id, ...patch });
          setDetail(null);
        }}
      />
    </AppShell>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: string) => void;
}) {
  const meta = STATUS_META[value];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn("h-8 w-[150px] border text-xs font-semibold", meta?.className)}
        aria-label="Alterar status"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STATUS_META[s]?.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BookingTable({
  rows,
  empty,
  onStatus,
  onDetail,
}: {
  rows: Booking[];
  empty: string;
  onStatus: (id: string, status: string) => void;
  onDetail: (booking: Booking) => void;
}) {
  if (rows.length === 0) {
    return <p className="surface-card p-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((b) => (
        <div key={b.id} className="surface-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg uppercase">{b.customer_name}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {b.service_name} · {b.vehicle_model}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{b.customer_phone}</p>
              <p className="text-xs text-muted-foreground">
                {weekdayName(b.booking_date)}, {formatDateBR(b.booking_date)} às{" "}
                {b.booking_time.slice(0, 5)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusSelect value={b.status} onChange={(status) => onStatus(b.id, status)} />
              <Button variant="steel" size="sm" onClick={() => onDetail(b)}>
                Detalhes
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailDialog({
  booking,
  onClose,
  onSave,
}: {
  booking: Booking | null;
  onClose: () => void;
  onSave: (patch: { price: number | null; admin_notes: string | null }) => void;
}) {
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (booking && booking.id !== loadedId) {
    setLoadedId(booking.id);
    setPrice(booking.price ? String(booking.price) : "");
    setNotes(booking.admin_notes ?? "");
  }

  const phoneDigits = booking?.customer_phone.replace(/\D/g, "") ?? "";

  return (
    <Dialog open={Boolean(booking)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">{booking?.customer_name}</DialogTitle>
        </DialogHeader>
        {booking ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {booking.service_name} · {booking.vehicle_type} · {booking.vehicle_model}
            </p>
            <p>
              {formatDateBR(booking.booking_date)} às {booking.booking_time.slice(0, 5)}
            </p>
            <p>Telefone: {booking.customer_phone}</p>
            {booking.custom_service ? (
              <p className="text-muted-foreground">Observações do cliente: {booking.custom_service}</p>
            ) : null}

            <div>
              <Label htmlFor="detail-price">Valor (R$)</Label>
              <Input
                id="detail-price"
                inputMode="decimal"
                className="mt-1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="detail-notes">Observações internas</Label>
              <Textarea
                id="detail-notes"
                className="mt-1"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={() =>
                onSave({
                  price: price.trim() ? Number(price.replace(",", ".")) : null,
                  admin_notes: notes.trim() || null,
                })
              }
            >
              Salvar
            </Button>
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
