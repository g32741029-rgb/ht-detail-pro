export const BUSINESS = {
  name: "HT Detail",
  city: "Castanhal - Pará",
  whatsapp: "5591985774049",
  whatsappDisplay: "+55 91 8577-4049",
  instagram: "https://instagram.com/htdetail",
  maps: "https://www.google.com/maps/search/?api=1&query=Castanhal+Para",
} as const;

export const MORNING_SLOTS = ["08:00", "09:00", "10:00", "11:00"] as const;
export const AFTERNOON_SLOTS = ["14:00", "15:00", "16:00", "17:00"] as const;
export const ALL_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

export type VehicleType = "carro" | "moto";

export const STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
  aguardando_orcamento: { label: "Aguardando orçamento", emoji: "🟡" },
  orcamento_enviado: { label: "Orçamento enviado", emoji: "🔵" },
  aguardando_confirmacao: { label: "Aguardando confirmação do cliente", emoji: "🟠" },
  confirmado: { label: "Agendamento confirmado", emoji: "🟢" },
  concluido: { label: "Serviço concluído", emoji: "⚫" },
  cancelado: { label: "Cancelado", emoji: "🔴" },
};

export const GALLERY_CATEGORIES = [
  "Antes e depois",
  "Carros",
  "Motos",
  "Limpeza interna",
  "Polimento",
  "Detalhamento",
] as const;

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getDay()] ?? "";
}

export function formatDateBR(iso: string): string {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

export type BookingDraft = {
  vehicleType: VehicleType | null;
  serviceId: string | null;
  serviceName: string;
  customService: string;
  vehicleModel: string;
  date: string | null;
  time: string | null;
  name: string;
  phone: string;
};

export function buildWhatsappMessage(draft: BookingDraft): string {
  const lines = [
    "Novo agendamento - HT Detail",
    "",
    `Serviço: ${draft.serviceName}`,
    `Veículo: ${draft.vehicleType === "moto" ? "Moto" : "Carro"}`,
    `Modelo: ${draft.vehicleModel}`,
    "Orçamento: A confirmar pela HT Detail",
    `Data: ${draft.date ? `${weekdayName(draft.date)}, ${formatDateBR(draft.date)}` : ""}`,
    `Horário: ${draft.time ?? ""}`,
    `Cliente: ${draft.name}`,
    `Telefone: ${draft.phone}`,
  ];
  if (draft.customService.trim()) {
    lines.push("", `Descrição adicional: ${draft.customService.trim()}`);
  }
  return lines.join("\n");
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}
