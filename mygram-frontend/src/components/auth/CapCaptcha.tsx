import "cap-widget";

import type { CapErrorEvent, CapSolveEvent, CapWidget } from "cap-widget";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RefreshCcw, ShieldCheck, ShieldQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type CapCaptchaProps = {
  value: string;
  onChange: (token: string) => void;
};

const capWidgetStyle = {
  "--cap-widget-width": "100%",
  "--cap-widget-height": "58px",
  "--cap-border-radius": "8px",
  "--cap-background": "hsl(var(--background))",
  "--cap-border-color": "hsl(var(--border))",
  "--cap-color": "hsl(var(--foreground))",
  "--cap-focus-ring": "hsl(var(--ring))",
} as CSSProperties;

function getCapConfig() {
  return {
    baseUrl: import.meta.env.VITE_CAP_BASE_URL ?? "",
    siteKey: import.meta.env.VITE_CAP_SITE_KEY ?? "",
    enabled: import.meta.env.VITE_CAP_ENABLED === "true",
  };
}

export function CapCaptcha({ value, onChange }: CapCaptchaProps) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const widgetRef = useRef<CapWidget | null>(null);
  const detachWidgetListenersRef = useRef<(() => void) | null>(null);
  const capConfig = getCapConfig();
  const apiEndpoint = useMemo(() => {
    if (!capConfig.enabled || !capConfig.baseUrl || !capConfig.siteKey) {
      return "";
    }

    return `${capConfig.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(capConfig.siteKey)}/`;
  }, [capConfig.baseUrl, capConfig.enabled, capConfig.siteKey]);

  const attachWidgetRef = useCallback(
    (widget: CapWidget | null) => {
      detachWidgetListenersRef.current?.();
      detachWidgetListenersRef.current = null;
      widgetRef.current = widget;

      if (!widget || !apiEndpoint) {
        return;
      }

      function handleSolve(event: CapSolveEvent) {
        if (event.detail.token) {
          setError("");
          onChange(event.detail.token);
          setOpen(false);
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

      detachWidgetListenersRef.current = () => {
        widget.removeEventListener("solve", handleSolve);
        widget.removeEventListener("reset", handleReset);
        widget.removeEventListener("error", handleError);
      };
    },
    [apiEndpoint, onChange],
  );

  useEffect(() => {
    return () => {
      detachWidgetListenersRef.current?.();
      detachWidgetListenersRef.current = null;
    };
  }, []);

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
      <Label>Captcha</Label>
      <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
        <p
          className={
            value
              ? "inline-flex min-w-0 items-center gap-2 text-sm font-medium text-primary"
              : "inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
          }
        >
          {value ? (
            <>
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Captcha verified</span>
            </>
          ) : (
            <>
              <ShieldQuestion className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Verification required</span>
            </>
          )}
        </p>
        <Button
          type="button"
          size="sm"
          variant={value ? "outline" : "secondary"}
          onClick={() => {
            if (value) {
              onChange("");
            }
            setError("");
            setRefreshKey((current) => current + 1);
            setOpen(true);
          }}
        >
          {value ? "Verify again" : "Verify human"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify you are human</DialogTitle>
            <DialogDescription>
              Complete the check once, then continue signing in to MyGram.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="overflow-hidden rounded-md">
              <cap-widget
                key={refreshKey}
                ref={attachWidgetRef}
                style={capWidgetStyle}
                required
                data-cap-api-endpoint={apiEndpoint}
                data-cap-hidden-field-name="captcha_token"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="button"
              variant="ghost"
              className="justify-self-start px-0"
              onClick={() => {
                onChange("");
                setError("");
                setRefreshKey((current) => current + 1);
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Refresh check
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
