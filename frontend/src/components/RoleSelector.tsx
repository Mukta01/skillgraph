"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoleInfo } from "@/lib/types";
import { fetchRoles } from "@/lib/api";

interface RoleSelectorProps {
  selectedRole: string;
  onRoleSelect: (role: string) => void;
}

export default function RoleSelector({
  selectedRole,
  onRoleSelect,
}: RoleSelectorProps) {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRoles()
      .then(setRoles)
      .catch(() => setRoles(FALLBACK_ROLES))
      .finally(() => setIsLoading(false));
  }, []);

  // Group roles by category
  const grouped = useMemo(() => {
    const filtered = roles.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
    const groups: Record<string, RoleInfo[]> = {};
    for (const role of filtered) {
      if (!groups[role.category]) groups[role.category] = [];
      groups[role.category].push(role);
    }
    return groups;
  }, [roles, search]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-white/60 mb-2">
        Target Role
      </label>

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={isOpen ? search : selectedRole || search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (!e.target.value) onRoleSelect("");
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={isLoading ? "Loading roles..." : "Search for a role..."}
          className="
            w-full px-4 py-3 rounded-xl
            bg-white/5 border border-white/15
            text-white placeholder-white/30
            focus:outline-none focus:border-indigo-400/60 focus:bg-white/[0.07]
            transition-all duration-200
          "
        />
        {selectedRole && (
          <button
            onClick={() => {
              onRoleSelect("");
              setSearch("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && Object.keys(grouped).length > 0 && (
        <div className="
          absolute z-50 mt-2 w-full max-h-64 overflow-y-auto
          bg-gray-900/95 backdrop-blur-xl border border-white/10
          rounded-xl shadow-2xl
        ">
          {Object.entries(grouped).map(([category, categoryRoles]) => (
            <div key={category}>
              <div className="px-3 py-2 text-xs font-semibold text-indigo-400/80 uppercase tracking-wider sticky top-0 bg-gray-900/95">
                {category}
              </div>
              {categoryRoles.map((role) => (
                <button
                  key={role.name}
                  onClick={() => {
                    onRoleSelect(role.name);
                    setSearch(role.name);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${
                      selectedRole === role.name
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  {role.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/** Fallback roles if the API is unreachable. */
const FALLBACK_ROLES: RoleInfo[] = [
  { name: "Software Engineer", category: "Technology" },
  { name: "Data Scientist", category: "Technology" },
  { name: "Product Manager", category: "Business" },
  { name: "UX Designer", category: "Design" },
  { name: "Digital Marketing Manager", category: "Marketing" },
  { name: "Financial Analyst", category: "Finance" },
];
