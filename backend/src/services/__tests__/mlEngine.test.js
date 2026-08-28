import { describe, it, expect } from '@jest/globals';
import {
  lexSkills,
  tokens,
  tfidfSimilarity,
  inferDomainFromText,
  strengthenBullet,
  mlRewriteEngine,
  analyzeText
} from '../mlEngine.js';

describe('mlEngine — in-process NLP intelligence', () => {
  it('extracts technical skills from text', () => {
    const text = 'Senior Software Engineer with 5 years experience in React, Node.js, TypeScript, PostgreSQL and Docker.';
    const skills = lexSkills(text);
    expect(skills).toContain('react');
    expect(skills).toContain('node.js');
    expect(skills).toContain('typescript');
    expect(skills).toContain('postgresql');
    expect(skills).toContain('docker');
  });

  it('computes accurate cosine similarity between identical and disjoint texts', () => {
    const textA = 'Full stack software developer building react and node web apps';
    const textB = 'Full stack software developer building react and node web apps';
    const textC = 'Organic gardener cultivating tomatoes and heirloom vegetables';

    const simHigh = tfidfSimilarity(textA, textB);
    const simLow = tfidfSimilarity(textA, textC);

    expect(simHigh).toBe(1.0);
    expect(simLow).toBeLessThan(0.1);
  });

  it('transforms weak bullet openers into strong action verbs', () => {
    const weak = 'Responsible for developing the real-time notification microservice';
    const strong = strengthenBullet(weak, 'engineering');
    expect(strong).not.toMatch(/responsible for/i);
    expect(strong.endsWith('.')).toBe(true);
  });

  it('correctly infers domain from content', () => {
    expect(inferDomainFromText('Machine learning pipeline with pandas numpy pytorch')).toBe('data');
    expect(inferDomainFromText('React nodejs microservices express docker')).toBe('engineering');
    expect(inferDomainFromText('Figma wireframes user research prototyping ux design')).toBe('design');
  });

  it('executes full mlRewriteEngine cleanly', () => {
    const sampleResume = {
      summary: 'Experienced developer',
      skills: ['react', 'javascript'],
      sourceText: 'Worked extensively with react, javascript, and docker on client projects',
      experience: [
        'Responsible for building the primary client portal using React and TypeScript'
      ]
    };
    const sampleJob = {
      title: 'Full Stack Engineer',
      skills: ['react', 'node.js', 'docker'],
      description: 'Looking for a Full Stack Engineer experienced with Docker and React'
    };

    const result = mlRewriteEngine(sampleResume, sampleJob);
    expect(result.provider).toBe('in-process-ml-v2');
    expect(result.optimized.skills).toContain('docker');
    expect(result.changes.length).toBeGreaterThan(0);
  });
});
