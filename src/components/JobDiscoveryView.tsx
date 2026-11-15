import React from 'react';
import { JobListing, NavigationView, PreferredLanguage } from '../types/accessbridge';
import { CareerGateway } from './CareerGateway';

interface JobDiscoveryViewProps {
  onSelectJobForApplication: (job: JobListing) => void;
  onSpeakText: (text: string) => void;
  simplifiedInstructions: boolean;
  onNavigate: (view: NavigationView) => void;
  onOpenPreferences: () => void;
  language: PreferredLanguage;
}

export const JobDiscoveryView: React.FC<JobDiscoveryViewProps> = ({
  onSelectJobForApplication,
  onSpeakText,
  language,
}) => {
  return (
    <CareerGateway
      onSelectJobForApplication={onSelectJobForApplication}
      onSpeakText={onSpeakText}
      language={language}
    />
  );
};
