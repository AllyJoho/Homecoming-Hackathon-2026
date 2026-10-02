// @/lib/appConfig.ts
// App name and blurb live here rather than in .env: they are not secrets and
// not environment-specific, so a constant beats a variable every deploy has to
// remember to set.
//
// APP_NAME is also the issuer line on every certificate (see
// @/components/certificate/CertificateView), so it has to read as a credential
// and not as a project codename.

export const APP_NAME = 'SkillStack';

// Reads as the product, not the project: this is the <meta name="description">
// and the og:description, which is what shows up when the link is shared. The
// team and event attribution lives in the footer and the README instead.
export const APP_DESC =
  'Prove your skills with short quizzes, earn a certificate with your proficiency level, and see which jobs you are ready for.';
