import { t as tr } from './i18n';
import { cardName } from './decks';
import { getOnboarding } from './familiar';
import { getProfile } from './tracker';
import { personal } from './numerology';
import { longitude, signOf } from './astrology';

const AHEAD: Record<number, string[]> = {
  1: ['Start the thing you keep circling.', 'Go first today.', 'A small beginning counts.', 'Pick one thing and make it yours.', 'Trust your own idea before asking around.'],
  2: ['Listen more than you speak.', 'Two heads work better today.', 'Be patient; it is coming together.', 'Notice what is said between the lines.', 'Soften the edges of a hard talk.'],
  3: ['Say it out loud. It wants out.', 'Make something, even something small.', 'Let yourself be a little playful.', 'Write it down before it slips away.', 'Share what you are learning.'],
  4: ['Do the dull part first. It holds the rest up.', 'Build the routine, not the mood.', 'One steady step beats three rushed ones.', 'Tidy one corner of your life.', 'Show up; that is the whole trick today.'],
  5: ['Leave room for a detour.', 'Try the other way round.', 'Say yes to something new.', 'Restlessness is a signal, not a problem.', 'Change one small habit and watch.'],
  6: ['Look after someone, and count yourself in.', 'Home needs a little attention.', 'Offer help without being asked.', 'Make something beautiful for no reason.', 'Keep a promise, especially one to yourself.'],
  7: ['Go quiet. Study something.', 'Ask the deeper question.', 'Solitude will teach you something.', 'Read before you react.', 'Trust what you sense but cannot prove.'],
  8: ['Ask for what your work is worth.', 'Take charge of the thing you keep delegating.', 'Count what you have; it is more than you think.', 'Make the decision you have been avoiding.', 'Power used gently is still power.'],
  9: ['Let something end gracefully.', 'Clear space for what comes next.', 'Finish, forgive, move on.', 'Give something away.', 'Look at the bigger picture, not the bruise.'],
};

const PAST: Record<number, string[]> = {
  1: ['What did you begin today?', 'Where did you go first?', 'What idea was truly yours today?', 'What small start are you proud of?', 'What will you carry into tomorrow?'],
  2: ['Who did you really hear today?', 'Where did patience pay off?', 'What went unsaid today?', 'Who helped you without being asked?', 'Where did you meet someone halfway?'],
  3: ['What did you say that mattered?', 'What did you make today?', 'When did you laugh?', 'What did you write down?', 'What did you share with someone?'],
  4: ['What did you finish today?', 'Which routine held you up?', 'What did you put in order?', 'Where did steady beat fast?', 'What foundation did you lay?'],
  5: ['What surprised you today?', 'Which detour was worth it?', 'What did you try for the first time?', 'What made you restless, and why?', 'What changed, even a little?'],
  6: ['Who did you look after today?', 'How did you care for yourself?', 'What felt like home today?', 'Which promise did you keep?', 'What beauty did you notice?'],
  7: ['What did you learn today?', 'What question stayed with you?', 'What did quiet tell you?', 'What did you sense before you knew?', 'What are you still thinking about?'],
  8: ['What did you claim today?', 'Which decision did you finally make?', 'Where did you lead?', 'What are you grateful to have?', 'Where did you use your strength well?'],
  9: ['What can you let go of tonight?', 'What came to an end today?', 'Who or what can you forgive?', 'What did you give away?', 'What space opened up today?'],
};

