// Structured data (schema.org JSON-LD) for search engines. Built from each page's own content,
// so what search engines read always matches what people see.
const SITE = 'https://idid.care';
const APP = 'https://app.idid.care';

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();

/** Questions and answers from <details class="faq"><summary>Q</summary><div class="answer">A</div></details>. */
export function faqsFrom(html) {
  return [...html.matchAll(/<details class="faq"[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="answer">([\s\S]*?)<\/div>\s*<\/details>/g)]
    .map((m) => ({ q: text(m[1]), a: text(m[2]) }));
}

const org = {
  '@type': 'Organization', '@id': `${SITE}/#org`, name: 'iDID', url: SITE,
  logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/logo-1024.png`, width: 1024, height: 1024 },
  email: 'hello@idid.care',
  contactPoint: [
    { '@type': 'ContactPoint', contactType: 'customer support', email: 'hello@idid.care', availableLanguage: 'en' },
    { '@type': 'ContactPoint', contactType: 'press', email: 'press@idid.care', availableLanguage: 'en' },
  ],
};
const website = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'iDID', inLanguage: 'en', publisher: { '@id': `${SITE}/#org` } };

const app = (description) => ({
  '@type': 'WebApplication', '@id': `${SITE}/#app`, name: 'iDID', url: APP, description,
  applicationCategory: 'HealthApplication', applicationSubCategory: 'Mental health journal',
  operatingSystem: 'Any modern web browser; installable on iPhone, iPad, Android, Windows and Mac',
  browserRequirements: 'Requires JavaScript and a modern browser',
  isAccessibleForFree: true, inLanguage: 'en',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  image: `${SITE}/assets/img/og-image.png`,
  publisher: { '@id': `${SITE}/#org` },
  audience: { '@type': 'Audience', audienceType: 'People living with dissociation, DID, OSDD and trauma responses, and their families, friends and therapists' },
  featureList: [
    'Quick, optional logging of dissociative moments, triggers, mood, lost time and who was fronting',
    'Parts and system profiles with an inner message board',
    'Patterns and trends for triggers, places, feelings and what helps',
    'Breathing, box breathing, 5-4-3-2-1 grounding and a wordless Calm space',
    'Safety plan and a quiet "Check on me" request',
    'Trust circle with invite status, reminders and per-person access',
    'Read-only sharing with a therapist after explicit consent, removable at any time',
    'Appointment reminders and therapy preparation',
    'Encrypted on the device and end-to-end encrypted when shared; no ads or trackers',
    'Restore on a new device; in-app help guides',
  ],
  accessibilityFeature: ['highContrastDisplay', 'largePrint', 'readingOrder', 'structuralNavigation', 'reducedMotion'],
  accessibilityHazard: 'none',
});

const conditions = [
  { '@type': 'MedicalCondition', name: 'Dissociative identity disorder', alternateName: ['DID', 'Multiple personality disorder'] },
  { '@type': 'MedicalCondition', name: 'Dissociation' },
  { '@type': 'MedicalCondition', name: 'Other specified dissociative disorder', alternateName: 'OSDD' },
  { '@type': 'MedicalCondition', name: 'Post-traumatic stress disorder', alternateName: ['PTSD', 'Complex PTSD'] },
];

/** The JSON-LD <script> for one page. */
export function jsonLd({ name, path, title, description, html }) {
  const url = `${SITE}${path}`;
  const page = {
    '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description,
    inLanguage: 'en', isPartOf: { '@id': `${SITE}/#website` }, publisher: { '@id': `${SITE}/#org` },
    primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}/assets/img/og-image.png` },
  };
  const graph = [org, website, page];
  if (name === 'index') {
    page.about = { '@id': `${SITE}/#app` };
    graph.push(app(description));
  } else {
    page.breadcrumb = { '@id': `${url}#breadcrumb` };
    graph.push({
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: title.replace(/ · iDID$/, ''), item: url },
      ],
    });
  }
  if (name === 'learn') { page.about = conditions; page.audience = { '@type': 'PeopleAudience', audienceType: 'Patients, families and caregivers' }; }
  const faqs = faqsFrom(html);
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage', '@id': `${url}#faq`, isPartOf: { '@id': `${url}#webpage` },
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}
