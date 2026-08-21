import { Link, createFileRoute } from "@tanstack/react-router";
import { Bike, Car, CheckCircle2, Clock, Droplets, ShieldCheck, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LogoBadge } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/lib/ht";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HT Detail — Estética Automotiva em Castanhal, PA" },
      {
        name: "description",
        content:
          "Vitrificação, polimento, lavagem detalhada e higienização para carros e motos em Castanhal, Pará. Agende seu horário com a HT Detail.",
      },
      { property: "og:title", content: "HT Detail — Estética Automotiva em Castanhal, PA" },
      {
        property: "og:description",
        content: "Seu veículo merece o melhor cuidado. Agende seu horário com a HT Detail.",
      },
    ],
  }),
  component: Index,
});

const diferenciais = [
  { icon: Sparkles, title: "Atendimento personalizado", text: "Cada veículo recebe um plano sob medida." },
  { icon: ShieldCheck, title: "Cuidado profissional", text: "Técnica e segurança em cada etapa." },
  { icon: Droplets, title: "Produtos de qualidade", text: "Materiais premium de estética automotiva." },
  { icon: Car, title: "Carros e motos", text: "Serviços completos para os dois." },
  { icon: CheckCircle2, title: "Atenção aos detalhes", text: "Acabamento impecável do início ao fim." },
  { icon: Clock, title: "Compromisso", text: "Prazo cumprido e satisfação garantida." },
];

function Index() {
  return (
    <AppShell>
      <section className="hero-bg -mx-4 -mt-4 rounded-b-3xl px-6 pb-10 pt-10 text-center">
        <LogoBadge size={72} />
        <h1 className="mt-6 font-display text-4xl font-bold uppercase leading-tight">
          Seu veículo merece o <span className="text-gradient-red">melhor cuidado</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          A HT Detail é especializada em estética automotiva e cuidados detalhados para carros e
          motos. Trabalhamos para devolver brilho, limpeza e aparência impecável ao seu veículo.
        </p>
        <p className="mt-4 text-sm font-medium">📍 {BUSINESS.city}</p>
        <Button asChild variant="hero" size="xl" className="mt-6 w-full max-w-sm">
          <Link to="/agendar">Agendar horário</Link>
        </Button>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3">
        <Link to="/servicos" className="surface-card p-4 transition-smooth hover:border-primary/60">
          <Car className="size-6 text-primary" />
          <h2 className="mt-2 font-display text-lg uppercase">Serviços para carros</h2>
          <p className="text-xs text-muted-foreground">Vitrificação, polimento e muito mais.</p>
        </Link>
        <Link to="/servicos" className="surface-card p-4 transition-smooth hover:border-primary/60">
          <Bike className="size-6 text-primary" />
          <h2 className="mt-2 font-display text-lg uppercase">Serviços para motos</h2>
          <p className="text-xs text-muted-foreground">Brilho e proteção para a sua moto.</p>
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold uppercase">Por que escolher a HT Detail?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {diferenciais.map(({ icon: Icon, title, text }) => (
            <div key={title} className="surface-card flex gap-3 p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card mt-10 p-6 text-center">
        <h2 className="font-display text-2xl font-bold uppercase">Pronto para começar?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Solicite seu orçamento em menos de um minuto.
        </p>
        <Button asChild variant="hero" size="xl" className="mt-4 w-full">
          <Link to="/agendar">Agendar horário</Link>
        </Button>
      </section>
    </AppShell>
  );
}
