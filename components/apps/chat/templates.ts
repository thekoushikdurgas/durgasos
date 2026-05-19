export const CHAT_PROMPT_TEMPLATES = [
  {
    category: 'Creative Writing',
    items: [
      {
        title: 'Sci-Fi Short Story',
        prompt:
          'Write a short sci-fi story about [topic], set in the year [year]. The main character is [character_desc].',
      },
      { title: 'Haiku', prompt: 'Write a haiku about [topic].' },
      {
        title: 'Character Backstory',
        prompt:
          'Create a detailed backstory for a character named [name], who is a [profession] in a [setting] world.',
      },
    ],
  },
  {
    category: 'Professional',
    items: [
      {
        title: 'Follow-up Email',
        prompt:
          'Write a polite follow-up email to [recipient] regarding [topic]. Mention that I am looking forward to their response by [date].',
      },
      {
        title: 'Status Report',
        prompt:
          'Write a weekly status report for the [project_name] project. Accomplishments: [accomplishments]. Next steps: [next_steps].',
      },
      {
        title: 'LinkedIn Post',
        prompt:
          'Write an engaging LinkedIn post announcing [announcement/event]. Include a call to action asking for [action].',
      },
    ],
  },
  {
    category: 'Programming',
    items: [
      {
        title: 'React Component',
        prompt:
          'Write a functional React component named [ComponentName] that does the following: [functionality]. Use TypeScript and Tailwind CSS.',
      },
      {
        title: 'Python Script',
        prompt: 'Write a Python script to [task]. Include comments explaining the code.',
      },
      {
        title: 'SQL Query',
        prompt: 'Write a SQL query to [task] from tables [table_names].',
      },
    ],
  },
] as const;
