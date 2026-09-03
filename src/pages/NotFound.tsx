import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">This page wandered off.</h1>
        <p className="mt-4 text-[16px] text-muted-foreground">The link is missing, or the item was already returned.</p>
        <Button className="mt-8" asChild>
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
