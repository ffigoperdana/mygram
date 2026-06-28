import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

import { apiDisplayBaseUrl } from "@/api/http";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function DocsSwaggerPage() {
  useDocumentTitle("Swagger | MyGram");
  const swaggerUrl = `${apiDisplayBaseUrl}/swagger/index.html`;

  useEffect(() => {
    window.location.assign(swaggerUrl);
  }, [swaggerUrl]);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Button asChild variant="outline">
            <Link to="/docs">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Docs
            </Link>
          </Button>
          <Button asChild>
            <a href={swaggerUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Open Swagger
            </a>
          </Button>
        </div>
      </header>
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-6">
        <div className="grid max-w-md justify-items-center gap-4 rounded-lg border bg-card p-6 text-center shadow-sm">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-normal">Opening Swagger</h1>
            <p className="text-sm text-muted-foreground">
              Continue to the public API reference in the same tab.
            </p>
          </div>
          <Button asChild>
            <a href={swaggerUrl}>
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Open Swagger
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
