const template001 = new URL('../../references/template_for_record/template001.webp', import.meta.url).href;
const template002 = new URL('../../references/template_for_record/template002.webp', import.meta.url).href;
const background01 = new URL('../../references/record_background/back_ex1.webp', import.meta.url).href;
const background02 = new URL('../../references/record_background/back_ex2.webp', import.meta.url).href;
const background03 = new URL('../../references/record_background/back_ex3.webp', import.meta.url).href;
const background04 = new URL('../../references/record_background/back_ex4.webp', import.meta.url).href;
const background05 = new URL('../../references/record_background/back_ex5.webp', import.meta.url).href;
const background06 = new URL('../../references/record_background/back_ex6.webp', import.meta.url).href;
const background07 = new URL('../../references/record_background/back_ex7.webp', import.meta.url).href;
const background08 = new URL('../../references/record_background/back_ex8.webp', import.meta.url).href;
const background09 = new URL('../../references/record_background/back_ex9.webp', import.meta.url).href;
const background10 = new URL('../../references/record_background/back_ex10.webp', import.meta.url).href;
const background11 = new URL('../../references/record_background/back_ex11.webp', import.meta.url).href;
const background12 = new URL('../../references/record_background/back_ex12.webp', import.meta.url).href;
const background13 = new URL('../../references/record_background/back_ex13.webp', import.meta.url).href;
const background14 = new URL('../../references/record_background/back_ex14.webp', import.meta.url).href;
const background15 = new URL('../../references/record_background/back_ex15.webp', import.meta.url).href;
const background16 = new URL('../../references/record_background/back_ex16.webp', import.meta.url).href;
const background17 = new URL('../../references/record_background/back_ex17.webp', import.meta.url).href;
const background18 = new URL('../../references/record_background/back_ex18.webp', import.meta.url).href;
const background19 = new URL('../../references/record_background/back_ex19.webp', import.meta.url).href;
const background20 = new URL('../../references/record_background/back_ex20.webp', import.meta.url).href;
const background21 = new URL('../../references/record_background/back_ex21.webp', import.meta.url).href;
const background22 = new URL('../../references/record_background/back_ex22.webp', import.meta.url).href;
const background23 = new URL('../../references/record_background/back_ex23.webp', import.meta.url).href;
const background24 = new URL('../../references/record_background/back_ex24.webp', import.meta.url).href;
const background25 = new URL('../../references/record_background/back_ex25.webp', import.meta.url).href;
const background26 = new URL('../../references/record_background/back_ex26.webp', import.meta.url).href;
const background27 = new URL('../../references/record_background/back_ex27.webp', import.meta.url).href;
const background28 = new URL('../../references/record_background/back_ex28.webp', import.meta.url).href;
const background29 = new URL('../../references/record_background/back_ex29.webp', import.meta.url).href;
const backgroundGalMobby = new URL('../../references/record_background/back_ex_galmobby.webp', import.meta.url).href;
const backgroundGalPink = new URL('../../references/record_background/back_ex_galpink.webp', import.meta.url).href;
const backgroundMobbyBlue = new URL('../../references/record_background/back_ex_mobbyblue.webp', import.meta.url).href;
const backgroundMobbyPink = new URL('../../references/record_background/back_ex_mobbypink.webp', import.meta.url).href;
const backgroundMobbyPurple = new URL('../../references/record_background/back_ex_mobbypurple.webp', import.meta.url).href;
const backgroundMobbyYellow = new URL('../../references/record_background/back_ex_mobbyyellow.webp', import.meta.url).href;
const backgroundYankiMobby = new URL('../../references/record_background/back_ex_yankimobby.webp', import.meta.url).href;

const rect = (x, y, width, height) => ({ x, y, width, height });

