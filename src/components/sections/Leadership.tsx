import { getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Member {
  name: string;
  role: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export async function Leadership() {
  const t = await getTranslations("aboutPage.leadership");
  const members = t.raw("members") as Member[];

  return (
    <section id="leadership" className="bg-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-orange">{t("tag")}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-black lg:text-4xl">
            {t("title")}
          </SplitReveal>
          <p className="mt-4 text-sm leading-relaxed text-gray-muted">{t("description")}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((member) => (
            <div
              key={member.name}
              className="rounded-[var(--radius-lg)] border border-black/5 bg-off-white p-7 text-center"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-dark-green text-xl font-bold text-orange">
                {initials(member.name)}
              </div>
              <div className="mt-4 text-base font-bold text-black">{member.name}</div>
              <div className="mt-1 text-xs text-gray-muted">{member.role}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs italic text-gray-muted">{t("note")}</p>
      </div>
    </section>
  );
}