const MOON: Record<string, string[]> = {
  Aries: ['The Moon in Aries is impatient.', 'Aries Moon: act first, explain later.', 'The Moon in Aries lights a short fuse.', 'Aries Moon energy wants a fresh start.', 'With the Moon in Aries, courage comes easier.'],
  Taurus: ['The Moon in Taurus wants comfort and slowness.', 'Taurus Moon: feed your senses.', 'The Moon in Taurus rewards patience.', 'With the Moon in Taurus, stay put and savour.', 'Taurus Moon asks what feels solid.'],
  Gemini: ['The Moon in Gemini scatters your attention.', 'Gemini Moon: talk it through.', 'The Moon in Gemini loves a good question.', 'With the Moon in Gemini, curiosity leads.', 'Gemini Moon: read, write, message, repeat.'],
  Cancer: ['The Moon in Cancer pulls you home.', 'Cancer Moon: feelings run close to the surface.', 'The Moon in Cancer wants you to nest.', 'With the Moon in Cancer, care is the theme.', 'Cancer Moon asks who makes you feel safe.'],
  Leo: ['The Moon in Leo wants to be seen.', 'Leo Moon: let yourself shine a little.', 'The Moon in Leo makes the heart louder.', 'With the Moon in Leo, play is productive.', 'Leo Moon asks what makes you proud.'],
  Virgo: ['The Moon in Virgo notices every flaw. Be kind with it.', 'Virgo Moon: sort, fix, refine.', 'The Moon in Virgo likes a good list.', 'With the Moon in Virgo, small details matter.', 'Virgo Moon asks how you can be useful.'],
  Libra: ['The Moon in Libra looks for balance.', 'Libra Moon: weigh both sides.', 'The Moon in Libra softens conversations.', 'With the Moon in Libra, beauty steadies you.', 'Libra Moon asks what is fair.'],
  Scorpio: ['The Moon in Scorpio goes deep.', 'Scorpio Moon: nothing stays on the surface.', 'The Moon in Scorpio sharpens your intuition.', 'With the Moon in Scorpio, secrets surface.', 'Scorpio Moon asks what you are really after.'],
  Sagittarius: ['The Moon in Sagittarius wants the bigger picture.', 'Sagittarius Moon: aim far.', 'The Moon in Sagittarius makes you restless for meaning.', 'With the Moon in Sagittarius, learning feels like travel.', 'Sagittarius Moon asks what you believe.'],
  Capricorn: ['The Moon in Capricorn means business.', 'Capricorn Moon: climb one step.', 'The Moon in Capricorn keeps feelings in check.', 'With the Moon in Capricorn, structure helps.', 'Capricorn Moon asks what you are building.'],
  Aquarius: ['The Moon in Aquarius keeps a cool distance.', 'Aquarius Moon: think differently.', 'The Moon in Aquarius favours friends over drama.', 'With the Moon in Aquarius, odd ideas are welcome.', 'Aquarius Moon asks what the future needs.'],
  Pisces: ['The Moon in Pisces blurs the edges.', 'Pisces Moon: dream a little.', 'The Moon in Pisces opens the heart and the floodgates.', 'With the Moon in Pisces, intuition is loud.', 'Pisces Moon asks what you feel but cannot name.'],
};

const RETRO: [string, string[]][] = [
  ['Mercury', ['Mercury is retrograde: reread before you send.', 'Mercury retrograde: back up, double-check, slow down.', 'Mercury is retrograde: old conversations return.', 'Mercury retrograde favours revising over starting.', 'Mercury is retrograde: misunderstandings are likely; be clear.']],
  ['Venus', ['Venus is retrograde: old feelings may knock.', 'Venus retrograde: rethink what you value.', 'Venus is retrograde: hold off on big beauty changes.', 'Venus retrograde brings the past back into love.', 'Venus is retrograde: ask what you really want from people.']],
  ['Mars', ['Mars is retrograde: push less, plan more.', 'Mars retrograde: anger is a messenger, not a guide.', 'Mars is retrograde: finish before you fight for more.', 'Mars retrograde slows the engine; use the time to tune it.', 'Mars is retrograde: choose your battles carefully.']],
];

const CARD_AHEAD = ['Your card today is {c}.', 'Today brings {c}.', '{c} walks with you today.', 'The card for today: {c}.', 'Keep {c} in mind today.'];
const CARD_PAST = ['Today’s card was {c}.', 'Today belonged to {c}.', 'Look back through {c}.', '{c} walked with you today.', 'Where did {c} show up today?'];

const seed = (d: Date) => d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
const pick = (xs: string[], d: Date, salt: number) => tr(xs[(seed(d) + salt) % xs.length]);

const isRetro = (body: string, d: Date) => {
  const a = longitude(body, d);
  const b = longitude(body, new Date(d.getTime() + 86400000));
  return ((b - a + 540) % 360) - 180 < 0;
};

export function dailyMessage(card: string, now = new Date()) {
  const h = now.getHours();
  const evening = h >= 18 || h < 4;
  const hello = tr(evening ? 'Good evening' : h < 12 ? 'Good morning' : 'Good afternoon');
  const name = getProfile().name?.split(' ')[0];
  const paths = getOnboarding().paths ?? [];
  const dob = getProfile().dob;
  const parts: string[] = [];
  if (paths.includes('astrology')) {
    parts.push(pick(MOON[signOf(longitude('Moon', now)).name], now, 0));
    const r = RETRO.find(([b]) => isRetro(b, now));
    if (r) parts.push(pick(r[1], now, 1));
  }
  parts.push(pick(evening ? CARD_PAST : CARD_AHEAD, now, 2).replace('{c}', cardName(card).split(' · ').pop()!));
  if (paths.includes('numerology') && dob) {
    const n = personal(dob, now).day;
    parts.push(pick((evening ? PAST : AHEAD)[n], now, 3));
  }
  return { title: name ? `${hello}, ${name}` : hello, text: parts.join(' ') };
}
