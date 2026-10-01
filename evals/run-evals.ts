import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';
import { retrieveChatContext } from '../src/lib/retrieval';
import { validateUserInput, renderTokens } from '../src/lib/guard';
import { complete } from '../src/lib/llm';
import { env } from '../src/lib/env';

interface Question {
  id: number;
  question: string;
  bot: 'hank' | 'vee';
  expected: string;
}

async function main() {
  console.log('=== GuitarBot M3 Evaluation Runner ===\n');

  const questionsPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'evals/questions.json');
  if (!fs.existsSync(questionsPath)) {
    console.error('Missing evals/questions.json');
    process.exit(1);
  }

  const questions: Question[] = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  const devUserId = '00000000-0000-0000-0000-000000000001';

  const results: Array<{
    id: number;
    question: string;
    bot: string;
    response: string;
    costUsd: number;
    tokensIn: number;
    tokensOut: number;
  }> = [];

  let totalCost = 0;

  for (const q of questions) {
    console.log(`[Eval #${q.id}] Testing: "${q.question}" (${q.bot})`);

    const validation = validateUserInput(q.question, 500);
    const cleanText = validation.sanitised;

    const context = await retrieveChatContext(devUserId, cleanText);

    const personaPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'prompts', `persona.${q.bot}.md`);
    const chatRulesPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'prompts', 'chat.system.md');

    const personaPrompt = fs.existsSync(personaPath) ? fs.readFileSync(personaPath, 'utf8') : '';
    const chatRules = fs.existsSync(chatRulesPath) ? fs.readFileSync(chatRulesPath, 'utf8') : '';

    let systemInstruction = `${personaPrompt}\n\n${chatRules}`;
    if (context.episode) {
      systemInstruction += `\n\n<today_episode headline="${context.episode.headline}">\n`;
      for (const t of context.episode.topics) {
        systemInstruction += `Topic: ${t.title}\nHank Take: ${t.hank}\nVee Take: ${t.vee}\n\n`;
      }
      systemInstruction += `</today_episode>`;
    }

    let contextXml = `<context>\n`;
    for (const item of context.items) {
      contextXml += `  <item id="${item.id}" source="${item.source_name || 'News'}">\n`;
      contextXml += `    <title>${item.title}</title>\n`;
      if (item.summary) contextXml += `    <summary>${item.summary}</summary>\n`;
      contextXml += `  </item>\n`;
    }
    for (const r of context.rigItems) {
      contextXml += `  <rig kind="${r.kind}" brand="${r.brand || ''}" model="${r.model || ''}" />\n`;
    }
    for (const d of context.deals) {
      contextXml += `  <deal id="${d.id}" title="${d.title}" price="${d.priceCurrency || '$'}${d.priceAmount || ''}" />\n`;
    }
    contextXml += `</context>`;

    const res = await complete({
      model: env.MODEL_FAST,
      system: systemInstruction,
      messages: [{ role: 'user', content: `${contextXml}\n\nUser Question: ${cleanText}` }],
      maxTokens: 300,
      temperature: 0.8,
      purpose: `eval_${q.id}`,
      userId: devUserId,
    });

    const rendered = renderTokens(res.text, {
      items: context.items,
      deals: context.deals,
      bot: q.bot,
      episodeId: context.episode?.id,
    });

    totalCost += res.costUsd;
    results.push({
      id: q.id,
      question: q.question,
      bot: q.bot,
      response: rendered,
      costUsd: res.costUsd,
      tokensIn: res.usage.input_tokens,
      tokensOut: res.usage.output_tokens,
    });

    console.log(`  -> Response: ${rendered.slice(0, 100)}...`);
    console.log(`  -> Cost: $${res.costUsd.toFixed(6)}\n`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const outDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'evals/results');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `${today}.md`);
  let md = `# Evaluation Results (${today})\n\n`;
  md += `**Total Questions:** ${results.length} | **Total Cost:** $${totalCost.toFixed(6)} | **Avg Cost / Query:** $${(totalCost / results.length).toFixed(6)}\n\n`;
  md += `| # | Persona | Question | Response | Cost ($) |\n`;
  md += `|---|---|---|---|---|\n`;

  for (const r of results) {
    const cleanResponse = r.response.replace(/\n/g, ' ').replace(/\|/g, '\\|');
    md += `| ${r.id} | ${r.bot} | ${r.question} | ${cleanResponse} | $${r.costUsd.toFixed(5)} |\n`;
  }

  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`\n✅ Eval results saved to ${outPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Eval error:', err);
  process.exit(1);
});
