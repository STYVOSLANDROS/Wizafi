import { SiteForm } from "@/components/site-form";
import { createSiteAction } from "../actions";

export default function NewSitePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ajouter un site</h1>
      <SiteForm action={createSiteAction} submitLabel="Créer le site" />
    </div>
  );
}
