import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ─── Section header helper ────────────────────────────────────────────────────

function sectionHeader(doc, title, margin, contentWidth, colors) {
  doc.moveDown(0.25);
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor(colors.accent)
     .text(title, margin);
  const y = doc.y;
  doc.moveTo(margin, y)
     .lineTo(margin + contentWidth, y)
     .strokeColor(colors.accent)
     .lineWidth(0.5)
     .stroke();
  doc.moveDown(0.2);
}

// ─── Main PDF generator ───────────────────────────────────────────────────────

/**
 * Generate a clean professional PDF from a parsed resume JSON object.
 * Returns the path to the generated temp file — caller must delete it after use.
 *
 * @param {object} resumeJson  Parsed/optimized resume object from ResumeParser
 * @returns {Promise<string>}  Absolute path to the generated PDF temp file
 */
export async function generateResumePdf(resumeJson) {
  if (!resumeJson || typeof resumeJson !== 'object') {
    throw new Error('Invalid resume data for PDF generation');
  }

  const tmpPath = path.join(os.tmpdir(), `cvconnect_resume_${Date.now()}.pdf`);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        info: {
          Title: 'Resume',
          Author: resumeJson.name || 'Candidate',
          Creator: 'CVConnect',
        },
      });

      const stream = fs.createWriteStream(tmpPath);
      doc.pipe(stream);

      const COLORS = {
        primary: '#1a1a2e',
        accent:  '#1a56db',
        muted:   '#555555',
        light:   '#888888',
      };

      const MARGIN       = 36;
      const PAGE_W       = doc.page.width;
      const CONTENT_W    = PAGE_W - MARGIN * 2;

      // ── Header: Name ────────────────────────────────────────────────────
      const name = resumeJson.name || '';
      if (name) {
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor(COLORS.primary)
           .text(name, MARGIN, MARGIN, { width: CONTENT_W, align: 'center' });
      }

      // ── Contact row ─────────────────────────────────────────────────────
      const contacts = [
        resumeJson.email,
        resumeJson.phone,
        resumeJson.location,
        resumeJson.linkedin,
        resumeJson.github,
        resumeJson.portfolio,
      ].filter(Boolean);

      if (contacts.length) {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(COLORS.muted)
           .text(contacts.join('   ·   '), MARGIN, doc.y + 2, { width: CONTENT_W, align: 'center' });
      }

      // Header divider
      doc.moveDown(0.5);
      doc.moveTo(MARGIN, doc.y)
         .lineTo(PAGE_W - MARGIN, doc.y)
         .strokeColor(COLORS.accent)
         .lineWidth(1.5)
         .stroke();
      doc.moveDown(0.5);

      // ── Summary ─────────────────────────────────────────────────────────
      const summary = resumeJson.summary || resumeJson.objective || resumeJson.profile;
      if (summary) {
        sectionHeader(doc, 'PROFESSIONAL SUMMARY', MARGIN, CONTENT_W, COLORS);
        doc.fontSize(9.5)
           .font('Helvetica')
           .fillColor(COLORS.primary)
           .text(String(summary).substring(0, 600), MARGIN, doc.y, { width: CONTENT_W, align: 'justify' });
        doc.moveDown(0.6);
      }

      // ── Skills ───────────────────────────────────────────────────────────
      const skills = resumeJson.skills;
      if (skills) {
        sectionHeader(doc, 'SKILLS', MARGIN, CONTENT_W, COLORS);
        const skillStr = Array.isArray(skills)
          ? skills.filter(Boolean).join('  •  ')
          : String(skills);
        doc.fontSize(9.5)
           .font('Helvetica')
           .fillColor(COLORS.primary)
           .text(skillStr, MARGIN, doc.y, { width: CONTENT_W });
        doc.moveDown(0.6);
      }

      // ── Experience ────────────────────────────────────────────────────────
      const experience = resumeJson.experience
        || resumeJson.workExperience
        || resumeJson.work_experience
        || [];

      if (experience.length) {
        sectionHeader(doc, 'EXPERIENCE', MARGIN, CONTENT_W, COLORS);
        for (const exp of experience) {
          const title       = exp.title || exp.role || exp.position || '';
          const company     = exp.company || exp.employer || exp.organization || '';
          const dates       = exp.duration || exp.dates || exp.period || exp.years || '';
          const desc        = exp.description || exp.summary || '';
          const bullets     = exp.responsibilities || exp.achievements || exp.bullets || [];

          if (title) {
            doc.fontSize(10.5).font('Helvetica-Bold').fillColor(COLORS.primary).text(title, MARGIN);
          }

          const subLine = [company, dates].filter(Boolean).join('   —   ');
          if (subLine) {
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.accent).text(subLine, MARGIN);
          }

          doc.fontSize(9).font('Helvetica').fillColor(COLORS.primary);
          if (bullets.length) {
            for (const bullet of bullets.slice(0, 6)) {
              doc.text(`• ${bullet}`, MARGIN + 10, doc.y, { width: CONTENT_W - 10 });
            }
          } else if (desc) {
            doc.text(String(desc).substring(0, 400), MARGIN + 10, doc.y, { width: CONTENT_W - 10, align: 'justify' });
          }

          doc.moveDown(0.5);
        }
      }

      // ── Education ────────────────────────────────────────────────────────
      const education = resumeJson.education || [];
      if (education.length) {
        sectionHeader(doc, 'EDUCATION', MARGIN, CONTENT_W, COLORS);
        for (const edu of education) {
          const degree      = edu.degree || edu.qualification || edu.course || edu.program || '';
          const institution = edu.institution || edu.college || edu.university || edu.school || '';
          const year        = edu.year || edu.duration || edu.graduationYear || edu.endYear || '';
          const gpa         = edu.gpa || edu.cgpa || edu.percentage || edu.grade || '';

          if (degree) {
            doc.fontSize(10.5).font('Helvetica-Bold').fillColor(COLORS.primary).text(degree, MARGIN);
          }

          const eduSub = [institution, year, gpa ? `GPA: ${gpa}` : ''].filter(Boolean).join('   —   ');
          if (eduSub) {
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.accent).text(eduSub, MARGIN);
          }
          doc.moveDown(0.4);
        }
      }

      // ── Projects ─────────────────────────────────────────────────────────
      const projects = resumeJson.projects || [];
      if (projects.length) {
        sectionHeader(doc, 'PROJECTS', MARGIN, CONTENT_W, COLORS);
        for (const proj of projects.slice(0, 5)) {
          const pName = proj.name || proj.title || '';
          const pDesc = proj.description || proj.summary || '';
          const pTech = proj.technologies || proj.techStack || proj.tech || [];
          const pLink = proj.link || proj.url || proj.github || '';

          if (pName) {
            doc.fontSize(10.5).font('Helvetica-Bold').fillColor(COLORS.primary).text(pName, MARGIN);
          }

          const techStr = Array.isArray(pTech) ? pTech.join(', ') : String(pTech || '');
          if (techStr) {
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.accent)
               .text(`Tech Stack: ${techStr}`, MARGIN);
          }
          if (pLink) {
            doc.fontSize(8.5).font('Helvetica').fillColor('#2563eb').text(pLink, MARGIN);
          }
          if (pDesc) {
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.primary)
               .text(String(pDesc).substring(0, 300), MARGIN + 10, doc.y, { width: CONTENT_W - 10 });
          }
          doc.moveDown(0.4);
        }
      }

      // ── Certifications ────────────────────────────────────────────────────
      const certs = resumeJson.certifications || resumeJson.certificates || [];
      if (certs.length) {
        sectionHeader(doc, 'CERTIFICATIONS', MARGIN, CONTENT_W, COLORS);
        doc.fontSize(9.5).font('Helvetica').fillColor(COLORS.primary);
        for (const cert of certs.slice(0, 6)) {
          const certName = typeof cert === 'string' ? cert : (cert.name || cert.title || '');
          const certOrg  = cert.organization || cert.issuer || '';
          const certYear = cert.year || cert.date || '';
          const line = [certName, certOrg, certYear].filter(Boolean).join('  ·  ');
          if (line) doc.text(`• ${line}`, MARGIN + 10, doc.y, { width: CONTENT_W - 10 });
        }
        doc.moveDown(0.4);
      }

      doc.end();
      stream.on('finish', () => resolve(tmpPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}
