/**
 * Curated US support resources. Phone numbers, text codes and links were checked
 * against each organization's official site in November 2026 (see VERIFIED_ON).
 * ZIP-prefilled links are used only where the site was confirmed to accept them;
 * for the others, people enter their ZIP on the site itself.
 *
 * Nothing here is fetched automatically: a site only learns the ZIP code if the
 * person taps a link that includes it.
 */
import type { SupportNeed } from '../types';

export const VERIFIED_ON = 'November 2026';

export const NEEDS: { value: SupportNeed; label: string }[] = [
  { value: 'did', label: 'Dissociation / DID specialist' },
  { value: 'trauma', label: 'Trauma & PTSD therapy' },
  { value: 'low-cost', label: 'Free or low-cost care' },
  { value: 'medication', label: 'Psychiatry / medication' },
  { value: 'family', label: 'Help for family & caregivers' },
  { value: 'peer', label: 'Peer support & community' },
  { value: 'learn', label: 'Learning about dissociation' },
  { value: 'youth', label: 'Child or teen' },
  { value: 'lgbtq', label: 'LGBTQ+' },
  { value: 'veterans', label: 'Veteran or military' },
  { value: 'dv', label: 'Domestic or family violence' },
  { value: 'sexual-assault', label: 'Sexual assault' },
  { value: 'substance', label: 'Alcohol or drug use' },
  { value: 'spanish', label: 'En español' },
];

export type ResourceKind = 'talk' | 'near' | 'learn';

export interface Resource {
  id: string;
  name: string;
  kind: ResourceKind;
  about: string;
  /** Empty = useful for everyone. */
  needs: SupportNeed[];
  call?: string;
  /** Displayed form of the phone number. */
  callLabel?: string;
  text?: { to: string; body?: string; label: string };
  url: string;
  /** Link with the ZIP already filled in (only where verified). */
  zipUrl?: (zip: string) => string;
  /** The site asks for a ZIP or location; show it so it's easy to enter. */
  asksForZip?: boolean;
  hours?: string;
}

export const CRISIS: Resource[] = [
  {
    id: '988', name: '988 Suicide & Crisis Lifeline', kind: 'talk', needs: [],
    about: 'Free, confidential support for any kind of emotional distress, not only suicidal thoughts. Call, text or chat.',
    call: '988', callLabel: '988', text: { to: '988', label: 'Text 988' }, url: 'https://988lifeline.org/chat/', hours: '24/7',
  },
  {
    id: 'ctl', name: 'Crisis Text Line', kind: 'talk', needs: [],
    about: 'Text with a trained crisis counselor if talking out loud feels like too much.',
    text: { to: '741741', body: 'HOME', label: 'Text HOME to 741741' }, url: 'https://www.crisistextline.org/', hours: '24/7',
  },
];

