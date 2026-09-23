const gap = {
  matched_skills: [{ name: "Python" }, { name: "SQL" }],
};

const roleRequirements = {
  role_title: "Software Engineer",
  skills: [
    { name: "Python", category: "technical" },
    { name: "SQL", category: "technical" },
    { name: "Docker", category: "tool" },
    { name: "AWS", category: "tool" },
    { name: "Communication", category: "soft" }
  ]
};

const CATEGORY_LABELS = {
  technical: "Technical",
  tool: "Tools",
  domain: "Domain",
  soft: "Soft Skills",
  certification: "Certifications",
};

const matchedNames = new Set(gap.matched_skills.map((s) => s.name.toLowerCase()));

const groups = {};
for (const skill of roleRequirements.skills) {
  const cat = skill.category || "technical";
  if (!groups[cat]) groups[cat] = [];
  groups[cat].push(skill);
}

let graph = `graph TD\n`;

const roleId = "RoleCenter";
graph += `    ${roleId}["${roleRequirements.role_title}"]\n`;

const matchedClass = "matchedSkill";
const missingClass = "missingSkill";
const roleClass = "roleCenter";

// Styles
graph += `    classDef ${matchedClass} fill:#064e3b,stroke:#047857,color:#6ee7b7,stroke-width:1.5px,rx:10px,ry:10px;\n`;
graph += `    classDef ${missingClass} fill:#7f1d1d,stroke:#b91c1c,color:#fca5a5,stroke-width:1.5px,rx:10px,ry:10px;\n`;
graph += `    classDef ${roleClass} fill:#312e81,stroke:#4f46e5,color:#c7d2fe,stroke-width:2px,rx:14px,ry:14px;\n`;
graph += `    classDef category fill:transparent,stroke:#4f46e5,stroke-width:1px,stroke-dasharray:5 5,color:#a5b4fc;\n\n`;

graph += `    class ${roleId} ${roleClass};\n\n`;

let nodeIndex = 0;
Object.entries(groups).forEach(([category, skills], i) => {
  const catLabel = CATEGORY_LABELS[category] || category;
  const catId = `Cat_${i}`;
  
  graph += `    subgraph ${catId} ["${catLabel}"]\n`;
  graph += `      direction TB\n`;
  
  const nodeIds = [];
  skills.forEach((skill) => {
    const nodeId = `Node_${nodeIndex++}`;
    const isMatched = matchedNames.has(skill.name.toLowerCase());
    const safeName = skill.name.replace(/"/g, "'"); // Escape quotes
    
    graph += `      ${nodeId}["${safeName}"]\n`;
    graph += `      class ${nodeId} ${isMatched ? matchedClass : missingClass};\n`;
    nodeIds.push(nodeId);
  });
  graph += `    end\n`;
  graph += `    class ${catId} category;\n`;
  
  graph += `    ${roleId} --> ${catId}\n`;
  graph += `    linkStyle ${i} stroke:#4f46e5,stroke-width:1.5px;\n\n`;
});

console.log(graph);
