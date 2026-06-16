// CampusFind Authentication Page
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Search } from "lucide-react";

export default function Auth() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkErrors = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      let errorMsg = "";

      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const errorDesc = params.get("error_description");
        if (errorDesc) errorMsg = errorDesc;
      }

      if (!errorMsg && search) {
        const params = new URLSearchParams(search);
        const errorDesc = params.get("error_description");
        if (errorDesc) errorMsg = errorDesc;
      }

      if (errorMsg) {
        let friendlyMsg = errorMsg.replace(/\+/g, " ");
        if (
          friendlyMsg.toLowerCase().includes("check_signup_email_domain") || 
          friendlyMsg.toLowerCase().includes("sfit") || 
          friendlyMsg.toLowerCase().includes("domain")
        ) {
          friendlyMsg = "Access Denied: Only SFIT email domains (@student.sfit.ac.in or @sfit.ac.in) are allowed.";
        }
        toast.error(friendlyMsg);
        
        // Clear the error parameters from the address bar
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    checkErrors();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="container flex min-h-[80vh] items-center justify-center py-8">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero">
            <Search className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Welcome to CampusFind</CardTitle>
          <CardDescription>Sign in to report and claim items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? "Connecting..." : "Sign In with Google"}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Please use your official @student.sfit.ac.in or @sfit.ac.in account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
