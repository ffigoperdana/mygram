import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/http";
import { CapCaptcha } from "@/components/auth/CapCaptcha";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";

function shouldRequireRegisterCaptcha() {
  return import.meta.env.VITE_CAP_ENABLED === "true";
}

export function RegisterPage() {
  useDocumentTitle("Register | MyGram");
  const navigate = useNavigate();
  const register = useRegister();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("18");
  const [captchaToken, setCaptchaToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await register.mutateAsync({
        username,
        email,
        password,
        age: Number(age),
        captcha_token: captchaToken || undefined,
      });
      toast.success("Account created");
      navigate("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create MyGram Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
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
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min="9"
                max="100"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {shouldRequireRegisterCaptcha() ? (
              <CapCaptcha value={captchaToken} onChange={setCaptchaToken} />
            ) : null}
            <Button type="submit" disabled={register.isPending}>
              {register.isPending ? "Creating" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
