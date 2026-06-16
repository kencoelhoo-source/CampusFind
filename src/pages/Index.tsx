import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemCard } from "@/components/ItemCard";
import { Search, ArrowRight } from "lucide-react";
import heroCampus from "@/assets/hero-campus.jpg";
import { fetchHomeStats, fetchRecentItems } from "@/lib/item-data";

export default function Index() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [items, stats] = await Promise.all([fetchRecentItems(), fetchHomeStats()]);
      return { items, stats };
    },
  });

  const handleSearch = () => {
    if (search.trim()) {
      navigate(`/items?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const items = data?.items || [];
  const stats = data?.stats || { total: 0, lost: 0, found: 0 };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroCampus} alt="College campus" className="h-full w-full object-cover" />
          <div className="bg-gradient-overlay absolute inset-0" />
        </div>
        <div className="container relative z-10 py-28 md:py-40">
          <div className="mx-auto max-w-xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl animate-fade-in leading-[1.1]">
              Lost something?
              <br />
              <span className="text-white/70">We'll help you find it.</span>
            </h1>
            <p className="mt-5 text-[15px] text-white/60 animate-fade-in leading-relaxed" style={{ animationDelay: "0.1s" }}>
              Report lost or found items and reconnect your campus community with their belongings.
            </p>
            <div className="mt-8 flex gap-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search for items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-11 rounded-full bg-white/95 pl-10 text-[14px] border-0 shadow-lg backdrop-blur-sm dark:bg-card/95"
                />
              </div>
              <Button onClick={handleSearch} className="h-11 rounded-full bg-foreground px-6 text-[14px] font-medium text-background hover:opacity-90">
                Search
              </Button>
            </div>
            <div className="mt-5 flex justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button
                className="h-10 rounded-full bg-white/15 px-5 text-[13px] font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/25 shadow-none"
                asChild
              >
                <Link to="/post?type=lost">I Lost Something</Link>
              </Button>
              <Button
                className="h-10 rounded-full bg-white/15 px-5 text-[13px] font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/25 shadow-none"
                asChild
              >
                <Link to="/post?type=found">I Found Something</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card">
        <div className="container grid grid-cols-3 gap-4 py-10 text-center">
          <div className="animate-count-up">
            <span className="text-3xl font-semibold tracking-tight text-foreground">{stats.total}</span>
            <p className="mt-1 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Total Items</p>
          </div>
          <div className="animate-count-up" style={{ animationDelay: "0.1s" }}>
            <span className="text-3xl font-semibold tracking-tight text-foreground">{stats.lost}</span>
            <p className="mt-1 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Lost</p>
          </div>
          <div className="animate-count-up" style={{ animationDelay: "0.2s" }}>
            <span className="text-3xl font-semibold tracking-tight text-foreground">{stats.found}</span>
            <p className="mt-1 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Found</p>
          </div>
        </div>
      </section>

      {/* Recent Items */}
      <section className="container py-14">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent Items</h2>
          <Button variant="ghost" className="text-[13px] font-medium text-muted-foreground hover:text-foreground" asChild>
            <Link to="/items">View All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-[15px] text-muted-foreground">No items posted yet. Be the first!</p>
            <Button className="mt-4 h-10 rounded-full bg-gradient-hero px-6 text-[14px] font-medium text-white" asChild>
              <Link to="/post">Report an Item</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
              <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <ItemCard {...item} image_url={item.image_url} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
