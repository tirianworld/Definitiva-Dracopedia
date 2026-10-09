import React from "react";

export interface CozyFxConfig {
  preset?: string;
  primaryColor?: string;
  secondaryColor?: string;
  particleType?: string;
  speed?: string;
  density?: string;
  ambientMoodText?: string;
  audioAmbientType?: string;
  titleBadge?: string;
  customPrompt?: string;
  themeAudioUrl?: string;
}

export interface CozyAmbientOverlayProps {
  config?: CozyFxConfig;
  isActive?: boolean;
  onToggleActive?: () => void;
  isEditing?: boolean;
  onGenerateAiFx?: (userPrompt: string) => void;
  isGenerating?: boolean;
  onSaveToArticle?: (newConfig: CozyFxConfig) => void;
  isSaving?: boolean;
  savedSuccess?: boolean;
  articleSlug?: string;
  onUpdateConfig?: (updated: CozyFxConfig) => void;
}

export function CozyAmbientOverlay(_props: CozyAmbientOverlayProps) {
  return null;
}
