"use client";

import { useRouter } from "next/navigation";
import CentralTemplatePreviewDemo from "../../components/CentralTemplatePreviewDemo";
import HuajaiyCentralTemplate from "../../components/HuajaiyCentralTemplate";

export default function CentralTemplatePage() {
  const router = useRouter();
  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
    >
      <CentralTemplatePreviewDemo variant="preview" />
    </HuajaiyCentralTemplate>
  );
}
