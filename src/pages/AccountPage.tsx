import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@shared/schemas/auth";
import { authClient } from "@/lib/auth-client";

export function AccountPage() {
  const { data: session } = authClient.useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setSubmitError(null);
    setPasswordUpdated(false);

    const result = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });

    if (result.error) {
      setSubmitError("Your password could not be changed. Check your current password and try again.");
      return;
    }

    reset();
    setPasswordUpdated(true);
  }

  return (
    <main className="content-page account-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Your account</h1>
          <p>Review your details and keep your admin access secure.</p>
        </div>
      </header>

      <div className="account-layout">
        <section className="account-details" aria-labelledby="account-details-heading">
          <div className="account-section-heading">
            <p className="eyebrow">Account</p>
            <h2 id="account-details-heading">Profile</h2>
          </div>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{session?.user.name || "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{session?.user.email || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="account-password" aria-labelledby="change-password-heading">
          <div className="account-section-heading">
            <p className="eyebrow">Change password</p>
            <h2 id="change-password-heading">Update your password</h2>
            <p>You’ll stay signed in here; other active sessions will be signed out.</p>
          </div>

          <form className="account-password-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field-group">
              <label htmlFor="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.currentPassword)}
                {...register("currentPassword")}
              />
              {errors.currentPassword && <p className="field-error">{errors.currentPassword.message}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                {...register("newPassword")}
              />
              {errors.newPassword && <p className="field-error">{errors.newPassword.message}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="confirm-new-password">Confirm New Password</label>
              <input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmNewPassword)}
                {...register("confirmNewPassword")}
              />
              {errors.confirmNewPassword && <p className="field-error">{errors.confirmNewPassword.message}</p>}
            </div>

            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            {passwordUpdated && <p className="save-confirmation" role="status">Password updated successfully.</p>}

            <button className="primary-button account-password-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update Password"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
