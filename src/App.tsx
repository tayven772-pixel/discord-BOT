import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { api } from './api';
import {
  BookOpen,
  Bot,
  Braces,
  CheckCircle2,
  Cloud,
  Code2,
  Download,
  Flame,
  FolderCode,
  Gamepad2,
  GraduationCap,
  Home,
  Languages,
  Lightbulb,
  Moon,
  LogIn,
  LogOut,
  Menu,
  Package,
  Play,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Sun,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UserCircle,
  X,
  Zap,
} from 'lucide-react';

type TrackKey = 'games' | 'mcbe' | 'mcje' | 'apps' | 'python' | 'discord' | 'apis';
type Mode = 'Beginner' | 'Mediocre' | 'Pro';
type Appearance = 'dark' | 'light';
type Language = 'English' | 'Español' | 'Français' | 'Deutsch';
type View = 'home' | 'learn' | 'play' | 'coach' | 'streak' | 'settings';

type Profile = {
  avatar: string;
  language: Language;
  mode: Mode;
  appearance: Appearance;
  xp: number;
  streak: number;
  lastVisit: string;
  skills: Record<TrackKey, number>;
  completed: string[];
};

type Project = {
  id: string;
  cloudId?: string;
  name: string;
  type: TrackKey;
  files: Record<string, string>;
  activeFile: string;
  updatedAt: string;
};

type GradeResult = {
  score: number;
  baseScore: number;
  hintPenalty: number;
  passed: boolean;
  feedback: string[];
  improvements: string[];
  concepts: string[];
};

type SignedUser = {
  email: string;
  name?: string;
};

type AuthMode = 'signup' | 'login';

type AuthResponse = {
  ok: boolean;
  token?: string;
  user?: SignedUser;
  error?: string;
};

type GoogleCredentialResponse = {
  credential: string;
};

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        ux_mode?: 'popup';
      }) => void;
      prompt: (callback?: (notification: {
        isNotDisplayed?: () => boolean;
        getNotDisplayedReason?: () => string;
        isSkippedMoment?: () => boolean;
        getSkippedReason?: () => string;
      }) => void) => void;
      disableAutoSelect: () => void;
    };
  };
};

