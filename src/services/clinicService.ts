import { readFileSync, writeFileSync } from 'fs';
import { Clinic, Service } from '../types';

// Load clinics data
let clinics: Clinic[] = JSON.parse(
  readFileSync('./src/data/clinics.json', 'utf-8')
).clinics;

export const clinicService = {
  getAll: () => clinics,
  
  findById: (id: string) => clinics.find(c => c.id === id),
  
  findByName: (name: string) => clinics.find(c => c.name === name),
  
  add: (clinic: Clinic) => {
    clinics.push(clinic);
    saveClinicData();
  },
  
  update: (clinic: Clinic) => {
    const index = clinics.findIndex(c => c.id === clinic.id);
    if (index !== -1) {
      clinics[index] = clinic;
      saveClinicData();
    }
  },
  
  delete: (id: string) => {
    clinics = clinics.filter(c => c.id !== id);
    saveClinicData();
  },
  
  findNearestClinics: (userLat: number, userLon: number, limit = 5) => {
    return clinics
      .map(clinic => ({
        ...clinic,
        distance: calculateDistance(
          userLat,
          userLon,
          clinic.location.latitude,
          clinic.location.longitude
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  },
  
  getAllServices: (): Array<{ clinic: Clinic; service: Service }> => {
    const results: Array<{ clinic: Clinic; service: Service }> = [];
    clinics.forEach(clinic => {
      clinic.services.forEach(service => {
        results.push({ clinic, service });
      });
    });
    return results;
  }
};

// Helper functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function saveClinicData() {
  writeFileSync('./src/data/clinics.json', JSON.stringify({ clinics }, null, 2));
}