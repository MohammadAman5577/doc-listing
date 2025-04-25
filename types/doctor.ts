// src/types/doctor.ts
export interface Doctor {
    id: number;
    name: string;
    specialty: string;
    experience: string; // e.g., "10 years"
    ratings: number;
    availability: {
      "Video Consult": boolean;
      "In Clinic": boolean;
    };
    fees: string; // e.g., "$50"
    profile_img: string;
    video_consult?: boolean;
in_clinic?: boolean;
  }