import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { RouteSkeleton } from "@/components/common/Skeletons";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Navbar } from "@/components/layout/Navbar";
import { MobileDock } from "@/components/layout/MobileDock";
import { Footer } from "@/components/layout/Footer";
import { AuthCurtain, PageTransition } from "@/components/common/PageTransition";

const Index = lazy(() => import("./pages/Index"));
const Items = lazy(() => import("./pages/Items"));
const ItemDetail = lazy(() => import("./pages/ItemDetail"));
const PostItem = lazy(() => import("./pages/PostItem"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <Sonner />
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

function AppShell() {
  const { pathname } = useLocation();

  return (
    <>
      <AuthCurtain />
      <div className="flex min-h-screen flex-col">
        {pathname !== "/auth" && <Navbar />}
        {pathname !== "/auth" && <MobileDock />}
        <main className={cn("page-shell", pathname !== "/" && pathname !== "/auth" && "pt-14", pathname !== "/auth" && "max-md:pb-[7.25rem]")}>
          <Suspense fallback={<RouteFallback />}>
            <PageTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/items" element={<Items />} />
                <Route path="/items/:id" element={<ItemDetail />} />
                <Route path="/post" element={<PostItem />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </Suspense>
          {pathname !== "/auth" && <Footer />}
        </main>
      </div>
    </>
  );
}

function RouteFallback() {
  return <RouteSkeleton />;
}

export default App;
