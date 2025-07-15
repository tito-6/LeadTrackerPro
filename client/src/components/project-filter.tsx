import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building } from "lucide-react";
import { detectProjectFromWebFormNotu } from "@/lib/project-detector";
import { useQuery } from "@tanstack/react-query";

interface Lead {
  id?: string;
  webFormNote?: string;
  projectName?: string;
  [key: string]: any;
}

interface ProjectFilterProps {
  value: string;
  onChange: (project: string) => void;
  availableProjects?: string[];
}

export default function ProjectFilter({
  value,
  onChange,
  availableProjects,
}: ProjectFilterProps) {
  // If availableProjects is not provided, extract from leads
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const response = await fetch("/api/leads");
      return response.json();
    },
    enabled: !availableProjects,
  });

  const projects = useMemo(() => {
    if (availableProjects && availableProjects.length > 0)
      return availableProjects;
    const projectSet = new Set<string>();
    projectSet.add("Model Sanayi Merkezi");
    projectSet.add("Model Kuyum Merkezi");
    leads.forEach((lead) => {
      const webFormNotu = lead.webFormNote || "";
      const detectedProject = detectProjectFromWebFormNotu(webFormNotu);
      if (detectedProject) {
        projectSet.add(detectedProject);
      }
      if (lead.projectName) {
        projectSet.add(lead.projectName);
      }
    });
    return Array.from(projectSet).sort();
  }, [leads, availableProjects]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-600" />
          Proje Filtresi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Proje seçin" />
          </SelectTrigger>
          <SelectContent className="w-full max-w-xs">
            <SelectItem value="all">Tüm Projeler</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project} value={project}>
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
