import { page1Template } from './page1.js';
import { page2Template } from './page2.js';
import { page3Template } from './page3.js';
import { page4Template } from './page4.js';
import { page5Template } from './page5.js';
import { page6Template } from './page6.js';
import { page7Template } from './page7.js';
import { page8Template } from './page8.js';
import { page9Template } from './page9.js';
import { page10Template } from './page10.js';
import { page11Template } from './page11.js';

export const COMPOSE_TEMPLATES = [
  page1Template,
  page2Template,
  page3Template,
  page4Template,
  page5Template,
  page6Template,
  page7Template,
  page9Template,
  page10Template,
  page11Template,
  page8Template,
];

export const DEFAULT_COMPOSE_TEMPLATE = page1Template.id;

const composeTemplateMap = new Map(
  COMPOSE_TEMPLATES.map((template) => [template.id, template]),
);

export function getComposeTemplateById(templateId) {
  return composeTemplateMap.get(templateId) || composeTemplateMap.get(DEFAULT_COMPOSE_TEMPLATE);
}
