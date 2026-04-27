import { Hero } from "@/components/Hero";
import { ExplorerSection } from "@/components/explorer/ExplorerSection";
import { Dashboard } from "@/components/Dashboard";
import { HitScorePanel } from "@/components/HitScorePanel";
import { HitScoreHint } from "@/components/HitScoreHint";
import { HitScoreProvider } from "@/lib/hit-score";
import { loadMeta, loadPicks } from "@/lib/data";

export default async function Page() {
  const [picks, meta] = await Promise.all([loadPicks(), loadMeta()]);

  return (
    <HitScoreProvider latestSeason={meta.last_season}>
      <main className="relative">
        <Hero meta={meta} picks={picks} />
        <ExplorerSection picks={picks} />
        <Dashboard picks={picks} />
        <Footer />
      </main>
      <HitScorePanel picks={picks} />
      <HitScoreHint />
    </HitScoreProvider>
  );
}

function Footer() {
  return (
    <footer className="border-t rule-line-strong bg-navy-900">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
          Bears Draft Archive · Data via{" "}
          <a
            href="https://github.com/nflverse"
            target="_blank"
            className="text-orange-400 hover:text-orange-300"
          >
            nflverse / nflreadpy
          </a>
        </div>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
          Photos via ESPN &amp; Sleeper · Not affiliated with the NFL or Chicago Bears
        </div>
      </div>
    </footer>
  );
}
