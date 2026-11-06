import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Bot,
  Sparkles,
  Code2,
  Palette,
  MessageSquare,
  Cpu,
  Flame,
  Sun,
  Wand2,
  Check,
  PlusCircle,
} from 'lucide-react';
import type {
  GeneratedPBRTexturePack,
  PhysicsBodyType,
  ColliderShape,
  SceneEntity,
  Vec3,
} from '../types/engine';
import { generateProceduralPBRPack } from '../engine/pbrTextureGenerator';
import { generateAIScriptFromPrompt, generateAINPCProfile } from '../engine/aiCopilot';

interface RightPanelProps {
  selectedEntity: SceneEntity | null;
  allEntities: SceneEntity[];
  onUpdateEntity: (id: string, patch: Partial<SceneEntity>) => void;
  texturePacks: GeneratedPBRTexturePack[];
  onRegisterTexturePack: (pack: GeneratedPBRTexturePack, applyToEntityId?: string | null) => void;
  onConsoleLog: (level: 'info' | 'warn' | 'error' | 'physics' | 'wasm' | 'ai', source: string, msg: string) => void;
  onOpenCodeTab: () => void;
  requestedTab?: 'inspector' | 'ai';
  requestId?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  mode: 'code' | 'texture' | 'npc';
  text: string;
  codePreview?: string;
  texturePack?: GeneratedPBRTexturePack;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  selectedEntity,
  allEntities,
  onUpdateEntity,
  texturePacks,
  onRegisterTexturePack,
  onConsoleLog,
  onOpenCodeTab,
  requestedTab,
  requestId,
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'ai'>('inspector');

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab, requestId]);

  const [aiMode, setAiMode] = useState<'code' | 'texture' | 'npc'>('code');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome-ai',
      role: 'assistant',
      mode: 'code',
      text: 'Halo! Aku Aether AI Co-Pilot. Pilih sebuah objek di Scene lalu minta aku membuatkan Skrip Logika, Tekstur PBR 4-Map (Albedo, Normal, Roughness, Metallic), atau Perilaku Dialog NPC!',
    },
  ]);

  const updateVec3 = (field: 'position' | 'rotation' | 'scale', axis: 0 | 1 | 2, val: number) => {
    if (!selectedEntity) return;
    const next: Vec3 = [...selectedEntity[field]] as Vec3;
    next[axis] = Number.isFinite(val) ? val : 0;
    onUpdateEntity(selectedEntity.id, { [field]: next });
  };

  const handleRunAIGenerate = (overridePrompt?: string, overrideMode?: 'code' | 'texture' | 'npc') => {
    const promptText = (overridePrompt ?? aiPrompt).trim();
    const targetMode = overrideMode ?? aiMode;
    if (!promptText) return;

    setIsGenerating(true);
    const userEntry: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      mode: targetMode,
      text: promptText,
    };
    setChatHistory((prev) => [...prev, userEntry]);
    if (!overridePrompt) setAiPrompt('');

    setTimeout(() => {
      if (targetMode === 'texture') {
        const pack = generateProceduralPBRPack(promptText);
        const targetId = selectedEntity && selectedEntity.type !== 'light' && selectedEntity.type !== 'camera'
          ? selectedEntity.id
          : null;
        onRegisterTexturePack(pack, targetId);
        onConsoleLog(
          'ai',
          'Aether Text-to-Texture',
          `Generated 4-Map Seamless PBR "${pack.name}"${targetId ? ` & applied to ${selectedEntity?.name}` : ''}.`
        );
        setChatHistory((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            mode: 'texture',
            text: targetId
              ? `PBR Material "${pack.name}" (Albedo + Sobel Normal + Roughness + Metallic) berhasil dibuat, disimpan ke OPFS Cache, dan langsung diterapkan ke "${selectedEntity?.name}"!`
              : `PBR Material "${pack.name}" berhasil dibuat dan disimpan ke Asset Drawer! Pilih objek 3D lalu klik "Apply to Selected" untuk menerapkannya.`,
            texturePack: pack,
          },
        ]);
      } else if (targetMode === 'code') {
        const targetName = selectedEntity?.name || 'SelectedObject';
        const res = generateAIScriptFromPrompt(promptText, targetName);
        if (selectedEntity) {
          onUpdateEntity(selectedEntity.id, {
            script: {
              enabled: true,
              name: `${selectedEntity.name.replace(/[^a-zA-Z0-9]/g, '')}AI.ts`,
              language: 'typescript',
              code: res.code,
            },
            physics: res.enablePhysicsDynamic
              ? {
                  enabled: true,
                  bodyType: 'dynamic',
                  collider: selectedEntity.physics?.collider || 'box',
                  mass: selectedEntity.physics?.mass || 20,
                  restitution: selectedEntity.physics?.restitution ?? 0.25,
                  friction: selectedEntity.physics?.friction ?? 0.7,
                  gravityScale: 1,
                }
              : selectedEntity.physics,
          });
          onConsoleLog('ai', 'AI Code Assistant', `${res.summary} -> Terpasang di "${selectedEntity.name}"`);
        }
        setChatHistory((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            mode: 'code',
            text: selectedEntity
              ? `${res.summary} Tekan tombol ▶ Play di Top Bar untuk mengujinya langsung!`
              : `Skrip berhasil dibuat! Pilih objek di Scene Hierarchy terlebih dahulu jika ingin langsung memasangnya.`,
            codePreview: res.code,
          },
        ]);
      } else {
        const npcCfg = generateAINPCProfile(promptText, selectedEntity?.name || 'Cyber NPC');
        if (selectedEntity) {
          onUpdateEntity(selectedEntity.id, { npc: npcCfg });
          onConsoleLog('ai', 'AI NPC Behavior', `Persona dialog dinamis "${npcCfg.npcName}" aktif pada ${selectedEntity.name}.`);
        }
        setChatHistory((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            mode: 'npc',
            text: selectedEntity
              ? `Perilaku AI NPC "${npcCfg.npcName}" (${npcCfg.roleTitle}) telah dipasang ke "${selectedEntity.name}". Klik objek saat mode Play untuk mengobrol!`
              : `Profil NPC "${npcCfg.npcName}" dibuat! Pilih karakter di Scene untuk memasangnya.`,
          },
        ]);
      }
      setIsGenerating(false);
    }, 180);
  };

  return (
    <div className="h-full bg-[#0e1421] border-l border-slate-800/80 flex flex-col select-none">
      {/* Top Switcher Tabs: Inspector vs Aether AI Co-Pilot */}
      <div className="grid grid-cols-2 border-b border-slate-800/80 bg-[#0a0f1a] shrink-0">
        <button
          onClick={() => setActiveTab('inspector')}
          className={`py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'inspector'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Inspector
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'ai'
              ? 'border-purple-400 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" /> Aether AI Co-Pilot
        </button>
      </div>

      {/* TAB 1: INSPECTOR */}
      {activeTab === 'inspector' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          {!selectedEntity ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Sliders className="w-8 h-8 mb-2 text-slate-600" />
              <p className="font-medium text-slate-300 mb-1">Belum ada objek dipilih</p>
              <p className="text-[11px]">
                Klik objek di 3D Viewport atau Scene Hierarchy untuk mengedit Transform, PBR Material, dan Fisika.
              </p>
            </div>
          ) : (
            <>
              {/* Entity Identity Header */}
              <div className="bg-[#090d16] border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedEntity.visible}
                    onChange={(e) => onUpdateEntity(selectedEntity.id, { visible: e.target.checked })}
                    className="accent-cyan-400"
                  />
                  <input
                    value={selectedEntity.name}
                    onChange={(e) => onUpdateEntity(selectedEntity.id, { name: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Tag</span>
                    <input
                      value={selectedEntity.tag}
                      onChange={(e) => onUpdateEntity(selectedEntity.id, { tag: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Layer</span>
                    <input
                      value={selectedEntity.layer}
                      onChange={(e) => onUpdateEntity(selectedEntity.id, { layer: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* TRANSFORM COMPONENT */}
              <div className="bg-[#090d16] border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                    Transform
                  </span>
                  <button
                    onClick={() =>
                      onUpdateEntity(selectedEntity.id, {
                        position: [0, 0.5, 0],
                        rotation: [0, 0, 0],
                        scale: [1, 1, 1],
                      })
                    }
                    className="text-[10px] text-slate-400 hover:text-cyan-300"
                  >
                    Reset
                  </button>
                </div>

                {(
                  [
                    { field: 'position', label: 'Position', step: 0.2 },
                    { field: 'rotation', label: 'Rotation', step: 5 },
                    { field: 'scale', label: 'Scale', step: 0.1 },
                  ] as const
                ).map(({ field, label, step }) => (
                  <div key={field}>
                    <span className="text-[10px] text-slate-400 block mb-1">{label}</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['X', 'Y', 'Z'] as const).map((axisLabel, i) => (
                        <div
                          key={axisLabel}
                          className="flex items-center bg-slate-900 border border-slate-800 rounded overflow-hidden"
                        >
                          <span
                            className={`px-1.5 text-[10px] font-bold ${
                              i === 0 ? 'text-rose-400' : i === 1 ? 'text-emerald-400' : 'text-sky-400'
                            }`}
                          >
                            {axisLabel}
                          </span>
                          <input
                            type="number"
                            step={step}
                            value={selectedEntity[field][i]}
                            onChange={(e) =>
                              updateVec3(field, i as 0 | 1 | 2, parseFloat(e.target.value))
                            }
                            className="w-full bg-transparent px-1 py-0.5 text-[11px] font-mono-code text-slate-100 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* PBR MATERIAL COMPONENT */}
              {selectedEntity.type !== 'light' && selectedEntity.type !== 'camera' && (
                <div className="bg-[#090d16] border border-slate-800 rounded-xl p-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Palette className="w-3 h-3" /> PBR Material (WebGPU)
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('ai');
                        setAiMode('texture');
                      }}
                      className="text-[10px] text-purple-300 hover:text-purple-200 flex items-center gap-0.5"
                    >
                      <Wand2 className="w-3 h-3" /> AI Texture
                    </button>
                  </div>

                  {/* Albedo & Emissive Colors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Albedo Color</span>
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded p-1">
                        <input
                          type="color"
                          value={selectedEntity.material.albedo}
                          onChange={(e) =>
                            onUpdateEntity(selectedEntity.id, {
                              material: { ...selectedEntity.material, albedo: e.target.value },
                            })
                          }
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="font-mono-code text-[10px] text-slate-300">
                          {selectedEntity.material.albedo}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Emissive Glow</span>
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded p-1">
                        <input
                          type="color"
                          value={selectedEntity.material.emissive}
                          onChange={(e) =>
                            onUpdateEntity(selectedEntity.id, {
                              material: { ...selectedEntity.material, emissive: e.target.value },
                            })
                          }
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="font-mono-code text-[10px] text-slate-300">
                          {selectedEntity.material.emissive}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PBR Sliders: Metallic, Roughness, Normal Scale, Emissive Intensity */}
                  {(
                    [
                      { key: 'metallic', label: 'Metallic', min: 0, max: 1, step: 0.02 },
                      { key: 'roughness', label: 'Roughness', min: 0, max: 1, step: 0.02 },
                      { key: 'normalScale', label: 'Normal Map Strength', min: 0, max: 2.5, step: 0.05 },
                      { key: 'emissiveIntensity', label: 'Emissive HDR', min: 0, max: 3, step: 0.05 },
                    ] as const
                  ).map((prop) => (
                    <div key={prop.key}>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>{prop.label}</span>
                        <span className="font-mono-code text-cyan-300">
                          {Number(selectedEntity.material[prop.key]).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={prop.min}
                        max={prop.max}
                        step={prop.step}
                        value={selectedEntity.material[prop.key]}
                        onChange={(e) =>
                          onUpdateEntity(selectedEntity.id, {
                            material: {
                              ...selectedEntity.material,
                              [prop.key]: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-cyan-400 h-1.5"
                      />
                    </div>
                  ))}

                  {/* PBR Texture Pack Selector */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      PBR 4-Map Texture (Albedo/Normal/Rough/Metal)
                    </span>
                    <select
                      value={selectedEntity.material.texturePackId || ''}
                      onChange={(e) =>
                        onUpdateEntity(selectedEntity.id, {
                          material: {
                            ...selectedEntity.material,
                            texturePackId: e.target.value || undefined,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                    >
                      <option value="">None (Procedural Solid PBR)</option>
                      {texturePacks.map((tp) => (
                        <option key={tp.id} value={tp.id}>
                          {tp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* LIGHT COMPONENT */}
              {selectedEntity.type === 'light' && selectedEntity.light && (
                <div className="bg-[#090d16] border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Sun className="w-3 h-3" /> Dynamic GI Light
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Light Color</span>
                    <input
                      type="color"
                      value={selectedEntity.light.color}
                      onChange={(e) =>
                        onUpdateEntity(selectedEntity.id, {
                          light: { ...selectedEntity.light!, color: e.target.value },
                        })
                      }
                      className="w-7 h-6 bg-transparent"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Intensity</span>
                      <span>{selectedEntity.light.intensity.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.2}
                      value={selectedEntity.light.intensity}
                      onChange={(e) =>
                        onUpdateEntity(selectedEntity.id, {
                          light: { ...selectedEntity.light!, intensity: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* GPU PARTICLE EMITTER COMPONENT */}
              {selectedEntity.type === 'particle' && selectedEntity.particle && (
                <div className="bg-[#090d16] border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <span className="font-bold text-pink-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Flame className="w-3 h-3" /> GPU Particle Shader
                  </span>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>GPU Particle Count</span>
                      <span className="font-mono-code text-pink-300">
                        {selectedEntity.particle.count.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={60000}
                      step={1000}
                      value={selectedEntity.particle.count}
                      onChange={(e) =>
                        onUpdateEntity(selectedEntity.id, {
                          particle: {
                            ...selectedEntity.particle!,
                            count: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-pink-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedEntity.particle.mode}
                      onChange={(e) =>
                        onUpdateEntity(selectedEntity.id, {
                          particle: {
                            ...selectedEntity.particle!,
                            mode: e.target.value as any,
                          },
                        })
                      }
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px]"
                    >
                      <option value="portal">Portal Vortex</option>
                      <option value="fire">Fire Plume</option>
                      <option value="sparks">Plasma Sparks</option>
                      <option value="galaxy">Galaxy Spiral</option>
                      <option value="snow">Snow Field</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={selectedEntity.particle.colorStart}
                        onChange={(e) =>
                          onUpdateEntity(selectedEntity.id, {
                            particle: { ...selectedEntity.particle!, colorStart: e.target.value },
                          })
                        }
                        className="w-6 h-6 bg-transparent"
                      />
                      <input
                        type="color"
                        value={selectedEntity.particle.colorEnd}
                        onChange={(e) =>
                          onUpdateEntity(selectedEntity.id, {
                            particle: { ...selectedEntity.particle!, colorEnd: e.target.value },
                          })
                        }
                        className="w-6 h-6 bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PHYSICS & SIMULATION COMPONENT (RAPIER / WASM) */}
              <div className="bg-[#090d16] border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Physics (Wasm / Rapier)
                  </span>
                  {selectedEntity.physics ? (
                    <input
                      type="checkbox"
                      checked={selectedEntity.physics.enabled}
                      onChange={(e) =>
                        onUpdateEntity(selectedEntity.id, {
                          physics: { ...selectedEntity.physics!, enabled: e.target.checked },
                        })
                      }
                      className="accent-emerald-400"
                    />
                  ) : (
                    <button
                      onClick={() =>
                        onUpdateEntity(selectedEntity.id, {
                          physics: {
                            enabled: true,
                            bodyType: 'dynamic',
                            collider: 'box',
                            mass: 10,
                            restitution: 0.45,
                            friction: 0.6,
                            gravityScale: 1,
                          },
                        })
                      }
                      className="text-[10px] text-emerald-400 flex items-center gap-0.5 hover:underline"
                    >
                      <PlusCircle className="w-3 h-3" /> Add Body
                    </button>
                  )}
                </div>

                {selectedEntity.physics?.enabled && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Body Type</span>
                        <select
                          value={selectedEntity.physics.bodyType}
                          onChange={(e) =>
                            onUpdateEntity(selectedEntity.id, {
                              physics: {
                                ...selectedEntity.physics!,
                                bodyType: e.target.value as PhysicsBodyType,
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[11px]"
                        >
                          <option value="dynamic">RigidBody Dynamic</option>
                          <option value="static">Fixed / Static</option>
                          <option value="kinematic">Kinematic</option>
                          <option value="softbody">SoftBody / Cloth</option>
                          <option value="vehicle">Vehicle Chassis</option>
                          <option value="ragdoll">Articulated Ragdoll</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Collider</span>
                        <select
                          value={selectedEntity.physics.collider}
                          onChange={(e) =>
                            onUpdateEntity(selectedEntity.id, {
                              physics: {
                                ...selectedEntity.physics!,
                                collider: e.target.value as ColliderShape,
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[11px]"
                        >
                          <option value="box">Box</option>
                          <option value="sphere">Sphere</option>
                          <option value="capsule">Capsule</option>
                          <option value="trimesh">Trimesh</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Restitution ({selectedEntity.physics.restitution.toFixed(2)})
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={selectedEntity.physics.restitution}
                          onChange={(e) =>
                            onUpdateEntity(selectedEntity.id, {
                              physics: {
                                ...selectedEntity.physics!,
                                restitution: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-emerald-400"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Gravity ({selectedEntity.physics.gravityScale.toFixed(1)}x)
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={2.5}
                          step={0.1}
                          value={selectedEntity.physics.gravityScale}
                          onChange={(e) =>
                            onUpdateEntity(selectedEntity.id, {
                              physics: {
                                ...selectedEntity.physics!,
                                gravityScale: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-emerald-400"
                        />
                      </div>
                    </div>

                    <label className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5 cursor-pointer">
                      <span>WASD + Space Player Control</span>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedEntity.physics.isPlayerControlled)}
                        onChange={(e) =>
                          onUpdateEntity(selectedEntity.id, {
                            physics: {
                              ...selectedEntity.physics!,
                              isPlayerControlled: e.target.checked,
                            },
                          })
                        }
                        className="accent-cyan-400"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* SCRIPT & ANIMATOR IK QUICK SUMMARY */}
              <div className="bg-[#090d16] border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> Attached Logic Script
                  </span>
                  <button
                    onClick={onOpenCodeTab}
                    className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 hover:bg-purple-500/30"
                  >
                    Open Editor
                  </button>
                </div>
                {selectedEntity.script ? (
                  <div className="text-[11px] flex items-center justify-between bg-slate-900 rounded px-2 py-1.5 border border-slate-800">
                    <span className="font-mono-code text-cyan-300 truncate">
                      {selectedEntity.script.name}
                    </span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {selectedEntity.script.language}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Belum ada skrip. Gunakan Aether AI Co-Pilot atau Code Editor di panel bawah.
                  </p>
                )}

                {selectedEntity.animator && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold text-cyan-300 uppercase">
                      State Machine Animator & IK
                    </div>
                    <label className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Foot Placement IK</span>
                      <input
                        type="checkbox"
                        checked={selectedEntity.animator.footIK}
                        onChange={(e) =>
                          onUpdateEntity(selectedEntity.id, {
                            animator: { ...selectedEntity.animator!, footIK: e.target.checked },
                          })
                        }
                        className="accent-cyan-400"
                      />
                    </label>
                    <label className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Head Look-At IK</span>
                      <input
                        type="checkbox"
                        checked={selectedEntity.animator.lookAtIK}
                        onChange={(e) =>
                          onUpdateEntity(selectedEntity.id, {
                            animator: { ...selectedEntity.animator!, lookAtIK: e.target.checked },
                          })
                        }
                        className="accent-cyan-400"
                      />
                    </label>
                    {selectedEntity.animator.lookAtIK && (
                      <select
                        value={selectedEntity.animator.lookAtTargetId || ''}
                        onChange={(e) =>
                          onUpdateEntity(selectedEntity.id, {
                            animator: {
                              ...selectedEntity.animator!,
                              lookAtTargetId: e.target.value || undefined,
                            },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px]"
                      >
                        <option value="">-- Look-At Target --</option>
                        {allEntities
                          .filter((x) => x.id !== selectedEntity.id)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: AETHER AI GENERATIVE SUITE (CO-PILOT) */}
      {activeTab === 'ai' && (
        <div className="flex-1 flex flex-col min-h-0 p-3 text-xs">
          {/* Selected Target Context Pill */}
          <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Target Objek:</span>
            <span className="font-semibold text-cyan-300 truncate max-w-[155px]">
              {selectedEntity ? selectedEntity.name : 'Pilih objek di Scene'}
            </span>
          </div>

          {/* 3 Generative Mode Pills */}
          <div className="grid grid-cols-3 gap-1 bg-[#090d16] p-1 rounded-xl border border-slate-800 mb-2.5 shrink-0">
            {[
              { id: 'code', label: 'AI Code', icon: Code2 },
              { id: 'texture', label: 'Text-to-PBR', icon: Palette },
              { id: 'npc', label: 'AI NPC', icon: MessageSquare },
            ].map((m) => {
              const Icon = m.icon;
              const active = aiMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setAiMode(m.id as 'code' | 'texture' | 'npc')}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 text-white ring-1 ring-purple-400/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" /> {m.label}
                </button>
              );
            })}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="mb-2 flex flex-wrap gap-1 shrink-0">
            {aiMode === 'code' &&
              [
                'Buat objek ini melompat saat spasi ditekan dan mengejar pemain',
                'Melayang naik turun dan berputar dengan cahaya neon',
                'Patroli bolak-balik menjaga area',
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleRunAIGenerate(preset, 'code')}
                  className="text-left text-[10px] px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 transition line-clamp-1"
                >
                  ✨ {preset}
                </button>
              ))}

            {aiMode === 'texture' &&
              [
                'dinding bata berlumut seamless',
                'lantai sci-fi neon hex panel',
                'lava vulkanik retak membara',
                'emas ukir kuno kerajaan',
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleRunAIGenerate(preset, 'texture')}
                  className="text-left text-[10px] px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-300 transition"
                >
                  🎨 {preset}
                </button>
              ))}

            {aiMode === 'npc' &&
              [
                'Pedagang senjata cyberpunk sinis tapi tahu rahasia Sektor 9',
                'Penyihir kuno penjaga segel kristal Eldoria',
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleRunAIGenerate(preset, 'npc')}
                  className="text-left text-[10px] px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-300 transition line-clamp-1"
                >
                  🧠 {preset}
                </button>
              ))}
          </div>

          {/* Chat & Generated Artifacts Feed */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-2.5 ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-100 ml-4'
                    : 'bg-[#090d16] border border-slate-800 text-slate-200'
                }`}
              >
                <p className="text-[11px] leading-relaxed">{msg.text}</p>

                {msg.codePreview && (
                  <pre className="mt-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono-code text-cyan-300 overflow-x-auto max-h-36">
                    {msg.codePreview}
                  </pre>
                )}

                {msg.texturePack && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-4 gap-1 text-center text-[9px] text-slate-400">
                      <div>
                        <img
                          src={msg.texturePack.albedoDataUrl}
                          alt="Albedo"
                          className="w-full aspect-square rounded border border-slate-700"
                        />
                        Albedo
                      </div>
                      <div>
                        <img
                          src={msg.texturePack.normalDataUrl}
                          alt="Normal"
                          className="w-full aspect-square rounded border border-slate-700"
                        />
                        Normal
                      </div>
                      <div>
                        <img
                          src={msg.texturePack.roughnessDataUrl}
                          alt="Roughness"
                          className="w-full aspect-square rounded border border-slate-700"
                        />
                        Rough
                      </div>
                      <div>
                        <img
                          src={msg.texturePack.metallicDataUrl}
                          alt="Metallic"
                          className="w-full aspect-square rounded border border-slate-700"
                        />
                        Metal
                      </div>
                    </div>
                    {selectedEntity && (
                      <button
                        onClick={() =>
                          onUpdateEntity(selectedEntity.id, {
                            material: {
                              ...selectedEntity.material,
                              texturePackId: msg.texturePack!.id,
                            },
                          })
                        }
                        className="w-full py-1 rounded-md bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 text-[11px] font-semibold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Terapkan ke "{selectedEntity.name}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Prompt Input Box */}
          <div className="mt-2 pt-2 border-t border-slate-800 shrink-0">
            <div className="flex gap-1.5">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunAIGenerate()}
                placeholder={
                  aiMode === 'texture'
                    ? 'Ketik mis: dinding bata berlumut seamless...'
                    : aiMode === 'code'
                    ? 'Ketik logika mis: lompat saat spasi & kejar pemain...'
                    : 'Deskripsikan kepribadian & lore NPC...'
                }
                className="flex-1 bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              />
              <button
                disabled={isGenerating}
                onClick={() => handleRunAIGenerate()}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-bold flex items-center gap-1 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
