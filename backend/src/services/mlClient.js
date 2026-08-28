import axios from 'axios';
import {
  analyzeText as localAnalyzeText,
  tfidfSimilarity as localSimilarity,
  inferDomainFromText,
  strengthenBullet,
  mlRewriteEngine
} from './mlEngine.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

export async function analyzeText(text) {
  // If external ML_SERVICE_URL is explicitly configured, attempt it with instant local fallback
  if (ML_SERVICE_URL) {
    try {
      const { data } = await axios.post(`${ML_SERVICE_URL}/analyze`, { text }, { timeout: 3000 });
      return data;
    } catch {
      // Fall through to in-process engine
    }
  }
  return localAnalyzeText(text);
}

export async function similarity(a, b) {
  if (ML_SERVICE_URL) {
    try {
      const { data } = await axios.post(`${ML_SERVICE_URL}/similarity`, { first: a, second: b }, { timeout: 3000 });
      return data.score;
    } catch {
      // Fall through to in-process engine
    }
  }
  return localSimilarity(a, b);
}

export { localAnalyzeText, localSimilarity, inferDomainFromText, strengthenBullet, mlRewriteEngine };
