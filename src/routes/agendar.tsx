import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bike,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  AFTERNOON_SLOTS,
  MORNING_SLOTS,
  buildWhatsappMessage,
  formatDateBR,
  formatDuration,
  formatPhone,
  isValidPhone,
  toISODate,
  weekdayName,
  whatsappUrl,
  type BookingDraft,
  type VehicleType,
} from "@/lib/ht";
import { blockedDatesQuery, servicesQuery, takenSlotsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar horário — HT Detail" },
      {
        name: "description",
        content:
          "Escolha o serviço, a data e o horário e solicite seu orçamento pelo WhatsApp com a HT Detail em Castanhal, PA.",
      },
      { property: "og:title", content: "Agendar horário — HT Detail" },
      {
        property: "og:description",
        content: "Solicite seu orçamento de estética automotiva em poucos toques.",
      },
    ],
  }),
  component: AgendarPage,
});

const STEPS = [
  "Escolha seu veículo",
  "Selecione o serviço desejado",
  "Modelo do veículo",
  "Escolha uma data disponível",
  "Selecione seu horário",
  "Seus dados",
  "Confira suas informações",
];

const emptyDraft: BookingDraft = {
  vehicleType: null,
  serviceId: null,
  serviceName: "",
  customService: "",
  vehicleModel: "",
  date: null,
  time: null,
  name: "",
  phone: "",
};

function AgendarPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [sent, setSent] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const queryClient = useQueryClient();

  const { data: services = [] } = useQuery(servicesQuery);
  const { data: blockedDates = [] } = useQuery(blockedDatesQuery);
  const { data: takenSlots = [] } = useQuery(takenSlotsQuery(draft.date));

  const filteredServices = useMemo(
    () => services.filter((s) => s.category === draft.vehicleType),
    [services, draft.vehicleType],
  );

  const blockedSet = useMemo(
    () => new Set((blockedDates as { blocked_date: string }[]).map((d) => d.blocked_date)),
    [blockedDates],
  );

  const takenSet = useMemo(
    () => new Set(takenSlots.map((t) => String(t).slice(0, 5))),
    [takenSlots],
  );

  const update = (patch: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_booking", {
        _customer_name: draft.name,
        _customer_phone: draft.phone,
        _vehicle_type: draft.vehicleType as VehicleType,
        _vehicle_model: draft.vehicleModel,
        _service_id: draft.serviceId,
        _service_name: draft.serviceName,
        _custom_service: draft.customService || null,
        _booking_date: draft.date!,
        _booking_time: draft.time!,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taken_slots"] });
      window.open(whatsappUrl(buildWhatsappMessage(draft)), "_blank", "noopener,noreferrer");
      setSent(true);
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message ?? "Não foi possível enviar sua solicitação.");
      queryClient.invalidateQueries({ queryKey: ["taken_slots"] });
    },
  });

  if (sent) {
    return (
      <AppShell>
        <div className="surface-card mt-8 p-8 text-center">
          <CheckCircle2 className="mx-auto size-14 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold uppercase">Solicitação enviada!</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sua solicitação foi enviada para a HT Detail. Aguarde o retorno com seu orçamento e a
            confirmação do horário.
          </p>
          <p className="mt-3 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            🟡 Status atual: aguardando orçamento. O horário só estará oficialmente confirmado após
            a confirmação da HT Detail.
          </p>
          <Button
            variant="steel"
            size="lg"
            className="mt-6 w-full"
            onClick={() => {
              setDraft(emptyDraft);
              setStep(0);
              setSent(false);
            }}
          >
            Nova solicitação
          </Button>
        </div>
      </AppShell>
    );
  }

  const canAdvance = () => {
    switch (step) {
      case 0:
        return Boolean(draft.vehicleType);
      case 1:
        return Boolean(draft.serviceName.trim());
      case 2:
        return draft.vehicleModel.trim().length >= 2;
      case 3:
        return Boolean(draft.date);
      case 4:
        return Boolean(draft.time);
      case 5:
        return draft.name.trim().length >= 2 && isValidPhone(draft.phone);
      default:
        return true;
    }
  };

  return (
    <AppShell>
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold uppercase">{STEPS[step]}</h1>
          <span className="text-xs text-muted-foreground">
            Etapa {step + 1} de {STEPS.length}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-[image:var(--gradient-red)] transition-smooth"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              { type: "carro" as const, label: "Carro", icon: Car, emoji: "🚗" },
              { type: "moto" as const, label: "Moto", icon: Bike, emoji: "🏍️" },
            ]
          ).map(({ type, label, icon: Icon, emoji }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                update({ vehicleType: type, serviceId: null, serviceName: "" });
                setStep(1);
              }}
              className={cn(
                "surface-card flex flex-col items-center gap-2 p-8 transition-smooth hover:border-primary",
                draft.vehicleType === type && "border-primary glow-red",
              )}
            >
              <span className="text-3xl">{emoji}</span>
              <Icon className="size-6 text-primary" />
              <span className="font-display text-xl uppercase">{label}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {filteredServices.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => update({ serviceId: s.id, serviceName: s.name })}
              className={cn(
                "surface-card w-full p-4 text-left transition-smooth hover:border-primary",
                draft.serviceId === s.id && "border-primary glow-red",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg uppercase">{s.name}</h3>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3" /> {formatDuration(s.duration_minutes)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
            </button>
          ))}

          <div className="surface-card p-4">
            <Label htmlFor="custom">Não encontrou o serviço que procura?</Label>
            <Textarea
              id="custom"
              className="mt-2"
              maxLength={500}
              placeholder="Descreva o serviço desejado"
              value={draft.customService}
              onChange={(e) => {
                const value = e.target.value;
                update({
                  customService: value,
                  ...(draft.serviceId ? {} : { serviceName: value.trim() ? "Serviço personalizado" : "" }),
                });
              }}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="surface-card space-y-3 p-4">
          <Label htmlFor="model">Qual é o modelo do seu veículo?</Label>
          <Input
            id="model"
            maxLength={100}
            placeholder={draft.vehicleType === "moto" ? "Ex.: Honda CG 160" : "Ex.: Honda Civic"}
            value={draft.vehicleModel}
            onChange={(e) => update({ vehicleModel: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Pode informar marca, modelo e ano — o que preferir.
          </p>
        </div>
      )}

      {step === 3 && (
        <CalendarPicker
          monthCursor={monthCursor}
          setMonthCursor={setMonthCursor}
          blockedSet={blockedSet}
          selected={draft.date}
          onSelect={(iso) => update({ date: iso, time: null })}
        />
      )}

      {step === 4 && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {draft.date ? `${weekdayName(draft.date)}, ${formatDateBR(draft.date)}` : ""}
          </p>
          {[
            { title: "Manhã", slots: MORNING_SLOTS },
            { title: "Tarde", slots: AFTERNOON_SLOTS },
          ].map(({ title, slots }) => (
            <div key={title}>
              <h2 className="mb-2 font-display text-lg uppercase text-primary">{title}</h2>
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const disabled = takenSet.has(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={disabled}
                      onClick={() => update({ time: slot })}
                      className={cn(
                        "rounded-xl border border-border bg-secondary py-3 text-sm font-semibold transition-smooth",
                        disabled && "cursor-not-allowed line-through opacity-40",
                        !disabled && "hover:border-primary",
                        draft.time === slot && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 5 && (
        <div className="surface-card space-y-4 p-4">
          <div>
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              className="mt-2"
              maxLength={100}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone / WhatsApp</Label>
            <Input
              id="phone"
              className="mt-2"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => update({ phone: formatPhone(e.target.value) })}
              placeholder="(91) 99999-9999"
            />
            {draft.phone && !isValidPhone(draft.phone) ? (
              <p className="mt-1 text-xs text-primary">Informe um telefone válido com DDD.</p>
            ) : null}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <div className="surface-card divide-y divide-border p-1">
            {[
              ["Tipo de veículo", draft.vehicleType === "moto" ? "Moto" : "Carro"],
              ["Serviço", draft.serviceName],
              ["Modelo do veículo", draft.vehicleModel],
              [
                "Data",
                draft.date ? `${weekdayName(draft.date)}, ${formatDateBR(draft.date)}` : "",
              ],
              ["Horário", draft.time ?? ""],
              ["Nome", draft.name],
              ["Telefone", draft.phone],
              ["Orçamento", "A confirmar pela HT Detail"],
              ...(draft.customService.trim()
                ? ([["Descrição adicional", draft.customService.trim()]] as [string, string][])
                : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-3 py-3 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
          </div>

          <Button
            variant="hero"
            size="xl"
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <MessageCircle className="size-5" />
            )}
            Solicitar orçamento pelo WhatsApp
          </Button>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="steel" size="lg" className="flex-1" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="size-4" />
            {step === 6 ? "Voltar e editar" : "Voltar"}
          </Button>
        )}
        {step < 6 && (
          <Button
            size="lg"
            className="flex-1"
            disabled={!canAdvance()}
            onClick={() => setStep(step + 1)}
          >
            Continuar
          </Button>
        )}
      </div>
    </AppShell>
  );
}

function CalendarPicker({
  monthCursor,
  setMonthCursor,
  blockedSet,
  selected,
  onSelect,
}: {
  monthCursor: Date;
  setMonthCursor: (d: Date) => void;
  blockedSet: Set<string>;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstDay.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = monthCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <span className="font-display text-lg uppercase">{monthLabel}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = new Date(year, month, i + 1);
          const iso = toISODate(date);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          const past = date < today;
          const disabled = weekend || past || blockedSet.has(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={cn(
                "aspect-square rounded-lg border border-border bg-secondary text-sm transition-smooth",
                disabled && "cursor-not-allowed border-transparent bg-transparent opacity-30",
                !disabled && "hover:border-primary",
                selected === iso && "border-primary bg-primary font-bold text-primary-foreground",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Atendemos de segunda a sexta-feira. Datas indisponíveis aparecem bloqueadas.
      </p>
    </div>
  );
}
