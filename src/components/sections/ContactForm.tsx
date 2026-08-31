"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { contactFormSchema, type ContactFormValues } from "@/lib/contactSchema";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-ui border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ContactForm() {
  const t = useTranslations("contactPage.form");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

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
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
      reset();
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
