import { useEffect, useMemo, useState } from "react";
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
  const capConfig = getCapConfig();
  const widgetUrl = useMemo(() => {
    if (!capConfig.enabled || !capConfig.baseUrl || !capConfig.siteKey) {
      return "";
    }

    return `${capConfig.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(capConfig.siteKey)}/`;
  }, [capConfig.baseUrl, capConfig.enabled, capConfig.siteKey]);

  useEffect(() => {
    if (!widgetUrl) {
      return undefined;
    }

    function handleMessage(event: MessageEvent) {
      const expectedOrigin = new URL(widgetUrl).origin;
      if (event.origin !== expectedOrigin) {
        return;
      }

      const data = event.data as
        | string
        | { token?: string; response?: string; solution?: string; type?: string };
      const token =
        typeof data === "string"
          ? data
          : data.token ?? data.response ?? data.solution ?? "";

      if (token && (!("type" in Object(data)) || String(Object(data).type).includes("cap"))) {
        onChange(token);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onChange, widgetUrl]);

  if (!capConfig.enabled) {
    return null;
  }

  if (!widgetUrl) {
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
        <iframe
          key={refreshKey}
          title="Cap captcha"
          src={widgetUrl}
          className="h-24 w-full"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
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
