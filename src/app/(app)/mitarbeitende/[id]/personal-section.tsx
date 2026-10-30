import type { PersonalRecord } from "@prisma/client";
import { savePersonalRecord } from "@/app/actions/personal";
import { ActionForm } from "@/components/action-form";
import { RevealField } from "@/components/reveal-field";
import { formatDate } from "@/lib/dates";
import { maskedPersonal } from "@/lib/personal";

type Masked = ReturnType<typeof maskedPersonal>;

/** Lesende Ansicht der Personalakte – auch für „Mein Profil“. Lohndaten maskiert, Klartext per „Anzeigen“. */
export function PersonalFacts({ userId, record, masked }: { userId: string; record: PersonalRecord | null; masked: Masked }) {
  const address = [record?.street, [record?.postalCode, record?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const emergency = [record?.emergencyName, record?.emergencyRelation, record?.emergencyPhone].filter(Boolean).join(" · ");
  const rows: [string, React.ReactNode][] = [
    ["Geburtsdatum", record?.birthDate ? formatDate(record.birthDate) : null],
    ["Anschrift", address || null],
    ["Telefon", record?.phone],
    ["Private E-Mail", record?.privateEmail],
    ["Notfallkontakt", emergency || null],
    ["Krankenkasse", record?.healthInsurance],
    ["Steuer-ID", <RevealField key="t" userId={userId} field="taxId" masked={masked.taxId} />],
    ["Sozialversicherungsnummer", <RevealField key="s" userId={userId} field="socialSecurity" masked={masked.socialSecurity} />],
    ["IBAN", <RevealField key="i" userId={userId} field="iban" masked={masked.iban} />],
    ["Kontoinhaber", record?.accountHolder],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-[max-content_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-slate-500">{label}</dt>
          <dd className="min-w-0 break-words">{value ?? <span className="text-slate-400">–</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

function Field({ name, label, value, type = "text", placeholder }: { name: string; label: string; value?: string | null; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={`pa-${name}`}>{label}</label>
      <input className="input" id={`pa-${name}`} name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder} />
    </div>
  );
}

function SensitiveInput({ name, label, stored }: { name: string; label: string; stored: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={`pa-${name}`}>{label}</label>
      <input className="input" id={`pa-${name}`} name={name} autoComplete="off" placeholder={stored ? "hinterlegt – leer lassen = unverändert" : ""} />
      {stored && (
        <label className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
          <input type="checkbox" name={`${name}Remove`} /> entfernen
        </label>
      )}
    </div>
  );
}

/** Personalakte auf der Personenseite. Nur mit Recht „personnel.view“ eingebunden, bearbeiten mit „personnel.edit“. */
export function PersonalSection({ userId, record, canEdit }: { userId: string; record: PersonalRecord | null; canEdit: boolean }) {
  return (
    <section className="card mb-6 p-4 md:p-5">
      <h2 className="mb-3 font-semibold">Personalakte</h2>
      <PersonalFacts userId={userId} record={record} masked={maskedPersonal(record)} />
      {canEdit && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[14px] text-brand-700">Personalakte bearbeiten</summary>
          <ActionForm action={savePersonalRecord} submitLabel="Personalakte speichern" className="mt-3 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="userId" value={userId} />
            <Field name="birthDate" label="Geburtsdatum" type="date" value={record?.birthDate} />
            <Field name="phone" label="Telefon (privat)" value={record?.phone} />
            <Field name="street" label="Straße und Hausnummer" value={record?.street} />
            <div className="grid grid-cols-[7rem_1fr] gap-2">
              <Field name="postalCode" label="PLZ" value={record?.postalCode} />
              <Field name="city" label="Ort" value={record?.city} />
            </div>
            <Field name="privateEmail" label="Private E-Mail" type="email" value={record?.privateEmail} />
            <Field name="healthInsurance" label="Krankenkasse" value={record?.healthInsurance} />
            <Field name="emergencyName" label="Notfallkontakt" value={record?.emergencyName} />
            <div className="grid grid-cols-2 gap-2">
              <Field name="emergencyRelation" label="Beziehung" value={record?.emergencyRelation} placeholder="z. B. Partnerin" />
              <Field name="emergencyPhone" label="Telefon" value={record?.emergencyPhone} />
            </div>
            <SensitiveInput name="taxId" label="Steuer-ID" stored={!!record?.taxIdEnc} />
            <SensitiveInput name="socialSecurity" label="Sozialversicherungsnummer" stored={!!record?.socialSecurityEnc} />
            <SensitiveInput name="iban" label="IBAN" stored={!!record?.ibanEnc} />
            <Field name="accountHolder" label="Kontoinhaber" value={record?.accountHolder} />
            <p className="text-[12px] text-slate-500 sm:col-span-2">
              Steuer-ID, Sozialversicherungsnummer und IBAN werden verschlüsselt gespeichert. Steuerklasse und Konfession werden nicht erfasst – sie kommen über ELStAM ans Lohnbüro.
            </p>
          </ActionForm>
        </details>
      )}
    </section>
  );
}
