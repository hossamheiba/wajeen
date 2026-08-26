"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { contactFormSchema, type ContactFormValues } from "@/lib/contactSchema";

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-muted focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/20";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold text-black">{t("name")}</label>
          <input {...register("name")} placeholder={t("namePlaceholder")} className={inputClass} />
          {errors.name && <p className="mt-1.5 text-xs text-red-600">{t("errors.nameRequired")}</p>}
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-black">{t("email")}</label>
          <input {...register("email")} type="email" placeholder={t("emailPlaceholder")} className={inputClass} />
          {errors.email && <p className="mt-1.5 text-xs text-red-600">{t("errors.emailInvalid")}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold text-black">{t("phone")}</label>
          <input {...register("phone")} type="tel" placeholder={t("phonePlaceholder")} className={inputClass} />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-black">{t("sector")}</label>
          <select {...register("sector")} className={inputClass}>
            <option value="infrastructure">{t("sectorOptions.infrastructure")}</option>
            <option value="energy">{t("sectorOptions.energy")}</option>
            <option value="buildings">{t("sectorOptions.buildings")}</option>
            <option value="other">{t("sectorOptions.other")}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold text-black">{t("message")}</label>
        <textarea
          {...register("message")}
          rows={5}
          placeholder={t("messagePlaceholder")}
          className={inputClass}
        />
        {errors.message && <p className="mt-1.5 text-xs text-red-600">{messageError}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-orange px-9 py-3.5 text-sm font-semibold text-white shadow-[0_10px_25px_var(--color-orange-glow)] transition-opacity disabled:opacity-60"
      >
        {isSubmitting ? t("submitting") : t("submit")}
      </button>

      {status === "success" && (
        <p className="rounded-[var(--radius-md)] bg-green-50 px-4 py-3 text-sm text-green-700">
          {t("success")}
        </p>
      )}
      {status === "error" && (
        <p className="rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-red-700">{t("error")}</p>
      )}
    </form>
  );
}
