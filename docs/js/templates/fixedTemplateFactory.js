import { getFixedTemplateLayout, renderFixedTemplate } from './fixedTemplateLayouts.js';

export function createFixedTemplate(id, label, description) {
  const layout = getFixedTemplateLayout(id);
  return {
    id,
    label,
    description,
    roughUrl: layout?.roughUrl || '',
    async render(ctx, values, files, helpers) {
      await renderFixedTemplate(ctx, id, values, files, helpers);
    },
  };
}
