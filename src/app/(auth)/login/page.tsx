import LoginForm from "./LoginForm";

export const metadata = {
  title: "VulnTrack Login",
};

export default function LoginPage() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-blue-500">
          VulnTrack
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">Authenticate to continue</h1>
      </div>
      <LoginForm />
      <p className="text-sm text-gray-600">
        Need an account? Contact your VulnTrack tenant administrator.
      </p>
    </div>
  );
}
