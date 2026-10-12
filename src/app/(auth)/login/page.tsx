import * as React from "react";
import type { Metadata } from "next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { LoginForm } from "@/components/features/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In — LookFit",
  description: "Sign in to access your posture and mobility workout routines.",
};

export default function LoginPage() {
  return (
    <Card className="w-full border-slate-200/90 shadow-sm">
      <CardHeader className="space-y-1.5 text-center">
        <CardTitle id="login-heading" className="text-2xl font-bold tracking-tight">
          Sign In to LookFit
        </CardTitle>
        <CardDescription>
          Enter your credentials to access your posture &amp; mobility dashboard.
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
          <LoginForm />
        </React.Suspense>
      </CardContent>
    </Card>
  );
}
