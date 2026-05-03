const template001 = new URL('../../references/template_for_record/template001.png', import.meta.url).href;
const template002 = new URL('../../references/template_for_record/template002.png', import.meta.url).href;
const template01 = new URL('../../references/template_for_record/template01.png', import.meta.url).href;
const template02 = new URL('../../references/template_for_record/template02.png', import.meta.url).href;
const template03 = new URL('../../references/template_for_record/template03.png', import.meta.url).href;
const template04 = new URL('../../references/template_for_record/template04.png', import.meta.url).href;
const template05 = new URL('../../references/template_for_record/template05.png', import.meta.url).href;
const template06 = new URL('../../references/template_for_record/template06.png', import.meta.url).href;
const background01 = new URL('../../references/record_background/back_ex1.png', import.meta.url).href;
const background02 = new URL('../../references/record_background/back_ex2.png', import.meta.url).href;
const background03 = new URL('../../references/record_background/back_ex3.png', import.meta.url).href;

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
  {
    id: 'record-template-01',
    label: 'Template 01',
    src: template01,
    imageSlots: [
      rect(9.97, 7.1, 38.19, 22.8),
      rect(51.84, 32.5, 38.19, 35),
      rect(9.97, 70.1, 38.19, 22.8),
    ],
    textSlots: [
      rect(51.84, 7.05, 38.19, 22.85),
      rect(9.97, 38.55, 38.19, 22.9),
      rect(51.84, 70.1, 38.19, 22.85),
    ],
  },
  {
    id: 'record-template-02',
    label: 'Template 02',
    src: template02,
    imageSlots: [
      rect(51.84, 7.1, 38.19, 22.8),
      rect(9.97, 32.5, 38.19, 35),
      rect(51.84, 70.05, 38.19, 22.85),
    ],
    textSlots: [
      rect(9.97, 7.05, 38.19, 22.85),
      rect(51.84, 38.55, 38.19, 22.9),
      rect(9.97, 70.05, 38.19, 22.9),
    ],
  },
  {
    id: 'record-template-03',
    label: 'Template 03',
    src: template03,
    imageSlots: [
      rect(9.97, 7.1, 38.19, 34.95),
      rect(51.84, 44.65, 38.19, 22.85),
      rect(9.97, 70.1, 38.19, 22.8),
    ],
    textSlots: [
      rect(51.84, 13.15, 38.19, 22.85),
      rect(9.97, 44.65, 38.19, 22.85),
      rect(51.84, 70.1, 38.19, 22.85),
    ],
  },
  {
    id: 'record-template-04',
    label: 'Template 04',
    src: template04,
    imageSlots: [
      rect(9.97, 7.1, 38.19, 22.8),
      rect(51.84, 32.5, 38.19, 22.85),
      rect(9.97, 57.95, 38.19, 34.95),
    ],
    textSlots: [
      rect(51.84, 7.05, 38.19, 22.85),
      rect(9.97, 32.5, 38.19, 22.85),
      rect(51.84, 64, 38.19, 22.85),
    ],
  },
  {
    id: 'record-template-05',
    label: 'Template 05',
    src: template05,
    imageSlots: [
      rect(51.84, 13.15, 38.19, 22.85),
      rect(9.97, 44.65, 38.19, 22.85),
      rect(51.84, 70.1, 38.19, 22.8),
    ],
    textSlots: [
      rect(9.97, 7.05, 38.19, 35),
      rect(51.84, 44.65, 38.19, 22.85),
      rect(9.97, 70.1, 38.19, 22.85),
    ],
  },
  {
    id: 'record-template-06',
    label: 'Template 06',
    src: template06,
    imageSlots: [
      rect(51.84, 7.1, 38.19, 22.8),
      rect(9.97, 32.5, 38.19, 22.85),
      rect(51.84, 64, 38.19, 22.85),
    ],
    textSlots: [
      rect(9.97, 7.05, 38.19, 22.85),
      rect(51.84, 32.5, 38.19, 22.85),
      rect(9.97, 57.95, 38.19, 35),
    ],
  },
];

export const DEFAULT_RECORD_TEMPLATE = RECORD_TEMPLATES[0].id;

export const RECORD_BACKGROUNDS = [
  { id: 'none', label: '背景なし', src: '' },
  { id: 'record-background-01', label: 'Background 01', src: background01 },
  { id: 'record-background-02', label: 'Background 02', src: background02 },
  { id: 'record-background-03', label: 'Background 03', src: background03 },
];

export const DEFAULT_RECORD_BACKGROUND = RECORD_BACKGROUNDS[0].id;

export function getRecordTemplateById(templateId) {
  return RECORD_TEMPLATES.find((template) => template.id === templateId) || RECORD_TEMPLATES[0];
}

export function getRecordBackgroundById(backgroundId) {
  return RECORD_BACKGROUNDS.find((background) => background.id === backgroundId) || RECORD_BACKGROUNDS[0];
}
