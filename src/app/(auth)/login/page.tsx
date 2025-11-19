import LoginForm from "./LoginForm";

export const metadata = {
  title: "VulnTrack Login",
};

export default function LoginPage() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.3em]" style={{ color: 'var(--color-accent1)' }}>
          VulnTrack
        </p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Authenticate to continue</h1>
      </div>
      <LoginForm />
  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Need an account? Contact your VulnTrack tenant administrator.
      </p>
    </div>
  );
}
