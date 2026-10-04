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
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Meta Coach is not configured.' });
    }

    const systemPrompt =
        String(track) === 'Project Builder'
          ? (
              'You are Meta Project Agent inside a coding project workspace. ' +
              'You can create and update starter project files. Respond ONLY with valid JSON and no markdown fences. ' +
              'Use this exact shape: {"reply":"short helpful message","project":{"name":"project name","type":"Website|Game|App|Roblox|MCBE|MCJE|MCJE Mod|Blank","files":{"path/file.ext":"full file content"}}}. ' +
              'When no project exists, infer a useful project name/type and create a small runnable starter. ' +
              'When a project exists, preserve existing files unless the requested change requires edits, and return the complete current file map after edits. ' +
              'Keep projects reasonably small and safe. Do not claim a file exists unless it is included in files.'
            )
          : String(track) === 'Discord Support'
          ? (
              'You are Meta Support AI inside the Meta Discord server. ' +
              'Answer members clearly and briefly using only information present in the conversation context or generally safe Discord guidance. ' +
              'Do not invent server-specific rules, IPs, links, roles, prices, or policies. If server-specific information is missing, say you are not sure and ask staff to confirm. ' +
              'Be helpful with tickets, account/site questions, coding questions, and basic server support. ' +
              'If a member asks to close a ticket, tell them to use the Close button unless the bot has an explicit close action available.'
            )
          : (
              'You are Meta Coach, a friendly coding tutor inside the Meta learning website. ' +
              'Teach rather than simply dumping final answers. Adapt to the learner level. ' +
              'Give concise explanations, useful examples, debugging help, and next steps. ' +
              'For coding questions, preserve the user\'s existing approach when possible. ' +
              'The learner level is ' + String(level) + ', the selected track is ' + String(track) +
              ', and the preferred language is ' + String(language) + '.'
            );

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.6-sol',
        instructions: systemPrompt,
        input: trimmed + projectContext,
      }),
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) {
      console.error('OpenAI API error', aiResponse.status, data?.error?.message || data);
      return res.status(502).json({ error: 'Meta Coach could not reach the AI service.' });
    }

    const text =
      data.output_text ||
      data.output?.flatMap((item) => item.content || [])
        ?.find((item) => item.type === 'output_text')?.text ||
      '';

    if (!text) {
      return res.status(502).json({ error: 'Meta Coach received an empty AI response.' });
    }

    if (String(track) === 'Project Builder') {
      try {
        const parsed = JSON.parse(String(text).trim());
        return res.status(200).json({
          reply: String(parsed.reply || 'Project updated.'),
          project: {
            name: String(parsed.project?.name || project?.name || 'AI Project'),
            type: String(parsed.project?.type || project?.type || 'Blank'),
            files: parsed.project?.files && typeof parsed.project.files === 'object'
              ? parsed.project.files
              : (project?.files || {}),
          },
        });
      } catch (parseError) {
        console.error('Meta Project Agent JSON parse error', parseError, text);
        return res.status(200).json({
          reply: String(text || 'Project updated.'),
          project: project || { name: 'AI Project', type: 'Blank', files: {} },
        });
      }
    }

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error('Meta Coach AI error', error);
    return res.status(500).json({ error: 'Meta Coach is temporarily unavailable.' });
  }
}
