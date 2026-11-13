export type PronunciationSample = {
  id: string;
  part: string;
  referenceText: string;
  phoneticHint: string;
  context: string;
};

export const PRONUNCIATION_SAMPLES: PronunciationSample[] = [
  {
    id: 'p2-01',
    part: 'Part 2',
    referenceText: 'When is the meeting scheduled?',
    phoneticHint: '/wen ɪz ðə ˈmiːtɪŋ ˈʃedjuːld/',
    context: 'Question about schedule — common in office conversations.',
  },
  {
    id: 'p2-02',
    part: 'Part 2',
    referenceText: 'Could you send me the report by Friday?',
    phoneticHint: '/kʊd juː send miː ðə rɪˈpɔːt baɪ ˈfraɪdeɪ/',
    context: 'Polite request at work.',
  },
  {
    id: 'p2-03',
    part: 'Part 2',
    referenceText: 'Where did you put the invoice?',
    phoneticHint: '/weər dɪd juː pʊt ði ˈɪnvɔɪs/',
    context: 'Asking about document location.',
  },
  {
    id: 'p3-01',
    part: 'Part 3',
    referenceText: 'I think we should postpone the product launch.',
    phoneticHint: '/aɪ θɪŋk wiː ʃʊd ˌpəʊstˈpəʊn ðə ˈprɒdʌkt lɔːntʃ/',
    context: 'Business discussion — expressing opinion.',
  },
  {
    id: 'p4-01',
    part: 'Part 4',
    referenceText: 'Please remember to submit your expense reports by the end of the month.',
    phoneticHint: '/pliːz rɪˈmembə tuː səbˈmɪt jɔːr ɪkˈspens rɪˈpɔːts baɪ ði end əv ðə mʌnθ/',
    context: 'Announcement style — clear articulation needed.',
  },
];
