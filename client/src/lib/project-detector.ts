/**
 * Utility functions to detect project names from WebForm Notu field in lead data
 */

/**
 * Extract project name from WebForm Notu field
 * @param webFormNotu The content of the WebForm Notu field
 * @returns Detected project name or null if no project is detected
 */
export function detectProjectFromWebFormNotu(
  webFormNotu: string
): string | null {
  if (!webFormNotu) return null;

  // Normalize the text for case-insensitive matching
  const normalizedText = webFormNotu.toLowerCase();

  // Check for "Model Sanayi Merkezi"
  if (normalizedText.includes("sanayi")) {
    return "Model Sanayi Merkezi";
  }

  // Check for "Model Kuyum Merkezi"
  if (normalizedText.includes("kuyum")) {
    return "Model Kuyum Merkezi";
  }

  // Check for other common project patterns
  if (normalizedText.includes("vadi istanbul")) {
    return "Vadi İstanbul";
  }

  // No recognized project pattern
  return null;
}

/**
 * Process an array of lead records to extract all unique project names
 * @param leads Array of lead records with WebForm Notu field
 * @returns Array of unique project names found in the data
 */
export function extractProjectsFromLeads(leads: any[]): string[] {
  const projects = new Set<string>();

  leads.forEach((lead) => {
    if (!lead["WebForm Notu"]) return;

    const project = detectProjectFromWebFormNotu(lead["WebForm Notu"]);
    if (project) {
      projects.add(project);
    }
  });

  return Array.from(projects);
}

// Add normalization helper
function normalizeProjectName(name: string): string {
  return (name || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filter leads by project name
 * @param leads Array of lead records with WebForm Notu field
 * @param projectName Name of the project to filter by (or 'all' for all projects)
 * @returns Filtered array of leads
 */
export function filterLeadsByProject(leads: any[], projectName: string): any[] {
  if (projectName === "all") {
    return leads;
  }
  const normalizedProject = normalizeProjectName(projectName);

  return leads.filter((lead) => {
    // Check both projectName and detected project from WebForm Notu
    const projectField = normalizeProjectName(lead.projectName || lead["Proje"] || "");
    const webFormNotu = lead.webFormNote || lead["WebForm Notu"] || "";
    const detectedProject = normalizeProjectName(detectProjectFromWebFormNotu(webFormNotu) || "");

    return projectField === normalizedProject || detectedProject === normalizedProject;
  });
}
