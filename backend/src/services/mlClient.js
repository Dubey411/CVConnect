import axios from 'axios';
const fallbackSkills = ['javascript','typescript','react','redux','node.js','express','python','sql','postgresql','aws','docker','kubernetes','terraform','git','rest','graphql','figma','tailwind','excel','tableau','power bi','machine learning','nlp','agile','scrum','leadership','communication','product management'];
const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ');
export async function analyzeText(text) {
  try { const { data } = await axios.post(`${process.env.ML_SERVICE_URL}/analyze`, { text }, { timeout: 5000 }); return data; }
  catch {
    const haystack = normalise(text); const skills = fallbackSkills.filter(skill => haystack.includes(skill.replace('.','')));
    return { skills, embedding: [], entities: [], model: 'lexical-fallback' };
  }
}
export async function similarity(a, b) {
  try { return (await axios.post(`${process.env.ML_SERVICE_URL}/similarity`, { first: a, second: b }, { timeout: 5000 })).data.score; }
  catch { const A = new Set(normalise(a).split(' ')); const B = new Set(normalise(b).split(' ')); const i = [...A].filter(x => B.has(x) && x.length > 2).length; return i / Math.max(1, Math.sqrt(A.size * B.size)); }
}
