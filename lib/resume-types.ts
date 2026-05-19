export type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'rejected' | 'offer';

export type MasterResume = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationRecord = {
  id: string;
  masterResumeId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  status: ApplicationStatus;
  matchScore: number;
  tailoredResumeContent: string;
  coverLetterContent: string;
  createdAt: string;
  updatedAt: string;
};

export const APPLICATION_STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offer', label: 'Offer' },
];
