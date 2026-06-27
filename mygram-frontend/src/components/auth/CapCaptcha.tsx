import "cap-widget";

import type { CapErrorEvent, CapSolveEvent, CapWidget } from "cap-widget";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CapCaptchaProps = {
  value: string;
  onChange: (token: string) => void;
};

function getCapConfig() {
  return {
    baseUrl: import.meta.env.VITE_CAP_BASE_URL ?? "",
    siteKey: import.meta.env.VITE_CAP_SITE_KEY ?? "",
    enabled: import.meta.env.VITE_CAP_ENABLED === "true",
  };
}

export function CapCaptcha({ value, onChange }: CapCaptchaProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const widgetRef = useRef<CapWidget | null>(null);
  const capConfig = getCapConfig();
  const apiEndpoint = useMemo(() => {
    if (!capConfig.enabled || !capConfig.baseUrl || !capConfig.siteKey) {
      return "";
    }

    return `${capConfig.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(capConfig.siteKey)}/`;
  }, [capConfig.baseUrl, capConfig.enabled, capConfig.siteKey]);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!apiEndpoint || !widget) {
      return undefined;
    }

    function handleSolve(event: CapSolveEvent) {
      if (event.detail.token) {
        setError("");
        onChange(event.detail.token);
      }
    }

    function handleReset() {
      onChange("");
    }

    function handleError(event: CapErrorEvent) {
      setError(event.detail.message || "Captcha verification could not start.");
      onChange("");
    }

    widget.addEventListener("solve", handleSolve);
    widget.addEventListener("reset", handleReset);
    widget.addEventListener("error", handleError);

    return () => {
      widget.removeEventListener("solve", handleSolve);
      widget.removeEventListener("reset", handleReset);
      widget.removeEventListener("error", handleError);
    };
  }, [apiEndpoint, onChange, refreshKey]);

  if (!capConfig.enabled) {
    return null;
  }

  if (!apiEndpoint) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        Captcha is enabled but frontend Cap configuration is incomplete.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="captcha-token">Captcha</Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            onChange("");
            setRefreshKey((current) => current + 1);
          }}
        >
          <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border bg-background">
        <cap-widget
          key={refreshKey}
          ref={(element) => {
            widgetRef.current = element;
          }}
          required
          data-cap-api-endpoint={apiEndpoint}
          data-cap-hidden-field-name="captcha_token"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="relative">
        <ShieldCheck
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="captcha-token"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Captcha token"
          className="pl-9"
          required
        />
      </div>
    </div>
  );
}
