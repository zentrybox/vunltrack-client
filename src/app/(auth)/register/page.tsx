import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Create VulnTrack root tenant",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.3em]" style={{ color: 'var(--color-accent1)' }}>
          VulnTrack
        </p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Bootstrap your VulnTrack tenant</h1>
  <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Provision your command center, then invite collaborators once inside.
        </p>
      </div>
        <RegisterForm />
  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Questions? Ping the VulnTrack support channel for expedited setup.
      </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          This will create a new tenant and a root operator account with the credentials you provide.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          After creating a tenant, you'll be redirected to the command center.
        </p>
    </div>
  );
}
