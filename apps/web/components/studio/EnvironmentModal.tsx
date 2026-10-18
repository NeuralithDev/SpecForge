"use client";

import React, { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, X, Check, Globe } from "lucide-react";
import type { Environment, EnvironmentVariable } from "@/lib/localStore";

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: Environment[];
  activeEnvironmentId: string | null;
  onSaveEnvironments: (environments: Environment[], activeId: string | null) => void;
}

export default function EnvironmentModal({
  isOpen,
  onClose,
  environments,
  activeEnvironmentId,
  onSaveEnvironments,
}: EnvironmentModalProps) {
  const [localEnvs, setLocalEnvs] = useState<Environment[]>(environments);
  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    activeEnvironmentId || environments[0]?.id || "",
  );
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const currentEnv = localEnvs.find((e) => e.id === selectedEnvId) || localEnvs[0];

  const handleAddEnv = () => {
    const newEnv: Environment = {
      id: `env_${Date.now()}`,
      name: "New Environment",
      variables: [
        { id: `var_${Date.now()}_1`, key: "BASE_URL", value: "https://api.example.com", enabled: true },
      ],
    };
    const updated = [...localEnvs, newEnv];
    setLocalEnvs(updated);
    setSelectedEnvId(newEnv.id);
  };

  const handleDeleteEnv = (id: string) => {
    if (localEnvs.length <= 1) return;
    const updated = localEnvs.filter((e) => e.id !== id);
    setLocalEnvs(updated);
    if (selectedEnvId === id) {
      setSelectedEnvId(updated[0]?.id || "");
    }
  };

  const handleUpdateEnvName = (name: string) => {
    if (!currentEnv) return;
    const updated = localEnvs.map((e) => (e.id === currentEnv.id ? { ...e, name } : e));
    setLocalEnvs(updated);
  };

  const handleAddVariable = () => {
    if (!currentEnv) return;
    const newVar: EnvironmentVariable = {
      id: `var_${Date.now()}`,
      key: "",
      value: "",
      enabled: true,
      isSecret: false,
    };
    const updated = localEnvs.map((e) =>
      e.id === currentEnv.id ? { ...e, variables: [...e.variables, newVar] } : e,
    );
    setLocalEnvs(updated);
  };

  const handleUpdateVariable = (varId: string, patch: Partial<EnvironmentVariable>) => {
    if (!currentEnv) return;
    const updatedVars = currentEnv.variables.map((v) => (v.id === varId ? { ...v, ...patch } : v));
    const updated = localEnvs.map((e) =>
      e.id === currentEnv.id ? { ...e, variables: updatedVars } : e,
    );
    setLocalEnvs(updated);
  };

  const handleDeleteVariable = (varId: string) => {
    if (!currentEnv) return;
    const updatedVars = currentEnv.variables.filter((v) => v.id !== varId);
    const updated = localEnvs.map((e) =>
      e.id === currentEnv.id ? { ...e, variables: updatedVars } : e,
    );
    setLocalEnvs(updated);
  };

  const toggleRevealSecret = (varId: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [varId]: !prev[varId] }));
  };

  const handleSaveAndClose = () => {
    onSaveEnvironments(localEnvs, selectedEnvId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Environment Manager</h2>
              <p className="text-xs text-slate-400">
                Variables are stored locally in your browser and interpolated as{" "}
                <code className="text-indigo-300 font-mono">{"{{VARIABLE_NAME}}"}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Environments List (Left Column) */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Environments
                </span>
                <button
                  onClick={handleAddEnv}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Add Environment"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {localEnvs.map((env) => (
                  <div
                    key={env.id}
                    onClick={() => setSelectedEnvId(env.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      env.id === selectedEnvId
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                        : "text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="truncate">{env.name}</span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {localEnvs.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnv(env.id);
                          }}
                          className="p-0.5 hover:text-rose-400 text-slate-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
              💡 Use in URLs, Headers, or Body:
              <div className="mt-1 font-mono text-indigo-400">{"{{BASE_URL}}/v1/charges"}</div>
            </div>
          </div>

          {/* Variables Table (Right Column) */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col">
            {currentEnv ? (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Environment Name
                  </label>
                  <input
                    type="text"
                    value={currentEnv.name}
                    onChange={(e) => handleUpdateEnvName(e.target.value)}
                    className="w-full max-w-sm px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-300">
                    Variables ({currentEnv.variables.length})
                  </span>
                  <button
                    onClick={handleAddVariable}
                    className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>

                {/* Variable rows */}
                <div className="space-y-2 flex-1">
                  {currentEnv.variables.map((variable) => {
                    const isRevealed = revealedSecrets[variable.id];
                    return (
                      <div
                        key={variable.id}
                        className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80"
                      >
                        <input
                          type="checkbox"
                          checked={variable.enabled}
                          onChange={(e) =>
                            handleUpdateVariable(variable.id, { enabled: e.target.checked })
                          }
                          className="rounded border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4 bg-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="VARIABLE_NAME"
                          value={variable.key}
                          onChange={(e) =>
                            handleUpdateVariable(variable.id, { key: e.target.value })
                          }
                          className="w-44 px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        <div className="relative flex-1">
                          <input
                            type={variable.isSecret && !isRevealed ? "password" : "text"}
                            placeholder="Value"
                            value={variable.value}
                            onChange={(e) =>
                              handleUpdateVariable(variable.id, { value: e.target.value })
                            }
                            className="w-full px-2 py-1 pr-8 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          />
                          {variable.isSecret && (
                            <button
                              type="button"
                              onClick={() => toggleRevealSecret(variable.id)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateVariable(variable.id, { isSecret: !variable.isSecret })
                          }
                          title={variable.isSecret ? "Secret (Masked)" : "Plain Text"}
                          className={`px-2 py-1 text-[10px] uppercase font-bold rounded border ${
                            variable.isSecret
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {variable.isSecret ? "Secret" : "Plain"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariable(variable.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {currentEnv.variables.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No variables defined in this environment yet.
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndClose}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Check className="w-4 h-4" />
            <span>Save Environments</span>
          </button>
        </div>
      </div>
    </div>
  );
}
