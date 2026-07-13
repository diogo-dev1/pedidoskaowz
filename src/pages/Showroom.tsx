import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import KnifeViewer360 from "@/components/KnifeViewer360";

interface Knife {
  id: string;
  name: string;
  video_url: string;
  created_at: string;
}

const BUCKET = "knife-videos";

interface KnifeWithUrl extends Knife {
  signedUrl?: string;
}

export default function Showroom() {
  const [knives, setKnives] = useState<KnifeWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("knives" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        setLoading(false);
        return;
      }
      const list = (data || []) as unknown as Knife[];
      const withUrls = await Promise.all(
        list.map(async (k) => {
          const { data: s } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(k.video_url, 60 * 60 * 6);
          return { ...k, signedUrl: s?.signedUrl };
        })
      );
      setKnives(withUrls);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-10 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Showroom 360°
          </h1>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto text-sm sm:text-base">
            Explore cada faca em detalhes. Arraste para girar e descobrir cada ângulo.
          </p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
              >
                <div className="aspect-square bg-zinc-800 animate-pulse" />
                <div className="p-4">
                  <div className="h-4 w-1/2 bg-zinc-800 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : knives.length === 0 ? (
          <p className="text-center text-zinc-500">
            Nenhuma faca disponível no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {knives.map((k) => (
              <div
                key={k.id}
                className="group rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden shadow-xl hover:border-zinc-700 transition-colors"
              >
                <div className="relative aspect-[3/4]">
                  {k.signedUrl ? (
                    <KnifeViewer360
                      videoUrl={k.signedUrl}
                      nome={k.name}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-900" />
                  )}
                  <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/10 text-[11px] uppercase tracking-widest text-white/80">
                    Arraste para interagir ↔
                  </div>
                </div>
                <div className="p-4 border-t border-zinc-800">
                  <h3 className="font-semibold text-lg">{k.name}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
