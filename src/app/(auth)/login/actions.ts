'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { login } from "@/lib/api";
import { createSession } from "@/lib/auth";

export interface LoginFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function authenticate(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", message: "Email and password are required." };
  }

  try {
    const authResponse = await login({ email, password });
    await createSession(authResponse);
    await Promise.all([
      revalidatePath("/dashboard"),
      revalidatePath("/devices"),
      revalidatePath("/users"),
      revalidatePath("/subscription"),
    ]);
    redirect("/dashboard");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed.";
    return { status: "error", message };
  }
}
