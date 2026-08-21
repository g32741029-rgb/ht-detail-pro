import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, Instagram, MapPin, MessageCircle, Navigation } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LogoBadge } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { BUSINESS, whatsappUrl } from "@/lib/ht";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — HT Detail Castanhal, PA" },
      {
        name: "description",
        content:
          "Fale com a HT Detail pelo WhatsApp, siga no Instagram ou veja como chegar até nós em Castanhal, Pará.",
      },
      { property: "og:title", content: "Contato — HT Detail Castanhal, PA" },
      {
        property: "og:description",
        content: "WhatsApp, Instagram e localização da HT Detail em Castanhal, Pará.",
      },
    ],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  return (
    <AppShell>
      <div className="hero-bg -mx-4 -mt-4 rounded-b-3xl px-6 py-8 text-center">
        <LogoBadge size={90} />
        <h1 className="mt-4 font-display text-3xl font-bold uppercase">HT Detail</h1>
        <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 text-primary" /> {BUSINESS.city}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Button asChild variant="hero" size="xl" className="w-full">
          <a
            href={whatsappUrl("Olá, HT Detail! Gostaria de mais informações.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-5" /> Falar no WhatsApp
          </a>
        </Button>
        <Button asChild variant="steel" size="xl" className="w-full">
          <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer">
            <Instagram className="size-5" /> Instagram
          </a>
        </Button>
        <Button asChild variant="steel" size="xl" className="w-full">
          <a href={BUSINESS.maps} target="_blank" rel="noopener noreferrer">
            <Navigation className="size-5" /> Como chegar
          </a>
        </Button>
      </div>

      <div className="surface-card mt-6 overflow-hidden">
        <iframe
          title="Mapa da HT Detail em Castanhal, Pará"
          src="https://www.google.com/maps?q=Castanhal,+Par%C3%A1&output=embed"
          className="h-56 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="surface-card mt-6 space-y-3 p-5 text-sm">
        <p className="flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Segunda a sexta — 08:00 às 11:00 e 14:00 às
          17:00
        </p>
        <p className="flex items-center gap-2">
          <MessageCircle className="size-4 text-primary" /> WhatsApp {BUSINESS.whatsappDisplay}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" /> {BUSINESS.city}
        </p>
      </div>

      <Button asChild variant="hero" size="xl" className="mt-6 w-full">
        <Link to="/agendar">Agendar horário</Link>
      </Button>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link to="/auth" className="underline">
          Área do administrador
        </Link>
      </p>
    </AppShell>
  );
}