export const RECORD_TEMPLATES = [
  {
    id: 'record-template-001',
    label: 'Template 001',
    src: template001,
    titleSlot: rect(9.97, 5.25, 80.06, 10.7),
    imageSlots: [
      rect(9.97, 18.75, 38.19, 22.4),
      rect(51.84, 41.15, 38.19, 30.35),
      rect(9.97, 71.5, 38.19, 22.4),
    ],
    textSlots: [
      rect(51.84, 18.75, 38.19, 20.5),
      rect(9.97, 44.9, 38.19, 25.5),
      rect(51.84, 72.2, 38.19, 21.7),
    ],
  },
  {
    id: 'record-template-002',
    label: 'Template 002',
    src: template002,
    titleSlot: rect(9.97, 5.25, 80.06, 10.7),
    imageSlots: [
      rect(51.84, 18.75, 38.19, 22.4),
      rect(9.97, 41.3, 38.19, 30.35),
      rect(51.84, 71.65, 38.19, 22.4),
    ],
    textSlots: [
      rect(9.97, 18.75, 38.19, 20.5),
      rect(51.84, 45, 38.19, 25.5),
      rect(9.97, 72.35, 38.19, 21.75),
    ],
  },
];

export const DEFAULT_RECORD_TEMPLATE = RECORD_TEMPLATES[0].id;

export const RECORD_BACKGROUNDS = [
  { id: 'none', label: '背景なし', src: '' },
  { id: 'record-background-01', label: 'Background 01', src: background01 },
  { id: 'record-background-02', label: 'Background 02', src: background02 },
  { id: 'record-background-03', label: 'Background 03', src: background03 },
  { id: 'record-background-04', label: 'Background 04', src: background04 },
  { id: 'record-background-05', label: 'Background 05', src: background05 },
  { id: 'record-background-06', label: 'Background 06', src: background06 },
  { id: 'record-background-07', label: 'Background 07', src: background07 },
  { id: 'record-background-08', label: 'Background 08', src: background08 },
  { id: 'record-background-09', label: 'Background 09', src: background09 },
  { id: 'record-background-10', label: 'Background 10', src: background10 },
  { id: 'record-background-11', label: 'Background 11', src: background11 },
  { id: 'record-background-12', label: 'Background 12', src: background12 },
  { id: 'record-background-13', label: 'Background 13', src: background13 },
  { id: 'record-background-14', label: 'Background 14', src: background14 },
  { id: 'record-background-15', label: 'Background 15', src: background15 },
  { id: 'record-background-16', label: 'Background 16', src: background16 },
  { id: 'record-background-17', label: 'Background 17', src: background17 },
  { id: 'record-background-18', label: 'Background 18', src: background18 },
  { id: 'record-background-19', label: 'Background 19', src: background19 },
  { id: 'record-background-20', label: 'Background 20', src: background20 },
  { id: 'record-background-21', label: 'Background 21', src: background21 },
  { id: 'record-background-22', label: 'Background 22', src: background22 },
  { id: 'record-background-23', label: 'Background 23', src: background23 },
  { id: 'record-background-24', label: 'Background 24', src: background24 },
  { id: 'record-background-25', label: 'Background 25', src: background25 },
  { id: 'record-background-26', label: 'Background 26', src: background26 },
  { id: 'record-background-27', label: 'Background 27', src: background27 },
  { id: 'record-background-28', label: 'Background 28', src: background28 },
  { id: 'record-background-29', label: 'Background 29', src: background29 },
  { id: 'record-background-galmobby', label: 'Gal Mobby', src: backgroundGalMobby },
  { id: 'record-background-galpink', label: 'Gal Pink', src: backgroundGalPink },
  { id: 'record-background-mobbyblue', label: 'Mobby Blue', src: backgroundMobbyBlue },
  { id: 'record-background-mobbypink', label: 'Mobby Pink', src: backgroundMobbyPink },
  { id: 'record-background-mobbypurple', label: 'Mobby Purple', src: backgroundMobbyPurple },
  { id: 'record-background-mobbyyellow', label: 'Mobby Yellow', src: backgroundMobbyYellow },
  { id: 'record-background-yankimobby', label: 'Yanki Mobby', src: backgroundYankiMobby },
];

export const DEFAULT_RECORD_BACKGROUND = RECORD_BACKGROUNDS[0].id;

export function getRecordTemplateById(templateId) {
  return RECORD_TEMPLATES.find((template) => template.id === templateId) || RECORD_TEMPLATES[0];
}

export function getRecordBackgroundById(backgroundId) {
  return RECORD_BACKGROUNDS.find((background) => background.id === backgroundId) || RECORD_BACKGROUNDS[0];
}
