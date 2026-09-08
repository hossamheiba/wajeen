"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { contactCopy, type Destination } from "@/lib/contactCopy";
import { contactFormSchema, type ContactFormValues } from "@/lib/contactSchema";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-ui border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ContactForm() {
  const t = useTranslations("contactPage.form");
  const locale = useLocale();
  const copy = contactCopy(locale);
  const groupName = useId();

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [destination, setDestination] = useState<Destination>("wjeen");

  /**
   * The vendor-only answers.
   *
   * Held here rather than registered with the form because the API's schema
   * has no room for them yet, and zod silently strips keys it does not know —
   * so registering them would look like it worked and lose them on the way
   * out. Folding them into the message means nothing a visitor types is
   * dropped, and when the inquiry work lands they become real fields with no
   * change to what anyone sees.
   */
  const [vendorCompany, setVendorCompany] = useState("");
  const [supplyType, setSupplyType] =
    useState<keyof typeof copy.supplyOptions>("materials");
  const [crNumber, setCrNumber] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { sector: "infrastructure", phone: "" },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setStatus("idle");

    // Everything the vendor form asked for rides in the message, so the email
    // carries it even though the schema has no column for it.
    const payload: ContactFormValues =
      destination === "vendor"
        ? {
            ...values,
            message: [
              `[${copy.summaryHeading}]`,
              `${copy.companyName}: ${vendorCompany}`,
              `${copy.supplyType}: ${copy.supplyOptions[supplyType]}`,
              `${copy.crNumber}: ${crNumber}`,
              "",
              values.message,
            ].join("\n"),
          }
        : values;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
      reset();
      setVendorCompany("");
      setCrNumber("");
    } catch {
      setStatus("error");
    }
  };

  const messageError =
    errors.message?.type === "too_small" ? t("errors.messageMin") : t("errors.messageRequired");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-5" noValidate>
      {/* Honeypot. Off-screen rather than display:none so a bot that skips
          hidden inputs still sees it, and removed from the tab order and the
          accessibility tree so nobody using a keyboard or a screen reader can
          reach it. autoComplete="off" keeps browsers from filling it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="cf-company">Company</label>
        <input
          id="cf-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("company")}
        />
      </div>

      {/* Real radios, visually hidden behind their labels: arrow keys move
          between them, the group is announced as a group, and none of that
          needs a line of JavaScript. */}
      <fieldset>
        <legend className="mb-2 block text-xs font-semibold text-black">
          {copy.chooseLabel}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {(["wjeen", "vendor"] as const).map((option) => {
            const active = destination === option;
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
                  onChange={() => setDestination(option)}
                  className="sr-only"
                />
                <span
                  className={`block text-sm font-bold ${
                    active ? "text-primary" : "text-black"
                  }`}
                >
                  {option === "wjeen" ? copy.wjeen : copy.vendor}
                </span>
                <span className="mt-0.5 block text-xs text-gray-muted">
                  {option === "wjeen" ? copy.wjeenHint : copy.vendorHint}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="mb-2 block text-xs font-semibold text-black">{t("name")}</label>
          <input
            id="cf-name"
            {...register("name")}
            placeholder={t("namePlaceholder")}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "cf-name-error" : undefined}
            className={inputClass}
          />
          {errors.name && <p id="cf-name-error" className="mt-1.5 text-xs text-red-600">{t("errors.nameRequired")}</p>}
        </div>
        <div>
          <label htmlFor="cf-email" className="mb-2 block text-xs font-semibold text-black">{t("email")}</label>
          <input
            id="cf-email"
            {...register("email")}
            type="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "cf-email-error" : undefined}
            className={inputClass}
          />
          {errors.email && <p id="cf-email-error" className="mt-1.5 text-xs text-red-600">{t("errors.emailInvalid")}</p>}
        </div>
      </div>

      {destination === "vendor" && (
        <div>
          <label htmlFor="cf-vendor-company" className="mb-2 block text-xs font-semibold text-black">
            {copy.companyName}
          </label>
          <input
            id="cf-vendor-company"
            type="text"
            value={vendorCompany}
            onChange={(event) => setVendorCompany(event.target.value)}
            placeholder={copy.companyNamePlaceholder}
            className={inputClass}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-phone" className="mb-2 block text-xs font-semibold text-black">{t("phone")}</label>
          <input id="cf-phone" {...register("phone")} type="tel" placeholder={t("phonePlaceholder")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cf-sector" className="mb-2 block text-xs font-semibold text-black">{t("sector")}</label>
          <select id="cf-sector" {...register("sector")} className={inputClass}>
            <option value="infrastructure">{t("sectorOptions.infrastructure")}</option>
            <option value="energy">{t("sectorOptions.energy")}</option>
            <option value="buildings">{t("sectorOptions.buildings")}</option>
            <option value="other">{t("sectorOptions.other")}</option>
          </select>
        </div>
      </div>

      {destination === "vendor" && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="cf-supply" className="mb-2 block text-xs font-semibold text-black">
              {copy.supplyType}
            </label>
            <select
              id="cf-supply"
              value={supplyType}
              onChange={(event) =>
                setSupplyType(event.target.value as keyof typeof copy.supplyOptions)
              }
              className={inputClass}
            >
              {Object.entries(copy.supplyOptions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cf-cr" className="mb-2 block text-xs font-semibold text-black">
              {copy.crNumber}
            </label>
            <input
              id="cf-cr"
              type="text"
              inputMode="numeric"
              value={crNumber}
              onChange={(event) => setCrNumber(event.target.value)}
              placeholder={copy.crNumberPlaceholder}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="cf-message" className="mb-2 block text-xs font-semibold text-black">{t("message")}</label>
        <textarea
          id="cf-message"
          {...register("message")}
          rows={5}
          placeholder={t("messagePlaceholder")}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "cf-message-error" : undefined}
          className={inputClass}
        />
        {errors.message && <p id="cf-message-error" className="mt-1.5 text-xs text-red-600">{messageError}</p>}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>

      {/* The outcome is only conveyed by a coloured box appearing; role=status
          makes a screen reader announce it without stealing focus. */}
      <div role="status" aria-live="polite">
        {status === "success" && (
          <p className="rounded-ui bg-green-50 px-4 py-3 text-sm text-green-700">
            {t("success")}
          </p>
        )}
        {status === "error" && (
          <p className="rounded-ui bg-red-50 px-4 py-3 text-sm text-red-700">{t("error")}</p>
        )}
      </div>
    </form>
  );
}
