import nodemailer from 'nodemailer';

/**
 * Envoi des e-mails. Avec un serveur SMTP configuré (Brevo, Resend, Gmail…), les messages
 * partent réellement ; sinon ils sont affichés dans le terminal (« e-mail simulé »).
 * Un échec d'envoi n'empêche jamais l'action principale (réservation, message).
 */
export function creerEmail(smtp) {
  const transport = smtp.host
    ? nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } })
    : null;

  return async function envoyer({ a, sujet, texte }) {
    if (!a) return;
    if (!transport) {
      console.log(`\n[e-mail simulé] À : ${a}\nSujet : ${sujet}\n${texte}\n`);
      return;
    }
    try {
      await transport.sendMail({ from: smtp.expediteur, to: a, subject: sujet, text: texte });
    } catch (e) {
      console.error('[e-mail] envoi impossible :', e.message);
    }
  };
}
