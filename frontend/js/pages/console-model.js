import { MODELS } from '../data/console-models.js';
import { I18nModule } from '../modules/i18n.js';

function findModel() {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (!code) return null;
    return MODELS.find(m => m.code === code) || null;
}

function render() {
    const model = findModel();
    const root = document.getElementById('model-detail-root');
    const notFound = document.getElementById('model-detail-notfound');
    if (!model) {
        if (root) root.style.display = 'none';
        if (notFound) notFound.style.display = 'block';
        return;
    }

    document.title = `${model.code} (${model.console}) — Console Notebook`;
    const desc = `${model.console} model ${model.code}. ${model.note || ''}`;
    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.setAttribute('content', desc);

    document.getElementById('model-plate-label').textContent = I18nModule.t('care_plate_label');
    document.getElementById('model-plate-code').textContent = model.code;
    document.getElementById('model-plate-console').textContent = model.console;
    document.getElementById('model-mfr').textContent = model.mfr;
    document.getElementById('model-console-name').textContent = model.console;
    document.getElementById('model-note').textContent = model.note || '';
}

render();
window.addEventListener('cn:language-changed', render);