export const RESOURCES: Resource[] = [
  // ---- Talk to someone ----
  {
    id: 'veterans', name: 'Veterans Crisis Line', kind: 'talk', needs: ['veterans'],
    about: 'For veterans, service members, Guard and Reserve, and the people who support them.',
    call: '988', callLabel: 'Dial 988, then press 1', text: { to: '838255', label: 'Text 838255' }, url: 'https://www.veteranscrisisline.net/', hours: '24/7',
  },
  {
    id: 'dv-hotline', name: 'National Domestic Violence Hotline', kind: 'talk', needs: ['dv'],
    about: 'Confidential support, safety planning and local referrals for anyone affected by abuse.',
    call: '18007997233', callLabel: '800-799-7233', text: { to: '88788', body: 'START', label: 'Text START to 88788' }, url: 'https://www.thehotline.org/', hours: '24/7',
  },
  {
    id: 'rainn', name: 'RAINN National Sexual Assault Hotline', kind: 'talk', needs: ['sexual-assault'],
    about: 'Connects you with a trained staff member from a sexual assault service provider near you.',
    call: '18006564673', callLabel: '800-656-4673', url: 'https://www.rainn.org/', hours: '24/7',
  },
  {
    id: 'trevor', name: 'The Trevor Project', kind: 'talk', needs: ['lgbtq', 'youth'],
    about: 'Crisis support for LGBTQ+ young people under 25.',
    call: '18664887386', callLabel: '1-866-488-7386', text: { to: '678678', body: 'START', label: 'Text START to 678-678' }, url: 'https://www.thetrevorproject.org/get-help/', hours: '24/7',
  },
  {
    id: 'trans-lifeline', name: 'Trans Lifeline', kind: 'talk', needs: ['lgbtq'],
    about: 'Peer support run by and for trans people. Spanish available (press 2).',
    call: '18775658860', callLabel: '877-565-8860', url: 'https://translifeline.org/hotline/', hours: 'Weekday afternoons and evenings; see site for hours',
  },
  {
    id: 'nami-helpline', name: 'NAMI HelpLine', kind: 'talk', needs: ['family', 'learn', 'peer'],
    about: 'Information, resource referrals and support for people living with mental health conditions and their families. Not a crisis line.',
    call: '18009506264', callLabel: '800-950-6264', text: { to: '62640', body: 'helpline', label: 'Text "helpline" to 62640' }, url: 'https://www.nami.org/', hours: 'Mon–Fri, 10 a.m.–10 p.m. ET',
  },
  {
    id: 'samhsa', name: 'SAMHSA National Helpline', kind: 'talk', needs: ['substance', 'low-cost', 'medication', 'spanish'],
    about: 'Free, confidential treatment referrals for mental health and substance use, in English and Spanish.',
    call: '18006624357', callLabel: '1-800-662-4357', url: 'https://www.samhsa.gov/find-help/helplines/national-helpline', hours: '24/7',
  },
  {
    id: '211', name: '211', kind: 'talk', needs: ['low-cost', 'family'],
    about: 'Your local line for help with housing, food, bills, transport, and finding local mental health services.',
    call: '211', callLabel: '211', url: 'https://www.211.org/about-us/your-local-211', asksForZip: true, hours: 'Most areas 24/7',
  },

  // ---- Near you ----
  {
    id: 'pt-did', name: 'Therapists who treat dissociation', kind: 'near', needs: ['did'],
    about: 'Psychology Today listings of therapists who list dissociative disorders (including DID) as a specialty.',
    url: 'https://www.psychologytoday.com/us/therapists', zipUrl: (z) => `https://www.psychologytoday.com/us/therapists/${z}?category=dissociative-disorders`,
  },
  {
    id: 'isstd', name: 'ISSTD therapist directory', kind: 'near', needs: ['did'],
    about: 'Members of the International Society for the Study of Trauma and Dissociation, the leading professional body for dissociation.',
    url: 'https://isstd.connectedcommunity.org/network/network-find-a-professional', asksForZip: true,
  },
  {
    id: 'pt-trauma', name: 'Trauma & PTSD therapists', kind: 'near', needs: ['trauma', 'did'],
    about: 'Psychology Today listings of therapists who specialize in trauma and PTSD.',
    url: 'https://www.psychologytoday.com/us/therapists', zipUrl: (z) => `https://www.psychologytoday.com/us/therapists/${z}?category=trauma-and-ptsd`,
  },
  {
    id: 'pt-all', name: 'Therapists, counselors & social workers', kind: 'near', needs: [],
    about: 'All Psychology Today listings near you. Filter by insurance, cost, language and more on the page.',
    url: 'https://www.psychologytoday.com/us/therapists', zipUrl: (z) => `https://www.psychologytoday.com/us/therapists/${z}`,
  },
  {
    id: 'hrsa', name: 'Community health centers', kind: 'near', needs: ['low-cost', 'medication'],
    about: 'Federally funded health centers, many with behavioral health care. Fees are based on income, insured or not.',
    url: 'https://findahealthcenter.hrsa.gov/', zipUrl: (z) => `https://findahealthcenter.hrsa.gov/?zip=${z}`,
  },
  {
    id: 'openpath', name: 'Open Path Collective', kind: 'near', needs: ['low-cost'],
    about: 'Lower-cost therapy, about $40–70 a session plus a one-time membership fee, in person or online.',
    url: 'https://openpathcollective.org/find-a-therapist/', asksForZip: true,
  },
  {
    id: 'findtreatment', name: 'FindTreatment.gov', kind: 'near', needs: ['substance', 'medication', 'low-cost'],
    about: "SAMHSA's locator for state-licensed mental health and substance use treatment.",
    url: 'https://findtreatment.gov/', asksForZip: true,
  },
  {
    id: 'nami-local', name: 'Your local NAMI', kind: 'near', needs: ['peer', 'family'],
    about: 'Free local support groups and classes for people living with mental health conditions and for families.',
    url: 'https://www.nami.org/find-your-local-nami/', asksForZip: true,
  },
  {
    id: 'rainn-centers', name: 'Local sexual assault service providers', kind: 'near', needs: ['sexual-assault'],
    about: "RAINN's directory of local centers for counseling, advocacy and accompaniment.",
    url: 'https://centers.rainn.org/', asksForZip: true,
  },

  // ---- Learn more ----
  {
    id: 'aim', name: 'An Infinite Mind', kind: 'learn', needs: ['did', 'peer', 'learn'],
    about: 'A nonprofit for people living with DID and the people who love them: education, events and community.',
    url: 'https://www.aninfinitemind.org/',
  },
  {
    id: 'isstd-public', name: 'ISSTD: resources for the public', kind: 'learn', needs: ['did', 'learn', 'family'],
    about: 'Plain-language information on trauma and dissociation from clinicians and researchers.',
    url: 'https://www.isst-d.org/publications-resources/public-resources/',
  },
  {
    id: 'nami-dd', name: 'NAMI: Dissociative disorders', kind: 'learn', needs: ['did', 'learn', 'family'],
    about: 'An overview of dissociative disorders, treatment, and how to support someone.',
    url: 'https://www.nami.org/types-of-conditions/dissociative-disorders/',
  },
  {
    id: 'cc-did', name: 'Cleveland Clinic: Dissociative identity disorder', kind: 'learn', needs: ['did', 'learn'],
    about: 'Symptoms, causes, diagnosis and treatment, explained by a major medical center.',
    url: 'https://my.clevelandclinic.org/health/diseases/9792-dissociative-identity-disorder-multiple-personality-disorder',
  },
  {
    id: 'samhsa-trauma', name: 'SAMHSA: Trauma and violence', kind: 'learn', needs: ['trauma', 'learn'],
    about: 'What trauma is, how it affects people, and trauma-informed care.',
    url: 'https://www.samhsa.gov/trauma-violence',
  },
  {
    id: 'nctsn', name: 'National Child Traumatic Stress Network', kind: 'learn', needs: ['youth', 'trauma', 'family'],
    about: 'Resources for children and teens affected by trauma, and for parents and caregivers.',
    url: 'https://www.nctsn.org/',
  },
  {
    id: 'mha', name: 'Mental Health America screening', kind: 'learn', needs: ['learn'],
    about: 'Free, anonymous screening tools (including for PTSD) to help you put words to what you notice and bring to a professional.',
    url: 'https://screening.mhanational.org/',
  },
];

export const isZip = (z: string) => /^\d{5}$/.test(z.trim());

/** Resources for these needs, best matches first. Everyone gets the general ones. */
export function matchResources(needs: SupportNeed[], kind: ResourceKind): Resource[] {
  const score = (r: Resource) => (r.needs.length === 0 ? 0.5 : r.needs.filter((n) => needs.includes(n)).length);
  return RESOURCES.filter((r) => r.kind === kind)
    .map((r) => ({ r, s: score(r) }))
    .filter(({ r, s }) => s > 0 || (needs.length === 0 && (r.kind !== 'talk' || r.id === 'nami-helpline' || r.id === 'samhsa')) || (r.kind === 'learn' && needs.length === 0))
    .sort((a, b) => b.s - a.s)
    .map(({ r }) => r);
}

export const telHref = (n: string) => `tel:${n}`;
export const smsHref = (t: { to: string; body?: string }) => `sms:${t.to}${t.body ? `?&body=${encodeURIComponent(t.body)}` : ''}`;
