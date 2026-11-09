import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerReset } from '../../shared/resetRegistry'
import { safeStorage } from '../money/safeStorage'

export interface FacilitatorExtra {
  phone: string; specialties: string[]; status: 'Active' | 'On leave' | 'Inactive'; dayRate: number
  accreditation: string; bio: string; city: string
}

const SEED: Record<string, FacilitatorExtra> = {
  s3: { phone: '082 555 0103', specialties: ['Health & Safety', 'Cybersecurity', 'Project Management'], status: 'Active', dayRate: 6500, accreditation: 'SAQA-registered assessor', bio: 'Lead trainer with a background in industrial safety and project delivery.', city: 'Cape Town' },
  s4: { phone: '083 555 0104', specialties: ['Leadership', 'Finance Skills'], status: 'Active', dayRate: 7200, accreditation: 'Certified leadership facilitator', bio: 'Former operations manager who coaches new team leaders.', city: 'Stellenbosch' },
  s5: { phone: '084 555 0105', specialties: ['Soft Skills', 'Compliance'], status: 'On leave', dayRate: 5800, accreditation: 'POPIA practitioner', bio: 'Communication and compliance trainer with a people-first approach.', city: 'Bellville' },
}

interface State {
  extras: Record<string, FacilitatorExtra>
  setExtra: (id: string, e: FacilitatorExtra) => void
  removeExtra: (id: string) => void
}

export const useFacilitators = create<State>()(persist(
  set => ({
    extras: structuredClone(SEED),
    setExtra: (id, e) => set(s => ({ extras: { ...s.extras, [id]: e } })),
    removeExtra: id => set(s => { const x = { ...s.extras }; delete x[id]; return { extras: x } }),
  }),
  { name: 'tms-facilitators-v1', storage: safeStorage() },
))

registerReset(() => useFacilitators.setState({ extras: structuredClone(SEED) }))

export const blankExtra = (): FacilitatorExtra => ({ phone: '', specialties: [], status: 'Active', dayRate: 6000, accreditation: '', bio: '', city: '' })
