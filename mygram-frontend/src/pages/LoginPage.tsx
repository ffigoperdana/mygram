import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/http";
import { CapCaptcha } from "@/components/auth/CapCaptcha";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useAuthStore } from "@/stores/auth-store";

function shouldRequireLoginCaptcha() {
  return (
    import.meta.env.VITE_CAP_ENABLED === "true" &&
    import.meta.env.VITE_CAP_REQUIRED_ON_LOGIN !== "false"
  );
}

export function LoginPage() {
  useDocumentTitle("Login | MyGram");
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const setSession = useAuthStore((state) => state.setSession);
  const notice = useAuthStore((state) => state.notice);
  const setNotice = useAuthStore((state) => state.setNotice);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    try {
      const response = await login.mutateAsync({
        email,
        password,
        captcha_token: captchaToken || undefined,
      });
      setSession(response.token, response.user);
      const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname;
      navigate(redirectTo ?? "/feed", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to MyGram</CardTitle>
        </CardHeader>
        <CardContent>
          {notice ? (
            <div className="mb-4 flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{notice.message}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {shouldRequireLoginCaptcha() ? (
              <CapCaptcha value={captchaToken} onChange={setCaptchaToken} />
            ) : null}
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-3 text-sm">
            <Link to="/docs" className="font-medium text-primary hover:underline">
              Read API docs
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
