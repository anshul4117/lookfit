import * as React from "react";
import type { Metadata } from "next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/features/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account — LookFit",
  description: "Create an account to start your personalized posture and mobility journey.",
};

export default function RegisterPage() {
  return (
    <Card className="w-full border-slate-200/90 shadow-sm">
      <CardHeader className="space-y-1.5 text-center">
        <CardTitle
          id="register-heading"
          className="text-2xl font-bold tracking-tight"
        >
          Create an Account
        </CardTitle>
        <CardDescription>
          Get started with equipment-free posture &amp; mobility routines.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <React.Suspense
          fallback={
            <div className="flex h-48 items-center justify-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }
        >
          <RegisterForm />
        </React.Suspense>
      </CardContent>
    </Card>
  );
}
