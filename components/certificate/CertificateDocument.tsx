// @/components/certificate/CertificateDocument.tsx
// The certificate as a real PDF, for the download button.
//
// This is a SECOND implementation of the layout in ./CertificateView, and it
// has to be. React-PDF doesn't consume Tailwind or CSS at all — it takes a
// StyleSheet of its own, supports flexbox only (no grid, no shadows), and
// needs fonts registered explicitly. So the two files render the same
// certificate through two unrelated engines.
//
// Keep them in sync by hand. If you redesign the certificate, both change.
//
// Rendered server-side only (app/api/certificates/[certId]/pdf), so none of
// React-PDF ships to the browser.

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

import { APP_NAME } from '@/lib/appConfig';
import { pdfSafe } from '@/lib/pdf/text';

export interface CertificateDocumentProps {
  holderName: string;
  title: string;
  level: string;
  issuedAt: string;
  /** Printed small at the foot, so a holder can verify the file is theirs. */
  verifyUrl: string;
}

// Landscape A5 is close to the 4:3 the web certificate uses, and it's the
// shape people expect a certificate to be. Points, not pixels.
const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 56,
    // Helvetica is one of React-PDF's built-in fonts — no registration, no
    // network fetch at render time, no font file in the repo.
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#18181b',
  },
  frame: {
    flexGrow: 1,
    borderWidth: 2,
    borderColor: '#18181b',
    borderStyle: 'solid',
    paddingVertical: 36,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 9,
    letterSpacing: 2.5,
    color: '#71717a',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
  },
  holder: { fontSize: 28, fontFamily: 'Helvetica-Bold', marginBottom: 14 },
  connector: { fontSize: 10, color: '#52525b', marginBottom: 10 },
  level: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  title: { fontSize: 15, marginBottom: 24 },
  rule: {
    borderTopWidth: 1,
    borderTopColor: '#d4d4d8',
    borderTopStyle: 'solid',
    width: 180,
    marginBottom: 14,
  },
  footer: { fontSize: 9, color: '#71717a', marginBottom: 4 },
  verify: { fontSize: 7, color: '#a1a1aa' },
});

/** No score, matching the public web page — see CertificateView's showScore. */
export function CertificateDocument({
  holderName,
  title,
  level,
  issuedAt,
  verifyUrl,
}: CertificateDocumentProps) {
  const date = new Date(issuedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <Document
      title={`${title} — ${holderName}`}
      author={APP_NAME}
      subject={`${level} proficiency in ${title}`}
    >
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <Text style={styles.kicker}>CERTIFICATE OF PROFICIENCY</Text>
          <Text style={styles.holder}>{pdfSafe(holderName)}</Text>
          <Text style={styles.connector}>has demonstrated</Text>
          <Text style={styles.level}>{pdfSafe(level).toUpperCase()}</Text>
          <Text style={styles.connector}>proficiency in</Text>
          <Text style={styles.title}>{pdfSafe(title)}</Text>

          <View style={styles.rule} />
          <Text style={styles.footer}>
            {APP_NAME} · {date}
          </Text>
          <Text style={styles.verify}>{verifyUrl}</Text>
        </View>
      </Page>
    </Document>
  );
}
