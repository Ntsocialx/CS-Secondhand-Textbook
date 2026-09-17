"use client";

import { useState } from "react";

type ConsentModalProps = {
  accepted: boolean;
  userAgreement: boolean;
  displayContactDetails: boolean;
  onAcceptedChange: (value: boolean) => void;
  onUserAgreementChange: (value: boolean) => void;
  onDisplayContactDetailsChange: (value: boolean) => void;
};

export function ConsentModal({
  accepted,
  userAgreement,
  displayContactDetails,
  onAcceptedChange,
  onUserAgreementChange,
  onDisplayContactDetailsChange,
}: ConsentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAgreementOpen, setIsAgreementOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-to-fit shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Your privacy & agreement</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {accepted && userAgreement ? "Consents and agreement are ready." : "Please review the notices before continuing."}
            </p>
          </div>
          <button type="button" onClick={() => setIsOpen(true)} className="shrink-0 text-xs font-bold text-indigo-600 hover:text-indigo-500">
            {accepted && userAgreement ? "Edit" : "Review"}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-600">
            <input type="checkbox" checked={accepted} onChange={(event) => onAcceptedChange(event.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-indigo-600" />
            <span>I agree to the <button type="button" onClick={() => setIsOpen(true)} className="font-semibold text-indigo-600 underline underline-offset-2">POPIA data notice</button>.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-600">
            <input type="checkbox" checked={userAgreement} onChange={(event) => onUserAgreementChange(event.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-indigo-600" />
            <span>I accept the <button type="button" onClick={() => setIsAgreementOpen(true)} className="font-semibold text-indigo-600 underline underline-offset-2">User Agreement & Terms</button>.</span>
          </label>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="consent-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">POPIA Act 4 of 2013</p>
                <h2 id="consent-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Your data, your choice.</h2>
              </div>
              <button type="button" aria-label="Close privacy notice" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Campus Exchange processes only the information needed to connect verified students for peer-to-peer textbook transactions. You can withdraw consent at any time by contacting the platform administrator.
            </p>
            <label className="mt-6 flex cursor-pointer gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm font-medium leading-6 text-slate-800">
              <input type="checkbox" checked={accepted} onChange={(event) => onAcceptedChange(event.target.checked)} className="mt-1 h-4 w-4 rounded accent-indigo-600" />
              <span>I consent to Campus Exchange processing my student email, phone number, and textbook listings strictly for campus transactions.</span>
            </label>
            <label className="mt-3 flex cursor-pointer gap-3 p-2 text-sm leading-6 text-slate-600">
              <input type="checkbox" checked={displayContactDetails} onChange={(event) => onDisplayContactDetailsChange(event.target.checked)} className="mt-1 h-4 w-4 rounded accent-indigo-600" />
              <span>Allow my WhatsApp/phone details to be shown to verified campus buyers.</span>
            </label>
            <p className="mt-4 text-xs text-slate-400">Consent version 1.0 · Recorded securely with the date and time.</p>
            <button type="button" onClick={() => setIsOpen(false)} className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">Save my preferences</button>
          </section>
        </div>
      )}

      {isAgreementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setIsAgreementOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="agreement-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Campus Exchange</p>
                <h2 id="agreement-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">User Agreement</h2>
              </div>
              <button type="button" aria-label="Close agreement" onClick={() => setIsAgreementOpen(false)} className="rounded-full p-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
            </div>
            <div className="mt-4 text-sm leading-6 text-slate-600 space-y-4">
              <p>By using Campus Exchange, you agree to the following terms:</p>
              <ol className="list-decimal ml-4 space-y-2">
                <li>You must be a verified student of an approved university.</li>
                <li>You agree to only list textbooks in a truthful and accurate condition.</li>
                <li>You agree to meet buyers/sellers in public, safe campus areas.</li>
                <li>Campus Exchange is a platform for connection; we are not responsible for the actual transaction of cash or books.</li>
                <li>You will not use the platform for harassment or commercial reselling of textbooks.</li>
              </ol>
            </div>
            <label className="mt-6 flex cursor-pointer gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm font-medium leading-6 text-slate-800">
              <input type="checkbox" checked={userAgreement} onChange={(event) => onUserAgreementChange(event.target.checked)} className="mt-1 h-4 w-4 rounded accent-indigo-600" />
              <span>I have read and agree to the User Agreement and Terms of Service.</span>
            </label>
            <button type="button" onClick={() => setIsAgreementOpen(false)} className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">I Accept</button>
          </section>
        </div>
      )}
    </>
  );
}
