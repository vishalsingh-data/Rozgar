import Link from 'next/link';
import { Smartphone, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-black">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-6 sm:px-12">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">R</div>
          <span className="text-xl font-bold tracking-tight">Rozgar</span>
        </div>
        <Link href="/login">
          <Button variant="ghost" className="font-bold">Login</Button>
        </Link>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center sm:px-12">
        {/* Hero Badge */}
        <div className="mb-6 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
          <Shield className="size-3" />
          Bharat's Most Trusted Gig Network
        </div>

        {/* Hero Title */}
        <h1 className="max-w-3xl text-5xl font-black leading-[1.1] tracking-tight text-zinc-900 dark:text-white sm:text-7xl">
          Hire Local Help in <span className="text-primary">Seconds.</span>
        </h1>
        
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-500 sm:text-xl">
          Connecting verified workers with local jobs. From fan repair to daily labour, find the right help at the right price.
        </p>

        {/* CTA Section */}
        <div className="mt-12 flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/login">
            <Button size="lg" className="h-16 w-full rounded-2xl px-10 text-lg font-bold shadow-2xl shadow-primary/30 sm:w-auto">
              Get Started Now
              <ArrowRight className="ml-2 size-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="h-16 w-full rounded-2xl px-10 text-lg font-bold sm:w-auto">
            View Job Feed
          </Button>
        </div>

        {/* Value Props */}
        <div className="mt-20 grid grid-cols-1 gap-8 border-t border-zinc-100 pt-20 dark:border-zinc-800 sm:grid-cols-3">
          <ValueProp 
            title="AI Pricing" 
            desc="Fair labor costs calculated instantly for every job." 
          />
          <ValueProp 
            title="Local Network" 
            desc="Workers from your own neighborhood and nearby areas." 
          />
          <ValueProp 
            title="Verified Nodes" 
            desc="Every worker is verified by a trusted local partner." 
          />
        </div>
      </main>

      <footer className="py-12 text-center text-sm text-zinc-400">
        © 2026 Rozgar Technologies. Built for the next billion.
      </footer>
    </div>
  );
}

function ValueProp({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/5 text-primary">
        <CheckCircle2 className="size-6" />
      </div>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{desc}</p>
    </div>
  );
}
