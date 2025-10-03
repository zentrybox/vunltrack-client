import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Create VulnTrack root tenant",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-blue-500">
          VulnTrack
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">Bootstrap your VulnTrack tenant</h1>
        <p className="mt-2 text-sm text-gray-600">
          Provision your command center, then invite collaborators once inside.
        </p>
      </div>
      <RegisterForm />
      <p className="text-sm text-gray-600">
        Questions? Ping the VulnTrack support channel for expedited setup.
      </p>
    </div>
  );
}
