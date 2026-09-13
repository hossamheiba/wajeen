"use client";

/**
 * One form, three kinds.
 *
 * The kind switch decides which fields exist. Everything a visitor fills in is
 * a real field with a real destination — nothing is folded into the message
 * any more, which is what the old vendor half had to do because the schema had
 * no room for it.
 *
 * Two conditional rules are worth naming, because both are easy to get subtly
 * wrong:
 *
 *   - **The Aramco vendor number** appears only when the box is ticked, and is
 *     required only then. When the box is off the value is not sent at all —
 *     not "", not "N/A". The database refuses to store a placeholder, so
 *     sending one would be a lie about what was collected.
 *   - **The CV** is the only file on the public site. Its type and size are
 *     checked here for a quick answer, and again from the bytes by the CMS,
 *     because anything a browser checks an attacker can skip.
 *
 * The idempotency key is generated once per submission attempt and reused by
 * every retry of it, so a timeout followed by a retry lands on one inquiry
 * rather than two.
 */

import { useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import {
  inquiryFormSchema,
  payloadFor,
  type InquiryFormValues,
} from "@/lib/contactSchema";
import { CITY, SEND_TO_GROUPS, SERVICE_TYPE, type InquiryKind } from "@/lib/inquiryVocab";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-ui border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

const KINDS: InquiryKind[] = ["contact", "vendor", "career"];

/** Mirrors WJEEN_CV_MAX_BYTES. The CMS is the one that enforces it. */
const CV_MAX_BYTES = 5 * 1024 * 1024;
const CV_ACCEPT =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx";

export function ContactForm() {
  const t = useTranslations("contactPage.form");
  const locale = useLocale();
  const groupName = useId();

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [kind, setKind] = useState<InquiryKind>("contact");
  const [cv, setCv] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const cvInput = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      kind: "contact",
      idempotencyKey: crypto.randomUUID(),
      phone: "",
      message: "",
      sendTo: "",
      companyName: "",
      city: "",
      serviceType: "",
      isAramcoVendor: false,
      aramcoVendorId: "",
    },
  });

  const isAramcoVendor = watch("isAramcoVendor");

  const chooseKind = (next: InquiryKind) => {
    setKind(next);
    setValue("kind", next, { shouldValidate: false });
    setStatus("idle");
  };

  const acceptCv = (file: File | undefined) => {
    if (!file) return;
    if (file.size > CV_MAX_BYTES) {
      setCvError(t("errors.cvTooLarge"));
      setCv(null);
      return;
    }
    const name = file.name.toLowerCase();
    const looksRight =
      file.type === "application/pdf" ||
      file.type.includes("wordprocessingml") ||
      name.endsWith(".pdf") ||
      name.endsWith(".docx");
    if (!looksRight) {
      setCvError(t("errors.cvWrongType"));
      setCv(null);
      return;
    }
    setCvError(null);
    setCv(file);
  };

  const onSubmit = async (values: InquiryFormValues) => {
    setStatus("idle");

    if (values.kind === "career" && cv === null) {
      setCvError(t("errors.cvRequired"));
      return;
    }

    const payload = payloadFor(values);

    try {
      let response: Response;
      if (values.kind === "career" && cv) {
        // multipart, because a File cannot travel as JSON.
        const form = new FormData();
        for (const [key, value] of Object.entries({
          ...values,
          locale,
        })) {
          if (typeof value === "boolean") form.set(key, String(value));
          else if (value !== undefined && value !== null) form.set(key, String(value));
        }
        form.set("cv", cv, cv.name);
        response = await fetch("/api/contact", { method: "POST", body: form });
      } else {
        response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, ...values, locale }),
        });
      }

      if (!response.ok) throw new Error("request failed");

      setStatus("success");
      // A fresh key: the next submission is a new one, not a retry of this.
      reset({
        kind: values.kind,
        idempotencyKey: crypto.randomUUID(),
        phone: "",
        message: "",
        sendTo: "",
        companyName: "",
        city: "",
        serviceType: "",
        isAramcoVendor: false,
        aramcoVendorId: "",
      });
      setCv(null);
      if (cvInput.current) cvInput.current.value = "";
    } catch {
      setStatus("error");
    }
  };

  const messageError =
    errors.message?.type === "too_small" || errors.message?.message === "required"
      ? t("errors.messageMin")
      : t("errors.messageRequired");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-5" noValidate>
      {/* Honeypot. Off-screen rather than display:none so a bot that skips
          hidden inputs still sees it, and removed from the tab order and the
          accessibility tree so nobody using a keyboard or a screen reader can
          reach it. autoComplete="off" keeps browsers from filling it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="cf-company">Company</label>
        <input id="cf-company" type="text" tabIndex={-1} autoComplete="off" {...register("company")} />
      </div>
      <input type="hidden" {...register("kind")} />
      <input type="hidden" {...register("idempotencyKey")} />

      {/* Real radios, visually hidden behind their labels: arrow keys move
          between them, the group is announced as a group, and none of that
          needs a line of JavaScript. */}
      <fieldset>
        <legend className="mb-2 block text-xs font-semibold text-black">
          {t("kinds.label")}
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {KINDS.map((option) => {
            const active = kind === option;
            return (
              <label
                key={option}
                className={`cursor-pointer rounded-ui border px-4 py-3 transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-black/10 bg-white hover:border-primary/40"
                } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30`}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={option}
                  checked={active}
                  onChange={() => chooseKind(option)}
                  className="sr-only"
                />
                <span className={`block text-sm font-bold ${active ? "text-primary" : "text-black"}`}>
                  {t(`kinds.${option}`)}
                </span>
                <span className="mt-0.5 block text-xs text-gray-muted">
                  {t(`kinds.${option}Hint`)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {kind === "vendor" && (
        <div>
          <label htmlFor="cf-company-name" className="mb-2 block text-xs font-semibold text-black">
            {t("companyName")}
          </label>
          <input
            id="cf-company-name"
            {...register("companyName")}
            placeholder={t("companyNamePlaceholder")}
            aria-invalid={errors.companyName ? true : undefined}
            aria-describedby={errors.companyName ? "cf-company-name-error" : undefined}
            className={inputClass}
          />
          {errors.companyName && (
            <p id="cf-company-name-error" className="mt-1.5 text-xs text-red-600">
              {t("errors.companyRequired")}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="mb-2 block text-xs font-semibold text-black">
            {kind === "vendor" ? t("contactPerson") : t("name")}
          </label>
          <input
            id="cf-name"
            {...register("name")}
            placeholder={kind === "vendor" ? t("contactPersonPlaceholder") : t("namePlaceholder")}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "cf-name-error" : undefined}
            className={inputClass}
          />
          {errors.name && (
            <p id="cf-name-error" className="mt-1.5 text-xs text-red-600">
              {kind === "vendor" ? t("errors.contactPersonRequired") : t("errors.nameRequired")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="cf-email" className="mb-2 block text-xs font-semibold text-black">
            {t("email")}
          </label>
          <input
            id="cf-email"
            {...register("email")}
            type="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "cf-email-error" : undefined}
            className={inputClass}
          />
          {errors.email && (
            <p id="cf-email-error" className="mt-1.5 text-xs text-red-600">
              {t("errors.emailInvalid")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-phone" className="mb-2 block text-xs font-semibold text-black">
            {t("phone")}
          </label>
          <input
            id="cf-phone"
            {...register("phone")}
            type="tel"
            placeholder={t("phonePlaceholder")}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "cf-phone-error" : undefined}
            className={inputClass}
          />
          {errors.phone && (
            <p id="cf-phone-error" className="mt-1.5 text-xs text-red-600">
              {t("errors.phoneRequired")}
            </p>
          )}
        </div>

        {kind === "contact" && (
          <div>
            <label htmlFor="cf-send-to" className="mb-2 block text-xs font-semibold text-black">
              {t("sendTo")}
            </label>
            {/* Nineteen recipients in four groups. `optgroup` is native, so the
                grouping is announced and needs no JavaScript. */}
            <select
              id="cf-send-to"
              {...register("sendTo")}
              aria-invalid={errors.sendTo ? true : undefined}
              aria-describedby={errors.sendTo ? "cf-send-to-error" : undefined}
              className={`${inputClass} field-select`}
            >
              <option value="">{t("sendToPlaceholder")}</option>
              {SEND_TO_GROUPS.map((group) => (
                <optgroup key={group.key} label={t(`sendToGroups.${group.key}`)}>
                  {group.codes.map((code) => (
                    <option key={code} value={code}>
                      {t(`sendToOptions.${code}`)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.sendTo && (
              <p id="cf-send-to-error" className="mt-1.5 text-xs text-red-600">
                {t("errors.sendToRequired")}
              </p>
            )}
          </div>
        )}

        {kind === "vendor" && (
          <div>
            <label htmlFor="cf-city" className="mb-2 block text-xs font-semibold text-black">
              {t("city")}
            </label>
            <select
              id="cf-city"
              {...register("city")}
              aria-invalid={errors.city ? true : undefined}
              aria-describedby={errors.city ? "cf-city-error" : undefined}
              className={`${inputClass} field-select`}
            >
              <option value="">{t("cityPlaceholder")}</option>
              {CITY.map((code) => (
                <option key={code} value={code}>
                  {t(`cityOptions.${code}`)}
                </option>
              ))}
            </select>
            {errors.city && (
              <p id="cf-city-error" className="mt-1.5 text-xs text-red-600">
                {t("errors.cityRequired")}
              </p>
            )}
          </div>
        )}
      </div>

      {kind === "vendor" && (
        <>
          <div>
            <label htmlFor="cf-service" className="mb-2 block text-xs font-semibold text-black">
              {t("serviceType")}
            </label>
            <select
              id="cf-service"
              {...register("serviceType")}
              aria-invalid={errors.serviceType ? true : undefined}
              aria-describedby={errors.serviceType ? "cf-service-error" : undefined}
              className={`${inputClass} field-select`}
            >
              <option value="">{t("serviceTypePlaceholder")}</option>
              {SERVICE_TYPE.map((code) => (
                <option key={code} value={code}>
                  {t(`serviceOptions.${code}`)}
                </option>
              ))}
            </select>
            {errors.serviceType && (
              <p id="cf-service-error" className="mt-1.5 text-xs text-red-600">
                {t("errors.serviceTypeRequired")}
              </p>
            )}
          </div>

          <div className="rounded-ui border border-black/10 bg-off-white p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                {...register("isAramcoVendor")}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 text-primary focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm font-semibold text-black">{t("isAramcoVendor")}</span>
            </label>

            {/* Only here when ticked, and only required then. Nothing is sent
                for it when the box is off. */}
            {isAramcoVendor && (
              <div className="mt-4">
                <label htmlFor="cf-aramco-id" className="mb-2 block text-xs font-semibold text-black">
                  {t("aramcoVendorId")}
                </label>
                <input
                  id="cf-aramco-id"
                  {...register("aramcoVendorId")}
                  inputMode="numeric"
                  placeholder={t("aramcoVendorIdPlaceholder")}
                  aria-invalid={errors.aramcoVendorId ? true : undefined}
                  aria-describedby={errors.aramcoVendorId ? "cf-aramco-id-error" : undefined}
                  className={inputClass}
                />
                {errors.aramcoVendorId && (
                  <p id="cf-aramco-id-error" className="mt-1.5 text-xs text-red-600">
                    {t("errors.aramcoIdRequired")}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {kind === "career" && (
        <div>
          <label htmlFor="cf-cv" className="mb-2 block text-xs font-semibold text-black">
            {t("cv")}
          </label>
          <input
            ref={cvInput}
            id="cf-cv"
            type="file"
            accept={CV_ACCEPT}
            onChange={(event) => acceptCv(event.target.files?.[0])}
            aria-invalid={cvError ? true : undefined}
            aria-describedby={cvError ? "cf-cv-error" : "cf-cv-hint"}
            className="w-full rounded-ui border border-black/10 bg-white px-4 py-3 text-sm text-black file:me-3 file:rounded-ui file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
          <p id="cf-cv-hint" className="mt-1.5 text-xs text-gray-muted">
            {cv ? `${t("cvChosen")}: ${cv.name}` : t("cvHint")}
          </p>
          {cvError && (
            <p id="cf-cv-error" className="mt-1.5 text-xs text-red-600">
              {cvError}
            </p>
          )}
        </div>
      )}

      {kind !== "career" && (
        <div>
          <label htmlFor="cf-message" className="mb-2 block text-xs font-semibold text-black">
            {t("message")}
          </label>
          <textarea
            id="cf-message"
            {...register("message")}
            rows={5}
            placeholder={t("messagePlaceholder")}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? "cf-message-error" : undefined}
            className={inputClass}
          />
          {errors.message && (
            <p id="cf-message-error" className="mt-1.5 text-xs text-red-600">
              {messageError}
            </p>
          )}
        </div>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>

      {/* The outcome is only conveyed by a coloured box appearing; role=status
          makes a screen reader announce it without stealing focus. */}
      <div role="status" aria-live="polite">
        {status === "success" && (
          <p className="rounded-ui bg-green-50 px-4 py-3 text-sm text-green-700">{t("success")}</p>
        )}
        {status === "error" && (
          <p className="rounded-ui bg-red-50 px-4 py-3 text-sm text-red-700">{t("error")}</p>
        )}
      </div>
    </form>
  );
}
