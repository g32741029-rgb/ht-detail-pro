import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { useState } from "react";

import { AppShell, SectionTitle } from "@/components/AppShell";
import { GALLERY_CATEGORIES } from "@/lib/ht";
import { galleryQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/galeria")({
  head: () => ({
    meta: [
      { title: "Nossos Resultados — HT Detail" },
      {
        name: "description",
        content:
          "Veja antes e depois, polimentos, limpezas internas e detalhamentos feitos pela HT Detail em Castanhal, Pará.",
      },
      { property: "og:title", content: "Nossos Resultados — HT Detail" },
      {
        property: "og:description",
        content: "Galeria de resultados de estética automotiva da HT Detail.",
      },
    ],
  }),
  component: GaleriaPage,
});

type GalleryImage = { id: string; image_url: string; category: string; description: string };

function GaleriaPage() {
  const { data = [] } = useQuery(galleryQuery);
  const [filter, setFilter] = useState<string>("Todos");
  const images = data as GalleryImage[];
  const visible = filter === "Todos" ? images : images.filter((i) => i.category === filter);

  return (
    <AppShell>
      <SectionTitle
        title="Nossos resultados"
        subtitle="Cada detalhe conta. Confira alguns dos nossos trabalhos."
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {["Todos", ...GALLERY_CATEGORIES].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={cn(
              "shrink-0 rounded-full border border-border bg-secondary px-4 py-2 text-xs font-semibold transition-smooth",
              filter === cat && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="surface-card mt-6 p-10 text-center">
          <ImageOff className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Ainda não há fotos nesta categoria. Em breve novos resultados da HT Detail.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {visible.map((img) => (
            <figure key={img.id} className="surface-card overflow-hidden">
              <img
                src={img.image_url}
                alt={img.description || `Resultado HT Detail — ${img.category}`}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <figcaption className="p-3">
                <span className="text-[11px] uppercase text-primary">{img.category}</span>
                {img.description ? (
                  <p className="text-xs text-muted-foreground">{img.description}</p>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </AppShell>
  );
}
