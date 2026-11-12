/** The in-app help center: guides people can read at their own pace. **bold** is supported. */
import type { Route } from '../state';

export type HelpBlock = { p: string } | { h: string } | { steps: string[] } | { list: string[] } | { tip: string };
export interface HelpTopic { id: string; group: string; title: string; summary: string; body: HelpBlock[]; open?: { label: string; route: Route }[]; keywords?: string }

export const HELP_GROUPS = ['Getting started', 'Everyday use', 'Calm and safety', 'Your circle', 'Therapist and care team', 'Privacy and your data', 'Troubleshooting'];

export const HELP: HelpTopic[] = [
  // ---------- Getting started ----------
  {
    id: 'welcome', group: 'Getting started', title: 'What iDID is for',
    summary: 'A calm, private journal for dissociation, DID and trauma responses.',
    body: [
      { p: 'iDID ("I did") helps you gently notice and record moments that felt different: when and where they happened, what may have set them off, how you felt, who was fronting, and who was around.' },
      { p: 'Over time, **Patterns** shows what tends to come before hard moments and what helps. You can share exactly what you choose with your trust circle or your therapist.' },
      { tip: 'iDID is a journaling tool, not a medical device or a replacement for professional care. If you are in danger, call or text 988 (US) or your local emergency number.' },
    ],
    open: [{ label: 'Take the quick tour', route: { name: 'explore' } }],
    keywords: 'about intro start what is',
  },
  {
    id: 'first-week', group: 'Getting started', title: 'Your first week',
    summary: 'Five small steps that make iDID most useful.',
    body: [
      { steps: [
        'Log one moment, even a small one. Tap **Log** at the bottom of the screen. Approximate is fine.',
        'Answer a **check-in** when it appears, or tap "Check in with yourself" on Home.',
        'Write a **safety plan** while things are calmer. It takes about 10 minutes and you can change it any time.',
        'Add your **parts** if you have them, from the Circle tab. Only if and when it feels right.',
        'Invite one person you trust, or share a view with your therapist.',
      ] },
      { tip: 'There are no streaks to break. Coming back after a gap is always welcome.' },
    ],
    open: [{ label: 'Log a moment', route: { name: 'log' } }, { label: 'Safety plan', route: { name: 'safety' } }],
  },
  {
    id: 'settings', group: 'Getting started', title: 'Make iDID comfortable',
    summary: 'Colours, text size, calm motion, a readable font and auto-lock.',
    body: [
      { p: 'Open **Settings** (the gear at the top). You can choose a colour theme, larger text, a dyslexia-friendly font, and soft edges.' },
      { p: '**Calm motion** turns off animations and movement everywhere, including the breathing tools and Calm space, which switch to still versions.' },
      { p: '**Auto-lock** locks iDID after a few minutes away. **Quick hide** (the eye at the top) locks it instantly and shows an ordinary-looking screen.' },
      { p: 'You can also choose what to call parts: parts, alters, headmates or selves.' },
    ],
    open: [{ label: 'Open Settings', route: { name: 'settings' } }],
    keywords: 'theme font dark mode accessibility motion animation lock hide',
  },

  // ---------- Everyday use ----------
  {
    id: 'log', group: 'Everyday use', title: 'Logging a moment',
    summary: 'What each step asks, and what you can skip.',
    body: [
      { steps: [
        'Tap **Log**. Choose who it’s about if you support someone else.',
        'Set when it happened. Tick "about" if you’re not sure of the time.',
        'Add where you were and anything that may have set it off.',
        'Choose how you felt and, if you know, who was fronting.',
        'Note whether time was lost, roughly how long it lasted, and who noticed.',
        'Add notes if you like, then choose who can see it: your circle, or **only me**.',
      ] },
      { p: 'Every step is optional. A moment with just a time is still useful.' },
      { tip: '"Only me" moments are encrypted with your personal key. Nobody in your circle can open them, even with access to the circle.' },
    ],
    open: [{ label: 'Log a moment', route: { name: 'log' } }],
    keywords: 'entry add record journal switch dissociation episode',
  },
  {
    id: 'timeline', group: 'Everyday use', title: 'Timeline and reflections',
    summary: 'Look back, add what you remember later, and ask others what they noticed.',
    body: [
      { p: '**Timeline** lists moments newest first. Tap one to see it in full.' },
      { p: 'Add a **reflection** when you remember more later. You can also ask someone in your circle what they noticed, and their answer is added to the moment.' },
    ],
    open: [{ label: 'Open Timeline', route: { name: 'timeline' } }],
    keywords: 'history past entries follow up observation',
  },
  {
    id: 'patterns', group: 'Everyday use', title: 'Patterns and insights',
    summary: 'What tends to come before hard moments, and what helps.',
    body: [
      { p: '**Patterns** shows your common triggers, places, feelings and times of day, mood by week, how often time was lost, and which tools helped most.' },
      { p: 'Patterns are only as complete as what’s logged. Treat them as conversation starters, for yourself or with your therapist.' },
    ],
    open: [{ label: 'Open Patterns', route: { name: 'insights' } }],
    keywords: 'insights trends stats charts triggers',
  },
  {
    id: 'parts', group: 'Everyday use', title: 'Parts and your system',
    summary: 'Add parts, mark them resting, and leave notes on the inner board.',
    body: [
      { p: 'From **Circle**, add parts with a name, pronouns, age, role and notes about what helps them feel safe. Parts that are quiet for now can be marked **resting**; their history is kept.' },
      { p: 'The **inner board** is a private message board between parts: notes, reminders and kind words. It’s always encrypted with your personal key.' },
    ],
    open: [{ label: 'Open Circle', route: { name: 'circle' } }, { label: 'Inner board', route: { name: 'board' } }],
    keywords: 'alters headmates system fronting board',
  },
  {
    id: 'checkins', group: 'Everyday use', title: 'Check-ins and gentle nudges',
    summary: 'A kind word and a small idea, a few times a day.',
    body: [
      { p: 'Check-ins ask how you’re doing and suggest something small: breathe, step outside, drink water, or one of your own healthy rituals.' },
      { p: 'Choose how many nudges you get and set quiet hours in **Settings → Notifications**.' },
    ],
    open: [{ label: 'Settings', route: { name: 'settings' } }],
    keywords: 'nudges prompts reminders rituals',
  },
  {
    id: 'appointments', group: 'Everyday use', title: 'Appointments and therapy prep',
    summary: 'Reminders, calendar export, and notes to bring to sessions.',
    body: [
      { p: 'Add therapy, counseling or group sessions under **Circle → Appointments**. iDID can remind you beforehand and add them to your calendar.' },
      { p: '**Therapy prep** gathers moments since your last session, plus an agenda, questions and wins. After the session, jot down what you want to remember.' },
    ],
    open: [{ label: 'Appointments', route: { name: 'appointments' } }, { label: 'Therapy prep', route: { name: 'prep' } }],
    keywords: 'calendar session reminder therapy prep',
  },

  // ---------- Calm and safety ----------
  {
    id: 'pause', group: 'Calm and safety', title: 'Pause: breathing and grounding',
    summary: 'Breathe, box breathing, 5-4-3-2-1 and "right now".',
    body: [
      { list: [
        '**Breathe**: in as the circle grows, out as it softens.',
        '**Box**: in for 4, hold for 4, out for 4, hold for 4. Each square you finish adds a box to your group.',
        '**5-4-3-2-1**: notice five things you can see, four you can feel, three you can hear, two you can smell, one you can taste.',
        '**Right now**: today’s date, the time, and a gentle reminder that you’re in the present.',
      ] },
      { p: 'The **Calm space** is a wordless place to unwind for a minute: ripples, light trails or drifting lights.' },
    ],
    open: [{ label: 'Open Pause', route: { name: 'pause' } }, { label: 'Calm space', route: { name: 'calm' } }],
    keywords: 'breathing grounding calm anxiety panic box',
  },
  {
    id: 'safety', group: 'Calm and safety', title: 'Safety plan and Check on me',
    summary: 'A plan for hard moments, and a quiet way to ask for someone.',
    body: [
      { p: 'Your **safety plan** holds warning signs, things that help, people and places, professionals, steps to make things safer, and reasons that matter. Keep it private or share it with your circle.' },
      { p: '**Check on me** quietly asks chosen people to check in, call, text or visit. They get a notification with no details.' },
      { tip: 'In an emergency, call 911. For any emotional crisis in the US, call or text 988, or text HOME to 741741.' },
    ],
    open: [{ label: 'Safety plan', route: { name: 'safety' } }],
    keywords: 'crisis suicide emergency 988 help',
  },
  {
    id: 'body', group: 'Calm and safety', title: 'Body basics, meds and comfort kit',
    summary: 'Sleep, food, water and medications, plus things that help you feel safe.',
    body: [
      { p: '**Body basics** tracks sleep, meals, water and movement in a few taps. **Meds** keeps your medications and can remind you to take them.' },
      { p: 'Your **comfort kit** holds photos, songs, words and letters that help in hard moments.' },
    ],
    open: [{ label: 'Body basics', route: { name: 'body' } }, { label: 'Comfort kit', route: { name: 'comfort' } }],
    keywords: 'sleep water medication reminders comfort',
  },

  // ---------- Your circle ----------
  {
    id: 'circle', group: 'Your circle', title: 'Your trust circle',
    summary: 'The people who help, on this device or their own.',
    body: [
      { p: 'Your circle can include family, partners, friends and supporters. On a shared device, each person picks who’s here when iDID opens.' },
      { p: 'To let people use iDID on **their own** phones, connect your circle online and invite them. Everything is end-to-end encrypted: our server only ever stores scrambled data.' },
    ],
    open: [{ label: 'Open Circle', route: { name: 'circle' } }],
    keywords: 'family friends people members',
  },
  {
    id: 'online', group: 'Your circle', title: 'Going online and using more devices',
    summary: 'Sign in, create your circle, and add your other phone or computer.',
    body: [
      { steps: [
        'Go to **Circle → Connect devices & invite**.',
        'Enter your email and the 6-digit code we send you.',
        'Enter your journal passphrase. It locks the keys that let your devices read your circle.',
        'Choose **Create our circle**. Everything on this device is encrypted and uploaded.',
      ] },
      { h: 'On a new phone or computer' },
      { steps: [
        'Open iDID and tap **I already use iDID** on the welcome screen.',
        'Sign in with the same email and code, then your journal passphrase.',
        'Your journal comes back. Save this device’s new recovery code.',
      ] },
    ],
    open: [{ label: 'Connect online', route: { name: 'account' } }],
    keywords: 'sign in login account sync device new phone restore',
  },
  {
    id: 'invites', group: 'Your circle', title: 'Inviting people and seeing who joined',
    summary: 'Invite, remind, make a new link, or cancel.',
    body: [
      { steps: [
        'In **Circle**, tap **Invite**, or tap a person and choose **Invite**.',
        'Choose what they can see and do (see "Who can see what").',
        'Send the link from your phone: Share, Text, Email or Copy.',
      ] },
      { p: 'The **Invitations** list shows each invite as **Waiting**, **Joined** or **Expired**. Each link works once and expires after 7 days.' },
      { list: [
        '**Remind** sends the same link again, handy if it went to spam or was deleted.',
        '**New link** cancels the old one and makes a fresh one for the same person.',
        '**Cancel invite** stops the link from working.',
      ] },
      { tip: 'Invites are sent from your device, never by our server. The key to your circle is in the link after the #, and it never passes through us.' },
    ],
    open: [{ label: 'Open Circle', route: { name: 'circle' } }],
    keywords: 'invite remind resend spam expired link status joined',
  },
  {
    id: 'access', group: 'Your circle', title: 'Who can see what',
    summary: 'Choose each person’s access, and change it any time.',
    body: [
      { p: 'Tap a person in **Circle** to choose their access. The circle’s owner decides, and can hand the circle to someone else (see "Handing the circle to someone else").' },
      { list: [
        '**Can view and add**: sees what the circle shares, logs moments, adds what they noticed, and uses Check on me.',
        '**View only**: sees what the circle shares but can’t add or change anything. Our server refuses their changes.',
        '**Only selected information**: isn’t part of the circle. They get a private, read-only view of only what you tick, such as patterns, moments, your safety plan or appointments.',
      ] },
      { p: '**Remove access** stops them receiving anything new straight away. Anything already on their device stays there.' },
      { tip: 'Moments marked "only me", your inner board, body basics, meds, comfort kit and therapy prep are always private to you, whatever someone’s access.' },
    ],
    open: [{ label: 'Open Circle', route: { name: 'circle' } }],
    keywords: 'permissions roles view only read only remove access privacy selected',
  },
  {
    id: 'ownership', group: 'Your circle', title: 'Handing the circle to someone else',
    summary: 'When the person whose journal it is should manage the circle.',
    body: [
      { p: 'Often a parent, partner or friend sets iDID up first, and later the person whose journal it really is joins. They can become the circle’s **owner**, so they decide who sees what.' },
      { steps: [
        'Make sure they’ve joined the circle on their own device.',
        'In **Circle**, tap their name.',
        'Tap **Make [name] the circle’s owner**, read what changes, tick that you’re sure, and confirm.',
      ] },
      { list: [
        'They can then invite people, choose each person’s access, share with a care team, and remove access, including yours.',
        'You stay in the circle and can still view and add.',
        'Only the owner can hand it on again. To get it back, ask them to hand it back to you.',
      ] },
      { tip: 'The next time they open iDID, they’ll see a note that they now manage the circle, with a shortcut to review who can see what.' },
    ],
    open: [{ label: 'Open Circle', route: { name: 'circle' } }],
    keywords: 'owner ownership transfer hand over manage admin primary control',
  },
  {
    id: 'joining', group: 'Your circle', title: 'Joining someone else’s circle',
    summary: 'Including when you already use iDID on your own.',
    body: [
      { steps: [
        'Open the invite link you were sent.',
        'Set up iDID, or unlock it if you already use it, then sign in.',
        'Choose **Join circle**.',
        'If someone already made a profile for you, choose it under **Is one of these people you?**',
      ] },
      { p: 'Everything you’d written moves onto that profile: moments, parts, check-ins, your safety plan and more. Nothing is lost, you won’t appear twice, and "only me" moments stay private. If you had your own online circle, your journal moves into the new one.' },
    ],
    keywords: 'join merge combine circles duplicate profile family',
  },

  // ---------- Therapist ----------
  {
    id: 'careteam', group: 'Therapist and care team', title: 'Sharing with your therapist',
    summary: 'A private, read-only view that updates as you use iDID.',
    body: [
      { steps: [
        'Go to **Circle → Therapist & care team** and tap **Share with a therapist or someone else**.',
        'Add their name, who they are to you, and optionally their email or phone.',
        'Turn on exactly what they can see: patterns, moments, notes, parts, check-ins, safety plan, meds, appointments or therapy prep. Choose how far back, and for how long.',
        'Read the summary, tick that you agree, and tap **Share**.',
        'Send them the link. It opens in any browser, with no account needed.',
      ] },
      { p: 'Each person’s card shows when they last viewed it. Use **Change what they see** any time; you’ll be asked to agree again.' },
      { h: 'If your care changes' },
      { p: 'Tap **Remove access**. Their link stops working at once and the view is deleted from our server. If they’ve moved practice or changed details, remove them and share again with the new details.' },
      { tip: 'The view is encrypted on your device with a key that’s only in the link, so our server can’t read it. Anyone with the link can open it, so send it privately.' },
    ],
    open: [{ label: 'Therapist & care team', route: { name: 'careteam' } }],
    keywords: 'therapist counselor psychiatrist doctor share clinician provider care team access remove',
  },
  {
    id: 'export', group: 'Therapist and care team', title: 'Printing or exporting a summary',
    summary: 'A one-time summary for a session, or a spreadsheet.',
    body: [
      { p: 'From **Patterns → Share & export**, choose a time range, then print or save a clinician summary as a PDF, or share a CSV spreadsheet.' },
      { p: 'A full **backup** includes everything, but it isn’t encrypted, so keep it somewhere safe.' },
    ],
    open: [{ label: 'Share & export', route: { name: 'share' } }],
    keywords: 'pdf print csv export backup report',
  },

  // ---------- Privacy ----------
  {
    id: 'privacy', group: 'Privacy and your data', title: 'How your journal is protected',
    summary: 'Encrypted on your device, end to end online, and never sold.',
    body: [
      { list: [
        'Everything is encrypted on your device with AES-256, locked by your passphrase.',
        'Online, entries are encrypted before they leave your device. Our server stores only scrambled data and can’t read it.',
        'Invite links and therapist links carry their keys after the #, which browsers never send to servers.',
        'Notifications never include details, only a gentle nudge to open iDID.',
        'No ads, no trackers, and we never sell data.',
      ] },
    ],
    open: [{ label: 'What the server sees', route: { name: 'account' } }],
    keywords: 'encryption security private data safe',
  },
  {
    id: 'passphrase', group: 'Privacy and your data', title: 'Passphrase and recovery code',
    summary: 'What to do if you forget your passphrase.',
    body: [
      { p: 'Nobody, including us, can reset your passphrase. That’s what keeps your journal private.' },
      { p: 'If you forget it, use the **recovery code** you saved when you set up this device. You can change your passphrase and make a new recovery code in **Settings**.' },
      { tip: 'Use the same passphrase on all your devices. It also unlocks your online account keys.' },
    ],
    open: [{ label: 'Settings', route: { name: 'settings' } }],
    keywords: 'forgot password recovery reset locked out',
  },
  {
    id: 'notifications', group: 'Privacy and your data', title: 'Notifications on your phone',
    summary: 'Turning them on, including on iPhone.',
    body: [
      { p: 'Go to **Settings → Notifications** on each device, or **Notify this device** on the online circle screen.' },
      { p: 'On **iPhone and iPad**, first add iDID to your Home Screen: tap Share, then **Add to Home Screen**, then open iDID from there (iOS 16.4 or later).' },
    ],
    open: [{ label: 'Settings', route: { name: 'settings' } }],
    keywords: 'push alerts iphone ios android notify',
  },

  // ---------- Troubleshooting ----------
  {
    id: 'trouble', group: 'Troubleshooting', title: 'Common problems',
    summary: 'Sign-in codes, invites, sync and shared views.',
    body: [
      { h: 'I didn’t get a sign-in code' },
      { p: 'Wait a minute and check your spam or promotions folder. The email comes from hello@idid.care with the subject "Your iDID sign-in code". Codes expire after 15 minutes.' },
      { h: 'Someone didn’t get my invite' },
      { p: 'On the Circle page, tap **Remind** to send it again another way, such as a text. If it has expired, tap **New link**.' },
      { h: 'It says "Sync problem"' },
      { p: 'Check your connection and tap **Sync now** on the online circle screen. Your journal is safe on this device either way.' },
      { h: 'My therapist says the link doesn’t work' },
      { p: 'Make sure they copied the whole link, including everything after the #. If you removed their access or it ended, share again.' },
    ],
    open: [{ label: 'Suggest a feature or report a problem', route: { name: 'feedback' } }],
    keywords: 'problem error help code email spam sync broken not working',
  },
];

/** Topics matching a search, best first. */
export function searchHelp(q: string): HelpTopic[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return HELP;
  const text = (t: HelpTopic) => [t.title, t.summary, t.keywords ?? '', ...t.body.map((b) => Object.values(b).flat().join(' '))].join(' ').toLowerCase();
  return HELP.map((t) => ({ t, score: words.reduce((s, w) => s + (t.title.toLowerCase().includes(w) ? 3 : 0) + ((t.keywords ?? '').includes(w) ? 2 : 0) + (text(t).includes(w) ? 1 : 0), 0) }))
    .filter((x) => words.every((w) => text(x.t).includes(w)))
    .sort((a, b) => b.score - a.score).map((x) => x.t);
}
