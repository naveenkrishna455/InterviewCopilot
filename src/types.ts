export interface InterviewQuestion {
  id: string;
  prompt: string;
  category: string;
}

export interface InterviewSession {
  id: string;
  role: string;
  resumeFileName: string | null;
  createdAt: string;
}

declare global {
  interface Window {
    desktop?: {
      appVersion: string;
    };
  }
}
