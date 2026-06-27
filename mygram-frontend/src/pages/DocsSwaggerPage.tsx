import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { apiBaseUrl } from "@/api/http";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function DocsSwaggerPage() {
  useDocumentTitle("Swagger | MyGram");
  const swaggerUrl = `${apiBaseUrl}/swagger/index.html`;

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
      <div className="container py-6">
        <div className="overflow-hidden rounded-lg border bg-card">
          <iframe title="MyGram public Swagger UI" src={swaggerUrl} className="h-[80vh] w-full" />
        </div>
      </div>
    </main>
  );
}
