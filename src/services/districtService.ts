import { readFileSync } from 'fs';
import { District } from '../types';

// Load districts data
const districts: District[] = JSON.parse(
  readFileSync('./src/data/districts.json', 'utf-8')
).districts;

export const districtService = {
  getAll: () => districts,
  
  findById: (id: string) => districts.find(d => d.id === id),
  
  findByName: (name: string, language: 'ru' | 'uz') => 
    districts.find(d => d.name[language] === name),
  
  getDistrictName: (districtId: string, language: 'ru' | 'uz'): string => {
    const district = districts.find(d => d.id === districtId);
    return district ? district.name[language] : districtId;
  }
};