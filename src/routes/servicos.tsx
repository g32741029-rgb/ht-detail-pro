import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bike, Car, Clock } from "lucide-react";


import { AppShell, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration } from "@/lib/ht";

import { servicesQuery, type Service } from "@/lib/queries";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — HT Detail Castanhal" },
      {
        name: "description",
        content:
          "Vitrificação, polimento, lavagem detalhada, higienização interna e pintura geral para carros e motos na HT Detail.",
      },
      { property: "og:title", content: "Serviços — HT Detail Castanhal" },
      {
        property: "og:description",
        content: "Conheça todos os serviços de estética automotiva da HT Detail.",
      },
    ],
  }),
  component: ServicosPage,
});

function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg uppercase">{service.name}</h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" /> {formatDuration(service.duration_minutes)}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
    </div>
  );
}

function ServicosPage() {
  const { data, isLoading } = useQuery(servicesQuery);
  const [activeTab, setActiveTab] = useState("carro");
  const carros = (data ?? []).filter((s) => s.category === "carro");
  const motos = (data ?? []).filter((s) => s.category === "moto");

  return (
    <AppShell>
      <SectionTitle
        title="Nossos serviços"
        subtitle="Cuidado premium para carros e motos, do básico ao detalhamento completo."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted p-1.5">
            <TabsTrigger
              value="carro"
              className="flex items-center justify-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:font-display data-[state=active]:uppercase data-[state=active]:text-primary-foreground"
            >
              <Car className="size-4" /> Carros
            </TabsTrigger>
            <TabsTrigger
              value="moto"
              className="flex items-center justify-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:font-display data-[state=active]:uppercase data-[state=active]:text-primary-foreground"
            >
              <Bike className="size-4" /> Motos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="carro" className="mt-4 animate-in fade-in-50 duration-300">
            <div className="space-y-3">
              {carros.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum serviço para carros disponível no momento.
                </p>
              ) : (
                carros.map((s) => <ServiceCard key={s.id} service={s} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="moto" className="mt-4 animate-in fade-in-50 duration-300">
            <div className="space-y-3">
              {motos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum serviço para motos disponível no momento.
                </p>
              ) : (
                motos.map((s) => <ServiceCard key={s.id} service={s} />)
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Button asChild variant="hero" size="xl" className="mt-8 w-full">
        <Link to="/agendar">Agendar horário</Link>
      </Button>
    </AppShell>
  );
}

