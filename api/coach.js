import { generateText } from 'ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    message = '',
    level = 'Beginner',
    language = 'English',
    track = 'Coding',
    project = null,
  } = req.body || {};

  const trimmed = String(message).trim();
  if (!trimmed) return res.status(400).json({ error: 'Message is required.' });

  const projectContext = project
    ? '\nCurrent project: ' + JSON.stringify({
        name: project.name,
        type: project.type,
        files: project.files,
      }).slice(0, 12000)
    : '';

  try {
    const { text } = await generateText({
      model: 'openai/gpt-5.6-sol',
      system:
        'You are Meta Coach, a friendly coding tutor inside the Meta learning website. ' +
        'Teach rather than simply dumping final answers. Adapt to the learner level. ' +
        'Give concise explanations, useful examples, debugging help, and next steps. ' +
        'For coding questions, preserve the user\'s existing approach when possible. ' +
        'The learner level is ' + String(level) + ', the selected track is ' + String(track) +
        ', and the preferred language is ' + String(language) + '.',
      prompt: trimmed + projectContext,
    });

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error('Meta Coach AI error', error);
    return res.status(500).json({ error: 'Meta Coach is temporarily unavailable.' });
  }
}
