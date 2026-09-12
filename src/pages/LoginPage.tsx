import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@shared/schemas/auth";
import { Brand } from "@/components/Brand";
import { LoadingScreen } from "@/components/LoadingScreen";
import { authClient } from "@/lib/auth-client";

type LoginLocationState = { from?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [authError, setAuthError] = useState<string | null>(null);
  const destination = (location.state as LoginLocationState | null)?.from ?? "/";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (session) navigate(destination, { replace: true });
  }, [destination, navigate, session]);

  async function onSubmit(values: LoginInput) {
    setAuthError(null);
    const result = await authClient.signIn.email(values);

    if (result.error) {
      setAuthError("Email or password is incorrect.");
      return;
    }

    navigate(destination, { replace: true });
  }

  if (sessionPending || session) return <LoadingScreen />;

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Studio K2 introduction">
        <Brand />
        <div className="login-statement">
          <p className="eyebrow">Private workspace</p>
          <h1>Space for the work<br />behind the work.</h1>
          <p>Manage the Studio K2 website from one focused, considered place.</p>
        </div>
        <p className="login-edition">Studio K2 · Admin foundation</p>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-heading">
            <p className="eyebrow">Authorised access</p>
            <h2>Welcome back</h2>
            <p>Sign in with your Studio K2 admin account.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            {authError && <p className="form-error" role="alert">{authError}</p>}

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>

          <p className="access-note">Access is limited to authorised Studio K2 administrators.</p>
        </div>
      </section>
    </main>
  );
}
