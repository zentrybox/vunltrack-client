'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registerRoot as registerRootAccount } from "@/lib/api";
import { createSession } from "@/lib/auth";

export interface RegisterFormState {
  status: "idle" | "error";
  message?: string;
}

export async function registerRoot(
  _previousState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !tenantName || !password) {
    return {
      status: "error",
      message: "All fields are required.",
    };
  }

  try {
    const response = await registerRootAccount({
      name,
      email,
      tenantName,
      password,
    });

    await createSession(response);
    await Promise.all([
      revalidatePath("/dashboard"),
      revalidatePath("/devices"),
      revalidatePath("/users"),
      revalidatePath("/subscription"),
    ]);

    redirect("/dashboard");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We couldn't create your root account just yet.";

    return {
      status: "error",
      message,
    };
  }
}
