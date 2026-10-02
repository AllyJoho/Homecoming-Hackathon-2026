// @/components/experience/ResumePdfDocument.tsx
// The resume as a real PDF, for the download button.
//
// A SECOND implementation of the layout in ./ResumeDocument, the same way
// CertificateDocument mirrors CertificateView. React-PDF takes none of
// Tailwind: its own StyleSheet, flexbox only, and its own built-in fonts. The
// two files render the same resume through unrelated engines, so a design
// change has to be made in both.
//
// Differences from the certificate's PDF, both forced by the content:
//
//   - Letter portrait, not A5 landscape. This is a document, not an award.
//   - It can run to several pages. Each entry is `wrap={false}` so a job's
//     bullets never split across a page break mid-list, while sections
//     themselves are allowed to flow.
//
// Rendered server-side only (app/api/resume/pdf), so React-PDF never reaches
// the browser bundle.

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

import type { Experience } from '@/types/experience';
import { EXPERIENCE_KINDS, formatDateRange } from '@/types/experience';
import type { ProfileSkill } from '@/types/profile';
import { pdfSafe } from '@/lib/pdf/text';


export interface ResumePdfDocumentProps {
  name: string;
  email: string;
  experiences: Experience[];
  skills: ProfileSkill[];
}

// Times is one of React-PDF's built-in fonts, so there's no registration and
// no font file in the repo. It also matches the serif the web preview uses.
const styles = StyleSheet.create({
  page: {
    paddingVertical: 48, // ~0.65in, matching the print stylesheet
    paddingHorizontal: 54,
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    lineHeight: 1.35,
    color: '#000000',
    backgroundColor: '#ffffff',
  },

  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  name: { fontFamily: 'Times-Bold', fontSize: 20, letterSpacing: 0.5 },
  contact: { fontSize: 9.5, marginTop: 3 },

  section: { marginBottom: 12 },
  sectionHeading: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 6,
  },

  entry: { marginBottom: 8 },
  entryTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  // Keeps a long title from pushing the date off the page.
  entryTitleWrap: { flexShrink: 1, paddingRight: 12 },
  entryTitle: { fontFamily: 'Times-Bold' },
  entryOrg: { fontFamily: 'Times-Roman' },
  entryDates: { fontFamily: 'Times-Italic', fontSize: 9.5, flexShrink: 0 },
  entryLocation: { fontFamily: 'Times-Italic', fontSize: 9.5 },

  bulletRow: { flexDirection: 'row', marginTop: 2 },
  bulletMark: { width: 12, paddingLeft: 4 },
  bulletText: { flex: 1 },

  skillLine: { marginBottom: 2 },
  skillLabel: { fontFamily: 'Times-Bold' },
});

export function ResumePdfDocument({
  name,
  email,
  experiences,
  skills,
}: ResumePdfDocumentProps) {
  // Same rule as the web preview: typed-in claims are left off a document
  // that goes to an employer.
  const proven = skills.filter((skill) => skill.source === 'QUIZ');
  const evidenced = skills.filter((skill) => skill.source === 'RESUME');
  const hasSkills = proven.length > 0 || evidenced.length > 0;

  return (
    <Document title={`${name} — Resume`} author={name} subject="Resume">
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{pdfSafe(name)}</Text>
          <Text style={styles.contact}>{pdfSafe(email)}</Text>
        </View>

        {EXPERIENCE_KINDS.map(({ kind, label }) => {
          const section = experiences.filter((entry) => entry.kind === kind);
          if (section.length === 0) return null;

          return (
            <View key={kind} style={styles.section}>
              {/* `fixed` is wrong here — the heading should appear once, where
                  the section starts, not repeat on every page. */}
              <Text style={styles.sectionHeading}>{label.toUpperCase()}</Text>

              {section.map((entry) => {
                const dates = pdfSafe(formatDateRange(entry));

                return (
                  // wrap={false}: a job and its bullets stay together. Entries
                  // are short enough that this can't orphan a whole page.
                  <View key={entry.id} style={styles.entry} wrap={false}>
                    <View style={styles.entryTopRow}>
                      <View style={styles.entryTitleWrap}>
                        <Text>
                          <Text style={styles.entryTitle}>
                            {pdfSafe(entry.title || entry.organization)}
                          </Text>
                          {entry.title && entry.organization ? (
                            <Text style={styles.entryOrg}> - {pdfSafe(entry.organization)}</Text>
                          ) : null}
                        </Text>
                      </View>
                      {dates ? <Text style={styles.entryDates}>{dates}</Text> : null}
                    </View>

                    {entry.location ? (
                      <Text style={styles.entryLocation}>{pdfSafe(entry.location)}</Text>
                    ) : null}

                    {entry.bullets.map((bullet, i) => (
                      // A real bullet glyph in its own fixed-width column, so
                      // wrapped lines align under the text rather than the dot.
                      <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletMark}>•</Text>
                        <Text style={styles.bulletText}>{pdfSafe(bullet)}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}

        {hasSkills && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>SKILLS</Text>

            {proven.length > 0 && (
              <Text style={styles.skillLine}>
                <Text style={styles.skillLabel}>Certified: </Text>
                {pdfSafe(proven.map((skill) => skill.name).join(' · '))}
              </Text>
            )}
            {evidenced.length > 0 && (
              <Text style={styles.skillLine}>
                <Text style={styles.skillLabel}>Additional: </Text>
                {pdfSafe(evidenced.map((skill) => skill.name).join(' · '))}
              </Text>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