type CoachMessage = {
  role: 'user' | 'assistant';
  text: string;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const googleClientId = '1081262614011-uq1h6t7nhklq664pnubievl33vqdfae0.apps.googleusercontent.com';
const ownerEmail = 'tayven772@gmail.com';
const todayKey = () => new Date().toLocaleDateString('en-CA');

const defaultProfile: Profile = {
  avatar: '🚀',
  language: 'English',
  mode: 'Beginner',
  appearance: 'dark',
  xp: 0,
  streak: 0,
  lastVisit: '',
  skills: { games: 0, mcbe: 0, mcje: 0, apps: 0, python: 0, discord: 0, apis: 0 },
  completed: [],
};

const tracks = {
  games: {
    name: 'Game Coding',
    short: 'Games',
    description: 'Learn game loops, controls, physics, collisions and simple engines with JavaScript.',
    challenge: {
      id: 'games-1',
      title: 'Build a controllable player',
      prompt: 'Create a canvas game loop with a player that reacts to keyboard input. Set up a drawing context, listen for input and keep updating frames.',
      starter: "const canvas = document.querySelector('canvas');\n// 1. Get the 2D context\n\n// 2. Listen for keyboard input\n\nfunction gameLoop() {\n  // 3. Update and draw the player\n  // 4. Schedule the next frame\n}",
      example: 'Think about a clock: it checks the time, updates what changed, shows the result, then repeats. A game loop follows that same pattern.',
      exampleCode: "let x = 0;\n\nfunction updateExample() {\n  x += 1;\n  console.log('step', x);\n  setTimeout(updateExample, 100);\n}\n\nupdateExample();",
      hints: [
        'A canvas needs its 2D drawing context before you can draw.',
        'Keyboard controls are usually handled with an event listener.',
        'Browsers have a function made for scheduling the next animation frame.',
      ],
    },
  },
  mcbe: {
    name: 'Minecraft Bedrock Add-ons',
    short: 'MCBE',
    description: 'Learn manifests, behavior packs, Script API structure and custom Minecraft Bedrock content.',
    challenge: {
      id: 'mcbe-1',
      title: 'Define a custom Bedrock entity',
      prompt: 'Write the main JSON structure for a custom Bedrock entity. Include a format version, description and components section.',
      starter: '{\n  "format_version": "1.21.0",\n  // Add the entity definition here\n}',
      example: 'A Bedrock definition is like a labeled storage box: the description says what it is, while components describe what it can do.',
      exampleCode: '{\n  "format_version": "1.21.0",\n  "minecraft:item": {\n    "description": {\n      "identifier": "meta:example_item"\n    },\n    "components": {}\n  }\n}',
      hints: [
        'Most entity definitions are nested below a Minecraft-specific entity key.',
        'The description normally contains an identifier.',
        'Behavior is assembled from components rather than one giant script.',
      ],
    },
  },
  mcje: {
    name: 'Minecraft Java Mods',
    short: 'MCJE',
    description: 'Learn Java mod structure, Fabric-style initialization, events and project organization.',
    challenge: {
      id: 'mcje-1',
      title: 'Create a mod initializer',
      prompt: 'Write a Java class that can act as a Fabric mod initializer and runs code when the mod loads.',
      starter: 'public class MyMod {\n  // Implement the mod initializer\n}',
      example: 'An initializer is like the power button for a program: it gives the loader one known place to begin setting everything up.',
      exampleCode: 'public class ExampleTask implements Runnable {\n  @Override\n  public void run() {\n    System.out.println("Example started");\n  }\n}',
      hints: [
        'Fabric exposes an initializer interface for mods.',
        'The interface requires one startup method.',
        'Put a small log or print statement in the startup method so you can verify it ran.',
      ],
    },
  },
  apps: {
    name: 'Apps & Websites',
    short: 'Apps',
    description: 'Build interfaces, web apps and downloadable projects with HTML, CSS and JavaScript.',
    challenge: {
      id: 'apps-1',
      title: 'Make an interactive button',
      prompt: 'Build a button that changes visible text when it is clicked. Use an event handler instead of hard-coding the final state.',
      starter: '<button id="start">Start</button>\n<p id="status">Waiting...</p>\n<script>\n  // Add the interaction here\n</script>',
      example: 'Imagine a doorbell: pressing the button creates an event, and another part of the system reacts to that event.',
      exampleCode: '<button id="demo">Count</button>\n<p id="count">0</p>\n<script>\n  let count = 0;\n  document.querySelector("#demo").addEventListener("click", () => {\n    count += 1;\n    document.querySelector("#count").textContent = count;\n  });\n</script>',
      hints: [
        'First select the button and the text element.',
        'Listen for a click event on the button.',
        'Inside the handler, change the text element content.',
      ],
    },
  },
  python: {
    name: 'Python',
    short: 'Python',
    description: 'Learn Python functions, conditions, loops, lists, dictionaries and clean problem-solving patterns.',
    challenge: {
      id: 'python-1',
      title: 'Write a grade classifier',
      prompt: 'Write a Python function named classify_score that accepts a score. Return "high" for 80 or more, "medium" for 50 or more, and "low" otherwise.',
      starter: 'def classify_score(score):\n    # Use conditions and return a label\n    pass',
      example: 'A Python function can make a decision with if/elif/else and return one result to the caller.',
      exampleCode: 'def temperature_label(temp):\n    if temp >= 30:\n        return "hot"\n    elif temp >= 15:\n        return "warm"\n    return "cold"',
      hints: [
        'Start with def classify_score(score):',
        'Check the highest threshold first with if, then use elif.',
        'Return a string from each branch.',
      ],
    },
  },
  discord: {
    name: 'Discord Bots / Node.js',
    short: 'Discord',
    description: 'Learn Node.js bot structure, discord.js clients, events, slash-command interactions and permission checks.',
    challenge: {
      id: 'discord-1',
      title: 'Create a Discord bot client',
      prompt: 'Create a discord.js Client with the Guilds intent and add a ready event that logs when the bot is online.',
      starter: "import { Client, Events, GatewayIntentBits } from 'discord.js';\n\n// Create the client\n// Add a ready event",
      example: 'A Discord bot client connects to Discord and then reacts to events. Intents declare which event groups the bot needs.',
      exampleCode: "const emitter = new EventTarget();\nemitter.addEventListener('ready', () => {\n  console.log('Ready');\n});",
      hints: [
        'Create the Client with new Client({ intents: [...] }).',
        'Guilds is available on GatewayIntentBits.',
        'Listen for Events.ClientReady with client.once or client.on.',
      ],
    },
  },
  apis: {
    name: 'Databases & APIs',
    short: 'APIs',
    description: 'Learn HTTP requests, JSON, REST endpoints, SQL queries and the data flow behind real apps.',
    challenge: {
      id: 'apis-1',
      title: 'Fetch and read JSON',
      prompt: 'Write an async JavaScript function that fetches /api/profile, checks the response, converts it to JSON and returns the data.',
      starter: "async function loadProfile() {\n  // Fetch /api/profile\n  // Check the response\n  // Read and return JSON\n}",
      example: 'An API request has two stages: receive the HTTP response, then decode its body into useful data.',
      exampleCode: "async function loadStatus() {\n  const response = await fetch(window.location.origin + '/api/status');\n  if (!response.ok) throw new Error('Request failed');\n  return await response.json();\n}",
      hints: [
        'Use await fetch with the endpoint string.',
        'response.ok can tell you whether the HTTP request succeeded.',
        'Call response.json() and return the decoded value.',
      ],
    },
  },
} as const;

const challengeBanks = {
  games: [
    tracks.games.challenge,
    {
      id: 'games-2',
      title: 'Keep a player inside the canvas',
      prompt: 'Update a player position but clamp it so the player cannot move beyond the canvas edges.',
      starter: "let x = 20;\nlet y = 20;\nconst speed = 5;\n\nfunction updatePlayer(dx, dy, canvas) {\n  // Move x and y\n  // Keep both values inside the canvas\n}",
      example: 'Clamping is like a fence: a value can move until it reaches a minimum or maximum, then it stops there.',
      exampleCode: "let volume = 8;\nvolume = Math.max(0, Math.min(10, volume + 1));\nconsole.log(volume);",
      hints: [
        'Update the position before checking the boundaries.',
        'Math.min and Math.max are useful for clamping numbers.',
        'Use the canvas width and height as the outer limits.',
      ],
    },
    {
      id: 'games-3',
      title: 'Detect rectangle collision',
      prompt: 'Write a function that returns true when two rectangle objects overlap and false when they do not.',
      starter: "function overlaps(a, b) {\n  // Compare x, y, width and height\n  // Return a boolean\n}",
      example: 'Two rectangles overlap when neither one is completely to the left, right, above or below the other.',
      exampleCode: "function rangesOverlap(aStart, aEnd, bStart, bEnd) {\n  return aStart < bEnd && aEnd > bStart;\n}",
      hints: [
        'Compare the left and right edges of both rectangles.',
        'Do the same for the top and bottom edges.',
        'Combine the comparisons with boolean logic and return the result.',
      ],
    },
  ],
  mcbe: [
    tracks.mcbe.challenge,
    {
      id: 'mcbe-2',
      title: 'Run code when a player spawns',
      prompt: 'Use the Bedrock Script API to subscribe to the player spawn event and send that player a message.',
      starter: "import { world } from '@minecraft/server';\n\n// Subscribe to player spawn here\n",
      example: 'Bedrock events work like notifications: you subscribe once, then Minecraft calls your function whenever that event happens.',
      exampleCode: "world.afterEvents.itemUse.subscribe(event => {\n  event.source.sendMessage('Item used');\n});",
      hints: [
        'Look under world.afterEvents for the player spawn event.',
        'Event signals use subscribe with a callback.',
        'The event gives you the player so you can call sendMessage.',
      ],
    },
    {
      id: 'mcbe-3',
      title: 'Create a custom item definition',
      prompt: 'Write the main JSON structure for a custom Bedrock item with an identifier and components section.',
      starter: '{\n  "format_version": "1.21.0",\n  // Add the custom item here\n}',
      example: 'A custom item uses the same description-and-components pattern as many other Bedrock definitions.',
      exampleCode: '{\n  "format_version": "1.21.0",\n  "minecraft:block": {\n    "description": { "identifier": "meta:example_block" },\n    "components": {}\n  }\n}',
      hints: [
        'Use the minecraft:item definition key.',
        'Put a namespaced identifier inside description.',
        'Add a components object even if it starts empty.',
      ],
    },
  ],
  mcje: [
    tracks.mcje.challenge,
    {
      id: 'mcje-2',
      title: 'Register a custom item',
      prompt: 'Write Java code that creates an Item and registers it in the Fabric item registry with an identifier.',
      starter: "public class ModItems {\n  // Create an Item\n  // Register it in the item registry\n}",
      example: 'Registries are like labeled catalogs: you create an object, give it an identifier, then add it to the correct catalog.',
      exampleCode: "String id = \"example\";\nSystem.out.println(\"Registering \" + id);",
      hints: [
        'Create an Item instance first.',
        'Fabric registration uses Registry.register.',
        'The item registry is available through Registries.ITEM.',
      ],
    },
    {
      id: 'mcje-3',
      title: 'Write a reusable Java check',
      prompt: 'Create a public static Java method that receives an integer level and returns whether the level is high enough.',
      starter: "public class LevelCheck {\n  // Add a public static boolean method\n}",
      example: 'A reusable method takes input, makes a decision, and returns a value to the caller.',
      exampleCode: "public static boolean isPositive(int value) {\n  return value > 0;\n}",
      hints: [
        'The return type should be boolean.',
        'Give the method one integer parameter.',
        'Return the result of a comparison.',
      ],
    },
  ],
  apps: [
    tracks.apps.challenge,
    {
      id: 'apps-2',
      title: 'Toggle a class on click',
      prompt: 'Select a button and a panel. When the button is clicked, toggle a CSS class on the panel.',
      starter: '<button id="toggle">Toggle</button>\n<div id="panel">Panel</div>\n<script>\n  // Add the interaction here\n</script>',
      example: 'classList lets JavaScript change an element state without rewriting all of its styles.',
      exampleCode: "const card = document.querySelector('.card');\ncard.classList.toggle('selected');",
      hints: [
        'Select both elements first.',
        'Listen for the button click.',
        'Use classList.toggle on the panel.',
      ],
    },
    {
      id: 'apps-3',
      title: 'Validate a text input',
      prompt: 'Read a text input when a button is clicked. If it is empty after trimming spaces, show an error; otherwise show a success message.',
      starter: '<input id="name" />\n<button id="check">Check</button>\n<p id="message"></p>\n<script>\n  // Validate the input here\n</script>',
      example: 'Validation checks cleaned-up input before deciding what message or action should happen next.',
      exampleCode: "const text = '  hello  '.trim();\nif (text.length > 0) {\n  console.log('Valid');\n}",
      hints: [
        'Read the input value inside the click handler.',
        'trim removes spaces at the beginning and end.',
        'Use an if statement to choose the message.',
      ],
    },
  ],
  python: [
    tracks.python.challenge,
    {
      id: 'python-2',
      title: 'Build a filtered list',
      prompt: 'Write a Python function that receives a list of numbers and returns a new list containing only numbers greater than 10.',
      starter: 'def above_ten(numbers):\n    result = []\n    # Loop through numbers and add matching values\n    return result',
      example: 'A loop can inspect each item and append only the items that match a condition.',
      exampleCode: 'def positive_values(values):\n    result = []\n    for value in values:\n        if value > 0:\n            result.append(value)\n    return result',
      hints: [
        'Use a for loop to visit every number.',
        'Use if to check whether the number is greater than 10.',
        'Append matching numbers to result, then return it.',
      ],
    },
    {
      id: 'python-3',
      title: 'Count items with a dictionary',
      prompt: 'Write a Python function that counts how many times each word appears in a list and returns a dictionary of word counts.',
      starter: 'def count_words(words):\n    counts = {}\n    # Update counts for each word\n    return counts',
      example: 'A dictionary maps a key to a value, which makes it useful for storing a running count for each unique item.',
      exampleCode: 'counts = {}\nfor item in ["a", "b", "a"]:\n    counts[item] = counts.get(item, 0) + 1',
      hints: [
        'Loop through each word in the list.',
        'Use counts.get(word, 0) to read an existing count safely.',
        'Store the incremented count back under that word key.',
      ],
    },
  ],
  discord: [
    tracks.discord.challenge,
    {
      id: 'discord-2',
      title: 'Handle a slash command',
      prompt: 'Add an InteractionCreate handler that ignores non-chat-input interactions and replies "Pong!" when the command name is ping.',
      starter: "client.on(Events.InteractionCreate, async interaction => {\n  // Check the interaction type\n  // Handle /ping\n});",
      example: 'Discord sends interactions through an event. Your handler first checks what kind it is, then handles the matching command.',
      exampleCode: "client.on('event', async event => {\n  if (!event.isCommand) return;\n  await event.reply('Done');\n});",
      hints: [
        'Use interaction.isChatInputCommand() as a guard.',
        'Check interaction.commandName for ping.',
        'Reply with await interaction.reply(...).',
      ],
    },
    {
      id: 'discord-3',
      title: 'Protect a moderation command',
      prompt: 'Inside a command handler, check whether the member has BanMembers permission. If not, reply that permission is required and stop.',
      starter: "async function runModeration(interaction) {\n  // Check BanMembers permission\n  // Reply and return if missing\n}",
      example: 'Permission checks are guard clauses: reject the action early when the user is not allowed to continue.',
      exampleCode: "if (!member.permissions.has('ManageMessages')) {\n  await interaction.reply('Permission required');\n  return;\n}",
      hints: [
        'discord.js exposes PermissionFlagsBits.BanMembers.',
        'Check the member permissions with .has(...).',
        'Reply and return immediately when permission is missing.',
      ],
    },
  ],
  apis: [
    tracks.apis.challenge,
    {
      id: 'apis-2',
      title: 'Query active users with SQL',
      prompt: 'Write a SQL query that selects id and username from users where active is true, ordered by username.',
      starter: 'SELECT\n  -- columns\nFROM users\n-- filter and order',
      example: 'A SQL SELECT chooses columns, FROM chooses the table, WHERE filters rows, and ORDER BY controls sorting.',
      exampleCode: "SELECT id, title\nFROM posts\nWHERE published = true\nORDER BY title;",
      hints: [
        'Select id and username.',
        'Use WHERE active = true.',
        'Finish with ORDER BY username.',
      ],
    },
    {
      id: 'apis-3',
      title: 'Create a JSON API route',
      prompt: 'Using Express-style code, create a GET /api/health route that responds with JSON containing ok: true.',
      starter: "app.get('/api/health', (req, res) => {\n  // Return JSON here\n});",
      example: 'A server route matches an HTTP method and path, then sends a response back to the client.',
      exampleCode: "app.get('/api/version', (req, res) => {\n  res.json({ version: 1 });\n});",
      hints: [
        'Use app.get with /api/health.',
        'Your handler receives req and res.',
        'Use res.json({ ok: true }).',
      ],
    },
  ],
} as const;

const languages: Language[] = ['English', 'Español', 'Français', 'Deutsch'];
const modes: Mode[] = ['Beginner', 'Mediocre', 'Pro'];
const avatars = ['🚀', '💙', '🎮', '🧊', '⚡', '🧠', '🛠️', '🐉'];
const metaFacts = [
  'Meta teaches game coding, MCBE add-ons, MCJE mods, apps, Python, Discord bots, databases and APIs.',
  'Your skill profile tracks XP, graded challenges, streaks and progress by learning path.',
  'Playmode creates real project files that you can edit and download to use outside Meta.',
  'The AI Coach can read the project you select so its help matches your actual code.',
  'Examples explain the idea without giving away the finished challenge answer.',
  'Signed-in accounts can sync progress and projects; Meta does not auto-delete accounts for inactivity.',
];

const navTranslations: Record<Language, Record<View, string>> = {
  English: { home: 'Home', learn: 'Learn', play: 'Playmode', coach: 'AI Coach', streak: 'Streak', settings: 'Settings' },
  Español: { home: 'Inicio', learn: 'Aprender', play: 'Proyectos', coach: 'Coach IA', streak: 'Racha', settings: 'Ajustes' },
  Français: { home: 'Accueil', learn: 'Apprendre', play: 'Projets', coach: 'Coach IA', streak: 'Série', settings: 'Réglages' },
  Deutsch: { home: 'Start', learn: 'Lernen', play: 'Projekte', coach: 'KI-Coach', streak: 'Serie', settings: 'Einstellungen' },
};

function loadProfile(): Profile {
  try {
    const saved = localStorage.getItem('meta.profile');
    if (!saved) return defaultProfile;
    const parsed = JSON.parse(saved) as Partial<Profile>;
    const skills = parsed.skills;
    const hasLegacySeed = parsed.xp === 0 && (parsed.completed?.length ?? 0) === 0 && skills?.games === 8 && skills?.mcbe === 5 && skills?.mcje === 3 && skills?.apps === 10;
    if (hasLegacySeed) {
      return {
        ...defaultProfile,
        avatar: parsed.avatar ?? defaultProfile.avatar,
        language: parsed.language ?? defaultProfile.language,
        mode: parsed.mode ?? defaultProfile.mode,
      };
    }
    return {
      ...defaultProfile,
      ...parsed,
      skills: { ...defaultProfile.skills, ...(parsed.skills ?? {}) },
    } as Profile;
  } catch {
    return defaultProfile;
  }
}

function loadProjects(): Project[] {
  try {
    const saved = localStorage.getItem('meta.projects');
    return saved ? JSON.parse(saved) as Project[] : [];
  } catch {
    return [];
  }
}

function makeProject(type: TrackKey, number: number): Project {
  const name = tracks[type].short + ' Project ' + number;
  const uuidA = crypto.randomUUID ? crypto.randomUUID() : '11111111-1111-4111-8111-111111111111';
  const uuidB = crypto.randomUUID ? crypto.randomUUID() : '22222222-2222-4222-8222-222222222222';
  let files: Record<string, string>;

  if (type === 'mcbe') {
    files = {
      'manifest.json': JSON.stringify({
        format_version: 2,
        header: { name, description: 'Built with Meta', uuid: uuidA, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
        modules: [{ type: 'script', language: 'javascript', uuid: uuidB, version: [1, 0, 0], entry: 'scripts/main.js' }],
        dependencies: [{ module_name: '@minecraft/server', version: '2.0.0' }],
      }, null, 2),
      'scripts/main.js': "import { world } from '@minecraft/server';\n\nworld.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {\n  if (initialSpawn) player.sendMessage('Meta project loaded!');\n});\n",
    };
  } else if (type === 'mcje') {
    files = {
      'src/main/java/com/meta/example/MetaMod.java': "package com.meta.example;\n\nimport net.fabricmc.api.ModInitializer;\n\npublic class MetaMod implements ModInitializer {\n  @Override\n  public void onInitialize() {\n    System.out.println(\"Meta mod loaded!\");\n  }\n}\n",
      'README.md': '# ' + name + '\n\nStarter Java mod project made in Meta. Add this source to a properly configured Fabric development environment before building.',
    };
  } else if (type === 'games') {
    files = {
      'index.html': '<!doctype html>\n<html>\n<body>\n  <canvas id="game" width="800" height="450"></canvas>\n  <script src="game.js"></script>\n</body>\n</html>',
      'game.js': "const canvas = document.getElementById('game');\nconst ctx = canvas.getContext('2d');\n\nfunction loop() {\n  ctx.clearRect(0, 0, canvas.width, canvas.height);\n  // Build your game here.\n  requestAnimationFrame(loop);\n}\nloop();\n",
      'style.css': 'body { margin: 0; background: #07111f; color: white; font-family: system-ui; }',
    };
  } else if (type === 'python') {
    files = {
      'main.py': "def main():\n    print('Meta Python project')\n\nif __name__ == '__main__':\n    main()\n",
      'README.md': '# ' + name + '\n\nPython starter project from Meta.',
    };
  } else if (type === 'discord') {
    files = {
      'index.js': "import { Client, Events, GatewayIntentBits } from 'discord.js';\n\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] });\n\nclient.once(Events.ClientReady, readyClient => {\n  console.log('Ready as ' + readyClient.user.tag);\n});\n\n// Store your bot token in an environment variable. Never paste it into source code.\nclient.login(process.env.DISCORD_TOKEN);\n",
      'package.json': JSON.stringify({ type: 'module', dependencies: { 'discord.js': '^14.18.0' } }, null, 2),
      'README.md': '# ' + name + '\n\nDiscord bot starter. Set DISCORD_TOKEN in your host environment before running.',
    };
  } else if (type === 'apis') {
    files = {
      'server.js': "import express from 'express';\n\nconst app = express();\napp.use(express.json());\n\napp.get('/api/health', (req, res) => {\n  res.json({ ok: true });\n});\n\napp.listen(3000, () => console.log('API running'));\n",
      'schema.sql': 'CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  username TEXT NOT NULL,\n  active BOOLEAN NOT NULL DEFAULT true\n);\n',
      'README.md': '# ' + name + '\n\nStarter API and SQL schema from Meta.',
    };
  } else {
    files = {
      'index.html': '<!doctype html>\n<html>\n<head><link rel="stylesheet" href="style.css"></head>\n<body>\n  <main id="app"><h1>My Meta App</h1></main>\n  <script src="app.js"></script>\n</body>\n</html>',
      'app.js': "document.querySelector('#app').insertAdjacentHTML('beforeend', '<p>Start building here.</p>');",
      'style.css': 'body { background: #07111f; color: #eef7ff; font-family: system-ui; padding: 32px; }',
    };
  }

  return {
    id: 'local-' + Date.now() + '-' + number,
    name,
    type,
    files,
    activeFile: Object.keys(files)[0],
    updatedAt: new Date().toISOString(),
  };
}

function isPngAvatar(value: string) {
  return value.startsWith('data:image/png;base64,');
}

function MetaMark({ className = '' }: { className?: string }) {
  return <img className={'meta-mark ' + className} src="./meta-icon.svg" alt="Meta" />;
}

function ProfileAvatar({ value, className = '' }: { value: string; className?: string }) {
  if (isPngAvatar(value)) {
    return <img className={'profile-avatar-image ' + className} src={value} alt="Profile" />;
  }
  return <span className={className}>{value}</span>;
}

function resizeProfilePng(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;
        if (!sourceWidth || !sourceHeight) throw new Error('That PNG could not be read.');

        const cropSize = Math.min(sourceWidth, sourceHeight);
        const sourceX = (sourceWidth - cropSize) / 2;
        const sourceY = (sourceHeight - cropSize) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not process that PNG.');

        context.clearRect(0, 0, 128, 128);
        context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, 128, 128);
        const result = canvas.toDataURL('image/png');
        URL.revokeObjectURL(objectUrl);
        resolve(result);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('That PNG could not be opened.'));
    };

    image.src = objectUrl;
  });
}

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const legalPage = searchParams.get('legal');
  const deleteIntent = searchParams.get('delete') === 'account';
  const deletionComplete = searchParams.get('deleted') === '1';
  const [view, setView] = useState<View>(deleteIntent ? 'settings' : 'home');
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeTrack, setActiveTrack] = useState<TrackKey>('games');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [lessonCode, setLessonCode] = useState(tracks.games.challenge.starter);
  const [showExample, setShowExample] = useState(false);
  const [hintStep, setHintStep] = useState(0);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState<number | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const [user, setUser] = useState<SignedUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('meta.session') ?? '');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([
    { role: 'assistant', text: 'I’m your Meta coach. Pick a project or lesson, then tell me what you are stuck on. I’ll guide you without jumping straight to the answer.' },
  ]);
  const [notice, setNotice] = useState('');
  const [globalAccent, setGlobalAccent] = useState('#328dff');
  const [adminAccent, setAdminAccent] = useState('#328dff');
  const [savingTheme, setSavingTheme] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [apkStatus, setApkStatus] = useState<'checking' | 'building' | 'ready' | 'error'>('checking');
  const [privacyEmail, setPrivacyEmail] = useState('');
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [showSignup, setShowSignup] = useState(true);
  const [typedFact, setTypedFact] = useState('');
  const [factIndex, setFactIndex] = useState(0);
  const [deletingFact, setDeletingFact] = useState(false);

  const copy = navTranslations[profile.language];
  const activeProject = projects.find(project => project.id === activeProjectId) ?? null;
  const track = tracks[activeTrack];
  const challengeBank = challengeBanks[activeTrack];
  const challenge = challengeBank[challengeIndex % challengeBank.length];
  const totalSkill = Math.round(Object.values(profile.skills).reduce((sum, value) => sum + value, 0) / Object.keys(tracks).length);
  const isOwner = user?.email.toLowerCase() === ownerEmail;

  useEffect(() => {
    localStorage.setItem('meta.profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    document.documentElement.dataset.theme = profile.appearance;
  }, [profile.appearance]);

  useEffect(() => {
    document.documentElement.style.setProperty('--meta-accent', globalAccent);
  }, [globalAccent]);

  useEffect(() => {
    localStorage.setItem('meta.projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('./sw.js').catch(() => undefined);
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  useEffect(() => {
    void refreshAndroidPackage();
    void api.get('/api/theme').then(response => {
      const result = response.data as { ok: boolean; accent?: string };
      if (result.ok && result.accent) {
        setGlobalAccent(result.accent);
        setAdminAccent(result.accent);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (autoAdvanceSeconds === null) return;
    if (autoAdvanceSeconds <= 0) {
      startNextChallenge();
      return;
    }

    const timeout = window.setTimeout(() => {
      setAutoAdvanceSeconds(current => current === null ? null : current - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [autoAdvanceSeconds]);

  useEffect(() => {
    const fact = metaFacts[factIndex];
    const delay = deletingFact ? 18 : typedFact.length === fact.length ? 1450 : 34;
    const timeout = window.setTimeout(() => {
      if (!deletingFact) {
        if (typedFact.length < fact.length) {
          setTypedFact(fact.slice(0, typedFact.length + 1));
        } else {
          setDeletingFact(true);
        }
      } else if (typedFact.length > 0) {
        setTypedFact(fact.slice(0, typedFact.length - 1));
      } else {
        setDeletingFact(false);
        setFactIndex(current => (current + 1) % metaFacts.length);
      }
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [typedFact, deletingFact, factIndex]);

  useEffect(() => {
    const token = localStorage.getItem('meta.session');
    if (!token) {
      setShowSignup(true);
      setAuthReady(true);
      return;
    }

    api.post('/api/session/validate', { token }).then(async response => {
      const result = response.data as AuthResponse;
      if (!result.ok || !result.user) throw new Error('Invalid session');
      setSessionToken(token);
      setUser(result.user);
      setShowSignup(false);
      await loadCloudState(token, result.user);
    }).catch(() => {
      localStorage.removeItem('meta.session');
      setSessionToken('');
      setUser(null);
      setShowSignup(true);
    }).finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (!authReady || user) return;

    const initializeGoogle = () => {
      const google = (window as typeof window & { google?: GoogleIdentity }).google;
      if (!google) return;

      google.accounts.id.initialize({
        client_id: googleClientId,
        ux_mode: 'popup',
        callback: response => {
          void submitGoogleAuth(response.credential);
        },
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-meta-google="true"]');
    if (existing) {
      initializeGoogle();
      existing.addEventListener('load', initializeGoogle, { once: true });
      return () => existing.removeEventListener('load', initializeGoogle);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.metaGoogle = 'true';
    script.addEventListener('load', initializeGoogle, { once: true });
    document.head.appendChild(script);

    return () => script.removeEventListener('load', initializeGoogle);
  }, [authReady, user]);

  const recentDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
        number: date.getDate(),
        active: index >= 7 - Math.min(profile.streak, 7),
      };
    });
  }, [profile.streak]);

  async function loadCloudState(token: string, currentUser: SignedUser) {
    try {
      const response = await api.post('/api/account/load', { token });
      const cloud = response.data as { ok: boolean; profile?: Profile | null; projects?: Array<Project & { id: string }>; error?: string };
      if (!cloud.ok) throw new Error(cloud.error ?? 'Unable to load account');

      const cloudProfile = cloud.profile ?? defaultProfile;
      const base: Profile = {
        ...defaultProfile,
        ...cloudProfile,
        skills: { ...defaultProfile.skills, ...(cloudProfile.skills ?? {}) },
      };
      const today = todayKey();
      const previous = new Date();
      previous.setDate(previous.getDate() - 1);
      const yesterday = previous.toLocaleDateString('en-CA');
      const currentProfile: Profile = base.lastVisit === today ? base : {
        ...base,
        streak: base.lastVisit === yesterday ? base.streak + 1 : 1,
        lastVisit: today,
      };

      setProfile(currentProfile);
      await api.post('/api/account/save', {
        token,
        profile: { ...currentProfile, displayName: currentUser.name ?? '' },
      });

      const cloudProjects: Project[] = (cloud.projects ?? []).map(item => ({
        ...item,
        id: 'cloud-' + item.id,
        cloudId: item.id,
        activeFile: item.activeFile || Object.keys(item.files)[0],
      }));
      setProjects(cloudProjects);
      setActiveProjectId(cloudProjects[0]?.id ?? null);
    } catch {
      setNotice('Your Meta account could not load. Try signing in again.');
    }
  }

  async function submitEmailAuth() {
    setAuthError('');
    const email = authEmail.trim().toLowerCase();
    const name = authName.trim();

    if (!email.includes('@')) {
      setAuthError('Enter a valid email address.');
      return;
    }
    if (authPassword.length < 8) {
      setAuthError('Your password must be at least 8 characters.');
      return;
    }
    if (authMode === 'signup' && name.length < 2) {
      setAuthError('Enter the name you want shown on Meta.');
      return;
    }

    setAuthBusy(true);
    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const response = await api.post(endpoint, { email, password: authPassword, name });
      const result = response.data as AuthResponse;
      if (!result.ok || !result.token || !result.user) {
        setAuthError(result.error ?? 'Unable to continue.');
        return;
      }

      localStorage.setItem('meta.session', result.token);
      setSessionToken(result.token);
      setUser(result.user);
      setShowSignup(false);
      setProfile(defaultProfile);
      setProjects([]);
      await loadCloudState(result.token, result.user);
      setNotice(authMode === 'signup' ? 'Your Meta account is ready.' : 'Welcome back to Meta.');
      setAuthPassword('');
    } catch {
      setAuthError('Meta could not reach the account service. Try again.');
    } finally {
      setAuthBusy(false);
    }
  }

  function startGoogleSignIn() {
    setAuthError('');
    const google = (window as typeof window & { google?: GoogleIdentity }).google;
    if (!google) {
      setAuthError('Google sign-in is still loading. Try again in a moment.');
      return;
    }

    google.accounts.id.prompt(notification => {
      if (notification?.isNotDisplayed?.()) {
        const reason = notification.getNotDisplayedReason?.() ?? 'unsupported_browser';
        setAuthError('Google could not open on this browser (' + reason + '). You can still use email login.');
      } else if (notification?.isSkippedMoment?.()) {
        const reason = notification.getSkippedReason?.() ?? 'skipped';
        setAuthError('Google sign-in was skipped (' + reason + '). Try the button again or use email login.');
      }
    });
  }

  async function submitGoogleAuth(credential: string) {
    if (!credential || authBusy) return;
    setAuthError('');
    setAuthBusy(true);
    try {
      const response = await api.post('/api/auth/google', { credential });
      const result = response.data as AuthResponse;
      if (!result.ok || !result.token || !result.user) {
        setAuthError(result.error ?? 'Google sign-in could not be completed.');
        return;
      }

      localStorage.setItem('meta.session', result.token);
      setSessionToken(result.token);
      setUser(result.user);
      setShowSignup(false);
      setProfile(defaultProfile);
      setProjects([]);
      await loadCloudState(result.token, result.user);
      setNotice('Signed in with Google.');
    } catch {
      setAuthError('Google sign-in could not be completed. Check that this site is an authorized JavaScript origin.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (sessionToken) {
      try {
        await api.post('/api/auth/logout', { token: sessionToken });
      } catch {
        // Local sign-out still happens even if the server request fails.
      }
    }
    localStorage.removeItem('meta.session');
    localStorage.removeItem('meta.profile');
    localStorage.removeItem('meta.projects');
    setSessionToken('');
    setUser(null);
    setProfile(defaultProfile);
    setProjects([]);
    setAuthMode('login');
    setShowSignup(true);
    setNotice('Signed out. Log in again to use Meta.');
  }

  async function installMetaApp() {
    if (!installPrompt) {
      setNotice('On Android Chrome, open the browser menu and choose Install app or Add to Home screen.');
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setNotice('Meta installation started.');
      setInstallPrompt(null);
    }
  }

  async function refreshAndroidPackage() {
    try {
      const response = await api.get('/api/android/download');
      const result = response.data as { ok: boolean; apkUrl?: string | null };
      if (result.ok && result.apkUrl) {
        setApkStatus('ready');
        return true;
      }
    } catch {
      // A missing APK is expected before the first successful build.
    }

    setApkStatus('building');
    try {
      const response = await api.get('/api/android/build-once');
      const result = response.data as { ok: boolean; apkUrl?: string | null; error?: string };
      if (result.ok && result.apkUrl) {
        setApkStatus('ready');
        return true;
      }
      throw new Error(result.error ?? 'Android package build failed.');
    } catch {
      setApkStatus('error');
      return false;
    }
  }

  async function downloadMetaApk() {
    setApkStatus('checking');
    const ready = await refreshAndroidPackage();
    if (!ready) {
      setNotice('The APK could not be prepared. Try again from the Android download card.');
      return;
    }
    window.location.href = './api/android/apk';
  }

  async function saveAdminTheme() {
    if (!sessionToken || !isOwner) return;
    if (!/^#[0-9a-fA-F]{6}$/.test(adminAccent)) {
      setNotice('Choose a valid 6-digit theme color.');
      return;
    }
    setSavingTheme(true);
    try {
      const response = await api.post('/api/admin/theme', { token: sessionToken, accent: adminAccent });
      const result = response.data as { ok: boolean; accent?: string; error?: string };
      if (!result.ok || !result.accent) throw new Error(result.error ?? 'Theme update failed.');
      setGlobalAccent(result.accent);
      setAdminAccent(result.accent);
      setNotice('Global Meta theme updated for everyone.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Theme update failed.');
    } finally {
      setSavingTheme(false);
    }
  }

  async function submitPrivacyInquiry() {
    setPrivacyStatus('');
    if (!privacyEmail.includes('@') || privacyMessage.trim().length < 10) {
      setPrivacyStatus('Enter a valid email and a message of at least 10 characters.');
      return;
    }
    try {
      const response = await api.post('/api/privacy/inquiry', { email: privacyEmail.trim(), message: privacyMessage.trim() });
      const result = response.data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? 'Unable to submit inquiry.');
      setPrivacyMessage('');
      setPrivacyStatus('Privacy inquiry submitted.');
    } catch (error) {
      setPrivacyStatus(error instanceof Error ? error.message : 'Unable to submit inquiry.');
    }
  }

  async function deleteAccount() {
    if (!sessionToken || deleteConfirmation !== 'DELETE') {
      setNotice('Type DELETE exactly before deleting your account.');
      return;
    }
    setDeletingAccount(true);
    try {
      const response = await api.post('/api/account/delete', { token: sessionToken, confirmation: deleteConfirmation });
      const result = response.data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? 'Account deletion failed.');
      localStorage.removeItem('meta.session');
      localStorage.removeItem('meta.profile');
      localStorage.removeItem('meta.projects');
      window.location.href = '?legal=delete&deleted=1';
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Account deletion failed.');
      setDeletingAccount(false);
    }
  }

  async function saveProfileCloud(next: Profile) {
    if (!user || !sessionToken) return;
    try {
      await api.post('/api/account/save', {
        token: sessionToken,
        profile: { ...next, displayName: user.name ?? '' },
      });
    } catch {
      setNotice('Your settings changed locally, but cloud sync failed.');
    }
  }

  async function chooseProfilePng(file: File | undefined) {
    if (!file) return;
    if (!(file.type === 'image/png' || /\.png$/i.test(file.name))) {
      setNotice('Choose a PNG image for your profile picture.');
      return;
    }

    try {
      const avatar = await resizeProfilePng(file);
      const next = { ...profile, avatar };
      setProfile(next);
      setNotice('Profile picture updated.');
      void saveProfileCloud(next);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'That PNG could not be used.');
    }
  }

  function selectTrack(key: TrackKey) {
    setAutoAdvanceSeconds(null);
    setActiveTrack(key);
    setChallengeIndex(0);
    setLessonCode(tracks[key].challenge.starter);
    setShowExample(false);
    setHintStep(0);
    setGradeResult(null);
    setView('learn');
  }

  function startNextChallenge() {
    setAutoAdvanceSeconds(null);
    const nextIndex = (challengeIndex + 1) % challengeBank.length;
    const nextChallenge = challengeBank[nextIndex];
    setChallengeIndex(nextIndex);
    setLessonCode(nextChallenge.starter);
    setShowExample(false);
    setHintStep(0);
    setGradeResult(null);
  }

  async function gradeCode() {
    setGrading(true);
    setGradeResult(null);
    try {
      const response = await api.post('/api/grade', {
        token: sessionToken,
        challengeId: challenge.id,
        code: lessonCode,
        hintsUsed: hintStep,
      });
      const result = response.data as GradeResult;
      setGradeResult(result);
      setAutoAdvanceSeconds(4);
      const skill = Math.max(profile.skills[activeTrack], Math.min(100, result.score));
      const completed = result.passed && !profile.completed.includes(challenge.id)
        ? [...profile.completed, challenge.id]
        : profile.completed;
      const next = {
        ...profile,
        xp: profile.xp + Math.max(2, Math.round(result.score / 10)),
        skills: { ...profile.skills, [activeTrack]: skill },
        completed,
      };
      setProfile(next);
      void saveProfileCloud(next);
    } catch {
      setAutoAdvanceSeconds(null);
      setGradeResult({
        score: 0,
        baseScore: 0,
        hintPenalty: 0,
        passed: false,
        feedback: ['The grader could not be reached. Your code was not changed.'],
        improvements: ['Try submitting again after the connection recovers.'],
        concepts: [],
      });
    } finally {
      setGrading(false);
    }
  }

  function createProject(type: TrackKey) {
    const project = makeProject(type, projects.length + 1);
    setProjects(current => [project, ...current]);
    setActiveProjectId(project.id);
    setView('play');
    setNotice('Project created. It is saved locally as you edit.');
  }

  function updateProjectFile(value: string) {
    if (!activeProject) return;
    setProjects(current => current.map(project => project.id === activeProject.id ? {
      ...project,
      files: { ...project.files, [project.activeFile]: value },
      updatedAt: new Date().toISOString(),
    } : project));
  }

  function setProjectFile(file: string) {
    if (!activeProject) return;
    setProjects(current => current.map(project => project.id === activeProject.id ? { ...project, activeFile: file } : project));
  }

  async function saveProject() {
    if (!activeProject) return;
    if (!user || !sessionToken) return;
    try {
      const response = await api.post('/api/projects/save', {
        token: sessionToken,
        id: activeProject.cloudId ?? null,
        project: activeProject,
      });
      const result = response.data as { ok: boolean; id?: string; error?: string };
      if (!result.ok) throw new Error(result.error ?? 'Save failed');
      if (!activeProject.cloudId && result.id) {
        setProjects(current => current.map(project => project.id === activeProject.id ? { ...project, cloudId: result.id } : project));
      }
      setNotice('Project saved to your Meta account.');
    } catch {
      setNotice('Project save failed. Your current editor contents are still on this device.');
    }
  }

  async function downloadProject(project: Project) {
    const zip = new JSZip();
    Object.entries(project.files).forEach(([path, content]) => zip.file(path, content));
    const blob = await zip.generateAsync({ type: 'blob' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    const safe = project.name.replace(/[^a-z0-9_-]+/gi, '_');
    anchor.download = safe + (project.type === 'mcbe' ? '.mcpack' : '.zip');
    anchor.click();
    URL.revokeObjectURL(href);
    setNotice('Downloaded ' + anchor.download + '.');
  }

  async function sendCoach() {
    const text = message.trim();
    if (!text || coachBusy) return;
    setMessage('');
    setCoachMessages(current => [...current, { role: 'user', text }]);
    setCoachBusy(true);
    try {
      const response = await api.post('/api/coach', {
        token: sessionToken,
        message: text,
        level: profile.mode,
        language: profile.language,
        track: track.name,
        project: activeProject ? { name: activeProject.name, type: activeProject.type, files: activeProject.files } : null,
      });
      setCoachMessages(current => [...current, { role: 'assistant', text: (response.data as { reply: string }).reply }]);
    } catch {
      setCoachMessages(current => [...current, { role: 'assistant', text: 'I could not connect just now. Your project is still saved, so you can try again.' }]);
    } finally {
      setCoachBusy(false);
    }
  }

  const renderHome = () => (
    <div className="page">
      <section className="hero">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> META LEARNING ENGINE</span>
          <h1>Learn to build the things you actually want to make.</h1>
          <p>Games, Minecraft Bedrock add-ons, Minecraft Java mods, websites and apps — with guided examples, hints, grading and an AI coach.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => selectTrack('games')}><Play size={17} /> Start learning</button>
            <button className="secondary" onClick={() => setView('play')}><FolderCode size={17} /> Open Playmode</button>
          </div>
        </div>
        <div className="hero-orbit">
          <div className="skill-ring"><strong>{totalSkill}%</strong><span>coding skill</span></div>
          <div className="orbit-card"><Flame size={18} /> {profile.streak} day streak</div>
          <div className="orbit-card right"><Trophy size={18} /> {profile.xp} XP</div>
        </div>
      </section>

      <div className="section-head">
        <div><span className="eyebrow">CHOOSE A PATH</span><h2>What do you want to build?</h2></div>
        <div className="mode-switch">
          {modes.map(mode => <button key={mode} className={profile.mode === mode ? 'active' : ''} onClick={() => setProfile(current => ({ ...current, mode }))}>{mode}</button>)}
        </div>
      </div>

      <div className="track-grid">
        {(Object.keys(tracks) as TrackKey[]).map(key => {
          const item = tracks[key];
          const Icon = key === 'games' ? Gamepad2 : key === 'mcbe' ? Package : key === 'mcje' ? Braces : key === 'discord' ? Bot : Code2;
          return (
            <button className="track-card" key={key} onClick={() => selectTrack(key)}>
              <div className="track-icon"><Icon size={24} /></div>
              <div className="track-title"><h3>{item.name}</h3><span>{profile.skills[key]}%</span></div>
              <p>{item.description}</p>
              <div className="mini-progress"><div style={{ width: profile.skills[key] + '%' }} /></div>
              <span className="card-link">Continue path <Zap size={14} /></span>
            </button>
          );
        })}
      </div>

      <section className="android-download-card">
        <div className="download-icon"><Download /></div>
        <div className="download-copy">
          <span className="eyebrow">ANDROID APP</span>
          <h2>Download Meta APK</h2>
          <p>Download the signed Android APK for Meta. It opens the live Meta learning app and stays connected to the same account and cloud progress.</p>
          <div className="download-actions">
            <button className="primary" disabled={apkStatus === 'building' || apkStatus === 'checking'} onClick={() => void downloadMetaApk()}><Download size={17} /> {apkStatus === 'building' ? 'Building APK…' : apkStatus === 'checking' ? 'Checking APK…' : 'Download APK'}</button>
            <button className="secondary" onClick={() => void installMetaApp()}>{installPrompt ? 'Install web app' : 'Web app install'}</button>
          </div>
          <small className={'apk-status ' + apkStatus}>{apkStatus === 'ready' ? 'APK ready • signed Android package generated' : apkStatus === 'building' ? 'Building the signed Android package…' : apkStatus === 'error' ? 'APK build needs another try. Tap Download APK to retry.' : 'Checking for the latest signed APK…'}</small>
        </div>
      </section>

      <div className="dashboard-grid">
        <button className="feature-card" onClick={() => setView('streak')}>
          <div className="feature-icon"><Flame /></div>
          <div><span className="eyebrow">DAILY STREAK</span><h3>{profile.streak} days strong</h3><p>Open Meta each day and keep your learning chain alive.</p></div>
        </button>
        <button className="feature-card" onClick={() => setView('coach')}>
          <div className="feature-icon"><Bot /></div>
          <div><span className="eyebrow">AI COACH</span><h3>Get help inside your project</h3><p>The coach can read the project you select and guide you through errors, structure and next steps.</p></div>
        </button>
      </div>

      <section className="skills-panel">
        <div className="section-head compact"><div><span className="eyebrow">YOUR DATA</span><h2>Skill profile</h2></div><span className="privacy-note">Tracks coding progress only</span></div>
        <div className="skills-list">
          {(Object.keys(tracks) as TrackKey[]).map(key => (
            <div className="skill-row" key={key}>
              <span>{tracks[key].short}</span>
              <div><i style={{ width: profile.skills[key] + '%' }} /></div>
              <b>{profile.skills[key]}%</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderLearn = () => (
    <div className="page">
      <div className="page-title">
        <div><span className="eyebrow"><GraduationCap size={14} /> {profile.mode.toUpperCase()} MODE</span><h1>{track.name}</h1><p>{track.description}</p></div>
        <div className="track-tabs">{(Object.keys(tracks) as TrackKey[]).map(key => <button key={key} className={activeTrack === key ? 'active' : ''} onClick={() => selectTrack(key)}>{tracks[key].short}</button>)}</div>
      </div>

      <div className="learn-grid">
        <section className="challenge-panel">
          <div className="panel-kicker">CHALLENGE {String(challengeIndex + 1).padStart(2, '0')} OF {challengeBank.length}</div>
          <h2>{challenge.title}</h2>
          <p>{challenge.prompt}</p>
          <div className="guide-row">
            <button className={showExample ? 'guide active' : 'guide'} onClick={() => setShowExample(current => !current)}><BookOpen size={17} /> Example idea</button>
            <button className="guide" onClick={() => setHintStep(current => Math.min(challenge.hints.length, current + 1))}><Lightbulb size={17} /> Hint {Math.min(hintStep + 1, challenge.hints.length)}</button>
          </div>
          {showExample && (
            <div className="guide-box">
              <b>Example without the answer</b>
              <p>{challenge.example}</p>
              <pre className="example-code"><code>{challenge.exampleCode}</code></pre>
            </div>
          )}
          {hintStep > 0 && <div className="hint-stack">{challenge.hints.slice(0, hintStep).map((hint, index) => <div key={hint}><span>{index + 1}</span><p>{hint}</p></div>)}</div>}
          <div className="grading-note"><Trophy size={17} /><span>Meta grades structure and key concepts. Each revealed hint deducts 5 points from that submission.</span></div>
        </section>

        <section className="code-panel">
          <div className="code-toolbar"><span>{challenge.id}.{activeTrack === 'mcje' ? 'java' : activeTrack === 'mcbe' ? 'json' : activeTrack === 'python' ? 'py' : activeTrack === 'apis' && challenge.id === 'apis-2' ? 'sql' : 'js'}</span><button onClick={() => { setLessonCode(challenge.starter); setGradeResult(null); }}>Reset</button></div>
          <textarea aria-label="Lesson code editor" value={lessonCode} onChange={event => setLessonCode(event.target.value)} spellCheck={false} />
          <div className="code-actions">
            <button className="primary" onClick={gradeCode} disabled={grading}><CheckCircle2 size={17} /> {grading ? 'Grading...' : 'Grade my code'}</button>
            <span>+ XP based on your score</span>
          </div>
        </section>
      </div>

      {gradeResult && (
        <section className={gradeResult.passed ? 'grade-card passed' : 'grade-card'}>
          <div className="grade-score"><strong>{gradeResult.score}</strong><span>/100</span></div>
          <div className="grade-result-body">
            <span className="eyebrow">{gradeResult.passed ? 'PASSED' : 'KEEP BUILDING'}</span>
            <h3>{gradeResult.passed ? 'Challenge complete — review your code, then keep going.' : 'You are partway there.'}</h3>
            {gradeResult.hintPenalty > 0 && <p className="hint-penalty">Base score {gradeResult.baseScore}/100 • Hint penalty −{gradeResult.hintPenalty}</p>}

            <div className="grade-improvement-summary">
              <span>WHAT YOU COULD HAVE IMPROVED</span>
              <ul>{gradeResult.improvements.map(item => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="result-section">
              <b>What you did well</b>
              <ul>{gradeResult.feedback.map(item => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="result-section">
              <b>Code types used</b>
              {gradeResult.concepts.length > 0 ? (
                <div className="concept-chips">{gradeResult.concepts.map(concept => <span key={concept}>{concept}</span>)}</div>
              ) : (
                <p className="no-concepts">No core lesson concepts detected yet.</p>
              )}
            </div>

            <div className="auto-next">
              <span>Next {track.short} question in {autoAdvanceSeconds ?? 0}s</span>
              <button className="primary next-challenge" onClick={startNextChallenge}>
                <Play size={16} /> Next now
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="page">
      <div className="page-title">
        <div><span className="eyebrow"><FolderCode size={14} /> PLAYMODE</span><h1>Build real project files.</h1><p>Projects save while you work and download as files for tools that need Minecraft, Java or a real build environment.</p></div>
        <button className="secondary" onClick={() => createProject('apps')}><Plus size={17} /> New project</button>
      </div>

      <div className="template-row">
        {(Object.keys(tracks) as TrackKey[]).map(key => {
          const Icon = key === 'games' ? Gamepad2 : key === 'mcbe' ? Package : key === 'mcje' ? Braces : key === 'discord' ? Bot : Code2;
          return <button key={key} onClick={() => createProject(key)}><Icon size={18} /><span>{tracks[key].short}</span></button>;
        })}
      </div>

      {projects.length === 0 ? (
        <div className="empty-state"><FolderCode size={42} /><h2>No projects yet</h2><p>Pick a template above. Meta will create starter files for you.</p></div>
      ) : (
        <div className="project-layout">
          <aside className="project-list">
            <div className="project-list-title">Your projects <span>{projects.length}</span></div>
            {projects.map(project => <button key={project.id} className={project.id === activeProjectId ? 'active' : ''} onClick={() => setActiveProjectId(project.id)}><span className="project-dot" /><div><b>{project.name}</b><small>{tracks[project.type].short}{project.cloudId ? ' • Cloud' : ' • Local'}</small></div></button>)}
          </aside>

          {activeProject && (
            <section className="project-editor">
              <div className="project-top">
                <div><span className="eyebrow">{tracks[activeProject.type].short} PROJECT</span><h2>{activeProject.name}</h2></div>
                <div className="project-actions"><button onClick={saveProject}><Save size={16} /> Save</button><button className="primary" onClick={() => void downloadProject(activeProject)}><Download size={16} /> Download</button></div>
              </div>
              <div className="file-tabs">{Object.keys(activeProject.files).map(file => <button key={file} className={activeProject.activeFile === file ? 'active' : ''} onClick={() => setProjectFile(file)}>{file}</button>)}</div>
              <textarea aria-label="Project code editor" className="project-code" value={activeProject.files[activeProject.activeFile] ?? ''} onChange={event => updateProjectFile(event.target.value)} spellCheck={false} />
              <div className="project-footer"><span>Auto-saved locally</span><button onClick={() => setView('coach')}><Bot size={15} /> Ask coach about this project</button></div>
            </section>
          )}
        </div>
      )}
    </div>
  );

  const renderCoach = () => (
    <div className="page coach-page">
      <div className="page-title">
        <div><span className="eyebrow"><Bot size={14} /> META AI COACH</span><h1>Ask about your code, not generic code.</h1><p>Select a project and the coach can use its current files as context when helping you.</p></div>
        <select value={activeProjectId ?? ''} onChange={event => setActiveProjectId(event.target.value || null)}>
          <option value="">No project selected</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>
      <div className="coach-shell">
        <div className="coach-context">
          <div className="coach-avatar"><Bot /></div>
          <div><b>Meta Coach</b><span>{profile.mode} • {profile.language}</span></div>
          <div className="context-pill">{activeProject ? <><Cloud size={14} /> Reading {activeProject.name}</> : <><BookOpen size={14} /> Learning context only</>}</div>
        </div>
        <div className="messages">
          {coachMessages.map((item, index) => <div key={index} className={'message ' + item.role}><span>{item.role === 'assistant' ? 'AI' : <ProfileAvatar value={profile.avatar} />}</span><p>{item.text}</p></div>)}
          {coachBusy && <div className="message assistant"><span>AI</span><p>Looking through the context…</p></div>}
        </div>
        <div className="coach-input">
          <textarea aria-label="Ask the AI coach" value={message} onChange={event => setMessage(event.target.value)} placeholder="Example: Why is my event not firing? Give me a hint first." />
          <button className="primary" onClick={sendCoach} disabled={coachBusy || !message.trim()}><Sparkles size={17} /> Ask coach</button>
        </div>
      </div>
    </div>
  );

  const renderStreak = () => (
    <div className="page">
      <div className="page-title"><div><span className="eyebrow"><Flame size={14} /> DAILY STREAK</span><h1>Keep the chain alive.</h1><p>Your streak updates when you return to Meta on a new day.</p></div></div>
      <section className="streak-hero"><div className="big-flame"><Flame /></div><strong>{profile.streak}</strong><span>day streak</span><p>Longest current learning chain on this profile.</p></section>
      <div className="week-row">{recentDays.map(day => <div key={day.label + day.number} className={day.active ? 'day active' : 'day'}><span>{day.label}</span><b>{day.number}</b>{day.active ? <CheckCircle2 size={16} /> : <i />}</div>)}</div>
      <section className="streak-tip"><Zap size={22} /><div><h3>What counts?</h3><p>Opening Meta on a new day counts toward your streak. Completing graded work builds XP and your skill profile.</p></div></section>
    </div>
  );

  const renderSignup = () => (
    <div className="signup-overlay" role="dialog" aria-modal="true" aria-label="Meta account">
      <div className="signup-shell">
        <section className="signup-info">
          <div className="signup-brand"><MetaMark /><span>Meta</span></div>
          <span className="eyebrow"><Sparkles size={14} /> BUILD. LEARN. SHIP.</span>
          <h1>Code what you actually want to create.</h1>
          <div className="typing-info signup-typing">
            <div className="typing-top"><span className="terminal-dot" /><span>meta://welcome</span></div>
            <div className="typing-line"><span className="prompt">&gt;</span><span>{typedFact}</span><i className="typing-cursor" /></div>
            <small>Meta is showing you what your account unlocks.</small>
          </div>
        </section>
        <section className="signup-card">
          <div className="auth-tabs">
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Create account</button>
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthError(''); }}>Log in</button>
          </div>

          <span className="eyebrow">{authMode === 'signup' ? 'CREATE YOUR META ACCOUNT' : 'WELCOME BACK'}</span>
          <h2>{authMode === 'signup' ? 'Save your progress everywhere.' : 'Log in to keep building.'}</h2>
          <p>{authMode === 'signup' ? 'Use your email to create a Meta account. Gmail addresses work too.' : 'Enter the email and password you used when you created your Meta account.'}</p>

          <form className="auth-form" onSubmit={event => { event.preventDefault(); void submitEmailAuth(); }}>
            {authMode === 'signup' && (
              <label>
                Display name
                <input value={authName} onChange={event => setAuthName(event.target.value)} autoComplete="name" placeholder="Your name" />
              </label>
            )}
            <label>
              Email
              <input value={authEmail} onChange={event => setAuthEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" />
            </label>
            <label>
              Password
              <input value={authPassword} onChange={event => setAuthPassword(event.target.value)} type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" />
            </label>
            {authError && <div className="auth-error">{authError}</div>}
            <button className="primary signup-primary" type="submit" disabled={authBusy}>
              <LogIn size={17} /> {authBusy ? 'Working…' : authMode === 'signup' ? 'Create account' : 'Continue to sign-in'}
            </button>
          </form>

          {authMode === 'signup' ? (
            <button className="auth-switch" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Already have an account? Continue to sign-in</button>
          ) : (
            <button className="auth-switch" onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Need an account? Create one</button>
          )}

          <div className="auth-divider"><span>or</span></div>
          <button
            className="google-controller-button"
            type="button"
            onClick={startGoogleSignIn}
            disabled={authBusy}
          >
            <span className="google-controller-mark">G</span>
            <span>Continue with Google</span>
          </button>
          <small className="google-help">Controller-friendly button for Xbox, plus mouse and touch support.</small>

          <small className="signup-legal">Email passwords are stored as salted hashes, not plain text. Google sign-in is verified by Google before Meta creates a session. <a href="?legal=privacy">Privacy Policy</a> · <a href="?legal=delete">Account deletion</a></small>
        </section>
      </div>
    </div>
  );

  const renderLegalPage = (kind: 'privacy' | 'delete') => (
    <div className="legal-shell">
      <main className="legal-card">
        <a className="legal-brand" href="?"><MetaMark /><b>Meta</b></a>
        {kind === 'privacy' ? (
          <>
            <span className="eyebrow"><ShieldCheck size={14} /> PRIVACY POLICY</span>
            <h1>Meta Privacy Policy</h1>
            <p className="legal-updated">Effective September 28, 2026</p>
            <section><h2>Who this policy covers</h2><p>This policy describes how the Meta coding-learning service handles data in its current web app. Meta is the app/service named by this policy. Privacy questions can be submitted through the public inquiry form below.</p></section>
            <section><h2>Data Meta collects</h2><ul><li>Account data: email address, display name, salted password hash and salt for email accounts, or a verified Google account identifier when Google sign-in is used.</li><li>Learning data: learning mode, language, XP, streaks, skill scores and completed challenges.</li><li>User content: saved project names, project code/files, and an optional profile PNG or avatar.</li><li>AI Coach data: the message you send and selected project context are sent to the AI processing service when you choose to use Meta Coach.</li><li>Privacy inquiry data: the email address and message you submit through the form on this page.</li></ul></section>
            <section><h2>How Meta uses and shares data</h2><p>Meta uses data to authenticate accounts, sync progress and projects, personalize learning, grade challenges, provide the AI Coach and respond to privacy requests. Data is processed by service providers needed to run hosting, database, authentication and AI features. Google processes sign-in information when you choose Google sign-in. Meta does not currently sell personal data or use it for personalized advertising.</p></section>
            <section><h2>Security</h2><p>Email passwords are stored as salted scrypt hashes rather than plain text. Google ID tokens are verified before a Meta session is created. The hosted Meta site uses HTTPS, and account data is accessed through authenticated session tokens.</p></section>
            <section><h2>Retention and deletion</h2><p>Account data is kept while the account exists so Meta can provide cloud sync. You can permanently delete your Meta account and associated profile and project data from Settings, or begin the process from the public <a href="?legal=delete">account deletion page</a>. Privacy inquiries may be retained as needed to respond to the request and meet legitimate security or legal obligations.</p></section>
            <section><h2>Data Meta does not intentionally collect</h2><p>The current web app does not intentionally collect precise device location, contacts, phone numbers, advertising IDs, payment-card data, call logs or SMS data.</p></section>
            <section>
              <h2>Privacy questions</h2>
              <p>Use this public form to submit a privacy inquiry about Meta.</p>
              <div className="privacy-form">
                <input type="email" value={privacyEmail} onChange={event => setPrivacyEmail(event.target.value)} placeholder="Your email" aria-label="Privacy inquiry email" />
                <textarea value={privacyMessage} onChange={event => setPrivacyMessage(event.target.value)} placeholder="Your privacy question or request" aria-label="Privacy inquiry message" />
                <button className="primary" onClick={() => void submitPrivacyInquiry()}>Submit privacy inquiry</button>
                {privacyStatus && <p className="privacy-status">{privacyStatus}</p>}
              </div>
            </section>
          </>
        ) : (
          <>
            <span className="eyebrow"><Trash2 size={14} /> ACCOUNT DELETION</span>
            <h1>Delete your Meta account and data</h1>
            {deletionComplete && <div className="deletion-success">Your Meta account deletion request was completed. The account record, learning profile and saved projects were deleted.</div>}
            <section><h2>Delete from any browser</h2><p>This page is Meta's external account-deletion resource. You do not need the Android app installed. Continue below, sign in to the Meta web app, open Settings, type DELETE in the deletion section, and confirm.</p></section>
            <section><h2>What is deleted</h2><ul><li>Your Meta account record.</li><li>Your learning profile, avatar, XP, streaks, skill scores and completed challenge history.</li><li>Your saved Meta projects and project code stored with the account.</li><li>The active session used to complete deletion. Other old sessions stop authorizing access after the account record is removed.</li></ul></section>
            <section><h2>What may be retained</h2><p>Separate privacy-support correspondence may be retained when reasonably needed to respond to requests, prevent abuse or meet legal obligations. It is not used to keep the deleted Meta account active.</p></section>
            <div className="legal-actions"><a className="primary" href="?delete=account">Continue to account deletion</a><a className="secondary" href="?legal=privacy">Read Privacy Policy</a></div>
          </>
        )}
      </main>
    </div>
  );

  const renderSettings = () => (
    <div className="page settings-page">
      <div className="page-title"><div><span className="eyebrow"><Settings size={14} /> SETTINGS</span><h1>Make Meta yours.</h1><p>Choose your learning level, interface language and profile avatar.</p></div></div>

      <section className="settings-card">
        <div className="settings-label"><UserCircle /><div><h3>Profile picture</h3><p>Choose one of Meta's avatars or use any PNG saved on your device.</p></div></div>
        <div className="avatar-custom-row">
          <div className="avatar-preview"><ProfileAvatar value={profile.avatar} /></div>
          <label className="png-upload-button">
            <Upload size={16} /> Choose PNG
            <input
              type="file"
              accept=".png,image/png"
              onChange={event => {
                const file = event.currentTarget.files?.[0];
                void chooseProfilePng(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <small>Meta crops the image to a square and resizes it for your profile.</small>
        </div>
        <div className="avatar-row">{avatars.map(avatar => <button key={avatar} className={profile.avatar === avatar ? 'active' : ''} onClick={() => setProfile(current => ({ ...current, avatar }))}>{avatar}</button>)}</div>
      </section>

      <section className="settings-card split">
        <div className="settings-label">{profile.appearance === 'dark' ? <Moon /> : <Sun />}<div><h3>Appearance</h3><p>Switch your Meta account between dark and light mode.</p></div></div>
        <div className="appearance-switch">
          <button className={profile.appearance === 'dark' ? 'active' : ''} onClick={() => setProfile(current => ({ ...current, appearance: 'dark' }))}><Moon size={15} /> Dark</button>
          <button className={profile.appearance === 'light' ? 'active' : ''} onClick={() => setProfile(current => ({ ...current, appearance: 'light' }))}><Sun size={15} /> Light</button>
        </div>
      </section>

      <section className="settings-card split">
        <div className="settings-label"><Languages /><div><h3>Language</h3><p>Changes navigation labels and tells the AI coach which language to answer in.</p></div></div>
        <select value={profile.language} onChange={event => setProfile(current => ({ ...current, language: event.target.value as Language }))}>{languages.map(language => <option key={language}>{language}</option>)}</select>
      </section>

      <section className="settings-card split">
        <div className="settings-label"><GraduationCap /><div><h3>Learning mode</h3><p>Adjust how much guidance the coach gives you.</p></div></div>
        <select value={profile.mode} onChange={event => setProfile(current => ({ ...current, mode: event.target.value as Mode }))}>{modes.map(mode => <option key={mode}>{mode}</option>)}</select>
      </section>

      <section className="settings-card account-card">
        <div className="settings-label"><Cloud /><div><h3>Meta account & cloud save</h3><p>{'Signed in as ' + (user?.name || user?.email || 'Meta user') + '. Your progress and projects are connected to this email account.'}</p></div></div>
        <div className="account-actions"><button className="primary" onClick={() => void saveProfileCloud(profile)}><Cloud size={16} /> Sync now</button><button className="secondary" onClick={signOut}><LogOut size={16} /> Log out</button></div>
      </section>

      {isOwner && (
        <section className="settings-card owner-theme-card">
          <div className="settings-label"><ShieldCheck /><div><h3>Owner theme controls</h3><p>This setting changes Meta's global blue accent and tinted panel backgrounds for every account.</p><small>Owner: {ownerEmail}</small></div></div>
          <div className="owner-theme-controls">
            <input type="color" value={adminAccent} onChange={event => setAdminAccent(event.target.value)} aria-label="Global Meta theme color" />
            <input className="theme-hex" value={adminAccent} onChange={event => setAdminAccent(event.target.value)} aria-label="Global theme hex color" />
            <button className="primary" disabled={savingTheme} onClick={() => void saveAdminTheme()}>{savingTheme ? 'Saving…' : 'Apply for everyone'}</button>
          </div>
        </section>
      )}

      <section className="data-card">
        <div><span className="eyebrow">DATA META SAVES</span><h3>Only what the learning features need</h3></div>
        <div className="data-grid"><span>Skill scores</span><span>Daily streak</span><span>Language & mode</span><span>Project code</span><span>Completed challenges</span><span>Avatar choice</span></div>
        <p>Meta keeps account data while your account exists so cloud sync works. Read the <a href="?legal=privacy">Privacy Policy</a> or use the public <a href="?legal=delete">account deletion page</a>.</p>
      </section>

      <section className="danger-card">
        <div className="settings-label"><Trash2 /><div><h3>Delete account & data</h3><p>Permanently deletes your Meta account record, learning profile and saved cloud projects. This cannot be undone.</p></div></div>
        <div className="delete-controls"><input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" aria-label="Type DELETE to confirm account deletion" /><button className="danger-button" disabled={deletingAccount || deleteConfirmation !== 'DELETE'} onClick={() => void deleteAccount()}><Trash2 size={16} /> {deletingAccount ? 'Deleting…' : 'Delete my account'}</button></div>
      </section>

      <button className="save-settings" onClick={() => { void saveProfileCloud(profile); setNotice('Settings saved.'); }}><Save size={17} /> Save settings</button>
    </div>
  );

  const navItems: Array<{ key: View; icon: typeof Home }> = [
    { key: 'home', icon: Home },
    { key: 'learn', icon: BookOpen },
    { key: 'play', icon: FolderCode },
    { key: 'coach', icon: Bot },
    { key: 'streak', icon: Flame },
    { key: 'settings', icon: Settings },
  ];

  if (legalPage === 'privacy' || legalPage === 'delete') {
    return renderLegalPage(legalPage);
  }

  if (!authReady) {
    return <div className="auth-loading"><MetaMark /><span>Checking your Meta account…</span></div>;
  }

  if (!user) {
    return renderSignup();
  }

  return (
    <div className="meta-app">
      <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
        <div className="brand"><MetaMark /><div><b>Meta</b><span>Build. Learn. Ship.</span></div><button className="close-nav" onClick={() => setMobileNav(false)}><X /></button></div>
        <nav>{navItems.map(item => { const Icon = item.icon; return <button key={item.key} className={view === item.key ? 'active' : ''} onClick={() => { setView(item.key); setMobileNav(false); }}><Icon size={19} /><span>{copy[item.key]}</span></button>; })}</nav>
        <div className="sidebar-bottom"><div className="profile-mini"><div><ProfileAvatar value={profile.avatar} /></div><span><b>{user?.name || 'Meta learner'}</b><small>{profile.mode} • {profile.xp} XP</small></span></div><div className="sidebar-streak"><Flame size={17} /><span>{profile.streak} day streak</span></div></div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)}><Menu /></button>
          <div className="workspace-crumb"><Code2 size={15} /><span>meta</span><i>/</i><b>{view}</b><em>{profile.mode}</em></div>
          <div className="top-actions"><button className="xp-pill"><Trophy size={15} /> {profile.xp} XP</button><button className="account-pill" onClick={() => setView('settings')}><ProfileAvatar value={profile.avatar} className="account-avatar" />{user?.name || user?.email || 'Account'}</button></div>
        </header>

        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}><X size={15} /></button></div>}

        {view === 'home' && renderHome()}
        {view === 'learn' && renderLearn()}
        {view === 'play' && renderPlay()}
        {view === 'coach' && renderCoach()}
        {view === 'streak' && renderStreak()}
        {view === 'settings' && renderSettings()}
      </main>

      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={view === item.key ? 'active' : ''}
              onClick={() => {
                setView(item.key);
                setMobileNav(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Icon size={19} />
              <span>{copy[item.key]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
