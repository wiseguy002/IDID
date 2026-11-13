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
    summary: 'Colors, text size, calm motion, a readable font and auto-lock.',
    body: [
      { p: 'Open **Settings** (the gear at the top). You can choose a color theme, larger text, a dyslexia-friendly font, and soft edges.' },
      { p: '**Calm motion** turns off animations and movement everywhere, including the breathing tools and Calm space, which switch to still versions.' },
      { p: '**Auto-lock** locks iDID after a few minutes away. **Quick hide** (the eye at the top) locks it instantly and shows an ordinary-looking screen.' },
      { p: 'You can also choose what to call parts: parts, alters, headmates or selves.' },
    ],
    open: [{ label: 'Open Settings', route: { name: 'settings' } }],
    keywords: 'theme font dark mode accessibility motion animation lock hide',
  },

  {
    id: 'explore', group: 'Getting started', title: 'Explore, badges and the quick tour',
    summary: 'See everything iDID can do, at your own pace.',
    body: [
      { p: '**Explore** lists every feature, grouped by what it helps with, and shows which ones you’ve tried. Tap **Try it** to open one.' },
      { p: 'Gentle milestone **badges** mark things like your first note or your first safety plan. There are no streaks to break and no comparisons, and you can hide badges in Explore.' },
      { p: 'Now and then (at most once a week, never in your first two days) iDID may suggest **something that might help**. Tap "Don’t suggest this" or turn suggestions off in Explore.' },
      { p: 'The **quick tour** takes about a minute. Replay it any time from Explore or here in Help.' },
    ],
    open: [{ label: 'Open Explore', route: { name: 'explore' } }],
    keywords: 'badges explore tour features suggestions tips milestones',
  },
  {
    id: 'updates', group: 'Getting started', title: 'What’s new, updates and working offline',
    summary: 'How iDID updates, and what happens without a connection.',
    body: [
      { p: 'iDID updates itself. The first time it opens after an update, a short note on Home lists what changed. The full history is in **Settings → What’s new**.' },
      { p: 'Your journal lives on your device, so iDID works **offline**. A quiet note tells you when you’re offline, and anything you add syncs with your circle when you’re back.' },
      { p: 'If something unexpected goes wrong, iDID shows a calm page with **Try again** and **Reload**. Your journal is safe.' },
      { tip: 'If iDID ever looks out of date, close it completely and open it again.' },
    ],
    open: [{ label: 'What’s new', route: { name: 'changelog' } }],
    keywords: 'update version changelog new offline no internet error crash',
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
    id: 'kindness', group: 'Everyday use', title: 'Kindness: pay it forward and kind notes',
    summary: 'Small ways to brighten someone else’s day.',
    body: [
      { p: '**Pay it forward** suggests one small act of kindness each day, like smiling at someone or saying hi. Tick it off when you’ve done it.' },
      { p: '**Kind notes** let you send an anonymous note of encouragement to a random person using iDID. You choose from caring messages and a little picture. There are no replies or direct messages.' },
      { p: 'Receiving kind notes is **opt-in** and limited to three a day. You can turn it off at any time.' },
      { p: 'Know someone iDID might help? **Settings → Tell a friend** shares a short message about it.' },
    ],
    open: [{ label: 'Kindness', route: { name: 'kindness' } }],
    keywords: 'kindness kind notes pay it forward encouragement anonymous tell a friend share',
  },
  {
    id: 'garden', group: 'Everyday use', title: 'Mood Garden',
    summary: 'A garden that grows from the ways you look after yourself.',
    body: [
      { p: 'Your **Mood Garden** has one plant for each of your parts, or one plant for you if you don’t use parts. Family members and supporters get a garden of their own.' },
      { list: [
        '**What makes it grow**: noting moments (a part’s plant grows when they were fronting), check-ins, pauses, box breathing, the Calm space, kind acts and kind notes, body basics, notes on the inner board, comfort kit items, and noticing things for someone else.',
        '**Nothing ever wilts.** Plants only grow. There are no streaks to keep, and hard days add growth too.',
        '**Choose plants and names**: tap a plant to pick one that fits, like a cactus for a protector or wildflowers for a little one, and give it a name.',
        '**Weather** follows your recent check-ins: sun, clouds, a breeze, wind and rain, or a storm. Plants bend in the wind but keep growing, and a rainbow comes when things ease. You can turn weather off.',
        '**Seasons** change through the year, or you can keep it always spring.',
      ] },
      { p: '**Ways to help it grow** offers a few gentle ideas, each one tap away: check in, breathe a box, play in the Calm space, send a kind note to pay it forward, or let a quieter part leave a note. On hard days the ideas get softer. **Look at what you’ve already done** counts the care you’ve given so far.' },
      { tip: 'The garden is worked out on your device. Plant types and names are saved with each part, encrypted like everything else.' },
    ],
    open: [{ label: 'Open Mood Garden', route: { name: 'garden' } }],
    keywords: 'garden plants grow progress motivation weather seasons parts alters habits encouragement',
  },
  {
    id: 'fronting', group: 'Everyday use', title: 'Who’s here (fronting log)',
    summary: 'Note which parts are around in two taps, and see gentle patterns.',
    body: [
      { p: 'Open **Who’s here** from Home or your parts in Circle. Tap who’s around now (more than one is fine, the first is noted as in front), or **Not sure**. You can mark that things feel blurry and add a word about it.' },
      { list: [
        '**Notes waiting**: if someone left a note on the inner board for a part who’s here now, it appears right away. Tap **Mark as read** when they’ve seen it.',
        '**Patterns** (after a few notes): roughly how much time each part spends in front, when they usually arrive, and the most common hand-overs, over 7, 30 or 90 days.',
        '**History** lists every note, and you can delete any of them.',
      ] },
      { tip: 'The fronting log is always private: it’s encrypted with a key only your own devices hold, even if you share a circle. Patterns are rough on purpose and worked out on your device.' },
    ],
    open: [{ label: 'Open Who’s here', route: { name: 'front' } }, { label: 'Inner board', route: { name: 'board' } }],
    keywords: 'fronting front switch switching alters parts headmates who is here log history patterns co-fronting',
  },
  {
    id: 'missed', group: 'Calm and safety', title: 'What did I miss?',
    summary: 'After lost time: today’s date, then what happened in iDID during the gap.',
    body: [
      { p: 'Losing time is a common part of dissociation. **What did I miss?** (on Home) starts by grounding you: the day, date and time, and a moment to notice where you are.' },
      { p: 'Then choose **since when**: since you last opened iDID, the last few hours, today, the last week, or the last time you remember. iDID gathers everything noted in that time: who was around, moments logged, inner-board notes, voice notes, notes from your circle, check-ins, appointments that were scheduled, and what’s coming up in the next two days.' },
      { tip: 'It only shows what was added to iDID. If you’re unsure what else happened, it’s okay to ask someone you trust.' },
    ],
    open: [{ label: 'What did I miss?', route: { name: 'missed' } }],
    keywords: 'lost time amnesia memory gap missed what happened blank grounding',
  },
  {
    id: 'voice', group: 'Everyday use', title: 'Voice notes',
    summary: 'Record up to two minutes in your own voice, encrypted.',
    body: [
      { p: 'When typing is too much, open **Voice notes** from Home and tap **Record**. Add a title or who’s speaking if you like. Each note can be up to 2 minutes long.' },
      { p: 'The first time, your browser asks to use the microphone. iDID only listens while you’re recording.' },
      { tip: 'Recordings are encrypted on your device before they’re saved or synced, with a key only your own devices hold, so they’re never shared with your circle.' },
    ],
    open: [{ label: 'Open voice notes', route: { name: 'voice' } }],
    keywords: 'voice audio record recording microphone speak talk',
  },
  {
    id: 'reflection', group: 'Everyday use', title: 'Weekly reflection',
    summary: 'An optional, gentle look back at your week.',
    body: [
      { p: 'Turn on **Weekly reflection** in Settings. From Saturday evening to Monday, Home offers a short look back: how many moments you noted, check-ins, and something kind about the week. You can answer three questions (what helped, what was hard, and one small hope for next week) or skip.' },
      { p: 'Past reflections appear at the bottom of **Patterns**, and can be useful to bring to therapy.' },
      { tip: 'Reflections are never scored, and missing a week is fine. They’re private to your own devices.' },
    ],
    open: [{ label: 'Open Settings', route: { name: 'settings' } }],
    keywords: 'weekly reflection review week journal look back sunday',
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

  {
    id: 'support', group: 'Calm and safety', title: 'Find support near you',
    summary: 'Crisis lines, specialists, low-cost care and your own contacts.',
    body: [
      { p: 'Add your **ZIP code** and what would help (for example a dissociation or DID specialist, trauma therapy, low-cost care, family support, LGBTQ+ or veterans’ services). iDID suggests crisis lines, nearby specialists, community health centers, helplines and groups.' },
      { p: 'Save the people who help you as **support contacts**, such as your therapist, social worker or a crisis center, with call, text, email and map buttons. **Pin** them to show on the Pause screen.' },
      { tip: 'Your ZIP code and needs stay encrypted in your journal. Searches only send what’s in the link you tap.' },
    ],
    open: [{ label: 'Find support', route: { name: 'support' } }],
    keywords: 'support zip specialist therapist near me crisis contacts helpline group low cost',
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

  {
    id: 'supporters', group: 'Your circle', title: 'Supporting someone',
    summary: 'For partners, family and friends: what to say and do.',
    body: [
      { p: 'The **Supporting someone** guide (Home → My tools, or Circle) explains what dissociation can look like and offers words to try, helpful things to do, and things to avoid when someone:' },
      { list: ['seems far away or foggy', 'has a different part around', 'has lost time', 'is overwhelmed or panicking', 'wants to talk about it later'] },
      { tip: 'You don’t need perfect words. Calm, kind and steady helps most. Ask the person what they’d prefer, and look after yourself too.' },
    ],
    open: [{ label: 'Open the guide', route: { name: 'supporters' } }],
    keywords: 'supporter partner family friend what to say scripts help someone caregiver',
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
        'Anonymous counts are off unless you turn them on in Settings → Privacy. They only say how often each screen was opened, sent without your account.',
        'You can ask us for a copy of what our servers hold, or to delete it, at privacy@idid.care. The full privacy policy and terms are at idid.care/privacy and idid.care/terms.',
      ] },
    ],
    open: [{ label: 'What the server sees', route: { name: 'account' } }],
    keywords: 'encryption security private data safe rights delete copy terms hipaa analytics anonymous counts usage',
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
      { h: 'The "Email me a code" button says "One moment"' },
      { p: 'iDID is quickly checking that you’re a person, not a bot. It usually takes a second. If a box appears, tick it. If it doesn’t finish, check your connection, turn off any content blocker for app.idid.care, and reload.' },
      { h: 'A new device won’t accept my passphrase' },
      { p: 'If the screen says **Welcome back** and asks for a passphrase, this device already has a journal on it, often the sample circle from someone looking around. It isn’t yours, so your passphrase won’t open it. iDID now spots the sample and offers **I already use iDID: bring my journal here**. For any other journal, tap **This isn’t my journal**, type **erase**, then sign in with your email and passphrase.' },
      { p: 'If your phone filled in the passphrase for you, try typing it yourself. Saved passwords can be out of date.' },
      { h: 'Someone didn’t get my invite' },
      { p: 'On the Circle page, tap **Remind** to send it again another way, such as a text. If it has expired, tap **New link**.' },
      { h: 'It says "Sync problem"' },
      { p: 'Check your connection and tap **Sync now** on the online circle screen. Your journal is safe on this device either way.' },
      { h: 'My therapist says the link doesn’t work' },
      { p: 'Make sure they copied the whole link, including everything after the #. If you removed their access or it ended, share again.' },
    ],
    open: [{ label: 'Suggest a feature or report a problem', route: { name: 'feedback' } }],
    keywords: 'problem error help code email spam sync broken not working passphrase wrong new device sample erase',
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
