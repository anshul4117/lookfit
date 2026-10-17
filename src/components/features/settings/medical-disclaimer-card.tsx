import * as React from "react";

export function MedicalDisclaimerCard({ className = "" }: { className?: string }) {
  return (
    <div
      id="medical-disclaimer-card"
      role="region"
      aria-labelledby="disclaimer-heading"
      className={`rounded-xl border border-rose-200 bg-rose-50/70 p-5 text-slate-800 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700"
          aria-hidden="true"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="space-y-2 text-sm leading-relaxed">
          <h2 id="disclaimer-heading" className="text-base font-semibold text-rose-900">
            Health &amp; Spinal Safety Notice
          </h2>

          <p className="text-slate-700">
            LookFit provides automated exercise, mobility, and posture routines and is
            <strong> not a licensed medical provider, physical therapist, or clinical diagnostic tool</strong>.
            Always consult a physician before beginning any new physical regimen.
          </p>

          <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
            <li>
              <strong>Pre-existing spinal or neck conditions:</strong> If you have
              diagnosed cervical/lumbar pathologies, disc herniations, or chronic
              pain, consult a qualified healthcare professional before performing spinal
              movements.
            </li>
            <li>
              <strong>Sharp pain vs. stretching tension:</strong> Mild muscle stretching
              tension is normal during mobility routines. Stop immediately if you
              experience sharp pain, joint pinching, dizziness, or numbness.
            </li>
            <li>
              <strong>Upright stance &amp; height:</strong> Posture and strength improvements help an individual stand straighter and decompress the spine, but exercises cannot lengthen bones after growth plates close. Measured standing height changes are variable and not guaranteed.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
